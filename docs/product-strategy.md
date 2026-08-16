# Produktstrategie: flashterm stage

## Leitidee

**flashterm stage bringt Terminologie dorthin, wo sie gebraucht wird.**

Terminologie entsteht häufig in einem kleinen Kreis spezialisierter Fachleute. Ihr Nutzen entfaltet sich jedoch erst, wenn ein größerer Kreis sie im Arbeitsalltag finden, verstehen und sicher anwenden kann. flashterm stage bildet diese sichtbare Nutzungs- und Vermittlungsschicht.

Die Bühnenmetapher beschreibt zwei unterschiedliche Aufgaben:

- **backstage:** Terminologie erstellen, prüfen, freigeben und verwalten.
- **stage:** Terminologie auffindbar, verständlich und praktisch anwendbar machen.

flashterm stage soll langfristig nicht an ein bestimmtes Backstage-System gebunden sein. Das bestehende flashterm Backstage ist eine mögliche Terminologiequelle. Weitere Terminologieprogramme sollen über eine stabile API beziehungsweise passende Adapter angebunden werden können.

## Positionierung

flashterm stage ist kein weiteres Terminologieverwaltungssystem. Es ist die anwendungsnahe Oberfläche zwischen gepflegten Terminologiedaten und den Menschen, die diese Daten bei ihrer täglichen Arbeit benötigen.

Die zugrunde liegende Produkthypothese lautet: In der heutigen Terminologiearbeit besteht häufig eine Lücke zwischen der fachlichen Freigabe im Terminologiesystem und der tatsächlichen Anwendung durch einen größeren Kreis von Mitarbeitenden. flashterm stage besetzt diesen fehlenden Baustein.

> **Terminologiearbeit endet nicht mit der Freigabe. flashterm stage beginnt dort.**

Das Produkt unterstützt insbesondere:

- das schnelle Finden einer Benennung,
- das Verstehen eines mehrsprachigen Begriffs,
- die Einordnung bevorzugter, alternativer und abgelehnter Benennungen,
- die Prüfung vorhandener Texte auf hinterlegte Terminologie,
- die terminologiegestützte Gegenüberstellung von Ausgangs- und Zielbenennungen,
- die verständliche Weitergabe und technische Weiterverarbeitung von Ergebnissen.

## Zielgruppen

Die primäre Zielgruppe sind Mitarbeitende eines Unternehmens, die Terminologie in ihrer täglichen Arbeit anwenden, ohne selbst Teil der zentralen Terminologieredaktion sein zu müssen. Dazu gehören insbesondere:

- Marketing und Unternehmenskommunikation,
- technische und fachliche Dokumentation,
- Zulassung und andere regulierte Bereiche,
- Übersetzung und Lokalisierung,
- weitere Bereiche, die Inhalte erstellen, prüfen, freigeben oder weiterverwenden.

Diese Nutzerinnen und Nutzer benötigen keine Oberfläche zur Pflege komplexer Terminologiebestände. Sie benötigen schnellen Zugriff auf freigegebene Benennungen, verständliche Begriffsinformationen und eine verlässliche Prüfung ihrer Inhalte.

Terminologiefachleute bilden eine wichtige sekundäre Zielgruppe. Sie stellen backstage die Datenqualität sicher und profitieren davon, dass freigegebene Terminologie über stage einen größeren Anwenderkreis erreicht.

Der gemeinsame Kernablauf der primären Zielgruppe lautet:

> Ich möchte einen Begriff oder Text schnell prüfen, damit ich freigegebene Terminologie vor Veröffentlichung, Freigabe oder Übersetzung korrekt anwende.

Aus dieser Zielgruppe ergibt sich eine Produkthypothese: Der Inspector kann langfristig der wichtigste Einstieg in die regelmäßige Nutzung werden. Wiki bleibt die gezielte Wissensansicht; Translator erweitert den Ablauf für mehrsprachige Aufgaben. Diese Gewichtung wird zunächst mit realen Nutzerinnen und Nutzern validiert und nicht allein aus technischer Sicht festgelegt.

## Nutzungs- und Verbreitungsstrategie

