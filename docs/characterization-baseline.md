# Characterization Baseline: flashterm STAGE

Stand: Initial Import auf Branch `main`

## Zweck und Lesart

Diese Baseline beschreibt das aktuell im Repository implementierte Verhalten. Sie ist keine Anforderungsspezifikation und beschreibt ausdrücklich nicht, wie sich die Anwendung künftig verhalten sollte.

Eine zusammenhängende Darstellung der Browser-, Entwicklungs- und Teststartprozesse sowie priorisierte Optimierungsvorschläge enthält [`startup-processes.md`](startup-processes.md).

Kennzeichnungen:

- **Code-basiert:** Das Verhalten ist direkt aus dem vorhandenen Code ableitbar.
- **Zu verifizieren:** Das Ergebnis hängt von einem laufenden FileMaker-System, konkreten Daten, Browserdetails oder der tatsächlichen Event-Reihenfolge ab.
- **Bekannte Inkonsistenz:** Im Code existieren konkurrierende oder widersprüchliche Pfade; das beobachtete Laufzeitverhalten muss vor einer Bereinigung festgehalten werden.

Für eine vollständige manuelle Verifikation werden eine gültige lokale `config.js`, ein erreichbares FileMaker-System und repräsentative Testdaten für mindestens zwei Sprachen benötigt. Reale Zugangsdaten und produktive Daten dürfen nicht in Testprotokolle oder Fixtures übernommen werden.

## 1. Start und Initialisierung

### Aufruf und Weiterleitung

1. `index.html` liest `window.location.search` vollständig aus.
2. Der Browser wird mit `window.location.href` zu `./flashterm.html` weitergeleitet.
3. Sämtliche Query-Parameter bleiben dabei unverändert erhalten.
4. Falls die automatische Weiterleitung nicht ausgeführt wird, zeigt `index.html` einen Fallback-Link auf dieselbe Zielseite mit denselben Query-Parametern.

### URL-Parameter

Das Hauptmodul wertet ausschließlich diese Parameter aus:

- `source`: Ausgangssprache
- `target`: Zielsprache

Fehlt `source`, wird `config.initialSourceLanguage` verwendet. Fehlt `target`, wird `config.initialTargetLanguage` beziehungsweise eine leere Zeichenkette verwendet. Andere Query-Parameter werden zwar durch `index.html` weitergereicht, vom Hauptmodul aber nicht ausgewertet.

Die Werte werden beim Start nicht gegen die verfügbaren Sprachcodes validiert. Die Anleitung behauptet, ungültige Sprachcodes würden ignoriert; dies ist im aktuellen JavaScript nicht implementiert. **Bekannte Inkonsistenz / zu verifizieren.**

### Unmittelbarer Modulstart

Beim Laden von `flashterm.js` geschieht in dieser Reihenfolge:

1. URL-Sprachen werden ermittelt und in Modulzustand übernommen.
2. Die GUI-Sprache wird aus der Browsersprache ermittelt.
3. Die zentralen Event-Handler werden genau einmal registriert.
4. `switchMode("wiki")` aktiviert unmittelbar den Wiki-Modus.
5. `initialize()` wird asynchron gestartet, aber nicht abgewartet.
6. Der Bootstrap-Zustand `starting` deaktiviert Suchfeld, Löschaktion, Sprachwahl und Speichern bis zum Abschluss der Initialisierung. Die Modusnavigation bleibt verfügbar.

### Asynchrone Initialisierung

`initialize()` führt nacheinander aus:

1. Anmeldung an FileMaker.
2. Laden von `json/translations.json` und Aktualisieren der vorhandenen übersetzbaren UI-Elemente.
3. Laden beziehungsweise Wiederverwenden der normalisierten Sprachoptionen aus einem versionierten, an die GUI-Sprache gebundenen Cache.
4. Laden und Parsen der Terminliste der Ausgangssprache.
5. Laden und Parsen der Terminliste der Zielsprache.
6. Aktualisieren des Dokumenttitels und der Modusbeschriftungen.
7. Anzeigen der Wiki-Startfläche.
8. Wechsel in `ready`, wenn alle Schritte erfolgreich waren, andernfalls in `degraded`.

Die Abrufe laufen weiterhin seriell. Ein Fehler beim Login wechselt in `failed`; datenabhängige Bedienelemente bleiben deaktiviert und eine lokalisierte Wiederholungsaktion wird angeboten. Fehler beim Laden von Übersetzungen, Sprachoptionen oder Terminlisten werden innerhalb der jeweiligen Ladefunktion abgefangen und führen nach Abschluss in `degraded`. Bereits geladene Funktionen bleiben nutzbar; die Wiederholungsaktion startet die vollständige Initialisierung erneut.

Ein Guard verhindert parallele Initialisierungen. Da die Event-Handler außerhalb von `initialize()` genau einmal registriert werden, entstehen bei Wiederholungen keine doppelten Listener. Nach `ready` oder `degraded` wird das Suchfeld aktiviert und fokussiert.

### FileMaker-Login

- Die Anwendung baut den Session-Endpunkt aus der lokalen Konfiguration auf.
- Benutzername und Passwort werden browserseitig für Basic Authentication verwendet und zusätzlich in den Login-Request aufgenommen.
- Das zurückgegebene FileMaker-Token wird in `sessionStorage` unter `fmToken` gespeichert.
- Eine lokal berechnete Ablaufzeit von 15 Minuten wird unter `fmTokenExpiration` gespeichert.
- Der aktuelle Code protokolliert Login-URL und Login-Daten in der Browserkonsole. In Testprotokollen dürfen diese Werte nicht übernommen werden.

### Separater Sprachlistenpfad im HTML

