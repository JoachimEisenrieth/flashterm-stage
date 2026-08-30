# Architekturentscheidung: veröffentlichte Terminologie für flashterm stage

Stand: 30. August 2026
Status: beschlossen, schrittweise Umsetzung

## Entscheidung

flashterm backstage bleibt das redaktionelle System. Dort wird Terminologie erstellt, geprüft und fachlich freigegeben. Eine bewusste Veröffentlichung überträgt einen unveränderlichen, versionierten Terminologiestand an einen getrennt betreibbaren Stage-Server.

flashterm stage liefert ausschließlich veröffentlichte Daten aus seinem eigenen Speicher aus. Im normalen Lese- und Suchbetrieb besitzt stage keine aktive FileMaker-Abhängigkeit. Angemeldete Personen greifen nicht auf FileMaker Server zu und erhalten weder FileMaker-Zugangsdaten noch FileMaker-Session-Tokens.

```text
FileMaker / flashterm backstage
        |
        | veröffentlichen
        v
Stage-Server: prüfen, speichern, aktivieren
        |
        | veröffentlichte Terminologie
        v
flashterm stage: Wiki, Inspector, Translator und Export
```

## Ziele

- Mehrere flashterm-backstage-Dateien als getrennte Termbasen verwalten.
- Den veröffentlichten Stand einer Termbase eindeutig und reproduzierbar machen.
- Personen unabhängig von FileMaker an stage anmelden und autorisieren.
- FileMaker-Ausfälle vom lesenden Produktbetrieb entkoppeln.
- Zugangsdaten, Quellsystem-Tokens und interne FileMaker-Namen vom Browser fernhalten.
- Eine spätere zweite Terminologiequelle ohne Änderung des fachlichen UI-Vertrags ermöglichen.

## Systemgrenzen

### flashterm backstage

- Terminologie bearbeiten, prüfen und freigeben.
- Eine Veröffentlichung mit eindeutiger Revision erzeugen.
- Nur freigegebene Inhalte und zugehörige Assets übertragen.
- Keine Personen- oder Stage-Sitzungen verwalten.

### Veröffentlichungsweg

- Eine technische Identität authentifiziert den veröffentlichenden Prozess.
- Die Übertragung erfolgt ausschließlich verschlüsselt.
- Jede Veröffentlichung wird vollständig validiert, bevor sie aktiv werden kann.
- Eine Wiederholung derselben Veröffentlichungs-ID ist idempotent.
- Eine unvollständige oder ungültige Veröffentlichung ersetzt niemals den aktiven Stand.

### Stage-Server

- Personen über einen OpenID-Connect-Anbieter anmelden.
- Berechtigungen nach Organisation, Gruppe und Termbase prüfen.
- Veröffentlichungen unveränderlich speichern und genau eine Revision je Termbase aktiv schalten.
- Einen vorherigen Stand bei Bedarf wieder aktivieren können.
- Der Browseranwendung ausschließlich normalisierte Fachdaten und Stage-Assets liefern.

### Browseranwendung

- Kennt nur öffentliche Termbase-IDs, niemals FileMaker-Dateinamen.
- Verwendet ausschließlich die Stage-API am eigenen Origin.
- Speichert keine FileMaker-Zugangsdaten oder FileMaker-Tokens.
- Verwendet für alle Datenquellen denselben Repository-Vertrag: Sprachen, Termini und Concepts.

## Verwaltung mehrerer Termbasen

Der Stage-Server führt ein Termbase-Verzeichnis. Ein Eintrag enthält mindestens:

- stabile `tenantId`,
- stabile `termbaseId`,
- sichtbaren Namen,
- erlaubte Identitätsgruppen,
- aktive Veröffentlichungs-ID,
- verfügbare Revisionen,
- Zeitpunkt und Ergebnis der letzten Veröffentlichung.

Quellsystemdetails gehören nicht in die öffentliche Antwort. Für eine zunächst getrennte Stage-Instanz je Kunde bleibt `tenantId` trotzdem Bestandteil des Vertrags. Dadurch muss das Datenmodell bei einer späteren kontrollierten Mandantenfähigkeit nicht neu geschnitten werden.

## Veröffentlichungsvertrag Version 1

Der erste Vertrag ist in `src/domain/terminology-publication.js` ausführbar definiert. Ein vollständiges anonymisiertes Beispiel liegt in `tests/fixtures/terminology-publication-v1.json`.

Die logische Veröffentlichung enthält:

- `schemaVersion`: Version des Vertrags,
- `publication`: Veröffentlichungs-ID, Organisation, Termbase, Revision und Zeitpunkt,
- `termbase`: Name, Mastersprache, lokalisierte Sprachnamen und Asset-Basispfad,
- `termsByLanguage`: Such- und Prüflisten im bestehenden normalisierten Termmodell,
- `concepts`: mehrsprachige Concept-Inhalte im bestehenden normalisierten Concept-Modell.

