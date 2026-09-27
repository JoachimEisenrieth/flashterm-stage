import { createHash, randomUUID } from 'node:crypto';

// Offline translation exchange. Publication snapshots are read models, never a
// substitute for a current FileMaker transaction when applying a delivery.
export const FORMAT = 'flashterm-translation/1';
export const HEADERS = ['Auftrag', 'Position', 'Begriffs-ID', 'Ausgangssprache', 'Zielsprache', 'Inhalt', 'Benennung zur Orientierung', 'Ausgangstext', 'Zieltext bisher', 'Übersetzung', 'Status', 'Anmerkung'];
const FIELDS = new Set(['preferredTerm', 'definition']);
const STATUSES = new Set(['Offen', 'Fertig', 'Rückfrage']);
const canonical = value => JSON.stringify(value);
const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
const copy = value => structuredClone(value);
const text = value => typeof value === 'string' && value.length <= 32000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value);
const requireValue = (ok, message) => { if (!ok) throw new Error(message); };

function index(snapshot) {
    requireValue(Array.isArray(snapshot?.concepts), 'Begriffsdaten fehlen.');
    const result = new Map();
    for (const concept of snapshot.concepts) {
        requireValue(typeof concept.id === 'string' && !result.has(concept.id), 'Begriffskennungen fehlen oder sind doppelt.');
        requireValue(Array.isArray(concept.languages), 'Sprachdaten fehlen.');
        const codes = new Set();
        for (const language of concept.languages) {
            requireValue(typeof language.code === 'string' && !codes.has(language.code), 'Sprachzuordnung ist mehrdeutig.');
            codes.add(language.code);
        }
        result.set(concept.id, concept);
    }
    return result;
}

function language(concept, code) {
    return concept.languages.find(item => item.code === code) ?? null;
}

function fieldValue(record, field) {
    if (!record) return '';
    if (field === 'definition') return record.definition?.text ?? '';
    const terms = (record.terms ?? []).filter(term => term.weighting === 2);
    requireValue(terms.length <= 1, 'Mehrere Vorzugsbenennungen: zuerst redaktionell klären.');
    return terms[0]?.term ?? '';
}

function sourceContext(concept, code) {
    const record = language(concept, code);
    requireValue(record, 'Ausgangssprache fehlt.');
    // Also detects changed context, term status and source attribution while the
    // translator works. Other languages and unrelated concepts may change freely.
    return copy(record);
}

function identity(snapshot, database) {
    const { tenantId, termbaseId } = snapshot.publication ?? {};
    requireValue([database, tenantId, termbaseId].every(v => typeof v === 'string' && v), 'Datenbank- und Bestandszuordnung fehlen.');
    return { database, tenantId, termbaseId };
}

export function createJob(snapshot, { database, conceptIds, source = 'de-DE', target = 'en-US', jobId = randomUUID(), createdAt = new Date().toISOString() }) {
    const concepts = index(snapshot);
    requireValue(source !== target && typeof source === 'string' && typeof target === 'string', 'Ungültiges Sprachpaar.');
    requireValue(snapshot.termbase?.languages?.some(item => item.code === target), 'Zielsprache muss im Bestand eingerichtet sein.');
    requireValue(Array.isArray(conceptIds) && conceptIds.length > 0 && new Set(conceptIds).size === conceptIds.length, 'Begriffsauswahl fehlt oder ist doppelt.');
    requireValue(typeof jobId === 'string' && jobId.length > 0, 'Auftragskennung fehlt.');
    const rows = [];
    for (const id of conceptIds) {
        const concept = concepts.get(id);
        requireValue(concept, `Begriff ${id} fehlt.`);
        const context = sourceContext(concept, source);
        for (const field of FIELDS) {
            const sourceText = fieldValue(context, field);
            if (!sourceText.trim()) continue;
            const baselineTarget = fieldValue(language(concept, target), field);
            requireValue(text(sourceText) && text(baselineTarget), 'Text ist für das Austauschformat nicht geeignet.');
            rows.push({ rowId: randomUUID(), conceptId: id, source, target, field,
                label: fieldValue(context, 'preferredTerm'), sourceText,
                baselineTarget, sourceHash: digest(context) });
        }
    }
    requireValue(rows.length > 0, 'Keine übersetzbaren Inhalte ausgewählt.');
    return { format: FORMAT, jobId, createdAt, identity: identity(snapshot, database), publicationId: snapshot.publication.id, rows };
}

