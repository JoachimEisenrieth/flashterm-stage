# IONOS: getrennter Installationstest vom 25. September 2026

## Umfang

Vom Benutzer freigegeben: zunächst ausschließlich auf dem Server testen, ohne VPN oder separaten Testclient. Es wird eine **neue, getrennte Installation** geprüft. Die bisherige STAGE und ihre FileMaker-Zielkonfiguration bleiben bestehen.

Dies ist ein technischer Installertest mit PowerShell, nativer Windows-Oberfläche und echter Zertifikatsauswahl. Die erste grafische Fassung wurde ebenfalls auf IONOS durchlaufen; die vollständige FileMaker-Kopplung und Kundenfreigabe stehen noch aus.

## Installierter Stand

| Merkmal | Wert |
|---|---|
| Paket | `20260925.02-ionos-setup-test` |
| ZIP SHA-256 | `ad3ad6a3bb70abf1e9579e96915d2c2a64fef1c71ff0b4ddc308fdf0087741e8` |
| Modus | `-LocalTest`, `trustedIntranetConfirmed: false` |
| Instanz/Dienst/IIS-Site | `flashterm-stage-setup-test` |
| HTTPS, nur auf dem Server | `https://stage.flashterm.test:18446` |
| IIS-Binding | `127.0.0.1:18446:stage.flashterm.test` |
| Node-Port | `8201`, Loopback |
| Anwendung | `C:\Apps\flashterm-stage-setup-test` |
| Einstellungen | `C:\ProgramData\flashterm-stage-setup-test` |
| Daten | `C:\Data\flashterm-stage-setup-test` |
| IIS-Proxy | `C:\inetpub\flashterm-stage-setup-test-proxy` |
| Dienstkonto | `NT AUTHORITY\NetworkService` |
| Mandant / Bestand | `IONOS-SETUP-TEST` / `MBRAUN-SETUP-TEST` |
| Zertifikat | vorhandenes Zertifikat für `stage.flashterm.test`, gültig bis 24.12.2026 |

Das Paket wurde aus dem aktuellen Arbeitsstand gebaut, nicht aus einem freigegebenen Commit. Es enthält die zuvor anhand ihrer SHA-256 geprüften privaten Laufzeiten Node.js 24.21.0 und WinSW 2.12.0. Es enthält keine lokalen Konfigurationsdateien oder Zugangsdaten.

## Ergebnisse

- Echte Windows-Auswahl des vorhandenen Zertifikats erfolgreich. Private Key, Hostname, Gültigkeit, Vertrauenskette, Serververwendung und Sperrprüfung wurden geprüft.
- PowerShell-Parser auf dem Zielserver: **0 Syntaxfehler** in den ausgelieferten Skripten.
- Paketmanifest einschließlich SHA-256 aller Dateien: erfolgreich.
- Lokaler Testmodus weist öffentliche Binding-IP und identische Node-/HTTPS-Ports zurück.
- Preflight und Installation erfolgreich; Node- und HTTPS-Healthcheck `ok`.
- FileMaker-IIS-Site gestartet; Zustand und Bindings beim Installationslauf unverändert.
- Bestehende STAGE vor und nach der Installation erreichbar (`ok`).
- Dienstneustart der neuen Instanz erfolgreich.
- Nach erneutem Dienstneustart bleibt die aktive Testveröffentlichung erhalten; automatischer Dienststart ist konfiguriert. Der Node-Listener ist ausschließlich an `127.0.0.1` gebunden.
- Testveröffentlichung über HTTPS erfolgreich: **107 Konzepte**, 198 deutsche, 222 englische, 102 spanische, 111 französische, 34 italienische, 102 niederländische und 102 portugiesische Benennungen.
- Veröffentlichung ohne Berechtigung: HTTP 401. Ungültiger Veröffentlichungsinhalt: HTTP 400. Aktiver Stand bleibt erhalten.
- Zweiten Stand aktivieren und zum ersten Stand zurückwechseln: erfolgreich.
- Vergleich der bisherigen aktiven Veröffentlichung vor und nach dem Test: identisch.
- Serverbrowser: HTTPS ohne Warnung, Suche nach `gas`, Treffer `exhaust gas / Abgas`, Konzept `100321` und Definition sichtbar.

