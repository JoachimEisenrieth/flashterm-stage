# Automatische Veröffentlichung nach FileMaker-Export

Abgleich am 2026-09-20: Serverimplementierung und FileMaker-Anbindung wurden am 2026-09-12 auf Centron im erfolgreichen Normalfall gemeinsam getestet. Die Abnahme einer eigenen Kundeninstallation sowie praktische Mehrbenutzer- und Unterbrechungstests bleiben offen.

## Nachweis aus BACKSTAGE

Maßgeblich ist im benachbarten BACKSTAGE-Projekt `tools/stage-publication/automatic-publication-status.md`, Abschnitt „Gehosteter Exportbutton-Test – 2026-09-12“. Die dortigen späteren Fortschrittsabschnitte und die einleitende Zusammenfassung überholen die älteren Zwischenstände „noch nicht eingebaut“.

- Exportbutton der gehosteten `flashterm-fungi` ausgeführt; Auftrag `succeeded`.
- 7 Sprachen, 56 Concepts, 236 Terms und 26 Assets übertragen und aktiviert.
- Aktive Publication unabhängig anhand des serverseitigen Aktivierungsprotokolls bestätigt.
- Installiert auf Centron: `20260912-auto-publish`; dieser Nachweis gilt nicht automatisch für IONOS oder eine Kundendatei.

Das Hilfsscript `STAGE Auftrag` und das Hauptscript `361X-B STAGE` müssen beim Kunden in ihrer finalen Fassung einschließlich Quellen-/Host-Zuordnung vorhanden sein. Die Sicherung `before-auto-publish-361X-B` ist ein Rückkehrstand, keine Installationsvorlage. Kundeneigene Schlüssel neu zuordnen; vollständige FMP-Kopien können den bisherigen Trigger-Schlüssel enthalten und dürfen nicht ungeprüft verteilt werden.

## Ablauf und Schnittstelle

Eine konfigurierte FileMaker-Quelle und ein STAGE-Ziel pro Dienst. Die Zugangsdaten liegen ausschließlich in der Serverkonfiguration. Der separate Trigger-Schlüssel erlaubt keine allgemeinen Admin-Aufrufe. HTTPS verwenden; Schlüssel nur als Authorization: Bearer Header übertragen, niemals in URLs oder Logs.

1. Vor Änderungen an API-Tabellen `POST /api/export-jobs` mit JSON `{ "id": "UUID", "sourceDatabase": "DATEINAME", "termbaseId": "ZIEL" }`. FileMaker erzeugt UUID einmal; Wiederholungen verwenden dieselbe Kennung.
2. Nur nach eindeutig bestätigtem Zustand `preparing` exportieren. Ein neuer Lauf erhält bei belegter Quelle 409. Lokale Kopien dürfen keine Veröffentlichung der online gehosteten Quelle auslösen.
3. Erst nach erfolgreichen, abgeschlossenen und gespeicherten Unterprogrammen `POST /api/export-jobs/UUID/ready`. Antwort 202 bedeutet angenommen, nicht veröffentlicht. Wiederholung startet keinen zweiten Lauf.
4. `GET /api/export-jobs/UUID` liefert `{job:{id,state,message,publicationId,...}}`. Erst `succeeded` ist Erfolg. Mit Abstand (z.B. 2 Sekunden) abfragen; bei Wartezeitüberschreitung Auftragskennung erhalten und später denselben Status abfragen.
5. Bei Exportfehler und sicher beendeten schreibenden Unterprogrammen `POST /api/export-jobs/UUID/cancel`. Eine laufende Veröffentlichung kann damit nicht abgebrochen werden. Bei unklarem Server-Scriptstatus Sperre beibehalten.

Zustände: preparing, running, succeeded, failed, interrupted, cancelled. Reservierungen verfallen absichtlich nicht. Vor manueller Freigabe eines abgebrochenen Exports prüfen, dass keine FileMaker-Sitzung mehr schreibt. Alle Exportwege müssen die Reservierung verwenden. Alte Clients/Unterprogramme, direkte manuelle Exporte oder manuelle Admin-Publikationen umgehen diese Koordination und dürfen nicht gleichzeitig laufen.

