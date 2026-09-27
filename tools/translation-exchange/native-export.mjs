import { createJob } from './exchange.mjs';

const assert = (ok, message) => { if (!ok) throw new Error(message); };
const records = (value, width) => {
    assert(typeof value === 'string' && value !== '?', 'FileMaker-Abfrage fehlgeschlagen.');
    if (!value) return [];
    const rows = value.split('␞').map(row => row.split('␟'));
    assert(rows.every(row => row.length === width), 'Nicht eindeutig lesbare Quelldaten.');
    return rows;
};

// Read-only adapter for the explicitly local development workflow. Native row
// identity and footnotes belong to the baseline, not the translator workbook.
export function snapshotFromNative(request, { forReview = false } = {}) {
    assert(request.database === 'flashterm-dev' && /^file:\/.*\/flashterm-dev\.fmp12$/u.test(request.filePath), 'Nur flashterm-dev offline ist freigegeben.');
    assert(/^[0-9a-f-]{36}$/iu.test(request.jobId), 'Auftragskennung fehlt.');
    const ids = request.selectedIds.split(/\r\n|\r|\n/u).filter(Boolean);
    assert(ids.length > 0 && ids.length <= 100 && ids.every(id => /^\d+$/u.test(id)) && new Set(ids).size === ids.length, 'Bitte 1 bis 100 unterschiedliche Begriffe auswählen.');
    const languages = request.languages.split(/\r\n|\r|\n/u).filter(Boolean);
    if (!forReview) assert(languages.includes(request.source) && languages.includes(request.target), 'Sprachpaar ist im Bestand nicht verfügbar.');
    const terms = records(request.terms, 9);
    const definitions = records(request.definitions, 5);
    assert(terms.every(t => ids.includes(t[1]) && [request.source, request.target].includes(t[2])), 'Benennungen außerhalb der Auswahl.');
    assert(definitions.every(d => ids.includes(d[0]) && [request.source, request.target].includes(d[1])), 'Definitionen außerhalb der Auswahl.');
    assert(new Set(terms.map(t => t[0])).size === terms.length, 'Doppelte Benennungskennung.');
    const concepts = ids.map(id => ({ id, languages: [request.source, request.target].flatMap(code => {
        const ts = terms.filter(t => t[1] === id && t[2] === code && t[5] === '11' && t[6] === '0');
        const ds = definitions.filter(d => d[0] === id && d[1] === code && d[3] === '11');
        assert(ds.length <= 1, `Mehrere Definitionen für Begriff ${id} (${code}).`);
        if (!ts.length && !ds.length) return [];
        return [{ code, terms: ts.map(t => ({ id: t[0], term: t[3], weighting: Number(t[4]), footnote: t[7], footnote2: t[8] })), definition: { text: ds[0]?.[2] ?? '', footnote: ds[0]?.[4] ?? '' } }];
    }) }));
    const snapshot = {
        publication: { id: `native:${request.jobId}`, tenantId: 'offline-development', termbaseId: request.filePath },
        termbase: { languages: languages.map(code => ({ code })) }, concepts, termsByLanguage: {},
    };
    return snapshot;
}

export function jobFromNative(request) {
    const snapshot = snapshotFromNative(request);
    const ids = request.selectedIds.split(/\r\n|\r|\n/u).filter(Boolean);
    for (const c of snapshot.concepts) assert(c.languages.find(l => l.code === request.source)?.terms.filter(t => t.weighting === 2).length === 1, `Begriff ${c.id}: eindeutige Vorzugsbenennung der Ausgangssprache erforderlich.`);
    const job = createJob(snapshot, { database: request.database, conceptIds: ids, source: request.source, target: request.target, jobId: request.jobId });
    job.origin = { type: 'native-filemaker', filePath: request.filePath, userId: request.userId, environment: 'offline-development' };
    return { job, snapshot };
}
