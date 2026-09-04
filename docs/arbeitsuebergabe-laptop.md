# Arbeitsübergabe für die Weiterarbeit am Laptop

Stand: 4. September 2026

## Zweck

Dieses Dokument ist der Einstiegspunkt, wenn die Arbeit an flashterm stage auf einem anderen Rechner fortgesetzt wird. Es hält den aktuellen technischen und fachlichen Zusammenhang fest, verweist für Details auf die maßgeblichen Dokumente und trennt dauerhafte Architektur vom lokalen Arbeitsstand dieses Datums.

Die Dokumentation im Repository ist die übertragbare Wissensbasis. Gesprächskontext eines einzelnen Arbeitsrechners sollte für spätere Entscheidungen nicht vorausgesetzt werden.

## Geprüfter Ausgangsstand

Der lokale Repository-Stand wurde am 4. September 2026 wie folgt geprüft:

```text
Branch: main
Lokaler HEAD: 7e202ae Improve Inspector and Translator text analysis
Remote geprüft: origin/main bei 19c1bf7
Abweichung: main ist zwei Commits voraus
Automatisierte Tests: 151/151 erfolgreich
JavaScript-Syntax: erfolgreich geprüft
git diff --check: ohne Befund
Lokaler Entwicklungsserver: Start und HTTP-Antwort erfolgreich geprüft
Lokale config.js: vorhanden und durch Git ignoriert
```

Der angegebene Remote-Stand wurde am dokumentierten Datum direkt gegen `origin` geprüft. Vor dem späteren Push sollte er erneut mit `git fetch origin` aktualisiert werden.

Darüber hinaus existiert ein umfangreicher, noch nicht commiteter Arbeitsstand. Ein neues `git clone` auf dem MacBook enthält weder die zwei lokalen Commits noch diese uncommitteten Änderungen, solange sie nicht auf einen Remote-Branch übertragen wurden. Der Schwerpunkt des uncommitteten Stands ist:

- der explizite Zugriffsmodus `trusted-intranet`,
- instanzspezifische Windows-Dateien für Internet- und Intranetprofile,
- ein manifestiertes Windows-Kundenpaket mit privater Node.js-Laufzeit und WinSW,
- ein Installer mit getrenntem Preflight und ausdrücklichem Apply,
- die Vorgabe, eine vorhandene FileMaker-Server-Installation, deren interne Node.js-Laufzeit, `FMWebSite` und bestehende Bindings nicht zu verändern,
- zugehörige Tests und Betriebsdokumentation,
- neue Produktnotizen zu Terminologie, Fachwissen, TBX und Wünschen aus Dresden.

## Vor dem Rechnerwechsel: vollständigen Stand übertragen

Der geprüfte Code ist technisch bereit für die Übertragung, aber noch nicht vollständig in Git gesichert. Vor dem Rechnerwechsel sollte der gesamte beabsichtigte Stand nach bewusster Prüfung auf einen eigenen Arbeitsbranch committed und gepusht werden. Das geschieht nicht automatisch. Ein möglicher Ablauf auf dem bisherigen Rechner ist:

```text
git status --short --branch
git diff --check
git fetch origin
git status --short --branch
git switch -c codex/macbook-uebergabe-2026-09
git add -A
git status --short
git diff --cached --check
git diff --cached
git commit -m "Add trusted intranet customer installer"
git push -u origin codex/macbook-uebergabe-2026-09
```

Vor dem Commit muss die angezeigte Dateiliste geprüft werden. Insbesondere dürfen `config.js`, `.stage-data`, `deploy/windows/service.env`, `deploy/windows/installer/customer-settings.json`, generierte Pakete, Tokens und Zugangsdaten nicht enthalten sein. Diese Pfade sind ignoriert; die Sichtprüfung bleibt trotzdem Pflicht.

Auf dem Laptop kann der übertragene Branch anschließend so bezogen werden:

```text
git clone https://github.com/JoachimEisenrieth/flashterm-stage.git
cd flashterm-stage
git fetch origin
git switch --track origin/codex/macbook-uebergabe-2026-09
git status --short --branch
npm test
```

Falls das Repository schon vorhanden ist, entfallen `git clone` und `cd`. Lokale, noch nicht gesicherte Änderungen auf dem Laptop müssen vor dem Branchwechsel separat behandelt werden.

## Was getrennt und sicher übertragen werden muss

