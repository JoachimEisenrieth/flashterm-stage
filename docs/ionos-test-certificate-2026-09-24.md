# STAGE-Testzertifikat auf IONOS

Am 24.09.2026 per TeamViewer auf `FTSTAGE-TEST` eingerichtet und mit aktiver Zertifikatspruefung getestet. Dies ist ein lokaler TLS-Test auf dem Server, noch keine vollstaendige Intranet-/VPN-Abnahme.

## Urspruengliche Einrichtung

- Testadresse: `https://stage.flashterm.test:18444`.
- Vorgesehene FileMaker-Trigger-Adresse: `https://stage.flashterm.test:18444/api/export-jobs`.
- Eigene IIS-Site und eigener Anwendungspool: `flashterm-stage-tls-test`.
- Ausschliessliches Site-Binding: `127.0.0.1:18444:stage.flashterm.test`; Reverse Proxy zum vorhandenen STAGE-Dienst auf `127.0.0.1:8200`. Die Rewrite-Regel prueft zusaetzlich die lokale Zieladresse.
- Hosts-Eintrag auf IONOS: `127.0.0.1 stage.flashterm.test`, mit eindeutigem Testmarker.
- Eigene Test-CA und davon signiertes Serverzertifikat. CA-Vertrauen nur im Windows-Zertifikatsspeicher dieses Testservers eingerichtet. Auf dem Mac wurde kein Zertifikat als vertrauenswuerdig installiert.
- Serverzertifikat gueltig bis **24.12.2026, 20:49:39 UTC**; Test-CA bis 25.12.2026. Keine automatische Erneuerung eingerichtet.
- Private Schluessel nicht exportierbar im Windows-Maschinenspeicher `My`. Es wurden ausschliesslich oeffentliche Zertifikate exportiert.
- Keine Aenderung an FileMaker-Zertifikat, vorhandenen IIS-Bindings, STAGE-Anwendung, Dienstkonfiguration oder Firewallregeln.
- In der gehosteten Datei `flashterm-mbraun (FTSTAGE-TEST)` die oben genannte vollstaendige Trigger-Adresse eingetragen und die Konfigurationsrevision von 1 auf 2 erhoeht. Speicherung im Layout visuell geprueft. Konfigurationsversion 1, Ziel `MBRAUN`, Quellenname und Host bleiben erhalten. Zum Zeitpunkt der Ersteinrichtung: Aktivierung 0, Trigger-Schluessel leer, keine Auftragsreferenz und keine Veroeffentlichung gestartet. Spaeterer Diagnose- und Betriebsstand siehe unten.

## Nachweise

| Pruefung | Ergebnis |
| --- | --- |
| Uebertragung des Einrichtungsscripts | SHA-256 auf Mac und IONOS identisch: `304db090b498cbbc4333ffcd13a1661be7c42a354393178a58f90c937cf1ad0a` |
| Windows-PowerShell | Script geparst und Inspect/Apply ohne Fehler abgeschlossen |
| HTTPS `/api/health` | `ok`, Windows-Zertifikatspruefung aktiviert |
| HTTPS `/api/export-jobs` ohne Zugangsdaten | HTTP 401; keine Veroeffentlichung ausgeloest |
| Edge auf IONOS | Health-Antwort `ok`, Anzeige `Connection is secure`, keine Warnung umgangen |
| Falscher Zertifikatsname `https://127.0.0.1:18444` | curl Fehler 60 / `SEC_E_WRONG_PRINCIPAL`, korrekt abgewiesen |
| Testname auf oeffentliche Server-IP aufgeloest | curl Fehler 35 / Verbindung zurueckgesetzt; kein STAGE-Inhalt geliefert |
| FileMaker-IIS-Site | Zustand und alle Bindings einschliesslich Zertifikatszuordnung mit Vorzustand identisch |
| Oeffentliche Zertifikate auf dem Mac | OpenSSL prueft Kette gegen exportierte Test-CA und Hostname erfolgreich; kein Systemvertrauen hinzugefuegt |

Die Gegenprobe ueber die oeffentliche Adresse wurde vom Server selbst ausgefuehrt. Sie ersetzt weder einen separaten externen Testclient noch den kuenftigen VPN-Test. Ein erfolgreicher Windows-/Browser-Test ist noch kein Nachweis fuer den serverseitigen FileMaker-Scriptaufruf oder eine MBRAUN-Veroeffentlichung.

## Dateien und Wiederholung

Lokale Nachweise: `outputs/ionos-tls-test-20260924/` mit `setup-stage-test-tls.ps1`, `inspection.json`, `manifest.json`, `verification.json` und den beiden oeffentlichen Zertifikaten (`.cer`, zusaetzlich lokal `.pem`). Dieser Ausgabeordner ist vom Git-Stand ausgeschlossen.

