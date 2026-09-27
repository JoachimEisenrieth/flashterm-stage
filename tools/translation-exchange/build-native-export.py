"""Read-only FileMaker export wizard for the local macOS development file.
Paths are installation parameters, never credentials. No schema/data writes.
"""
from pathlib import Path
import xml.etree.ElementTree as E
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'outputs/translation-export-dev-20260927'
RUNTIME = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node'
def q(s): return '"'+str(s).replace('\\','\\\\').replace('"','\\"').replace('\n','\\n')+'"'
def sub(e,t,text=None,**attrs):
    x=E.SubElement(e,t,{k:str(v) for k,v in attrs.items()});x.text=text;return x
def step(i,n,c=None):
    e=E.Element('Step',id=str(i),name=n,enable='True')
    if c is not None: sub(e,'Calculation',c)
    return e
def var(n,c):
    e=step(141,'Variable setzen');sub(e,'Name',n);sub(sub(e,'Value'),'Calculation',c);sub(sub(e,'Repetition'),'Calculation','1');return e
def dialog(msg):
    e=step(87,'Eigenes Dialogfeld anzeigen');sub(sub(e,'Title'),'Calculation',q('Übersetzungsauftrag'))
    sub(sub(e,'Message'),'Calculation',msg);bs=sub(e,'Buttons')
    sub(sub(bs,'Button',CommitState='False'),'Calculation','"OK"');sub(bs,'Button',CommitState='False');sub(bs,'Button',CommitState='False');return e
S=[]
def v(n,c): S.append(var(n,c))
def m(fn,*args,n='$r'): v(n,'MBS ( '+q(fn)+''.join(' ; '+a for a in args)+' )')
def stop(cond,message=None):
    S.append(step(68,'Wenn',cond))
    if message:S.append(dialog(message))
    S.extend([step(103,'Aktuelles Script verlassen','"Abgebrochen"'),step(70,'Ende (wenn)')])
S.append(step(89,'# (Kommentar)'));sub(S[-1],'Text','Offline-Entwicklung: read-only Assistent für aktuelle Benennungen und Definitionen. Getrennte interne Auftragsdaten und XLSX für Übersetzer. MBS + lokale Tabellenlaufzeit; keine Veröffentlichung.')
stop('Hole ( DateiName ) ≠ "flashterm-dev" ODER MusterAnzahl ( Hole ( DateiPfad ) ; "file:" ) ≠ 1',q('Dieser Entwicklungsstand ist nur für flashterm-dev offline freigegeben.'))
stop('Hole ( DatensatzOffenStatus ) ≠ 0 ODER Hole ( TransaktionsOffenStatus ) ≠ 0',q('Bitte eine offene Bearbeitung zuerst abschließen.'))
v('$languages','SQLAusführen ( "SELECT DISTINCT languageCode FROM AT_Term WHERE recordFlag = 11 ORDER BY languageCode" ; "" ; "¶" )')
stop('$languages = "?" ODER IstLeer ( $languages )',q('Die verfügbaren Sprachen konnten nicht gelesen werden.'))
language_sql='SELECT DISTINCT "language", "code" FROM AT_Sprache WHERE "guiLanguageCode" = ? AND "code" IN (SELECT DISTINCT languageCode FROM AT_Term WHERE recordFlag = 11)'
def list_start(title,prompt):
    m('ListDialog.Reset');m('ListDialog.SetWindowTitle',q(title));m('ListDialog.SetPrompt',q(prompt));m('ListDialog.SetSelectButtonLabel',q('Weiter'));m('ListDialog.SetSelectButtonValue',q('OK'));m('ListDialog.SetCancelButtonLabel',q('Abbrechen'));m('ListDialog.SetShowsFilter','1');m('ListDialog.SetWidth','640');m('ListDialog.SetHeight','460')
for field,title in [('source','1 von 3: Ausgangssprache'),('target','2 von 3: Zielsprache')]:
    list_start(title,'Sprache für den Übersetzungsauftrag auswählen.')
    query=language_sql+(' AND "code" <> ?' if field=='target' else '')+' ORDER BY "language"'
    args=[q(query),'Hole ( DateiName )',q('de-DE')]+(['$source'] if field=='target' else [])
    m('ListDialog.AddSQL',*args,n='$count');stop('LiesAlsZahl ( $count ) < 1',q('Keine passende Sprache gefunden.'))
    m('ListDialog.ShowDialog',n='$choice');stop('$choice ≠ "OK"');m('ListDialog.GetSelectedTag',n='$'+field);m('ListDialog.GetSelectedTitle',n='$'+field+'Label')
