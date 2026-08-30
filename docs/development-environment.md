# Entwicklungsumgebung für flashterm STAGE starten

Stand: 16. August 2026

## Voraussetzungen

Für die lokale Entwicklung werden benötigt:

- Node.js 18 oder neuer einschließlich npm,
- Zugriff auf das Repository `flashterm STAGE`,
- eine lokale, gültige `config.js`,
- Netzwerkzugriff auf den konfigurierten FileMaker-Server,
- ein moderner Browser.

Die Anwendung verwendet Vanilla HTML, CSS und JavaScript ohne Build-Prozess. Das Projekt besitzt keine externen npm-Paketabhängigkeiten; ein vorheriges `npm install` ist derzeit nicht erforderlich.

Versionen prüfen:

```text
node --version
npm --version
```

## 1. In das Projektverzeichnis wechseln

Alle folgenden Befehle werden in der Wurzel des Worktrees ausgeführt, in der auch `package.json`, `flashterm.html` und `scripts/dev-server.js` liegen.

Vor dem Start sollte der Repository-Zustand geprüft werden:

```text
git status --short --branch
```

Ein losgelöster `HEAD` verhindert den lokalen Start nicht. Vor späteren Codeänderungen sollte jedoch bewusst ein geeigneter Arbeitsbranch verwendet werden.

## 2. Lokale Konfiguration bereitstellen

Der Entwicklungsserver benötigt eine Datei `config.js` in der Projektwurzel. Sie ist absichtlich durch Git ignoriert und darf niemals committed, überschrieben oder mit realen Werten in Dokumentation, Logs oder Antworten kopiert werden.

Wenn noch keine `config.js` existiert:

1. `config.example.js` als Strukturvorlage verwenden.
2. Eine neue lokale `config.js` anlegen.
3. Die installationsspezifischen Werte ausschließlich lokal eintragen.

Erwartet werden diese Felder:

| Feld | Zweck | Wichtige Einschränkung |
|---|---|---|
| `server` | FileMaker-Origin für den lokalen Proxy und die Concept-Bilder | Muss eine HTTPS-Origin ohne Pfad, Query oder Fragment sein; der Bildpfad wird daraus und aus `database` abgeleitet |
| `database` | Name der FileMaker-Datenbank | Nicht protokollieren oder weitergeben |
| `username` | FileMaker-Benutzer | Nicht committen oder ausgeben |
| `password` | FileMaker-Passwort | Nicht committen oder ausgeben |
| `initialSourceLanguage` | Rückfall für die Ausgangssprache, falls `languageAPI` keine eindeutige Source liefert | Vollständigen erwarteten Sprachcode verwenden |
| `initialTargetLanguage` | Standardzielsprache | Vollständigen erwarteten Sprachcode verwenden |

Vorhandene lokale Konfigurationen dürfen nicht automatisch durch die Beispieldatei ersetzt werden. `config.example.js` enthält ausschließlich Platzhalter und darf keine realen Zugangsdaten erhalten.

Ein separates Feld `imagePath` wird nicht mehr verwendet. Falls es in einer bestehenden lokalen Konfiguration noch vorhanden ist, kann es bei einer bewussten lokalen Anpassung entfernt werden. Der Bildpfad entsteht automatisch aus `server` und `database`.

## 3. Entwicklungsserver starten

Den lokalen Server starten:

```text
npm run dev
```

Bei erfolgreichem Start meldet der Server die lokale Adresse. Standardmäßig lautet sie:

```text
http://127.0.0.1:8000/
```

Diese Adresse im Browser öffnen. Der Aufruf der Stammseite lädt `index.html` und leitet mit allen Query-Parametern zu `flashterm.html` weiter.

Für ein bestimmtes Sprachpaar können `source` und `target` übergeben werden:

```text
http://127.0.0.1:8000/?source=de-DE&target=en-GB
```

Die Beispielcodes müssen durch Sprachcodes ersetzt werden, die in der angeschlossenen Installation tatsächlich vorhanden sind. Ein abweichender `source`-Code wird beim Start auf die in FileMaker markierte Source korrigiert. Ein unbekannter `target`-Code wird weiterhin erst bei der nächsten bestätigten Sprachwahl bereinigt.

## 4. Alternativen Port verwenden

Port `8000` kann über `FLASHTERM_DEV_PORT` ersetzt werden:

```text
FLASHTERM_DEV_PORT=8080 npm run dev
```

Der Server bindet ausschließlich an `127.0.0.1`. Er ist damit für die lokale Entwicklung vorgesehen und wird nicht im Netzwerk veröffentlicht.

## 5. Was der Entwicklungsserver übernimmt

Der lokale Server stellt zwei Funktionen unter derselben Browser-Origin bereit:

1. Er liefert HTML, CSS, JavaScript, JSON und Assets direkt aus dem Repository aus.
2. Er leitet Requests unter `/fmi/` an den in `config.js` hinterlegten HTTPS-FileMaker-Origin weiter.
3. Er leitet Bildanfragen unter `/public/RC_Data_FMS/` an denselben Origin weiter.

