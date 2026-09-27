import test from 'node:test';
import assert from 'node:assert/strict';
import { createJob, exportRows, parseRows, preview, rehearse, HEADERS } from '../../tools/translation-exchange/exchange.mjs';

function setup() {
    const lang = (code, term, definition = '') => ({ code, terms: term ? [{ term, weighting: 2 }] : [], definition: { text: definition, footnote: 'Source retained' }, contexts: [], information: [], infobox: '', links: [], imageFileName: '' });
    const snapshot = { publication: { id: 'PUB-1', tenantId: 'T', termbaseId: 'B' }, termbase: { languages: [{ code: 'de-DE' }, { code: 'en-US' }] }, termsByLanguage: {}, concepts: [
        { id: '001', languages: [lang('de-DE', 'Myzel', 'Geflecht aus Hyphen.'), lang('en-US', 'mycelium')] },
        { id: '002', languages: [lang('de-DE', 'Hyphe', 'Ein Pilzfaden.')] }
    ] };
    const job = createJob(snapshot, { database: 'fungi', conceptIds: ['001', '002'] });
    const receipt = job.rows.map(row => ({ rowId: row.rowId, translation: row.field === 'definition' ? 'A fungal structure.' : (row.conceptId === '001' ? 'mycelium' : 'hypha'), status: 'Fertig', comment: '' }));
    return { snapshot, job, receipt };
}

test('sorted partial returns retain stable identity and leave missing positions pending', () => {
    const { job, snapshot } = setup();
    const rows = exportRows(job).reverse().slice(0, 2);
    rows[0][9] = 'A filament.'; rows[0][10] = 'Fertig';
    const receipt = parseRows(job, [HEADERS, ...rows]);
    const result = preview(job, receipt, snapshot, 'fungi');
    assert.equal(result.rows.find(r => r.rowId === rows[0][1]).status, 'ready');
    assert.equal(result.rows.filter(r => r.status === 'pending').length, 3);
});

test('blank completed cell never erases an existing preferred term', () => {
    const { job, receipt, snapshot } = setup(); receipt[0].translation = '   ';
    assert.equal(preview(job, receipt, snapshot, 'fungi').rows[0].status, 'pending');
});

test('questions require a comment and never apply their draft translation', () => {
    const { job, snapshot } = setup();
    const rows = exportRows(job);
    rows[0][9] = 'Draft'; rows[0][10] = 'Rückfrage';
    assert.throws(() => parseRows(job, [HEADERS, ...rows]), /Anmerkung/);
    rows[0][11] = 'Which meaning is intended?';
    const result = preview(job, parseRows(job, [HEADERS, ...rows]), snapshot, 'fungi');
    assert.equal(result.rows[0].status, 'pending');
    assert.match(result.rows[0].reason, /Rückfrage/);
});

test('removing the configured target language blocks a previously exported job', () => {
    const { job, receipt, snapshot } = setup();
    snapshot.termbase.languages = [{ code: 'de-DE' }];
    assert.ok(preview(job, receipt, snapshot, 'fungi').rows.every(row => row.status === 'conflict'));
    assert.throws(() => rehearse(job, receipt, snapshot, 'fungi', job.rows.map(row => row.rowId)), /Nicht übernehmbare/);
});

test('reject duplicate, unknown, wrong-job and modified reference rows', () => {
    const { job } = setup(); const rows = exportRows(job);
    assert.throws(() => parseRows(job, [HEADERS, rows[0], rows[0]]), /Doppelte/);
    for (const col of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
        const changed = structuredClone(rows); changed[0][col] += ' changed';
        assert.throws(() => parseRows(job, [HEADERS, ...changed]));
    }
});

test('a changed source context blocks incoming changes', () => {
    const { job, receipt, snapshot } = setup(); snapshot.concepts[0].languages[0].definition.text += ' Überarbeitet.';
    assert.equal(preview(job, receipt, snapshot, 'fungi').rows[1].status, 'conflict');
});

