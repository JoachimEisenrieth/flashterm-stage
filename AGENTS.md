# Arbeitsregeln für flashterm STAGE

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
