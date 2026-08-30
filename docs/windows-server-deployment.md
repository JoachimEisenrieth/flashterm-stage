# flashterm stage auf Windows Server betreiben

Stand: 30. August 2026

Der praktisch abgenommene Stand des ersten Servers ist separat in
[`windows-pilot-2026-08-30.md`](windows-pilot-2026-08-30.md) dokumentiert.

## Ziel und Pilotgrenze

Diese Anleitung beschreibt einen einzelnen flashterm-stage-Prozess auf einem Windows Server. IIS nimmt ausschließlich HTTPS-Verbindungen an und leitet sie intern an den Node-Prozess auf `127.0.0.1:8100` weiter. Veröffentlichungen und Aktivierungen liegen in einem lokalen, gesicherten Datenverzeichnis.

Der erste Pilot umfasst:

- einen Windows Server,
- einen Node-Prozess,
- ein lokales Datenverzeichnis,
- OpenID Connect für Personen,
- ein getrenntes Veröffentlichungstoken,
- IIS als HTTPS-Reverse-Proxy,
- dateibasierte Sicherung bei gestopptem Dienst,
- unveränderliche Speicherung und authentifizierte Auslieferung veröffentlichter Bilder.

Mehrere gleichzeitig schreibende Prozesse, gemeinsamer Netzwerkspeicher und hochverfügbare Sitzungen gehören nicht zu diesem Pilotumfang.

## Voraussetzungen

- eine unterstützte 64-Bit-Node.js-LTS-Version ab Node 20,
- IIS mit gültigem HTTPS-Zertifikat,
- IIS URL Rewrite und Application Request Routing (ARR),
- aktivierte ARR-Proxyfunktion auf Serverebene,
- ein eigener, nicht interaktiv verwendeter Windows-Dienstaccount,
- ein für den Server freigegebener OpenID-Connect-Client,
- ein freigegebenes lokales Daten- und Backupziel,
- ein durch den Betrieb genehmigter Windows-Service-Wrapper.

Die mitgelieferte Dienstvorlage verwendet WinSW als Wrapper. Die ausführbare Wrapperdatei selbst gehört nicht zum Repository und muss aus einer betrieblich freigegebenen Quelle bezogen werden.

## Empfohlene Verzeichnisse

```text
C:\Apps\flashterm-stage\
  current\                       Anwendungscode
  previous\                      vorherige Anwendungsversion für Code-Rollback

C:\ProgramData\flashterm-stage\
  service.env                    geschützte Laufzeitkonfiguration
  flashterm-stage-service.exe    freigegebener Service-Wrapper
  flashterm-stage-service.xml    lokale Dienstdefinition
  logs\                          Dienstlogs

D:\flashterm-stage\
  data\                          FLASHTERM_STAGE_DATA
  backups\                       Sicherungen außerhalb des Datenverzeichnisses

C:\inetpub\flashterm-stage-proxy\
  web.config                     ausschließlich IIS-Reverse-Proxy
```

Anwendung, Konfiguration, Daten und Backups bleiben damit getrennt. Ein Code-Update überschreibt weder Veröffentlichungen noch Secrets.

## 1. Anwendung bereitstellen

Den geprüften Repository-Stand nach `C:\Apps\flashterm-stage\current` übertragen. Lokale Entwicklungsdateien werden nicht übernommen:

- `config.js`,
- `.stage-data`,
- `.env`-Dateien,
- Testausgaben unter `outputs`,
- lokale Logs.

Es gibt keinen Build- oder Installationsschritt und keine produktiven npm-Abhängigkeiten. Vor Freigabe des konkreten Stands wird im Quell-Checkout ausgeführt:

```text
npm test
```

## 2. Dienstkonto und Rechte

Der Dienstaccount benötigt:

- Lesen und Ausführen für `C:\Apps\flashterm-stage\current`,
- Lesen für `C:\ProgramData\flashterm-stage\service.env`,
- Ändern für `C:\ProgramData\flashterm-stage\logs`,
- Ändern für `D:\flashterm-stage\data`,
- keine interaktive Anmeldung,
- keine administrativen Rechte.

