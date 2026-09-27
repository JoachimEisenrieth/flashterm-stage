# Kundeninstallation Anfang Oktober 2026

Stand: 20. September 2026. Arbeitsvorbereitung, noch keine Auslieferungsfreigabe.

**Aktualisierung 24. September:** Laut aktuellem Auftrag läuft beim Kunden bereits eine alte STAGE, die in der Woche 28. September bis 4. Oktober ersetzt werden soll. Maßgeblich für den Austausch sind jetzt der [Ablauf mit Rückweg](ionos-customer-replacement-plan-2026-09-24.md) und der [Fragebogen mit Erfassungsscript](customer-installation-questionnaire.md). Die folgenden Abschnitte dokumentieren den bisherigen Vorbereitungsstand. Die neuere FileMaker-Mandantenkonfiguration wurde inzwischen in `flashterm-dev` eingebaut, aber noch nicht Ende zu Ende abgenommen oder nach MBRAUN übertragen.

## Auftrag und festgelegter Rahmen

Die aktuelle flashterm-STAGE-Version soll Anfang Oktober auf einem lokalen Windows-Kundenserver installiert werden. Der administrative Zugang beim Kunden erfolgt per **TeamViewer**. Zuvor soll derselbe Paketstand auf dem getrennten IONOS-Testserver neben FileMaker Server abgenommen werden.

Bestätigt ist der Betrieb **ausschließlich im internen Netz ohne Personenanmeldung** (`trusted-intranet`). Dafür dient der vorhandene Windows-Intranetinstaller. Der Kunde und vorgesehene Datenbestand sind **MBRAUN**, lokale Datei `flashterm-mbraun.fmp12` auf dem Desktop des M1. Konkrete Windows-/FileMaker-Version und Termin sind noch zu bestätigen. TeamViewer ersetzt weder Administratorrechte noch die Prüfung von DNS und Zertifikat.

### Kundenbestand MBRAUN

Vom Nutzer am 20. September als Datenbestand des betreffenden Kunden benannt. Lokaler Fund: `~/Desktop/flashterm-mbraun.fmp12`, 55.316.480 Bytes, Änderungszeit bei der Prüfung 20. September 2026, 12:57:55 (Ortszeit des M1).

Bei der ersten Prüfung war die Datei in FileMaker geöffnet; zusätzlich hielt der macOS-Dateiprovider einen Schreibhandle. Für die anschließend ausdrücklich autorisierte Übertragung wurde deshalb am 20. September über FileMaker „Kopie speichern unter…“ eine konsistente, getrennte Kopie erstellt, mit automatischem Öffnen deaktiviert. Vor dem Transfer hatte die Kopie keine offenen Dateihandles. Das Desktop-Original blieb erhalten.

Die erste Strukturprüfung der Desktopquelle ist inzwischen erfolgt (siehe unten). Die bisherigen `flashterm-fungi`-Laufzeitnachweise gelten nicht automatisch für MBRAUN. Keine Datenbankdatei ins Git-Repository aufnehmen.

**Übertragung am 20. September abgeschlossen:** verschlüsselt per SFTP über den M4 nach IONOS, in einen separaten Testordner außerhalb der gehosteten FileMaker-Datenbanken. Noch nicht auf FileMaker Server geöffnet oder veröffentlicht.

```text
IONOS:
C:\Users\flashterm-ssh\Documents\flashterm-tests\mbraun-20260920-HyEoME1y\flashterm-mbraun.fmp12

Kopie: 25.870.336 Bytes
SHA-256 lokal und auf IONOS identisch:
057d4b151a8100d13005ea1394e703323f968adf6ddb2e26f74bc7af7af41716
```

Lokale Transferkopie und Prüfergebnis liegen vorübergehend im geschützten Verzeichnis `/private/tmp/flashterm-mbraun-ionos-HyEoME1y`; dies ist kein dauerhaftes Backup. Maßgeblich für die Übertragungsprüfung ist diese von FileMaker erzeugte Kopie, nicht die weiterhin geöffnete Desktop-Datei. Der erste Streaming-Versuch wurde beendet; die erfolgreiche Übertragung erfolgte anschließend über SFTP.

### MBRAUN-Strukturprüfung am 20. September

Lesende Prüfung über FileMakers nativen Export „Kopie als XML speichern“ der geöffneten Desktopdatei. Entwicklerzugriff mit vollen Rechten ist lokal vorhanden. Nur MBRAUN wurde ausgewählt; andere geöffnete Dateien und der Kontenkatalog wurden nicht exportiert. Die Strukturkopie liegt im geschützten temporären Transferverzeichnis, wird wegen möglicher eingebetteter Secrets nicht ins Repository übernommen und nicht als Rohtext protokolliert. Kein Exportbutton, HTTP-Auftrag oder schreibendes Anwendungsscript wurde ausgeführt.

