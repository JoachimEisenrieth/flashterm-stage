# Centron-Release 20260911-review

Am 11. September 2026 installiert und aktiviert.

- Öffentliche Adresse: https://flashterm-stage.edok-online.de/
- Aktuell: `C:\Apps\flashterm-stage\releases\20260911-review\flashterm-stage`
- `current` zeigt als Junction auf dieses Release.
- Vorherige Junction: `C:\Apps\flashterm-stage\current-before-20260911-review`
- Vorheriges Release: `20260830-pilot4`
- Datensicherung: `D:\flashterm-stage\backups\flashterm-stage-data-20260911-191630.zip`
- Archiv-SHA256: `643119fca0827b0b1d079961be327df5bea7f893b6b62ce566c3aef8cd073bb9`

Enthält HTML-Fachinformationen, Unterstützung mehrerer Mastersprachen mit Standardsprache und die unabhängige Prüfsprache für Inspector/Translator. WIKI behält seine eigene Sprachkombination.

## Prüfung

- Lokal: 146 Tests bestanden, Syntaxprüfung und git diff --check erfolgreich.
- Windows: 145 bestanden, 0 fehlgeschlagen, 1 ausdrücklich Windows-bedingt übersprungen (Publisher über Verzeichnislink).
- Archivhash und sämtliche 115 Dateihashes vor Aktivierung geprüft.
- Dienst nach Aktivierung Running, lokale und öffentliche Health-Abfrage: status ok.
- Öffentlich ausgelieferte flashterm.js stimmt per SHA256 mit lokaler Fassung überein.
- Browser erreicht reguläre Auth0-Anmeldung; angemeldeter Funktionstest steht noch aus.
- Keine neue Datenveröffentlichung durchgeführt; bestehender Veröffentlichungsbestand erhalten.
- Temporärer VPN-Übertragungsserver beendet.

## Rückwechsel

STAGE-Dienst stoppen, Junction `current` unter einem freien Namen sichern, `current-before-20260911-review` in `current` umbenennen, Dienst starten und Health prüfen. Release-Verzeichnisse dabei erhalten. Datenrücksicherung für einen reinen Code-Rückwechsel nicht erforderlich.

## Beobachtete Abweichung vom Pilotprotokoll

Der Dienst läuft laut Win32_Service unter LocalSystem; das ältere Protokoll nennt NetworkService. Das bestehende Dienstkonto wurde bei diesem Release nicht geändert.

## Nachbesserung Infobox und Standardsprache

- Aktuell ist Release `20260911-review2`; vorherige Junction `current-before-20260911-review2` zeigt auf `20260911-review`.
- Neue Datenrevision `BACKSTAGE-20260911-HTML` für TEST-TERMBASE aktiviert: 7 Sprachen, 53 Concepts, 230 Termini, 26 Bilder. Enthält aktuelle HTML-Fachinformationen statt des alten Markdown-Snapshots.
- Infobox Holunderpilz im angemeldeten Browser als echte Tabelle verifiziert.
- API-Sprachantwort um isDefaultSource ergänzt; vorher fehlte dieser Marker bei mehreren Mastersprachen und verursachte einen eingeschränkten Start. Sprachcache auf Version 5 angehoben.
- 147 lokale Tests erfolgreich, einschließlich neuem HTTP-Regressionstest für mehrere Mastersprachen.
- Sicherung vor Korrektur: `D:\flashterm-stage\backups\flashterm-stage-data-20260911-192740.zip`.
- Korrektur-Release vollständig per Manifest geprüft; Dienst läuft, öffentliche Health-Abfrage OK.
