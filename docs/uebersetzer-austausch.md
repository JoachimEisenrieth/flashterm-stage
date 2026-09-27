# Übersetzungsaufträge für externe Bearbeitung

Stand: 27. September 2026. Excel-Export, Rücklieferungsprüfung und lokaler Übernahmeprobelauf sind implementiert. Ein eng begrenzter nativer Pilot hat zehn Übersetzungspositionen zuerst in `flashterm-test-a` und anschließend in die lokale Desktop-Datei `flashterm-fungi` übernommen. Anschließend wurden dieselben zehn Positionen nach erneutem Bestandsabgleich in die Online-Datei auf Centron übernommen. Die STAGE-Veröffentlichung wurde nicht aktualisiert. Der allgemeine FileMaker-Import und seine Bedienoberfläche sind noch nicht fertig. Bestehende Importskripte bleiben erhalten.

## Erster Durchlauf

Ein externer Übersetzer bearbeitet englische Vorzugsbenennungen und Definitionen aus `flashterm-fungi`, ohne FileMaker-Konto. Der erste Auftrag enthält fünf Begriffe mit zehn Positionen: Kräuterseitling (100001), Shiitake (100067), Myzelwachstum (100284), Flüssigmycel (100286), Körnerbrut (100288). Beim Kräuterseitling sollen vorhandene englische Inhalte geprüft werden; bei den übrigen Begriffen fehlen die englischen Inhalte im verwendeten Datenstand.

Ausgangsbasis des Prototyps ist der gespeicherte Veröffentlichungsstand vom 26. September 2026, 23:32:40 UTC. Er enthält möglicherweise nicht die neuesten unveröffentlichten Änderungen in FileMaker. Vor einem echten Übersetzungsauftrag muss der Export unmittelbar aus dem aktuellen FileMaker-Bestand erfolgen.

Die Arbeitsdatei liegt unter `outputs/translation-roundtrip-20260927/flashterm-fungi-uebersetzung-en-US.xlsx`. Sie enthält echte Ausgangsinhalte, aber keine vorbereiteten Übersetzungen. Die ausgefüllte Rücklieferung `flashterm-fungi-uebersetzung-en-US-ausgefuellt.xlsx` enthält zehn tatsächlich übersetzte Positionen, alle mit Status „Fertig“. Die synthetischen Testdateien bleiben davon getrennt.

## Ablauf für Redaktion und Übersetzer

In `flashterm-dev` offline ist die Auftragserstellung inzwischen über **Administration → Übersetzungsauftrag erstellen…** bedienbar: Ausgangssprache wählen, Zielsprache wählen, Begriffe ankreuzen, Excel erstellen. Der Assistent liest den aktuellen nativen Bestand. Ein vollständiger Lauf mit fünf Begriffen und zehn Positionen sowie der anschließende XLSX-Rücklauf wurden geprüft. Aufträge und Ausgangsstände werden zunächst in getrennten lokalen Ordnern aufbewahrt; die Speicherung in FileMaker und die Rücklieferungsoberfläche folgen als eigene Entwicklungsschritte. Die Online-Datei hat diesen Assistenten noch nicht erhalten.

1. Redaktion wählt Begriffe, Ausgangs- und Zielsprache sowie Inhaltsarten aus. flashterm erstellt einen Auftrag und speichert den Ausgangsstand intern.
2. Der Übersetzer erhält ausschließlich die Excel-Arbeitsdatei. Er bearbeitet die gelben Spalten **Übersetzung**, **Status** und **Anmerkung**. Eine Benennung oder Definition entspricht einer Zeile. Auch eine unverändert bestätigte Übersetzung wird eingetragen und auf **Fertig** gesetzt. **Rückfrage** verlangt eine Anmerkung.
3. Die Redaktion liest die zurückgegebene Datei ein. Die Vorschau zeigt Ergänzungen, Änderungen, identische Inhalte, offene Positionen und Konflikte mit Begründungen.
4. Die Redaktion wählt übernehmbare Positionen aus. Erst eine gesonderte Übernahme verändert Inhalte. Eine neue Sprachebene benötigt eine Vorzugsbenennung; eine Definition allein reicht nicht aus.
5. Die Übernahme prüft den aktuellen Bestand erneut, führt Änderungen zusammen mit dem Änderungsprotokoll aus und meldet das Ergebnis. Die Veröffentlichung in STAGE bleibt ein eigener redaktioneller Schritt.

Im allgemeinen Prototyp sind Schritte 1–3 und die Prüfung von Schritt 4 verfügbar. Für den konkreten Fünf-Begriffe-Auftrag wurde Schritt 5 zusätzlich als lokaler nativer Pilot ausgeführt. Das externe Ergebnisprotokoll ist noch kein gemeinsam mit den Daten gespeichertes FileMaker-Journal.

