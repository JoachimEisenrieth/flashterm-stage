import test from 'node:test';
import assert from 'node:assert/strict';
import { jobFromNative } from '../../tools/translation-exchange/native-export.mjs';

const request = () => ({ database: 'flashterm-dev', filePath: 'file:/Disk/Test/flashterm-dev.fmp12', userId: '1', jobId: '1491ea8c-6438-4d40-8bf9-a43548976688', selectedIds: '12', languages: 'de-DE\ren-US', source: 'de-DE', target: 'en-US', terms: ['22','12','de-DE','Pilz','2','11','0','Quelle','Beleg'].join('␟'), definitions: ['12','de-DE','Ein Pilz.','11','Definitionsquelle'].join('␟') });
test('native export uses current text, native IDs and source notes', () => {
    const { job, snapshot } = jobFromNative(request());
    assert.equal(job.rows.length, 2);
    assert.equal(job.rows[1].sourceText, 'Ein Pilz.');
    assert.equal(job.rows[0].baselineTarget, '');
    assert.equal(snapshot.concepts[0].languages[0].terms[0].id, '22');
    assert.equal(snapshot.concepts[0].languages[0].terms[0].footnote2, 'Beleg');
    assert.equal(job.origin.environment, 'offline-development');
});
test('hosted and renamed files cannot use the offline adapter', () => {
    assert.throws(() => jobFromNative({ ...request(), filePath: 'fmnet:/server/flashterm-dev.fmp12' }), /offline/);
    assert.throws(() => jobFromNative({ ...request(), database: 'flashterm-fungi' }), /offline/);
});
test('ambiguous preferred terms, duplicate definitions and delimiter collisions stop export', () => {
    const r=request();
    assert.throws(() => jobFromNative({...r, terms:r.terms+'␞'+r.terms.replace(/^22/,'23')}), /Vorzugsbenennung/);
    assert.throws(() => jobFromNative({...r, definitions:r.definitions+'␞'+r.definitions}), /Mehrere Definitionen/);
    assert.throws(() => jobFromNative({...r, definitions:r.definitions+'␟unexpected'}), /Quelldaten/);
});
test('selection and languages are validated, inflections are excluded', () => {
    const r=request();
    assert.throws(() => jobFromNative({...r, selectedIds:'12\r12'}), /unterschiedliche/);
    assert.throws(() => jobFromNative({...r, target:'fr-FR'}), /Sprachpaar/);
    assert.throws(() => jobFromNative({...r, selectedIds:'99'}), /außerhalb/);
    assert.throws(() => jobFromNative({...r, selectedIds:'12,13'}), /unterschiedliche/);
    assert.throws(() => jobFromNative({...r, target:'de-DE'}));
    const extra=r.terms.replace(/^22/,'23').replace('␟0␟','␟22␟');
    assert.equal(jobFromNative({...r, terms:r.terms+'␞'+extra}).job.rows.length,2);
});
