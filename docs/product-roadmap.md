# Produkt-Roadmap: flashterm stage

Stand: 16. August 2026

## Zweck

Diese Roadmap übersetzt die Produktstrategie von flashterm stage in überprüfbare Arbeitspakete. Sie basiert auf dem aktuell vorhandenen Produkt und unterscheidet bewusst zwischen Produktfestigung, Quellenunabhängigkeit und späterer Verbreitung.

## Kurzbewertung des aktuellen Stands

flashterm stage besitzt bereits einen belastbaren fachlichen Kern und drei unterscheidbare Nutzungssituationen. Die Anwendung ist jedoch noch nicht vollständig als quellenunabhängiges Produkt betreibbar: Der Browser meldet sich weiterhin direkt an FileMaker an, kennt lokale Konfiguration und verwaltet das FileMaker-Session-Token. Die vorhandene Repository-Grenze normalisiert bereits wesentliche Daten, endet aber noch nicht an einer sicheren, austauschbaren Systemgrenze.

### Bereits stark

- Wiki, Inspector und Translator bilden erkennbare fachliche Arbeitsabläufe.
- Preferred, Alternative und Rejected werden textlich und mit verständlichen Symbolen dargestellt.
- Language-, Term- und Concept-Daten werden im produktiven UI-Pfad bereits über ein Repository bezogen.
- Für Languages, Terms und Concepts existieren normalisierte interne Modelle und getestete Mapper.
- Die Concept-Darstellung ist vom FileMaker-Rohformat entkoppelt.
- Excel unterstützt die menschliche Auswertung; CSV und JSON unterstützen technische Weiterverarbeitung.
- Die Oberfläche besitzt eine konsistente, warme und zurückhaltende Gestaltung sowie Light und Dark Mode.
- Characterization Baseline, anonymisierte Fixtures und 73 Unit-Tests sichern wichtige bestehende Verträge.
- Der lokale Development-Proxy ermöglicht realistische Browserprüfungen ohne Änderungen am FileMaker-Server.

### Noch nicht produktreif gelöst

- FileMaker-Zugangsdaten werden über die lokale Browserkonfiguration bereitgestellt.
- FileMaker-Login und Tokenverwaltung laufen im Browser.
- `flashterm.js` importiert weiterhin FileMaker-Login und Konfiguration direkt.
- Die produktive Composition ist fest mit FileMaker-Funktionen verbunden.
- Teile der als Domain-Code bezeichneten Mapper kennen weiterhin `fieldData` und FileMaker-Feldnamen.
- Ein dokumentierter, quellenneutraler HTTP-API-Vertrag existiert noch nicht.
- Es gibt noch keinen zweiten Adapter, der die tatsächliche Quellenunabhängigkeit beweist.
- Browserabläufe werden praktisch, aber noch nicht automatisiert geprüft.
- Einige historisch bekannte Randfälle sind bewusst noch offen.

## Gap-Analyse nach strategischem Ziel

| Strategisches Ziel | Heutiger Stand | Lücke | Priorität |
|---|---|---|---|
| Terminologie zugänglich machen | Verständlicher Einstieg, Suche, Suggestions und Wiki vorhanden | Zielgruppen und wichtigste Nutzungskontexte sind noch nicht ausdrücklich priorisiert | Hoch |
| Sichere Anwendung ermöglichen | Bewertungen, Sprachbezug und fehlende Übersetzungen sind überwiegend eindeutig | Links-Verfügbarkeit und gleichlautende Zweizeichen-Sprachcodes besitzen bekannte Altsemantik | Hoch |
| Reale Arbeitsabläufe unterstützen | Inspector, Translator sowie Excel-, CSV- und JSON-Export vorhanden | Vollständiger praktischer End-to-End-Test und Rückmeldung realer Anwenderinnen fehlen | Hoch |
| Datenquellen austauschbar machen | Repository und normalisierte Modelle sind produktiv im Einsatz | Composition, Login und einige Mapper bleiben FileMaker-spezifisch; kein externer API-Vertrag | Sehr hoch |
| Vertrauen und Datenschutz sichern | Sensitive Browser-Logs wurden reduziert; lokale Config wird ignoriert | Credentials und Session-Token befinden sich weiterhin im Browserkontext | Kritisch vor Produktion |
| Einfach weiterentwickelbar bleiben | Kleine ES-Module, native Tests, kein Build-Zwang | Hauptdatei bleibt groß; Browserorchestrierung ist nur teilweise isoliert testbar | Mittel |
| Wertiges Produkterlebnis | Einheitliche Gestaltung, responsive Grundlagen, klare Submarke | Systematische Prüfung von Dark Mode, schmalen Ansichten und langen Inhalten ist noch offen | Mittel |

## Roadmap

## Jetzt: Stage Pilot festigen

Ziel: Der bestehende Funktionsumfang ist praktisch verlässlich und kann mit ausgewählten Nutzerinnen erprobt werden.

### NOW-1: Vollständiger Browser-Smoke-Test

Umfang:

- Start und Login,
- Suche und Wiki,
- Inspector mit den hinterlegten Mustertexten,
- Translator einschließlich Zielsprachwechsel,
- Excel-, CSV- und JSON-Export,
- Light und Dark Mode,
- breite und schmale Bildschirmansicht,
- leere Ergebnisse und nicht verfügbare Sprachinhalte.

Abnahmekriterium:

- Alle zentralen Abläufe sind anhand der Characterization-IDs geprüft.
- Beobachtungen werden nach Blocker, fachlichem Fehler und UX-Verbesserung getrennt.
- Fehlerbehebungen erfolgen jeweils in kleinen eigenen Commits.

### NOW-2: Marktlücke und primäre Nutzungssituation validieren

Festgelegt ist:

- Primäre Zielgruppe sind Mitarbeitende in Marketing, Dokumentation, Zulassung, Übersetzung und vergleichbaren inhaltserstellenden oder -prüfenden Bereichen.
- Sie wenden Terminologie an, ohne selbst die Terminologiedatenbank verwalten zu müssen.
- Der gemeinsame Kernbedarf ist die schnelle Prüfung von Begriffen und Texten vor Veröffentlichung, Freigabe oder Übersetzung.
- Der Inspector ist deshalb ein Kandidat für den wichtigsten regelmäßigen Einstieg; Wiki und Translator ergänzen den Ablauf.
- flashterm stage wird zunächst bewusst als eigenständige Webanwendung geöffnet.
- Einbettungen in vorhandene Arbeitswerkzeuge sind eine spätere Ausbaustufe und keine Voraussetzung für den Pilot.

Mit realen Nutzerinnen und Nutzern zu validieren:

- Beginnt die häufigste Aufgabe mit einem einzelnen Begriff oder mit einem vorhandenen Text?
- Welche Informationen benötigen gelegentliche Nutzerinnen unmittelbar, welche erst bei einer Vertiefung?
- Unterscheiden sich Zulassung, Dokumentation, Marketing und Übersetzung so stark, dass angepasste Einstiege erforderlich werden?
- Welches wichtige Problem bleibt trotz vorhandener Terminologieportale, Textprüfungen und Integrationen ungelöst?
- Liegt der stärkste Mehrwert bei Zugang, Erklärbarkeit, Textprüfung, Nachweis oder quellenübergreifender Nutzung?

Abnahmekriterium:

- Die gemeinsame Kernaufgabe ist mit Vertreterinnen mehrerer Bereiche praktisch geprüft.
- Die Markthypothese aus `docs/market-hypothesis.md` wurde anhand konkreter vergangener Arbeitsabläufe geprüft.
- Inspector als möglicher Haupteinstieg ist bestätigt oder anhand konkreter Beobachtungen verworfen.
- Bereichsspezifische Anforderungen werden vom gemeinsamen Produktkern getrennt dokumentiert.

### NOW-3: Bekannte fachliche Randfälle einzeln entscheiden

Kandidaten:

- historische Links-Verfügbarkeit im Wiki,
- Sprachumschaltung bei Locales mit identischem Zweizeichenpräfix,
- sichtbarer Zustand bei fehlgeschlagenem Login,
- Verhalten bei ungültigen Source- und Target-Codes,
- Suchfeldinhalt nach Auswahl einer Suggestion.

Abnahmekriterium:

- Für jeden Fall wird zuerst das Ist-Verhalten bestätigt.
- Gewünschte Änderungen werden als bewusste Bugfixes mit Tests und Baseline-Anpassung umgesetzt.
- Kein Arbeitspaket verbindet mehrere unabhängige Verhaltensänderungen.

### NOW-4: Produktbezeichnung vereinheitlichen

Umfang:

- Manual und weitere nutzernahe Texte auf **flashterm stage** prüfen,
- Leitsatz und Bühnenmetapher dort einsetzen, wo sie Orientierung schaffen,
- technische Bezeichnungen gegenüber Nutzenden vermeiden.

Abnahmekriterium:

- Produktname und Nutzenversprechen sind in Oberfläche und Dokumentation konsistent.

## Als Nächstes: Sichere, quellenneutrale Integrationsgrenze

Ziel: Der Browser arbeitet ausschließlich mit einer stabilen flashterm-API und kennt weder FileMaker-Zugangsdaten noch FileMaker-Session-Tokens.

### NEXT-1: Fachlichen API-Vertrag spezifizieren

Minimaler Lesevertrag:

- Sprachen abrufen,
- Termini je Sprache abrufen,
- Concept mit mehrsprachigen Inhalten abrufen,
- quellenneutrale Fehlerantworten liefern.

Zu definieren:

- Request- und Response-Modelle,
- Pflicht- und optionale Felder,
- Semantik für leere Daten und nicht vorhandene Concepts,
- Fehlercodes und Wiederholbarkeit,
- Versionierung,
- Caching-Verantwortung,
- Authentifizierung der stage-Anwendung gegenüber dem Gateway.

Abnahmekriterium:

- Der Vertrag enthält keine Begriffe wie `fieldData`, FileMaker-Layout, `_find` oder FileMaker-Token.
- Vorhandene Domain-Fixtures lassen sich als Vertragsbeispiele verwenden.