Git überträgt absichtlich nicht alles, was für jeden Entwicklungsweg gebraucht wird:

| Lokaler Inhalt | Benötigt für | Vorgehen |
|---|---|---|
| `config.js` | FileMaker-Referenzmodus | Aus `config.example.js` neu erstellen oder verschlüsselt übertragen; niemals committen oder in Chats kopieren |
| `.stage-data/` | Fortsetzung mit einem konkreten lokalen Publication-Stand | Bei Bedarf verschlüsselt sichern; für normale Entwicklung besser aus Fixture oder Publisher neu aufbauen |
| Publish- und OIDC-Secrets | echte Veröffentlichungen oder produktionsnahe Anmeldung | Aus dem vorgesehenen Passwort- beziehungsweise Secret-Speicher beziehen; nicht in Projektdateien ablegen |
| freigegebene `node.exe`- und WinSW-Dateien samt SHA-256 | Erzeugen eines Windows-Kundenpakets | Aus der geprüften Bezugsquelle oder einem kontrollierten Artefaktspeicher beziehen |

Für reine Arbeit an UI, Domain-Modell und automatisierten Tests sind keine realen Zugangsdaten erforderlich.

## Laptop in der ersten Stunde einrichten

1. Git installieren beziehungsweise über die macOS Command Line Tools bereitstellen und mit `git --version` prüfen.
2. Node.js 20 oder neuer installieren. Bei Verwendung von `nvm` im Repository `nvm install` und `nvm use` ausführen; `.nvmrc` wählt die auf diesem Stand geprüfte Node-Hauptversion 24.
3. Den Arbeitsbranch beziehen und mit `git status --short --branch` kontrollieren.
4. Kein `npm install` ausführen: Das Projekt besitzt derzeit keine externen npm-Abhängigkeiten.
5. `npm test` ausführen. Am dokumentierten Stand bestehen `151/151` Tests. Tests für Dev-Server und Stage-API öffnen temporäre Loopback-Ports; eine eingeschränkte Umgebung muss dies erlauben.
6. Für den gewünschten Betriebsweg entweder den FileMaker-Referenzmodus oder den veröffentlichten Stage-Modus starten.
7. Vor der ersten Änderung die betroffenen Dateien, ihre Imports und die passende bestehende Dokumentation lesen.

## Zwei lokale Betriebswege

### 1. FileMaker-Referenzmodus

Dieser Weg dient der lokalen Entwicklung gegen die vorhandene FileMaker Data API. Er benötigt die ignorierte lokale `config.js` und Netzwerkzugriff auf den konfigurierten FileMaker-Server.

```text
npm run dev
```

Danach ist die Anwendung standardmäßig unter `http://127.0.0.1:8000/` erreichbar. Der lokale Server liefert die statischen Dateien und leitet `/fmi/` sowie `/public/RC_Data_FMS/` an FileMaker weiter. Es gibt kein Live Reload.

Vollständige Anleitung: [`development-environment.md`](development-environment.md)

### 2. Veröffentlichter Stage-Modus

Dieser Weg bildet die gewünschte Produktgrenze ab. Der Browser liest ausschließlich normalisierte, veröffentlichte Daten vom same-origin Stage-Server und kennt keine FileMaker-Zugangsdaten oder FileMaker-Session-Tokens.

```text
FLASHTERM_STAGE_TENANT=TEST-TENANT \
FLASHTERM_PUBLISH_TOKEN=LOCAL_DEVELOPMENT_ONLY \
npm run stage
```

Danach ist der Server standardmäßig unter `http://127.0.0.1:8100/` erreichbar; der Healthcheck liegt unter `/api/health`. Ohne abweichende Angabe werden Daten in der ignorierten `.stage-data/` gespeichert. Das anonymisierte Fixture kann veröffentlicht und anschließend ausdrücklich aktiviert werden.

Vollständige Anleitung: [`stage-server-development.md`](stage-server-development.md)

## Architektur in einem Bild

```text
FileMaker / flashterm backstage
        |
        | Publisher: lesen, normalisieren, validieren
        v
unveränderliche Publication + Assets
        |
        | separat aktivieren
        v
Stage-Server + Publication Store
        |
        | same-origin API, Authentifizierung und Berechtigungen
        v
Browser: Wiki, Inspector, Translator und Export
```

Der direkte Browserzugriff auf FileMaker bleibt ein lokaler Referenz- und Rückfallpfad. Der Windows-Pilot verwendet bereits die getrennte Veröffentlichungsarchitektur.