flashterm stage startet als eigenständige Webanwendung, die Mitarbeitende bewusst öffnen. Dieser erste Produktzustand soll den fehlenden Vermittlungsbaustein in der bestehenden Terminologiearbeit unmittelbar nutzbar und organisatorisch sichtbar machen.

Für den Einstieg gelten deshalb folgende Prioritäten:

- ohne Kenntnis des Backstage-Systems verständlich sein,
- über einen klaren Zugang schnell erreichbar sein,
- Suche und Textprüfung ohne lange Einarbeitung ermöglichen,
- verlässliche, freigegebene Terminologie in den Mittelpunkt stellen,
- den Nutzen für verschiedene Unternehmensbereiche in einer gemeinsamen Oberfläche zeigen.

Eine spätere Integration in Word, Redaktionssysteme, Übersetzungswerkzeuge oder andere Arbeitsumgebungen bleibt ein mögliches Ausbauziel. Sie wird jedoch erst priorisiert, nachdem der eigenständige Produktnutzen bestätigt und die quellenneutrale API stabil ist. Integrationen sollen dieselben fachlichen Fähigkeiten von stage nutzen und keine voneinander abweichenden Einzellösungen bilden.

Als kurzer Leitsatz wird verwendet:

> **Terminologie, wo sie gebraucht wird.**

## Markenarchitektur

- **flashterm** ist die übergeordnete Marke.
- **flashterm stage** bezeichnet das Produkt für Suche, Vermittlung und Anwendung von Terminologie.
- **flashterm backstage** kann die redaktionelle Verwaltung bezeichnen, ist aber keine zwingende Voraussetzung für stage.
- Technische Integrationen und Datenquellen bleiben gegenüber den Nutzenden im Hintergrund.

Die Bezeichnung **stage** ist ein Produktname und keine Kennzeichnung für eine Testumgebung. Sie wird deshalb klein geschrieben und visuell als zurückhaltende Submarke geführt.

## Strategische Produktziele

### 1. Terminologie zugänglich machen

Menschen sollen relevante Terminologie ohne Kenntnis des zugrunde liegenden Terminologiesystems finden und verstehen können. Einstieg, Suche und Ergebnisse müssen selbsterklärend sein.

### 2. Sichere Anwendung ermöglichen

Der Status einer Benennung muss unmittelbar erkennbar sein. Vorzugsbenennungen, Alternativen und abgelehnte Benennungen dürfen nicht nur farblich unterschieden werden. Sprachbezug, Concept-Zusammenhang und fehlende Übersetzungen müssen eindeutig bleiben.

### 3. Terminologie in reale Arbeitsabläufe bringen

Wiki, Inspector und Translator bilden unterschiedliche Nutzungssituationen ab:

- **Wiki:** einen Begriff gezielt nachschlagen und fachlich verstehen,
- **Inspector:** Texte auf vorhandene Terminologie prüfen,
- **Translator:** gefundene Benennungen den Vorzugsbenennungen einer Zielsprache gegenüberstellen.

Exporte unterstützen sowohl die menschliche Auswertung als auch die maschinelle Weiterverarbeitung.

### 4. Datenquellen austauschbar machen

Der fachliche Kern von flashterm stage darf keine FileMaker-spezifischen Datenstrukturen voraussetzen. Terminologiequellen werden über einen stabilen internen Vertrag angebunden. FileMaker bleibt zunächst ein Adapter unter möglichen weiteren Adaptern.

Eine zukünftige öffentliche beziehungsweise dokumentierte API soll mindestens folgende fachliche Zugriffe ermöglichen:

- verfügbare Sprachen abrufen,
- Terminologie einer Sprache abrufen,
- mehrsprachige Concept-Daten abrufen,
- Fehler und fehlende Daten eindeutig und quellenunabhängig darstellen.

### 5. Vertrauen und Datenschutz sichern

Zugangsdaten und technische Tokens gehören nicht in die Browseranwendung oder in fachliche Exporte. Integrationen sollen langfristig so gestaltet werden, dass Authentifizierung und systemspezifische Details an einer sicheren Systemgrenze bleiben.

### 6. Einfach weiterentwickelbar bleiben

