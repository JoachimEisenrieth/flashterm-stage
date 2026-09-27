import { readFile, writeFile, copyFile, constants } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { prepareReview, reviewNative, renderReview } from './native-review.mjs';
import { buildApplyPlan } from './native-apply.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const save = async (p,v) => writeFile(p, JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const [mode, requestPath, jobsRoot, python] = process.argv.slice(2);
const folder = dirname(requestPath);
try {
    const request = await read(requestPath);
    if (mode === 'prepare') {
        if (!/\.xlsx$/iu.test(request.workbook)) throw new Error('Bitte eine Excel-Datei im Format .xlsx auswählen.');
        const copy = resolve(folder,'ruecklieferung.xlsx');
        await copyFile(request.workbook, copy, constants.COPYFILE_EXCL);
        let matrix;
        try { matrix=JSON.parse(execFileSync(python,[resolve(here,'read_xlsx.py'),copy],{encoding:'utf8',maxBuffer:30_000_000,timeout:20000,stdio:['ignore','pipe','pipe']})); }
        catch { throw new Error('Excel-Datei nicht lesbar oder enthält unzulässige Inhalte, etwa Formeln.'); }
        const id = matrix[1]?.[0];
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(id ?? '')) throw new Error('Keine gültige Auftragskennung in der Rücklieferung.');
        let job;
        try { job = await read(resolve(jobsRoot,id,'intern/auftrag-intern.json')); }
        catch { throw new Error('Der ursprüngliche Auftrag wurde im lokalen Auftragsarchiv nicht gefunden.'); }
        if (job.jobId !== id) throw new Error('Auftragskennung stimmt nicht mit dem Archiv überein.');
        const prepared = prepareReview(job,matrix,request.database,request.filePath);
        await save(resolve(folder,'prepared.json'),prepared);
        await save(resolve(folder,'prepare-result.json'),{status:'prepared',...Object.fromEntries(['jobId','selectedIds','source','target'].map(k=>[k,prepared[k]]))});
    } else if (mode === 'review') {
        const { result,snapshot } = reviewNative(await read(resolve(folder,'prepared.json')),request);
        await save(resolve(folder,'aktueller-stand.json'),snapshot);
        await save(resolve(folder,'importvorschau.json'),result);
        const report=resolve(folder,'importvorschau.html');
        await writeFile(report,renderReview(result),{flag:'wx'});
        await save(resolve(folder,'review-result.json'),{status:'reviewed',report,counts:result.counts,databaseChanged:false});
    } else if (mode === 'apply-plan') {
        const plan = buildApplyPlan(await read(resolve(folder,'prepared.json')), request, request.approvedRowIds.split(/\r\n|\r|\n/u).filter(Boolean));
        await save(resolve(folder,'aenderungsprotokoll-vorbereitet.json'),plan);
        await save(resolve(folder,'apply-plan-result.json'),{...plan,status:'planned'});
    } else throw new Error('Unbekannter Prüfschritt.');
} catch(error) {
    await save(resolve(folder,`${mode}-result.json`),{status:'failed',message:error.code==='EEXIST'?'Prüflauf existiert bereits. Bitte neu starten.':error.message});
    process.exitCode=1;
}