## Code-Landkarte

| Bereich | Zentrale Dateien | Verantwortung |
|---|---|---|
| Browseroberfläche | `index.html`, `flashterm.html`, `flashterm.css`, `flashterm.js` | Modi, Interaktion, Darstellung und Orchestrierung |
| Browser-Anwendungskern | `src/app/` | Datenquellenauswahl, Bootstrap, View-Model, Sprachen, Caches und Exporte |
| Fachmodell | `src/domain/` | normalisierte Terminologie, Publication-Vertrag und Asset-Regeln |
| Datenquellen | `src/repositories/` | gemeinsamer UI-Vertrag für FileMaker und veröffentlichte Daten |
| FileMaker-Grenze | `filemaker-api.js`, `src/infrastructure/`, `src/publishing/filemaker-data-api-client.js` | Data-API-Zugriff und Normalisierung von FileMaker-Rohdaten |
| Veröffentlichung | `scripts/publish-backstage.js`, `src/publishing/` | Snapshot bauen, prüfen, Assets übertragen und optional aktivieren |
| Stage-Server | `scripts/stage-server.js`, `src/server/` | statische App, API, Speicher, Sitzungen, OIDC und Zugriffskontrolle |
| Windows-Betrieb | `deploy/windows/`, `src/deployment/`, `scripts/create-windows-*.js` | Dienst, IIS-Dateien, Instanzvorlagen, Kundenpaket und Installer |
| Tests | `tests/unit/`, `tests/fixtures/` | ausführbare Verträge und anonymisierte Beispieldaten |

Wichtig ist die Abhängigkeitsrichtung: Die Oberfläche arbeitet gegen den quellenneutralen Repository-Vertrag. FileMaker-Begriffe wie Layouts und `fieldData` sollen an der Adapter- und Publishing-Grenze bleiben. Der Publication-Vertrag in `src/domain/terminology-publication.js` ist die zentrale fachliche Schnittstelle.

## Aktueller Arbeitsstand und nächste sinnvolle Schritte

Der neue Kundeninstaller ist ein automatisiert getesteter Kandidat, aber noch nicht unabhängig auf einem geeigneten Windows-Testsystem praktisch abgenommen. Die unmittelbare Reihenfolge ist:

1. Den lokalen Arbeitsstand sicher auf einen Branch übertragen.
2. Das Windows-Kundenpaket mit freigegebenen Node.js- und WinSW-Binärdateien erzeugen und Manifest sowie Hashes prüfen.
3. Den Installer zuerst ohne `-Apply` als Preflight auf einem getrennten Windows-Testsystem mit vorhandener FileMaker-Server-Installation ausführen.
4. Nach erfolgreichem Preflight mit `-Apply` installieren und nachweisen, dass FileMaker, `FMWebSite`, bestehende Bindings und FileMaker-Prozesse unverändert funktionieren.
5. `trusted-intranet` nur hinter einer tatsächlich bestätigten privaten Netzgrenze abnehmen; interner DNS oder ein unbekannter Link allein sind keine Zugriffskontrolle.
6. Backup und Restore des Stage-Datenverzeichnisses in einer getrennten Wiederherstellungsumgebung praktisch prüfen.
7. Den noch offenen Browser-Smoke-Test aus der Characterization Baseline vollständig durchführen.

Die Details des Installer-Kandidaten stehen in [`windows-customer-installer.md`](windows-customer-installer.md). Der bereits verifizierte Internetpilot ist in [`windows-pilot-2026-08-30.md`](windows-pilot-2026-08-30.md) festgehalten.

## Fachliche Prioritäten und offene Entscheidungen

Die Anwendung besitzt bereits Wiki, Inspector, Translator sowie Excel-, CSV- und JSON-Export. Der Inspector ist ein Kandidat für den wichtigsten regelmäßigen Einstieg, muss aber noch mit echten Nutzerinnen und Nutzern validiert werden.

Als neue Wünsche sind dokumentiert:

- sichtbare Sprachumschaltung in der Oberfläche,
- Geltungsbereich und Perspektive anzeigen,
- eine danach filterbare Liste der Vorzugsbenennungen,
- kontrollierter Sammelimport vorbereiteter Übersetzungen.

