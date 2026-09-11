# Mastersprachen und Standardauswahl

Stand: 2026-09-11. Lokal implementiert, noch nicht bereitgestellt.

FileMaker `languageAPI`: `source` enthält bei jeder Mastersprache ihren eigenen Sprachcode. `defaultSource` enthält in jeder Zeile den Code der Standard-Mastersprache. Die vorhandenen Mandanteneinstellungen `StandardQuellsprachen` und `StandardQuellsprache` bleiben maßgeblich; nur ausgewählte Veröffentlichungssprachen werden berücksichtigt.

STAGE startet mit dem Standard, bewahrt eine gültige explizite URL-Auswahl und bietet im Sprachdialog alle Mastersprachen an. Beide Termlisten werden vor dem Umschalten geladen. Ein Ladefehler erhält die bisherigen Listen und Sprachen. Die Zielauswahl schließt die gewählte Mastersprache aus.

Publikationen behalten Schema 1: `termbase.sourceLanguage` ist der Standard und muss eine als `isSource` markierte Sprache identifizieren. `isDefaultSource` ist optional für bestehende Publikationen. Eine einzelne bisherige Mastersprache bleibt ohne zusätzliches Feld gültig. Mehrere Mastersprachen benötigen beim Erstellen eine eindeutige Standardmarkierung. GUI-Sprachfassungen dürfen sich darin nicht widersprechen. Der Sprachcache wurde auf Version 5 erhöht.

FileMaker-Datei, STAGE-Frontend und Publikationsserver müssen gemeinsam aktualisiert werden, bevor Publikationen mit mehreren Mastersprachen verwendet werden. Ältere Server akzeptieren nur eine Mastersprache. Keine Bereitstellung erfolgt.

Prüfungen: vollständige Unit-Suite; zusätzliche Tests zu Mapping, Standard/Wechsel, widersprüchlichen Angaben, Publikations-Rundlauf, tatsächlicher Browser-Umschaltfunktion und Ladefehlern. Ein integrierter Test im online betriebenen STAGE steht aus.

## Unabhängige Prüfsprache

Inspector und Translator teilen eine eigene Prüfsprache. Sie ist unabhängig von der WIKI-Ausgangssprache und wird mit der Standard-Mastersprache vorbelegt. Beim Öffnen des Sprachdialogs werden ausschließlich veröffentlichte Sprachen mit nicht leerer Termliste angeboten. Inspector benötigt keine Zielsprache; Translator benötigt eine andere veröffentlichte Zielsprache. Moduswechsel laden die passende Termliste vor dem Umschalten und berechnen bestehende Textprüfungen neu. Die Auswahl bleibt innerhalb der Sitzung beim Moduswechsel erhalten; nach Neuladen wird die Prüfsprache wieder mit dem Standard vorbelegt. Die URL-Auswahl gehört weiterhin zu WIKI.

Mit den Online-Daten geprüft: Französisch im Inspector, Texteinfügen bleibt im Inspector, Rückkehr zu WIKI mit Deutsch/Englisch, anschließender Translator mit Französisch/Englisch. Keine FileMaker-Feldänderung und keine Bereitstellung.

## Zusammenführung mit M4 am 11. September 2026

Die M4-Textanalyse mit eigenem Eingabefeld und Schaltfläche Analysieren bleibt erhalten. Inspector und Translator verwenden dabei die unabhängige Prüfsprache. Das obere Suchfeld dient der WIKI-Suche; beim Wechsel werden zuerst die passenden Sprachdaten geladen.