Unabhängig von `initialize()` lädt ein klassisches Inline-Skript in `flashterm.html` zusätzlich `json/languages.json` und füllt damit den Zielsprach-Selector. Die Modulvariable `targetLanguage` ist für dieses klassische Skript nicht global sichtbar. Beim Öffnen des Sprachmodals lädt das Hauptmodul erneut Sprachoptionen aus FileMaker und ersetzt den Selector-Inhalt.

**Bekannte Inkonsistenz:** Zielsprachen werden beim Start aus der lokalen JSON-Datei und später nochmals aus FileMaker geladen.

## 2. Search

### Eingabe eines Suchbegriffs

- Das Suchfeld reagiert auf `input`, `paste` und `keydown`.
- Bei einer nicht leeren normalen Eingabe wird aus Wiki oder Inspector in den Wiki-Modus gewechselt.
- Anschließend werden Suggestions aus der bereits geladenen Terminliste der Ausgangssprache berechnet.
- Das Clear-Icon wird bei nicht leerem Suchfeld eingeblendet.

### Autocomplete und Suggestions

- Suche erfolgt standardmäßig im Modus `contains`; ein UI-Wechsel des Suchmodus ist aktuell nicht implementiert.
- Query und Terminus werden per Unicode-NFD normalisiert und um kombinierende diakritische Zeichen bereinigt.
- Die Suche ist nicht case-sensitiv.
- Regex-Sonderzeichen der Query werden maskiert.
- Alle passenden Termini werden angezeigt; eine explizite Maximalzahl oder Sortierung der Treffer existiert nicht.
- Termini mit Gewichtung `0` erhalten eine abgelehnte Darstellung.
- Der passende Textteil wird mit einem Highlight-Span hervorgehoben.
- Bei leerer Query wird die Liste ausgeblendet, sofern das Suggestions-Fenster nicht zuvor verschoben wurde.
- Bei keinem Treffer wird die Liste ebenfalls nur dann ausgeblendet, wenn sie nicht verschoben wurde. Ein verschobenes Fenster kann daher leer sichtbar bleiben. **Zu verifizieren.**

### Tastaturbedienung

- `ArrowDown` markiert den nächsten Treffer.
- `ArrowUp` markiert den vorherigen Treffer.
- `Enter` aktiviert den markierten Treffer per programmatischem Klick.
- Ohne markierten Treffer ruft `Enter` `termMining()` auf und aktualisiert das Clear-Icon.
- Die Tastaturbehandlung wird ignoriert, wenn das Suggestions-Fenster nicht sichtbar ist.

### Mausbedienung

- Ein Klick auf eine Suggestion öffnet die zugehörige Concept-/Wiki-Ansicht.
- Das Suggestions-Fenster lässt sich über seinen Header verschieben.
- Nach dem Verschieben bleibt es bei bestimmten Blur-/Auswahlabläufen geöffnet.
- Das Close-Icon leert das Suchfeld, setzt die Fensterposition zurück und beendet den Drag-Zustand.
- Bei Verlust des Suchfeldfokus wird die Liste nach 100 ms ausgeblendet, sofern gerade keine Suggestion angeklickt wird und das Fenster nicht verschoben wurde.

### Auswahl eines Terms

Ein Klick auf eine Suggestion übergibt Terminus, Concept-ID, Ausgangs- und Zielsprache an `showWiki()`. `showWiki()` speichert Terminus und Concept-ID als aktuelle Auswahl und lädt die Concept-Details aus FileMaker.

Der Suchfeldwert wird durch die Auswahl einer Suggestion nicht ausdrücklich auf den ausgewählten Terminus gesetzt.

## 3. Inspector / Term-Mining

### Texteingabe und Start

Der primäre Inspector-Ablauf ist ein Paste-Event:

1. Nach einer Verzögerung von 10 ms wird der eingefügte, getrimmte Text gelesen.
2. Der Text wird in `savedText` gespeichert.
3. Das sichtbare Suchfeld wird geleert und ein künstliches `input`-Event ausgelöst.
4. Bei nicht leerem Text bleibt ein bereits aktiver Translator erhalten; aus Wiki beziehungsweise Inspector wird in den Inspector-Modus gewechselt.
5. `termMining()` wird aufgerufen.

Normales Tippen im Inspector führt bei nicht leerer Eingabe wieder in den Wiki-Modus. Die Inspector-Funktion ist damit aktuell primär auf Einfügen per Zwischenablage ausgerichtet.

### Erkennung und Klassifikation

- Analysiert wird `savedText` gegen die Terminliste der Ausgangssprache.
- Text und Terminologie werden diakritika-unabhängig normalisiert.
- Jeder Terminus wird mit einem case-insensitiven Ganzwort-Regex gesucht.
- Längere Termini werden vor kürzeren verarbeitet.
- Ein Treffer eines kürzeren Terminus innerhalb eines längeren Treffers wird unterdrückt.
- FileMaker-Gewichtungen werden so klassifiziert:
  - `2` → `preferred`
  - `1` → `alternative`
  - `0` → `rejected`
- Treffer werden nach konkreter gefundener Schreibweise gezählt.
- Für alternative und abgelehnte Termini wird die bevorzugte Benennung desselben Concepts ermittelt.

### Ergebnisanzeige

- Die Ausgabe ist eine Tabelle.
- Kategorien werden in der Reihenfolge rejected, alternative, preferred angehängt.
- Symbole:
  - rejected → 🚫
  - alternative → ⭐
  - preferred → ⭐⭐
- Im Inspector stammt die bevorzugte Benennung aus der Ausgangssprachliste.
- Bei null Treffern erscheint der lokalisierte Leerzustand; Exportaktionen werden nicht angeboten.

### Interaktion mit gefundenen Termini