Diese Punkte sind Backlog und noch keine beauftragten Funktionsänderungen. Insbesondere Geltungsbereich, Perspektive und Filterliste benötigen zuerst eine Prüfung des vorhandenen Datenmodells und des Publication-Vertrags. Maßgeblich ist [`product-roadmap.md`](product-roadmap.md).

Die TBX-/AI-Idee ist ebenfalls explorativ. Der sinnvolle erste Prüfstein ist ein lokaler TBX-Viewer; automatische Datenübertragung oder ungeprüfte AI-Änderungen an führender Terminologie gehören ausdrücklich nicht zum ersten Schritt. Siehe [`tbx-viewer-ai-concept.md`](tbx-viewer-ai-concept.md).

## Sicherheits- und Änderungsleitplanken

- Bestehendes Verhalten nur auf ausdrücklichen Auftrag ändern.
- Kleine, nachvollziehbare Änderungen statt großer Refactorings vornehmen.
- `config.js` niemals überschreiben, committen oder mit echten Werten dokumentieren.
- Keine Secrets, Tokens, Passwörter, vollständigen Zugangsdaten oder vollständigen FileMaker-Antworten ausgeben oder protokollieren.
- Keine Frameworks, Build-Systeme oder Paketmanager-Abhängigkeiten ohne ausdrücklichen Auftrag einführen.
- Dateinamen und URL-Pfade wegen möglicher Deployment-Abhängigkeiten beibehalten.
- `json/languages.json` und `json/translations.json` als strukturell gültiges JSON erhalten.
- Publication-Daten unveränderlich behandeln; Sichtbarkeit entsteht durch eine separate Aktivierung, Rollback durch eine neue Aktivierung einer älteren Publication.
- Pro Stage-Datenverzeichnis nur einen schreibenden Serverprozess betreiben.
- `trusted-intranet` niemals als öffentlich erreichbares Profil verwenden.

## Arbeitsroutine nach jeder Änderung

```text
npm test
find . -type f -name '*.js' -not -path './.git/*' -not -name 'config.js' -print0 | xargs -0 -n1 node --check
git diff --check
git status --short
git diff
```

Bei sichtbaren Änderungen zusätzlich den betroffenen Ablauf im Browser anhand von [`characterization-baseline.md`](characterization-baseline.md) prüfen. Änderungen nur auf ausdrücklichen Auftrag committen oder pushen.

## Dokumentationswegweiser

| Frage | Dokument |
|---|---|
| Wie starte ich lokal gegen FileMaker? | [`development-environment.md`](development-environment.md) |
| Wie startet und initialisiert sich die Browseranwendung? | [`startup-processes.md`](startup-processes.md) |
| Welches Verhalten darf nicht versehentlich verändert werden? | [`characterization-baseline.md`](characterization-baseline.md) |
| Wie läuft der lokale Stage-Server? | [`stage-server-development.md`](stage-server-development.md) |
| Wie funktioniert die Publication-Architektur? | [`stage-publication-architecture.md`](stage-publication-architecture.md) |
| Wie veröffentlicht Backstage? | [`backstage-publication.md`](backstage-publication.md) |
| Wie wird Windows betrieben? | [`windows-server-deployment.md`](windows-server-deployment.md) |
| Was wurde im Internetpilot praktisch bestätigt? | [`windows-pilot-2026-08-30.md`](windows-pilot-2026-08-30.md) |
| Wie unterscheiden sich Internet und Intranet? | [`internet-intranet-profiles.md`](internet-intranet-profiles.md) |
| Wie ist der Kundeninstaller vorgesehen? | [`windows-customer-installer.md`](windows-customer-installer.md) |
| Was ist als Nächstes wichtig? | [`product-roadmap.md`](product-roadmap.md) |
| Welche Produktidee wird verfolgt? | [`product-strategy.md`](product-strategy.md) |
| Welche Marktannahmen müssen geprüft werden? | [`market-hypothesis.md`](market-hypothesis.md) |

## Wiedereinstieg nach den drei Wochen

Beim Wiedereinstieg zuerst `git status`, Branch, letzten Commit und `npm test` prüfen. Danach die Roadmap und dieses Dokument gegen neue Commits aktualisieren. Die beiden wichtigsten offenen Fragen sind derzeit nicht technisch, sondern betrieblich und fachlich: Besteht der Kundeninstaller die unabhängige Windows-Abnahme neben FileMaker Server, und welcher reale Nutzerablauf soll nach dem Pilot als Erstes optimiert werden?
