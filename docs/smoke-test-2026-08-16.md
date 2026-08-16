# Browser-Smoke-Test: flashterm STAGE

Datum: 16. August 2026

Branch: `codex/robust-bootstrap-state`

## Testumgebung

- aktueller Worktree auf dem Branch `codex/robust-bootstrap-state`,
- lokaler Development-Proxy auf Loopback-Port `8001`,
- vorhandene lokale Konfiguration aus dem ursprünglichen Checkout ausschließlich read-only verwendet,
- reale FileMaker-Verbindung für den integrierten Produktpfad,
- synthetische lokale API-Antworten ohne reale Zugangsdaten für `failed` und `degraded`,
- Browserbreiten 1280 px, 768 px und 390 px,
- Systemfarbmodus Dark.

Weder Zugangsdaten noch Session-Token oder vollständige FileMaker-Antworten wurden in das Protokoll übernommen.

## Ergebnisübersicht

| Bereich | Characterization-IDs | Ergebnis | Beobachtung |
|---|---|---|---|
| Einstieg und Login | FT-START-001, FT-START-003 | Bestanden | Weiterleitung zu `flashterm.html`, serieller Start, Wiki-Startfläche und fokussierte Suche nach erfolgreicher Initialisierung |
| Kontrollierter Startfehler | FT-START-004 | Bestanden | `failed` sichtbar; Suche und Sprachwahl deaktiviert; Modusnavigation und Retry funktionsfähig |
| Degradierter Start | FT-START-006 | Bestanden | `degraded` sichtbar; Suche und Sprachwahl nutzbar; Retry verfügbar |
| Wiederholungsaktion | FT-START-007 | Bestanden | Erneuter Versuch läuft kontrolliert; parallele Läufe sind zusätzlich automatisiert durch den Initialisierungs-Guard abgesichert |
| Suche und Tastatur | FT-SEARCH-001, FT-SEARCH-002 | Bestanden | Passende Vorschläge; `ArrowDown` markiert den ersten Treffer, `ArrowUp` bleibt am Listenanfang |
| Suggestion und Concept | FT-SEARCH-003, FT-WIKI-001 | Bestanden | Concept-Ansicht mit Vorzugsbenennungen, Synonymen, Definition, Kontext, Info und Infobox geladen |
| Definition und Fußnote | FT-WIKI-002 | Bestanden | Fußnote direkt unter der Definition sichtbar |
| Abschnittssprache | FT-WIKI-005 | Bestanden | Synonyme wechselten von Deutsch zu Englisch; aktiver Sprachbutton wurde markiert |
| Inspector mit Treffern | FT-MINING-001, FT-MINING-002 | Bestanden | Paste aktiviert Inspector; sechs Termini mit bevorzugter, alternativer und abgelehnter Bewertung erkannt |
| Inspector ohne Treffer | FT-MINING-005 | Bestanden | Lokalisierter Leerzustand sichtbar; keine Exportaktionen angeboten |
| Translator | FT-TRANSLATOR-002 | Bestanden | Vorhandenes Inspector-Ergebnis wurde mit zielsprachigen Vorzugsbenennungen gerendert |
| Zielsprachenwechsel | FT-TRANSLATOR-003, FT-LANG-001, FT-LANG-002 | Bestanden | Sprachmodal mit FileMaker-Optionen; Wechsel von Englisch auf Französisch aktualisierte URL, Modustexte, Tabellenkopf und Vorzugsbenennungen unmittelbar |
| Dark Mode | FT-THEME-002 | Bestanden | Dark-Logo aktiv; Texte, Bewertungen und Exportaktionen lesbar |
| Light Mode und Theme-Wechsel | FT-THEME-001, FT-THEME-003 | Offen | Testbrowser und System blieben im Dark Mode; ein echter Systemfarbwechsel wurde nicht durchgeführt |
| Breite Ansicht | FT-RESP-001 | Bestanden | Header und Modusnavigation horizontal bei 1280 px |
| Responsive Ansicht | FT-RESP-002 | Bestanden | Header und Modusnavigation bei 768 px und 390 px vertikal; reduziertes Padding; kein horizontaler Seitenüberlauf |
| Sehr schmale Ansicht und lange Sprachbezeichnung | FT-RESP-002 | Bestanden | Bei 320 px blieb eine bewusst lange, ungültige Sprachbezeichnung innerhalb der vertikal angeordneten Modusschaltflächen; Sprachdialog und Suchfeld blieben im Viewport |
| Browser-Zoom | – | Teilweise geprüft | CSS-Viewportbreiten von 640 px und 320 px simulierten vergrößerte Darstellung ohne Überlauf; ein echter Browser-Zoom ließ sich in der Teststeuerung nicht verlässlich auslösen |
| Sticky Exportleiste | FT-RESP-003 | Bestanden | Werkzeugleiste blieb bei breiter Ansicht unter dem festen Header sichtbar; bei 390 px war sie statisch |
| Excel-Export | FT-EXPORT-001 | Bestanden | Erwartete `.xlsx` erzeugt; ein Blatt `Terminologieprüfung`, Metadaten, Zusammenfassung und sechs menschenlesbare Ergebniszeilen visuell geprüft |
| JSON-Export | FT-EXPORT-002 | Bestanden | Gültiges Array mit sechs Einträgen und den Feldern `term`, `category`, `preferredTranslation` |
| Getrennte Exportaktionen | FT-EXPORT-003 | Bestanden | Excel, CSV und JSON wurden jeweils über ihre eigene Schaltfläche erzeugt |
| CSV-Export | FT-EXPORT-004 | Bestanden | UTF-8-Datei mit Semikolon und den sechs erwarteten Spalten; sechs Ergebniszeilen |
| Browserdiagnostik | – | Bestanden | Im realen integrierten Pfad keine Browserfehler oder Warnungen erfasst |
| FileMaker-Mastersprache | FT-LANG-SOURCE-001 | Bestanden | `languageAPI.source` bestimmt die führende Sprache; abweichender URL-Code wurde korrigiert und die Modusangaben zeigen `Source` |
| Ungültige URL-Sprachcodes | FT-LANG-005 | Teilweise behoben | Ungültige Ausgangssprache wird auf die FileMaker-Source korrigiert; eine nicht verfügbare Zielsprache wird weiterhin nicht verständlich erklärt |
| Serverseitig abgelaufene FileMaker-Session | – | Offen | Eine reale Session wurde für den Smoke-Test nicht absichtlich serverseitig invalidiert |