- Gefundene Termini und bevorzugte Benennungen sind klickbar.
- Ein Klick lädt die Wiki-/Concept-Ansicht für die zugehörige Concept-ID.
- `showWiki()` blendet den Mining-Container aus und die Wiki-Ansicht ein, ändert aber nicht ausdrücklich die aktive Modusklasse. Dadurch kann visuell weiterhin Inspector oder Translator aktiv markiert sein. **Zu verifizieren.**
- Hover setzt die Textdekoration per Inline-Style auf unterstrichen.

### Export aus dem Inspector

- Oberhalb der Ergebnistabelle erscheint neben der Bewertungslegende die Formatwahl „Ergebnisse exportieren“ mit getrennten Schaltflächen für Excel, CSV und JSON.
- Auf breiten Ansichten bleibt diese Werkzeugleiste beim Scrollen unterhalb des festen Seitenheaders sichtbar. Auf Ansichten bis 768 px scrollt sie aus Platzgründen normal mit und darf in eine eigene Zeile umbrechen.
- Excel erzeugt aus dem Prüfergebnis einen menschenlesbaren Bericht mit Titel, Modus, Sprache beziehungsweise Sprachpaar, Exportzeit, Ergebniszusammenfassung und ausgeschriebenen Bewertungen.
- CSV exportiert die gefundenen Termini mit Bewertung, Trefferzahl, Vorzugsbenennung und den beteiligten Sprachcodes.
- JSON exportiert ausschließlich das bereits berechnete Prüfergebnis; der zuvor geleerte Inhalt des Suchfelds wird dafür nicht erneut ausgewertet.

## 4. Translator

### Aktuelles Verhalten

- Der Translator verwendet dasselbe zuvor erzeugte `foundTerms`-Objekt wie der Inspector.
- Ist noch kein `savedText` vorhanden, wird nur der Mining-Container angezeigt und das Suchfeld erhält einen Einfüge-Hinweis.
- Ist bereits Text analysiert worden, wird die Tabelle erneut gerendert.
- Die erste Spalte enthält die gefundenen Termini der Ausgangssprache.
- Die zweite Spalte verwendet die bevorzugte Benennung aus der Terminliste der Zielsprache.
- Fehlt eine passende bevorzugte Benennung, wird `–` angezeigt.

### Benutzerinteraktionen

- Der Translator wird über die Modusnavigation aktiviert.
- Wird Text direkt im aktiven Translator eingefügt, bleibt der Translator aktiv und zeigt unmittelbar die zweisprachige Ergebnistabelle. Dies behebt das frühere unbeabsichtigte Zurückspringen in den Inspector.
- Ein Klick auf einen Terminus öffnet dessen Wiki-Ansicht.
- Ein Wechsel der Zielsprache lädt die neue Zielterminliste.
- Wenn der Translator während eines erfolgreichen Zielsprachwechsels aktiv ist und bereits Text analysiert wurde, wird die sichtbare Tabelle unmittelbar mit der neu geladenen Zielterminliste gerendert. Bei einem Ladefehler wird sie nicht mit der alten Zielterminliste unter der neuen Sprache neu aufgebaut.

### Export

Der Translator verwendet dieselbe Formatwahl wie der Inspector. Der Excel-Bericht enthält die gefundenen Termini und zielsprachigen Vorzugsbenennungen; CSV und JSON enthalten dieselben fachlichen Kerndaten in maschinenlesbarer Form.

## 5. Sprachwechsel

### Ausgangssprache

- Die Ausgangssprache wird beim Start aus `source` oder `config.initialSourceLanguage` übernommen.
- `switchSourceLanguage()` würde den Modulzustand, `sessionStorage.sourceLanguage` und den Titel aktualisieren.
- Diese Funktion wird im aktuellen UI nicht aufgerufen.
- `sessionStorage.sourceLanguage` wird beim Start nicht zurückgelesen.

### Zielsprache

- Die Zielsprache wird beim Start aus `target`, `config.initialTargetLanguage` oder `''` übernommen.
- Das Profil-Icon öffnet das Zielsprachenmodal.
- Beim Öffnen werden FileMaker-Sprachoptionen erneut geladen, alphabetisch sortiert und die Ausgangssprache ausgeschlossen.
- Speichern setzt die neue Zielsprache, schreibt `sessionStorage.targetLanguage`, lädt die Zielterminliste neu, aktualisiert Titel und Modusbeschriftungen und schreibt `source` und `target` in die aktuelle URL.
- `sessionStorage.targetLanguage` wird beim nächsten Start nicht zurückgelesen; URL beziehungsweise Konfiguration bleiben maßgeblich.
- Ist der Wiki-Modus aktiv und ein Concept ausgewählt, wird das Concept für das neue Sprachpaar erneut geladen.

### GUI-Sprache

- Die GUI-Sprache folgt ausschließlich der Browsersprache: Deutsch oder Englisch.
- `json/translations.json` enthält mehr Texte, aktuell wird aber im Hauptmodul im Wesentlichen nur der Loading-Text aktualisiert; die meisten UI-Texte bleiben hartcodiert.
- Eine Meta-Description würde aktualisiert, im aktuellen `flashterm.html` existiert jedoch kein entsprechendes Meta-Element.

### URL und sessionStorage

Relevante Storage-Einträge:

| Schlüssel | Schreiber | Leser beim Start |
|---|---|---|
| `fmToken` | FileMaker-API | FileMaker-API |
| `fmTokenExpiration` | FileMaker-API | FileMaker-API |
| `availableLanguages` | FileMaker-API | nicht vom Hauptmodul verwendet |
| `languageData` | Hauptmodul | Hauptmodul; V2-Envelope mit `guiLanguage` und normalisiertem `languages`-Array |
| `sourceLanguage` | ungenutzter Quellsprachwechsel | nein |
| `targetLanguage` | Zielsprachwechsel | nein |