export function exportRows(job) {
    return job.rows.map(row => [job.jobId, row.rowId, row.conceptId, row.source, row.target,
        row.field === 'preferredTerm' ? 'Vorzugsbenennung' : 'Definition', row.label,
        row.sourceText, row.baselineTarget, '', 'Offen', '']);
}

export function parseRows(job, matrix) {
    requireValue(Array.isArray(matrix) && canonical(matrix[0]) === canonical(HEADERS), 'Spaltenüberschriften fehlen oder wurden verändert.');
    const baseline = new Map(exportRows(job).map(row => [row[1], row]));
    const seen = new Set();
    return matrix.slice(1).filter(row => row.some(value => value !== '' && value != null)).map(row => {
        const values = row.map(value => value == null ? '' : value);
        requireValue(values.length === HEADERS.length && values.every(text), 'Nur Textzellen im vorgegebenen Format sind erlaubt.');
        const original = baseline.get(values[1]);
        requireValue(original && values[0] === job.jobId, 'Unbekannte Position oder falscher Auftrag.');
        requireValue(!seen.has(values[1]), 'Doppelte Position in der Rücklieferung.');
        seen.add(values[1]);
        requireValue(values.slice(0, 9).every((value, i) => value === original[i]), 'Referenzspalten wurden verändert. Bitte Originaldatei verwenden.');
        requireValue(STATUSES.has(values[10]), 'Unbekannter Bearbeitungsstatus.');
        requireValue(values[10] !== 'Rückfrage' || values[11].trim(), 'Rückfrage benötigt eine Anmerkung.');
        return { rowId: values[1], translation: values[9], status: values[10], comment: values[11] };
    });
}

