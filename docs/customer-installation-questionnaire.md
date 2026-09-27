# Erfassung vor dem Austausch von flashterm STAGE

Stand: 24. September 2026. Für den Kundentermin in der Woche **28. September bis 4. Oktober 2026**; genauer Termin offen.

Ziel: Die bestehende STAGE-Version wird nach einer Generalprobe auf IONOS ersetzt. Die Altinstallation bleibt bis zur erfolgreichen Abnahme wiederherstellbar. Dieses Blatt enthält keine Passwörter, Schlüssel oder vollständigen Zugangsdaten.

## 1. Kurzfragebogen für den Kunden

Unbekannte Angaben können wir gemeinsam per TeamViewer ermitteln. Mit ★ markierte Punkte werden vor dem Wartungsfenster benötigt.

| Nr. | Frage | Antwort |
| --- | --- | --- |
| 1 ★ | Gewünschter Termin, Zeitfenster und maximal erlaubte Unterbrechung? | Offen |
| 2 ★ | Wer begleitet den Termin, besitzt lokale Administratorrechte und kann bei Verbindungsabbruch helfen? | Offen |
| 3 ★ | Welche vollständige Adresse einschließlich Pfad öffnen die Benutzer heute? Gibt es weitere Links, Favoriten oder eingebundene STAGE-Seiten? | Offen |
| 4 ★ | Welche Windows-Server- und FileMaker-Server-Versionen laufen? Sind FileMaker und STAGE auf demselben Rechner? | Per Script / ergänzen |
| 5 ★ | Welche FileMaker-Datei ist die aktuelle produktive Quelle? Soll nur STAGE ersetzt werden oder muss auch die BACKSTAGE-Dateistruktur aktualisiert werden? | MBRAUN vorgesehen; aktuelle Kundenquelle bestätigen |
| 6 ★ | Wer erstellt vor dem Austausch eine konsistente FileMaker-Sicherung und eine Sicherung der bisherigen STAGE-Installation? Wann wurde deren Wiederherstellung zuletzt getestet? | Offen |
| 7 ★ | Welche internen Netze/VPN-Clients dürfen STAGE verwenden? Gibt es eine öffentliche Erreichbarkeit? | Bisheriger Rahmen: internes Netz ohne Personenanmeldung; konkrete Grenze bestätigen |
| 8 | Gibt es Anpassungen an Logo, Farben, Sprachen, Texten, Exporten oder Verlinkungen? Welche müssen erhalten bleiben? | Offen |
| 9 | Welche Sprachen, Master-/Standardsprache und Beispielbegriffe sollen wir zur Abnahme verwenden? Wer bestätigt die Inhalte? | Offen |
| 10 | Wie werden Daten heute veröffentlicht, wer löst das aus, und gibt es geplante Aufgaben oder automatische Exporte? | Offen |
| 11 | Funktioniert TeamViewer auch bei UAC, nach Abmeldung und nach Neustart? Steht eine zweite Zugangsmöglichkeit zur Verfügung? | Gemeinsam prüfen; Zugangsdaten separat eingeben |
| 12 | Dürfen Server und Browser ins Internet? Werden Proxy, abgeschottete Clients oder besondere Browserrichtlinien verwendet? | Offen |
| 13 | Wer betreut DNS, Zertifikate, Firewall und die spätere Sicherung? Wer entscheidet über Umschaltung oder Rückkehr zur Altversion? | Offen |

## 2. Technische Ergänzung im TeamViewer-Termin

