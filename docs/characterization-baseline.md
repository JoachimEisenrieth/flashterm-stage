# Characterization Baseline: flashterm STAGE

Stand: Initial Import auf Branch `main`

## Zweck und Lesart

Diese Baseline beschreibt das aktuell im Repository implementierte Verhalten. Sie ist keine Anforderungsspezifikation und beschreibt ausdrücklich nicht, wie sich die Anwendung künftig verhalten sollte.

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

Beim Laden von `flashterm-121-005.js` geschieht in dieser Reihenfolge:

1. URL-Sprachen werden ermittelt und in Modulzustand übernommen.
2. `initialize()` wird asynchron gestartet, aber nicht abgewartet.
3. `switchMode("wiki")` aktiviert unmittelbar den Wiki-Modus.
4. Das Suchfeld erhält den Fokus.

### Asynchrone Initialisierung

`initialize()` führt nacheinander aus:

1. Anmeldung an FileMaker.
2. Ermittlung der GUI-Sprache aus der Browsersprache:
   - Browser beginnt mit `de` → `de-DE`
   - alle anderen Browser-Sprachen → `en-GB`
3. Laden von `json/translations.json` und Aktualisieren der vorhandenen übersetzbaren UI-Elemente.
4. Laden beziehungsweise Wiederverwenden der normalisierten Sprachoptionen aus einem versionierten, an die GUI-Sprache gebundenen Cache.
5. Laden und Parsen der Terminliste der Ausgangssprache.
6. Laden und Parsen der Terminliste der Zielsprache.
7. Aktualisieren des Dokumenttitels und der Modusbeschriftungen.
8. Registrieren der Haupt-Event-Handler.

Die Schritte laufen überwiegend seriell. Ein Fehler beim Login beendet den gesamten Initialisierungsblock; die nachfolgenden Haupt-Event-Handler werden dann nicht registriert. Fehler beim Laden oder Parsen einer einzelnen Terminliste werden dagegen innerhalb der jeweiligen Ladefunktion abgefangen. Die zuvor vorhandene Terminliste bleibt dabei unverändert; während der ersten Initialisierung ist sie noch leer.

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
4. Bei nicht leerem Text wird in den Inspector-Modus gewechselt.
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
- Auch bei null Treffern wird nach aktuellem Code eine leere Tabelle mit Header sowie ein Export-Icon erzeugt. **Zu verifizieren.**

### Interaktion mit gefundenen Termini

- Gefundene Termini und bevorzugte Benennungen sind klickbar.
- Ein Klick lädt die Wiki-/Concept-Ansicht für die zugehörige Concept-ID.
- `showWiki()` blendet den Mining-Container aus und die Wiki-Ansicht ein, ändert aber nicht ausdrücklich die aktive Modusklasse. Dadurch kann visuell weiterhin Inspector oder Translator aktiv markiert sein. **Zu verifizieren.**
- Hover setzt die Textdekoration per Inline-Style auf unterstrichen.

### Export aus dem Inspector

- Das dynamisch erzeugte Export-Icon erhält zunächst einen Excel-Handler.
- Danach kann `setupExportClickHandlers()` demselben Icon zusätzlich einen JSON-Handler geben.
- Weil das Suchfeld nach dem Paste-Ablauf leer ist, beendet der JSON-Handler den Export normalerweise mit einem Hinweis auf eine leere Eingabe.
- Erwartbares aktuelles Browserverhalten ist daher: Excel-Download und möglicherweise zusätzlich ein Alert des JSON-Pfads. **Bekannte Inkonsistenz / zu verifizieren.**

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
- Ein Klick auf einen Terminus öffnet dessen Wiki-Ansicht.
- Ein Wechsel der Zielsprache lädt die neue Zielterminliste.
- Wenn der Translator während des Zielsprachwechsels aktiv ist, wird die vorhandene Tabelle nicht ausdrücklich sofort neu gerendert. Ein erneuter Moduswechsel rendert sie aus dem aktuellen Zustand neu. **Zu verifizieren.**

### Export

Der Translator verwendet dasselbe dynamische Export-Icon und dieselben Excel-/JSON-Handler wie der Inspector. Der Excel-Export enthält die aktuell sichtbare Tabelle einschließlich zielsprachiger Benennungen.

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
- Das Export-Icon wählt sein helles oder dunkles Asset beim Erzeugen anhand des dann aktuellen Systemmodus.
- Für ein bereits gerendertes Export-Icon existiert kein eigener Listener auf spätere Theme-Wechsel. **Zu verifizieren.**

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