Der Sprachcache wird als `{ version: 2, guiLanguage, languages: [{ code, name }] }` gespeichert. Nur ein V2-Envelope für die aktuelle GUI-Sprache mit einem Array unter `languages` wird wiederverwendet. Alte FileMaker-Roharrays, andere GUI-Sprachen, unerwartete JSON-Typen und beschädigtes JSON gelten als Cachemiss und führen zu einem neuen Repository-Abruf. Beschädigtes Cache-JSON bricht die Initialisierung damit nicht mehr ab; dies ist eine bewusste Robustheitsänderung. Ein formal gültiges V2-Envelope mit leerem `languages`-Array wird weiterhin als gültiger leerer Cache akzeptiert.

## 6. Wiki-/Concept-Ansicht

### Laden der Concept-Daten

- `definitionAPI/_find` wird mit der Concept-ID abgefragt.
- Das FileMaker-Feld `termlist` wird als JSON geparst und als `terms` an die UI weitergereicht.
- Die UI filtert die Antwort nach Ausgangs- und Zielsprache und baut daraus ein internes `conceptData`-Objekt.

### Concept-`termlist`-Semantik

**Historisches Verhalten bis zum Bugfix „Normalize missing Concept terms“:** `getFileMakerConceptDetails()` ergänzte `terms` nur bei einem truthy und erfolgreich geparsten `termlist`. Fehlendes, leeres oder syntaktisch ungültiges `termlist` ließ den Sprachrecord ohne `terms` weiterlaufen. Ausgewählte Source-/Target-Records konnten deshalb das Wiki-Rendering mit einem `TypeError` abbrechen; ein nicht ausgewählter Record wurde vom bisherigen Browserpfad übersprungen, ließ aber `mapConcept()` scheitern.

**Bewusster Bugfix:** Die FileMaker-Grenze normalisiert nun jeden Concept-Sprachrecord auf ein Array unter `terms`:

- Gültiges, arrayförmiges `termlist`-JSON wird unverändert als Array übernommen.
- `"[]"`, ein fehlendes `termlist` und der leere String `""` ergeben `terms: []`.
- Syntaktisch ungültiges `termlist`-JSON ergibt ebenfalls `terms: []`. Die API darf dafür weiterhin ausschließlich eine generische, inhaltsfreie Parsingmeldung ausgeben.
- `mapConcept()` erhält dadurch aus dem produktiven FileMaker-Pfad zuverlässig `terms: Term[]` für jeden Sprachrecord.
- Ausgewählte Source-/Target-Records ohne verwendbare Terminliste bleiben als vorhandene Sprachrecords erhalten; der View-Model-Fallback lautet `Keine Übersetzung`.
- Ein defekter, nicht ausgewählter Sprachrecord verwirft das gesamte Concept nicht mehr. Der zuvor dokumentierte Blocker für `terminologyRepository.getConcept()` ist damit beseitigt.

### Benennungen

- Die bevorzugte Ausgangsbenennung und, sofern vorhanden, die bevorzugte Zielbenennung erscheinen gemeinsam als Haupttitel.
- Rechts im Titel werden zwei Sterne angezeigt.
- Alternative und abgelehnte Synonyme erscheinen getrennt mit ⭐ beziehungsweise 🚫.
- Die aktuell ausgewählte Benennung kann hervorgehoben werden.

### Definition und Fußnoten

- `definition` wird als JSON-Array interpretiert; verwendet wird nur das erste Element.
- Definition und Fußnote werden für Ausgangs- und Zielsprache getrennt gesammelt.
- Fußnoten werden direkt unter die jeweilige Definition angehängt.
- Der separate HTML-Bereich `footnotes-section` wird im aktuellen Rendering nicht befüllt.

### Kontext und Info

- `context` und `info` werden jeweils als JSON-Arrays interpretiert.
- Beide werden als Tabellen mit Term, Inhalt und optionaler Fußnote dargestellt.

### Infobox

- Infobox-Inhalte werden mit `markdown-it` gerendert.
- Rohes HTML ist in der aktuellen Markdown-Konfiguration erlaubt.
- Ausgangs- und Zielsprache besitzen getrennte Container.

### Links

- `hyperLink` darf als Array oder JSON-String vorliegen.
- Linklabel und URL werden als Liste gerendert.
- Links öffnen in einem neuen Tab und besitzen `rel="noopener"`.
- Die URL wird nicht auf erlaubte Protokolle validiert.
- Die Verfügbarkeitsprüfung des Sprachmenüs fragt für den Abschnitt `links` ein gleichnamiges Detailfeld ab, während das Mapping `hyperLink` verwendet. Der Zustand der Link-Sprachbuttons ist daher datenabhängig zu verifizieren.

### Bilder

- `fileName` stammt aus den Concept-Daten der Ausgangssprache.
- Die URL wird durch direktes Anhängen an `config.imagePath` gebildet.
- Vor der Anzeige wird die Bild-URL per `fetch()` geprüft.
- Bei erfolgreicher Response wird `src` gesetzt und der Bildbereich angezeigt.
- Bei fehlender Datei, Request-Fehler oder fehlenden Elementen wird der Bildbereich ausgeblendet.

### Sprachumschaltung innerhalb des Concepts

- Für Synonyme, Definition, Kontext, Info, Infobox und Links werden jeweils zwei Sprachbuttons erzeugt.
- Verfügbare Inhalte zeigen den zweistelligen Sprachcode; fehlende Inhalte einen deaktivierten Gedankenstrich.
- Standardmäßig ist die Ausgangssprache markiert.
- Die Umschaltung blendet Quell- und Zielcontainer gegenseitig ein beziehungsweise aus.
- Da nur die ersten zwei Zeichen des Sprachcodes verglichen werden, können Sprachvarianten mit demselben Basiscode nicht eindeutig unterschieden werden. **Zu verifizieren.**