| Bereich | Zu erfassen / praktisch zu prüfen |
| --- | --- |
| Bisherige STAGE | Version/Dateistand; statische IIS-Dateien oder eigener Dienst; IIS-Site, Anwendung/virtuelles Verzeichnis, physischer Pfad, Port, Binding; Einstiegspfad und Groß-/Kleinschreibung |
| Einstellungen | Speicherorte von `config.js`, `web.config`, Dienst- und Publisherkonfiguration. Inhalte bleiben geschützt vor Ort; keine Ausgabe oder Übernahme realer Werte in den Fragebogen |
| Daten | Aktuelle produktive FileMaker-Datei, Datenstand, Containerspeicher/Bilder, etwaige STAGE-Publikationen und offene Exportaufträge; Testkopie klar von Produktion trennen |
| Bilderprüfung | Bildabruf festhalten: neuer Originalbildabruf über `imageAPI` (`ID`, `figure`, `figureFileName`) mit begrenzten Leserechten oder bisheriger Dateipfad über `figureExtern`. Beim Originalbildabruf sind keine zweite Bildkopie und kein öffentliches Bildverzeichnis erforderlich. Beispielbegriff, vollständigen Export und Browserbild prüfen; bei älteren Installationen zusätzlich die externe Speicherart und den bisherigen Dateipfad erfassen. |
| FileMaker-Anbindung | Data API aktiv; technisches Lesekonto und Rechte auf `languageAPI`, `termAPI`, `definitionAPI`; PSoS und serverseitige Ausführung möglich; installierter Script-/Schema-Stand |
| IIS | FileMaker-Site und alle Bindings; bestehende STAGE-Site oder Unterpfad; Rewrite/ARR und Proxyfunktion; keine globalen Änderungen ohne gesonderte Planung |
| Neue Instanz | Eigene Service-/Site-/Poolnamen, freier Loopback-Port und getrennte neue Anwendungs-, Konfigurations-, Daten- und Proxyverzeichnisse |
| DNS/TLS | Gewünschter endgültiger Host; interner Testhost, sofern benötigt; IP; passendes Zertifikat mit privatem Schlüssel; SAN, Kette, Clientvertrauen, Ablauf und Erneuerungsverantwortlicher |
| Netzgrenze | Effektive Windows- und vorgeschaltete Firewall-/VPN-Regeln; erlaubter Client erreicht STAGE, externer Client erhält keinen Lesezugriff. Lokale IPs/Profile allein reichen nicht |
| Wiederanlauf | Dienststart, Freigaben und Kontorechte; TeamViewer-Wiederzugang; Wiederherstellungsort und zuständiger Administrator |
| Rückweg | Exaktes altes Binding/Proxyziel, Rückschaltanweisung, gesicherte Altdateien; Abbruchzeitpunkt innerhalb des Wartungsfensters |

## 3. Lesendes Erfassungsscript

Datei: [`deploy/windows/collect-installation-inventory.ps1`](../deploy/windows/collect-installation-inventory.ps1).

In einer **64-Bit-Windows-PowerShell 5.1 oder neuer**, möglichst als Administrator:

```powershell
# In den Ordner mit dem geprueften Script wechseln.
$inventoryOutput = Join-Path $env:USERPROFILE ('Documents\flashterm-erfassung-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
.\collect-installation-inventory.ps1 -OutputDirectory $inventoryOutput
```

Optional, wenn Anwendungspfad und STAGE-Port bereits bekannt sind:

```powershell
.\collect-installation-inventory.ps1 `
    -OutputDirectory 'C:\Temp\flashterm-erfassung-NEUER-ORDNER' `
    -ExistingStageRoot 'C:\PFAD-ZUR-BISHERIGEN-STAGE' `
    -StagePort 8200
