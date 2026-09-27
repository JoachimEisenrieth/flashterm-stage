"""Generate a narrowly guarded native import for the reviewed five-concept pilot.
Not a general production importer. Reads the validated XLSX receipt, never formula text.
"""
from pathlib import Path
import json, copy, sys
import xml.etree.ElementTree as E
P = Path(__file__).resolve().parents[2] / 'outputs/translation-roundtrip-20260927'
file_name = sys.argv[1] if len(sys.argv)>1 else 'flashterm-test-a'
assert file_name in ('flashterm-test-a', 'flashterm-fungi')
job = json.loads((P/'auftrag/auftrag-intern.json').read_text())
receipt = json.loads((P/'ruecklauf-ausgefuellt/ruecklieferung.json').read_text())
review = json.loads((P/'ruecklauf-ausgefuellt/importvorschau.json').read_text())
before = json.loads((P/'native-before.json').read_text())
assert len(receipt)==10 and len(review['rows'])==10 and all(x['status']=='ready' for x in review['rows'])
returned={x['rowId']:x for x in receipt}
terms=[r.split('␟') for r in before['terms'].split('␞')]
defs=[r.split('␟') for r in before['definitions'].split('␞')]
items=[]
for cid in ['100001','100067','100284','100286','100288']:
    rows={r['field']:r for r in job['rows'] if r['conceptId']==cid}
    for kind,row in rows.items():
        assert returned[row['rowId']]['status']=='Fertig'
        assert returned[row['rowId']]['translation'].strip()
        if kind=='definition':
            assert next(d[2] for d in defs if d[0]==cid and d[1]=='de-DE')==row['sourceText']
        else: assert any(t[1]==cid and t[2]=='de-DE' and t[3]==row['sourceText'] for t in terms)
    target=[t for t in terms if t[1]==cid and t[2]=='en-US']
    preferred=[t for t in target if t[4:6]==['2','2']]
    assert len(preferred)==(1 if cid=='100001' else 0)
    items.append(dict(id=cid,term=returned[rows['preferredTerm']['rowId']]['translation'],definition=returned[rows['definition']['rowId']]['translation'],target=target,preferred=preferred,rows=rows))
R=E.parse(P/'flashterm-fungi.xml').getroot()
fields={}
for cat in R.iter('FieldCatalog'):
    ref=cat.find('BaseTableReference')
    if ref is not None and ref.get('name') in ('Term','Definition','Concept'):
        fields['AT_'+ref.get('name')]={f.get('name'):f.get('id') for f in cat.findall('./ObjectList/Field')}
trans={x.get('id'):x for x in E.parse(P/'transaction-template.fmxmlsnippet').getroot()}
def sub(e,t,text=None,**a):
    x=E.SubElement(e,t,{k:str(v) for k,v in a.items()});x.text=text;return x
def st(i,n,c=None):
    x=E.Element('Step',enable='True',id=str(i),name=n)
    if c is not None:sub(x,'Calculation',c)
    return x
def q(s):return '"'+s.replace('\\','\\\\').replace('"','\\"').replace('\n','\\n')+'"'
def var(n,c):
    x=st(141,'Variable setzen');sub(x,'Name',n);sub(sub(x,'Value'),'Calculation',c);sub(sub(x,'Repetition'),'Calculation','1');return x
def iff(c):return st(68,'Wenn',c)
def end():return st(70,'Ende (wenn)')
def field(t,n,c):
    x=st(76,'Feldwert setzen',c);sub(x,'Field',table=t,name=n,id=fields[t][n]);return x
def lay(t):
    x=st(6,'Gehe zu Layout');sub(x,'LayoutDestination',value='SelectedLayout');sub(x,'Layout',name=t,id={'AT_Term':831,'AT_Definition':835,'AT_Concept':836}[t]);return x
def find(t,criteria):
    x=st(28,'Ergebnismenge suchen');sub(x,'Restore',state='True');row=sub(sub(x,'Query'),'RequestRow',operation='Include')
    for n,v in criteria.items():
        c=sub(row,'Criteria');sub(c,'Field',table=t,name=n,id=fields[t][n]);sub(c,'Text','=='+str(v))
    return x
def comment(t):
    x=st(89,'# (Kommentar)');sub(x,'Text',t);return x
