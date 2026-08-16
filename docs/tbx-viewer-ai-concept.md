# Produktidee: TBX-Viewer und AI-gestützte Terminologiearbeit

Stand: 16. August 2026

Status: Explorationsidee, noch nicht priorisiert oder zur Umsetzung freigegeben

## Kurzfassung

flashterm stage könnte neben FileMaker eine lokale TBX-Datei als Terminologiequelle öffnen. Nutzerinnen und Nutzer würden eine vorhandene TermBase eXchange-Datei im Browser auswählen und anschließend die vertrauten Funktionen Wiki, Inspector, Translator und Export verwenden.

Die Datei soll im bevorzugten Szenario lokal im Browser verarbeitet und nicht automatisch an einen Server übertragen werden. Darauf aufbauend könnte flashterm stage später AI-gestützte Funktionen anbieten, die Terminologiedaten verständlicher, prüfbarer und leichter nutzbar machen. AI ergänzt dabei die kuratierten Einträge; sie ersetzt weder die Terminologiequelle noch die fachliche Freigabe.

## Ausgangslage

Viele Organisationen können Terminologiedaten als TBX exportieren, verfügen außerhalb ihres Terminologiesystems aber nicht zwingend über eine leicht zugängliche, verständliche Nutzungsoberfläche. Ein Export bleibt dann eine technische Austauschdatei, obwohl sein Inhalt für Marketing, Dokumentation, Zulassung, Übersetzung und weitere Bereiche wertvoll wäre.

TBX ist ein XML-basiertes Austauschformat für begriffsorientierte Terminologiedaten. ISO 30042:2019 beschreibt die TBX-Kernstruktur und die Methodik für unterschiedliche TBX-Dialekte. Daraus folgt zugleich eine wichtige Einschränkung: Eine Dateiendung allein garantiert noch keine überall identische Feldbelegung.

## Produktversprechen als Hypothese

> Eine TBX-Datei öffnen und Terminologie sofort verstehen, durchsuchen, in Texten prüfen und kontrolliert weiterverwenden – ohne zuerst ein Terminologiesystem installieren oder konfigurieren zu müssen.

Dieses Versprechen ist zunächst eine Hypothese. Es muss mit realen TBX-Dateien und realen Arbeitsabläufen überprüft werden.

## Vorgesehener Nutzungsvorgang

1. Die Nutzerin wählt in flashterm stage **TBX öffnen**.
2. Sie wählt eine lokale `.tbx`-Datei aus.
3. flashterm stage prüft XML-Struktur, erkannte TBX-Variante und unterstützte Inhalte.
4. Ein Importbericht nennt Sprachen, Concepts, Benennungen, Warnungen und nicht zugeordnete Datenkategorien.
5. Die Terminologie kann über Wiki, Inspector und Translator verwendet werden.
6. Ergebnisse lassen sich mit den bestehenden Excel-, CSV- und JSON-Formaten weitergeben.
7. Beim Schließen oder bewussten Entfernen der Datei endet die lokale Sitzung.

Der UI-Text sollte von **Datei öffnen** oder **lokal laden** sprechen. **Hochladen** wäre irreführend, solange keine Übertragung an einen Server stattfindet.

## Warum die Idee zu flashterm stage passt

- flashterm stage besitzt bereits eine verständliche Concept-Ansicht.
- Suche, Textprüfung und sprachpaarbezogene Nutzung sind vorhanden.
- Preferred, Alternative und Rejected besitzen eine sichtbare, etablierte Semantik.
- Excel, CSV und JSON decken menschliche und technische Weiterverwendung ab.
- Das interne Repository liefert bereits Sprachen, Termini und Concepts über einen kleinen Vertrag.
- Eine zweite Quelle würde praktisch zeigen, ob die angestrebte Quellenunabhängigkeit trägt.

Das Zielbild lautet:

```text
FileMaker ─┐
           ├─ quellenneutraler Terminologievertrag ─ Wiki / Inspector / Translator / Export
TBX-Datei ─┘
```

## Minimaler TBX-Viewer

Ein erster belastbarer Umfang sollte bewusst eng bleiben:

- lokale Auswahl genau einer TBX-Datei,
- gut geformtes XML als Mindestvoraussetzung,
- vorrangige Ausrichtung auf TBX 3 und ein dokumentiertes TBX-Basic-Profil,
- Erkennung der enthaltenen Sprachen,
- Concepts mit stabiler interner ID,
- bevorzugte, alternative und abgelehnte Benennungen, soweit eindeutig abbildbar,
- Definitionen und Kontexte,
- verständlicher Importbericht,
- Nutzung in Wiki, Inspector und Translator,
- bestehende Exporte,
- vollständiges Entfernen der geladenen Daten aus der Sitzung.

