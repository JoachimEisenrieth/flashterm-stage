# Externer Übersetzungsaustausch – Entwicklungsprototyp

Siehe [fachlicher Ablauf und offene FileMaker-Anbindung](../../docs/uebersetzer-austausch.md).

Die CLI-Befehle ändern keine FileMaker-Datei, keine Veröffentlichung und keine STAGE-Konfiguration. Der separat beschriebene native Pilot schreibt nach Installation und Ausführung in FileMaker. Es nutzt Node-Standardmodule und zum Lesen von XLSX die Python-Standardbibliothek. Es ist nicht an den Webanwendungsstart gekoppelt und führt kein Build-System oder Paketmanagement für STAGE ein.

## Auftragsdateien erzeugen

### Assistent in flashterm-dev (offline)

Seit 27. September 2026 ist **Administration → Übersetzungsauftrag erstellen…** in der lokalen Entwicklungsdatei eingerichtet. Der Assistent bietet Ausgangssprache, Zielsprache und eine durchsuchbare Begriffsliste mit Kontrollkästchen. Er liest die aktuellen FileMaker-Texte, ohne Inhalte zu ändern. Der Menüeintrag ist auf `flashterm-dev` und eine lokale Verbindung beschränkt; das Skript prüft dies nochmals.

`build-native-export.py` erzeugt das Skript `7210 Übersetzungsauftrag erstellen`. `native-export.mjs` prüft den aktuellen nativen Ausgangsstand und bildet das Austauschformat. `native-export-cli.mjs` erzeugt einen eigenen Auftragsordner mit getrennten Unterordnern `intern` und `uebersetzer`. Nur die XLSX-Datei im zweiten Ordner wird weitergegeben. Der erste enthält den Auftrag, den Ausgangsstand und Prüfunterlagen. Der normale Ablauf benötigt keinen Skripteditor und keine manuell angelegte Auftragsdatei.

Entwicklungsgrenzen: macOS-Client mit MBS und der lokal vorhandenen Tabellenlaufzeit; Installationspfade stehen im Generator. Bis zu 100 Begriffe, Vorzugsbenennungen und Definitionen, Grundformen mit `recordFlag = 11`. Verfügbare Sprachen werden derzeit aus vorhandenen Benennungen ermittelt und mit der Sprachentabelle beschriftet. Eine eingerichtete Sprache ohne Benennungen wird noch nicht angeboten. Die Identität verwendet im Offline-Prototyp den Dateipfad; eine dauerhafte Datenbank-UUID und ein natives FileMaker-Auftragsjournal sind noch offen. Aufträge liegen unter `outputs/translation-export-dev-20260927/auftraege/`. Keine Freigabe für Centron oder einen Kundeninstaller.

Geprüft: Menüaufruf und Abbrechen, erhaltene Häkchen beim Filtern, Auftrag mit fünf Begriffen und zehn Positionen, aktuelle englische Ausgangswerte, XLSX-Rücklauf mit zehn offenen Positionen sowie 19 Unit-Tests für Austausch und nativen Adapter. Die neue Menüaktion ruft das Skript ohne zusätzliche Rechte auf; sie wurde in `4 Administration` hinter den bisherigen Import-/Exportaktionen ergänzt. Online-fungi wurde dabei nicht geändert.

### Kommandozeilen-Prototyp

Der Eingang ist das bestehende JSON-Lesemodell mit `publication`, `termbase`, `concepts` und `termsByLanguage`. IDs bleiben Zeichenketten. Für den echten Betrieb ist ein aktueller nativer Export erforderlich.

```sh
node tools/translation-exchange/cli.mjs export aktueller-bestand.json flashterm-fungi en-US 100001,100067,100284,100286,100288 ausgabe/auftrag
```

Ausgaben: `auftrag-intern.json` (intern aufbewahren) und `tabellendaten.json`. Der XLSX-Generator ist ein Entwicklungswerkzeug und benötigt die vorhandene gebündelte `@oai/artifact-tool`-Laufzeit; er installiert keine Pakete. Das Paket muss aus dem Ausgabeordner auflösbar sein. Die Excel-Datei und Vorschau-PNGs entstehen mit:

```sh
node tools/translation-exchange/create-workbook.mjs ausgabe/auftrag/auftrag-intern.json ausgabe
```

## Rücklieferung lesen

```sh
node tools/translation-exchange/cli.mjs import ausgabe/auftrag/auftrag-intern.json ruecklieferung.xlsx aktueller-bestand.json flashterm-fungi ausgabe/ruecklauf-1
```

`FLASHTERM_PYTHON` kann den Python-Interpreter festlegen. Ausgaben: `ruecklieferung.json` und `importvorschau.json`. Statuswerte: `ready`, `unchanged`, `pending`, `conflict`. Die Vorschau ist keine Schreibfreigabe.