### Leere Abschnitte

Nach dem Rendering werden Abschnitte ohne sichtbaren Quell- und Zielinhalt per `hidden` ausgeblendet. Das gilt auch für den vorhandenen, aber nicht befüllten Fußnotenbereich.

## 7. Theme und responsives Verhalten

### Light/Dark Mode der Anwendung

- CSS-Variablen werden über `prefers-color-scheme: dark` überschrieben.
- Ein Inline-Skript setzt beim Start passend zum Systemmodus Favicon und Logo.
- Änderungen des Systemmodus aktualisieren Favicon und Logo über einen `matchMedia`-Listener.
- Die Export-Schaltflächen verwenden kompakte Textlabels ohne wiederholtes Download-Icon und übernehmen ihre Farben über die Theme-Variablen.

### Handbuch

`manual-de.html` besitzt zusätzlich einen manuell erzeugten Dark-Mode-Button und toggelt eine eigene Klasse. Dieses Verhalten ist unabhängig vom automatischen Systemmodus der Hauptanwendung.

### Responsive Verhalten

Bei maximal 768 px Breite:

- wird der Headerinhalt vertikal angeordnet,
- wird das Suchfeld auf maximal 90 % begrenzt und erhält oberen Abstand,
- wird die Modusnavigation vertikal angeordnet,
- wird das Container-Padding reduziert.

Header und Hauptüberschrift verwenden feste beziehungsweise sticky Positionierung. Das genaue Verhalten bei kleinen Viewports, Browser-Zoom und langen Sprachbezeichnungen muss visuell verifiziert werden.

## 8. Exporte

### Excel

- Auslöser ist die Schaltfläche „Excel“ in der Werkzeugzeile oberhalb der Term-Mining-Tabelle.
- Datenquelle ist das bereits berechnete Prüfergebnis, nicht mehr die gerenderte HTML-Tabelle.
- Der Bericht enthält einen Titelbereich mit Modus, Sprache beziehungsweise Sprachpaar, lokalisiertem Exportzeitpunkt und einer Zusammenfassung aus unterschiedlichen Termini und gesamten Fundstellen.
- Die Ergebnistabelle enthält ausschließlich die vier menschenlesbaren Spalten Terminus, ausgeschriebene Bewertung, Anzahl und Vorzugsbenennung. Sprachcodes bleiben den maschinenlesbaren CSV-/JSON-Exporten vorbehalten.
- Das Arbeitsblatt verwendet passende Spalten- und Zeilenmaße, eine zusammengefasste Titelzeile und Autofilter. Eine farbige Zellgestaltung oder fixierte Tabellenkopfzeile wird mit der vorhandenen SheetJS Community Edition nicht erzeugt.
- Der Downloadname lautet `flashterm_report_<source>-<preferred-language>.xlsx`.

### JSON

- Auslöser ist die Schaltfläche „JSON“ in der Werkzeugzeile oberhalb der Term-Mining-Tabelle.
- `exportTerms()` verwendet das bereits von `termMining()` berechnete Prüfergebnis.
- Die Datenstruktur enthält Terminus, Kategorie und optional bevorzugte Übersetzung.
- Der Dateiname lautet `termlist_<source>-<target>.json`.
- Excel und JSON werden getrennt ausgelöst; ein Klick erzeugt nur das ausgewählte Format.

### CSV

- Auslöser ist die Schaltfläche „CSV“ in der Werkzeugzeile oberhalb der Term-Mining-Tabelle.
- Der UTF-8-Export verwendet Semikolon als Trennzeichen und die stabilen Spalten `term`, `category`, `count`, `preferredDesignation`, `termLanguage` und `preferredDesignationLanguage`.
- Trennzeichen, Anführungszeichen und Zeilenumbrüche in Werten werden maskiert. Mit `=`, `+`, `-` oder `@` beginnende Werte werden für Tabellenkalkulationen neutralisiert.
- Der Dateiname lautet `termlist_<source>-<preferred-language>.csv`.

## 9. Fehler- und Sonderfälle

### Kein Suchtreffer

- Suggestions werden geleert.
- Das Suggestions-Fenster wird ausgeblendet, sofern es nicht verschoben wurde.
- Bei verschobenem Fenster kann ein leeres Fenster sichtbar bleiben. **Zu verifizieren.**

### Leere Eingaben

- Leeres normales Input blendet das Clear-Icon aus und in der Regel die Suggestions.
- Ein leeres Paste-Event speichert leeren Text und ruft trotzdem `termMining()` auf, wechselt aber nicht ausdrücklich in den Inspector.
- Das nach dem Paste-Ablauf geleerte Suchfeld verhindert den JSON-Export des bereits berechneten Prüfergebnisses nicht.

### Fehlende FileMaker-Daten

- Fehlende Terminlisten führen zu leeren internen Listen; Initialisierung kann fortgesetzt werden.
- Fehlende Concept-Details werden in der Konsole gemeldet; die vorhandene UI wird nicht ausdrücklich durch eine Fehleransicht ersetzt.
- Fehlerhaftes JSON in `definition`, `context`, `info` oder `hyperLink` führt fachlich zum jeweiligen leeren Fallback; andere Concept-Bereiche können weiter gerendert werden.
- Der heutige Browserpfad protokolliert diese Parsingfehler feldbezogen. `mapConcept()` erzeugt dieselben fachlichen Fallbackdaten ohne entsprechende feldbezogene Logs. Dieser Unterschied betrifft die Diagnostik, nicht das Domain-Modell oder die gerenderte UI.
- Eine spätere Entfernung der feldbezogenen Parsinglogs muss bewusst dokumentiert werden und darf nicht unbeabsichtigt Teil der Repository-Integration sein.
- Fehlende Inhalte werden nach dem Rendering ausgeblendet.