## Verbindliche Regeln des Austauschformats

| Situation | Verhalten |
| --- | --- |
| Zeilen wurden sortiert | Zuordnung über Auftrags- und Positionskennung, niemals über Zeilennummer oder Benennung |
| Teilrücklieferung | Fehlende Positionen bleiben offen |
| Leere Übersetzungszelle | Keine Änderung und keine Löschung |
| Status Offen oder Rückfrage | Keine Übernahme, auch bei ausgefüllter Übersetzung |
| Identischer Zielinhalt bereits vorhanden | Unverändert; keine doppelte Anlage |
| Ausgangsinhalte inzwischen geändert | Konflikt zur redaktionellen Klärung |
| Zielfeld inzwischen geändert | Konflikt, kein automatisches Überschreiben |
| Begriff entfernt oder Sprache nicht mehr eingerichtet | Konflikt |
| Vorzugsbenennung bereits als anders bewertete Benennung vorhanden | Konflikt; Bewertung nicht automatisch ändern |
| Fremder Auftrag, doppelte Position, veränderte Referenzspalten | Rücklieferung ablehnen |
| Formeln, Makros oder externe Arbeitsmappenverknüpfungen | Rücklieferung ablehnen |
| Dieselbe Rücklieferung erneut eingelesen | Vorschau erneut möglich; bereits übernommene identische Werte erzeugen keine erneuten Änderungen |

Bilder, Synonyme, Fußnoten, Belege, andere Sprachen und Veröffentlichungsstatus werden in diesem ersten Umfang nicht bearbeitet. Sie sollen unverändert erhalten bleiben. Die interne Auftragsdatei gehört nicht in die Bearbeitung durch den Übersetzer: Sie enthält den für die Prüfung verbindlichen Ausgangsstand.

## Neue Importarchitektur für flashterm

Die Übersetzerrücklieferung erhält einen eigenen Ablauf. Der vorhandene Concept-Lines-Import bleibt für seinen bisherigen Zweck bestehen. Beide können später dieselbe Prüf- und Übernahmelogik nutzen, sobald ihre jeweiligen Anforderungen vollständig abgedeckt sind.

Vorgesehene Bedienung: **Übersetzungsauftrag erstellen → Rücklieferung einlesen → Änderungen prüfen → Auswahl übernehmen → Protokoll ansehen**. In der Vorschau stehen Ausgangstext, bisheriger Zieltext, aktueller Zieltext, Vorschlag und Übersetzeranmerkung nebeneinander. Konflikte werden nicht durch eine allgemeine Schaltfläche „Alles überschreiben“ aufgelöst. Korrekturen erhalten eine nachvollziehbare redaktionelle Entscheidung.

Benötigte dauerhafte Daten:

- **Auftrag:** UUID, beständige Datenbankidentität, Sprachen, Ersteller, Zeitpunkt und Status.
- **Auftragsposition:** UUID, Begriffs-ID, Inhaltsart, Ausgangskontext und Ausgangswert des Zielfelds; bei vorhandenen Datensätzen zusätzlich native Datensatzidentität.
- **Rücklieferung:** Bezug zum Auftrag, Empfangszeit und eigene Revision. Mehrere Rücklieferungen ersetzen einander nicht stillschweigend.
- **Übernahmeprotokoll:** Position, alter und neuer Wert, Bearbeiter, Zeitpunkt und Übernahmelauf. Das Protokoll wird mit den Inhaltsänderungen gemeinsam gespeichert.

Der Prototyp verwendet Datenbankname, Mandant und Bestandskennung zur Zuordnung. Für den nativen Betrieb ist eine unveränderliche Datenbank-UUID vorzuziehen: Umbenennen darf die Identität nicht ändern; eine Testkopie darf nicht versehentlich als Produktivbestand gelten.

## Voraussetzungen für die native FileMaker-Übernahme

Die aktuelle XML-Struktursicherung zeigt separate Tabellen für Begriff, Benennungen und Definitionen. Definitionen sind in der Tabelle `Definition` maßgeblich; zusätzliche Definitionsfelder in `Term` werden abgeleitet. Ein direktes Schreiben nur in diese abgeleiteten Felder wäre fachlich unvollständig.

Der native Adapter muss daher vor seiner Freigabe:

1. Aktuelle, auch unveröffentlichte Ausgangs- und Zielinhalte aus FileMaker lesen. Der STAGE-Veröffentlichungsstand reicht nicht als Konfliktprüfung.
2. Die aktuellen Regeln zur Anlage von Sprachebene und Benennung, IDs, Gewichtung, Bearbeiterdaten und Denormalisierung aus den vorhandenen Skripten übernehmen bzw. gezielt wiederverwenden. Keine frei erfundenen Defaultwerte und kein Zurücksetzen von Seriennummern.
3. Die benötigten Datensätze sperren und innerhalb einer FileMaker-Transaktion die freigegebenen Werte erneut vergleichen. Auch parallele Anlagen müssen über eindeutige Zuordnungen verhindert werden. Bei Sperr- oder Validierungsfehlern den ausgewählten Übernahmelauf vollständig abbrechen.
4. Änderungen und Protokoll atomar speichern. Ein späterer Rücknahmeauftrag muss erneut vergleichen; alte Werte dürfen zwischenzeitliche Bearbeitungen nicht überschreiben.
5. Ableitungen im bestehenden flashterm-Lebenszyklus aktualisieren und auf Fehler prüfen. Skripte mit eigenem Commit oder Fensterwechsel dürfen nicht ungeprüft in die Transaktion eingebaut werden.
6. Berechtigungen in FileMaker durchsetzen. Der externe Übersetzer erhält durch diesen Dateiaustausch keinen Datenbankzugang.

## Ergebnis des nativen Piloten

Die Arbeitsartefakte liegen unter `outputs/translation-roundtrip-20260927/`. Vor der Übernahme wurde die lokale Demodatei als `flashterm-fungi-vor-uebersetzungsimport.fmp12` gesichert. Die neue Importlogik wurde zunächst in `flashterm-test-a.fmp12` erprobt.

Übernommen wurden die englischen Vorzugsbenennungen **king oyster mushroom**, **shiitake**, **mycelial growth**, **liquid culture**, **grain spawn** und die zugehörigen fünf Definitionen. Vier neue englische Benennungs- und vier Definitionsdatensätze wurden angelegt, die vorhandene Kräuterseitling-Benennung und -Definition aktualisiert. Andere Sprachen und vorhandene Synonymbenennungen blieben unverändert. Neue Benennungen behalten den nativen Entwurfsstatus.

Der Pilot liest den geprüften XLSX-Rücklauf, vergleicht die aktuellen nativen Ausgangsdaten, sperrt die betroffenen Begriffe und schreibt in einer Transaktion. Die Seriennummern stammen aus FileMaker. Bei neuen Definitionen reicht die automatische Nachschlagefunktion innerhalb derselben Transaktion nicht aus: Die abgeleiteten Definitionsfelder der Benennungen werden deshalb explizit mitgeführt.

Geprüft wurden alle zehn Zieltexte einschließlich Ableitungen sowie der Erhalt anderer Sprachen. Ein absichtlicher Abbruch der Ableitungsergänzung in der Testkopie hinterließ exakt den vorherigen Datenstand. Der erneute Import in die lokale `flashterm-fungi` meldete `unchanged` mit null Änderungen und unverändertem Bestand. Belege: `verified-test-import-result.json`, `rollback-test-result.json`, `verified-fungi-import-result.json`, `idempotence-result.json`.

Der installierte Pilot in fungi wurde nach dem Einfügen anhand sämtlicher 913 Skriptschritte, Berechnungen, Feld-/Layoutbezüge und Suchkriterien mit der Vorlage abgeglichen. Er ist auf diesen Auftrag und eine lokale benannte Datei begrenzt, verwendet das bereits vorhandene MBS-Plugin und ist kein allgemeiner Importdienst. Die Testkopie enthält den vorherigen 883-Schritte-Piloten und das separate, geprüfte Ableitungsskript; fungi enthält die korrigierte integrierte Fassung.

## Abnahmefälle

Automatisiert geprüft: sortierte und teilweise Rücklieferung, leere Zellen, falsche oder doppelte Identitäten, veränderte Referenzspalten, Quellenänderung, Zieländerung, entfernte Begriffe/Sprachen, bestehende anders bewertete Benennung, Erhalt unbeteiligter Inhalte, erneute Prüfung bei Freigabe, wiederholter Import sowie notwendige Vorzugsbenennung für neue Sprachebenen. Ein echter XLSX-Dateirücklauf mit zwei synthetischen Änderungen wurde gelesen und lokal simuliert; eine Formelrücklieferung wurde abgewiesen.

Noch offen: Öffnen und Rückspeichern in nativem Microsoft Excel, frischer Export aus unveröffentlichten FileMaker-Daten, allgemeiner nativer Import beliebiger Aufträge, konkurrierende Bearbeitung/Sperren im Mehrbenutzerbetrieb, vollständiger Transaktionsabbruch des gesamten Imports einschließlich eines nativen Protokolls, Rechteprüfung und Bedienung ohne Entwicklungswerkzeuge. Erst danach ist der Import für den normalen Betrieb freigegeben.