export function preview(job, receipt, snapshot, database) {
    requireValue(job?.format === FORMAT && Array.isArray(job.rows), 'Unbekanntes Auftragsformat.');
    requireValue(canonical(job.identity) === canonical(identity(snapshot, database)), 'Rücklieferung gehört zu einem anderen Bestand.');
    const concepts = index(snapshot);
    const originals = new Map(job.rows.map(row => [row.rowId, row]));
    requireValue(originals.size === job.rows.length, 'Auftragspositionen sind doppelt.');
    const delivered = new Map();
    for (const item of receipt) {
        requireValue(originals.has(item.rowId) && !delivered.has(item.rowId), 'Unbekannte oder doppelte Position.');
        requireValue(text(item.translation) && text(item.comment) && STATUSES.has(item.status), 'Ungültige Rücklieferung.');
        requireValue(item.status !== 'Rückfrage' || item.comment.trim(), 'Rückfrage benötigt eine Anmerkung.');
        delivered.set(item.rowId, item);
    }
    const result = job.rows.map(row => {
        requireValue(FIELDS.has(row.field), 'Nicht unterstütztes Zielfeld.');
        const item = delivered.get(row.rowId);
        const base = { rowId: row.rowId, conceptId: row.conceptId, field: row.field, target: row.target, label: row.label, before: '', after: item?.translation ?? '', comment: item?.comment ?? '' };
        const finish = (status, reason) => ({ ...base, status, reason });
        if (!item || item.status !== 'Fertig') return finish('pending', item?.status === 'Rückfrage' ? 'Rückfrage des Übersetzers.' : 'Noch nicht fertig geliefert.');
        if (!item.translation.trim()) return finish('pending', 'Leere Zelle: keine Änderung, kein Löschen.');
        if (!snapshot.termbase?.languages?.some(item => item.code === row.target)) return finish('conflict', 'Zielsprache ist im Bestand nicht mehr eingerichtet.');
        const concept = concepts.get(row.conceptId);
        if (!concept) return finish('conflict', 'Begriff existiert nicht mehr.');
        let context;
        try { context = sourceContext(concept, row.source); }
        catch { return finish('conflict', 'Ausgangssprache fehlt inzwischen.'); }
        if (digest(context) !== row.sourceHash) return finish('conflict', 'Ausgangsinhalte wurden seit dem Export verändert.');
        const targetRecord = language(concept, row.target);
        try { base.before = fieldValue(targetRecord, row.field); }
        catch { return finish('conflict', 'Ziel enthält mehrere Vorzugsbenennungen.'); }
        if (base.before === item.translation) return finish('unchanged', 'Identischer Inhalt bereits vorhanden.');
        if (base.before !== row.baselineTarget) return finish('conflict', 'Zielinhalt wurde inzwischen bearbeitet.');
        // A preferred term that is already present as an alternative or rejected
        // term needs an explicit editorial status decision, not a duplicate term.
        if (row.field === 'preferredTerm' && targetRecord?.terms.some(t => t.weighting !== 2 && t.term.toLocaleLowerCase() === item.translation.toLocaleLowerCase())) {
            return finish('conflict', 'Benennung bereits mit anderer Bewertung vorhanden.');
        }
        return finish('ready', base.before ? 'Änderung zur redaktionellen Übernahme.' : 'Ergänzung zur redaktionellen Übernahme.');
    });
    return { format: FORMAT, jobId: job.jobId, identity: copy(job.identity), rows: result };
}

// Rehearsal only: produces a new local read-model candidate. Never writes to a
// live publication or FileMaker. The native writer must recheck while locked.
export function rehearse(job, receipt, snapshot, database, approvedRowIds) {
    const review = preview(job, receipt, snapshot, database);
    requireValue(Array.isArray(approvedRowIds) && new Set(approvedRowIds).size === approvedRowIds.length, 'Ungültige Freigabeliste.');
    const rows = new Map(review.rows.map(row => [row.rowId, row]));
    for (const id of approvedRowIds) requireValue(['ready', 'unchanged'].includes(rows.get(id)?.status), 'Nicht übernehmbare Position ausgewählt.');
    const candidate = copy(snapshot);
    const concepts = index(candidate);
    const journal = [];
    for (const id of approvedRowIds) {
        const row = rows.get(id);
        if (row.status === 'unchanged') continue;
        const concept = concepts.get(row.conceptId);
        let target = language(concept, row.target);
        if (!target) {
            target = { code: row.target, terms: [], definition: { text: '', footnote: '' }, contexts: [], information: [], infobox: '', links: [], imageFileName: '' };
            concept.languages.push(target);
        }
        if (row.field === 'definition') target.definition.text = row.after;
        else {
            const term = target.terms.find(item => item.weighting === 2);
            if (term) term.term = row.after;
            else target.terms.push({ term: row.after, weighting: 2 });
        }
        journal.push({ ...row, jobId: job.jobId });
    }
    // Refresh only term lists for affected languages, retaining all other data.
    for (const code of new Set(journal.map(row => row.target))) {
        for (const entry of journal.filter(row => row.target === code)) {
            requireValue(fieldValue(language(concepts.get(entry.conceptId), code), 'preferredTerm').trim(), 'Neue Sprachebene benötigt eine freigegebene Vorzugsbenennung.');
        }
        candidate.termsByLanguage[code] = candidate.concepts.flatMap(concept =>
            (language(concept, code)?.terms ?? []).map(term => ({ conceptID: concept.id, ...term })));
    }
    return { candidate, journal, review };
}
