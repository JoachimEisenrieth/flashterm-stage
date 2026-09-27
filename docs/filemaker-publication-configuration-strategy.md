# Kundenunabhängige STAGE-Anbindung in FileMaker

Stand: 2026-09-20. Strategie mit der Bestandsanalyse von flashterm backstage abgeglichen.
Erste Umsetzung und Abnahme ausschließlich in `flashterm-dev`.

## Verbindlicher Rahmen

Beim Kunden werden Einstellungen gepflegt, keine kundenspezifischen Scripts
geändert. BACKSTAGE liefert ein gemeinsames Scriptpaket. Installationswerte
werden dauerhaft in FileMaker gespeichert. Die aktuelle IONOS-Erprobung an
`flashterm-mbraun` ist unterbrochen; die dortigen manuellen Scriptänderungen
sind keine Vorlage für die Kundeninstallation.

Der STAGE-Dienst und sein Data-API-Lesezugang wurden auf IONOS geprüft.
Eine Veröffentlichung ist noch nicht erfolgt: Die FileMaker-Herkunftsprüfung
blockiert vor dem Aufruf des Dienstes.

## Konfigurationsvertrag

Die folgenden Namen beschreiben fachliche Werte, noch keine beschlossenen
FileMaker-Feldnamen. BACKSTAGE ordnet sie seiner vorhandenen Struktur zu.

| Wert in FileMaker | Bedeutung |
| --- | --- |
| Konfigurationsversion | Ermöglicht eindeutige Prüfung und spätere Migration. |
| Veröffentlichung aktiviert | Neue Installationen sind zunächst deaktiviert. |
| STAGE-Basisadresse | Installationsabhängige Adresse des Veröffentlichungsdienstes. |
| Publikationskennung | Stabile Termbase-ID, passend zur serverseitigen Zuordnung. |
| Trigger-Schlüssel | Separater, geschützt gespeicherter Schlüssel nur für Veröffentlichungsaufträge. |
| Erwartete Quelle | Explizite Zuordnung der gehosteten Datei und ihres Hosts; genaue Darstellung gemeinsam festlegen. |

`flashterm-mbraun` kann bei der Einrichtung den Vorschlag `MBRAUN` liefern.
Der bestätigte Wert wird gespeichert; spätere Dateiumbenennungen ändern das
Veröffentlichungsziel nicht automatisch. Keine stillen Standardziele oder
Fallbacks auf eine Pilotinstallation.

Das Data-API-Konto und dessen Passwort bleiben in der geschützten
STAGE-Serverkonfiguration. FileMaker enthält nur den separaten Trigger-Schlüssel.
Konfiguration ist serverseitig persistente Einstellung, nicht allein eine
sitzungsabhängige globale Variable. Rechte zum Lesen des Schlüssels und zum
Ändern der Konfiguration werden im BACKSTAGE-Berechtigungsmodell festgelegt.

## Ausführungsort und Quellenprüfung

Vor dem Einbau wird festgelegt, ob der HTTP-Aufruf in FileMaker Pro oder in
einem Serverscript erfolgt. Die Basisadresse muss aus genau diesem Kontext
erreichbar sein. `127.0.0.1` bezeichnet den ausführenden Rechner und ist daher
kein allgemeiner Kundenstandard. HTTPS ist der reguläre Veröffentlichungsweg;
die bestehende lokale HTTP-Testadresse wird nicht zum Produktstandard.

Die bestehende Herkunftsprüfung wird durch eine konfigurierte, nachvollziehbare
Prüfung ersetzt. Lokale Dateien, falsche Hosts, umbenannte Quellen und
unvollständige Einstellungen werden vor Änderungen an API-Tabellen abgewiesen.
Host-Aliase müssen explizit eingerichtet werden; keine geratenen Hostlisten.

Eine kopierte Datei übernimmt auch ihre Einstellungen und Schlüssel. Eine
Installations-ID oder ein Aktivierungsfeld allein verhindert deshalb keine
Fehlveröffentlichung. Zur Strategie gehören Quellenbindung, kontrollierte
Einrichtung und ein dokumentierter Umgang mit Kopien und Wiederherstellungen.
Wie gleichnamige gehostete Kopien zuverlässig abgegrenzt werden, ist vor der
Freigabe gemeinsam nachzuweisen.

## Bestehenden Auftragsablauf erhalten