Das Datenverzeichnis darf nicht vom IIS-Anwendungspool beschrieben werden. Der Veröffentlichungsspeicher ist ausschließlich Eigentum des Stage-Dienstes und der zuständigen Backup-Identität.

Die konkrete Rechtevergabe muss mit den lokalen Accountnamen der Installation erfolgen. Danach ist mit `icacls` zu kontrollieren, dass insbesondere `service.env` nicht für gewöhnliche Benutzer lesbar ist.

## 3. Laufzeitkonfiguration schützen

[`deploy/windows/service.env.example`](../deploy/windows/service.env.example) nach `C:\ProgramData\flashterm-stage\service.env` kopieren und ausschließlich in der geschützten Kopie ausfüllen. Die Datei enthält später Secrets und darf weder in das Repository noch in Tickets, Logs oder Sicherungen mit breitem Leserkreis gelangen.

Für den produktiven Pilot sind mindestens festzulegen:

| Variable | Bedeutung |
|---|---|
| `FLASHTERM_STAGE_DATA` | Absolutes lokales Datenverzeichnis |
| `FLASHTERM_STAGE_TENANT` | Stabile Organisations-ID |
| `FLASHTERM_STAGE_AUTH=oidc` | Produktive Personenanmeldung |
| `FLASHTERM_STAGE_PUBLIC_ORIGIN` | Exakte öffentliche HTTPS-Adresse ohne Pfad |
| `FLASHTERM_OIDC_ISSUER` | Exakter HTTPS-Issuer des Identitätsdiensts |
| `FLASHTERM_OIDC_CLIENT_ID` | Registrierte Client-ID |
| `FLASHTERM_OIDC_CLIENT_SECRET` | Optionales, geschütztes Client-Secret |
| `FLASHTERM_STAGE_GROUP_ACCESS` | JSON-Zuordnung von Identitätsgruppen zu Termbase-IDs |
| `FLASHTERM_PUBLISH_TOKEN` | Eigenständiges technisches Veröffentlichungstoken |
| `FLASHTERM_PUBLISH_TERMBASES` | Erlaubte Termbase-IDs dieses Tokens |

Beim Identitätsdienst wird exakt folgende Callback-Adresse registriert:

```text
https://<stage-host>/auth/callback
```

Der Node-Prozess benötigt ausgehend HTTPS-Zugriff auf Discovery-, Token- und Schlüsseldokument-Endpunkte des Identitätsdiensts. Adressen und Antworten werden nicht über IIS geleitet.

Die Vorlage wird zeilenweise als `NAME=WERT` gelesen. Werte werden nicht durch PowerShell ausgewertet. Anführungszeichen wären Bestandteil des Werts und sollen deshalb nicht um einfache Werte gesetzt werden.

## 4. Dienst installieren

[`deploy/windows/flashterm-stage-service.xml.example`](../deploy/windows/flashterm-stage-service.xml.example) außerhalb des Repositories als `C:\ProgramData\flashterm-stage\flashterm-stage-service.xml` ablegen und die Pfade anpassen. Der lokale Dateiname ohne `.example` wird durch `.gitignore` ausgeschlossen.

[`deploy/windows/start-stage.ps1`](../deploy/windows/start-stage.ps1) liest ausschließlich Variablen mit dem Präfix `FLASHTERM_` und startet danach `scripts\stage-server.js`. Es gibt keine Konfigurationswerte aus.

Installation und Accountzuordnung des Service-Wrappers erfolgen nach dem freigegebenen Betriebsverfahren. Der Dienst erhält den Starttyp **Automatisch (Verzögerter Start)** und wird unter dem eigenen Dienstaccount ausgeführt.

Falls `node.exe` für den Dienstaccount nicht über `PATH` auflösbar ist, wird in den Wrapperargumenten zusätzlich beispielsweise `-NodeExecutable "C:\Program Files\nodejs\node.exe"` angegeben.