### API-Fehler

- Loginfehler beenden den aktuellen Initialisierungsversuch, wechseln in `failed` und bieten einen erneuten Versuch an. Die Modusnavigation bleibt verfügbar; datenabhängige Bedienelemente bleiben deaktiviert.
- Fehler beim Laden von Sprachdaten können über `handleError()` als Text im Mining-Container landen.
- Netzwerk-/API-Fehler beim Laden einer Terminliste werden protokolliert; die zuvor vorhandene Terminliste bleibt unverändert.
- Enthält ein `termlist`-Feld ungültiges JSON, wird `handleError('Error parsing termlistField', error)` aufgerufen und die gesamte Terminlistenantwort verworfen. Die zuvor vorhandene Source- beziehungsweise Target-Terminliste bleibt unverändert. Dies ist ein bewusster Bugfix gegenüber dem früheren partiellen Ergebnis mit `undefined`-Einträgen.
- Der Concept-Request prüft `response.ok` nicht ausdrücklich vor dem JSON-Parsing und gibt bei Fehlern häufig `null` zurück.
- Vollständige Server-Fehlertexte beziehungsweise Responses können aktuell in der Konsole erscheinen.

### Ungültige oder fehlende URL-Parameter

- Fehlende Parameter verwenden die Konfigurationswerte.
- Ungültige Werte werden nicht validiert und können an FileMaker weitergereicht oder in UI-Beschriftungen verwendet werden.
- Nicht erkannte Sprachwerte können dazu führen, dass FileMaker keine Daten liefert und die UI den rohen Sprachcode als Fallback verwendet.

### Abgelaufene Session

- Fehlt der Token oder ist die lokal gespeicherte Ablaufzeit überschritten, erfolgt ein neuer Login.
- Bei jeder Verwendung eines lokal noch gültigen Tokens wird die lokale Ablaufzeit erneut um 15 Minuten verlängert.
- Die tatsächliche FileMaker-Session wird dadurch nicht nachweisbar serverseitig verlängert.
- Antwortet FileMaker wegen eines serverseitig abgelaufenen Tokens mit `401`, existiert kein zentraler automatischer Re-Login mit Wiederholung des ursprünglichen Requests. **Zu verifizieren.**

## 10. Manuelle Smoke-Test-Matrix

Der integrierte Durchlauf vom 16. August 2026 ist in [`smoke-test-2026-08-16.md`](smoke-test-2026-08-16.md) gegen die folgenden Characterization-IDs protokolliert.

