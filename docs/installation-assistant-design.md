# Installationsassistent für flashterm STAGE

Zielbild vom 25.09.2026. Zusätzlich zur klickbaren Simulation existiert inzwischen eine erste native Windows-Oberfläche (`deploy/windows/installer/setup-stage.ps1`). Sie verwendet den vorhandenen Installer und kennzeichnet die noch fehlende FileMaker-Zuordnung ausdrücklich. Eine signierte Setup.exe, Wiederaufnahme und vollständige Kundenfreigabe stehen noch aus.

## Ziel

Ein Administrator richtet STAGE auf dem Windows-Server ein. Anwender benötigen anschließend nur die Browseradresse. Der Assistent führt von der Bestandsprüfung bis zur ersten nachgewiesenen Veröffentlichung. Konfigurationsdateien, Portnummern und technische Schlüssel gehören nicht in den normalen Bedienablauf.

Der Assistent führt ausschließlich durch eine **Neuinstallation** in freie Zielverzeichnisse. Bereits belegte Ziele werden in der Vorprüfung erkannt und nicht überschrieben.

## Bildschirmfolge

| Seite | Sichtbare Angaben und Bedienung | Bedingung zum Fortfahren |
| --- | --- | --- |
| 1. Willkommen | Neuinstallation und Ablauf kurz vorstellen. | Mit „Weiter“ die Serverprüfung beginnen. |
| 2. Server prüfen | Verständliche Ergebnisse für Windows, FileMaker, Webserver und vorhandene STAGE. Schaltflächen „Erneut prüfen“ und „Prüfbericht speichern“. Details bei Bedarf aufklappbar. | Voraussetzungen, Paketintegrität, Rechte und freie getrennte Ziele bestätigt. Fehlende Voraussetzungen mit Abhilfe statt Rohfehler melden. |
| 3. Adresse und Zugang | Gewünschte STAGE-Adresse. Zertifikat nach Name und Ablaufdatum auswählen. „Im freigegebenen Firmennetz“ oder „Mit Firmenanmeldung“. | DNS, passende lokale Adresse, Zertifikatskette und Betriebsart geprüft. Netzgrenze durch zuständige IT nachweisen; DNS-Auflösung allein genügt nicht. Bei Firmenanmeldung Anbieter und Lesergruppe prüfen. |
| 4. FileMaker verbinden | FileMaker-Adresse, Quelldatei und technisches Lesekonto. Passwort verdeckt eingeben. „Verbindung prüfen“ und „FileMaker zuordnen“. | Data-API-Lesezugriff, benötigte Layouts, Felder und Scriptversion nachgewiesen. Quelle, Host und Veröffentlichungsziel eindeutig. Bei fehlender Anbindung verständlich auf den getrennten FileMaker-Einbau verweisen. |
| 5. Bereit zur Installation | Zusammenfassung: Adresse, Quelle, Zugriff, Zielordner und geplante Änderungen. Erweiterte Einstellungen nur bei Bedarf. „Installieren“ ist der erste Schritt, der die STAGE-Installation anlegt. | Vorprüfung frisch wiederholen; freie, getrennte Ziele bestätigt. |
| 6. Verbindung und Veröffentlichung testen | Fortschritt: Dienst gestartet → HTTPS erreichbar → FileMaker zugeordnet → Testbestand veröffentlicht → Bestand lesbar. Bei Fehler „Prüfen“ bzw. „Fortsetzen“ für denselben Auftrag. | Tatsächlicher Endstatus `succeeded`, aktive Publication und lesbarer Bestand stimmen überein. Ein angenommener Auftrag oder allein ein Healthcheck ist kein Erfolg. |
| 7. Fertig | „STAGE ist einsatzbereit“, Adresse, „STAGE öffnen“, Installationsbericht. | Nur belegte Tests als erfolgreich anzeigen. Separaten Clientzugriff und fachliche Abnahme als offen markieren, solange unbestätigt. |

## FileMaker-Zuordnung ohne Schlüsselkopieren

Zielbild: Der Assistent erzeugt die technische Berechtigung intern und führt durch eine geschützte Zuordnung zur vorgesehenen FileMaker-Datei. Ein Administrator bestätigt dort Quelle, Ziel und Adresse. Der normale Bildschirm zeigt danach nur „Zugeordnet“ und „Verbindung prüfen“.

Das ist noch zu implementieren. Das genaue Verfahren muss Berechtigung, eindeutige Zielzuordnung, kurze Gültigkeit einer etwaigen Einrichtungsfreigabe und Wiederholungen berücksichtigen. Keine dauerhafte Ausweitung des technischen Lesekontos auf administrative Schreibrechte. Keine Schlüssel in URL, Bericht, Zwischenablage oder Vorschau. Solange der sichere Zuordnungsweg fehlt, bleibt die Einrichtung betreut; der Assistent darf keine fertige Kopplung vortäuschen.

Die kundenspezifische IONOS-Wartungsroutine ist keine Installationsvorlage. Eine allgemeine administrative Wiederherstellung wäre ein eigenes Vorhaben. Offene Aufträge bei einer Schlüsseländerung niemals pauschal löschen oder automatisch als erledigt markieren.

## Fehler, Unterbrechung und Wiederaufnahme