Nicht unterstützte Inhalte dürfen nicht stillschweigend verloren gehen. Der Importbericht soll mindestens Anzahl und Art nicht zugeordneter Datenkategorien nennen, ohne vertrauliche Inhalte unnötig zu protokollieren.

## AI-Potenzial

### 1. Terminologie erklären

AI könnte vorhandene, freigegebene Daten verständlicher aufbereiten:

- Definitionen in zielgruppengerechter Sprache erläutern,
- Unterschiede zwischen ähnlichen Concepts zusammenfassen,
- Begründungen für Preferred- und Rejected-Status aus vorhandenen Angaben ableiten,
- fehlende Informationen sichtbar machen.

Erzeugte Erläuterungen müssen klar als AI-generiert gekennzeichnet und von den Quelldaten getrennt bleiben.

### 2. Texte kontextbezogen prüfen

Der heutige Inspector erkennt hinterlegte Benennungen. AI könnte später zusätzliche Vorschläge liefern:

- Flexionsformen und sprachliche Varianten erkennen,
- kontextabhängige Fehlverwendungen unterscheiden,
- mögliche Terminologielücken markieren,
- eine verständliche Begründung zur vorgeschlagenen Benennung formulieren.

Die deterministische Prüfung gegen freigegebene Termini bleibt die verlässliche Grundlage. AI-Hinweise bilden eine zusätzliche, schwächer abgesicherte Ebene.

### 3. Terminologiedaten untersuchen

Für Terminologieverantwortliche könnte AI Qualitätsfragen vorbereiten:

- ähnliche oder möglicherweise doppelte Concepts finden,
- widersprüchliche Definitionen und Statusangaben markieren,
- fehlende Zielsprachen oder Definitionen priorisieren,
- uneinheitliche Schreibweisen und Metadaten erkennen,
- Kandidaten aus Textkorpora mit bestehenden Concepts abgleichen.

Diese Ergebnisse sind Prüfhinweise, keine automatischen Änderungen an der TBX-Datei.

### 4. Kontrollierte Anreicherung vorbereiten

Langfristig könnte AI Vorschläge für Definitionen, Kontexte, Synonyme oder Übersetzungen erzeugen. Dafür gilt:

- Vorschläge bleiben von importierten und freigegebenen Daten getrennt,
- jede Übernahme erfordert eine bewusste fachliche Bestätigung,
- Herkunft, Modell, Zeitpunkt und Bearbeitungsstatus müssen nachvollziehbar sein,
- ein Export darf AI-Vorschläge nicht unbemerkt als freigegebene Terminologie ausgeben.

## Datenschutz- und Vertrauensmodell

Der reine Viewer sollte ohne externe Übertragung funktionieren. Das ist besonders wertvoll für vertrauliche Unternehmens- und Produktterminologie.

AI-Funktionen benötigen ein eigenes, transparentes Betriebsmodell:

- **Lokal:** Verarbeitung bleibt auf dem Gerät, soweit ein geeignetes Modell verfügbar ist.
- **Unternehmensdienst:** Verarbeitung erfolgt über einen vertraglich und technisch kontrollierten AI-Dienst.
- **Externer Dienst:** Inhalte werden erst nach ausdrücklicher Zustimmung und verständlicher Information übertragen.

Vor jeder AI-Funktion muss sichtbar sein, welche Daten den lokalen Browser verlassen. TBX-Dateien und vollständige Terminologiebestände dürfen niemals allein durch das Öffnen der Datei übertragen werden.

## Fachliche Leitplanken

- Kuratierte Quelldaten haben Vorrang vor generierten Aussagen.
- Deterministische Treffer und AI-Einschätzungen werden visuell getrennt.
- AI darf keinen Benennungsstatus erfinden oder eigenständig ändern.
- Unsicherheit und fehlende Datengrundlage werden sichtbar gemacht.
- Quellenhinweise beziehen sich auf konkrete TBX-Inhalte, nicht nur auf eine generierte Zusammenfassung.
- Menschen entscheiden über Freigabe, Änderung und Export erzeugter Vorschläge.
- Sensible Inhalte erscheinen weder in Diagnose-Logs noch in Telemetrie-Payloads.

## Bewusste Nicht-Ziele des ersten Schritts

