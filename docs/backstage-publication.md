# Von flashterm backstage nach Stage veröffentlichen

Stand: 30. August 2026

## Zweck

Der Veröffentlichungsprozess liest einen fachlich freigegebenen Stand aus FileMaker, normalisiert ihn in den quellenneutralen Publication-Vertrag, validiert das vollständige Paket und überträgt es an den getrennten Stage-Server. Erst der ausdrückliche Schalter `--activate` macht die neue Revision für angemeldete Personen sichtbar.

Der Prozess läuft außerhalb des Browsers. FileMaker-Zugangsdaten, FileMaker-Sitzungstoken und das Stage-Veröffentlichungstoken werden weder in das Paket aufgenommen noch an die Stage-Oberfläche ausgeliefert.

## Voraussetzung in flashterm backstage

Der erste Adapter verwendet die bereits vorhandenen Data-API-Layouts:

- `languageAPI` für Sprachen und Source-Kennzeichnung,
- `termAPI` für die Termlisten je Sprache,
- `definitionAPI` für die mehrsprachigen Concept-Inhalte.

Diese Layouts beziehungsweise die dahinterliegenden FileMaker-Berechtigungen müssen ausschließlich fachlich freigegebene Datensätze liefern. Der Publisher erfindet keine eigene Freigabelogik. Für den technischen FileMaker-Account werden nur lesende Rechte auf die benötigten Layouts und Felder sowie der erforderliche Data-API-Zugriff vorgesehen.

## Sicherheitsgrenzen

- FileMaker und ein externer Stage-Server müssen über HTTPS angesprochen werden; unverschlüsseltes HTTP wird nur für `127.0.0.1` beziehungsweise `localhost` akzeptiert.
- Das FileMaker-Token bleibt im Arbeitsspeicher des einmaligen Prozesses.
- Die FileMaker-Sitzung wird auch nach einem Verarbeitungsfehler beendet.
- Das Veröffentlichungstoken kann serverseitig auf konkrete Termbase-IDs beschränkt werden.
- Fehlerausgaben enthalten keine Zugangsdaten, Tokens oder vollständigen API-Antworten.
- Eine vorhandene Veröffentlichungs-ID kann nur mit identischem Inhalt wiederholt werden.
- Referenzierte Bilder werden auf sichere Rasterformate und eine Größe von höchstens 10 MiB je Datei begrenzt.

## Stage-Server vorbereiten

Der lokale Stage-Server erhält zusätzlich die Termbasen, für die sein Veröffentlichungstoken verwendet werden darf:

```text
FLASHTERM_STAGE_TENANT=TEST-TENANT \
FLASHTERM_PUBLISH_TERMBASES=TEST-TERMBASE \
FLASHTERM_PUBLISH_TOKEN=<vertrauliches-token> \
npm run stage
```

In einer produktiven Installation werden Token und andere Secrets in der geschützten Dienstkonfiguration des Windows-Servers gespeichert, nicht in Projektdateien.

## Veröffentlichungsdaten festlegen

Nicht-sensitive Werte für einen konkreten Lauf:

```text
export FLASHTERM_FILEMAKER_SERVER="https://filemaker.example.org"
export FLASHTERM_FILEMAKER_DATABASE="flashterm backstage"
export FLASHTERM_STAGE_ORIGIN="http://127.0.0.1:8100"
export FLASHTERM_STAGE_TENANT="TEST-TENANT"
export FLASHTERM_PUBLISH_TERMBASE="TEST-TERMBASE"
export FLASHTERM_PUBLISH_TERMBASE_NAME="Meine Terminologie"
export FLASHTERM_PUBLISH_ID="TEST-PUBLICATION-002"
export FLASHTERM_PUBLISH_REVISION="2"
export FLASHTERM_PUBLISH_AT="2026-08-21T14:00:00.000Z"
```

`FLASHTERM_PUBLISH_ID` und `FLASHTERM_PUBLISH_AT` bleiben bei einem Wiederholungsversuch unverändert. Zusammen mit der Revision identifizieren sie denselben unveränderlichen Stand.

Die beiden Geheimnisse sollten in einer interaktiven Terminal-Sitzung eingegeben und nicht in Dateien oder die Shell-Historie geschrieben werden:

```text
read "FLASHTERM_FILEMAKER_USERNAME?FileMaker-Benutzername: "
read -s "FLASHTERM_FILEMAKER_PASSWORD?FileMaker-Passwort: "; echo
read -s "FLASHTERM_PUBLISH_TOKEN?Stage-Veröffentlichungstoken: "; echo
export FLASHTERM_FILEMAKER_USERNAME FLASHTERM_FILEMAKER_PASSWORD FLASHTERM_PUBLISH_TOKEN
```

## Erst prüfen, dann veröffentlichen

Der Probelauf liest FileMaker, baut das Paket, lädt alle einmalig referenzierten Bilder zur Prüfung und validiert alles, überträgt aber nichts:

```text
npm run publish:backstage -- --dry-run
```

Der echte Lauf überträgt und aktiviert dieselbe neue Revision in einem kontrollierten Ablauf:

```text
npm run publish:backstage -- --activate
```

Ohne `--activate` wird das Paket zwar unveränderlich gespeichert, der bisher aktive Stand bleibt jedoch sichtbar. Die spätere Aktivierung oder ein Rollback erfolgt über den vorhandenen administrativen Aktivierungsendpunkt.

## Ablauf im Publisher

1. Eine FileMaker-Data-API-Sitzung wird eröffnet.
2. Lokalisierte Sprachbezeichnungen werden für `de-DE` und `en-GB` gelesen und zusammengeführt.
3. Alle Termlisten werden je Sprache gelesen.
4. Der vollständige freigegebene `definitionAPI`-Snapshot wird seitenweise geladen und lokal nach Concept-ID gruppiert.
5. Reihenfolgen werden stabilisiert und der gesamte Publication-Vertrag wird validiert.
6. Die FileMaker-Sitzung wird beendet.
7. Das Paket wird mit der technischen Veröffentlichungsidentität an Stage übertragen.
8. Alle einmalig referenzierten JPEG-, PNG-, GIF- und WebP-Dateien werden einzeln geladen, geprüft und unveränderlich zur Publication übertragen.
9. Nur mit `--activate` wird die Revision nach der vollständigen Übertragung atomar aktiviert.

Weitere GUI-Sprachen können über eine kommagetrennte Liste ergänzt werden:

```text
export FLASHTERM_PUBLISH_GUI_LANGUAGES="de-DE,en-GB,fr-FR"
```

## Noch offen für den produktiven Pilot

- Bestätigung, dass die drei vorhandenen FileMaker-Layouts tatsächlich nur freigegebene Daten liefern.
- Festlegung, wie Publication-ID, Revision und Veröffentlichungszeitpunkt in Backstage erzeugt werden.
- Zeitgesteuerter beziehungsweise direkt durch Backstage ausgelöster Start des geschützten Publishers.

## Verifizierter Windows-Pilot vom 30. August 2026

Der freigegebene Pilotbestand enthält 7 Sprachen, 52 Concepts, 238 Termini und 26 einmalig referenzierte Bilder. Die Bilder bestehen aus 13 JPEG-, 10 PNG- und 3 GIF-Dateien, sind zusammen 1.717.729 Bytes groß und wurden vollständig über HTTPS aus FileMaker gelesen. Die Publication `BACKSTAGE-20260830T083951Z` mit dem sichtbaren Namen `Demo-Terminologie` wurde zunächst ohne Aktivierung übertragen, einschließlich aller Assets geprüft und anschließend atomar aktiviert. `TEST-PUBLICATION-001` bleibt als praktisch bestätigter Daten-Rollback erhalten.

## Verifizierter Präsentationsstand vom 21. August 2026

Der rein lesende Probelauf gegen die gefüllten Präsentationstabellen wurde erfolgreich abgeschlossen. Der validierte Snapshot enthält 9 Sprachen, 5.352 Concepts und 28.131 Termini. Dabei wurden numerische FileMaker-Concept-IDs an der Adaptergrenze in stabile öffentliche Zeichenketten überführt und mehr als 10.000 `definitionAPI`-Zeilen vollständig über FileMakers `offset`-/`limit`-Seitennavigation gelesen. Es wurde bei diesem Probelauf nichts an Stage übertragen oder aktiviert.
