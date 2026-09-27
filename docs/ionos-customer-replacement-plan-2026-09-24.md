# IONOS-Generalprobe und Austausch der bisherigen Kunden-STAGE

Stand: 25. September 2026, nach erfolgreichem lokalen MBRAUN-Publikationstest. Kundentermin nächste Woche, also 28. September bis 4. Oktober; Tag und Wartungsfenster offen. Dieser Plan ersetzt für den Kundenfall die bisherige Annahme einer reinen Neuinstallation.

## Ziel und Vorgehen

Die aktuelle STAGE wird zunächst mit MBRAUN auf IONOS geprüft. Beim Kunden wird eine separate neue Instanz vorbereitet, mit dem aktuellen Kundenbestand abgenommen und anschließend die bisherige Adresse auf die neue Instanz umgeschaltet. Die Altinstallation bleibt für den Rückweg erhalten.

Der vorhandene [Windows-Installer](windows-customer-installer.md) unterstützt ausschließlich frische Ziele und weist vorhandene Verzeichnisse, Dienste, Sites und belegte Ports ab. Er ist kein Upgradeprogramm. Deshalb weder alte Anwendungsverzeichnisse überschreiben noch den Installer mit den alten Zielpfaden starten. Eine gehostete Kunden-Datenbank wird nicht durch die ältere IONOS-Testkopie ersetzt.

## Tatsächlich bekannter Ausgangsstand

| Punkt | Nachweis / Grenze |
| --- | --- |
| TeamViewer am 24.09. | Sitzung `FTSTAGE-TEST` erreichbar; administrative Windows-PowerShell bedienbar |
| Erfassungsscript am 24.09. | Per TeamViewer auf IONOS getestet; Windows Server 2025 Build 26100, FMS `26.0.2.219`; elf Abschnitte vollständig erfasst; Syntax und Überschreibschutz bestanden. Bericht in `outputs/ionos-inventory-20260924/` |
| Dienste am 24.09. | `FileMaker Server` und `flashterm-stage-local`: Running, Automatic |
| Lokale STAGE | Listener `127.0.0.1:8200`; nach erfolgreicher Publikation am 25.09. HTTPS-Health `ok`, MBRAUN aktiv. Browser-Suche und Begriffsanzeige bestanden |
| Lokales HTTPS am Abend des 24.09. | Eigene IIS-Site `flashterm-stage-tls-test`, nur Loopback; `https://stage.flashterm.test:18444` mit eigener Test-CA. Health, Browservertrauen und Ablehnung ohne Trigger-Schlüssel bestanden; später CRL auf Loopback-Port 18445 ergänzt und strenge Sperrprüfung bestanden. FileMaker-IIS unverändert. [Nachweis und Rückweg](ionos-test-certificate-2026-09-24.md) |
| Installierter Paketstand | Laut Einrichtung vom 20.09. `20260920.01-ionos-test`; vor weiterer Installation Integrität erneut prüfen |
| MBRAUN auf IONOS | Hosting, serverseitiger HTTPS-Trigger und Data-API-Leseweg durch erfolgreiche Publikation am 25.09. nachgewiesen |
| MBRAUN-Veröffentlichung | Erfolgreich am 25.09., 00:33 MESZ: Auftrag `065df7a1-cb05-3548-b024-3bfde53216cc`, Status lokal und per HTTPS `succeeded`, identische Publication aktiv. 107 Concepts, 198 deutsche und 222 englische Terme. Suche und `exhaust gas / Abgas` mit Definition im Browser geprüft. [Reparatur und Nachweise](ionos-job-recovery-2026-09-25.md) |
| Neuere FileMaker-Anbindung | Mandantenkonfiguration Version 1/Revision 2; installierter MBRAUN-Helper frisch gesichert mit 204 Schritten. HTTP serverseitig via PSoS und HTTPS. Gesamtlauf Reservierung → Aufbereitung → Publikation erfolgreich. Separate einmalige Wartungsroutine ID `14794` ergänzte die kontrollierte Bereinigung der alten lokalen Vormerkung; regulärer Helper/Export unverändert |
| Kundeninstaller auf IONOS | Bisher nur lokale Betriebsprüfung; keine vollständige IIS-/TLS-/Client-/Netzgrenzenabnahme |
| Kunde | Laut Auftrag läuft bereits eine alte STAGE; Version, URL, Architektur, Serverdetails und Wartungsfenster sind zu erfassen |

