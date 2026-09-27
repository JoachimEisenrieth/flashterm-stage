# Lokale STAGE-Vormerkung kontrolliert abschliessen

Stand 25.09.2026, nach erneuter Eingabe des Trigger-Schluessels durch den Benutzer. Durch Benutzer freigegeben, implementiert und erfolgreich ausgefuehrt; regulaere Veroeffentlichung und Browseranzeige anschliessend bestaetigt.

## Ausgangszustand vor der Reparatur

- Quelle: `flashterm-mbraun` auf `FTSTAGE-TEST`, Ziel `MBRAUN`.
- FileMaker-Auftrag: `4dce9c0c-30cf-1e4a-93cc-c25d551c40ae`, Zustand `reserving`.
- Der Wiederholungsversuch stoppt bereits bei `Configuration changed during an open job`. Die Authentifizierung mit dem neu eingegebenen Schluessel wurde dabei noch nicht getestet.
- Erneute authentifizierte Dienstabfrage nach dem Wiederholungsversuch: dieselbe Kennung ueber HTTP und HTTPS jeweils 404, zugehoerige Auftragsdatei fehlt, insgesamt 0 Auftragsdateien. Dienst laeuft, Health `ok`, Quelle und Ziel passen.
- Das Mandantenformular zeigt den Auftragsstatus nur lesbar und bietet keine Auftragsfreigabe. Der vorhandene Helper prueft den Konfigurationsdigest auch vor `status`/`cancel`; diese Wege koennen den geaenderten Schluessel daher nicht verwenden.
- Bis zum Beginn der freigegebenen Reparatur waren Auftragsfelder, Helper, Exportlogik und Layoutschutz unveraendert.

## Freigegebener Reparaturumfang

Eine separate, einmalige administrative Reparaturroutine fuer genau diese Testdatei und diese Auftragskennung vorbereiten. Keine Aenderung an der regulaeren Export- oder Schluesselpruefung.

1. Aktuelle Mandantenreferenz und Konfiguration konsistent sichern; keine Geheimnisse in Protokoll oder Repository schreiben.
2. Datei, Host, Mandant, Ziel, erwartete Auftragskennung und lokalen Zustand `reserving` pruefen. Keine Freigabe fuer `exporting`, `ready`, `running` oder unklaren Zustand.
3. Pruefen, dass die bisherigen Scriptaufrufe beendet sind. Auftrag im Dienst unmittelbar erneut abfragen.
4. Den neu eingetragenen Schluessel mit einem serverseitigen HTTPS-Aufruf bei aktivierter Zertifikatspruefung testen. Nur eine eindeutig authentifizierte Antwort `Auftrag nicht gefunden` fuer genau diese Kennung darf zur lokalen Bereinigung fuehren. Bei TLS-/Anmeldefehler oder vorhandener Reservierung abbrechen und nichts aendern.
5. Mandantensatz sperren und Kennung, Zustand und unveraenderten aktuellen Konfigurationsstand erneut pruefen. Nur die lokale Vormerkung als `cancelled` abschliessen und den Zeitpunkt aktualisieren. Alte Kennung beibehalten, Bereinigungsgrund ohne Secrets dokumentieren. Keine pauschale Leerung der `stage*`-Felder und kein manuelles Umschreiben des Konfigurationsdigests.
6. Erst danach den regulaeren Export einen neuen Auftrag anlegen lassen. Reservierung, Aufbereitung, Publikation und Anzeige in STAGE bis zum Abschluss pruefen.

Der Benutzer hat die separate administrative Routine ausdruecklich freigegeben. Ein unerwarteter ungespeicherter Editorzustand des bestehenden Helpers wurde nach gesonderter Freigabe verworfen; die gespeicherte Version ist wieder geoeffnet. Die Reparatur bleibt bis zum erfolgreichen Authentifizierungs- und Abwesenheitsnachweis gesperrt.


## Implementierung und native Rueckpruefung