## Lokaler Übernahmeprobelauf

Die Freigabedatei enthält ein JSON-Array der ausgewählten Positions-UUIDs. Keine Begriffsnummern verwenden. Der Probelauf prüft alle ausgewählten Positionen erneut gegen den übergebenen Bestand und liefert eine separate Kopie plus Journal:

```sh
node tools/translation-exchange/cli.mjs rehearse ausgabe/auftrag/auftrag-intern.json ausgabe/ruecklauf-1/ruecklieferung.json aktueller-bestand.json flashterm-fungi freigabe.json ausgabe/probelauf-1
```

Die Ausgabedatei `lokaler-probelauf.json` darf nicht als Umgehung des nativen Imports in den STAGE-Veröffentlichungsspeicher kopiert werden. Das Ergebnis ist ausschließlich eine Simulation. Vorhandene Ausgabedateien werden nicht überschrieben; je Lauf einen neuen Ordner verwenden.

## Prüfung

```sh
node --test tests/unit/translation-exchange.test.js
node tools/translation-exchange/check-workbook-roundtrip.mjs outputs/translation-roundtrip-20260927 outputs/fungi-demo-review-20260927/active-publication-snapshot.txt
```

Der zweite Befehl verwendet die vorbereiteten Demo-Artefakte unter `outputs/translation-roundtrip-20260927` und die gebündelte Artefaktlaufzeit. Er erzeugt synthetische Testwerte in einer temporären Kopie. Er belegt den Datei-Rücklauf, nicht die Kompatibilität mit jeder Excel-Version und nicht den nativen FileMaker-Schreibpfad.

## Nativer Pilot für den ausgefüllten Auftrag

`build-native-pilot.py` erzeugt ein FileMaker-Skriptpaket aus den geprüften zehn Rücklieferungspositionen und dem nativen Ausgangsstand. Es führt selbst keinen Datenbankzugriff aus. Die Datei ist bewusst auf die fünf Pilotbegriffe und die lokalen Zieldateien `flashterm-test-a` bzw. `flashterm-fungi` beschränkt; keine allgemeine Importschnittstelle.

Am 27. September 2026 wurde das Paket in die lokale fungi-Datei installiert, gegen die Vorlage abgeglichen und ausgeführt. Alle zehn Werte und abgeleiteten Definitionen wurden geprüft. Eine Wiederholung erzeugte keine Änderungen. Die Testkopie diente zusätzlich einem kontrollierten Rücknahmetest. Ergebnisse, Sicherung und ausgefüllte XLSX liegen unter `outputs/translation-roundtrip-20260927/`; Einzelheiten und verbleibende Grenzen stehen in der fachlichen Dokumentation.

Das MBS-Plugin dient zum Lesen der lokalen Ausgangsdatei und Schreiben des Ergebnisberichts. Dieser externe Bericht ist noch kein atomar gespeichertes natives Journal. Die Berichtsdatei wird bei jedem Lauf überschrieben; geprüfte Erstlauf-, Rücknahme- und Wiederholungsergebnisse wurden deshalb separat aufbewahrt. Die allgemeine Bedienoberfläche, Mehrbenutzerprüfung und Rechteabnahme fehlen noch. Der lokale Generator darf nicht unverändert auf gehostete oder andere Datenbestände übertragen werden. Für die ausdrücklich beauftragte Centron-Übernahme wurde ein separates, auf den konkreten Serverpfad beschränktes Paket mit zusätzlichen Bestandssperren erzeugt und erfolgreich ausgeführt; siehe fachliche Dokumentation.

### Native Rücklieferungsprüfung (flashterm-dev offline, 27.09.2026)

In der lokalen Entwicklungsdatei: **Administration → Übersetzungsrücklieferung prüfen…** (`7220 Übersetzungsrücklieferung prüfen`). XLSX auswählen; der Assistent findet anhand der Auftragskennung den internen Auftrag, prüft unveränderte Referenzspalten und liest die betroffenen Texte frisch aus FileMaker. Er liest den Textbestand zweimal, um Änderungen während der Erfassung zu erkennen.

Die lokale HTML-Vorschau gruppiert übernehmbare Änderungen, Konflikte, identische Inhalte und offene Positionen. Sie zeigt den aktuellen Zieltext, den Vorschlag, den Ausgangstext und den Zieltext beim Export. Übersetzertexte werden HTML-escaped; die Seite enthält keine Skripte oder externen Ressourcen. Es gibt **keinen Schreibzugriff auf FileMaker-Inhalte** und keine Veröffentlichung. Vor einer späteren Übernahme ist ein erneuter Vergleich unter Datensatzsperren erforderlich.