def sql(s):return f'SQLAusführen ( {q(s)} ; "␟" ; "␞" )'
ids=','.join(i['id'] for i in items)
T=sql(f'SELECT ID, conceptID, languageCode, term, weightingCommon, weightingSpecial, recordFlag, definition FROM AT_Term WHERE conceptID IN ({ids}) ORDER BY conceptID, languageCode, ID')
D=sql(f'SELECT conceptID, languageCode, definition, recordFlag FROM AT_Definition WHERE conceptID IN ({ids}) ORDER BY conceptID, languageCode')
report_path=str(P/f'{file_name}-import-result.json')
def report(status):
    return f'JSONSetElement ( "{{}}" ; [ "status" ; {q(status)} ; JSONString ] ; [ "file" ; Hole ( DateiName ) ; JSONString ] ; [ "jobId" ; {q(job["jobId"])} ; JSONString ] ; [ "error" ; $err ; JSONNumber ] ; [ "phase" ; $phase ; JSONString ] ; [ "changes" ; $changes ; JSONNumber ] ; [ "terms" ; {T} ; JSONString ] ; [ "definitions" ; {D} ; JSONString ] )'
def out(status):
    return [var('$$TranslationPilotResult',report(status)),var('$written',f'MBS ( "Text.WriteTextFile" ; $$TranslationPilotResult ; {q(report_path)} ; "UTF-8" )')]
def fail(condition,phase):
    return [iff(condition),var('$phase',q(phase)),copy.deepcopy(trans['207']),end()]
def check(phase):
    return [var('$err','Hole ( LetzteFehlerNr )')]+fail('$err ≠ 0',phase)
def write(t,n,c):return [field(t,n,c)]+check(t+'::'+n)
def existing(t,crit,phase):
    return [lay(t)]+check('Layout '+t)+[find(t,crit),var('$err','Hole ( LetzteFehlerNr )')]+fail('$err ≠ 0 ODER Hole ( AnzahlGefundeneDatensätze ) ≠ 1',phase)+[st(133,'Datensatz/Abfrage öffnen')]+check('Sperren '+phase)
steps=[comment('2026-09-27 · Kontrollierter Übersetzungsimport des geprüften XLSX-Auftrags. Nur lokale benannte Datei; alle Änderungen in einer Transaktion. Kein allgemeiner Produktionsimport. Neue Benennungen behalten den nativen Entwurfsstatus. Keine Veröffentlichung.'),
 iff(f'Hole ( DateiName ) ≠ {q(file_name)} ODER Hole ( TransaktionsOffenStatus ) ≠ 0 ODER Hole ( DatensatzOffenStatus ) ≠ 0 ODER MusterAnzahl ( Hole ( DateiPfad ) ; "file:" ) ≠ 1'),st(103,'Aktuelles Script verlassen','"STOP: Dateikontext oder offene Bearbeitung"'),end(),
 var('$changes','0'),var('$err','0'),var('$phase','"Vorprüfung"')]
# Same delivery is a no-op when all ten values already exist exactly once.
complete=[]
for x in items:
 c=x['id']; complete += [f'Exakt ( {sql(f"SELECT term FROM AT_Term WHERE conceptID = {c} AND languageCode = \'en-US\' AND recordFlag = 11 AND weightingCommon = 2 AND flexionTermID = 0")} ; {q(x["term"])} )',f'Exakt ( {sql(f"SELECT definition FROM AT_Definition WHERE conceptID = {c} AND languageCode = \'en-US\' AND recordFlag = 11")} ; {q(x["definition"])} )']
steps += [iff(' UND '.join(complete))]+out('unchanged')+[st(103,'Aktuelles Script verlassen','$$TranslationPilotResult'),end()]
steps += [var('$before',f'MBS ( "Text.ReadTextFile" ; {q(str(P/"native-before.json"))} ; "UTF-8" )'),iff(f'Exakt ( {T} ; JSONGetElement ( $before ; "terms" ) ) = 0 ODER Exakt ( {D} ; JSONGetElement ( $before ; "definitions" ) ) = 0')]+out('conflict')+[st(103,'Aktuelles Script verlassen','$$TranslationPilotResult'),end()]
e=st(86,'Fehleraufzeichnung setzen');sub(e,'Set',state='True');steps.append(e)
e=st(85,'AnwenderAbbruchZulassen');sub(e,'Set',state='False');steps.append(e)
steps += [var('$phase','"Transaktion"'),copy.deepcopy(trans['205']),var('$err','Hole ( LetzteFehlerNr )'),iff('$err ≠ 0')]+out('failed')+[st(103,'Aktuelles Script verlassen','$$TranslationPilotResult'),end()]
for x in items:
    steps+=existing('AT_Concept',{'ID':x['id']},'Begriff '+x['id'])