Der Hintergrunddienst verwendet den bestehenden Publisher mit direktem Publication-Store. Erst nach allen Daten und Bildern wird aktiviert. Fehlertexte enthalten keine Rohantworten oder Secrets. Aufträge liegen unter `FLASHTERM_STAGE_DATA/export-jobs`; nicht über statische Dateien erreichbar. Nach Neustart wird eine möglicherweise schon abgeschlossene Aktivierung geprüft; sonst bleibt ein unterbrochener Lauf gesperrt. Ein Prozess pro Datenverzeichnis; kein Betrieb mehrerer Serverinstanzen auf demselben Jobverzeichnis.

## Einrichtung

Zusätzlich zu den bestehenden STAGE-Variablen:

- FLASHTERM_EXPORT_TRIGGER_TOKEN: eigener zufälliger Schlüssel (mindestens 32 Byte).
- FLASHTERM_FILEMAKER_SERVER: HTTPS-Origin.
- FLASHTERM_FILEMAKER_DATABASE: gehostete Quelldatei ohne Erweiterung.
- FLASHTERM_FILEMAKER_USERNAME / FLASHTERM_FILEMAKER_PASSWORD: Data API Lesekonto.
- FLASHTERM_PUBLISH_TERMBASE / FLASHTERM_PUBLISH_TERMBASE_NAME: festes Veröffentlichungsziel.
- Optional FLASHTERM_PUBLISH_GUI_LANGUAGES (Standard de-DE,en-GB).

Ohne Trigger-Schlüssel bleibt der neue Endpoint deaktiviert (503); bestehende manuelle Veröffentlichung bleibt verfügbar. Kein config.js wird kopiert oder geändert. Service-Konfiguration einschließlich Zugangsdaten nur für Dienstkonto und Administratoren lesbar halten. Vor Änderung am Produktivdienst Datenbackup erstellen.

## FileMaker

Natives „Aus URL einfügen“, Dialog aus, SSL-Prüfung ein, Zielvariable vollständig ersetzen. JSON über --data @$stageJobBody, Schlüssel über einen Header, --connect-timeout 10 --max-time 30. Nach jedem Aufruf Fehlernummer sofort erfassen und Antwort-JSON sowie job.id und job.state prüfen. Bei unbekanntem Ergebnis nicht mit neuer UUID weitermachen. Keine MBS-Funktionen im Anwendungsscript.

Die native Ausgangskopie vor dem Umbau ist im Backstage-Projekt unter tools/stage-publication/backups/before-auto-publish-361X-B.fmxmlsnippet gesichert (403 Schritte). Der dokumentierte finale Einbaustand umfasst 486 Schritte im Hauptscript und 48 im Hilfsscript `STAGE Auftrag`. Auswahl-/Freigabe-/Mastersprachenlogik bleibt erhalten. Der Abschlussdialog meldet erst nach `succeeded`, dass veröffentlicht wurde.

## Prüfstand

176 automatisierte Tests am 2026-09-20 auf dem M1 bestanden, einschließlich Auftragsprüfungen für Parallelaufrufe, doppelte Auslösung, geschützte Zielzuordnung, Fehlerbereinigung, Neustartabgleich und Trennung von Trigger-/Admin-Zugang. Online-Normalfall auf Centron laut obigem BACKSTAGE-Nachweis bestanden. Praktische Fehler- und Mehrbenutzerabnahme sowie IONOS-Gesamttest weiterhin offen.

`deploy/windows/configure-auto-publication.ps1` ist noch auf den Centron-Piloten zugeschnitten: Dienst `flashterm-stage`, Port `8100`, feste Konfigurationsdatei und Test-Termbase. Nicht unverändert für den Kundeninstaller mit instanzspezifischem Dienst und Port `8200` verwenden.
