# Stage-Server lokal entwickeln und testen

Stand: 30. August 2026

## Zweck des aktuellen Zwischenstands

Der Stage-Server ist ein eigenständiger, plattformneutraler Node.js-Prozess. Er kann Veröffentlichungen unveränderlich speichern, Revisionen aktivieren, frühere Revisionen erneut aktivieren und die flashterm-Oberfläche zusammen mit normalisierten Terminologiedaten ausliefern.

Der bestehende Entwicklungsserver auf Port `8000` verwendet weiterhin den bisherigen FileMaker-Pfad. Der Stage-Server läuft parallel auf Port `8100` und erzeugt für seinen Browserpfad eine rein öffentliche Konfiguration mit einer aktiven Termbase. Sind mehrere Termbasen aktiv, können sie direkt im Kopfbereich der Oberfläche ausgewählt werden. Dadurch kann dieselbe Oberfläche wahlweise gegen FileMaker oder gegen veröffentlichte Stage-Daten laufen.

Der Server verwendet ausschließlich Node.js-Standardmodule und benötigt keine zusätzlichen Pakete oder einen Build-Schritt.

## Lokaler Start auf macOS

Aus dem Projektverzeichnis:

```text
FLASHTERM_STAGE_TENANT=TEST-TENANT \
FLASHTERM_PUBLISH_TOKEN=LOCAL_DEVELOPMENT_ONLY \
npm run stage
```

Standardmäßig ist die Oberfläche anschließend nur lokal erreichbar:

```text
http://127.0.0.1:8100/
```

Beim ersten Aufruf erscheint die Seite **Bei flashterm stage anmelden**. Der lokale Entwicklungszugang besitzt standardmäßig Zugriff auf alle aktiven Termbasen. Er verwendet keine FileMaker-Anmeldung und ist wegen der Bindung an `127.0.0.1` nicht von anderen Rechnern erreichbar.

Der Healthcheck kann im Browser geöffnet werden:

```text
http://127.0.0.1:8100/api/health
```

Ohne `FLASHTERM_PUBLISH_TOKEN` startet die lesende API, aber alle Veröffentlichungs- und Aktivierungsendpunkte bleiben deaktiviert.

## Lokale Daten

Ohne abweichende Konfiguration speichert der Server unter `.stage-data` in der Projektwurzel. Dieses Verzeichnis ist ignoriert und darf nicht committed werden.

Ein anderes Verzeichnis kann explizit gesetzt werden:

```text
FLASHTERM_STAGE_DATA=/vollstaendiger/lokaler/pfad \
FLASHTERM_STAGE_TENANT=TEST-TENANT \
FLASHTERM_PUBLISH_TOKEN=LOCAL_DEVELOPMENT_ONLY \
npm run stage
```

Die Datenstruktur ist betriebssystemneutral:

```text
tenants/
  <tenantId>/
    termbases/
      <termbaseId>/
        publications/
          <publicationId>/
            publication.json
            assets/
              blobs/
                <SHA-256>
              index/
                <SHA-256-des-Dateinamens>.json
        activations/
          <fortlaufende Aktivierung>.json
```

Veröffentlichungen werden niemals überschrieben. Auch ein Rollback erzeugt lediglich eine neue Aktivierung, die auf eine vorhandene ältere Veröffentlichung zeigt. Dadurch bleibt die Historie nachvollziehbar.

Pro Datenverzeichnis darf nur ein schreibender Stage-Server-Prozess betrieben werden. Mehrere Serverinstanzen und gemeinsamer Netzwerkspeicher gehören nicht zum ersten Pilotumfang.

## Testveröffentlichung laden

Das anonymisierte Testpaket passt zur Organisation `TEST-TENANT`. Bei laufendem Server kann es in einem zweiten Terminal veröffentlicht werden:

```text
curl -X POST http://127.0.0.1:8100/api/admin/publications \
  -H "Authorization: Bearer LOCAL_DEVELOPMENT_ONLY" \
  -H "Content-Type: application/json" \
  --data-binary @tests/fixtures/terminology-publication-v1.json
```

Die gespeicherte Revision wird bewusst nicht automatisch sichtbar. Sie muss separat aktiviert werden:

```text
curl -X POST http://127.0.0.1:8100/api/admin/termbases/TEST-TERMBASE/activations \
  -H "Authorization: Bearer LOCAL_DEVELOPMENT_ONLY" \
  -H "Content-Type: application/json" \
  --data '{"publicationId":"TEST-PUBLICATION-001"}'
```

Danach sind beispielsweise diese Lesezugriffe verfügbar:

```text
http://127.0.0.1:8100/api/termbases
http://127.0.0.1:8100/api/termbases/TEST-TERMBASE
http://127.0.0.1:8100/api/termbases/TEST-TERMBASE/languages?guiLanguage=de-DE
http://127.0.0.1:8100/api/termbases/TEST-TERMBASE/terms?language=xx-XX
http://127.0.0.1:8100/api/termbases/TEST-TERMBASE/concepts/TEST-001
```

Eine identische Veröffentlichung kann gefahrlos wiederholt werden. Derselbe Veröffentlichungsname mit abweichendem Inhalt wird als Konflikt abgewiesen.

## Konfiguration

| Umgebungsvariable | Standard | Zweck |
|---|---|---|
| `FLASHTERM_STAGE_PORT` | `8100` | Lokaler HTTP-Port |
| `FLASHTERM_STAGE_DATA` | `.stage-data` | Absoluter oder relativer Speicherpfad |
| `FLASHTERM_STAGE_TENANT` | `local` | Organisation der Stage-Instanz |
| `FLASHTERM_STAGE_TERMBASE` | erste aktive Termbase | Optional fest ausgewählte Termbase |
| `FLASHTERM_STAGE_DEFAULT_TARGET_LANGUAGES` | `{}` | Optionale JSON-Zuordnung von Termbase-IDs zu Standard-Zielsprachen |
| `FLASHTERM_PUBLISH_TOKEN` | leer | Aktiviert authentifizierte administrative Endpunkte |
| `FLASHTERM_PUBLISH_TERMBASES` | `*` | Kommagetrennte Termbase-IDs, die das Veröffentlichungstoken aktualisieren darf |
| `FLASHTERM_STAGE_AUTH` | `development` | `development`, `trusted-intranet`, `oidc` oder nur für Tests `disabled` |
| `FLASHTERM_STAGE_DEV_USER` | `Lokale Entwicklung` | Anzeigename des lokalen Testzugangs |
| `FLASHTERM_STAGE_DEV_TERMBASES` | `*` | Kommagetrennte Termbase-IDs für den lokalen Testzugang |

Das Veröffentlichungstoken ist ein lokales Entwicklungsgeheimnis. Reale Tokens dürfen weder committed noch in Tickets, Protokolle oder Antworten kopiert werden.

Der vollständige Backstage-Ablauf und seine getrennte Konfiguration stehen in [`backstage-publication.md`](backstage-publication.md).

## Zugriff und Berechtigungen

In den Modi `development` und `oidc` ist eine Anmeldung erforderlich. Der Server speichert nach erfolgreicher Anmeldung nur eine zufällige Sitzungs-ID in einem `HttpOnly`-Cookie. Identitäts- und FileMaker-Tokens gelangen nicht in Browser-Storage. Sitzungen laufen standardmäßig nach acht Stunden ab und gehen bei einem Serverneustart verloren.

`trusted-intranet` ist der ausdrückliche Modus für eine intern abgeschottete Stage-Instanz ohne Personenanmeldung. Jeder Client, der diese Instanz erreicht, kann alle dort aktiv veröffentlichten Bestände lesen. Er darf deshalb nur hinter einer tatsächlich kontrollierten Netzgrenze verwendet werden; DNS-Name und Link sind keine Berechtigung. Administrative Veröffentlichungen bleiben auch in diesem Modus durch das getrennte Veröffentlichungstoken geschützt.