test('a concurrent target edit blocks overwriting', () => {
    const { job, receipt, snapshot } = setup(); snapshot.concepts[0].languages[1].definition.text = 'Editor changed this';
    assert.equal(preview(job, receipt, snapshot, 'fungi').rows[1].status, 'conflict');
});

test('unrelated language and publication revision edits do not block translation', () => {
    const { job, receipt, snapshot } = setup(); snapshot.publication.id = 'PUB-2';
    snapshot.concepts[0].languages.push({ code: 'fr-FR', terms: [], definition: { text: '' } });
    assert.equal(preview(job, receipt, snapshot, 'fungi').rows[1].status, 'ready');
});

test('wrong database or termbase cannot receive a job', () => {
    const { job, receipt, snapshot } = setup();
    assert.throws(() => preview(job, receipt, snapshot, 'pariPharma'), /anderen Bestand/);
    snapshot.publication.termbaseId = 'OTHER';
    assert.throws(() => preview(job, receipt, snapshot, 'fungi'), /anderen Bestand/);
});

test('deleted concepts and source languages become conflicts', () => {
    const { job, receipt, snapshot } = setup(); snapshot.concepts.shift();
    assert.equal(preview(job, receipt, snapshot, 'fungi').rows[0].status, 'conflict');
    snapshot.concepts[0].languages = [];
    assert.equal(preview(job, receipt, snapshot, 'fungi').rows[2].status, 'conflict');
});

test('alternative term cannot silently become a duplicate preferred term', () => {
    const { job, receipt, snapshot } = setup();
    snapshot.concepts[0].languages[1].terms.push({ term: 'fungal network', weighting: 1 });
    receipt[0].translation = 'Fungal Network';
    assert.equal(preview(job, receipt, snapshot, 'fungi').rows[0].status, 'conflict');
});

test('rehearsal preserves source, footnotes, unrelated terms and remains idempotent', () => {
    const { job, receipt, snapshot } = setup(); const original = structuredClone(snapshot);
    snapshot.concepts[0].languages[1].terms.push({ term: 'fungal network', weighting: 1 });
    const approved = job.rows.map(r => r.rowId);
    const first = rehearse(job, receipt, snapshot, 'fungi', approved);
    assert.equal(first.journal.length, 3);
    assert.deepEqual(first.candidate.concepts[0].languages[0], original.concepts[0].languages[0]);
    assert.equal(first.candidate.concepts[0].languages[1].definition.footnote, 'Source retained');
    assert.equal(first.candidate.concepts[0].languages[1].terms[1].term, 'fungal network');
    assert.equal(first.candidate.termsByLanguage['en-US'].length, 3);
    assert.equal(snapshot.concepts[1].languages.length, 1);
    const second = rehearse(job, receipt, first.candidate, 'fungi', approved);
    assert.equal(second.journal.length, 0);
    assert.deepEqual(first.candidate, second.candidate);
});

test('approvals are checked again against current data before rehearsal', () => {
    const { job, receipt, snapshot } = setup();
    snapshot.concepts[1].languages[0].terms[0].term = 'Changed';
    assert.throws(() => rehearse(job, receipt, snapshot, 'fungi', job.rows.map(r => r.rowId)), /Nicht übernehmbare/);
    assert.equal(snapshot.concepts[1].languages.length, 1);
});

test('definition alone cannot create an orphan target language', () => {
    const { job, receipt, snapshot } = setup();
    assert.throws(() => rehearse(job, receipt, snapshot, 'fungi', [job.rows[3].rowId]), /Vorzugsbenennung/);
});

test('invalid selections, multiple preferred terms and unconfigured languages fail closed', () => {
    const { snapshot } = setup();
    for (const conceptIds of [[], ['001','001'], ['missing']]) assert.throws(() => createJob(snapshot, { database: 'fungi', conceptIds }));
    assert.throws(() => createJob(snapshot, { database: 'fungi', conceptIds: ['001'], target: 'xx' }));
    snapshot.concepts[0].languages[0].terms.push({ term: 'Duplikat', weighting: 2 });
    assert.throws(() => createJob(snapshot, { database: 'fungi', conceptIds: ['001'] }), /Mehrere Vorzugsbenennungen/);
});