`STAGE Auftrag` liest und validiert die Einstellungen zentral. `361X-B STAGE`
behält die fachliche Auswahl-, Freigabe- und Exportlogik.

- Vor dem Export reservieren; nur bei bestätigtem `preparing` schreiben.
- Nach vollständig abgeschlossenem Export `ready` melden.
- Erfolg ausschließlich bei `succeeded` anzeigen.
- Bei unklarem Ausgang dieselbe Auftragskennung erhalten und Status prüfen.
- Sperren nicht automatisch verwerfen; `cancel` nur bei sicher beendeten Schreibern.

Der Server prüft weiterhin Quelle und Ziel gegen seine eigene Konfiguration.
Ein vom Client gelieferter Dateiname ist allein kein Herkunftsnachweis.
Das vorhandene Protokoll `reserve/ready/status/cancel` bleibt Grundlage;
Erweiterungen nur bei nachgewiesenem Bedarf.

## Reihenfolge

1. BACKSTAGE prüft vorhandene Tabellen, Felder, Rechte und Scriptabhängigkeiten.
2. Feldzuordnung, Ausführungsort und Quellen-/Kopierschutz gemeinsam festlegen.
3. In `flashterm-dev` eine kleine Konfigurationsoberfläche und zentrale Prüfung
   einbauen; Entwicklung ausschließlich auf ein isoliertes Testziel ausrichten.
4. Ende-zu-Ende-Test von `flashterm-dev` mit STAGE durchführen.
5. Erst nach Abnahme eine gemeinsame Releasefassung und Einrichtungsanleitung
   bereitstellen. Beim Kunden nur Konfiguration, Schlüsselzuordnung und Prüfung.

## Abnahmekriterien

- Neue Installation bleibt ohne Einrichtung deaktiviert.
- Gültige Konfiguration veröffentlicht vollständig in genau das zugeordnete Ziel.
- Fehlende Einstellungen, falscher Schlüssel und falsche Quelle verändern keine API-Tabellen.
- Lokale Kopie, anderer Host, Dateiumbenennung und Wiederherstellung werden kontrolliert behandelt.
- Aufruf vom Server und vom Arbeitsplatz gemäß gewähltem Ausführungsmodell geprüft.
- Doppelaufruf, zweiter Benutzer, Verbindungsabbruch und Neustart bewahren Sperren und Auftragskennung.
- Unvollständige Veröffentlichung ersetzt nicht den aktiven Stand.
- Kundenwechsel benötigt ausschließlich Einstellungsänderungen und keinen Scripteditor.
- Schlüssel erscheinen weder in Meldungen noch in Diagnoseprotokollen oder ausgelieferten Vorlagen.

## Referenzen

- [Automatische Veröffentlichung](automatic-publication.md)
- [Veröffentlichungsarchitektur](stage-publication-architecture.md)
- BACKSTAGE: `tools/stage-publication/automatic-publication-status.md`

Diese Strategie dokumentiert den neuen Weg. Die früheren Pilotanweisungen mit
festen Quellen-/Hostwerten beschreiben den bisherigen Stand und sind keine
Anleitung für neue Kundeninstallationen.

## Ergebnis der BACKSTAGE-Abstimmung

BACKSTAGE hat ausschließlich lesend seine vorhandenen Schema-, Script- und
Rechteanalysen ausgewertet. Die folgenden Einbaupunkte müssen vor Änderungen
gegen den aktuellen Stand von `flashterm-dev` geprüft werden.

### Speicherung und Bedienung

Korrektur durch Joachim: Kundenspezifische Einstellungen gehören nach
`AT_Mandant`, nicht nach `AT_Programm`. Die STAGE-Konfiguration wird daher beim
zugehörigen Mandanten gespeichert und über `AT_Mandant` gepflegt. `AT_Programm`
bleibt für die allgemeinen Programmeinstellungen zuständig.

Der Konfigurationsleser muss den zum Export gehörenden Mandanten eindeutig
auflösen. Tabellenauftreten, Datensatzzuordnung und Zugriffsrechte werden vor
dem Einbau in `flashterm-dev` geprüft. Auch der Serverhelfer muss diese Zuordnung
validieren; ein beliebiger erster Datensatz oder ein stiller Rückfall auf
Programmeinstellungen ist nicht zulässig.

Vorgesehene neue persistente Felder:

- `stageEnabled` (Zahl, Standard 0)
- `stageConfigVersion` (Zahl, initial 1; Version des Konfigurationsschemas)
- `stageTriggerBaseURL` (Text, vollständiger Endpunkt einschließlich `/api/export-jobs`)
- `stageTermbaseID` (Text, stabile Publikationskennung)
- `stageBindingID` (Text, vorgesehene serverseitige Registrierung; noch nicht implementiert)
- `stageSourceDatabase` (Text, registrierter exakter Dateiname)
- `stageSourceHost` (Text, registrierter Host; Aliase bei Bedarf gesondert)
- `stageTriggerKey` (Text, durch Feldrechte geschützt)
- `stageConfigRevision` (Zahl; Änderungsstand, getrennt von der Schemaversion)

Erste Ausbaustufe: eine Quelle und eine Termbase pro Installation. Eine spätere
Mehrzielkonfiguration benötigt ein eigenes Modell und gehört nicht in diesen Einbau.

### Ausführungsmodell

Bevorzugte Strategie: Der HTTP-Helfer läuft auf FileMaker Server, vom Client
über „Script auf Server ausführen“ gestartet. Bereits serverseitige Aufrufe
werden ausdrücklich erkannt. Die fachliche Exportlogik wird damit nicht
pauschal auf den Server verschoben. Es gibt keinen stillen Rückfall auf einen
HTTP-Aufruf am Client. Serverkompatibilität und Ergebnisübergabe zuerst in dev prüfen.

Damit kann ein Dienst auf demselben Server lokal erreichbar sein. Die konkrete
Adresse bleibt Konfiguration. Die bisherige Prüfung auf Mehrbenutzerstatus 2
darf nicht unverändert als alleinige Bedingung in den Serverhelfer übernommen
werden; Client- und Serverkontext sind getrennt zu prüfen.

### Rechte und Wiederaufnahme

Eine vorhandene BACKSTAGE-Analyse dokumentiert sehr breite Reader-Rechte.
Versteckte Layouts oder `$$Rolle` reichen deshalb nicht als Zugriffsschutz.
Aktuelle Feld- und Scriptrechte in dev prüfen: normale Konten dürfen weder
Konfiguration ändern noch Schlüssel lesen. Ein eng begrenzter privilegierter
Helfer prüft Aufrufrecht, Modus, Herkunft und registriertes Ziel selbst; er nimmt
keine beliebige Ziel-URL an und gibt keine Geheimnisse zurück.

Die heutigen `$$stageAutoJobID`/`$$stageAutoPhase` sind sitzungsgebunden.
Dauerhafte Wiederaufnahme braucht eine gespeicherte Auftragsreferenz. Optionale
Felder `stageLastJobID`, `stageLastJobState`, `stageLastJobAt` unterstützen die
Diagnose; die autoritative Sperre bleibt beim STAGE-Auftragsdienst. Parallele
Sitzungen dürfen eine offene Referenz nicht überschreiben. Ein Auftrag bleibt
an seinen Konfigurationsstand gebunden. Ziel-/Binding-/Schlüsselwechsel werden
während eines offenen Auftrags gesperrt. Deaktivierte Neuanlage darf die
autorisierte Statusabfrage eines bestehenden Auftrags nicht verhindern.

### Vor Implementierung noch auszuarbeiten

Für einen stärkeren Herkunftsnachweis empfiehlt BACKSTAGE eine frische
auftragsbezogene Kennung in der gehosteten Quelle, die STAGE über seinen eigenen
Data-API-Zugang gegenliest. Das ist eine mögliche Protokollerweiterung, noch
kein beschlossener Algorithmus. Schreibreihenfolge, Parallelität und Reservierung
müssen vor dem Einbau gemeinsam festgelegt werden.

Eine identische Ersatzkopie unter demselben Host und Dateinamen ist anhand
mitkopierter Werte nicht unterscheidbar. Installation, Klonen und Restore
brauchen deshalb einen kontrollierten Reaktivierungs-/Widerrufsprozess mit
serverseitiger Registrierung. Ausgelieferte Vorlagen enthalten keine aktiven
Schlüssel, Bindungen oder alten Aufträge.

Zusätzliche dev-Abnahme: fehlende/mehrdeutige oder falsche Mandantenzuordnung, direkte
Helferaufrufe durch Reader/Writer, verweigerter Schlüsselfeldzugriff, PSoS-Fehler,
Konfigurationswechsel bei offenem Auftrag und Wiederaufnahme nach Sitzungsende.
