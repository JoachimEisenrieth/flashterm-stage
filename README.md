# flashterm stage

flashterm stage ist die lesende Webanwendung für veröffentlichte Terminologie. Das Repository enthält die Browseroberfläche, den lokalen FileMaker-Referenzmodus, den eigenständigen Stage-Server, den Backstage-Publisher und die Windows-Betriebswerkzeuge.

## Einstieg

- Austausch der bestehenden Kunden-STAGE: [Ablauf und Rückweg](docs/ionos-customer-replacement-plan-2026-09-24.md), [Fragebogen und Erfassungsscript](docs/customer-installation-questionnaire.md)
- Bisheriger IONOS-Prüfstand und BACKSTAGE-Abhängigkeiten: [`docs/customer-installation-2026-10.md`](docs/customer-installation-2026-10.md)
- Für die Weiterarbeit auf einem anderen Rechner: [`docs/arbeitsuebergabe-laptop.md`](docs/arbeitsuebergabe-laptop.md)
- Lokale Entwicklungsumgebung: [`docs/development-environment.md`](docs/development-environment.md)
- Stage-Server und lokale Testveröffentlichung: [`docs/stage-server-development.md`](docs/stage-server-development.md)
- Architektur der veröffentlichten Daten: [`docs/stage-publication-architecture.md`](docs/stage-publication-architecture.md)
- Aktueller Produktstand und Prioritäten: [`docs/product-roadmap.md`](docs/product-roadmap.md)
- Bestehendes Verhalten und Smoke-Test-Matrix: [`docs/characterization-baseline.md`](docs/characterization-baseline.md)

## Häufige Befehle

```text
npm run dev
npm run stage
npm run publish:backstage -- --dry-run
npm test
```

Das Projekt verwendet Node.js 20 oder neuer, ES-Module und ausschließlich Node.js-Standardmodule. Für `nvm` ist die auf diesem Stand geprüfte Node-Hauptversion in `.nvmrc` hinterlegt; `nvm install && nvm use` richtet sie ein. Es gibt keinen Build-Schritt und derzeit keine zu installierenden npm-Abhängigkeiten.

`config.js`, `.stage-data`, lokale Umgebungsdateien und reale Zugangsdaten gehören nicht ins Repository.