```

Platzhalter ersetzen; `8200` ist nur ein Beispiel. Für eine rein statische Altversion wird `-StagePort` weggelassen. Es werden keine Skriptrichtlinien dauerhaft verändert. Falls die Ausführung betrieblich gesperrt ist, den vorgesehenen Freigabe-/Signierweg des Administrators verwenden.

Das Script legt ausschließlich einen **neuen** lokalen Berichtsordner mit `inventory.json` und `LIESMICH.txt` an. Bereits vorhandene Ausgabeordner werden abgewiesen. Es installiert nichts, kopiert keine Anwendung oder Datenbank, startet/stoppt keine Dienste und ändert keine IIS-, DNS-, Firewall-, Zertifikats- oder FileMaker-Einstellungen. Es fordert keine Zugangsdaten an und überträgt den Bericht nicht.

Erfasst werden Betriebssystem, Speicherplatz, ausgewählte Produktversionen aus der Registry, FileMaker-/STAGE-/IIS-Dienste, lokale IPs und TCP-Listener, Firewallprofilstatus, IIS-Sites/Anwendungen/Bindings, Rewrite/ARR sowie öffentliche Zertifikatsmetadaten. Bei angegebenen Anwendungsverzeichnissen werden nur Dateinamen, Größen und Änderungszeiten einer festen Liste erfasst, keine Dateiinhalte. `-StagePort` löst ausschließlich eine lokale GET-Anfrage an `/api/health` aus; keine Anmeldung, keine Weiterleitung, kein Export und kein externer HTTP-Aufruf.

Nicht erfasst werden Secrets, Umgebungsvariablen, Service-Kommandozeilen, Konfigurationsinhalte, private Schlüssel, FileMaker-Datensätze oder komplette API-Antworten. Der Bericht enthält jedoch interne Servernamen, Adressen und Pfade: vor Weitergabe prüfen und nur über den vereinbarten geschützten Weg übertragen. Berichte gehören nicht ins Git-Repository; bei lokaler Ablage im Projekt `outputs/` verwenden.

**Auswertung:** `unavailable` bedeutet, dass Rechte oder Komponenten fehlen können; nicht „Komponente fehlt“. Leere Abschnitte, `unverified` und `collectionComplete=true` sind keine Installationsfreigabe. Eine bestehende statische STAGE ohne Windows-Dienst kann trotzdem vorhanden sein. Zertifikatsmetadaten beweisen weder eine gültige Vertrauenskette noch Browservertrauen. Der Fragebogen, effektive Zugriffsregeln, Datenstände, Sicherungen und Clienttests bleiben erforderlich.

### Erprobung auf IONOS am 24. September

Das Script wurde per TeamViewer übertragen; SHA-256 lokal und auf Windows identisch: `4f253614c3cf1c39f617a07ec02577df7dcdf03e05817a1662906c11b766d0fd`. Die native PowerShell-Parserprüfung meldete 0 Syntaxfehler. Praktischer Lauf unter Windows Server 2025 Datacenter, Build 26100, mit administrativer 64-Bit-PowerShell `5.1.26100.33296`: alle elf Abschnitte erfasst, keine `unavailable`-Abschnitte; die optionale lokale Health-Prüfung auf Port 8200 ergab HTTP 200 / `ok`.

Ein zweiter Aufruf mit demselben Ausgabeordner wurde vor der Erfassung zurückgewiesen. Der SHA-256 des vorhandenen JSON-Berichts blieb identisch. Der Bericht wurde per TeamViewer zurückübertragen und lokal als JSON geprüft. Das ist eine Erprobung auf diesem Server, noch keine Prüfung aller kundenspezifischen Windows-/IIS-Konfigurationen.

Nachweise: serverseitig `C:\Users\Administrator\Documents\flashterm-erfassung-20260924-01`, lokal im Git-ignorierten Ordner `outputs/ionos-inventory-20260924/flashterm-erfassung-20260924-01/`. Die Erfassung bestätigte FileMaker Server `26.0.2.219`, aktive `FMWebSite`, gestoppte Default Web Site sowie vorhandenes Rewrite/ARR mit aktiviertem Proxy.

## 4. Ergebnis und Freigabe

| Entscheidung | Eintrag |
| --- | --- |
| Erfassung am / durch | Offen |
| Bericht vollständig / manuelle Nacharbeiten | Offen |
| Altversion und bisherige URL eindeutig identifiziert | Offen |
| STAGE-Paket-ID / SHA-256 / BACKSTAGE-Stand festgelegt | Offen |
| Datenübernahme in getrennte Testdatei notwendig | Offen |
| IONOS-Generalprobe einschließlich Rückweg bestanden | Offen |
| Kundenbackup und Wiederherstellung nachgewiesen | Offen |
| Konkrete Umschaltung, Verantwortlicher, späteste Rückschaltzeit | Offen |
| Entscheidung: durchführen / verschieben | Offen |

Der Ablauf und die noch offenen Voraussetzungen stehen im [Austauschplan](ionos-customer-replacement-plan-2026-09-24.md).