Für den Browser erzeugt er eine virtuelle `/config.js`, in der ausschließlich `config.server` auf `''` gesetzt wird. Dadurch verwendet der Browser relative `/fmi/`- und Bildadressen und umgeht lokale Cross-Origin-Probleme. Die lokale Datei `config.js` selbst wird nicht verändert.

Der Server besitzt kein Live Reload. Nach Änderungen muss die Seite im Browser manuell neu geladen werden.

## 6. Start erfolgreich prüfen

Nach dem Öffnen der Anwendung mindestens kontrollieren:

1. Die Weiterleitung zu `flashterm.html` funktioniert.
2. Der Wiki-Modus und die Startfläche werden angezeigt.
3. Die Ladeanzeige verschwindet nach der Initialisierung.
4. Source- und Target-Sprache erscheinen in den Modusbeschriftungen.
5. Eine bekannte Suche liefert Vorschläge.
6. Bei einem Concept mit Bilddatei wird das Bild angezeigt.
7. Inspector und Translator reagieren auf eingefügten Text.
8. Ein Zielsprachenwechsel aktualisiert den Translator.
9. Es erscheinen keine unerwarteten Browserfehler.

Zugangsdaten, Session-Token und vollständige FileMaker-Antworten dürfen bei der Fehlersuche weder kopiert noch in Tickets oder Testprotokolle übernommen werden.

Die vollständige manuelle Prüfliste steht in [`characterization-baseline.md`](characterization-baseline.md) unter „Manuelle Smoke-Test-Matrix“.

## 7. Automatisierte Tests ausführen

Vor und nach Änderungen:

```text
npm test
```

Der erwartete aktuelle Stand ist `130/130` erfolgreiche Tests. Einige Dev-Server- und Stage-API-Tests öffnen temporäre Loopback-Ports. In eingeschränkten Ausführungsumgebungen kann dafür eine lokale Freigabe erforderlich sein.

Zusätzliche Prüfungen nach JavaScript-Änderungen:

```text
find . -type f -name '*.js' -not -path './.git/*' -not -name 'config.js' -print0 | xargs -0 -n1 node --check
git diff --check
git diff
```

Der vollständige Diff muss geprüft werden. Commit und Push erfolgen ausschließlich auf ausdrücklichen Auftrag.

Der neue, noch parallel betriebene Veröffentlichungsserver besitzt eine eigene Start- und Testanleitung in [`stage-server-development.md`](stage-server-development.md). Er ersetzt den hier beschriebenen FileMaker-Entwicklungsserver noch nicht.

## 8. Entwicklungsserver beenden

Im Terminal mit laufendem Server:

```text
Ctrl+C
```

Das beendet den lokalen HTTP-Server. Ein expliziter FileMaker-Logout ist derzeit nicht an das Beenden des Entwicklungsservers oder das Schließen des Browserfensters gekoppelt.

## 9. Typische Startprobleme

### `config.js` fehlt

Symptom: Der Server beendet sich vor dem Start mit einem Hinweis auf ein nicht gefundenes Modul.

Abhilfe: Lokale `config.js` anhand von `config.example.js` anlegen. Keine bestehende Datei überschreiben und keine Werte veröffentlichen.

### FileMaker-Origin wird abgelehnt

Symptom: Der Entwicklungsserver meldet, dass ein HTTPS-Upstream oder eine reine Origin erforderlich ist.

Abhilfe: `config.server` muss dem Muster `https://host.example` entsprechen. Pfade wie `/fmi/`, Query-Parameter und Fragmente gehören nicht in diesen Wert.

### Port ist bereits belegt

Symptom: Der Server kann den lokalen Port nicht öffnen.

Abhilfe: Einen anderen Port über `FLASHTERM_DEV_PORT` wählen.

### Login oder Datenabruf schlägt fehl

Mögliche Ursachen:

- FileMaker-Server oder VPN ist nicht erreichbar,
- Zugangsdaten oder Datenbankname sind lokal nicht korrekt,
- benötigte FileMaker-Layouts sind nicht verfügbar,
- Zertifikat oder HTTPS-Verbindung wird abgelehnt,
- die FileMaker-Session ist serverseitig abgelaufen.

Nur generische Statusinformationen dokumentieren. Keine Credentials, Token, vollständigen URLs mit sensitiven Bestandteilen oder kompletten API-Antworten ausgeben.

### Oberfläche lädt, einzelne Funktionen fehlen

SheetJS, das URL-Polyfill und `markdown-it` werden derzeit von externen CDNs geladen. Netzwerkfilter oder CDN-Ausfälle können insbesondere Excel-Export oder Markdown-Infoboxen beeinträchtigen.

## 10. Kurzablauf für den täglichen Start

```text
1. Repository-Status prüfen.
2. Sicherstellen, dass die lokale config.js vorhanden und gültig ist.
3. npm run dev ausführen.
4. http://127.0.0.1:8000/ im Browser öffnen.
5. Start, Suche und betroffenen Arbeitsmodus kurz prüfen.
6. Nach der Arbeit den Server mit Ctrl+C beenden.
```
