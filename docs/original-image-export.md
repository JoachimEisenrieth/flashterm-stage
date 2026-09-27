# Originalbilder für STAGE

Der neue Export liest `Concept::figure` über die FileMaker Data API. Er benötigt das Layout `imageAPI` auf `AT_Concept` mit `ID`, `figure` und `figureFileName`. Das Exportkonto erhält nur Leserechte auf diese drei Felder und das Layout; andere Concept-Felder sowie Erstellen, Bearbeiten und Löschen bleiben gesperrt.

Aktivierung je Installation: `FLASHTERM_FILEMAKER_IMAGE_SOURCE=container` in den geschützten Diensteinstellungen. Ohne diese Einstellung bleibt der bisherige Bildabruf aktiv. Die Einrichtung unterstützt entsprechend `-ImageSource container`; der Lesetest prüft dann auch das neue Layout.

STAGE übernimmt die Originalbilder innerhalb der FileMaker-Sitzung. Temporäre Bildadressen und Streaming-Cookies gelangen weder in die Veröffentlichung noch zum Browser. Weiterleitungen sind auf Streaming-Pfade desselben HTTPS-Origin begrenzt. Bildtyp und Dateigröße werden weiterhin geprüft. Leere Originalfelder entfernen auch veraltete Bildverweise; unterschiedliche Begriffe mit gleichem Quelldateinamen erhalten getrennte STAGE-Dateinamen.

Die Bilder der freigegebenen Veröffentlichung liegen weiterhin in STAGE. `figureExtern` und der zusätzliche öffentliche FileMaker-Bildpfad werden für diesen Modus nicht benötigt. Bestehende Felder erst nach Prüfung ihrer sonstigen Verwendungen und bestätigter Datensicherung entfernen.

## FileMaker-Anpassung

Der vorhandene Aufruf `Neue Abbildungen online stellen` bleibt für die Übergangsphase erhalten. Er gibt vor dem alten Kopierteil sofort das bisherige erfolgreiche JSON-Ergebnis zurück (`ok: 1`, `phase: Abbildungen`, `error: 0`). Er kopiert keine Bilder mehr. Der gesicherte alte Ablauf bleibt dadurch rücksetzbar; bestehende Aufrufer behalten ihre erwartete Rückgabe.

`JSON Definitionen erstellen` bezieht den Dateinamen mit `HoleContainerAttribute ( AT_Concept::figure; "filename" )` aus dem Original. Der neue STAGE-Abruf entscheidet anhand des Originalcontainers, ob ein Bild vorhanden ist; alte `fileName`-Werte aus der JSON-Aufbereitung werden dabei ersetzt.

## IONOS-Test am 26.09.2026

Nur `flashterm-dev` / `DEV-STAGE` wurde umgestellt. Das neue Layout und die begrenzten Inspector-Leserechte wurden nach ausdrücklicher Freigabe gespeichert. Vollständiger Lesetest erfolgreich: zwei Sprachen, 53 Begriffeinträge, 133 Benennungen, 26 Originalbilder. Der DEV-Dienst wurde mit gesicherten Vorgängerdateien aktualisiert und meldet gesund.

Beide FileMaker-Scriptanpassungen sind gespeichert. Die Veröffentlichung über „Publish to flashterm STAGE“ meldete „Die Veröffentlichung ist online“: `BACKSTAGE-f012b9aa-7686-264a-8043-1e0ad0f5231c`. Alle 26 veröffentlichten Assets wurden gelesen. Das Beispiel `concept-100001.jpg` (Kräuterseitling, 18.131 Byte) stimmt per SHA-256 bytegenau mit dem Originalcontainer überein.

Die zusätzliche lokale IIS-Bildroute wurde mit `configure-dev-images.ps1 -Rollback` entfernt; Quellbilder blieben erhalten. Der Originalbildvergleich war auch danach erfolgreich. Nach Neuladen der STAGE-Seite auf Port 18447 und erneuter Suche zeigte der Serverbrowser das Kräuterseitling-Bild korrekt an. Prüfbericht auf dem Server: `C:\ProgramData\flashterm-stage-original-images-20260926\verification.json`.

Das bisherige Bildskript bleibt als kompatibler Aufruf mit früher Erfolgsrückgabe erhalten; sein alter Kopierteil wird nicht mehr ausgeführt. `figureExtern` und seine bestehenden Daten wurden nicht gelöscht. Die mbraun-Instanz wurde nicht geändert.

Geschützter Rückfallstand auf IONOS: `C:\ProgramData\flashterm-stage-original-images-20260926\backup`. Dort liegen die bisherigen Programmdateien und Diensteinstellungen. Dieser Ordner enthält geschützte Einstellungen und darf nicht veröffentlicht werden.


## Lokale Bereinigung am 26.09.2026

