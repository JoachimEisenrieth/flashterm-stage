# flashterm-fungi: Inhalte für eine öffentliche Produktdemo

Stand: 27.09.2026. Zielgruppe: Interessenten für flashterm, die Funktionen anhand von Pilzbegriffen ausprobieren.

## Ergebnis und Prüfgrenze

Der Bestand bietet einen geeigneten Ausgangspunkt, ist redaktionell aber noch nicht für eine öffentliche Produktdemo fertig. Für die erste Demo ist ein kleiner, vollständig ausgearbeiteter Rundgang wichtiger als zusätzliche Masse. Empfohlen werden sieben Leitbegriffe und drei kurze Aufgaben: nachschlagen, Benennungen prüfen, fremdsprachige Entsprechungen finden.

Nach Wiederherstellung des Serverzugangs wurde der aktive veröffentlichte Bestand vollständig lesend erfasst: `BACKSTAGE-4eb9882a-df29-453e-a44a-50570850f0ec`, veröffentlicht am 26.09.2026 um 23:32:40 UTC. Die aktive Zuordnung wurde auf dem Server geprüft. Die Struktur aller 53 Begriffe wurde ausgewertet; auffällige Inhalte und Leitbegriffe wurden redaktionell gelesen. Dies ist keine vollständige mykologische Begutachtung aller Rezepte und Übersetzungen. Es wurden keine Inhalte in FileMaker geändert und keine Veröffentlichung ausgelöst.

Aktuell erfasste Kennzahlen:

- 53 Begriffe, 230 Benennungen, sieben Sprachcodes und 26 Begriffe mit Bildreferenz. Die ältere, zunächst herangezogene Veröffentlichung hatte nur zwei Sprachen. Ihre deutschen und englischen Begriffsinhalte stimmen mit dem aktuellen Stand überein.
- Der Kräuterseitling ist mit Bild sichtbar; die Bildübernahme aus dem Originalcontainer funktioniert.
- Die bestehende Demo unterstützt WIKI, INSPECTOR und TRANSLATOR. Letzterer zeigt zielsprachige Vorzugsbenennungen zu erkannten Begriffen; er ist keine vollständige Satzübersetzung.

| Sprache | Begriffe mit Sprachdatensatz | Benennungen | Nichtleere Definitionen | Infoboxen mit Text |
|---|---:|---:|---:|---:|
| Deutsch | 53 | 96 | 23 | 28 |
| Englisch | 22 | 37 | 5 | 7 |
| Spanisch | 18 | 27 | 2 | 0 |
| Französisch | 18 | 28 | 2 | 0 |
| Italienisch | 17 | 24 | 2 | 0 |
| Latein | 1 | 1 | 0 | 0 |
| Chinesisch | 17 | 17 | 3 | 3 |

Alle vorhandenen Sprachdatensätze enthalten genau eine Vorzugsbenennung. Keine identische Benennung ist innerhalb einer Sprache mehreren Begriff-IDs zugeordnet (Vergleich ohne Beachtung der Großschreibung). Das ist strukturell eine gute Grundlage. Deutsch fehlen 30 Definitionen; bei 31 Begriffen fehlt ein englischer Sprachdatensatz vollständig. Nichtleere Felder sind noch kein Nachweis fachlicher Qualität.

Es gibt keine Einträge im strukturierten Linkfeld. Drei Infoboxen enthalten externe Links. Definitionsfußnoten enthalten einmal ChatGPT und einmal einen DeepL-Übersetzungsvermerk; beides ersetzt keinen Fachbeleg. Bildrechte und Erreichbarkeit der eingebetteten Links sind noch offen.

Arbeitskopie, Kennzahlen, Matrix aller 53 Begriffe und Ergebnisse der Beispieltextprüfung liegen unter `outputs/fungi-demo-review-20260927/`.

Grundlagen: `docs/centron-paripharma-2026-09-27.md`, `docs/original-image-export.md`, `docs/inspector-mustertexte.md` sowie die aktuelle Darstellung und Trefferlogik in `src/app/concept-view-model.js` und `src/app/term-mining.js`.

## Konkrete Befunde