- Auslöser ist das dynamisch erzeugte Export-Icon unter der Term-Mining-Tabelle.
- Datenquelle ist die aktuell gerenderte `.term-table` im DOM.
- SheetJS wandelt die Tabelle in ein Worksheet um.
- Der Downloadname lautet `mined_terms.xlsx`.
- Im Translator enthält die Tabelle die aktuell gerenderten zielsprachigen Benennungen.

### JSON

- `exportTerms()` sieht einen JSON-Download vor.
- Die vorgesehene Datenstruktur enthält Terminus, Kategorie und optional bevorzugte Übersetzung.
- Der vorgesehene Dateiname lautet `termlist_<source>-<target>.json`.
- Der Handler liest jedoch den aktuellen Suchfeldwert, während der Paste-/Mining-Ablauf das Suchfeld zuvor leert.
- Zusätzlich wird `extractTermsFromText()` in diesem Pfad ohne die erforderliche Terminliste aufgerufen.
- Derselbe Export-Icon-Knoten kann gleichzeitig den Excel- und JSON-Handler besitzen.

**Bekannte Inkonsistenz / zu verifizieren:** Ob im praktischen Hauptablauf zusätzlich zum Excel-Download ein Alert erscheint, ob ein JSON-Download erreichbar ist und ob dabei ein Laufzeitfehler auftritt.

## 9. Fehler- und Sonderfälle

### Kein Suchtreffer

- Suggestions werden geleert.
- Das Suggestions-Fenster wird ausgeblendet, sofern es nicht verschoben wurde.
- Bei verschobenem Fenster kann ein leeres Fenster sichtbar bleiben. **Zu verifizieren.**

### Leere Eingaben

- Leeres normales Input blendet das Clear-Icon aus und in der Regel die Suggestions.
- Ein leeres Paste-Event speichert leeren Text und ruft trotzdem `termMining()` auf, wechselt aber nicht ausdrücklich in den Inspector.
- JSON-Export mit leerem Suchfeld zeigt einen Alert und erzeugt keine JSON-Datei.

### Fehlende FileMaker-Daten

- Fehlende Terminlisten führen zu leeren internen Listen; Initialisierung kann fortgesetzt werden.
- Fehlende Concept-Details werden in der Konsole gemeldet; die vorhandene UI wird nicht ausdrücklich durch eine Fehleransicht ersetzt.
- Fehlerhaftes JSON in einzelnen Concept-Feldern wird feldweise protokolliert; andere Concept-Bereiche können weiter gerendert werden.
- Fehlende Inhalte werden nach dem Rendering ausgeblendet.

### API-Fehler

- Loginfehler beenden die Hauptinitialisierung und werden in der Konsole protokolliert.
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