| Prüfung | Befund |
|---|---|
| `languageAPI` | Vorhanden; `guiLanguageCode`, `language`, `languageCode`, `languageCodeShort`, `source`, `defaultSource` im Layout |
| `termAPI` | Vorhanden; `flag11`, `languageCode`, `termlist` |
| `definitionAPI` | Vorhanden; unter anderem `conceptID`, `languageCode`, `definition`, `infobox`, `fileName`, `termlist`, `context`, `footnote`, `weighting` |
| Data-API-Berechtigung | `fmrest` der Berechtigung `Inspector` zugeordnet |
| Technischer Lesezugriff | Inspector darf die drei API-Layouts und deren Datensätze lesen; in `JsonTerm`, `JsonDefinition`, `JsonLanguage` kein Bearbeiten, Erstellen oder Löschen, Felder nur lesbar |
| Hauptscript | `361X-B STAGE`, ID 14730, 486 Schritte; Reservierung vor den API-Aufbereitungsscripts, Fehler-/Cancel-Aufrufe und Erfolgsprüfung vorhanden |
| Hilfsscript | `STAGE Auftrag`, ID 14780, 48 Schritte; native HTTPS-Aufrufe mit SSL-Prüfung, ohne Dialog; Status-Polling vorhanden |
| Master-/Freigabemechanik | Referenzen auf `masterLanguages`, `defaultSource`, beide Mandanten-Standardsprachenfelder sowie Vorzugsbenennungs-/Statusregeln im Hauptscript vorhanden; noch kein fachlicher Laufzeittest mit MBRAUN |

**Befund der ursprünglichen Desktopquelle:** Im Hilfsscript waren folgende Pilotzuordnungen hinterlegt:

- Herkunftsprüfung: gehostete Datei `flashterm-fungi`, freigegebene Centron-Hostpfade; lokale Dateien und der Name MBRAUN passen nicht.
- Auftragsziel: `https://flashterm-stage.edok-online.de/api/export-jobs` (Centron).
- Request-Zuordnung: `sourceDatabase=flashterm-fungi`, `termbaseId=TEST-TERMBASE`.
- Ein Bearer-Schlüssel ist als Literal im Script eingebettet. Sein Wert wurde nicht ausgegeben, nicht in die Dokumentation übernommen und nicht getestet.
- Die Herkunftsprüfung nimmt den Modus `status` aus; deshalb auch keine vermeintlich harmlose Statusprobe mit dem alten Ziel ausführen.

Die vorhandene Struktur muss nicht neu erfunden werden. Vor der Verwendung auf IONOS die **getrennte Testkopie** auf die dynamische Dateireferenz `Get ( FileName )`, die erlaubten IONOS-Hostpfade, den isolierten STAGE-Endpunkt, die festgelegte Test-Termbase und einen eigenen Trigger-Schlüssel umstellen. Den bisherigen Pilot-Schlüssel dort vollständig ersetzen. Entsprechende Quelle/Ziel-Zuordnung muss in der STAGE-Dienstkonfiguration exakt übereinstimmen. Die Produktion auf Centron bleibt dabei unverändert.

Anschließend native Rückkopie der geänderten Scripts mit redigiertem Schlüssel vergleichen; lokale Herkunft muss weiterhin vor einem Auftrag abgewiesen werden. Erst danach den Exportbutton auf der gehosteten Testkopie ausführen. Feldinhalte, tatsächliche Filterergebnisse, Data-API-Anmeldung, Bilder und vollständige Veröffentlichung bleiben Laufzeitprüfungen. Schrittzahlen und vorhandene Felder sind keine vollständige Funktionsabnahme.

Die Prüfung erfolgte an der Desktopquelle nach Erzeugung der Transferkopie. Der endgültig gehostete Teststand ist vor dem Gesamttest erneut zu identifizieren und zu prüfen. Die IONOS-Kopie wurde durch diese Prüfung noch nicht geöffnet oder geändert.

### Dynamische Dateireferenz in der Testkopie

Am 20. September wurde `STAGE Auftrag` in der getrennten lokalen Testkopie geändert und gespeichert. Die Quelle wird universell aus `Get ( FileName )` (deutsche Oberfläche: `Hole ( DateiName )`) ermittelt. `sourceDatabase` enthält keinen fest eingetragenen Kundendateinamen. Die Herkunftsbedingung prüft statt eines festen Dateinamens einen nicht leeren aktuellen Dateinamen; Mehrbenutzerstatus und Hostprüfung bleiben bestehen. Ein Vergleich des Dateinamens mit sich selbst wird nicht verwendet.

Beide Formeln wurden nach Schließen und erneutem Öffnen des Scripts in FileMaker überprüft; feste Referenzen auf `flashterm-fungi` oder `flashterm-mbraun` waren im Hilfsscript nicht mehr vorhanden. Anschließend wurde die Testdatei geschlossen. Kein Veröffentlichungsauftrag wurde ausgeführt. Die native XML-Rückexportprüfung und der vollständige Laufzeittest stehen noch aus.