- **Zertifikat:** „FileMaker vertraut dem STAGE-Zertifikat noch nicht. Die Veröffentlichung wurde nicht gestartet.“ Zeigen, auf welchem Rechner Vertrauen oder Sperrlisten-Erreichbarkeit fehlt; nach Korrektur erneut prüfen. Keine Option zum Abschalten der Zertifikatsprüfung.
- **Zugriff:** „Das FileMaker-Konto kann die benötigten Veröffentlichungsdaten nicht lesen.“ Fehlende Fähigkeit benennen, keine Zugangsdaten ausgeben.
- **Falsche Version:** „Diese FileMaker-Datei benötigt die STAGE-Anbindung in Version …“. Erst weiter, wenn die tatsächlich freigegebene Kompatibilitätsregel erfüllt ist.
- **Offener Auftrag:** „Der vorherige Auftrag ist noch nicht abschließend geklärt.“ Bestehende Kennung beibehalten; Status prüfen und bei Bedarf administrative Diagnose anbieten.
- **Installation unterbrochen:** Geschützten Fortschrittsstand mit Release, Instanz und angelegten Ressourcen speichern. Wiederaufnahme muss idempotent sein. Rücknahme nur eigener neu angelegter Ressourcen; vorhandene Daten erhalten.
- **Veröffentlichung fehlgeschlagen:** Installation als „Installiert, Einrichtung unvollständig“ anzeigen. Nicht durch einen erneuten Klick eine zweite konkurrierende Aufbereitung beginnen.

## Vorhandene Grundlage und fehlende Umsetzung

| Bereich | Vorhanden | Noch erforderlich |
| --- | --- | --- |
| Installation | PowerShell-Preflight, Paketmanifest, private Laufzeit, eigener Dienst und IIS-Site, Rücknahme frischer Ressourcen | Strukturierte Ergebnisse und Fortschrittsereignisse für eine Oberfläche; signierte Setup-Auslieferung; persistenter Einrichtungszustand |
| Webzugang | Auswahl eines vorhandenen Zertifikats per Fingerabdruck; DNS-/Bindingprüfung; Intranet- und OIDC-Modus | Verständliche Auswahl, vollständiger Vertrauens-/Sperrlistentest, Hilfe zur IT-Vorbereitung und Prüfung von einem separaten Client |
| FileMaker | Konfigurierbare Scripts und erfolgreicher IONOS-Publikationslauf | Instanzunabhängige Einrichtung, Kompatibilitätsprüfung, Prüfung aller benötigten Leserechte und geschützte Zuordnung |
| Automatische Publikation | Aufträge, Reservierung, Status und atomare Aktivierung | Instanzbezogener Einrichtungsweg und lesende FileMaker-Vorprüfung umgesetzt; sichere Zuordnung innerhalb der Quelldatei noch offen |
| Betrieb | Healthcheck und STAGE-Datensicherungsscript | Kleine Wartungsoberfläche für Version, Status, Diagnose, Sicherung/Wiederherstellung, Zertifikatsablauf, Update und Deinstallation mit expliziter Datenbehandlung |

## Umsetzung in überschaubaren Schritten

1. **Ablaufentwurf prüfen:** Diese Seiten und verständliche Begriffe mit einem Nichtentwickler durchgehen. Herausfinden, welche Angaben Administrator und Kunden-IT liefern müssen.
2. **Einrichtung vereinheitlichen:** Vorhandenen Installer mit strukturierten Prüf- und Fehlerergebnissen versehen. FileMaker-Einrichtung auf Instanz, Dienst und Ziel parametrieren; Kompatibilität und Zuordnung ergänzen. Keine neue Oberfläche vor funktionierendem Gesamtablauf als „fertig“ ausliefern.
3. **Assistent umsetzen:** Windows-Oberfläche und signiertes Installationspaket um die geprüften Abläufe legen. UI-Technologie separat wählen; keine Änderung am Vanilla-JavaScript-Aufbau der STAGE-Webanwendung erforderlich.
4. **Betrieb vervollständigen:** Wiederaufnahme, Diagnose, Sicherung und Deinstallation implementieren und prüfen. Spätere Updates als gesonderten Wartungsablauf planen.

## Abnahme der ersten auslieferbaren Fassung

Ein Administrator kann eine unterstützte frische Installation ohne Terminal und ohne manuelle Konfigurationsdatei abschließen. Es werden keine Schlüssel kopiert. Falsches Zertifikat, fehlende Rechte, unpassende FileMaker-Version und vorhandene Ziele werden vor ungeeigneten Änderungen erkannt. Nach der ersten Veröffentlichung sieht ein separater berechtigter Client den erwarteten Bestand. FileMaker bleibt erreichbar und seine Site unverändert. Abbruch, erneuter Start und Rücknahme erzeugen keine zweite Instanz und verlieren keine Daten. Berichte enthalten keine Secrets.

Die klickbare Vorschau ist keine Kundenfreigabe. Maßgeblich ist die praktische Abnahme der implementierten Neuinstallation.

## Referenzen

- [Vorhandener Windows-Installer](windows-customer-installer.md)
- [Erfassungsbogen](customer-installation-questionnaire.md)
- [IONOS-Publikationsnachweis](ionos-job-recovery-2026-09-25.md)