### NEXT-2: Serverseitiges Integrations-Gateway einführen

Aufgabe:

- Statische Anwendung und `/api/...` same-origin bereitstellen,
- Zugangsdaten und Quellsystem-Sessions serverseitig verwalten,
- ausschließlich normalisierte Daten an den Browser liefern,
- sensible Payloads und Tokens nicht protokollieren.

Abnahmekriterium:

- Im ausgelieferten Browser-`config.js` befinden sich keine Zugangsdaten.
- Im Browser-Storage befinden sich keine FileMaker-Tokens.
- Der Browser importiert keine FileMaker-API-Funktionen mehr.
- Lokale Entwicklung und spätere Produktion verwenden denselben fachlichen API-Pfad.

### NEXT-3: FileMaker als Referenzadapter kapseln

Aufgabe:

- bestehende Layouts und Queries hinter dem Gateway binden,
- vorhandene Mapper weiterverwenden beziehungsweise sauber der Adaptergrenze zuordnen,
- Contract-Tests für Language, Term und Concept ergänzen,
- Login, Sessionerneuerung, Logout und Fehlerabbildung testen.

Abnahmekriterium:

- FileMaker-spezifische Begriffe existieren nur im Adapter und seiner Konfiguration.
- flashterm stage funktioniert gegen den Adapter ohne FileMaker-Wissen im Browsercode.

### NEXT-4: Betrieb dokumentieren

Zu dokumentieren:

- benötigte Umgebungsvariablen,
- lokale Entwicklung,
- produktiver Reverse Proxy beziehungsweise Hostingpfad,
- TLS- und CORS-Anforderungen,
- Secret-Verwaltung,
- Healthcheck und sichere Diagnose.

## Später: Quellenunabhängigkeit beweisen und Reichweite erhöhen

### LATER-1: Zweite Terminologiequelle anbinden

Nicht sofort mehrere Integrationen beginnen. Zunächst genau eine zweite realistische Quelle oder einen Austauschstandard auswählen. Mögliche Kandidaten werden erst anhand konkreter Nutzeranforderungen bewertet.

Als konkrete Explorationsidee ist ein lokaler TBX-Viewer dokumentiert. Er könnte TBX-Dateien ohne automatische Serverübertragung über die bestehende Oberfläche nutzbar machen und später eine kontrollierte Grundlage für AI-gestützte Erklärungen, Textprüfung und Qualitätsanalyse bilden. Das Konzept, seine Leitplanken und offenen Validierungsfragen stehen in [`docs/tbx-viewer-ai-concept.md`](tbx-viewer-ai-concept.md).

Abnahmekriterium:

- Dieselbe stage-Oberfläche läuft ohne Sonderlogik gegen zwei unterschiedliche Quellen.
- Erforderliche Vertragserweiterungen bleiben fachlich und quellenneutral.

### LATER-2: Terminologie näher an Arbeitswerkzeuge bringen

Mögliche Produktpfade:

- dauerhaft teilbare Concept-Links,
- gezieltes Kopieren von Vorzugsbenennungen mit Sprachangabe,
- Aufruf aus Redaktions- oder Übersetzungswerkzeugen,
- Einbettung einzelner stage-Funktionen,
- standardisierte Prüf- und Exportabläufe.

Diese Funktionen werden erst priorisiert, wenn primäre Zielgruppe und Arbeitsumgebung bestätigt sind.

Voraussetzung ist außerdem, dass sich flashterm stage zuvor als eigenständiger Baustein bewährt und alle Integrationen denselben stabilen API-Vertrag verwenden können.

### LATER-3: Nutzungsqualität messbar machen

Mögliche, datenschutzfreundliche Produktkennzahlen:

- erfolgreiche Suchvorgänge gegenüber Suchen ohne Treffer,
- Nutzung der drei Modi,
- häufig benötigte Sprachpaare,
- Anzahl erkannter problematischer Benennungen,
- Nutzung von Exporten,
- Rückmeldungen zu fehlenden oder unklaren Daten.

Eine Messung wird nur mit klarer Zweckbindung, sparsamen Daten und transparenter Dokumentation eingeführt.

## Empfohlene unmittelbare Reihenfolge

1. Den begonnenen praktischen Smoke-Test mit Inspector, Translator, Export und responsiver Darstellung abschließen.
2. Gemeinsam primäre Zielgruppe und wichtigsten Arbeitsablauf festlegen.
3. Nur die dabei gefundenen Pilot-Blocker einzeln beheben.
4. Anschließend den quellenneutralen API-Vertrag dokumentieren.
5. Erst danach das serverseitige Gateway und den FileMaker-Referenzadapter implementieren.

## Strategischer Prüfstein

Vor jedem größeren Arbeitspaket wird gefragt:

> Bringt diese Änderung Terminologie für mehr Menschen verständlich, sicher und unabhängig vom Quellsystem dorthin, wo sie gebraucht wird?

Wenn die Antwort nicht klar positiv ist, wird das Arbeitspaket zurückgestellt oder enger zugeschnitten.