Die Bestandserfassung am 24.09. startete keine Veröffentlichung und änderte keine Installation. Am Abend folgten die separat dokumentierte lokale HTTPS-Testeinrichtung und das Ergänzen der FileMaker-Trigger-Adresse. Der spätere Veröffentlichungsversuch scheiterte vor der Reservierung, zunächst an der Zertifikatsprüfung, nach deren Korrektur an der Authentifizierung. Nach erneuter Schlüsseleingabe und freigegebener, eng begrenzter Bereinigung der alten Vormerkung wurde die Veröffentlichung am 25.09. erfolgreich abgeschlossen. Ältere Details und Paketprüfsummen: [Vorbereitung vom 20.09.](customer-installation-2026-10.md).

## Phase 1 – Bestand und verbindlichen Kandidaten festlegen

1. [Fragebogen und Erfassungsscript](customer-installation-questionnaire.md) vor dem Kundentermin auf dem Kundenserver einsetzen; die Erprobung des Scripts auf IONOS ist am 24.09. erfolgt. Fehlende Angaben manuell ergänzen. Bisherige URLs einschließlich Unterpfaden und Anpassungen erfassen.
2. STAGE-Arbeitsänderungen prüfen und ein eindeutig identifiziertes Paket mit Manifest und ZIP-SHA-256 festlegen. Das vorhandene Testpaket ist eine Ausgangsbasis, noch keine Kundenfreigabe. Für Generalprobe und Kunde denselben freigegebenen Paketstand verwenden. Kein Commit/Push ohne Auftrag.
3. BACKSTAGE-Script-/Schemafassung gesondert festlegen. Die neuere konfigurierbare Anbindung zuerst in einer isolierten gehosteten dev-Testdatei Ende zu Ende abnehmen, anschließend kontrolliert auf eine konsistente MBRAUN-Testkopie übertragen. Beim Kunden sollen Einstellungen gepflegt werden; manuelle kundenspezifische Scriptformeln sind keine Releasevorlage.
4. Prüfen, ob beim Kunden überhaupt eine FileMaker-Strukturmigration notwendig ist. Falls ja, getrennte neue Zieldatei und Datenübernahme planen; aktuelle Fachdaten, Mandant, Sprachen, Bilder, Konten/Rechte und Kundenanpassungen vergleichen. Der vollständige Restore-Lauf ist gesondert zu testen.

**Besonderheit bei Restore/Kopien:** Der geprüfte Mandantenimport übernimmt vorhandene `stage*`-Felder einschließlich Aktivierung, Schlüssel und offener Aufträge. Er deaktiviert diese nicht automatisch. Alte Quellen ohne solche Felder sind noch nicht praktisch abgenommen. Kopien daher isolieren, vor Veröffentlichung Quelle/Ziel/Host prüfen und kontrolliert einrichten; keine offenen Aufträge blind löschen oder fremde Schlüssel übernehmen. Restore nur in der vorgesehenen neuen Zieldatei starten, niemals versehentlich im produktiven Original.

## Phase 2 – IONOS kundengleich vorbereiten

1. Bestehenden lokalen Testdienst und MBRAUN-Stand sichern. FileMaker-Dateien konsistent über FileMaker-Backup beziehungsweise eine geschlossene/native Kopie sichern; keine laufende `.fmp12` per Dateikopie sichern. Anwendung, Konfiguration und Daten getrennt erfassen.
2. Für den Installer eine nachweislich abgeschottete Testumgebung mit zugewiesener nicht-Loopback-IP, Test-DNS, passendem vertrauenswürdigem Zertifikat und separatem Testclient bereitstellen. Der bisherige öffentliche Server mit Loopback-STAGE bildet das Kundenintranet noch nicht ab. Keine öffentliche STAGE ohne Personenanmeldung freigeben.
3. Eigene neue Instanz-ID, freier Port und unbenutzte Verzeichnisse wählen. Installer zunächst ohne `-Apply` ausführen. Netzgrenze, DNS/TLS, Integrität und unveränderte FileMaker-Site müssen bestätigt sein.
4. Neuinstallation mit `-Apply`, danach Dienst, IIS, Browserzugriff und FileMaker-Koexistenz prüfen. Für den neuen FileMaker-Helper einen vom FileMaker Server erreichbaren HTTPS-Endpunkt konfigurieren; der bisherige lokale HTTP-Port ist dafür nicht ausreichend. Keine Zertifikatsprüfung abschalten.
5. Abgenommenen BACKSTAGE-Stand zuerst mit isolierter dev-Quelle, dann mit MBRAUN-Testdaten einrichten: dauerhafte Mandanteneinstellungen, passende serverseitige Quellen-/Zielzulassung, eigenes Trigger-Secret und technischer Data-API-Lesezugang. Secrets ausschließlich im geschützten Einrichtungsweg.