| Priorität | Befund und Nachweis | Maßnahme |
|---|---|---|
| Hoch | Der bekannte Kräuterseitling-Eintrag verwendet englisch „Brown Oyster Mushroom“. Wageningen verwendet für Pleurotus eryngii „king oyster mushroom“. | Englische Vorzugsbenennung auf „king oyster mushroom“ ausrichten. Bestehende Variante anhand ihrer Quelle prüfen; nicht ohne Prüfung als allgemein falsch markieren. |
| Hoch | 100292 enthält tatsächlich „Substrat für Austernseiting“, 100284 „Brutdurchspinnug“, 100147 „Kokussubstrat“. | „Substrat für Austernseitling“, „Brutdurchspinnung“, „Kokossubstrat“. Absichtliche Fehler nur als gekennzeichneten Prüffall verwenden. |
| Hoch | Die Mustertexte enthalten AeroSense, TempGuard, ThermaTrack und FungiBoost N°1, ohne ihren Status als reale oder fiktive Produkte zu erklären. | Im Einstiegsrundgang weglassen. Falls später verwendet, Herkunft klären und fiktive Produkte ausdrücklich als solche kennzeichnen. |
| Bestätigt | Hericium erinaceus (100054) und Hericium coralloides (100065) sind bereits getrennte Artbegriffe, passend zur DGfM-Liste. | Trennung erhalten. Ein erläuternder Verweis ist möglich. |
| Mittel | Lange Mustertexte kombinieren Arten, Klimatechnik, Markennamen und mehrere Funktionen. | Je Aufgabe ein kurzes Beispiel mit nachvollziehbarer Erwartung anbieten. |
| Mittel | Wissenschaftliche Namen erscheinen als alternative Benennungen. | Als Suchzugang erhalten, im Informationstext ausdrücklich „wissenschaftlicher Name“ erläutern. Keine neue technische Sprachkategorie voraussetzen. |
| Mittel | Vorhandene Bilder sind technisch bestätigt; Rechte und Bildnachweise sind damit nicht geprüft. | Je öffentlich verwendetem Bild Urheber, Quelle und Nutzungsgrundlage erfassen. Vorhandene Originale bevorzugen. |