| Test-ID | Ausgangszustand | Aktion | Erwartetes aktuelles Verhalten |
|---|---|---|---|
| FT-START-001 | Gültige Konfiguration, keine Query-Parameter | `index.html` öffnen | Weiterleitung zu `flashterm.html`; Wiki aktiv; Suchfeld fokussiert; Sprachen aus Konfiguration |
| FT-START-002 | URL mit `source` und `target` | `index.html?source=…&target=…` öffnen | Parameter bleiben nach Weiterleitung erhalten und bestimmen das initiale Sprachpaar |
| FT-START-003 | Erreichbares FileMaker, leerer Session Storage | Anwendung öffnen | Login, Sprachdaten, Quell- und Zielterminliste werden seriell geladen; Loading-Anzeige verschwindet anschließend |
| FT-START-004 | FileMaker-Login schlägt fehl | Anwendung öffnen | Wiki-Grundzustand und Modusnavigation bleiben sichtbar; ein lokalisierter `failed`-Zustand bietet „Erneut versuchen“ an; datenabhängige Bedienelemente bleiben deaktiviert |
| FT-START-005 | Initialisierung läuft | Datenabhängige Aktionen verwenden | Suche, Löschen und Sprachwahl sind bis `ready` oder `degraded` deaktiviert; Moduswechsel bleiben möglich |
| FT-START-006 | Übersetzungen, Sprachoptionen oder eine Terminliste können nicht geladen werden | Initialisierung abschließen | `degraded` wird angezeigt; geladene Funktionen bleiben nutzbar und ein erneuter vollständiger Initialisierungsversuch wird angeboten |
| FT-START-007 | `failed` oder `degraded` sichtbar | „Erneut versuchen“ mehrfach verwenden | Pro Klick läuft höchstens eine Initialisierung; Hauptinteraktionen werden nicht mehrfach ausgeführt |
| FT-SEARCH-001 | Initialisierung abgeschlossen | Teilstring eines bekannten Terms tippen | Passende Ausgangstermini erscheinen case- und diakritika-unabhängig als Suggestions |
| FT-SEARCH-002 | Suggestions sichtbar | `ArrowDown`, `ArrowUp`, `Enter` verwenden | Markierung bewegt sich; Enter aktiviert die markierte Suggestion |
| FT-SEARCH-003 | Suggestions sichtbar | Suggestion anklicken | Concept-Daten werden geladen und Wiki-Ansicht wird angezeigt |
| FT-SEARCH-004 | Keine Terminologie passt | Query eingeben | Suggestions verschwinden; bei zuvor verschobenem Fenster leeren Zustand verifizieren |
| FT-SEARCH-005 | Suggestions sichtbar | Header ziehen, danach Suchfeld verlassen | Fenster wird verschoben und bleibt gemäß Drag-/Blur-Logik offen; exaktes Verhalten verifizieren |
| FT-WIKI-001 | Concept mit zwei Sprachen | Suggestion auswählen | Bevorzugte Benennungen, Synonyme, Definition, Kontext, Info, Infobox und Links erscheinen entsprechend den Daten |
| FT-WIKI-002 | Concept enthält Fußnote | Concept öffnen | Fußnote erscheint unter der Definition; separater Fußnotenabschnitt bleibt leer/verborgen |
| FT-WIKI-003 | Concept besitzt Bilddatei | Concept öffnen | Bild-URL wird geprüft und Bild bei erfolgreicher Response angezeigt |
| FT-WIKI-004 | Bild fehlt oder Request schlägt fehl | Concept öffnen | Bildcontainer bleibt beziehungsweise wird verborgen |
| FT-WIKI-005 | Quell- und Zielinhalt vorhanden | Abschnittssprachbutton anklicken | Quell- und Zielcontainer wechseln; ausgewählter Button wird markiert |
| FT-WIKI-006 | Source und Target teilen denselben zweistelligen Basiscode | Sprachbutton anklicken | Aktuelle Mehrdeutigkeit der Umschaltung dokumentieren; zu verifizieren |
| FT-WIKI-TERMS-001 | Source `de-DE` besitzt kein verwendbares `termlist`; Target `en-GB` ist gültig | Concept öffnen | Historisch brach ein fehlendes `terms` das Rendering per `TypeError` ab; nach dem Bugfix wird `terms: []` verwendet und Source erhält `Keine Übersetzung` |
| FT-WIKI-TERMS-002 | Target `en-GB` besitzt kein verwendbares `termlist`; Source `de-DE` ist gültig | Concept öffnen | Historisch brach ein fehlendes `terms` das Rendering per `TypeError` ab; nach dem Bugfix wird `terms: []` verwendet und Target erhält `Keine Übersetzung` |
| FT-WIKI-TERMS-003 | Source und Target sind gültig; nicht ausgewähltes `fr-FR` besitzt kein verwendbares `termlist` | Concept öffnen | Historisch übersprang der Browserpfad `fr-FR`, während `mapConcept()` scheiterte; nach dem Bugfix besitzt `fr-FR` `terms: []` und das gesamte Concept bleibt mapbar |
| FT-WIKI-TERMS-004 | Ausgewählter Sprachrecord stammt aus FileMaker mit `termlist: "[]"` | Concept öffnen | Unverändert entsteht `terms: []`; kein `TypeError` entsteht aus der Terminliste und der vorhandene Sprachrecord verwendet `Keine Übersetzung` als Preferred-Term-Fallback |
| FT-MINING-001 | Quellterminliste geladen | Mehrzeiligen Text in das Suchfeld einfügen | Suchfeld wird geleert, Inspector aktiviert und Text analysiert |
| FT-MINING-002 | Text enthält Gewichtungen 0, 1 und 2 | Text einfügen | Treffer erscheinen mit 🚫, ⭐ und ⭐⭐ und korrekten Zählwerten |
| FT-MINING-003 | Text enthält kurzen Terminus innerhalb eines längeren | Text einfügen | Der eingeschlossene kürzere Treffer wird unterdrückt |
| FT-MINING-004 | Mining-Tabelle sichtbar | Gefundenen Terminus anklicken | Wiki-Ansicht des Concepts erscheint; aktive Modusmarkierung ist zu verifizieren |
| FT-MINING-005 | Text ohne Treffer | Text einfügen | Statt einer leeren Tabelle erscheint der lokalisierte Leerzustand „Im Text wurden keine hinterlegten Termini erkannt.“ beziehungsweise „No registered terms were detected in the text.“; Exportaktionen werden nicht angeboten (bewusste UX-Verbesserung) |
| FT-TRANSLATOR-001 | Noch kein Text analysiert | Translator anklicken | Mining-Bereich erscheint; Suchfeld fordert zum Einfügen von Text auf |
| FT-TRANSLATOR-002 | Text wurde im Inspector analysiert | Translator anklicken | Tabelle wird mit bevorzugten Benennungen aus der Zielterminliste neu gerendert |
| FT-TRANSLATOR-003 | Translator-Tabelle sichtbar | Zielsprache wechseln | Nach erfolgreichem Laden der neuen Zielterminliste aktualisieren sich Tabellenkopf und Vorzugsbenennungen unmittelbar, ohne erneuten Modusklick |
| FT-TRANSLATOR-004 | Translator aktiv, noch kein Text analysiert | Mehrzeiligen Text in das Suchfeld einfügen | Translator bleibt aktiv und zeigt die erkannten Termini unmittelbar mit den Vorzugsbenennungen der Zielsprache |
| FT-LANG-001 | Anwendung initialisiert | Profil-Icon anklicken | Modal öffnet; FileMaker-Sprachoptionen ersetzen den initialen lokalen Selector-Inhalt |
| FT-LANG-002 | Modal offen | Andere Zielsprache speichern | Target wird gespeichert, URL und Titel ändern sich, Zielterminliste wird neu geladen |
| FT-LANG-003 | Wiki mit ausgewähltem Concept | Zielsprache wechseln | Concept wird für das neue Sprachpaar erneut geladen |
| FT-LANG-004 | `targetLanguage` nur in Session Storage gesetzt, URL ohne Target | Seite neu laden | Session-Wert wird ignoriert; Konfigurationswert wird verwendet |
| FT-LANG-005 | Ungültiger URL-Sprachcode | Anwendung öffnen | Wert wird nicht vorab validiert; tatsächliche FileMaker-/UI-Reaktion dokumentieren |
| FT-LANG-CACHE-001 | Altes FileMaker-Roharray in `sessionStorage.languageData` | Anwendung neu laden | Alter Cache wird ignoriert, Sprachen werden über das Repository geladen und als V2-Envelope gespeichert |
| FT-LANG-CACHE-002 | Gültiges V2-Envelope mit anderer `guiLanguage` | Anwendung neu laden | Cache wird ignoriert und für die aktuelle GUI-Sprache neu geladen |
| FT-LANG-CACHE-003 | Gültiges V2-Envelope mit `languages: []` für die aktuelle GUI-Sprache | Anwendung neu laden | Leerer Cache wird akzeptiert und löst keinen neuen Sprachabruf aus |
| FT-LANG-CACHE-004 | Syntaktisch beschädigtes JSON in `sessionStorage.languageData` | Anwendung neu laden | Cache gilt als Cachemiss; Sprachabruf und Initialisierung laufen weiter |
| FT-LANG-CACHE-005 | Gültiges V2-Envelope für die aktuelle GUI-Sprache | Anwendung neu laden | Sprachen werden aus dem Cache übernommen; kein erneuter Sprachabruf |
| FT-THEME-001 | Systemmodus Light | Anwendung öffnen | Light-Variablen, Light-Favicon und Light-Logo werden verwendet |
| FT-THEME-002 | Systemmodus Dark | Anwendung öffnen | Dark-Variablen, Dark-Favicon und Dark-Logo werden verwendet |
| FT-THEME-003 | Export-Schaltflächen bereits sichtbar | Systemmodus wechseln | Logo/Favicon und die variablenbasierten Farben der Export-Schaltflächen wechseln passend zum Systemmodus |
| FT-RESP-001 | Viewport breiter als 768 px | Anwendung öffnen | Horizontale Header- und Modusstruktur |
| FT-RESP-002 | Viewport höchstens 768 px | Anwendung öffnen | Header und Modusnavigation werden vertikal, Container-Padding wird reduziert |
| FT-RESP-003 | Lange Mining-Ergebnisliste bei breitem Viewport | Nach unten scrollen | Bewertungslegende und Exportauswahl bleiben unterhalb des festen Seitenheaders sichtbar; der Tabellenkopf scrollt normal mit |
| FT-EXPORT-001 | Mining-Tabelle sichtbar | „Excel“ anklicken | Ausschließlich `flashterm_report_<source>-<preferred-language>.xlsx` wird als lesbarer Bericht mit Metadaten und ausgeschriebenen Bewertungen erzeugt |
| FT-EXPORT-002 | Paste-basierter Mining-Ablauf mit Treffern | „JSON“ anklicken | Ausschließlich `termlist_<source>-<target>.json` wird aus dem bereits berechneten Prüfergebnis erzeugt |
| FT-EXPORT-003 | Mining-Tabelle sichtbar | Excel und JSON nacheinander exportieren | Excel und JSON werden jeweils nur durch ihre eigene Schaltfläche ausgelöst |
| FT-EXPORT-004 | Mining-Tabelle mit Treffern sichtbar | „CSV“ anklicken | Eine UTF-8-CSV mit Bewertung, Anzahl, Vorzugsbenennung und Sprachcodes wird erzeugt; die anderen Exportformate werden nicht ausgelöst |
| FT-ERROR-001 | Lokal abgelaufene Tokenzeit | API-Aktion auslösen | Neuer FileMaker-Login erfolgt vor dem Request |
| FT-ERROR-002 | Server lehnt lokal als gültig betrachteten Token ab | API-Aktion auslösen | Kein zentraler Retry; konkretes UI-/Konsolenverhalten dokumentieren |
| FT-ERROR-003 | Concept enthält fehlerhaftes JSON in `definition`, `context`, `info` oder `hyperLink` | Concept öffnen | Das betroffene Feld verwendet seinen leeren Fallback und übrige Bereiche werden soweit möglich gerendert; der heutige Browserpfad protokolliert den Feldfehler, während `mapConcept()` dieselben Fallbackdaten ohne feldbezogenes Log erzeugt |
| FT-ERROR-004 | Terminlistenantwort enthält zwischen gültigen Records ein ungültiges `termlist`-JSON | Source- oder Target-Terminliste laden | `handleError()` zeigt den Parsingfehler; die gesamte neue Antwort wird verworfen, die vorherige Terminliste bleibt unverändert und der Ladeindikator wird verborgen |

