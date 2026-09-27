# Arbeitsregeln für flashterm STAGE

## FileMaker-Dateien und Arbeitsablauf

- `flashterm-dev` ist die lokale Offline-Datei für Entwicklung und Tests von Skripten, Datenmodell, Layouts und Importverfahren. Fehler- und Rücknahmetests finden dort statt.
- `flashterm-fungi` ist die Online-Datei auf Centron und der verbindliche redaktionelle Demobestand. Inhaltliche Exporte und Übersetzungsaufträge stammen aus diesem Bestand; geprüfte Rücklieferungen werden dorthin übernommen.
- Technische Änderungen zuerst offline entwickeln und prüfen, anschließend gezielt in die Online-Datei übertragen. Die Online-Datei nicht durch eine Entwicklungskopie ersetzen. Kontrollierte abschließende Funktionstests dürfen online erfolgen.
- Vor Eingriffen das Ziel benennen und Dateiidentität sowie lokale bzw. gehostete Verbindung prüfen. Den Dateinamen allein nicht als Nachweis verwenden.
- Inhaltsübernahme und Veröffentlichung in STAGE sind getrennte Schritte. Ein Importauftrag beinhaltet keine automatische Veröffentlichung.
- Die bisherige lokale `flashterm-fungi` wurde vom Benutzer in `flashterm-dev` umbenannt. Historische Sicherungen und Berichte behalten ihre ursprünglichen Namen; sie sind kein zweiter verbindlicher Inhaltsbestand.

## Repository

- Dieses Repository enthält die STAGE-Version der bestehenden flashterm-Webanwendung.
- Bestehendes Verhalten ist grundsätzlich zu erhalten. Funktionen dürfen nur auf ausdrücklichen Auftrag geändert werden.
- Vor Änderungen sind die betroffenen Dateien und ihre Abhängigkeiten zu analysieren.
- Kleine, nachvollziehbare Änderungen sind großflächigen Refactorings vorzuziehen.
- `config.js` ist eine lokale, ignorierte Konfigurationsdatei. Sie darf niemals committed, überschrieben oder mit realen Werten in andere Dateien kopiert werden.
- `config.example.js` dokumentiert ausschließlich die erwartete Konfigurationsstruktur und darf keine realen Zugangsdaten oder installationsspezifischen Secrets enthalten.
- Secrets, Passwörter, Tokens und vollständige Zugangsdaten dürfen weder in Logs noch in Antworten ausgegeben werden.
- Es dürfen keine Browser-Logs ergänzt werden, die Credentials, FileMaker-Tokens oder vollständige API-Antworten ausgeben.
- Bestehende sicherheitskritische Logs dürfen nur im Rahmen eines späteren, ausdrücklich beauftragten Security-Refactorings entfernt werden.
- Die Anwendung verwendet HTML, CSS und Vanilla JavaScript mit ES-Modulen und besitzt keinen Build-Prozess. Frameworks, Build-Systeme oder Paketmanagement dürfen nur auf ausdrücklichen Auftrag eingeführt werden.
- FileMaker wird über die FileMaker Data API angesprochen. Änderungen an dieser Schnittstelle sind besonders vorsichtig vorzunehmen.
- `json/languages.json` und `json/translations.json` sind Anwendungsdaten und müssen strukturell gültiges JSON bleiben.
- Bestehende Dateinamen und URL-Pfade dürfen wegen möglicher externer Deployment- oder Serverabhängigkeiten nur auf ausdrücklichen Auftrag geändert werden.
- Nach Änderungen sind mindestens Syntax, offensichtliche Referenzfehler und `git diff` zu prüfen.
- Änderungen dürfen nur auf ausdrücklichen Auftrag committed oder gepusht werden.
- Die Partition `/Volumes/TRANSFER` dient ausschließlich dem Datentransport. Die Dateien der letzten Übertragung bleiben zur Nachvollziehbarkeit und als kurzfristige Reserve liegen. Erst vor der nächsten Nutzung prüfen, ob sie vollständig und verifiziert am Ziel übernommen wurden; nur dann die bisherigen Transportdateien entfernen. Bei unklarer Zuordnung oder unbestätigter Übernahme beim Benutzer nachfragen. Unbeteiligte Dateien und systemverwaltete versteckte Ordner bleiben erhalten. TRANSFER ist kein dauerhaftes Backup.