list_start('3 von 3: Begriffe auswählen','Begriffe ankreuzen. Die Suche filtert die Liste; gesetzte Häkchen bleiben erhalten. Bis zu 100 Begriffe je Auftrag.')
m('ListDialog.SetShowCheckboxes','1');m('ListDialog.SetAllowEmptySelection','1');m('ListDialog.SetSelectButtonLabel',q('Excel erstellen'))
m('ListDialog.AddSQL',q('SELECT term, conceptID FROM AT_Term WHERE languageCode = ? AND recordFlag = 11 AND weightingCommon = 2 AND flexionTermID = 0 ORDER BY term'),'Hole ( DateiName )','$source',n='$count');stop('LiesAlsZahl ( $count ) < 1',q('Keine Vorzugsbenennungen in dieser Sprache gefunden.'))
m('ListDialog.ShowDialog',n='$choice');stop('$choice ≠ "OK"');m('ListDialog.GetCheckedTags',n='$selected')
stop('IstLeer ( $selected ) ODER ElementeAnzahl ( $selected ) > 100 ODER Filter ( $selected ; "0123456789¶" ) ≠ $selected',q('Bitte 1 bis 100 Begriffe ankreuzen.'))
v('$ids','Austauschen ( $selected ; "¶" ; "," )')
v('$termSQL',q('SELECT ID, conceptID, languageCode, term, weightingCommon, recordFlag, flexionTermID, footnote1, footnote2 FROM AT_Term WHERE conceptID IN (')+' & $ids & '+q(') AND languageCode IN (?, ?) AND recordFlag = 11 ORDER BY conceptID, languageCode, ID'))
v('$defSQL',q('SELECT conceptID, languageCode, definition, recordFlag, footnote FROM AT_Definition WHERE conceptID IN (')+' & $ids & '+q(') AND languageCode IN (?, ?) AND recordFlag = 11 ORDER BY conceptID, languageCode'))
v('$terms','SQLAusführen ( $termSQL ; "␟" ; "␞" ; $source ; $target )');v('$definitions','SQLAusführen ( $defSQL ; "␟" ; "␞" ; $source ; $target )')
stop('$terms = "?" ODER $definitions = "?"',q('Die ausgewählten Texte konnten nicht gelesen werden.'))
stop('Exakt ( $terms ; SQLAusführen ( $termSQL ; "␟" ; "␞" ; $source ; $target ) ) = 0 ODER Exakt ( $definitions ; SQLAusführen ( $defSQL ; "␟" ; "␞" ; $source ; $target ) ) = 0',q('Der Bestand wurde während des Exports geändert. Bitte erneut starten.'))
v('$jobId','Hole ( UUID )');v('$folder',q(OUT/'auftraege')+' & "/" & $jobId')
m('Files.CreateDirectory','$folder');stop('$r ≠ "OK"',q('Der Auftragsordner konnte nicht erstellt werden.'))
entries=[('database','Hole ( DateiName )'),('filePath','Hole ( DateiPfad )'),('userId','$$NutzerID'),('jobId','$jobId'),('source','$source'),('target','$target'),('languages','$languages'),('selectedIds','$selected'),('terms','$terms'),('definitions','$definitions')]
v('$request','JSONSetElement ( "{}"'+''.join(' ; [ '+q(k)+' ; '+val+' ; JSONString ]' for k,val in entries)+' )')
m('Text.WriteTextFile','$request','$folder & "/request.json"',q('UTF-8'));stop('$r ≠ "OK"',q('Der Ausgangsstand konnte nicht gespeichert werden.'))
m('Shell.New',n='$shell');m('Shell.Execute','$shell',q(RUNTIME/'bin/node'),q(ROOT/'tools/translation-exchange/native-export-cli.mjs'),'$folder & "/request.json"',q(RUNTIME/'node_modules'));stop('$r ≠ "OK"',q('Die lokale Excel-Ausgabe konnte nicht gestartet werden.'))
m('Shell.Wait','$shell','30');m('Shell.IsRunning','$shell',n='$running')
stop('$running ≠ 0',q('Die Excel-Erstellung läuft noch. Der Auftrag liegt unter: ')+' & $folder')
m('Shell.Release','$shell');m('Text.ReadTextFile','$folder & "/result.json"',q('UTF-8'),n='$result')
v('$$TranslationExportResult','$result');stop('JSONGetElement ( $result ; "status" ) ≠ "created"','"Auftrag nicht erstellt: " & JSONGetElement ( $result ; "message" )')
S.append(dialog('JSONGetElement ( $result ; "concepts" ) & " Begriffe, " & JSONGetElement ( $result ; "positions" ) & " Positionen.¶" & $sourceLabel & " → " & $targetLabel & "¶¶Die Excel-Datei liegt im Ordner für den Übersetzer. Der Ausgangsstand wird getrennt aufbewahrt."'))
m('Files.LaunchFile','JSONGetElement ( $result ; "folder" )')
S.append(step(103,'Aktuelles Script verlassen','$result'))
root=E.Element('fmxmlsnippet',type='FMObjectList');s=sub(root,'Script',id='999010',name='7210 Übersetzungsauftrag erstellen',includeInMenu='True',runFullAccess='False');s.extend(S)
OUT.mkdir(parents=True,exist_ok=True);E.indent(root);E.ElementTree(root).write(OUT/'native-export.fmxmlsnippet',encoding='utf-8',xml_declaration=True)
print('Exportassistent:',len(S),'Schritte')