## Noch manuell zu verifizieren

Folgende Punkte lassen sich ohne laufendes FileMaker-System oder echten Browserablauf nicht abschließend festlegen:

1. Initialer Selector-Inhalt und zeitliche Wechselwirkung zwischen lokaler und FileMaker-Sprachliste.
2. Verhalten bei ungültigen Source-/Target-Codes gegen die tatsächlich eingesetzten FileMaker-Layouts.
3. Visuelle Darstellung und Fokusführung der neuen Zustände `failed` und `degraded` sowie der Wiederholungsaktion.
4. Leeres, zuvor verschobenes Suggestions-Fenster bei null Treffern.
5. Modusmarkierung nach Klick auf einen Mining-Tabelleneintrag und Wechsel in die Wiki-Ansicht.
6. Sofortige oder verzögerte Translator-Aktualisierung nach Zielsprachwechsel.
7. Sprachumschaltung bei zwei Locale-Codes mit identischem zweistelligem Basiscode.
8. Verfügbarkeit der Link-Sprachbuttons bei FileMaker-Daten im Feld `hyperLink`.
9. Praktischer Download und Inhalt der getrennten Excel-, CSV- und JSON-Exporte.
10. Verhalten bei serverseitig abgelaufener FileMaker-Session trotz lokal verlängerter Ablaufzeit.
11. Visuelle Darstellung bei 768 px, kleineren Viewports, Browser-Zoom und langen Sprachbezeichnungen.
12. Lesbarkeit der Export-Schaltflächen nach einem Theme-Wechsel.
