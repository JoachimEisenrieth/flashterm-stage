import fs from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { jobFromNative } from './native-export.mjs';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const [requestPath, runtimeModules] = process.argv.slice(2);
if (!requestPath || !runtimeModules) throw new Error('Anfrage und Tabellenlaufzeit fehlen.');
const parent = dirname(resolve(requestPath));
const resultPath = resolve(parent, 'result.json');
try {
    const request = JSON.parse(await fs.readFile(requestPath, 'utf8'));
    const { job, snapshot } = jobFromNative(request);
    const internal = resolve(parent, 'intern');
    const delivery = resolve(parent, 'uebersetzer');
    await fs.mkdir(internal);
    await fs.mkdir(delivery);
    await fs.symlink(runtimeModules, resolve(parent, 'node_modules'), 'dir');
    await fs.writeFile(resolve(internal, 'auftrag-intern.json'), JSON.stringify(job, null, 2), { flag: 'wx' });
    await fs.writeFile(resolve(internal, 'ausgangsstand.json'), JSON.stringify(snapshot, null, 2), { flag: 'wx' });
    await fs.copyFile(requestPath, resolve(internal, 'native-ausgangsdaten.json'), fs.constants.COPYFILE_EXCL);
    const name = `uebersetzungsauftrag-${job.rows[0].target}.xlsx`;
    await run(process.execPath, [resolve(here, 'create-workbook.mjs'), resolve(internal, 'auftrag-intern.json'), delivery, name], { timeout: 90000, maxBuffer: 1024 * 1024 });
    // Keep previews and validation output with internal records, not in delivery.
    for (const f of await fs.readdir(delivery)) if (!f.endsWith('.xlsx')) await fs.rename(resolve(delivery, f), resolve(internal, f));
    await fs.writeFile(resultPath, JSON.stringify({ status: 'created', jobId: job.jobId, concepts: snapshot.concepts.length, positions: job.rows.length, workbook: resolve(delivery, name), folder: delivery }));
} catch (error) {
    await fs.writeFile(resultPath, JSON.stringify({ status: 'failed', message: error.message?.startsWith('Command failed:') ? 'Excel-Datei konnte nicht erzeugt werden. Bitte Entwicklungsprotokoll prüfen.' : error.message }));
    process.exitCode = 1;
}