Nach dem Start muss lokal erfolgreich sein:

```powershell
powershell.exe -NoProfile -File C:\Apps\flashterm-stage\current\deploy\windows\test-stage-health.ps1
```

Der Server bleibt absichtlich ausschließlich unter `http://127.0.0.1:8100` erreichbar. Eine Firewallfreigabe für Port 8100 ist weder nötig noch erwünscht.

## 5. IIS als HTTPS-Reverse-Proxy

Für die IIS-Site ein separates physisches Verzeichnis wie `C:\inetpub\flashterm-stage-proxy` verwenden. Dorthin wird ausschließlich [`deploy/windows/iis/web.config`](../deploy/windows/iis/web.config) kopiert. Die vorhandene `web.config` in der Projektwurzel gehört zum historischen statischen Betrieb und wird dafür nicht verwendet.

Auf Serverebene sind zu konfigurieren:

1. ARR-Proxyfunktion aktivieren.
2. HTTPS-Binding mit dem vorgesehenen Hostnamen und Zertifikat anlegen.
3. HTTP entweder deaktivieren oder kontrolliert auf HTTPS umleiten.
4. Direkten externen Zugriff auf Port 8100 nicht freigeben.

Die Proxyvorlage leitet Pfad und Query an `127.0.0.1:8100` weiter, reicht Node-Fehlerantworten unverändert durch und erlaubt bis zu 30 MiB Requestgröße. Der Stage-Server selbst begrenzt JSON-Veröffentlichungen zusätzlich auf 25 MiB und einzelne Bilddateien auf 10 MiB.

Anschließend prüfen:

```text
https://<stage-host>/api/health
```

Erwartete Antwort:

```json
{"status":"ok"}
```

## 6. Erste Veröffentlichung und Aktivierung

Zuerst einen Dry Run des Backstage-Publishers durchführen. Danach denselben geprüften Stand übertragen und ausdrücklich aktivieren, wie in [`backstage-publication.md`](backstage-publication.md) beschrieben.

Für den externen Stage-Server muss `FLASHTERM_STAGE_ORIGIN` die öffentliche HTTPS-Adresse enthalten. Das Veröffentlichungstoken wird nur im einmaligen Publisher-Prozess und in der geschützten Stage-Dienstkonfiguration bereitgestellt.

Nach der Aktivierung prüfen:

- Anmeldung und Abmeldung,
- sichtbare Termbases entsprechend der Identitätsgruppen,
- direkte URL auf eine erlaubte Termbase,
- 404-Antwort für eine nicht erlaubte Termbase,
- Wiki-Suche und Concept-Ansicht,
- alle in Concepts referenzierten Bilder; direkte Asset-Aufrufe müssen ohne Sitzung abgewiesen werden,
- normales Neuladen eines bereits vor einer Aktivierung geöffneten Tabs; die neue Publication muss ohne manuelles Löschen des Session-Caches sichtbar werden,
- Inspector,
- Translator und Sprachwechsel,
- Excel-, CSV- und JSON-Export,
- Light und Dark Mode,
- breite und schmale Browseransicht.

Die Browser benötigen aktuell Zugriff auf die extern eingebundenen Laufzeitbibliotheken. Falls das Server- oder Clientnetz diese CDNs sperrt, müssen die Abhängigkeiten vor dem Pilot kontrolliert lokal bereitgestellt werden.

## 7. Backup

Eine Dateisicherung wird nur bei gestopptem Stage-Dienst erstellt. Dadurch gehören Publication-Dateien und Aktivierungshistorie garantiert zu demselben konsistenten Zeitpunkt.

```powershell
Stop-Service flashterm-stage
powershell.exe -NoProfile -File C:\Apps\flashterm-stage\current\deploy\windows\backup-stage-data.ps1 `
  -DataDirectory D:\flashterm-stage\data `
  -BackupDirectory D:\flashterm-stage\backups
Start-Service flashterm-stage
```

