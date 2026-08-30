# Abnahmeprotokoll: Windows-Pilot vom 30. August 2026

## Ergebnis

flashterm stage ist unter der öffentlichen Adresse
`https://flashterm-stage.edok-online.de/` als einzelner Windows-Pilotserver in
Betrieb. Der Browserpfad verwendet ausschließlich die Stage-API und enthält
keine FileMaker-Zugangsdaten oder FileMaker-Sitzungstokens.

Abgenommener Stand:

| Merkmal | Wert |
|---|---|
| Release | `20260830-pilot4` |
| Windows | Windows Server 2019 Standard, Build 17763 |
| Node.js | 24.20.0 |
| Dienst | `flashterm-stage`, automatisch verzögert gestartet |
| Dienstkonto | `NT AUTHORITY\NetworkService` |
| Node-Bindung | `127.0.0.1:8100` |
| lokaler IIS-Pilotzugang | `127.0.0.1:8180` |
| öffentlicher Host | `flashterm-stage.edok-online.de` |
| Personenanmeldung | Auth0 über OpenID Connect |
| Pilotrolle | `flashterm-stage-reader` |
| aktive Publication | `BACKSTAGE-20260830T083951Z` |
| sichtbarer Name | `Demo-Terminologie` |
| Daten-Rollback | `TEST-PUBLICATION-001` |
| Code-Rollback | `20260830-pilot3` |

## Datenbestand

Der Publisher hat den freigegebenen Snapshot aus der FileMaker-Datei
`flashterm-fungi` über die vorhandenen lesenden Data-API-Layouts geladen. Das
FileMaker-Passwort wurde nur für den einmaligen Publisher-Prozess verwendet und
danach aus Zwischenablage und Prozessumgebung entfernt.

Der aktive Stand enthält:

- 7 Sprachen,
- 52 Concepts,
- 238 Termini,
- 118 Bildreferenzen,
- 26 einmalig gespeicherte Bilddateien,
- 1.717.729 Bytes Bilddaten.

Die 26 Bilder bestehen aus 13 JPEG-, 10 PNG- und 3 GIF-Dateien. Sie wurden vor
der Aktivierung vollständig übertragen und nach Inhalt gehasht gespeichert.
Originaldateinamen werden nicht als Serverpfade verwendet. Ein erneuter Upload
desselben Dateinamens ist nur mit identischem Inhalt zulässig.

## Server- und IIS-Grenzen

Der Node-Prozess ist ausschließlich über Loopback erreichbar. IIS übernimmt die
öffentlichen HTTP-/HTTPS-Bindings und leitet den Stage-Host über ARR und URL
Rewrite an den lokalen Prozess weiter. Die vorhandene FileMaker-Site
`FMWebSite` blieb während Einrichtung und Abnahme gestartet und wurde nicht
verändert.

Wesentliche Pfade:

```text
C:\Apps\flashterm-stage\current
C:\Apps\flashterm-stage\releases\20260830-pilot4\flashterm-stage
C:\ProgramData\flashterm-stage\service.env
C:\ProgramData\flashterm-stage\logs
D:\flashterm-stage\data
D:\flashterm-stage\iis-proxy
```

`service.env` ist nur für Administratoren, `SYSTEM` und den notwendigen
Lesezugriff des Dienstkontos freigegeben. Reale Werte aus dieser Datei gehören
nicht in Repository, Tickets oder Protokolle.

## TLS und Zertifikatserneuerung

Der öffentliche Host verwendet ein eigenes Let's-Encrypt-Zertifikat für
`flashterm-stage.edok-online.de`. Bei der Abnahme war das Zertifikat bis
27. November 2026 gültig; der zu diesem Zeitpunkt gebundene Thumbprint lautete
`B370F6986AAD70CE382B1031EB52CC68572F566D`.