Jede Leseanfrage wird serverseitig geprüft:

- `GET /api/termbases` enthält nur freigegebene Bestände.
- Direkte URLs zu nicht freigegebenen Termbase-IDs liefern keine Daten.
- `/config.js` wählt nur aus den für die Person sichtbaren Beständen.
- Das Veröffentlichungstoken bleibt ein vollständig getrennter administrativer Zugang.

Für einen lokalen Testzugang mit eingeschränkter Auswahl:

```text
FLASHTERM_STAGE_DEV_USER="Test Person" \
FLASHTERM_STAGE_DEV_TERMBASES="TERMBASE-A,TERMBASE-B" \
npm run stage
```

Der Entwicklungszugang ist kein produktives Benutzerverzeichnis und darf nicht für einen extern erreichbaren Server verwendet werden.

## OpenID Connect für Instanzen mit Personenanmeldung

Der Modus `oidc` verwendet den serverseitigen OpenID-Connect Authorization Code Flow mit PKCE-S256, `state` und `nonce`. ID-Tokens werden mit dem veröffentlichten RSA-Schlüssel des Anbieters geprüft. Die Anwendung erwartet eine HTTPS-Adresse und ordnet Gruppen ausschließlich serverseitig Termbase-IDs zu.

Benötigte Umgebungsvariablen:

| Umgebungsvariable | Zweck |
|---|---|
| `FLASHTERM_STAGE_AUTH=oidc` | Aktiviert OpenID Connect |
| `FLASHTERM_STAGE_PUBLIC_ORIGIN` | Öffentliche HTTPS-Basisadresse, beispielsweise `https://stage.example.org` |
| `FLASHTERM_OIDC_ISSUER` | Exakte HTTPS-Issuer-Adresse des Identitätsdienstes |
| `FLASHTERM_OIDC_CLIENT_ID` | Registrierte Client-ID |
| `FLASHTERM_OIDC_CLIENT_SECRET` | Optionales Client-Secret; nur in der Serverumgebung speichern |
| `FLASHTERM_OIDC_GROUP_CLAIM` | Name des Gruppen-Claims, Standard `groups` |
| `FLASHTERM_STAGE_GROUP_ACCESS` | JSON-Zuordnung von Gruppen zu Termbase-IDs |

Beispiel für die nicht-sensitive Gruppenstruktur:

```text
{"stage-readers":["TERMBASE-A"],"stage-editors":["TERMBASE-A","TERMBASE-B"]}
```

Beim Identitätsdienst muss exakt diese Callback-Adresse registriert werden:

```text
https://<öffentliche-stage-adresse>/auth/callback
```

Die konkrete Issuer-, Client- und Gruppen-Konfiguration bleibt installationsspezifisch. Der Windows-Pilot verwendet dafür Auth0 und eine serverseitig ausgewertete Reader-Rolle. Secrets gehören ausschließlich in die geschützte Dienstkonfiguration und niemals in Projektdateien.

## API des Pilotstands

Öffentlicher Diagnoseendpunkt:

- `GET /api/health`

Mit Personensitzung und Termbase-Berechtigung geschützte Leseendpunkte:

- `GET /api/termbases`
- `GET /api/termbases/:id`
- `GET /api/termbases/:id/languages?guiLanguage=...`
- `GET /api/termbases/:id/terms?language=...`
- `GET /api/termbases/:id/concepts/:conceptId`
- `GET /api/termbases/:id/assets/:fileName`

Mit Veröffentlichungstoken geschützte Endpunkte:

