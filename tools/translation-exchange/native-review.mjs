import { parseRows, preview } from './exchange.mjs';
import { snapshotFromNative } from './native-export.mjs';
const assert = (ok, message) => { if (!ok) throw new Error(message); };
export function prepareReview(job, matrix, database, filePath) {
    assert(database === 'flashterm-dev' && /^file:\/.*\/flashterm-dev\.fmp12$/u.test(filePath), 'Nur flashterm-dev offline ist freigegeben.');
    assert(job.origin?.type === 'native-filemaker' && job.origin.filePath === filePath && job.identity.database === database, 'Auftrag gehört zu einer anderen FileMaker-Datei.');
    const receipt = parseRows(job, matrix);
    const ids = [...new Set(job.rows.map(row => row.conceptId))];
    assert(ids.length > 0 && ids.length <= 100 && ids.every(id => /^\d+$/u.test(id)), 'Ungültige Begriffsauswahl.');
    const source = job.rows[0].source, target = job.rows[0].target;
    assert(source !== target && job.rows.every(r => r.source === source && r.target === target), 'Uneinheitliches Sprachpaar.');
    return { job, receipt, jobId: job.jobId, selectedIds: ids.join('\r'), source, target, database, filePath };
}
export function reviewNative(prepared, request) {
    for (const key of ['jobId', 'selectedIds', 'source', 'target', 'database', 'filePath']) assert(request[key] === prepared[key], 'Aktueller Bestand passt nicht zum Auftrag.');
    const snapshot = snapshotFromNative(request, { forReview: true });
    const result = preview(prepared.job, prepared.receipt, snapshot, request.database);
    result.checkedAt = new Date().toISOString();
    result.databaseChanged = false;
    result.counts = { ready: 0, conflict: 0, unchanged: 0, pending: 0 };
    result.rows.forEach((row, i) => {
        const original = prepared.job.rows[i];
        const language = snapshot.concepts.find(c => c.id === row.conceptId)?.languages.find(l => l.code === row.target);
        const preferred = language?.terms.filter(t => t.weighting === 2) ?? [];
        row.current = row.field === 'definition' ? language?.definition.text ?? '' : preferred.length > 1 ? '[Mehrere Vorzugsbenennungen]' : preferred[0]?.term ?? '';
        row.sourceText = original.sourceText;
        row.baselineTarget = original.baselineTarget;
        result.counts[row.status]++;
    });
    return { result, snapshot };
}
const escape = value => String(value ?? '').replace(/[&<>"']/gu, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderReview(result) {
    const labels = { ready:'Zur Übernahme bereit', conflict:'Konflikt', unchanged:'Bereits vorhanden', pending:'Noch offen' };
    return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Übersetzungsrücklieferung prüfen</title><style>body{font:16px system-ui;background:#f3f5f7;color:#203247;margin:0}main{max-width:1150px;margin:40px auto;padding:0 24px}h1{font-size:30px}small{color:#506276}nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}nav a{color:inherit;background:white;padding:16px;border-radius:8px;text-decoration:none}article{background:white;padding:24px;border-radius:12px;margin:18px 0;border-left:6px solid #9eabb9}article.ready{border-color:#228354}article.conflict{border-color:#bf5634}section{display:grid;grid-template-columns:1fr 1fr;gap:20px}.text{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6f8;padding:14px;border-radius:6px;min-height:30px}h3{font-size:14px;margin-bottom:8px}h2{font-size:21px}p{line-height:1.5}summary{cursor:pointer} @media(max-width:650px){section{grid-template-columns:1fr}}</style><main><small>flashterm-dev · Offline-Entwicklung</small><h1>Übersetzungsrücklieferung prüfen</h1><p>Die Prüfung hat keine Inhalte übernommen. Diese Vorschau zeigt den Stand zum Prüfzeitpunkt; vor einer späteren Übernahme muss erneut geprüft werden.</p><small>Auftrag ${escape(result.jobId)} · ${escape(result.checkedAt)}</small><nav>${Object.entries(labels).map(([key,label])=>`<a href="#${key}"><b>${result.counts[key]}</b> ${label}</a>`).join('')}</nav>${Object.entries(labels).map(([status,label])=>`<h2 id="${status}">${label}</h2>${result.rows.filter(r=>r.status===status).map(r=>`<article class="${status}"><h2>${escape(r.label)} · ${r.field==='definition'?'Definition':'Vorzugsbenennung'}</h2><small>Begriff ${escape(r.conceptId)} · ${escape(r.target)}</small><p>${escape(r.reason)}</p><section><div><h3>Aktuell in FileMaker</h3><div class="text">${escape(r.current)||'—'}</div></div><div><h3>Rücklieferung</h3><div class="text">${escape(r.after)||'—'}</div></div></section><details><summary>Ausgangstext und Stand beim Export</summary><section><div><h3>Ausgangstext beim Export</h3><div class="text">${escape(r.sourceText)}</div></div><div><h3>Zieltext beim Export</h3><div class="text">${escape(r.baselineTarget)||'—'}</div></div></section></details>${r.comment?`<p><b>Anmerkung:</b> ${escape(r.comment)}</p>`:''}</article>`).join('') || '<p>Keine Positionen.</p>'}`).join('')}</main></html>`;
}