Serveradressen, Endpunkt, Test-Termbase und Trigger-Schlüssel sind weiterhin installationsspezifisch. Damit ist nur die Dateizuordnung universell; vor einem IONOS-Export müssen diese Einstellungen zur isolierten Testinstallation passen. Die serverseitige Zulassung der tatsächlichen Quelldatei ist ebenfalls zu prüfen. Desktoporiginal und zuerst übertragene IONOS-Basiskopie bleiben unverändert. Die aktualisierte Testkopie liegt lokal unter `/private/tmp/flashterm-mbraun-ionos-HyEoME1y/working-mbraun/flashterm-mbraun.fmp12`. Nach ausdrücklicher Benutzerfreigabe einschließlich des eingebetteten Schlüssels nach IONOS übertragen: `C:\Users\flashterm-ssh\Documents\flashterm-tests\mbraun-20260920-dynamic-source\flashterm-mbraun.fmp12`. Größe: 25.870.336 Bytes; SHA-256 lokal und auf IONOS identisch: `f4969a0526b7486488924ab56caac97877f2e90e1631652307857e947c76c9bc`. Die Datei wurde nicht gehostet und kein Centron-Aufruf ausgeführt. Die anfängliche Freigabesperre ist für diese Übertragung durch die ausdrückliche Zustimmung geklärt.

### Entwicklungsdatei als Vorlage

Die dynamische Dateireferenz wurde anschließend auch in der lokalen Desktopdatei `flashterm-dev.fmp12` gespeichert. Deren zentrales Ausgabedatum lautet jetzt `2026-09-20`. Vorher wurde die geschlossene Datei gesichert; alle 96 erfassten Schrittbestandteile des Hilfsscripts wurden nach erneutem Öffnen verglichen, ausschließlich die zwei vorgesehenen Formeln waren verändert. Details: `flashterm-backstage/tools/stage-publication/dynamic-source-2026-09-20.md`. Keine Änderung der Datenmodellversion, kein Veröffentlichungstest.

### Austausch über TRANSFER

Auf Benutzerwunsch dient `/Volumes/TRANSFER` als Austauschpartition für die RDP-Sitzung. Bei der Prüfung am 20. September waren dort ausschließlich systemverwaltete versteckte Einträge vorhanden; es wurde nichts gelöscht. Der neue Ordner `flashterm-ionos-20260920` enthält das geprüfte Testpaket, die dynamisch angepasste MBRAUN-Testkopie, `release-result.json`, `transfer-manifest.json` und `LIESMICH.txt`. Alle drei kopierten Dateien wurden gegen ihre Quellen per SHA-256 geprüft. Die letzten Transportdateien bleiben bis zur nächsten Nutzung liegen.

Die RDP-Umleitung `Files on Acronis` meldete in Windows „Attempt to access invalid address“. Die Erreichbarkeit der Partition über RDP ist deshalb noch nicht bestätigt; Verbindungseinstellungen müssen geprüft werden. Die Dateien liegen unabhängig davon bereits verifiziert in den dokumentierten IONOS-Testordnern.

## Versionsbasis und nachgewiesener Stand

| Bestandteil | Stand / Nachweis |
|---|---|
| STAGE auf M1 | Branch `codex/m4-integration-20260911`, HEAD `1181c66` plus vorhandene uncommittete Änderungen; damit noch keine unveränderliche Releasebasis |
| BACKSTAGE auf M1 | HEAD `a2aa52a`; zusätzlich sind die Arbeitsdateien unter `tools/stage-publication` maßgeblich |
| Öffentlicher Pilot | Centron; BACKSTAGE dokumentiert dort Release `20260912-auto-publish` und erfolgreichen Exportbutton-Test am 12. September |
| IONOS | Getrennter Windows-Testserver, kein Nachweis einer bisherigen STAGE-Installation |
| Lokale Tests 20. September | 176/176 bestanden unter Node `v20.13.1`, außerhalb der Sandbox wegen Loopback-Testservern |
| Native Windows-Prüfung | Alle fünf vorhandenen PowerShell-Skripte mit dem PowerShell-Parser auf IONOS geprüft: jeweils 0 Syntaxfehler; Skripte dabei nicht ausgeführt |
| Kundenpaket | Fehlende Laufzeitimporte korrigiert; isolierter Import des ausgelieferten STAGE-Servers als Regression geprüft; deutsches Manual ergänzt |

Die älteren Pilot- und Releaseberichte dokumentieren ihre jeweiligen Zeitpunkte. Sie sind keine Aussage über den aktuellen Kundeninstaller oder IONOS. „Aktuelle Version“ muss vor Auslieferung eine eindeutige Release-ID, vollständige Dateiliste und SHA-256 erhalten; HEAD allein erfasst die vorhandenen Arbeitsänderungen nicht. Commit und Push erfolgen nur nach ausdrücklichem Auftrag.