### Im Test gefundener und behobener Fehler

Der erste Apply-Lauf scheiterte beim Wechsel des Dienstkontos: Windows PowerShell 5.1 übergab das leere Passwortargument an `sc.exe` nicht zuverlässig. Der Installer rollte seine neuen Ressourcen zurück. Der folgende Preflight bestätigte wieder freie Ziele; der korrigierte Lauf war erfolgreich.

Der Installer verwendet jetzt `Invoke-CimMethod` mit benannten Parametern für `Win32_Service.Change`. Zusätzlich wartet der lokale Healthcheck begrenzt auf den tatsächlichen Node-Start, statt vom gestarteten Service-Wrapper sofort auf einen erreichbaren HTTP-Port zu schließen.

## Nachweise

Lokale Nachweise liegen unter `outputs/ionos-installer-test-20260925/`:

- `setup-test-apply-result.json`: erster Lauf mit Fehler und Rückabwicklung.
- `setup-test-apply-v2-result.json`: erfolgreicher korrigierter Installationslauf, negative Preflight-Tests, Dienstkonto, Binding und Healthchecks.
- `setup-publication-result.json`: Veröffentlichung, Fehlerfälle, Rückwechsel, Datenzahlen und unveränderter Ausgangsstand.
- `setup-final-verification.json`: gesonderte Prüfung des veröffentlichten Stands nach Dienstneustart.

Die Prüfberichte enthalten keine Zugangsdaten oder Tokens. Die technischen Testskripte und beide ZIP-Paketstände bleiben zur Nachvollziehbarkeit im selben Output-Verzeichnis; sie sind keine freigegebene Kundenauslieferung.

## Nachtest: Bilder, Wiederherstellung und Assistent

Paket `20260925.04-setup-followup`, ZIP SHA-256:
`939af06e952bedf2290031017ad0d8094dc30b79e756366865f5861be1c36825`.
Die getrennte `setup-test`-Instanz verwendet diesen Stand. Der frühere Anwendungsstand und der ursprüngliche Datenordner wurden als Rückweg erhalten.

- Native PowerShell-Parserprüfung: keine Fehler.
- Lesende Prüfung der FileMaker-Layouts umgesetzt. Das optionale Feld `definitionAPI.hyperLink` fehlt in der geprüften Quelle; das verhindert die Veröffentlichung nicht. Erforderliche Felder bleiben verbindlich.
- Bildtest mit einer kleinen PNG-Datei: Aktivierung ohne referenziertes Bild wird abgelehnt; nach Upload wird die Datei bytegenau ausgeliefert.
- Dabei entdeckte Lücke behoben: Der Dateispeicher prüft vor jeder Aktivierung die referenzierten Bilddateien einschließlich ihrer Integrität.
- Datensicherung bei gestopptem Testdienst erstellt und mit SHA-256 gesichert. Wiederherstellung in ein neues Verzeichnis, Vergleich aller zehn Dateien und anschließender Start der Testinstanz mit den wiederhergestellten Daten erfolgreich. Veröffentlichung `SETUP-ASSET-20260925` und Bild wieder erreichbar. Ursprünglicher Datenordner bleibt erhalten.
- Bestehende ursprüngliche STAGE weiterhin mit Healthstatus `ok`.
- Vollständige lokale Unit-Testsuite: **183 bestanden, 0 fehlgeschlagen**.

Der native Assistent wurde anschließend für eine weitere freie Instanz durchlaufen:

| Merkmal | Wert |
|---|---|
| Instanz/Dienst | `flashterm-stage-dev-test` |
| Adresse | `https://stage.flashterm.test:18447` |
| Binding | ausschließlich `127.0.0.1` |
| Node-Port | `8202` |
| Mandant / Bestand | `IONOS-DEV-TEST` / `DEV-STAGE` |
| Abschlussstatus | `InstalledSetupIncomplete` |

Vorprüfung, Zertifikatsauswahl, Installation und Dienst-/HTTPS-Prüfung erfolgreich. Browser öffnet die Anwendung ohne Zertifikatswarnung; mangels Veröffentlichung erscheint noch der Hinweis auf nicht verfügbare Daten. Dies ist kein bestandener FileMaker-Export. Der Assistent bietet „FileMaker-Anbindung später einrichten“ und kennzeichnet die offenen Schritte im Bericht.

Auf Benutzerwunsch wird `flashterm-dev` als Exportquelle verwendet. Eine eigenständige Kopie wurde mit FileMaker erstellt und nach `C:\Users\Administrator\Documents\flashterm-dev.fmp12` übertragen. Lokale SHA-256: `4617d2c30f6a9224c97ed082722651231b667f7d6f8883c087daefbd2d9ed48d`. Die SHA-256 wurde auf dem Server bestätigt. Die Kopie wurde ohne Überschreiben in den FileMaker-Datenbankordner übernommen und durch die Admin Console geöffnet. Das FileMaker-Ereignisprotokoll bestätigt `Opened database "flashterm-dev"` (25.09.2026, 10:56:25 UTC). Die STAGE-Zuordnung und der Export sind noch offen.

Nachtest-Artefakte: `outputs/ionos-followup-20260925/`. `followup-node-v4-result.json` und `followup-windows-v4-result.json` wurden vom Testserver lokal gesichert. Keine Zugangsdaten oder Tokens werden in Berichte geschrieben.

### Vorbereitung des vollständigen dev-Exports

Die Anmeldung an der gehosteten `flashterm-dev` wurde durch den Benutzer durchgeführt. Die FileMaker Data API bestätigt mit dem vorhandenen technischen Lesekonto `LAYOUT_CHECK_PASSED`. Die fehlende optionale Hyperlink-Spalte wird nur als Hinweis gemeldet.

`configure-auto-publication.ps1` wurde anschließend erfolgreich für `flashterm-stage-dev-test` angewendet: Quelle `flashterm-dev`, Ziel `DEV-STAGE`, Dienst nach Konfiguration erreichbar. Der neue Trigger-Schlüssel bleibt ausschließlich in den geschützten Einstellungen. Der bisherige mbraun-Dienst wurde nicht umkonfiguriert.

Die vorhandene Mandantenansicht zeigt einen Datensatz und noch leere STAGE-Konfigurationsfelder. Für die einmalige Initialisierung ist ein begrenztes Testskript vorbereitet (`pair-dev.mjs`, gestartet durch `run-pair-dev.ps1`): exakte Quelle und Zielinstanz prüfen, genau einen Mandanten ID 11 verlangen, bestehende Zuordnung/offene Auftragsreferenz ablehnen, Änderung mit FileMaker-`modId` gegen zwischenzeitliche Änderungen schützen, anschließend alle gesetzten Werte intern zurücklesen und vergleichen. Der Schlüssel wird ausschließlich im HTTPS-Request übertragen. Die Administratoranmeldung erfolgt einmalig über einen Passwortdialog und stdin; sie wird nicht gespeichert. Der Benutzer hat den Dialog bestätigt. Der erste Zuordnungsversuch konnte sich anmelden, scheiterte aber bereits beim Lesen von `AT_Mandant` mit FileMaker-Code 105 / HTTP 500. Ergebnis: `configurationChanged: false`, `loggedOut: true`. Der exakte Layoutname und das vorhandene Layout wurden anschließend im FileMaker-Client geprüft; keine Layoutänderung vorgenommen. Der Benutzer bestätigte anschließend, beim ersten Versuch Inspector verwendet zu haben. Ein weiterer Anmeldeversuch für die administrative Zuordnung wurde bereits beim Login mit FileMaker-Code 212 abgelehnt; `configurationChanged: false`. Es erfolgte kein Schreibzugriff. Der Anmeldedialog wurde für die Prüfung des exakten Dateikontos erneut geöffnet. Die Zuordnung und der Export bleiben offen.

