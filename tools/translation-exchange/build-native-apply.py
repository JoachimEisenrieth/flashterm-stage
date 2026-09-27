"""Native transactional writer for explicitly selected existing target records."""
from pathlib import Path
import xml.etree.ElementTree as E
import copy
src=Path(__file__).with_name('build-native-review.py').read_text()
# Reuse the read-only preparation and current-data capture, not its finish dialog.
exec(src.split("v('$$TranslationReviewResult'")[0])
OUT=ROOT/'outputs/translation-apply-dev-20260927'
# Every invocation creates a fresh review folder; read-only wizard stays unchanged.
def g(base,path): return 'JSONGetElement ( '+base+' ; '+q(path)+' )'
def loop(count,index='$i'):
    v(index,'0');S.append(step(71,'Schleife'));S.append(step(72,'Verlasse Schleife wenn',index+' ≥ '+count))
def endloop(index='$i'):v(index,index+' + 1');S.append(step(73,'Ende (Schleife)'))
m('Text.ReadTextFile','$folder & "/importvorschau.json"',q('UTF-8'),n='$review')
stop(g('$review','counts.ready')+' < 1',q('Es gibt keine neuen konfliktfreien Änderungen. Bereits vorhandene Inhalte werden nicht erneut übernommen.'))
m('ListDialog.Reset');m('ListDialog.SetWindowTitle',q('Positionen zur Übernahme auswählen'));m('ListDialog.SetPrompt',q('Nur konfliktfreie Änderungen sind auswählbar. Bitte die gewünschten Positionen ankreuzen.'));m('ListDialog.SetSelectButtonLabel',q('Weiter'));m('ListDialog.SetSelectButtonValue',q('OK'));m('ListDialog.SetCancelButtonLabel',q('Abbrechen'));m('ListDialog.SetShowCheckboxes','1');m('ListDialog.SetAllowEmptySelection','1');m('ListDialog.SetWidth','960');m('ListDialog.SetHeight','540')
loop('ElementeAnzahl ( JSONListKeys ( $review ; "rows" ) )')
v('$row','JSONGetElement ( $review ; "rows[" & $i & "]" )');S.append(step(68,'Wenn',g('$row','status')+' = "ready"'))
m('ListDialog.AddItemToList',g('$row','label')+' & " · " & Wenn ( '+g('$row','field')+' = "definition" ; "Definition" ; "Benennung" ) & " · " & '+g('$row','target')+' & " → " & Left ( Austauschen ( '+g('$row','after')+' ; "¶" ; " " ) ; 100 )',g('$row','rowId'));S.append(step(70,'Ende (wenn)'));endloop()
m('ListDialog.ShowDialog',n='$choice');stop('$choice ≠ "OK"');m('ListDialog.GetCheckedTags',n='$approved');stop('IstLeer ( $approved )')
# Re-read after user selection. The helper re-evaluates all selected positions.
exec(part)
request(identity+[(k,'$'+k) for k in ['jobId','selectedIds','source','target','languages','terms','definitions']]+[('approvedRowIds','$approved')],'apply-plan-request.json');run('apply-plan','apply-plan-request.json','planned');v('$plan','$result')
stop('ElementeAnzahl ( JSONListKeys ( $plan ; "changes" ) ) < 1',q('Die ausgewählten Inhalte sind bereits vorhanden.'))
v('$summary','""');loop('ElementeAnzahl ( JSONListKeys ( $plan ; "changes" ) )')
v('$row','JSONGetElement ( $plan ; "changes[" & $i & "]" )');v('$summary','$summary & '+g('$row','label')+' & " · " & Wenn ( '+g('$row','field')+' = "definition" ; "Definition" ; "Benennung" ) & "¶"');endloop()
e=dialog('"Diese Positionen jetzt in flashterm-dev übernehmen?¶¶" & $summary & "¶Die Änderungen werden gemeinsam gespeichert und protokolliert."');bs=e.find('Buttons');bs[0].find('Calculation').text='"Übernehmen"';sub(bs[1],'Calculation','"Abbrechen"');S.append(e);stop('Hole ( LetzteMeldungswahl ) ≠ 1')
# Native field and layout bindings, from the existing FileMaker schema export.
r=E.parse(ROOT/'outputs/translation-roundtrip-20260927/flashterm-fungi.xml').getroot();fields={}
for cat in r.iter('FieldCatalog'):
    ref=cat.find('BaseTableReference')
    if ref is not None and ref.get('name') in ('Term','Definition','Concept'):fields['AT_'+ref.get('name')]={f.get('name'):f.get('id') for f in cat.findall('./ObjectList/Field')}
trans={x.get('id'):x for x in E.parse(ROOT/'outputs/translation-roundtrip-20260927/transaction-template.fmxmlsnippet').getroot()}
def field(table,name,value):
    e=step(76,'Feldwert setzen',value);sub(e,'Field',table=table,name=name,id=fields[table][name]);S.append(e)
def lay(table):
    e=step(6,'Gehe zu Layout');sub(e,'LayoutDestination',value='SelectedLayout');sub(e,'Layout',name=table,id={'AT_Term':831,'AT_Definition':835,'AT_Concept':836}[table]);S.append(e)
def fail(condition,message):
    S.append(step(68,'Wenn',condition));v('$failure',q(message));S.append(copy.deepcopy(trans['207']));S.append(step(70,'Ende (wenn)'))