`build-native-review.py` erzeugt das installierte Skript. `native-review-cli.mjs` verarbeitet Dateiauswahl und Prüflauf; `native-review.mjs` vergleicht und erzeugt den Bericht. Jeder Lauf erhält einen eigenen Ordner unter `outputs/translation-review-dev-20260927/pruefungen` mit Rücklieferungskopie, internem Auftrag, aktuellem Stand und Ergebnis. Das originale XLSX bleibt unangetastet.

Entwicklungsgrenzen: Auftragsarchiv und Laufzeiten sind auf diesem Mac festgelegt, Dateipfad ist Bestandteil der Identität, nur mit dem neuen lokalen Exportassistenten erzeugte Aufträge werden zugeordnet. Doppelte Definitionen oder uneindeutig lesbare native Daten stoppen die gesamte Prüfung. Verfügbare Sprachen werden derzeit aus aktiven Benennungen abgeleitet. Dies ist noch keine portable Server-/Kundeninstallation.

Verifiziert: 23 automatisierte Tests bestanden; installierte 100 Skriptschritte ohne auskommentierte Formelfehler, reale Dateiauswahl und frische FileMaker-Abfrage erfolgreich. Unbearbeitetes XLSX des Auftrags 7272A0DC-1C70-48F6-B596-55CBACDD1675 liefert zehn offene Positionen. Bericht wurde im Browser geöffnet. Visuelle Browserkontrolle war durch die Zugriffsrichtlinie für lokale HTML-Dateien blockiert.

### Ausgewählte Positionen übernehmen (lokaler Entwicklungsstand)

**Administration → Übersetzungsrücklieferung übernehmen…** (`7230`) liest eine XLSX-Rücklieferung erneut ein und prüft sie gegen den aktuellen Bestand. Nur neue konfliktfreie Änderungen erscheinen in der Liste mit Häkchen. Anschließend werden die ausgewählten Positionen nochmals geprüft und in einem Bestätigungsdialog benannt. Bereits identische, offene oder konfliktbehaftete Positionen werden nicht übernommen.

Der native Schreiber sperrt die betroffenen Begriffe sowie die Quell- und Ziel-Datensätze im gelesenen Auftragsumfang. Nach dem Sperren vergleicht er die aktuellen Texte und Fußnoten nochmals exakt mit dem soeben geprüften Stand. Alle Schreiboperationen erfolgen in einer FileMaker-Transaktion; Fehler führen zur Rücknahme. Definitionen werden in `AT_Definition::definition` und ausdrücklich in den abgeleiteten `AT_Term::definition`-Feldern aller aktiven Zielbenennungen aktualisiert. Andere fachliche Felder bleiben unberührt; Bearbeiter und Änderungszeit werden aktualisiert.

Vor der Transaktion wird `aenderungsprotokoll-vorbereitet.json` gespeichert, danach `aenderungsprotokoll-ergebnis.json`, einschließlich Auftrag, Auswahl, vorherigen/neuen Texten, Bearbeiter, Status und Begründung. Die Protokolle liegen im jeweiligen neuen Prüfordner. Dateisystem und FileMaker sind keine gemeinsame Transaktion: Fehlt nach einem Absturz das Abschlussprotokoll, gilt der Ausgang als ungeklärt und ist anhand des Bestands zu prüfen. Es gibt noch keinen nativen FileMaker-Protokolltisch und keine automatische spätere Rücknahmefunktion. Die Transaktionsrücknahme schützt einen noch nicht bestätigten Import.

**Bewusste Grenze:** Der erste Schreiber aktualisiert vorhandene Ziel-Datensätze, einschließlich bisher leerer Textfelder. Das Anlegen neuer Zielbenennungen oder Definitionsdatensätze wird mit einer verständlichen Meldung abgewiesen. Dafür sind Pflichtfelder und native Anlageabläufe noch gesondert zu prüfen. Die Bestandsidentität bleibt derzeit Datei-/Pfad-basiert; der Import ist ausdrücklich auf lokale `flashterm-dev` beschränkt. Die Sperrstrategie ist noch nicht als Verfahren für mehrere gleichzeitig arbeitende Servernutzer freigegeben.

**Realer Test am 27.09.2026:** Kopie der neuen Auftrags-XLSX mit zwei fertigen Definitionsvorschlägen. Nur Kräuterseitling ausgewählt. Zuerst mit Scriptparameter `rollback-test` ausgeführt: Rücknahme erfolgreich, vollständige gelesene Texte und Fußnoten danach identisch, abgeleitete Definition ebenfalls zurückgesetzt. Danach regulär gespeichert: genau eine kanonische Definition und drei abgeleitete Zielbenennungen geändert. Shiitake blieb trotz fertigem Vorschlag unverändert. Wiederholung bot nur noch Shiitake an. Menüaufruf und Abbrechen erfolgreich. 28 automatisierte Tests bestanden. Testartefakte und Nachweise: `outputs/translation-apply-dev-20260927/`.