Der Vertrag enthält ausdrücklich keine Zugangsdaten, Tokens, FileMaker-Layouts oder proprietären FileMaker-Antworten. Eine Veröffentlichung kann für den ersten Pilot als ein Paket übertragen werden. Referenzierte Bilder werden anschließend einzeln zur noch inaktiven Publication übertragen. Der Stage-Server speichert die Binärdaten unter Inhalts-Hashes und bildet die ursprünglichen Dateinamen nur in einem geschützten Index ab. Dadurch werden weder Dateinamen als Serverpfade verwendet noch bestehende Assets überschrieben.

## Aktivierungsablauf

1. Backstage erzeugt eine neue Veröffentlichungs-ID und Revision.
2. Der Veröffentlichungsprozess überträgt Daten und Assets in einen noch nicht aktiven Bereich.
3. Der Stage-Server prüft Vertrag, Referenzen, Sprachen und Vollständigkeit.
4. Die neue Revision wird unveränderlich gespeichert.
5. Erst nach erfolgreicher Prüfung wird der aktive Zeiger atomar umgeschaltet.
6. Der Browser erhält die aktive Publication-ID in seiner öffentlichen Laufzeitkonfiguration und trennt dadurch Sprach-Caches verschiedener Revisionen derselben Termbase.
7. Die vorherige Revision bleibt für Rollback und Nachvollziehbarkeit erhalten.

## Anmeldung und Berechtigungen

Die Personenanmeldung an stage und die technische Veröffentlichung sind zwei getrennte Sicherheitskontexte:

- Personen melden sich per OpenID Connect an.
- Gruppen oder Rollen werden serverseitig Termbase-IDs zugeordnet.
- Der Browser kann keine fremde `tenantId` oder `termbaseId` durch Ändern einer URL freischalten.
- Der veröffentlichende Prozess erhält nur das Recht, eine bestimmte Termbase zu aktualisieren.
- Administrative Aktionen und Veröffentlichungen werden ohne sensitive Payloads protokolliert.

## Lizenzielle Leitplanke

Die Architektur dient nicht dazu, FileMaker-Nutzende hinter einem Sammelkonto zu verbergen. Der reguläre Stage-Betrieb wird technisch von FileMaker getrennt; nur der klar abgegrenzte Veröffentlichungsprozess interagiert mit dem Quellsystem. Vor dem produktiven Angebot wird dieses konkrete Betriebsmodell für den jeweils geltenden Claris-Vertrag schriftlich bestätigt. Beim kommerziellen Hosting von FileMaker bleibt insbesondere die Lizenztrennung je Kunde zu beachten.

## Schrittweise Migration

### Schritt 1: Vertrag und paralleler Adapter

- Versionierten Veröffentlichungsvertrag definieren und testen.
- Published-Data-Repository mit demselben UI-Vertrag wie der FileMaker-Adapter bereitstellen.
- Bestehenden FileMaker-Produktivpfad noch nicht verändern.

### Schritt 2: Stage-API und Speicher

- Stage-Server ohne Browser-Secrets bereitstellen.
- Termbase-Verzeichnis, unveränderliche Revisionen und atomare Aktivierung implementieren.
- Leseendpunkte und authentifizierte Asset-Auslieferung ergänzen. **Umgesetzt.**

### Schritt 3: Personenanmeldung

- OpenID-Connect-Anmeldung integrieren. **Serverseitiger Code-Flow mit PKCE umgesetzt und im Windows-Pilot mit Auth0 betrieben.**
- Gruppen- und Termbase-Berechtigungen serverseitig durchsetzen. **Umgesetzt.**
- Getrennte Stage-Instanz je Pilotkunde betreiben. **Für den ersten Windows-Pilot umgesetzt.**

### Schritt 4: Backstage-Veröffentlichung

- FileMaker-Daten an der Adaptergrenze normalisieren. **Für die vorhandenen API-Layouts umgesetzt.**
- Gesicherten, wiederholbaren Publish-Ablauf einschließlich unveränderlicher Bildübertragung implementieren. **Mit Vorabvalidierung und expliziter Aktivierung umgesetzt.**
- Fehlschläge und Rollback praktisch testen. **Automatisiert und mit dem realen Windows-Pilotbestand umgesetzt.**

### Schritt 5: Browser umschalten

- Stage-Composition auf das Published-Data-Repository umstellen. **Lokal und im Windows-Pilot umgesetzt.**
- Direkten FileMaker-Login und FileMaker-Token aus dem Stage-Browserpfad entfernen. **Im Windows-Pilot umgesetzt.**
- Erst danach die nicht mehr benötigte Browserkonfiguration zurückbauen.

## Weiterhin außerhalb des ersten Piloten

- mehrere gleichzeitig schreibende Stage-Prozesse,
- hochverfügbare Sitzungen und gemeinsamer Netzwerkspeicher,
- gemeinsamer mandantenfähiger SaaS-Betrieb.

Der erste Pilot bestätigt den veröffentlichten Datenvertrag und den getrennten Browserpfad. Die verbleibenden Punkte werden erst nach der betrieblichen Auswertung dieses bewusst einzelnen Serverprozesses entschieden.
