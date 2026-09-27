import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { HEADERS, exportRows } from './exchange.mjs';

// Artifact Tool is an authoring dependency supplied by the desktop runtime,
// deliberately separate from the deployed STAGE application.
const [jobPath, outputDir, outputName = 'flashterm-fungi-uebersetzung-en-US.xlsx'] = process.argv.slice(2);
if (!jobPath || !outputDir) throw new Error('Aufruf: create-workbook.mjs AUFTRAG AUSGABEORDNER');
if (!/^[a-zA-Z0-9_-]+\.xlsx$/u.test(outputName)) throw new Error('Ungültiger Ausgabename.');
const requireArtifact = createRequire(resolve(outputDir, 'package.json'));
const { Workbook, SpreadsheetFile } = await import(pathToFileURL(requireArtifact.resolve('@oai/artifact-tool')).href);
const job = JSON.parse(await fs.readFile(jobPath, 'utf8'));
const rows = exportRows(job);
const book = Workbook.create();
const sheet = book.worksheets.add('Übersetzung');
sheet.showGridLines = false;
const last = rows.length + 9;
sheet.getRange(`A1:L${last}`).format.font = { name: 'Arial', size: 11, color: '#202A36' };
sheet.getRange(`A1:L${last}`).setNumberFormat('@');
sheet.getRange(`A1:L${last}`).format.verticalAlignment = 'top';
const widths = [15,15,13,17,15,20,24,56,48,56,16,35];
for (let i = 0; i < widths.length; i++) sheet.getRangeByIndexes(0,i,last,1).format.columnWidth = widths[i];
sheet.getRange('C2').values = [['flashterm · Übersetzungsauftrag']];
sheet.getRange('C2').format.font = { name: 'Arial', size: 16, bold: true };
sheet.getRange('A2:L2').format.rowHeight = 27;
sheet.getRange('C3').values = [[`${job.identity.database}: ${job.rows[0].source} → ${job.rows[0].target}`]];
sheet.getRange('C4').values = [['Gelbe Felder bearbeiten: Übersetzung, Status und Anmerkung. Referenzspalten A–I unverändert lassen.']];
sheet.getRange('C5').values = [['Eine Benennung oder Definition pro Zeile. „Fertig“ kennzeichnet eine abgeschlossene Position; „Rückfrage“ benötigt eine Anmerkung.']];
sheet.getRange('C6').values = [['Leer bedeutet keine Änderung. Auch unveränderte bestätigte Übersetzungen bitte eintragen und auf „Fertig“ setzen.']];
sheet.getRange('C7').values = [['Ganze Zeilen dürfen sortiert werden. Keine Spalten ändern, keine Formeln verwenden. Dieselbe XLSX-Datei zurückgeben.']];
sheet.getRange('A9:L9').values = [HEADERS];
sheet.getRange(`A10:L${last}`).values = rows;
sheet.getRange(`A9:L${last}`).format.wrapText = true;
sheet.getRange('A9:L9').format = { fill: '#293B52', font: { name: 'Arial', size: 11, bold: true, color: '#FFFFFF' }, wrapText: true, rowHeight: 34 };
sheet.getRange(`A10:I${last}`).format.fill = '#F1F4F7';
sheet.getRange(`A10:B${last}`).format.font = { name: 'Arial', size: 9, color: '#647084' };
sheet.getRange(`J10:L${last}`).format.fill = '#FFF2CC';
sheet.getRange(`K10:K${last}`).dataValidation = { rule: { type: 'list', values: ['Offen', 'Fertig', 'Rückfrage'] } };
sheet.getRange(`K10:K${last}`).conditionalFormats.add('containsText', { text: 'Rückfrage', format: { fill: '#FCE0DC', font: { color: '#8B2B21' } } });
rows.forEach((row, i) => {
    const textLines = Math.max(...[7,8].map(col => row[col].split(/\r\n|\r|\n/u).reduce((sum, part) => sum + Math.max(1, Math.ceil(part.length / 55)), 0)));
    sheet.getRange(`A${i+10}:L${i+10}`).format.rowHeight = Math.max(66, textLines * 15 + 14);
});
sheet.tables.add(`A9:L${last}`, true, 'TranslationPositions');
sheet.freezePanes.freezeRows(9);
sheet.freezePanes.freezeColumns(3);
book.recalculate();
await fs.mkdir(outputDir, { recursive: true });
for (const [name, range] of [['arbeitsblatt','C2:L12'], ['kennungen','A9:C12']]) {
    const image = await book.render({ sheetName: sheet.name, range, scale: 1, format: 'png' });
    await fs.writeFile(resolve(outputDir, `${name}.png`), new Uint8Array(await image.arrayBuffer()));
}
const check = await book.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!', options: { useRegex: true, maxResults: 10 }, maxChars: 1000 });
await fs.writeFile(resolve(outputDir, 'workbook-check.ndjson'), check.ndjson);
const output = await SpreadsheetFile.exportXlsx(book);
await output.save(resolve(outputDir, outputName));
console.log(`Übersetzungsdatei mit ${rows.length} Positionen erstellt.`);