Quellen: [Wageningen, Forschungsbericht zu Pleurotus eryngii](https://edepot.wur.nl/401881), [DGfM, Artenliste kultivierbarer Speisepilze, Stand 10.01.2022](https://www.dgfm-ev.de/files/dokumente/PSV/2022-10-01_kultivierbare-speisepilze.pdf). Die DGfM-Empfehlung zu einer Benennung ist keine von uns behauptete gesetzliche Verbotsregel.

Weitere konkrete Befunde aus dem aktuellen Bestand:

- **100140 und 100296:** interne Testeinträge. 100140 enthält einen privaten wirkenden Namens-Testtext. Vor öffentlicher Freigabe aus dem Demo-Export ausnehmen; nicht endgültig löschen.
- **100017:** „hh“ als sichtbarer Rest in der Infobox. Die Definition wirbt mit gesundheitlichen Vorteilen, nennt aber nur ChatGPT als Quelle. Sachliche Artbeschreibung und Fachquelle einsetzen.
- **100006:** „Holunderpilz“ ist bevorzugt, sein eigener Kontext warnt jedoch vor genau dieser Benennung. Redaktionelle Entscheidung und Begründung müssen zusammenpassen. Artzuordnung von Handelsnamen zusätzlich prüfen.
- **100294:** Die Definition setzt Gleichgewichtsfeuchte zunächst mit 100 % gleich, ihr eigenes Beispiel nennt 75 %. Das ist ein interner Widerspruch; Definition fachlich überarbeiten.
- **100004:** Deutsche und englische FungiBoost-Rezepturen verwenden unterschiedliche Zutaten und Mengen. Deutsch ergeben die aufgeführten Werte der 2-kg-Spalte 1.990 g und der 10-kg-Spalte 9.925 g; zudem skaliert Gips nicht proportional. Für eine Übersetzungsdemo sind diese Tabellen kein konsistentes Sprachpaar.
- **100286:** Ein konkretes Flaschenprotokoll mit Datum und Lieferantenkürzel ist enthalten. Vor Veröffentlichung klären, ob es echte Arbeitsdaten sind; gegebenenfalls durch ausdrücklich fiktive Beispiele ersetzen.
- **100054/100065 und weitere Artporträts:** medizinische beziehungsweise gesundheitliche Nutzenbehauptungen ohne erkennbaren Fachnachweis. Für die Produktdemo neutrale, belegte Beschreibungen vorsehen, statt diese Behauptungen ungeprüft zu übernehmen.
- **100193:** „Wachstumsparameter“ ist abgelehnt, wird aber in mehreren eigenen Infobox-Überschriften verwendet. Den eigenen Inhalt gegen die eigene Benennungsregel prüfen; entweder Regel begründen oder Benennung zulassen.
- **100270:** Lackmuspapier wird mit einer genauen pH-Farbskala beschrieben, während pH-Teststreifen als abgelehntes Synonym geführt wird. Messprinzip und Begriffsabgrenzung fachlich prüfen, bevor damit eine Demo argumentiert.
- **Sprachmischung:** Chinesische Infoboxen enthalten teilweise deutsche Überschriften. Die spanische Vorzugsbenennung „iente de coral“ in 100065 wirkt abgeschnitten und benötigt sprachliche Prüfung.

Die Tabellen mit Zuchtparametern sind umfangreich, aber im erfassten Stand nicht ausreichend belegt. Sie sollten erst nach fachlicher Prüfung öffentlich als Anleitung erscheinen. Für die Produktdemo reichen kurze Informationen, die die Tabellenfunktion zeigen.

## Redaktioneller Mindeststandard

Für jeden Leitbegriff:

1. Ein fachlicher Begriff pro Datensatz; vorhandene ID erhalten.
2. Genau eine Vorzugsbenennung je Sprache. Die aktuelle Anzeige wählt sonst nur den ersten passenden Eintrag.
3. Eine kurze deutsche und englische Definition mit derselben Bedeutung.
4. Ein eigener, als Beispiel erkennbarer Verwendungssatz je Sprache.
5. Mindestens eine nachvollziehbare Fachquelle mit Titel, Link und Prüfdatum.
6. Alternativen oder abgelehnte Benennungen nur mit einer erklärbaren redaktionellen Entscheidung; nicht künstlich jede Kategorie füllen.
7. Bei Bildern zusätzlich Motiv, Urheber und Nutzungsgrundlage dokumentieren. Ein Bild ist nicht für jeden Prozessbegriff nötig.

Deutsch bleibt Ausgangssprache; Englisch bleibt die Zielvariante en-US für den ersten Rundgang. Die weiteren vorhandenen Sprachen bleiben erhalten. Ihre gezielte Vervollständigung folgt nach einem konsistenten deutschen und englischen Kern. Latein ist bereits als eigener Sprachcode vorhanden, aber nur für einen Begriff befüllt; die zukünftige Rolle wissenschaftlicher Namen daher einheitlich festlegen.

## Umsetzung auf Grundlage der Bestandsprüfung

Die vollständige Strukturmatrix liegt vor. Vier der vorgeschlagenen Leitbegriffe existieren: Kräuterseitling 100001, Austernseitling 100017, Shiitake 100067 und Substrat 100157. Myzel, Hyphe und Fruchtkörper sind im veröffentlichten Bestand keine eigenen Begriffe. Vor ihrer Anlage noch die unveröffentlichten FileMaker-Datensätze prüfen. Myzelwachstum (100284) ist ein anderer Begriff und wird nicht ersetzt.

Zuerst Testinhalte und offensichtliche Fehler bereinigen, dann die sieben Leitbegriffe aus `fungi-demo-redaktionspaket.md` vervollständigen. Anschließend die weiteren Sprachen und übrigen Fachtexte prüfen. Fehlende Daten werden als fehlend erfasst, nicht als fachlicher Fehler gewertet.

Die aktuelle Erkennungslogik wurde mit dem ausgelesenen Bestand und den zwei vorbereiteten Texten ausgeführt: Der INSPECTOR-Text liefert exakt die drei erwarteten Benennungen, jeweils einmal, mit den richtigen Bewertungen. Der TRANSLATOR-Text erkennt bisher vier der sieben Leitbegriffe; bei Shiitake und Substrat fehlen englische Entsprechungen. Dies ist ein lokaler Daten-/Logiktest, kein neuer Browserdurchlauf.

Vor Übernahme den konkreten Änderungsstand sichern. Nach Übernahme aus FileMaker neu veröffentlichen und die drei Aufgaben im Browser mit Deutsch/Englisch prüfen. Quellen und Bildnachweise müssen auch in der sichtbaren Darstellung nachvollziehbar sein.

Für eine spätere öffentliche Demo separat sicherstellen, dass der öffentliche Zugang ausschließlich fungi sieht. Der gegenwärtige gemeinsame angemeldete Zugang zu fungi und pariPharma ist kein Muster für eine öffentliche Freigabe beider Bestände.

## Abnahmekriterien

- Alle sieben Leitbegriffe sind in Deutsch und Englisch vollständig und über die erwarteten Benennungen auffindbar.
- Jede der drei Demo-Aufgaben hat ein tatsächlich geprüftes Ergebnis; die Trefferzahlen sind dokumentiert.
- Eine abgelehnte Benennung hat eine sichtbare Begründung, keine pauschale Aussage „fachlich verboten“.
- Es gibt keine ungeklärten Bildrechte oder unmarkierten Fantasieprodukte im Rundgang.
- Verweise führen zum richtigen Begriff; Art und Oberbegriff werden nicht als Synonyme vermischt.
- Die Demo beschreibt TRANSLATOR als Terminologiehilfe und verspricht keine Satzübersetzung oder automatische Fehlerkorrektur.

Offen bleiben die Übernahme der redaktionellen Änderungen in FileMaker, die Fachprüfung der zurückgestellten Inhalte und der Browserdurchlauf nach erneuter Veröffentlichung. Der Live-Bestandsabgleich ist abgeschlossen.
