import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createJob, exportRows, HEADERS, parseRows, preview, rehearse } from './exchange.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const save = async (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

try {
    const [command, ...args] = process.argv.slice(2);
    if (command === 'export' && args.length === 5) {
        const [snapshotPath, database, target, ids, output] = args;
        const job = createJob(await read(snapshotPath), { database, target, conceptIds: ids.split(',') });
        await mkdir(output, { recursive: true });
        await save(resolve(output, 'auftrag-intern.json'), job);
        await save(resolve(output, 'tabellendaten.json'), [HEADERS, ...exportRows(job)]);
        console.log(`Auftrag vorbereitet: ${job.rows.length} Positionen. Interne Auftragsdatei aufbewahren.`);
    } else if (command === 'import' && args.length === 5) {
        const [jobPath, xlsxPath, snapshotPath, database, output] = args;
        const job = await read(jobPath);
        const python = process.env.FLASHTERM_PYTHON || 'python3';
        const matrix = JSON.parse(execFileSync(python, [resolve(here, 'read_xlsx.py'), xlsxPath], { encoding: 'utf8', maxBuffer: 30_000_000 }));
        const receipt = parseRows(job, matrix);
        const review = preview(job, receipt, await read(snapshotPath), database);
        await mkdir(output, { recursive: true });
        await save(resolve(output, 'ruecklieferung.json'), receipt);
        await save(resolve(output, 'importvorschau.json'), review);
        const counts = {};
        for (const row of review.rows) counts[row.status] = (counts[row.status] ?? 0) + 1;
        console.log(JSON.stringify({ positions: review.rows.length, counts, databaseChanged: false }));
    } else if (command === 'rehearse' && args.length === 6) {
        const [jobPath, receiptPath, snapshotPath, database, approvalPath, output] = args;
        const approved = await read(approvalPath);
        const result = rehearse(await read(jobPath), await read(receiptPath), await read(snapshotPath), database, approved);
        await mkdir(output, { recursive: true });
        await save(resolve(output, 'lokaler-probelauf.json'), result);
        console.log(`Lokaler Probelauf: ${result.journal.length} Änderungen. FileMaker unverändert.`);
    } else {
        throw new Error('Aufruf: export SNAPSHOT DATENBANK ZIELSPRACHE IDS ORDNER | import AUFTRAG XLSX AKTUELLER_SNAPSHOT DATENBANK ORDNER | rehearse AUFTRAG RUECKLIEFERUNG SNAPSHOT DATENBANK FREIGABELISTE ORDNER');
    }
} catch (error) {
    console.error(error.code === 'EEXIST' ? 'Ausgabedatei existiert bereits. Neuen Ordner verwenden.' : error.message);
    process.exitCode = 1;
}
