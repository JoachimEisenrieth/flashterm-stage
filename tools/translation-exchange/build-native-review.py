"""Generate read-only return-review wizard; reuses the export XML primitives."""
from pathlib import Path
import xml.etree.ElementTree as E
# Load only builder definitions, without running or rewriting the export wizard.
source=Path(__file__).with_name('build-native-export.py').read_text()
exec(source.split('S.append(step(89')[0])
OUT=ROOT/'outputs/translation-review-dev-20260927'
PYTHON=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
stop('Hole ( DateiName ) ≠ "flashterm-dev" ODER MusterAnzahl ( Hole ( DateiPfad ) ; "file:" ) ≠ 1',q('Dieser Entwicklungsstand ist nur für flashterm-dev offline freigegeben.'))
stop('Hole ( DatensatzOffenStatus ) ≠ 0 ODER Hole ( TransaktionsOffenStatus ) ≠ 0',q('Bitte eine offene Bearbeitung zuerst abschließen.'))
m('FileDialog.Reset');m('FileDialog.SetAllowMulti','0');m('FileDialog.SetWindowTitle',q('Übersetzungsrücklieferung auswählen'));m('FileDialog.OpenFileDialog',n='$choice');stop('$choice ≠ "OK"');m('FileDialog.GetPath','0',n='$workbook')
v('$folder',q(OUT/'pruefungen')+' & "/" & Hole ( UUID )');m('Files.CreateDirectory','$folder');stop('$r ≠ "OK"',q('Prüfordner konnte nicht erstellt werden.'))
def request(entries,name):
    v('$request','JSONSetElement ( "{}"'+''.join(' ; [ '+q(k)+' ; '+val+' ; JSONString ]' for k,val in entries)+' )')
    m('Text.WriteTextFile','$request','$folder & '+q('/'+name),q('UTF-8'));stop('$r ≠ "OK"',q('Prüfdaten konnten nicht gespeichert werden.'))
def run(mode,name,status):
    m('Shell.New',n='$shell');m('Shell.Execute','$shell',q(RUNTIME/'bin/node'),q(ROOT/'tools/translation-exchange/native-review-cli.mjs'),q(mode),'$folder & '+q('/'+name),q(ROOT/'outputs/translation-export-dev-20260927/auftraege'),q(PYTHON));stop('$r ≠ "OK"',q('Lokale Prüfung konnte nicht gestartet werden.'))
    m('Shell.Wait','$shell','30');m('Shell.IsRunning','$shell',n='$running');stop('$running ≠ 0',q('Prüfung läuft noch. Bitte den Prüfordner kontrollieren: ')+' & $folder');m('Shell.Release','$shell');m('Text.ReadTextFile','$folder & '+q('/'+mode+'-result.json'),q('UTF-8'),n='$result');stop('JSONGetElement ( $result ; "status" ) ≠ '+q(status),'"Prüfung abgebrochen: " & JSONGetElement ( $result ; "message" )')
identity=[('database','Hole ( DateiName )'),('filePath','Hole ( DateiPfad )')]
request(identity+[('workbook','$workbook')],'prepare-request.json');run('prepare','prepare-request.json','prepared')
for k in ['jobId','selectedIds','source','target']:v('$'+k,'JSONGetElement ( $result ; '+q(k)+' )')
stop('IstLeer ( $selectedIds ) ODER ElementeAnzahl ( $selectedIds ) > 100 ODER FilterZeichen ( $selectedIds ; "0123456789¶" ) ≠ $selectedIds',q('Ungültige Begriffsauswahl.'))
v('$ids','Austauschen ( $selectedIds ; "¶" ; "," )')
# Use precisely the same ordered native queries as the export baseline.
part=source[source.index("v('$termSQL'"):source.index("v('$jobId'")]
exec(part)
v('$languages','SQLAusführen ( "SELECT DISTINCT languageCode FROM AT_Term WHERE recordFlag = 11 ORDER BY languageCode" ; "" ; "¶" )');stop('$languages = "?"',q('Sprachen konnten nicht gelesen werden.'))
request(identity+[(k,'$'+k) for k in ['jobId','selectedIds','source','target','languages','terms','definitions']],'review-request.json');run('review','review-request.json','reviewed')
v('$$TranslationReviewResult','$result')
S.append(dialog('"Prüfung abgeschlossen.¶¶" & JSONGetElement ( $result ; "counts.ready" ) & " zur Übernahme bereit¶" & JSONGetElement ( $result ; "counts.conflict" ) & " Konflikte¶" & JSONGetElement ( $result ; "counts.unchanged" ) & " bereits vorhanden¶" & JSONGetElement ( $result ; "counts.pending" ) & " noch offen¶¶Es wurden keine Inhalte übernommen. Die Vorschau wird anschließend geöffnet."'))
m('Files.LaunchFile','JSONGetElement ( $result ; "report" )');S.append(step(103,'Aktuelles Script verlassen','$result'))
root=E.Element('fmxmlsnippet',type='FMObjectList');s=sub(root,'Script',id='999011',name='7220 Übersetzungsrücklieferung prüfen',includeInMenu='True',runFullAccess='False');s.extend(S)
OUT.mkdir(parents=True,exist_ok=True);E.indent(root);E.ElementTree(root).write(OUT/'native-review.fmxmlsnippet',encoding='utf-8',xml_declaration=True)
print(len(S),'Schritte')