## Verwendeter fachlicher Prüfinhalt

Der Inspector-Test verwendete einen gekürzten, nicht vertraulichen Text aus `docs/inspector-mustertexte.md`. Enthalten waren bevorzugte, alternative und abgelehnte Benennungen sowie Begriffe mit und ohne zielsprachige Vorzugsbenennung.

Der Leerzustand wurde mit Mustertext 5 aus derselben Datei geprüft.

## Exportprüfung

Erzeugte Dateien:

- `flashterm_report_de_DE-fr_FR.xlsx`,
- `termlist_de_DE-fr_FR.csv`,
- `termlist_de_DE-fr_FR.json`.

Der Excel-Bericht enthielt:

- Modus `Translator`,
- Sprachpaar Deutsch–Französisch,
- Erstellungszeit,
- sechs unterschiedliche Termini und sechs Fundstellen,
- ausgeschriebene Bewertungen,
- Vorzugsbenennungen, soweit vorhanden.

CSV und JSON enthielten dieselben sechs fachlichen Ergebnisse in den jeweils vorgesehenen maschinenlesbaren Strukturen.

## Bestätigte Beobachtung

Nach Auswahl einer Suggestion bleibt das eingegebene Suchfragment im Suchfeld stehen. Das entspricht der bereits dokumentierten Beobachtung und wurde nicht im Rahmen des Bootstrap-Arbeitspakets geändert.

## Ergänzende Randfallprüfung

Der zweite Durchlauf verwendete weiterhin die vorhandene lokale Konfiguration ausschließlich lesend und griff über einen temporären Loopback-Proxy auf den realen integrierten Pfad zu. Ein sauberer Start mit gültiger Ausgangs- und Zielsprache zeigte keine Browserfehler oder Warnungen.

Vor der Anbindung der FileMaker-Source zeigte eine ungültige Ausgangssprache aus der URL folgendes Verhalten:

- blieb die Anwendung bedienbar,
- wurde der unbekannte Code in Seitentitel und Modusschaltflächen angezeigt,
- erschien keine verständliche Meldung zur ungültigen Sprache,
- wurde kein gültiger Ersatzcode in die URL übernommen.

Bei einer Zielsprache, die nicht in den geladenen Sprachoptionen vorhanden war:

- zeigte die Modusnavigation zunächst weiterhin den URL-Code,
- markierte der geöffnete Sprachdialog keine passende Option,
- erschien dadurch die erste verfügbare Option als aktuelle Auswahl,
- ersetzte **Speichern** den unbekannten URL-Code durch diese erste Option.

Nach Ergänzung des Feldes `source` in FileMaker und seiner Anbindung in flashterm stage wurde dieser Source-Randfall erneut geprüft:

- ein absichtlich abweichender URL-Source-Code wurde auf die FileMaker-Mastersprache korrigiert,
- die korrigierte Source wurde in die URL geschrieben,
- Wiki, Inspector und Translator kennzeichneten die Sprache sichtbar mit `Source`,
- die Source erschien nicht in der Zielsprachenauswahl,
- der gültige Start erzeugte keine Browserfehler oder Warnungen.

Damit ist der Source-Anteil der bekannten URL-Altlast behoben. Die Validierung und erste Auswahl der Zielsprache bleibt ein getrenntes Arbeitspaket.

Für die responsive Randfallprüfung wurde der Viewport auf 640 px und anschließend 320 px reduziert. Zusätzlich kam ein bewusst sehr langer ungültiger Sprachcode zum Einsatz. Header und Modusnavigation wechselten in die vertikale Darstellung; Suchfeld, Modusschaltflächen und Sprachdialog blieben innerhalb des Viewports. Ein horizontaler Seitenüberlauf trat nicht auf.

## Noch offen

- Light Mode konnte praktisch nicht geprüft werden, weil der Systemmodus während des Tests Dark war.
- Ein Wechsel des Systemfarbmodus bei bereits sichtbaren Exportaktionen wurde nicht durchgeführt.
- Echter Browser-Zoom bleibt offen; die entsprechenden schmaleren CSS-Viewportbreiten waren unauffällig.
- Identische zweistellige Locale-Präfixe konnten mit den verfügbaren realen Sprachdaten nicht sinnvoll nachgestellt werden.
- Eine serverseitig abgelaufene FileMaker-Session wurde nicht absichtlich erzeugt, um die aktive reale Session nicht für einen Randfalltest zu invalidieren.

## Bewertung

Der zentrale Pilotpfad Start → Suche/Wiki → Inspector → Translator → Zielsprachenwechsel → Excel/CSV/JSON ist praktisch funktionsfähig. Die neuen Zustände `failed` und `degraded` verhalten sich wie vorgesehen. Aus diesem Durchlauf ergibt sich kein Bootstrap-Blocker.
