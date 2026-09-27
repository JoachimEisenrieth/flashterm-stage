# Centron: zweite automatische Veröffentlichung

Benutzerauftrag: flashterm-pariPharma auf Centron vs12261 zusätzlich zu fungi umstellen. Gemeinsamer STAGE-Zugang mit Auswahl beider Bestände ausdrücklich gewünscht.

## Feststellungen

- Geöffnete Datei heißt exakt flashterm-pariPharma.
- imageAPI lesbar: 260 Datensätze, Felder ID, figure, figureFileName.
- languageAPI lesbar: 34 Datensätze für de-DE.
- Vollständiger Lesetest scheitert an „Original image record is missing.“
- Abgleich: 236 eindeutige exportierte conceptID, 44 nicht in imageAPI vorhandene IDs. Beispiele 100015, 100024, 100030, 100039, 100051. Ursache noch offen: Exportbestand aktualisieren und/oder Layout/Datensatzrechte prüfen. Keine Datensätze löschen.
- Server erlaubt Publikationen TEST-TERMBASE und PARIPHARMA bereits.
- OAuth-Zugriff ist bisher getrennt über flashterm-stage-reader (TEST-TERMBASE) und flashterm-stage-paripharma-reader (PARIPHARMA). Keine Gruppenrechte geändert. Benutzer mit beiden Rechten können beide Bestände wählen; ausdrückliche gemeinsame Nutzerabsicht vor Änderung der konkreten Zuordnung berücksichtigen.

## Änderungen / Vorbereitung

- In FileMaker ausschließlich Publikationskennung von TEST-TERMBASE auf PARIPHARMA geändert und visuell bestätigt. Aktivierung bleibt 0, Dateiname und Host korrekt. Versions- und Revisionsfelder sind weiterhin leer; Eingabeversuch wurde von FileMaker abgelehnt. Trigger-Schlüssel nicht gelesen oder geändert.
- Lokal Unterstützung zusätzlicher fester Quelle/Ziel-Zuordnungen vorbereitet: publication-bindings.js, backstage-job-worker.js, stage-api.js, stage-server.js. Eigene Trigger-Schlüssel und getrennte Auftragsverzeichnisse; vorhandener fungi-Zugang bleibt kompatibel.
- 25 Tests erfolgreich (Bindings, Jobs, API), Syntax und diff geprüft. Keine Commits, kein Push, noch keine Bereitstellung dieser Erweiterung auf Centron.
- Inaktive Konfigurationsvorlage C:/ProgramData/flashterm-stage/publication-bindings.json auf Centron vorbereitet. Noch nicht in service.env eingebunden. Neues Secret muss vom Benutzer eingetragen werden, nicht in Antworten oder Protokolle übernehmen.

## Ausstehend

1. Getrennten zufälligen Trigger-Schlüssel durch Benutzer eintragen lassen, mindestens 32 Zeichen, im geschützten Serverfeld triggerToken und im geschützten FileMaker-Feld.
2. Serveränderungen ausschließlich als kleinen Patch zum tatsächlich installierten Stand übertragen; Sicherung und Kandidatenprüfung vor Dienstwechsel. FLASHTERM_PUBLICATION_BINDINGS_FILE auf geschützte Datei setzen, OAuth-Konfiguration erhalten.
3. FileMaker-Konfigurationsversion/Änderungsstand über geeigneten vorhandenen Einrichtungsweg setzen; Veröffentlichungsskripte auf neue Bildanbindung prüfen, Sicherung vor Änderungen.
4. Exportbestand aktualisieren; fehlende Originaldatensätze auflösen. Anschließend vollständiger Lesetest, native Veröffentlichung, Assetvergleich und Browserauswahl prüfen.
5. Keine automatische Löschung alter Bildfelder/Skripte ohne Prüfung und ausdrückliche Freigabe.

## Fortschritt nach Schlüsseleingabe

- Benutzer hat den neuen Schlüssel in Serverkonfiguration und FileMaker eingetragen. Serverprüfung bestätigt gültiges JSON, korrekte Quelle/Ziel und mindestens 32 Zeichen; kein Schlüssel ausgegeben. Durch Tastatureingabe entstandene Punkt-Präfixe vor JSON-Eigenschaften nach Sicherung korrigiert, Schlüssel unverändert.
- Strukturkopie `outputs/centron-paripharma-20260927/flashterm-pariPharma-before.xml` vollständig lesbar. Veröffentlichungsskript bereits 479 Schritte, STAGE Auftrag 204 Schritte, keine figureExtern-Verweise; imageAPI verwendet AT_Concept mit Originalbildfeldern.
- Kandidat unter `C:/ProgramData/flashterm-stage-paripharma-20260927/candidate` vorbereitet. Patch bestätigt angewendet; aktive Installation unverändert. Abschließende Kandidatenprüfung und Smoke-Test noch nicht bestätigt; vor Bereitstellung erneut prüfen.
- FileMaker stageConfigVersion und stageConfigRevision auf 1 gesetzt und Werte bestätigt. Versionsfeld dafür vorübergehend bearbeitbar gemacht, anschließend wieder „Nur anzeigen“ gespeichert. Revisionsfeld war bereits bearbeitbar und blieb unverändert. Aktivierung bleibt 0.
- Acronis-Fernsteuerung liefert bei Zustandsabfrage, Bildschirmaufnahme und erneuter App-Auswahl wiederholt timeoutReached (-10005). Keine aktive Serverbereitstellung und keine erfolgreiche pariPharma-Veröffentlichung bestätigt. Zum Fortsetzen Acronis-Sitzung wiederherstellen, Kandidatenprüfung beenden, dann Punkte 2 und 4 oben abarbeiten. Gemeinsame OAuth-Rechte weiterhin nicht geändert.