Auf IONOS:

- Script: `C:\Users\Administrator\Documents\setup-stage-test-tls.ps1`.
- Proxy, Nachweise, Hosts-Sicherung und oeffentliche Zertifikate: `C:\ProgramData\flashterm-stage-tls-test-20260924`.
- IIS-Konfigurationssicherung: `flashterm-stage-tls-before-20260924-204938`.

Erneute reine Betriebspruefung in administrativer PowerShell:

```powershell
C:/Users/Administrator/Documents/setup-stage-test-tls.ps1 -Mode Verify
```

`Apply` ist nur fuer eine frische Einrichtung vorgesehen und lehnt vorhandene Testressourcen ab. Das Script ist auf diesen konkreten Testserver beschraenkt und kein Kundeninstaller.

## Rueckweg und weitere Abnahme

Bei Bedarf zuerst nur die neue Site `flashterm-stage-tls-test` stoppen. Fuer einen vollstaendigen spaeteren Rueckbau ausschliesslich diese Site, ihren Pool, das zugehoerige SSL-Binding, den markierten Hosts-Eintrag sowie die beiden im Manifest identifizierten Zertifikate und das zugehoerige CA-Vertrauen entfernen. Vorher weitere Nutzung der Test-CA ausschliessen. Keine pauschale Wiederherstellung der globalen IIS-Sicherung und kein `iisreset`.

Noch erforderlich: erfolgreiche Authentifizierung des FileMaker-Aufrufs, MBRAUN-Vertrags-/Veroeffentlichungstest sowie ein separater Testclient mit privatem Netz/VPN. Der spaeter aktivierte Helper erreicht inzwischen den HTTPS-Endpunkt; die Veroeffentlichung ist noch nicht erfolgreich. Beim Kunden wird ein Zertifikat der Kunden-IT verwendet; die Test-CA ist keine Produktionsvorgabe.


## Diagnose des FileMaker-Aufrufs am spaeten Abend

Der Benutzer hat die Veroeffentlichung aktiviert und einen Trigger-Schluessel eingetragen. Version 1/Revision 2, Adresse, Quelle `flashterm-mbraun`, Host `FTSTAGE-TEST` und Ziel `MBRAUN` wurden im Layout geprueft. Der Auftrag `4dce9c0c-30cf-1e4a-93cc-c25d551c40ae` blieb unveraendert erhalten; FileMaker speichert den Zustand `reserving`.

- Um 21:17:11 UTC meldete `scriptEvent.log` im Helper `STAGE Auftrag` bei `Insert from URL` Fehler **1634** (Zertifikatspruefung).
- Das CA-Zertifikat war bereits im Windows-Maschinenspeicher `Root` vorhanden. Die urspruengliche Zertifikatskette scheiterte bei expliziter Online-Sperrpruefung mit `RevocationStatusUnknown`.
- Eine signierte Test-Sperrliste und ein neues Serverzertifikat mit CRL-Verweis wurden eingerichtet. Die vorhandene Test-CA wurde weiterverwendet, private Schluessel nicht exportiert.
- Neues Blattzertifikat: SHA-1-Fingerabdruck `FA60ADCB37BA64F1779B24A788BA599FADD7E9A3`. Neue IIS-Site und eigener Pool `flashterm-stage-test-crl`, ausschliesslich `127.0.0.1:18445:stage.flashterm.test`. CRL-Adresse: `http://stage.flashterm.test:18445/stage-test-ca.crl`. Die HTTP-Adresse stellt nur die signierte oeffentliche Sperrliste bereit; der STAGE-Trigger bleibt HTTPS.
- CRL und neues Serverzertifikat gueltig bis 24.12.2026, 20:49:39 UTC. Keine automatische Erneuerung. Die Test-CRL enthaelt keine widerrufenen Zertifikate.
- Frischer TLS-Handshake mit aktiver Sperrpruefung, praesentiertem neuen Zertifikat und HTTPS-Health erfolgreich; FileMaker-IIS-Bindings unveraendert.
- Beim erneuten FileMaker-Versuch mit derselben Auftragskennung um **21:38:57 UTC** folgte **1627** (Authentifizierung fehlgeschlagen). Der urspruengliche Zertifikatsfehler trat bei diesem Versuch nicht mehr auf. Kein FileMaker-Neustart und keine abgeschaltete Zertifikatspruefung.
- Authentifizierte Abfrage desselben Auftrags mit dem Dienstschluessel um 21:40:04 UTC: HTTP und HTTPS jeweils 404, Auftragsdatei fehlt, insgesamt 0 Auftragsdateien. Es wurde weiterhin kein STAGE-Auftrag reserviert und keine Veroeffentlichung gestartet.