- `POST /api/admin/publications`
- `POST /api/admin/termbases/:id/activations`
- `GET /api/admin/termbases/:id/publications`
- `PUT /api/admin/termbases/:id/publications/:publicationId/assets/:fileName`
- `GET /api/admin/termbases/:id/publications/:publicationId/assets`

Der Server akzeptiert Veröffentlichungen nur für die konfigurierte Organisation. Dateipfade werden ausschließlich aus geprüften IDs gebildet. Requests sind größenbegrenzt; ungültige Pakete werden vor dem Speichern abgewiesen.

Zusätzlich liefert der Server die statische Webanwendung aus. `/config.js` wird dabei dynamisch erzeugt und enthält ausschließlich:

- den Datenquellentyp `published`,
- die öffentliche Termbase-ID,
- die aktive Publication-ID zur Trennung des Browser-Caches,
- Ausgangs- und anfängliche Zielsprache.

FileMaker-Server, Datenbankname, Benutzername, Passwort und technische Tokens werden nicht an den Browser ausgeliefert.

## Zwischen mehreren Terminologiebeständen wechseln

Sobald mindestens zwei aktive Termbasen vorhanden sind, zeigt die Oberfläche im Kopfbereich die Auswahl **Terminologiebestand** an. Der Wechsel lädt die gewählte Termbase neu und ergänzt die Adresse um deren öffentliche ID:

```text
http://127.0.0.1:8100/?termbase=TEST-TERMBASE
```

Die Adresse kann geteilt oder als Lesezeichen gespeichert werden. Beim Wechsel werden vorherige `source`- und `target`-Parameter entfernt und anschließend aus den Sprachdaten der gewählten Termbase neu bestimmt. Bildpfade sind an die Termbase-ID gebunden; Sprachcaches zusätzlich an die aktive Publication-ID. Dadurch übernimmt auch ein bereits geöffnetes Tab nach einer Aktivierung beim normalen Neuladen keine Sprachen der vorherigen Revision.

## Übernahme auf Windows

Der aktuelle Code verwendet keine macOS-spezifischen Pfade oder Systemfunktionen. Das vorbereitete Betriebspaket enthält inzwischen:

- explizites produktives Datenverzeichnis mit eingeschränkten NTFS-Rechten,
- Vorlage und Starter für den Betrieb als Windows-Dienst,
- getrennte IIS-Konfiguration als HTTPS-Reverse-Proxy,
- produktive Identitäts- und Tokenverwaltung,
- konsistentes Backup von Veröffentlichungen und Aktivierungshistorie,
- Healthcheck sowie Abnahme- und Rollback-Ablauf.

Der Node-Prozess bindet derzeit absichtlich nur an `127.0.0.1`. Das entspricht auch dem späteren Betrieb hinter IIS: IIS nimmt externe HTTPS-Verbindungen an und leitet intern an den lokal gebundenen Stage-Prozess weiter.

Die vollständige Installations- und Betriebsanleitung steht in [`windows-server-deployment.md`](windows-server-deployment.md). Der praktisch abgenommene Stand des ersten Servers ist in [`windows-pilot-2026-08-30.md`](windows-pilot-2026-08-30.md) festgehalten.

## Bewusste Grenzen

- Sitzungen liegen im ersten Pilot nur im Arbeitsspeicher eines einzelnen Stage-Prozesses.
- Der lokale Entwicklungslogin ist weiterhin ausschließlich für `127.0.0.1` gedacht.
- Veröffentlichte Assets sind auf JPEG, PNG, GIF und WebP sowie 10 MiB je Datei begrenzt; weitere Medientypen gehören nicht zum Pilotvertrag.
- Der Speicher unterstützt im Pilot genau einen schreibenden Prozess je Datenverzeichnis.
- Der Backstage-Publisher wird noch nicht automatisch oder direkt aus FileMaker ausgelöst.

Diese Grenzen verhindern, dass der Zwischenstand versehentlich als produktionsfertige öffentliche Installation behandelt wird.