## Phase 3 – Generalprobe mit dokumentierten Ergebnissen

| Test | Erwartetes Ergebnis |
| --- | --- |
| Erstveröffentlichung | Lokaler IONOS-Test am 25.09. bestanden: Exportbutton → Reservierung → Aufbereitung → Publikation; `succeeded` und aktive Publication separat bestätigt. Kundengleiche Netz-/Clientumgebung noch offen |
| Inhalte | IONOS-Bestand bestätigt: 107 Concepts, de-DE 198 / en-GB 222 Terme; `exhaust gas / Abgas` mit Definition sichtbar. Weitere fachliche Stichproben und Master-/Standardsprache noch abnehmen |
| Oberfläche | Suche, Begriff, HTML-Fachinformation, Bilder, Wiki/Inspector/Translator, CSV/XLSX/JSON und Manual gemäß vorhandenem Funktionsumfang |
| Freigaben | Gesperrte Begriffs-/Sprachgruppen fehlen; leere/fehlerhafte Auswahl überschreibt keinen guten Bestand unkontrolliert |
| Falsche Zuordnung | Lokale Kopie, falscher Host/Name, deaktivierte/unvollständige Konfiguration und falscher Schlüssel führen zu keinem unzulässigen Export |
| Wiederholung und Störung | Doppelaufruf/zweiter Benutzer, Verbindungsabbruch, Statuswiederaufnahme mit gleicher ID, Dienstneustart; kein falscher Erfolg, keine zwei konkurrierenden Aufbereitungen |
| Betrieb | FileMaker-Zugriff erhalten; Start nach abgestimmtem Serverneustart; Browser eines separaten erlaubten Clients funktioniert |
| Abschottung | Unerlaubter externer Client erhält keinen Intranet-Lesezugriff; keine neuen öffentlichen Node-Ports |
| Restore | Getrennte Wiederherstellung liefert dieselbe aktive Publication samt Bildern; Dienstkonfiguration und FileMaker-Sicherung separat wiederherstellbar |
| Versionswechsel | Alt-STAGE beziehungsweise repräsentative alte URL vorhanden; auf neue Instanz umschalten, alte Links testen und Rückschaltung praktisch nachweisen |

Eine bloß frische Installation auf IONOS reicht für den Kundenfall nicht: Auch die Umschaltung einer bestehenden URL muss geprobt werden. Falls keine kundengleiche Altinstallation verfügbar ist, diese Abweichung ausdrücklich dokumentieren und beim Kunden zusätzliche Vorabtests einplanen.

Pro Test Release-ID, Datenrevision, Zeitpunkt, Ergebnis und Nachweisort festhalten. Bis zur Abnahme bleibt die Umschaltung beim Kunden offen.

## Phase 4 – Kundeninstallation und Umschaltung