## Nachtrag: Übernahme in die Online-Datei

Am 27. September 2026 wurden die zehn Positionen auch in die geöffnete Centron-Datei `flashterm-fungi` importiert. Der unmittelbar zuvor ausgelesene Online-Bestand entsprach für sämtliche betroffenen Benennungen und Definitionen exakt dem ursprünglichen Auftrag. Der Ausgangsstand ist in `centron-before.json` gesichert.

Der separate Pilot `7202 Übersetzungsauftrag übernehmen – Centron Pilot` prüft den exakten gehosteten Dateipfad und eine vorhandene Bearbeiterkennung. Zusätzlich zu den Begriffen sperrt er alle vorhandenen Benennungs- und Definitionszeilen der fünf Begriffe vor dem erneuten Ausgangsvergleich. Seine 1561 nativen Schritte einschließlich Berechnungen, Referenzen und Suchkriterien wurden nach der Installation mit der erzeugten Vorlage abgeglichen. Bestehende Importscripts wurden nicht ersetzt.

Der Serverimport bestätigte zehn Änderungen ohne Fehler. Alle zehn Zieltexte und die abgeleiteten Definitionsfelder wurden nach dem Commit gelesen und verglichen; andere Sprachen blieben unverändert. Nachweis: `outputs/translation-roundtrip-20260927/verified-centron-import-result.json`. Die lokale Desktop-Datei und die Testkopie behalten ihren zuvor importierten Stand; maßgebliches Ergebnis ist jetzt die Online-Datei. Keine erneute STAGE-Veröffentlichung ausgeführt.

Der Centron-Pilot bleibt auf diesen einzelnen Auftrag beschränkt. Seine erfolgreiche Ausführung ersetzt keine allgemeine Mehrbenutzer- oder Rechteabnahme der künftigen Importfunktion.

### Rücklieferungsprüfung in flashterm-dev offline

Am 27.09.2026 wurde der nächste Schritt eingebaut: **Administration → Übersetzungsrücklieferung prüfen…**. Der Anwender wählt die zurückgesandte Excel-Datei; der ursprüngliche lokale Auftrag wird automatisch zugeordnet. Der aktuelle FileMaker-Bestand wird neu gelesen und mit Ausgangsstand und Rücklieferung verglichen. Eine lokale Vorschau zeigt offene Positionen, übernehmbare Vorschläge, bereits identische Inhalte und Konflikte einschließlich der jeweiligen Begründung. Dieser Schritt übernimmt keine Inhalte.

Der reale Durchlauf mit dem noch unausgefüllten neuen Auftrag ergab korrekt zehn offene Positionen. 23 automatisierte Tests decken zusätzlich fertige Vorschläge, Quell-/Zielkonflikte, fremde Dateien, Teilrücklieferungen und Wiederholungen ab. Der Bericht wurde geöffnet; seine visuelle Darstellung konnte wegen der Browserrichtlinie für lokale Dateien nicht durch den Agenten geprüft werden. Online-fungi wurde in diesem Entwicklungsschritt nicht geändert. Als nächster eigenständiger Schritt folgt die bestätigte Übernahme ausgewählter Positionen mit erneuter Prüfung, Transaktion und Änderungsprotokoll.

### Gezielte Übernahme in flashterm-dev offline

Die lokale Datei enthält jetzt zusätzlich **Administration → Übersetzungsrücklieferung übernehmen…**. Der Ablauf lautet: Excel auswählen, konfliktfreie Positionen ankreuzen, Auswahl bestätigen. Er prüft erneut, sperrt die gelesenen Datensätze, übernimmt die Auswahl in einer Transaktion und speichert ein Änderungsprotokoll mit vorherigen und neuen Texten.

Geprüft wurde eine einzelne englische Definitionspräzisierung beim Kräuterseitling („meaty body“ zu „meaty fruiting body“). Die absichtliche Transaktionsrücknahme ließ den Bestand unverändert. Der anschließende reguläre Teilimport änderte genau die gewählte Definition und ihre drei abgeleiteten Benennungsfelder. Der ebenfalls gelieferte Shiitake-Vorschlag blieb ungewählt und unverändert. Eine erneute Rücklieferung bot den schon übernommenen Inhalt nicht mehr an. Diese Inhaltsänderung betrifft ausschließlich die lokale Entwicklungsdatei.

Noch ausstehend: Neuanlage fehlender Ziel-Datensätze, dauerhaft integriertes Auftrags-/Änderungsprotokoll in FileMaker, Mehrbenutzerprüfung und gezielte Übertragung der geprüften Technik nach Online-fungi. Der aktuelle Schreiber ergänzt oder ändert Text in vorhandenen Ziel-Datensätzen. STAGE-Veröffentlichung bleibt getrennt.