## IONOS: tatsächlich geprüfte Ausgangslage

Lesende Bestandsaufnahme am 20. September 2026:

| Merkmal | Ergebnis |
|---|---|
| Rechenzentrum / VM | `flashterm-installer-test` / `flashterm-test-win2025`, Frankfurt |
| Windows | Server 2025 Datacenter, Build 26100 |
| FileMaker Server | `26.0.2.219`; Dienst läuft, automatischer Start |
| IIS | `W3SVC` läuft; `FMWebSite` gestartet; Default Web Site gestoppt |
| FileMaker-Bindings | `http:*:80:` und `https:*:443:` |
| Rewrite / ARR | Beide Module registriert; ARR-Proxy aktiviert |
| STAGE-Dienst | Bei der Bestandsaufnahme keiner vorhanden |
| IPv4 | Öffentliche Server-IP und Loopback; keine private IPv4 zugewiesen |
| Test-DNS | `flashterm.test` löst serverseitig auf die öffentliche Server-IP auf |
| Zertifikate | Claris-Testzertifikat sowie `CN=flashterm.test` mit privatem Schlüssel vorhanden; das allein bestätigt weder Kunden-Eignung noch Client-Vertrauen |
| Administrative Ports | IONOS-Regeln `RDP-current-admin-ip` und `SSH-current-admin-ip` erlauben nur die hinterlegte bisherige Admin-IP |
| Zugang unterwegs | M1 → bestehendes VPN → SSH-Alias `m4` → auf M4 vorhandener Alias `flashterm-ionos`; SSH-Anmeldung am Windows-Testserver erfolgreich |

ARR wurde abschließend über `Get-WebGlobalModule` bestätigt. Ein erster Dateipfad-Test unter `System32\inetsrv` war dafür nicht aussagekräftig: Das ARR-Modul liegt unter `%ProgramFiles%\IIS\Application Request Routing`.

Der für diese Sitzung eingerichtete Tunnel bietet RDP unter `127.0.0.1:13389` und SSH unter `127.0.0.1:12222`. Beide Protokolle antworteten. VPN, M4 und Tunnel müssen weiterlaufen. Der SSH-Schlüssel für IONOS liegt weiterhin auf dem M4; der lokale SSH-Port allein überträgt keine Anmeldeberechtigung auf den M1. Es wurden keine IONOS-Firewallregeln geändert.

IONOS ist derzeit **keine nachgewiesene Intranet-Nachbildung**. Vor `trustedIntranetConfirmed=true` ist die tatsächliche Netzgrenze festzulegen und zu prüfen. Für die kundengleiche Abnahme wird ein privates Testnetz mit Testclient oder eine ausdrücklich festgelegte gleichwertige Abschottung benötigt. Nicht einfach eine öffentliche HTTPS-Freigabe für STAGE ohne Personenanmeldung ergänzen.

## BACKSTAGE-Vertrag, der zur Kundeninstallation gehört

Quellen im benachbarten Repository `flashterm-backstage`:

- `tools/stage-publication/README.md`: Exportauswahl, Gruppenfreigabe, HTML-Fachinformation, Mastersprachen und Standard.
- `tools/stage-publication/automatic-publication-status.md`: maßgeblicher späterer Stand einschließlich erfolgreichem gehostetem Exportbutton-Test. Frühere „offen“-Abschnitte darin sind historische Zwischenstände.
- `tools/stage-publication/backups/before-auto-publish-361X-B.fmxmlsnippet`: Sicherung **vor** der Automatisierung, nicht als finalen Installerbestand verwenden.

Für jede Kundendatei prüfen:

1. Data-API-Layouts `languageAPI`, `termAPI` und `definitionAPI` samt Leserechten des technischen Kontos vorhanden. Data API aktiviert; Zugriff nur auf benötigte Daten. Der STAGE-Publisher erzeugt keine eigene fachliche Freigabe.
2. Export berücksichtigt aktive Auswahl, Sprachen, Termlisten und vorhandene Filter. Freigabe gilt pro Begriff/Sprachgruppe: aktive Vorzugsbenennung mit Status 3 erforderlich; eine weitere gesperrte Vorzugsbenennung sperrt die Gruppe. Andere Sprachen bleiben unabhängig.
3. `JsonLanguage::source` enthält je Mastersprache deren Code; `defaultSource` enthält den Code der eindeutigen Standard-Mastersprache und ist im Layout verfügbar. Standard muss zu den exportierten Mastersprachen gehören.
4. HTML aus `infobox`, Definitionen und Bildreferenzen erhalten; Term-/Definitionsauswahl stimmt überein. Bilder für ausgewählte Concepts verfügbar und per Publisher erreichbar.
5. Finales Hauptscript `361X-B STAGE` und Hilfsscript `STAGE Auftrag` gegen native Rückkopien prüfen, nicht ausschließlich anhand der Schrittzahl. Dokumentierter Stand: 486 beziehungsweise 48 Schritte.
6. `reserve` vor erstem API-Schreiben, `ready` erst nach beendeten und gespeicherten Unterprogrammen; Erfolg erst bei `succeeded`. Eine unbekannte Antwort wird mit derselben UUID weiterverfolgt. Alte Exportwege dürfen die Sperre nicht umgehen.
7. Quelldatei, gehostete Herkunft, STAGE-Ziel und Schlüssel kundenspezifisch zuordnen. Lokale Kopien müssen den Online-Auslöser verweigern. Keine Centron-Ziele oder dortige Schlüssel in Kundenkopien übernehmen.