1. **Vorbereitung außerhalb des Wartungsfensters:** Bestand abschließen; Paket übertragen und Hash prüfen; neue Pfade/Port/Service-ID festlegen; DNS-/Zertifikats-/Testzugang vorbereiten. Kundenbackup, Restore-Verantwortlichen und Wiederzugang bestätigen.
2. **Separate Instanz aufbauen:** Preflight, frische Installation, technische Anbindung und Veröffentlichung unter einem abgestimmten internen Testzugang. Produktive Alt-STAGE bleibt erreichbar. Kundenspezifische Änderungen dokumentieren.
3. **Wartungsfenster:** Fachliche Änderungen/Exporte für einen klaren Zeitpunkt einfrieren; aktuelle konsistente FileMaker-Sicherung und Alt-STAGE-/IIS-Konfiguration sichern. Falls erforderlich den bereits erprobten Datenübernahmelauf in die neue FileMaker-Zieldatei durchführen. Erstveröffentlichung mit finalem Datenstand und fachliche Abnahme.
4. **Bisherige Adresse übernehmen:** Exakte Maßnahme nach Bestandsaufnahme festlegen. Bei eigener alter STAGE-Site das alte Binding kontrolliert freigeben und der neuen Site zuordnen. Bei altem Unterpfad innerhalb einer gemeinsam genutzten Site ist ein gesondert getesteter Routingplan erforderlich; der Installer erzeugt eine eigene Site und bietet keine automatische Unterpfadmigration. FileMaker-Bindings nicht beiläufig ändern.
5. **Unmittelbare Prüfung:** Bisherige Einstiegsadresse und bestehende Direktlinks, Browser mit frischem Laden, Suche, Bilder, Exporte, FileMaker-Zugriff sowie erlaubter/unerlaubter Client. Origin/URLs der neuen Instanz müssen dem endgültigen Host entsprechen.
6. **Abnahme und Betrieb:** Verantwortlicher bestätigt; Backupplan, Wiederanlauf, Zertifikatserneuerung und Rückweg übergeben. Alte Dateien/Dienste zunächst aufbewahren; Bereinigung erst nach gesondertem Auftrag.

Bei gleichem Server ist DNS allein kein Umschaltmechanismus, solange sich das IIS-Routing nicht ändert. Bei einem DNS-Wechsel dessen TTL und Zwischenzustand einplanen. Bestehende Pfade nur nach ausdrücklicher Abstimmung ändern.

## Rückweg und Abbruchkriterien

Vor dem Eingriff eine konkrete späteste Rückschaltzeit und einen Entscheider festlegen. Bei fehlendem Backup, ungeklärter Netzgrenze, fehlgeschlagener Veröffentlichung, fehlerhaften Kernfunktionen oder beeinträchtigtem FileMaker-Zugriff nicht umschalten beziehungsweise rechtzeitig zurückschalten.

Für die Rückschaltung neue Veröffentlichungen stoppen, das dokumentierte alte Binding/Proxyziel wiederherstellen und die Alt-STAGE unter ihrer bisherigen URL prüfen. Wurde auch die FileMaker-Dateistruktur gewechselt, deren Rückweg separat ausführen; zwischenzeitliche Fachdatenänderungen dürfen nicht durch Einspielen einer alten Sicherung verloren gehen. Deshalb gilt die Schreibpause bis zur Abnahme oder erfolgten Rückkehr. FileMaker Server und globales IIS bleiben nach Möglichkeit in Betrieb; kein pauschales `iisreset`.

Ein STAGE-Datenbackup erfolgt mit gestopptem **betroffenem STAGE-Dienst** und instanzspezifischem `-ServiceName`; das bestehende Backupscript ist keine vollständige Sicherung von FileMaker, Konfiguration, Zertifikaten oder Alt-Webdateien.

## Zeitplanung und offene Freigaben

Planungsansatz, keine Zusage: Bestandserfassung etwa 30–60 Minuten; Vorbereitung, BACKSTAGE-Abnahme und IONOS-Generalprobe separat vor dem Kundentermin. Für den Kundenwechsel zunächst 2–4 Stunden plus vereinbarte Rückfallreserve einplanen und nach der Generalprobe neu schätzen. Datenmigration, DNS/TLS und offene FileMaker-Tests können den Aufwand wesentlich verändern.

Vor Kundentermin erforderlich: vollständig ausgefüllte Erfassung; freigegebene STAGE- und BACKSTAGE-Stände; erfolgreiche MBRAUN-Veröffentlichung (lokal auf IONOS am 25.09. bestanden); kundengleiche Installer-/Clientabnahme; geprüfte Sicherung, Umschaltung und Rückweg. Werden diese Punkte nicht rechtzeitig abgeschlossen, den Termin für Erfassung/Vorbereitung nutzen und den produktiven Austausch verschieben.

## Quellen im Arbeitsbestand

- [Kundeninstaller](windows-customer-installer.md), [bisheriger IONOS-Nachweis](customer-installation-2026-10.md), [FileMaker-Konfigurationsstrategie](filemaker-publication-configuration-strategy.md).
- BACKSTAGE: `tools/stage-publication/mandant-config/README.md` (Einbau 20./21.09.) und `tools/stage-publication/restore-audit/README.md` (Restore-Prüfung 21.09.). Diese Nachweise ersetzen keinen erfolgreichen Server-/Gesamttest.