[`deploy/windows/backup-stage-data.ps1`](../deploy/windows/backup-stage-data.ps1) bricht ab, wenn der Dienst noch läuft, und gibt nur den erzeugten Archivpfad aus. Die Sicherung muss anschließend durch das reguläre Serverbackup auf einen getrennten Speicher übernommen und regelmäßig testweise wiederhergestellt werden.

## 8. Restore

Ein Restore ersetzt Daten und wird deshalb bewusst nicht automatisiert. Das bisherige Verzeichnis bleibt zunächst erhalten:

1. Stage-Dienst stoppen.
2. Aktuelles `data`-Verzeichnis in ein eindeutig datiertes Recovery-Verzeichnis umbenennen.
3. Das ausgewählte Archiv in das vorgesehene Datenziel entpacken. Das Archiv enthält das oberste Datenverzeichnis mit.
4. NTFS-Rechte und Eigentümer kontrollieren.
5. Stage-Dienst starten.
6. Lokalen Healthcheck ausführen.
7. Aktive Termbases und bekannte Concepts praktisch prüfen.
8. Recovery-Verzeichnis erst nach bestätigter Wiederherstellung nach dem betrieblichen Aufbewahrungsplan entfernen.

Ein fehlerhafter fachlicher Stand benötigt normalerweise keinen Dateirestore: Über den Aktivierungsendpunkt wird stattdessen eine vorhandene ältere Publication erneut aktiviert. Dadurch entsteht eine neue, nachvollziehbare Aktivierung.

## 9. Code-Update und Code-Rollback

Vor einem Update:

1. Tests des auszuliefernden Stands erfolgreich ausführen.
2. Datenbackup erstellen.
3. Neue Anwendung in einem separaten Verzeichnis bereitstellen.
4. Dienst stoppen.
5. Bisheriges `current` als `previous` erhalten und neue Version als `current` einsetzen.
6. Dienst starten und lokalen Healthcheck ausführen.
7. Öffentlichen Login und die zentralen Browserabläufe prüfen.

Bei einem Codefehler wird der Dienst gestoppt und `previous` wieder als `current` eingesetzt. Das Datenverzeichnis wird nur zurückgespielt, wenn sich das gespeicherte Format tatsächlich inkompatibel geändert hätte. Der aktuelle Pilot besitzt keine solche Datenmigration.

## 10. Abnahmekriterien für den ersten Windows-Piloten

- Alle automatisierten Tests sind erfolgreich.
- Port 8100 ist nur über Loopback erreichbar.
- Die öffentliche Adresse verwendet ausschließlich HTTPS.
- `config.js` und Browser-Storage enthalten keine FileMaker-Zugangsdaten oder FileMaker-Tokens.
- Unangemeldete Personen werden zur OIDC-Anmeldung geleitet.
- Gruppenberechtigungen werden für mindestens eine erlaubte und eine nicht erlaubte Termbase geprüft.
- Veröffentlichung, Aktivierung und erneute Aktivierung einer älteren Revision funktionieren.
- Dienstneustart, Serverneustart und Healthcheck funktionieren.
- Backup und testweiser Restore wurden praktisch verifiziert.
- Secrets sind nur für Dienstaccount und zuständige Administratoren lesbar.
- Alle referenzierten Bilder sind vollständig übertragen und nur mit einer berechtigten Personensitzung abrufbar.
- Die Abhängigkeit von externen Browser-CDNs ist betrieblich akzeptiert oder vor Pilotbeginn beseitigt.

## Herstellerreferenzen für die Betriebskomponenten

- [Microsoft: Reverse Proxy mit URL Rewrite und Application Request Routing](https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/reverse-proxy-with-url-rewrite-v2-and-application-request-routing)
- [WinSW: Installation und Verwendung](https://github.com/winsw/winsw)
- [WinSW: XML-Konfiguration](https://github.com/winsw/winsw/blob/v3/docs/xml-config-file.md)
- [WinSW: Log-Rotation](https://github.com/winsw/winsw/blob/v3/docs/logging-and-error-reporting.md)