def check(message):v('$error','Hole ( LetzteFehlerNr )');fail('$error ≠ 0',message)
def find(table):
    lay(table);check('Layout konnte nicht geöffnet werden.')
    e=step(22,'Suchenmodus aktivieren');sub(e,'Pause',state='False');S.append(e);check('Suchenmodus fehlgeschlagen.')
    for name,value in ([('conceptID',g('$item','conceptId')),('languageCode',g('$item','language')),('recordFlag','"11"')] if table=='AT_Definition' else [('ID',g('$item','id'))]):field(table,name,'"==" & '+value)
    e=step(28,'Ergebnismenge suchen');sub(e,'Restore',state='False');S.append(e);v('$error','Hole ( LetzteFehlerNr )');fail('$error ≠ 0 ODER Hole ( AnzahlGefundeneDatensätze ) ≠ 1','Datensatz fehlt oder ist nicht eindeutig.')
    S.append(step(133,'Datensatz/Abfrage öffnen'));check('Datensatz ist gesperrt oder nicht bearbeitbar.')
# Use the current window and restore its layout after the transaction. No window
# changes occur while the transaction is open.
v('$layout','Hole ( LayoutName )');v('$failure','""');v('$error','0');v('$completed','0')
for id,name,state in [(86,'Fehleraufzeichnung setzen','True'),(85,'AnwenderAbbruchZulassen','False')]:
    e=step(id,name);sub(e,'Set',state=state);S.append(e)
S.append(copy.deepcopy(trans['205']));v('$error','Hole ( LetzteFehlerNr )');stop('$error ≠ 0',q('Transaktion konnte nicht geöffnet werden.'))
loop('ElementeAnzahl ( JSONListKeys ( $plan ; "locks" ) )')
v('$item','JSONGetElement ( $plan ; "locks[" & $i & "]" )')
for table in ['AT_Concept','AT_Term','AT_Definition']:
    S.append(step(68,'Wenn',g('$item','table')+' = '+q(table)));find(table);S.append(step(70,'Ende (wenn)'))
endloop()
fail('Exakt ( '+g('$plan','baseline.terms')+' ; SQLAusführen ( $termSQL ; "␟" ; "␞" ; $source ; $target ) ) = 0 ODER Exakt ( '+g('$plan','baseline.definitions')+' ; SQLAusführen ( $defSQL ; "␟" ; "␞" ; $source ; $target ) ) = 0','Der Bestand wurde seit der Auswahl geändert. Bitte erneut prüfen.')
loop('ElementeAnzahl ( JSONListKeys ( $plan ; "operations" ) )')
v('$item','JSONGetElement ( $plan ; "operations[" & $i & "]" )')
for table in ['AT_Term','AT_Definition']:
    S.append(step(68,'Wenn',g('$item','table')+' = '+q(table)));find(table)
    fail(table+'::conceptID ≠ '+g('$item','conceptId')+' ODER '+table+'::languageCode ≠ '+g('$item','language'),'Datensatzzuordnung wurde geändert.')
    for name in (['term','definition'] if table=='AT_Term' else ['definition']):
        S.append(step(68,'Wenn',g('$item','field')+' = '+q(name)));field(table,name,g('$item','after'));check('Text konnte nicht geschrieben werden.');fail('Exakt ( '+table+'::'+name+' ; '+g('$item','after')+' ) = 0','Gespeicherter Text weicht vom Vorschlag ab.');S.append(step(70,'Ende (wenn)'))
    field(table,'updater','$$NutzerID');check('Bearbeiter konnte nicht gespeichert werden.');field(table,'modification','Hole ( SystemZeitstempel )');check('Zeitpunkt konnte nicht gespeichert werden.');S.append(step(70,'Ende (wenn)'))
endloop()
fail('Hole ( ScriptParameter ) = "rollback-test"','Absichtlicher Rücknahmetest')
v('$completed','1');S.append(copy.deepcopy(trans['206']));v('$commitError','Hole ( LetzteFehlerNr )')
v('$status','Wenn ( $completed = 1 UND $commitError = 0 ; "committed" ; "rolled-back" )')
v('$journal','JSONSetElement ( $plan ; [ "status" ; $status ; JSONString ] ; [ "databaseChanged" ; $status = "committed" ; JSONBoolean ] ; [ "completedAt" ; Hole ( SystemZeitstempel ) ; JSONString ] ; [ "userId" ; $$NutzerID ; JSONString ] ; [ "error" ; $commitError ; JSONNumber ] ; [ "reason" ; $failure ; JSONString ] )')
m('Text.WriteTextFile','$journal','$folder & "/aenderungsprotokoll-ergebnis.json"',q('UTF-8'),n='$journalSaved');v('$$TranslationApplyResult','$journal')
e=step(6,'Gehe zu Layout');sub(e,'LayoutDestination',value='OriginalLayout');S.append(e)
S.append(dialog('Wenn ( $status = "committed" ; ElementeAnzahl ( JSONListKeys ( $plan ; "changes" ) ) & " Position(en) übernommen." ; "Keine Änderungen gespeichert.¶" & $failure & "¶Fehler: " & $commitError ) & Wenn ( $journalSaved ≠ "OK" ; "¶Das Abschlussprotokoll konnte nicht gespeichert werden. Vorbereitungsprotokoll aufbewahren und Ergebnis prüfen." ; "¶Änderungsprotokoll gespeichert." )'))
S.append(step(103,'Aktuelles Script verlassen','$journal'))
root=E.Element('fmxmlsnippet',type='FMObjectList');s=sub(root,'Script',id='999012',name='7230 Übersetzungsrücklieferung übernehmen',includeInMenu='True',runFullAccess='False');s.extend(S)
OUT.mkdir(parents=True,exist_ok=True);E.indent(root);E.ElementTree(root).write(OUT/'native-apply.fmxmlsnippet',encoding='utf-8',xml_declaration=True);print(len(S),'Schritte')