steps+=fail(f'Exakt ( {T} ; JSONGetElement ( $before ; "terms" ) ) = 0 ODER Exakt ( {D} ; JSONGetElement ( $before ; "definitions" ) ) = 0','Bestand nach Sperren verändert')
for x in items:
    cid=x['id'];t='AT_Definition'
    old=[d for d in defs if d[0]==cid and d[1]=='en-US']
    if old:
        assert len(old)==1
        steps+=existing(t,{'conceptID':cid,'languageCode':'en-US'},'Definition '+cid)
        steps+=fail(f'Exakt ( {t}::definition ; {q(old[0][2])} ) = 0','Definition geändert '+cid)
    else:
        steps += [lay(t)]+check('Layout Definition')+[find(t,{'conceptID':cid,'languageCode':'en-US'}),var('$err','Hole ( LetzteFehlerNr )')]+fail('$err ≠ 401 ODER Hole ( AnzahlGefundeneDatensätze ) ≠ 0','Sprachebene existiert inzwischen '+cid)+[st(7,'Neuer Datensatz/Abfrage')]+check('Neue Definition '+cid)
        for n,v in [('conceptID',cid),('languageCode','"en-US"'),('recordFlag','11'),('originator','$$NutzerID'),('origination','Hole ( SystemZeitstempel )')]:steps+=write(t,n,v)
    steps+=write(t,'definition',q(x['definition']))
    steps+=write(t,'updater','$$NutzerID')+write(t,'modification','Hole ( SystemZeitstempel )')
    steps+=[var('$changes','$changes + 1')]
    t='AT_Term'
    if x['preferred']:
        old=x['preferred'][0]
        steps+=existing(t,{'ID':old[0]},'Benennung '+cid)
        steps+=fail(f'Exakt ( {t}::term ; {q(old[3])} ) = 0 ODER {t}::conceptID ≠ {cid} ODER {t}::languageCode ≠ "en-US"','Benennung geändert '+cid)
    else:
        steps += [lay(t)]+check('Layout Term')+[find(t,{'conceptID':cid,'languageCode':'en-US'}),var('$err','Hole ( LetzteFehlerNr )')]+fail('$err ≠ 401 ODER Hole ( AnzahlGefundeneDatensätze ) ≠ 0','Benennung existiert inzwischen '+cid)+[st(7,'Neuer Datensatz/Abfrage')]+check('Neue Benennung '+cid)
        for n,v in [('conceptID',cid),('languageCode','"en-US"'),('weightingCommon','2'),('weightingSpecial','2'),('textDirection','"LTR"'),('originator','$$NutzerID'),('origination','Hole ( SystemZeitstempel )')]:steps+=write(t,n,v)
    steps+=write(t,'term',q(x['term']))+write(t,'recordFlag','11')+write(t,'definition',q(x['definition']))+write(t,'updater','$$NutzerID')+write(t,'modification','Hole ( SystemZeitstempel )')
    steps+=[var('$changes','$changes + 1')]
    # Refresh native lookups for existing alternatives as the existing denormalizer does.
    for term in x['target']:
        if x['preferred'] and term[0]==x['preferred'][0][0]:continue
        steps+=existing(t,{'ID':term[0]},'Ableitung '+term[0])+write(t,'recordFlag',f'{t}::recordFlag')
steps += [var('$phase','"Vor Bestätigung"')]
# Deliberate rollback test is available before any permanent write.
steps += fail('Hole ( ScriptParameter ) = "rollback-test" ODER $$TranslationPilotMode = "rollback-test"','Absichtlicher Rollback-Test')
steps += [copy.deepcopy(trans['206']),var('$commitError','Hole ( LetzteFehlerNr )'),iff('$phase ≠ "Vor Bestätigung" ODER $commitError ≠ 0'),var('$err','Wenn ( $err ≠ 0 ; $err ; $commitError )')]+out('rolled-back')+[st(103,'Aktuelles Script verlassen','$$TranslationPilotResult'),end()]
steps += [var('$phase','"Bestätigt"')]+out('committed')+[st(103,'Aktuelles Script verlassen','$$TranslationPilotResult')]
root=E.Element('fmxmlsnippet',type='FMObjectList')
s=E.SubElement(root,'Script',id='999001',name='7200 Übersetzungsauftrag übernehmen – lokaler Pilot',includeInMenu='False',runFullAccess='False');s.extend(steps)
E.indent(root);E.ElementTree(root).write(P/f'{file_name}-native-import.fmxmlsnippet',encoding='utf-8',xml_declaration=True)
print('Generated native pilot:',len(steps),'steps; target:',file_name)