Dieses Skript ist ein betreuter IONOS-Testablauf, noch kein allgemeiner Einrichtungsassistent. Die Datei-Anmeldung im FileMaker-Client wird nicht als Data-API-Sitzung wiederverwendet. API-Schreibverhalten gemäß [Claris: Edit a record](https://help.claris.com/en/data-api-guide/content/edit-record.html).

## Nachtrag 26.09.2026: Setup-Konto und Zuordnung erfolgreich

Nach ausdrücklicher Zustimmung wurde STAGE Setup als Konto und Berechtigungssatz in der gehosteten flashterm-dev eingerichtet. Das Passwort setzte der Benutzer. Lesen und Bearbeiten sind auf Mandant ID 11 beschränkt, Erstellen und Löschen gesperrt. Nur die acht STAGE-Konfigurationsfelder sind veränderbar; ID und stageLastJobID sind nur lesbar. Alle übrigen Felder und Tabellen bleiben gesperrt. Nur AT_Mandant ist als Layout anzeigbar; die Datenbearbeitung unterliegt den Feld- und Datensatzgrenzen. Keine Script-, Wertelisten- oder Administrationsrechte; Data API über fmrest.

Der vorbereitete Zuordnungstest meldete in der Serverkonsole für flashterm-dev / DEV-STAGE: phase paired, configurationChanged true, keyVerified true, loggedOut true. Alle gesetzten Werte wurden intern zurückgelesen. Anschließend wurde das Setup-Konto deaktiviert und mit OK gespeichert.

Der native Export mit Deutsch und Englisch über Publish to flashterm STAGE meldete anschließend: Die Veröffentlichung ist online. Im Serverbrowser wurde https://stage.flashterm.test:18447/flashterm.html ohne Zertifikatswarnung geöffnet. Die Suche nach Beleuchtung lieferte einen Treffer; die Detailansicht zeigte Beleuchtung / Lighting, Concept ID 100192 und den deutschen Definitionstext. Damit ist der native Export bis zur nutzbaren Browseranzeige bestätigt. Keine Änderung der bisherigen mbraun-Instanz.

## Nachtrag 26.09.2026: Ursache der fehlenden Bilder

Am Beispiel Kräuterseitling (Concept ID 100001) geprüft: Das Bild ist in der gehosteten `flashterm-dev` vorhanden. `S2_Begriff::figureFileName` liefert `100001.jpg`, aber `HoleContainerAttribute ( S2_Begriff::figureExtern; "storageType" )` liefert `Embedded`. Die erste dev-Veröffentlichung enthielt keine Assetdateien. Der Definitions-Export liest den Bildverweis aus `externalFiles`; bei eingebetteten Bildern fehlt dieser Verweis.

Die für den Transport erstellte eigenständige Kopie hatte die externe Speicherung des Felds `Concept::figureExtern` deaktiviert. Der vorhandene Zielordner blieb `[gehosteter Speicherort]/Files/Images`, offener Speicher mit leerem Unterpfad. Diese bestehende Speicherdefinition wurde für genau dieses Exportbildfeld wieder aktiviert. Andere Containerfelder wurden von der Übertragung ausgeschlossen. FileMaker meldete anschließend Status Erledigt, 26 übertragen, 0 übersprungen. Der folgende Export scheiterte zunächst, weil der Bildabruf über den vorhandenen FileMaker-Origin mit HTTP 404 antwortete.

Nach ausdrücklicher Benutzerfreigabe wurde ein auf `flashterm-dev` begrenztes IIS-Verzeichnis ergänzt. Die URL-Rewrite-Sperre verlangt zugleich REMOTE_ADDR und LOCAL_ADDR 127.0.0.1, SERVER_PORT 18443 und einen numerischen Bilddateinamen mit erlaubter Erweiterung. Verzeichnisauflistung ist aus. Zuordnung und Beschränkung wurden gemeinsam gespeichert. IIS-Sicherung: `stage-dev-images-20260926-103511`. Rücknahme gezielt über `configure-dev-images.ps1 -Rollback`; Quellbilder bleiben erhalten. Erster erlaubter Abruf: HTTP 200, image/jpeg, 18.131 Byte für 100001.jpg. Sperrtests über HTTP-Port 80 sowohl mit 127.0.0.1 als auch mit der öffentlichen Serveradresse: HTTP 403. Beide Aufrufe wurden auf dem Server selbst durchgeführt; ein unabhängiger externer Clienttest bleibt offen. Der direkte HTTPS-Test auf Port 443 scheiterte vor der HTTP-Anfrage an der dortigen Zertifikatskette; daraus wird kein HTTP-Sperrnachweis abgeleitet. Kein Zertifikatsprüfungs-Bypass vorgenommen. Der erneute native Export meldete „Die Veröffentlichung ist online“ (BACKSTAGE-9ad63019-564e-2e4b-8957-3c1d87167fcd). Nach Neuladen von STAGE auf Port 18447 und Suche nach Kräuterseitling erschien das korrekte Pilzbild in der Concept-Ansicht 100001. Damit ist der Bildexport bis zur sichtbaren Browseranzeige bestätigt. Keine Änderung an der mbraun-Instanz und keine Änderung an FileMaker-Scripts nötig.

Für künftige Übertragungen gehört die Prüfung der Container-Speicherart und eines realen Bildexports zum Ablauf. Eine eigenständige Kopie bettet externe Container ein; siehe [Claris: Containerfelder](https://help.claris.com/en/pro-help/content/container-fields.html) und [Containerdaten übertragen](https://help.claris.com/en/pro-help/content/transferring-container-data.html).

## Noch offen

1. Allgemeine FileMaker-Zuordnung im Installationsassistenten. Der betreute Zuordnungstest für `flashterm-dev` ist inzwischen erfolgreich (Nachtrag 26.09.); die Integration in den allgemeinen Assistenten bleibt offen.
2. Export der gehosteten `flashterm-dev`-Kopie bis zur Browseranzeige am 26.09. erfolgreich. Der Nachweis mit Bild beim Kräuterseitling ist ebenfalls erfolgreich (Nachtrag Bilder). Der vorhandene mbraun-Knopf bleibt auf seinem bisherigen Ziel.
3. Vollständiger Windows-Neustart mit FileMaker und STAGE; bisher Dienstneustarts geprüft.
4. Späterer Client-/VPN-Test einschließlich Zertifikatsvertrauen und tatsächlicher Netzgrenze. Laut Benutzer derzeit kein separater Testclient vorhanden.
5. Wiederaufnahme der Einrichtung, verständlichere Fehlerdiagnose, signierte und freigegebene Auslieferung. Laut Benutzer kein Code-Signing-Zertifikat vorhanden bzw. bekannt. Keine Beschaffung beauftragt.

### Weitere Eingrenzung der Anmeldeablehnung

Ein zweiter administrativer API-Anmeldeversuch wurde ebenfalls mit 212 abgelehnt, ohne Schreibzugriff. Der vorhandene Schema-Nachweis `flashterm-dev-after-stage-config.xml` vom 20./21. September zeigt für das erweiterte Recht `fmrest` ausschließlich die Berechtigungsgruppe Inspector (ID 28). Administrator, flashterm Service und [Full Access] sind dort nicht eingetragen. Das ist ein konkreter Hinweis auf eine fehlende API-Freigabe und kein Beleg für ein falsch eingegebenes Passwort. Die aktuellen Rechte der gehosteten Kopie müssen noch direkt geprüft werden. Es wurden keine API-Rechte erweitert.

Die gehostete `flashterm-dev` wurde erneut geöffnet und ihre Sicherheit direkt geprüft: `fmrest` ist auch dort ausschließlich Inspector zugewiesen. Das Konto `flashterm Service` verwendet [Voller Zugriff]; dieser Berechtigungsgruppe fehlt `fmrest`. Der Bearbeitungsdialog wurde zur Prüfung geöffnet, aber keine Freigabe geändert oder gespeichert. Eine zeitweilige API-Freigabe nur für dieses Vollzugriffskonto, mit anschließendem Entzug nach Zuordnung, wurde dem Benutzer zur ausdrücklichen Entscheidung vorgelegt.

### Temporäre Freigabe nach ausdrücklicher Zustimmung

Der Benutzer hat die zeitweilige Freigabe ausdrücklich erlaubt. In der gehosteten `flashterm-dev` wurde `fmrest` zusätzlich ausschließlich für [Voller Zugriff] aktiviert; das zugeordnete aktive Konto heißt `flashterm Service`. Die eigene Berechtigungsgruppe gleichen Namens und Administrator wurden nicht freigegeben. Die vorherige Inspector-Freigabe bleibt erhalten. Änderung in der Sicherheitsverwaltung gespeichert.

**Rücknahme erledigt:** Auch nach der temporären Freigabe und erneuter Benutzereingabe endete der Versuch in der Phase `login` mit Code 212, `configurationChanged: false`. Die zusätzliche `fmrest`-Freigabe für [Voller Zugriff] wurde danach wieder entfernt. In der Übersicht stand wieder ausschließlich Inspector; beide Sicherheitsdialoge wurden mit OK bestätigt und geschlossen. Die Zuordnung bleibt unverändert und der vollständige Export ist nicht getestet. Die fehlende API-Freigabe war somit nicht die einzige Ursache. Die verbliebene Anmeldeursache ist nicht geklärt; keine weiteren automatischen Anmeldeversuche.


## Nachtrag 26.09.2026: Umstellung auf Originalbilder abgeschlossen

`flashterm-dev` / `DEV-STAGE` verwendet jetzt `Concept::figure` über das neue Layout `imageAPI`. Inspector erhielt nach ausdrücklicher Freigabe ausschließlich Leserechte auf ID, figure und figureFileName sowie das Layout. Die FileMaker-Scripts wurden gesichert und angepasst: Der bisherige Bildkopierschritt gibt sofort Erfolg zurück; die Definitionsaufbereitung liest den Originaldateinamen. Bestehende figureExtern-Daten bleiben erhalten.

Der native Export veröffentlichte `BACKSTAGE-f012b9aa-7686-264a-8043-1e0ad0f5231c`: zwei Sprachen, 53 Begriffe, 133 Benennungen und 26 Bilder. Alle veröffentlichten Bilddateien wurden erfolgreich gelesen. Kräuterseitling (100001, 18.131 Byte) stimmt bytegenau mit dem Originalcontainer überein. Die zuvor ergänzte lokale IIS-Bildroute wurde entfernt; der Bildvergleich blieb erfolgreich. Nach Neuladen und erneuter Suche zeigt der Serverbrowser das Bild korrekt an. mbraun blieb unverändert.

Die gezielten automatisierten Prüfungen für Bildabruf, Zuordnung, Veröffentlichung und Einrichtung sowie Syntax und Diff waren erfolgreich. Details und Rückfallstand: [Originalbild-Export](original-image-export.md). Dieser Nachtrag beschreibt den aktuellen Stand und ersetzt für DEV-STAGE den früheren Umweg über figureExtern und den zusätzlichen Bildpfad.