Die geplante Aufgabe `flashterm-stage-certificate-renewal` läuft als `SYSTEM`
täglich ab 03:00 Uhr mit zufälliger Verzögerung. Sie verwendet die vorhandene
win-acme-Renewal-Konfiguration und bindet ausschließlich das SNI-Binding des
Stage-Hosts neu. Die FileMaker-Bindings werden nicht angefasst. Der installierte
Testlauf endete mit Status `ok`; eine echte zukünftige Verlängerung bleibt
turnusgemäß betrieblich zu kontrollieren.

## Abnahmeprüfungen

Automatisiert:

- `npm test`: 127 von 127 Tests erfolgreich,
- Syntaxprüfung der geänderten JavaScript-Dateien,
- immutables und idempotentes Speichern von Publications und Assets,
- Konflikterkennung bei abweichendem Inhalt,
- Größen- und Medientypgrenzen für Bilder,
- Session- und Termbase-Berechtigungen auf allen Leseendpunkten,
- Code-Flow, PKCE, `state`, `nonce` und ID-Token-Prüfung für OIDC,
- Veröffentlichungs-, Aktivierungs- und Rollbackverträge.

Praktisch auf dem Windows-Server und im Browser:

- Dienststatus, Node-Health und IIS-Proxy-Health jeweils `ok`,
- HTTP-Weiterleitung auf HTTPS,
- Auth0-Anmeldung und Reader-Rolle erfolgreich,
- Aktivierung erst nach erfolgreichem Daten- und Asset-Preflight,
- Suche nach `Kräuterseitling` erfolgreich,
- deutsches Concept mit englischer Vorzugsbenennung geladen,
- veröffentlichtes Concept-Bild vollständig mit 288 × 216 Pixeln geladen,
- direkter Bildabruf ohne Personensitzung mit HTTP 401 abgewiesen,
- ein bereits vor der Aktivierung geöffnetes Tab nach normalem Neuladen von
  `xx-XX/yy-YY` auf die verfügbare Kombination `de-DE/en-US` korrigiert,
- Publication-spezifischer Sprachcache in Pilot 4 bestätigt.

## Rollback

Code-Rollback und Daten-Rollback sind getrennt:

- Bei einem Codefehler kann der `current`-Verzeichnislink bei gestopptem Dienst
  kontrolliert auf `20260830-pilot3` zurückgesetzt werden. Pilot 3 enthält
  bereits die vollständige Asset-Unterstützung, jedoch noch nicht die
  Publication-spezifische Cache-Korrektur.
- Bei einem fachlich falschen Datenstand wird keine Datei überschrieben oder
  gelöscht. Stattdessen wird `TEST-PUBLICATION-001` über den administrativen
  Aktivierungsendpunkt erneut aktiviert; dadurch entsteht ein neuer Eintrag in
  der Aktivierungshistorie.

Ein Rollback darf weder die geschützte Dienstkonfiguration noch das
FileMaker-Verzeichnis verändern.

## Noch offene Betriebspunkte

- Backup und Restore des Stage-Datenverzeichnisses praktisch in einer
  getrennten Wiederherstellungsumgebung testen.
- Die erste reale Let's-Encrypt-Verlängerung und das erneute SNI-Binding nach
  Fälligkeit kontrollieren.
- Weitere Pilotpersonen ausschließlich über die vorgesehene Auth0-Rolle
  aufnehmen und den Entzug der Rolle ebenfalls testen.
- Den Publisher später kontrolliert zeitgesteuert oder direkt aus Backstage
  auslösen; im Pilot bleibt er ein bewusster administrativer Einmallauf.
- Bestätigen, dass die verwendeten FileMaker-Layouts ausschließlich fachlich
  freigegebene Datensätze liefern.
- Die externen Browser-CDN-Abhängigkeiten betrieblich akzeptieren oder vor einer
  breiteren Einführung lokal bereitstellen.
- Das konkrete FileMaker-/Claris-Betriebs- und Lizenzmodell vor einem
  kommerziellen Angebot schriftlich bestätigen.

## Verweise

- [Windows-Installation und Betrieb](windows-server-deployment.md)
- [Stage-Server lokal entwickeln](stage-server-development.md)
- [Backstage veröffentlichen](backstage-publication.md)
- [Publication-Architektur](stage-publication-architecture.md)