## Fortsetzung nach Wiederherstellung der Acronis-Sitzung

- Kandidaten-Syntax und lokaler HTTP-Smoke-Test erfolgreich: beide Schlüssel authentifizieren, ungültiger Schlüssel und fremde Quelle werden abgewiesen.
- Vier vorbereitete Dateien nach Sicherung in `C:/ProgramData/flashterm-stage-paripharma-20260927/backup` aktiviert. Vor Dienstwechsel alle vier bisherigen fungi-Aufträge im Status succeeded, keine offenen Reservierungen. service.env um FLASHTERM_PUBLICATION_BINDINGS_FILE ergänzt.
- Dienst flashterm-stage Running, /api/health auf Port 8100 HTTP 200. Prüfung über öffentliche HTTPS-Adresse liefert mit beiden gültigen Schlüsseln für unbekannte Auftragskennung 404. Sämtliche vorherigen Konfigurationswerte unverändert, authMode oidc bestätigt.
- FileMaker-Aktivierung jetzt 1. Benutzer bestätigte Deutsch als Standard; StandardQuellsprache auf de-DE gesetzt.
- Nativer Versuch angehalten: „Verbindung unklar“, Auftrag `b450aa5e-81ef-4374-83ad-34071ed096a2`, FileMaker-Phase reserving. Auf dem Server ist kein pariPharma-Auftrag angelegt. ID für nächsten Versuch beibehalten.
- Ursache für Schlüsselzuordnung bestätigt: SHA256-Vergleich des FileMaker-Schlüssels mit dem Server-Schlüssel ergibt False. FileMaker-Schlüssel hat 64 Zeichen; keine Schlüssel ausgegeben. Benutzer muss vorhandenen Serverwert triggerToken in das geschützte FileMaker-Feld übernehmen. Notepad mit publication-bindings.json und FileMaker-Mandantenlayout dafür geöffnet. Zugangsschlüsseleingabe bleibt Benutzeraktion.
- Ein zusätzlicher Diagnoseversuch über Data API auf AT_Mandant ist mit Code 105 gescheitert; keine Berechtigungen erweitert.
- Noch offen: Schlüsselabgleich durch Benutzer, derselbe native Auftrag, frischer Export und Prüfung der 44 fehlenden Originalzuordnungen, anschließend Browserauswahl und konkrete gemeinsame OAuth-Berechtigung.

## Erfolgreicher Abschluss

- Benutzer hat den Server-Schlüssel angeglichen; Fingerabdruckvergleich mit FileMaker bestätigt Übereinstimmung. Der Dienst hatte noch den alten Wert geladen (HTTPS-Prüfung zunächst 401 für pariPharma). Nach Prüfung auf offene Aufträge Konfiguration durch Dienstneustart geladen.
- Auftrag b450aa5e-81ef-4374-83ad-34071ed096a2 wurde angenommen, endete jedoch bei der Originalbildprüfung mit failed. Frischer Export: 229 eindeutige Begriffe, 43 ohne Originaldatensatz, keiner davon mit exportierter Bildreferenz.
- Nur lesender FileMaker-Abgleich: Concept-Tabelle 3235 Zeilen, davon 260 mit ID (260 eindeutige IDs, identisch zur imageAPI-Menge). Beispiel ID 100024 hat keinen Concept-Datensatz, aber 35 Term-Zeilen. Keine Quelldatensätze angelegt, geändert oder gelöscht.
- Gezielte Korrektur in original-container-assets.js: fehlenden Originaldatensatz ausschließlich für Begriffe ohne Bildreferenz in sämtlichen Sprachen akzeptieren. Bei referenziertem Bild weiterhin Abbruch. Regressionstest ergänzt; sieben Tests (Originalbilder und Veröffentlichung), Syntax und git diff --check erfolgreich.
- Kandidaten-Lesetest mit echten pariPharma-Daten erfolgreich: 229 Begriffe, 665 Benennungen, 2 Sprachen, 38 Bilder. Einzeldatei nach Sicherung unter backup/src/publishing aktiviert. Server-Patch hat dieselbe geprüfte Bedingung in kompakter Formatierung.
- Native Veröffentlichung erfolgreich: `BACKSTAGE-784c39e6-313f-4c9f-960b-5d51eada1d07`. FileMaker bestätigt „Die Veröffentlichung ist online“.
- Alle 38 veröffentlichten pariPharma-Bilder inklusive gespeicherter Prüfsummen lesbar. Aerosolerzeuger (Concept 100009, concept-100009.jpg) 7710 Bytes, bytegleich mit direkt gelesenem FileMaker-Original.
- fungi unverändert aktiv: `BACKSTAGE-306325cb-5174-48a2-9d90-53725dc8e02f`, 53 Begriffe, alle 26 Bilder geprüft.
- Browser mit bestehender Anmeldung: Wechsel zwischen pariPharma und TEST-TERMBASE erfolgreich; Aerosolerzeuger und Kräuterseitling jeweils mit Bild visuell bestätigt. TEST-TERMBASE trägt weiterhin den bisherigen Anzeigenamen „Demo-Terminologie“. Keine OAuth-Berechtigungen erweitert; das vorhandene angemeldete Konto kann beide Bestände wählen.
- Kein Commit, kein Push. Die vorstehenden offenen Punkte zu Schlüssel, Bildprüfung und Browserfunktion sind damit abgeschlossen.