| Test-ID | Ausgangszustand | Aktion | Erwartetes aktuelles Verhalten |
|---|---|---|---|
| FT-START-001 | Gültige Konfiguration, keine Query-Parameter | `index.html` öffnen | Weiterleitung zu `flashterm.html`; Wiki aktiv; Suchfeld fokussiert; Sprachen aus Konfiguration |
| FT-START-002 | URL mit `source` und `target` | `index.html?source=…&target=…` öffnen | Parameter bleiben nach Weiterleitung erhalten und bestimmen das initiale Sprachpaar |
| FT-START-003 | Erreichbares FileMaker, leerer Session Storage | Anwendung öffnen | Login, Sprachdaten, Quell- und Zielterminliste werden seriell geladen; Loading-Anzeige verschwindet anschließend |
| FT-START-004 | FileMaker-Login schlägt fehl | Anwendung öffnen | Wiki-Grundzustand bleibt sichtbar, Hauptinitialisierung endet, zentrale Event-Handler fehlen; Details manuell verifizieren |
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
| FT-MINING-001 | Quellterminliste geladen | Mehrzeiligen Text in das Suchfeld einfügen | Suchfeld wird geleert, Inspector aktiviert und Text analysiert |
| FT-MINING-002 | Text enthält Gewichtungen 0, 1 und 2 | Text einfügen | Treffer erscheinen mit 🚫, ⭐ und ⭐⭐ und korrekten Zählwerten |
| FT-MINING-003 | Text enthält kurzen Terminus innerhalb eines längeren | Text einfügen | Der eingeschlossene kürzere Treffer wird unterdrückt |
| FT-MINING-004 | Mining-Tabelle sichtbar | Gefundenen Terminus anklicken | Wiki-Ansicht des Concepts erscheint; aktive Modusmarkierung ist zu verifizieren |
| FT-MINING-005 | Text ohne Treffer | Text einfügen | Leere Tabelle mit Header und Export-Icon ist gemäß Code zu erwarten; visuell verifizieren |
| FT-TRANSLATOR-001 | Noch kein Text analysiert | Translator anklicken | Mining-Bereich erscheint; Suchfeld fordert zum Einfügen von Text auf |
| FT-TRANSLATOR-002 | Text wurde im Inspector analysiert | Translator anklicken | Tabelle wird mit bevorzugten Benennungen aus der Zielterminliste neu gerendert |
| FT-TRANSLATOR-003 | Translator-Tabelle sichtbar | Zielsprache wechseln | Neue Zielterminliste wird geladen; unmittelbare Aktualisierung der sichtbaren Tabelle ist zu verifizieren |
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
| FT-THEME-003 | Export-Icon bereits sichtbar | Systemmodus wechseln | Logo/Favicon ändern sich; bestehendes Export-Icon-Verhalten verifizieren |
| FT-RESP-001 | Viewport breiter als 768 px | Anwendung öffnen | Horizontale Header- und Modusstruktur |
| FT-RESP-002 | Viewport höchstens 768 px | Anwendung öffnen | Header und Modusnavigation werden vertikal, Container-Padding wird reduziert |
| FT-EXPORT-001 | Mining-Tabelle sichtbar | Export-Icon anklicken | `mined_terms.xlsx` wird aus der sichtbaren Tabelle erzeugt |
| FT-EXPORT-002 | Paste-basierter Mining-Ablauf | Export-Icon anklicken | Excel-Download plus möglicher JSON-Alert durch Doppelbindung; exakt verifizieren |
| FT-EXPORT-003 | Potenziell erreichbarer JSON-Pfad mit nicht leerem Suchfeld | Export auslösen | Erreichbarkeit und möglicher Fehler wegen fehlender Terminlistenübergabe dokumentieren |
| FT-ERROR-001 | Lokal abgelaufene Tokenzeit | API-Aktion auslösen | Neuer FileMaker-Login erfolgt vor dem Request |
| FT-ERROR-002 | Server lehnt lokal als gültig betrachteten Token ab | API-Aktion auslösen | Kein zentraler Retry; konkretes UI-/Konsolenverhalten dokumentieren |
| FT-ERROR-003 | Concept enthält fehlerhaftes JSON in einem Teilfeld | Concept öffnen | Feldfehler wird protokolliert; übrige Bereiche werden soweit möglich gerendert |
| FT-ERROR-004 | Terminlistenantwort enthält zwischen gültigen Records ein ungültiges `termlist`-JSON | Source- oder Target-Terminliste laden | `handleError()` zeigt den Parsingfehler; die gesamte neue Antwort wird verworfen, die vorherige Terminliste bleibt unverändert und der Ladeindikator wird verborgen |

## Noch manuell zu verifizieren

Folgende Punkte lassen sich ohne laufendes FileMaker-System oder echten Browserablauf nicht abschließend festlegen:

1. Initialer Selector-Inhalt und zeitliche Wechselwirkung zwischen lokaler und FileMaker-Sprachliste.
2. Verhalten bei ungültigen Source-/Target-Codes gegen die tatsächlich eingesetzten FileMaker-Layouts.
3. Sichtbarer Zustand bei Loginfehlern, weil die Haupt-Event-Registrierung dann ausbleibt.
4. Leeres, zuvor verschobenes Suggestions-Fenster bei null Treffern.
5. Modusmarkierung nach Klick auf einen Mining-Tabelleneintrag und Wechsel in die Wiki-Ansicht.
6. Sofortige oder verzögerte Translator-Aktualisierung nach Zielsprachwechsel.
7. Sprachumschaltung bei zwei Locale-Codes mit identischem zweistelligem Basiscode.
8. Verfügbarkeit der Link-Sprachbuttons bei FileMaker-Daten im Feld `hyperLink`.
9. Tatsächliche Doppelwirkung des Export-Icons: Excel-Download, Alert und möglicher JSON-Pfad.
10. Verhalten bei serverseitig abgelaufener FileMaker-Session trotz lokal verlängerter Ablaufzeit.
11. Visuelle Darstellung bei 768 px, kleineren Viewports, Browser-Zoom und langen Sprachbezeichnungen.
12. Verhalten eines bereits sichtbaren Export-Icons bei einem Theme-Wechsel.