- vollständige Unterstützung aller TBX-Versionen, Dialekte und herstellerspezifischen Erweiterungen,
- Bearbeitung und verlustfreier Rückexport beliebiger TBX-Dateien,
- automatische Übersetzung ganzer Texte,
- ungeprüfte automatische Korrektur,
- Versand kompletter Terminologiebestände an einen AI-Dienst,
- Ablösung professioneller Terminologieverwaltung.

## Offene Fragen

### Produkt

- Ist der größte Nutzen ein universeller Viewer, die Textprüfung oder die AI-gestützte Qualitätsanalyse?
- Arbeiten die Zielgruppen regelmäßig mit TBX-Dateien oder müsste der Export zunächst durch Terminologieverantwortliche bereitgestellt werden?
- Ist eine temporäre lokale Sitzung ausreichend oder wird ein dauerhaft gespeicherter Arbeitsbestand benötigt?
- Welche Ergebnisse müssen geteilt oder revisionssicher dokumentiert werden?

### Daten

- Welche TBX-Versionen und Dialekte liefern die tatsächlich verwendeten Systeme?
- Wie werden Preferred, Alternative und Rejected in diesen Dateien codiert?
- Welche Datenkategorien lassen sich eindeutig in das bestehende Concept-Modell abbilden?
- Wie sollen unbekannte Erweiterungen erhalten oder angezeigt werden?
- Welche praktischen Dateigrößen müssen flüssig verarbeitet werden?

### AI

- Welche Aufgaben benötigen wirklich ein Sprachmodell und welche lassen sich verlässlicher regelbasiert lösen?
- Welche Daten dürfen eine lokale Umgebung verlassen?
- Wie werden AI-Vorschläge fachlich bewertet und freigegeben?
- Welche Qualitätsmetriken verhindern überzeugend formulierte, aber fachlich falsche Aussagen?
- Welches Kosten- und Antwortzeitmodell ist für gelegentliche Nutzung tragfähig?

## Empfohlene Validierung

Bevor ein produktiver Parser entsteht:

1. Fünf bis zehn anonymisierte TBX-Dateien aus unterschiedlichen realen Systemen sammeln.
2. Version, Dialekt, Sprachen, Statusmodell und relevante Datenkategorien vergleichen.
3. Das Mapping auf das vorhandene interne Concept-Modell tabellarisch festhalten.
4. Mit Nutzerinnen testen, ob ein statischer Viewer bereits einen eigenständigen Nutzen besitzt.
5. AI-Anwendungsfälle getrennt bewerten: Problem, erwarteter Nutzen, Risiko und messbare Qualität.
6. Erst danach Umfang und Reihenfolge einer Implementierung entscheiden.

## Mögliche Entwicklungsstufen

### Stufe A: Lokaler Viewer

TBX öffnen, prüfen, durchsuchen und als Concept darstellen. Keine AI und keine Bearbeitung.

### Stufe B: Bestehende Werkzeuge nutzen

Inspector, Translator und Exporte arbeiten gegen die geladene TBX-Quelle. Die Quellenumschaltung ist praktisch bewiesen.

### Stufe C: Regelbasierte Qualitätsanalyse

Fehlende Felder, widersprüchliche Statusangaben und strukturelle Auffälligkeiten werden deterministisch berichtet.

### Stufe D: Optionale AI-Unterstützung

Erklärungen, Kontextprüfung und Qualitätsvorschläge werden als getrennte, nachvollziehbare Ebene ergänzt.

### Stufe E: Kontrollierter Review-Workflow

Terminologieverantwortliche können Vorschläge bewerten und für die Übernahme in das führende System vorbereiten. Ein verlustfreier TBX-Schreibpfad ist dafür gesondert zu spezifizieren.

## Entscheidungskriterien für eine Priorisierung

Die Idee sollte priorisiert werden, wenn:

- reale Nutzerinnen ohne geeignete Oberfläche auf TBX-Daten zugreifen müssen,
- mehrere relevante Quellsysteme ausreichend konsistente TBX-Exporte liefern,
- der lokale Viewer bereits ohne AI einen überprüfbaren Nutzen erzeugt,
- das interne Modell die wichtigsten Inhalte ohne herstellerspezifische Sonderlogik abbilden kann,
- mindestens ein AI-Anwendungsfall einen messbaren Zusatznutzen bei vertretbarem Datenschutz- und Fehlerrisiko zeigt.

## Referenzen

- [ISO 30042:2019 – TermBase eXchange (TBX)](https://www.iso.org/standard/62510.html)
- [TBX Developer Resources](https://www.tbxinfo.net/developer-resources/?id=2)
- [TBX Dialects](https://www.tbxinfo.net/tbx-dialects/)