Die Modernisierung erfolgt evolutionär. Kleine, überprüfbare Änderungen haben Vorrang vor einem Rewrite. Neue Technik wird nur eingeführt, wenn sie einen nachweisbaren Produkt- oder Integrationsnutzen besitzt.

## Gestaltungsziele

flashterm stage soll fachliche Präzision mit einer warmen, wertigen und ruhigen Anmutung verbinden.

- Inhalte und Entscheidungen stehen vor Dekoration.
- Interaktive Zustände sind klar, aber nicht dominant.
- Farben besitzen eine Bedeutung und werden nicht allein als Informationsträger verwendet.
- Die Oberfläche bleibt auch bei umfangreichen Concept- und Prüfdaten übersichtlich.
- Fachsprache wird dort verwendet, wo sie Klarheit schafft; Bedienhinweise bleiben allgemein verständlich.
- Light und Dark Mode sowie schmale Ansichten gehören zum gleichen Produkterlebnis.

## Zielbild der Systemgrenze

```text
Terminologiesystem A ─┐
flashterm backstage ──┼─> Adapter / API ─> stabiles Concept- und Terminologiemodell ─> flashterm stage
Terminologiesystem B ─┘
```

Die Benutzeroberfläche kennt nur das stabile interne Modell. Layoutnamen, `fieldData`, proprietäre Response-Envelopes und Authentifizierungsdetails verbleiben in der jeweiligen Integration.

Caching, Darstellung und Exporte arbeiten auf normalisierten Daten und dürfen nicht von einem bestimmten Terminologieprogramm abhängig sein.

## Prioritäten der nächsten Entwicklungsphasen

### Phase 1: Produkt festigen

- bestehende Abläufe praktisch prüfen und stabilisieren,
- Wiki, Inspector und Translator konsistent und verständlich gestalten,
- Bewertungen, fehlende Daten und Sprachwechsel eindeutig darstellen,
- Exporte für menschliche und maschinelle Nutzung weiter absichern,
- Dokumentation und Produktbezeichnung vereinheitlichen.

### Phase 2: Integrationsvertrag definieren

- den bereits begonnenen quellenneutralen Domain-Vertrag vervollständigen,
- benötigte Leseoperationen und Fehlersemantik dokumentieren,
- FileMaker-spezifische Authentifizierung und Requests vollständig an der Infrastrukturgrenze halten,
- die bestehende FileMaker-Anbindung als Referenzadapter testen.

### Phase 3: Weitere Systeme anbinden

- genau einen zweiten, realistischen Datenlieferanten oder Austauschstandard auswählen,
- den API-Vertrag anhand dieser zweiten Integration validieren,
- Konfiguration und Betrieb verschiedener Adapter dokumentieren,
- erst danach eine allgemein nutzbare Integrationsschnittstelle veröffentlichen.

## Bewusste Nicht-Ziele

- flashterm stage ersetzt nicht die redaktionelle Terminologiearbeit.
- Das Produkt erzwingt kein bestimmtes Terminologieprogramm.
- Plugins und Einbettungen in Drittsysteme sind für den ersten eigenständigen Produktzustand kein Muss.
- Eine neue API soll keine FileMaker-Strukturen unter neutralen Namen nach außen reichen.
- Ein Frameworkwechsel oder vollständiger Rewrite ist kein eigenständiges Produktziel.
- Historisch gewachsenes Verhalten wird nicht ungeprüft zum dauerhaften fachlichen Vertrag erklärt.

## Entscheidungskriterien

Eine zukünftige Änderung unterstützt die Strategie, wenn sie mindestens eines dieser Ergebnisse verbessert, ohne ein höher priorisiertes Ziel zu schwächen:

1. Terminologie wird leichter gefunden oder verstanden.
2. Benennungen werden sicherer und konsistenter angewendet.
3. Mehr Menschen können Terminologie in ihrem Arbeitsablauf nutzen.
4. Eine weitere Datenquelle lässt sich mit weniger produktspezifischer Kopplung anbinden.
5. Betrieb, Datenschutz oder langfristige Wartbarkeit werden verlässlicher.

Diese Kriterien bilden den Maßstab für Produktentscheidungen, technische Architektur und die Reihenfolge zukünftiger Arbeitspakete.