- Separates Script `STAGE Wartung IONOS 20260925`, installierte ID `14794`, 133 Schritte, ohne erhoehte Ausfuehrungsrechte.
- Frische Sicherung des regulaeren Helpers: 204 Schritte, unveraendert erhalten.
- Native Rueckkopie des Wartungsscripts: saemtliche Berechnungen stimmen nach Beruecksichtigung der FileMaker-Lokalisierung ueberein. Server-Selbstreferenz zeigt auf `14794`; Feld- und Layoutverweise stimmen mit der aktuellen Installation ueberein.
- Beide HTTPS-GET-Aufrufe haben Zertifikatspruefung eingeschaltet; kein Redirect, kein unsicherer TLS-Modus. Negativtest mit festem ungueltigem Testwert muss 401/1627 ergeben; aktueller Mandantenschluessel muss 404/NOT_FOUND mit der auftragsspezifischen Meldung liefern.
- Sperre des Mandantensatzes umfasst beide Abfragen, Sicherung und Aenderung. Ausschliesslich `stageLastJobState` und `stageLastJobAt` werden geschrieben; ID und Konfigurationsdigest bleiben erhalten.
- Reparaturmodus erzeugt vor dem Schreiben eine JSON-Sicherung der alten Referenz im Dokumentenordner des FileMaker-Servers. Kein Trigger-Schluessel enthalten.
- Pruefmodus beendet sich vor Sicherungs- und Schreibschritten.
- Pruefmodus erfolgreich am 24.09.2026 gegen 22:31 UTC: falscher Schluessel abgewiesen, aktueller Schluessel akzeptiert, alter Auftrag fehlt. Auftragsfelder blieben unveraendert. Reparaturmodus anschliessend erfolgreich abgeschlossen; Nachweis unten.


## Erfolgreicher Reparatur- und Veroeffentlichungslauf

Am 24.09.2026 um 22:32:12 UTC (25.09.2026, 00:32:12 MESZ) wurde die alte lokale Vormerkung nach erneut bestandenem Negativ-/Positivtest als `cancelled` abgeschlossen. Kennung und alter Konfigurationsdigest blieben erhalten. Die Referenzsicherung liegt im FileMaker-Server-Dokumentenordner; die FileMaker-Datendatei verwendet UTF-16 und muss entsprechend gelesen werden.

Anschliessend wurde der unveraenderte regulaere Export fuer Deutsch/Englisch gestartet. FileMaker meldete `Die Veroeffentlichung ist online.` Neue aktive Publication:

`BACKSTAGE-065df7a1-cb05-3548-b024-3bfde53216cc`

Der gespeicherte Bestand enthaelt 107 Concepts sowie 198 deutsche und 222 englische Terme. Die HTTPS-Auftragsabfrage bestaetigt dieselbe Kennung. Abschlussbericht: `outputs/ionos-job-recovery-20260925/stage-recovery-result.json`. Die vollstaendige Kunden-Generalprobe bleibt separat im Austauschplan gefuehrt.

Abschlusspruefung um 22:38:50 UTC: Dienst `Running`, HTTPS-Health `ok`, alter Auftrag weiterhin nicht vorhanden. Neuer Auftrag `065df7a1-cb05-3548-b024-3bfde53216cc` auf Dateisystem und authentifizierter HTTPS-Abfrage jeweils `succeeded`, dieselbe Publication aktiv. Erstellung 22:33:19.288 UTC, Abschluss 22:33:28.413 UTC.

Referenzsicherung: `C:\Program Files\FileMaker\FileMaker Server\Data\Documents\stage-recovery-C53BF4D3-8815-9748-9525-F72D02002A5C.json`; SHA-256 `A5898B464DDE0DB8CE570BD0EE6A80132A941A64CBED9F5A894540E61DB167BD`. JSON erfolgreich als UTF-16 gelesen; alte Kennung, Zustand `reserving`, Zeitstempel und Konfigurationsdigest vorhanden.

Browserpruefung auf IONOS ueber `https://stage.flashterm.test:18444/flashterm.html`: ohne Zertifikatswarnung geladen, Suche `gas` liefert Treffer; `exhaust gas / Abgas`, Concept `100321`, mit Definition angezeigt. Dies ist ein Smoke-Test, keine vollstaendige fachliche oder Client-/Netzabnahme.

Die Wartungsroutine bleibt zur Nachvollziehbarkeit installiert, ist nicht im Scriptmenue sichtbar und verweigert jeden Auftrag ausser der alten exakten Kennung im Zustand `reserving`. Sie ist keine allgemeine Kunden-Reparaturfunktion. Keine Aenderung am regulaeren Helper oder Export, kein Commit/Push.