Die anschließend vom Benutzer auf den Mac-Schreibtisch geholte `flashterm-dev.fmp12` wurde separat bereinigt. Vorher wurde mit FileMaker eine eigenständige Sicherung unter `outputs/local-dev-cleanup-20260926/flashterm-dev-before-cleanup.fmp12` erstellt; zusätzlich wurden Vorher- und Nachher-Strukturexporte gesichert.

Nach ausdrücklicher Löschfreigabe wurden `Concept::figureExtern` samt Bildkopien und die drei Skripte `Online stellen`, `Offline nehmen` und `Neue Abbildungen online stellen` entfernt. FileMaker entfernte die Feldbezüge auch aus dem Verwaltungs-Layout, der Berechtigung und zwei bestehenden Importzuordnungen. Die Schrittanzahl dieser Importscripts blieb unverändert. Aus `361X-B STAGE` wurden ausschließlich die bisherigen Zeilen 395–416 entfernt: Aufruf und Fehlerbehandlung des abgelösten Bildkopierschritts. Der Hauptablauf umfasst jetzt 479 statt 501 Schritte; der XML-Vergleich bestätigt den unveränderten Inhalt aller verbleibenden Schritte.

Im finalen Strukturexport gibt es keinen Verweis auf `figureExtern` mehr. `figure`, `figureFileName` und `imageAPI` sind erhalten; die ursprünglichen Felddefinitionen sind unverändert. Originalbilder wurden im lokalen FileMaker-Layout sichtbar geprüft. Ein vollständiger Veröffentlichungstest der bereinigten Datei steht nach erneuter Bereitstellung auf einem Testserver noch aus. Die gehosteten Dateien auf IONOS und Centron wurden durch diese lokale Bereinigung nicht verändert.


## Centron / flashterm-fungi am 26.09.2026

Die bereinigte Datei wurde vom Benutzer als `flashterm-fungi` auf Centron (`vs12261`) bereitgestellt. Die FileMaker-Zuordnung wurde auf diese Datei, den Host `vs12261`, `TEST-TERMBASE` und den HTTPS-Trigger der Centron-STAGE eingestellt. Den geschützten Trigger-Schlüssel hat der Benutzer selbst übernommen.

Vor der Umstellung wurden die installierten Exportdateien mit dem bekannten bisherigen Paket verglichen. Eine getrennte Kandidatenkopie las erfolgreich 53 Begriffe, 133 Benennungen, zwei Sprachen und 26 Originalbilder aus der gehosteten Datei; dabei wurde keine Veröffentlichung aktiviert.

Anschließend wurden drei Dateien (`publish-backstage.js`, `filemaker-data-api-client.js`, `original-container-assets.js`) unter `C:\Apps\flashterm-stage\current` aktualisiert und `FLASHTERM_FILEMAKER_IMAGE_SOURCE=container` gesetzt. Der Dienst `flashterm-stage` startete erfolgreich; die lokale Zustandsprüfung auf Port 8100 meldete `ok`. Die vorhandene OIDC-Konfiguration wurde vorab geprüft und blieb erhalten. Vorgängerdateien und geschützte Diensteinstellungen liegen auf Centron unter `C:\ProgramData\flashterm-stage-original-images-20260926\backup`. Dieses Verzeichnis enthält Secrets und darf nicht veröffentlicht werden.

In FileMaker wurde die Veröffentlichung aktiviert und mit den vorhandenen Optionen für Deutsch und Englisch gestartet. Centron zeigte für den neuen Auftrag am 26.09.2026 um 21:40:13 UTC den Zustand `succeeded`. Danach war der Mac gesperrt. Noch offen sind deshalb die sichtbare FileMaker-Abschlussmeldung, das Lesen aller veröffentlichten Assets, der bytegenaue Originalbildvergleich und die Bildanzeige im Browser. Der erfolgreiche Lesetest und Auftragsstatus ersetzen diese abschließende Sichtkontrolle nicht.

Nach Entsperren des Macs wurde die FileMaker-Meldung „Die Veröffentlichung ist online“ für `BACKSTAGE-306325cb-5174-48a2-9d90-53725dc8e02f` bestätigt. Die Serverprüfung las sämtliche 26 veröffentlichten Bilddateien; `concept-100001.jpg` (18.131 Byte) stimmt per SHA-256 mit dem Original in `flashterm-fungi` überein. Der aktive Stand enthält 53 Begriffe. Der Prüfbericht liegt auf Centron im geschützten Updateverzeichnis als `verification.json`. Die öffentliche HTTPS-Seite leitet korrekt zur bestehenden Auth0-Anmeldung weiter. Für die noch ausstehende sichtbare Bildkontrolle muss der Benutzer sich im geöffneten Chrome-Fenster anmelden.