Der bestätigte Centron-Normalfall umfasste 7 Sprachen, 56 Concepts, 236 Terms und 26 Assets. Diese Zahlen sind ein historischer Nachweis, keine Sollwerte für andere Kundenbestände. Praktische Mehrbenutzer-, Netzwerkabbruch- und Neustartfälle sind noch abzunehmen.

## Vorabblatt für den Kunden / TeamViewer-Termin

Vor dem Installationstermin ausfüllen; keine Passwörter in diesem Dokument ablegen:

| Frage | Aktueller Stand |
|---|---|
| Datum, Ansprechpartner, Wartungsfenster | Offen; Anfang Oktober vorgesehen |
| TeamViewer-Verbindung und lokaler Administrator/UAC | TeamViewer bestätigt; Rechte und begleitender Ansprechpartner noch offen |
| Windows-Edition, Build, Architektur | Windows Server bestätigt; Details offen |
| FileMaker-Version, laufende Datenbanken, Site-Name | Offen |
| Neuinstallation oder schon vorhandenes STAGE? | Alte STAGE laut Auftrag vom 24.09. vorhanden; separate neue Instanz und kontrollierte Umschaltung erforderlich, Installer unterstützt nur Neuinstallation |
| Nur internes Netz ohne Personenanmeldung oder OIDC? | Bestätigt: nur internes Netz, ohne Anmeldung (`trusted-intranet`) |
| Server-IP, interner DNS-Name, Clientnetze | Offen |
| Zertifikat: DNS-Abdeckung, private key, Gültigkeit, Clientvertrauen, Erneuerung | Offen |
| IIS URL Rewrite, ARR, bereits aktiver Proxy | Kundenseitig prüfen; keine globale Umkonfiguration durch den Installer |
| Getrennte Anwendungs-/Konfigurations-/Daten-/Proxy-Verzeichnisse, freier Port | Standardwerte aus `customer-settings.example.json` abstimmen |
| BACKSTAGE-Datei und finaler Script-/Schema-Stand | MBRAUN-Grundstruktur geprüft; Pilot-Zielzuordnung vor Testbetrieb ersetzen, native Rückprüfung und Laufzeittest offen |
| Freigaberegeln, Termbase-/Tenant-ID, technische Konten | Offen |
| Internetzugang der Browser | Prüfen: externe XLSX-/Polyfill-Skripte und Fonts; Offlinebetrieb noch nicht abgenommen |
| Backupziel, Aufbewahrung, Restore-Verantwortlicher | Offen |

TeamViewer-Verbindung vor Änderungen testen; UAC und ein möglicher Neustart dürfen den vereinbarten Wiederzugang nicht verhindern. FileMaker-Neustart und Gesamtserver-Neustart gehören in das abgestimmte Wartungsfenster.

## Releasevorbereitung

1. Bestehende Arbeitsänderungen fachlich prüfen und den vollständigen Kandidaten festlegen. Für IONOS und Kunde exakt denselben Kandidaten verwenden; nach Änderungen betroffene Abnahme wiederholen.
2. Windows-x64-Dateien für Node.js und WinSW aus offiziellen Quellen samt unabhängig geprüften vollständigen SHA-256 bereitstellen. Der IONOS-Testkandidat vom 20. September ist jetzt gebaut (siehe unten); noch keine Kundenfreigabe.
3. `npm test`, Syntax- und Referenzprüfung sowie `git diff --check` durchführen. Der Pakettest muss die isolierte Anwendung importieren können; ein bloßes erfolgreiches Manifest reicht nicht.
4. Paket gemäß [Installeranleitung](windows-customer-installer.md) erzeugen, Manifest prüfen, ZIP erstellen und dessen SHA-256 separat dokumentieren. Keine lokale `config.js`, `.env`, Datenbank oder Schlüssel aufnehmen.
5. Kundeneinstellungen ohne Secrets vorbereiten. Auto-Publishing separat konfigurieren: `configure-auto-publication.ps1` ist derzeit ein Centron-Helfer mit festem Dienst, Port, Pfad und Test-Termbase und muss vor Kundenverwendung parametrisiert werden.
6. Konsistente getrennte Testkopie von `flashterm-mbraun.fmp12` vorbereiten und ihren Script-/Schema-Stand prüfen. Vollständige FMP-Dateien können Trigger-Schlüssel enthalten; keine ungeprüfte Desktop- oder Produktivkopie verteilen.