Die Zertifikatsumschaltung wurde beim ersten Versuch durch einen Fehler im abschliessenden PowerShell-Pruefaufruf automatisch zurueckgenommen. Der korrigierte Aufruf `finish-stage-test-crl.ps1` schloss danach erfolgreich ab. Die erfolgreiche Umschaltung und Pruefung stehen in `C:\ProgramData\flashterm-stage-tls-test-20260924\crl-update.json`.

Nachweise und Diagnosescripts liegen lokal unter `outputs/ionos-trigger-diagnosis-20260924/`. Sie enthalten keine Zugangsdaten. Der API-basierte Schluesselvergleich konnte `AT_Mandant` nicht lesen (FileMaker-Code 105); auch die anschliessende Liste verfuegbarer Layouts enthielt keinen Mandanten-/Tenant-Treffer. Eine Kopie des maskierten UI-Felds lieferte keinen lesbaren Zwischenablagewert. Daher ist ein falscher Trigger-Schluessel eine moegliche Ursache, aber noch kein nachgewiesenes Vergleichsergebnis. Es wurden weder Rechte erweitert noch Layouts oder Schluessel veraendert. Vom Benutzer angefragt ist lediglich der Name des kopierten Konfigurationseintrags, kein Geheimniswert.

Beim spaeteren vollstaendigen Rueckbau auch die CRL-Site, ihren Pool und das neue Blattzertifikat aus `crl-update.json` beruecksichtigen. Die CRL-Site wird fuer die Sperrpruefung des aktiven Testzertifikats benoetigt und darf waehrend dessen Nutzung nicht stillgelegt werden.


Oeffentliche Nachweise unter `outputs/ionos-trigger-diagnosis-20260924/stage-diagnosis-evidence-20260924/`: neues Blattzertifikat, signierte CRL, `crl-update.json`, bereinigte FileMaker-Fehlercodes und API-Pruefergebnis. OpenSSL auf dem Mac bestaetigt sowohl die CRL-Signatur als auch Servername und Zertifikatskette mit aktiver CRL-Pruefung. Es wurde kein Vertrauen im Mac-System eingerichtet.

Einordnung der FileMaker-Fehlercodes: [Claris-Referenz](https://help.claris.com/en/pro-help/content/error-codes.html). Fuer den Aufruf von STAGE muss FileMaker dem Aussteller des STAGE-Zertifikats vertrauen; das eigene FileMaker-Serverzertifikat und der private STAGE-Schluessel werden dafuer nicht ausgetauscht.

## Fortsetzung am 25.09.2026

Nach erneuter Eingabe des Trigger-Werts durch den Benutzer stoppt der Wiederholungsversuch bereits mit `Configuration changed during an open job`. Der neue Schluessel wurde bei diesem Versuch noch nicht am HTTPS-Dienst geprueft. Erneute Dienstdiagnose bestaetigt dieselbe Auftragskennung als nicht vorhanden (authentifiziert HTTP/HTTPS 404, keine Auftragsdatei, insgesamt 0 Auftraege). FileMaker behaelt die lokale Vormerkung `reserving`. Kein Auftragsfeld oder Script wurde zur Umgehung der Sperre veraendert. [Konkreter Vorschlag zur kontrollierten Bereinigung](ionos-job-recovery-2026-09-25.md).


## Abschluss am 25.09.2026

Die erneut eingegebene Trigger-Konfiguration wurde mit einer separaten administrativen Routine serverseitig geprueft: falscher Testschluessel 401/1627, aktueller Schluessel akzeptiert und alter Auftrag authentifiziert als nicht vorhanden bestaetigt. Nach Sicherung und Abschluss der alten lokalen Vormerkung gelang der normale Export. Neuer Auftrag `065df7a1-cb05-3548-b024-3bfde53216cc` ist `succeeded`; dieselbe Publication ist aktiv. Browserzugriff ueber den Testnamen, Suche und Begriffsanzeige funktionieren ohne Zertifikatswarnung. [Vollstaendiger Reparaturnachweis](ionos-job-recovery-2026-09-25.md).

Die lokale Simulation verwendet ein Testzertifikat und eine CRL mit Ablauf am 24.12.2026. Fuer den Kunden sind DNS, Vertrauenskette auf den tatsaechlichen Clients und FileMaker Server, Erneuerung und erreichbare Sperrlisten gesondert vorzubereiten. Der lokale Erfolg ersetzt nicht die Netzgrenzen- und Umschaltprobe.