### Gebauter IONOS-Testkandidat vom 20. September

- Release: `20260920.01-ionos-test`; 71 Dateien im Manifest, ZIP-Größe 42857859 Bytes.
- Lokaler Paketordner: `outputs/ionos-preparation-20260920/`; ZIP und `release-result.json` liegen dort. Ausgaben sind Git-ignoriert.
- ZIP-SHA-256: `624a4cdd51adbade23bf8b7dedac07115f092dfa04a8e64e5ba97a6514190141`.
- Node.js 24.21.0, Windows x64, aus [offiziellem Releaseverzeichnis](https://nodejs.org/dist/v24.21.0/); Hash gegen dessen `SHASUMS256.txt` geprüft: `ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32`.
- WinSW 2.12.0 x64 aus [offiziellem Release](https://github.com/winsw/winsw/releases/tag/v2.12.0); Hash gegen [separates Scoop-Paketmanifest](https://github.com/ScoopInstaller/Main/blob/master/bucket/winsw.json) geprüft: `05b82d46ad331cc16bdc00de5c6332c1ef818df8ceefcd49c726553209b3a0da`. Die GitHub-Release-API enthält für diesen älteren Download keinen Digest. Gesicherte Referenzdateien liegen im lokalen `vendor`-Unterordner.
- 176/176 Tests bestanden; Syntax und `git diff --check` fehlerfrei. Alle Manifestgrößen/-hashes nachgerechnet; Anwendung aus dem isolierten Paket erfolgreich importiert.
- Keine `config.js`, `.env`, `service.env` oder `.fmp12` im Paket. Der Testkandidat enthält den aktuellen Arbeitsstand einschließlich uncommittierter Änderungen; keine unveränderliche Git-Releasebasis oder Kundenfreigabe.
- IONOS-Netzbestand erneut geprüft: nur öffentliche IPv4 und Loopback, keine private Testadresse. Der zunächst vorbereitete Starttest verwendet ausschließlich Loopback, leere Daten und keine FileMaker-Zugangsdaten. Die eigentliche Installer-/IIS-Abnahme bleibt offen.

### Windows-Starttest bestanden

Das ZIP und das Testscript wurden nach `C:\Users\flashterm-ssh\Documents\flashterm-tests\stage-bundle-20260920-01` übertragen; beide SHA-256 vor Ausführung geprüft. Alle 71 Manifestdateien stimmen auf IONOS überein. Die mitgelieferte Runtime meldet `v24.21.0`. STAGE startete im Modus `trusted-intranet` mit leerem eigenem Datenverzeichnis: Health `ok`, Startseite HTTP 200. Der einzige Listener des Testprozesses war `127.0.0.1:18200`; nach der Prüfung wurde genau dieser Prozess gestoppt und das Fehlen des Listeners bestätigt.

Kein Windows-Dienst installiert, keine IIS-/Firewalländerung, keine Kundendaten geladen, kein FileMaker-Aufruf. Nachweis lokal: `outputs/ionos-preparation-20260920/ionos-smoke-result.txt`; auf IONOS `smoke-evidence/result.json` im genannten Testordner. Dies bestätigt den Paketstart unter Windows, ersetzt aber weder den Installer-Preflight noch TLS-/Browser-/Kundendatenabnahme.

### Dauerhafte lokale Testinstanz am 20. September eingerichtet

Auf ausdrücklichen Auftrag wurde anschließend eine ausschließlich auf dem Server erreichbare Instanz eingerichtet. Sie ist im Serverbrowser unter `http://127.0.0.1:8200/` geöffnet. Die Einrichtung erfolgte über den vorhandenen SSH-Zugang über M4; die Browseranzeige wurde über TeamViewer geprüft.

- Release `20260920.01-ionos-test`, alle 71 Manifestdateien vor Installation erneut geprüft.
- Dienst `flashterm-stage-local`, Konto `NT AUTHORITY\NetworkService`, automatisch mit verzögertem Start.
- Anwendung und private Node-Laufzeit unter `C:\Apps\flashterm-stage-local`; Einstellungen, Logs und Daten getrennt unter `C:\ProgramData\flashterm-stage-local` und durch NTFS-Rechte geschützt.
- Einziger STAGE-Listener `127.0.0.1:8200`; Healthcheck, HTTP 200, richtige private Node-Runtime und Dienstneustart bestätigt.
- Alle IIS-Site-Zustände und Bindings vor/nach der Einrichtung identisch; FileMaker-Server-Dienst läuft. Keine IIS-, Firewall-, DNS- oder Zertifikatsänderung.
- Noch keine Veröffentlichung und keine Kundendaten geladen (`PublishedTermbases=0`). Die Browseroberfläche lädt und zeigt einen Hinweis auf nicht geladene Daten. Suche, Bilder und Export sind damit noch nicht fachlich abgenommen.
- Automatischer Start ist konfiguriert; ein tatsächlicher Gesamtserver-Neustart wurde nicht durchgeführt.

Dies ist eine lokale Betriebsprüfung mit demselben Anwendungspaket, **keine Abnahme des Kundeninstallers**. Dessen Preflight, IIS/TLS, Zugriff von einem separaten Client und private Netzgrenze bleiben offen. Der Kundeninstaller wurde nicht für Loopback verändert oder umgangen. Lokale Einrichtungsskripte und Nachweis: `outputs/ionos-local-20260920/`; serverseitiger Nachweis: `C:\ProgramData\flashterm-stage-local\installation-result.json`. Kein Commit oder Push.

### MBRAUN-Anbindung: Vorbereitung am 20. September

Der Exportbutton der gehosteten MBRAUN-Datei wurde vom Benutzer ausgeführt und meldete „Export nicht gestartet. Automatische Veröffentlichung nur aus der eingerichteten gehosteten Quelldatei möglich.“ Eine native Strukturkopie der tatsächlich geöffneten Datei wurde erstellt und anschließend unter `C:\ProgramData\flashterm-stage-local\setup-review\mbraun-before.xml` mit Administrator-/SYSTEM-Rechten geschützt abgelegt. Keine XML-Rohdaten oder eingebetteten Schlüssel ins Repository übernehmen.

Serverseitige Prüfung bestätigt: Hilfsscript mit 48 Schritten; dynamischer Dateiname bereits vorhanden, aber Herkunftsprüfung, Auftragsziel und Termbase noch auf Centron/Testbestand ausgerichtet. Die FileMaker-Scripts wurden in diesem Vorbereitungsschritt noch nicht geändert.

Die FileMaker-HTTPS-Verbindung über das bisherige Binding scheiterte an der Zertifikatsprüfung des Claris-Testzertifikats. Für die lokale Testanbindung wurde deshalb **zusätzlich** an `FMWebSite` das Binding `127.0.0.1:18443:` angelegt. Alle vorherigen Bindings samt Zertifikatszuordnung bleiben unverändert. Das eigene lokale Zertifikat enthält die Loopback-IP als SAN und ist auf drei Monate begrenzt; keine Aufnahme in den globalen Windows-Vertrauensspeicher. Prüfung mit der privaten Node-Laufzeit und explizitem Zertifikatsvertrauen: TLS validiert, FileMaker-`productInfo` HTTP 200. Das unterscheidet sich vom späteren Kundenbetrieb mit regulärem vertrauenswürdigem Serverzertifikat.

Die verdeckte Kontoeingabe wurde auf dem Server geöffnet (`STAGE - Data API einrichten.cmd` auf dem öffentlichen Desktop; darin keine Secrets). Der Assistent prüft Anmeldung und lesenden Zugriff auf die drei API-Layouts, bevor er die geschützte Dienstkonfiguration ergänzt. Vorgesehen sind der lokale HTTPS-Ursprung, Quelldatei `flashterm-mbraun`, Ziel `MBRAUN`, ein eigener zufälliger Trigger-Schlüssel und dienstspezifisches Zertifikatsvertrauen über `NODE_EXTRA_CA_CERTS`. **Zu diesem dokumentierten Zwischenstand wartet der Assistent auf die Zugangsdaten; Einrichtung und Export sind noch nicht bestätigt.** Anschließend bleiben FileMaker-Herkunftsprüfung, Ziel, Trigger-Zuordnung, native Rückprüfung und Exportabnahme erforderlich. Vor einem erneuten Lauf zuerst den tatsächlichen Status/Erfolgsmarker im geschützten Serververzeichnis prüfen.

#### Kontoeinrichtung anschließend bestätigt

Der erste Eingabeversuch wurde von FileMaker mit Fehler 212 abgelehnt; dabei blieb die Dienstkonfiguration unverändert. Nach erneuter verdeckter Eingabe durch den Benutzer wurde die Einrichtung erfolgreich abgeschlossen. Der Erfolgsmarker wurde serverseitig bestätigt. Unabhängige Nachprüfung: STAGE läuft und ist gesund, weiterhin ausschließlich Loopback; Quelle `flashterm-mbraun`, Ziel `MBRAUN` und eigener Zertifikatspfad sind konfiguriert. Die authentifizierte Abfrage einer nicht vorhandenen Auftrags-UUID liefert erwartungsgemäß 404, nicht 401/503. Noch keine veröffentlichten Termbases.

Die FileMaker-Zuordnung ist weiterhin offen. Der Berechnungsdialog der Herkunftsprüfung wurde geöffnet; zu diesem Zwischenstand wurde noch keine Formel ersetzt oder gespeichert. Wegen unzuverlässiger Tastatur-/Mausauswahl über TeamViewer wurde der Benutzer gebeten, den bestehenden Formeltext zu markieren. Nächster Schritt: Herkunftsprüfung, lokale Zieladresse und Termbase gezielt ändern sowie Trigger-Schlüssel geschützt zuordnen; danach native Rückprüfung und echter Export.

## IONOS-Testablauf und Abnahmeprotokoll

„Offen“ bleibt offen, bis ein konkreter Nachweis vorliegt. Ein erfolgreicher Centron-Test ersetzt keinen Test des Kundenpakets.

| Schritt | Erwarteter Nachweis | Stand |
|---|---|---|
| Bestand erfassen | OS, FMS, IIS, Bindings, Dienste, DNS/Zertifikat | Bestandsaufnahme erfolgt |
| Testumgebung angleichen | Geprüfte Netzgrenze, Clientzugang und TLS-Vertrauen; passende FileMaker-Testdatei | Offen |
| Paket bereitstellen | Identische ZIP- und Dateihashes, private Node-/WinSW-Version | Testkandidat 20260920.01 auf IONOS verifiziert; Windows-Loopback-Start bestanden |
| Preflight ohne `-Apply` | `Mode=Preflight`, Integrität ok, FMS unverändert; keine neuen Dienste/Sites | Offen |
| Neuinstallation | Eigener Dienst/Site/Pool; private Node-Runtime; Loopback-Port; HTTPS-Health ok | Offen |
| FileMaker-Koexistenz | Site-Zustand/Bindings exakt wie vorher; Admin Console und bestehender Clientzugriff funktionieren | Offen |
| Erste Veröffentlichung | Exportbutton → Auftrag → Daten/Bilder → Aktivierung; aktive ID unabhängig bestätigt | Offen |
| Browserabnahme | Suche, Concept, HTML-Tabelle, Bilder, Master-/Standardsprachen, Inspector, Translator, CSV/XLSX/JSON, Manual | Offen |
| Freigabefälle | Nicht freigegebene Begriffs-/Sprachgruppe fehlt; leere Auswahl verändert aktiven STAGE-Stand nicht unkontrolliert | Offen |
| Mehrbenutzer / Wiederholung | Gleichzeitiger Export zurückgewiesen; wiederholtes `ready` startet keinen zweiten Job | Offen |
| Abbruch / Neustart | Unterbrechung vor/nach ready, unklare Antwort, Aktivierung vor Statuspersistenz; kein falscher Erfolg | Offen |
| Daten-Rollback | Vorherige Publication wieder aktivierbar, Assets konsistent | Offen |
| Backup / Restore | Getrennte Wiederherstellung, identische aktive Publication und Bilder, Health und Browser geprüft | Offen |
| Gesamtserver-Neustart | FileMaker und STAGE starten, Clientzugriff und Auto-Publishing funktionieren | Offen |
| Netzgrenze | Freigegebener Testclient erreicht STAGE; externer Client bekommt keinen Intranet-Lesezugriff | Offen |

Bei einem Restore keine alte Konfiguration über eine andere Installation kopieren. Datenverzeichnis nur bei gestopptem STAGE-Dienst konsistent sichern; Script `deploy/windows/backup-stage-data.ps1` mit **instanzspezifischem** `-ServiceName` verwenden. Dienstkonfiguration, Zertifikat/private key und BACKSTAGE-Datei benötigen getrennte geschützte Sicherung. Kein Installer-Upgrade oder Uninstall improvisieren: Der vorhandene Installer ist ausschließlich für frische Ziele ausgelegt.

Pro Test festhalten: Datum, Release-ID/ZIP-Hash, Datenrevision, Ergebnis, Abweichung und Nachweisort. Keine Rohantworten der FileMaker-API, Zugangsdaten, Tokens oder vollständige Dienstkonfiguration in Protokolle übernehmen.

## Ablauf beim Kunden nach erfolgreicher IONOS-Abnahme

Seit dem Auftrag vom 24.09. ist ein Austausch der vorhandenen Installation erforderlich. Der vollständige Ablauf einschließlich getrennter Vorbereitung, aktueller Kundendaten, bisheriger URL, Umschaltung und Rückschaltung steht im [Austauschplan](ionos-customer-replacement-plan-2026-09-24.md). Den Fresh-Install-Installer ausschließlich auf neue, getrennte Ziele anwenden.

## Verweise

- [Windows-Kundeninstaller](windows-customer-installer.md)
- [Automatische Veröffentlichung](automatic-publication.md)
- [Manueller Backstage-Publisher](backstage-publication.md)
- [Windows-Betrieb](windows-server-deployment.md)
- [Internet-/Intranetprofile](internet-intranet-profiles.md)
- [Funktionale Smoke-Test-Matrix](characterization-baseline.md)
