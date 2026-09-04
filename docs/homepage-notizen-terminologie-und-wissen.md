# Homepage-Notizen: Terminologie und nutzbares Fachwissen

Stand: 21. August 2026

Status: Arbeitsnotizen, noch keine freigegebenen Homepage-Texte

## Zweck

Diese Notizen sammeln Gedanken, Nutzenargumente und mögliche Formulierungen für die spätere Homepage von flashterm. Sie dienen als gemeinsames Arbeitsmaterial. Aussagen zu Lizenzierung, Sicherheit, Standards und Produkteigenschaften müssen vor einer Veröffentlichung noch einmal gegen den dann tatsächlich angebotenen Produktstand geprüft werden.

## Leitgedanke

Terminologiearbeit endet nicht mit der Freigabe eines Begriffs. Ihr Wert entsteht, wenn Menschen die freigegebenen Benennungen finden, verstehen und in ihrem Arbeitsalltag sicher anwenden können.

flashterm verbindet deshalb zwei klar getrennte Aufgaben:

- **flashterm backstage:** Terminologie erstellen, bearbeiten, prüfen, freigeben und gezielt veröffentlichen.
- **flashterm stage:** veröffentlichte Terminologie finden, verstehen, prüfen und im Unternehmen anwenden.

Die Trennung macht aus einer redaktionellen Terminologiedatenbank eine kontrolliert veröffentlichte Wissensquelle für einen größeren Nutzerkreis.

## Von Terminologie zu Fachwissen

Eine Vorzugsbenennung allein beantwortet nicht immer die fachliche Frage. Menschen benötigen je nach Aufgabe zusätzlich:

- Definitionen,
- Verwendungskontexte,
- Hinweise und Erläuterungen,
- Benennungsstatus und Begründungen,
- mehrsprachige Entsprechungen,
- Tabellen mit technischen Daten,
- Anleitungen oder Verfahrensbeschreibungen,
- Links, Bilder und weitere Medien.

Diese Inhalte gehören weiterhin zu einem Begriff, erfüllen aber unterschiedliche Aufgaben. Definition, Kontext und Fachartikel sollten deshalb sichtbar voneinander getrennt bleiben.

## Der Fachartikel

Die bisherige interne Bezeichnung **Infobox** ist technisch weiterhin brauchbar. Für die Nutzeroberfläche und die Homepage beschreibt **Fachartikel** den möglichen Inhalt besser. Als zurückhaltendere Alternative kommt **Zusatzwissen** infrage.

Ein Fachartikel ist:

- optional,
- einer Sprache zugeordnet,
- mit einem Concept verbunden,
- redaktionell gepflegt und veröffentlicht,
- für längere, formatierte Inhalte vorgesehen,
- klar von der terminologischen Definition getrennt.

Mögliche Inhalte sind Überschriften, Absätze, Listen, Tabellen, Links und Bilder. So kann ein Eintrag nicht nur sagen, welcher Begriff richtig ist, sondern auch erklären, was Menschen für seine fachgerechte Anwendung wissen müssen.

### Nutzenargument

Klassische Terminologiedatenbanken enthalten häufig Definitionen, Kontexte, Quellen, Hinweise und Medien. Ausführliche Artikel, Tabellen und Bildergalerien sind weniger selbstverständlich. Genau hier kann flashterm eine Brücke zwischen Terminologiemanagement und einem anwendungsnahen Wissensportal bilden.

Der Fachartikel ersetzt weder Definition noch Kontext. Er ergänzt sie dort, wo ein Begriff mehr Erklärung benötigt.

## Redaktion und Veröffentlichung

Der Administrator beziehungsweise die Terminologieredaktion bestimmt in backstage:

- welche Sprachen veröffentlicht werden,
- welche Fach- oder Unternehmensbereiche enthalten sind,
- welche Inhalte ausgeschlossen werden,
- wann ein neuer Stand veröffentlicht wird.

stage zeigt ausschließlich den bewusst veröffentlichten Datenstand. Die redaktionelle Arbeit und die Nutzung durch Mitarbeitende bleiben damit voneinander getrennt.

Ein möglicher kurzer Ablauf für die Homepage:

1. Terminologie in backstage erstellen und prüfen.
2. Sprachen, Bereiche und Inhalte für die Veröffentlichung auswählen.
3. Einen versionierten Veröffentlichungsstand erzeugen.
4. Die Daten in stage prüfen und bereitstellen.
5. Mitarbeitenden den kontrollierten Zugriff auf die für sie bestimmten Termbasen geben.

## TBX als Übergabeformat

TBX ist ein standardisiertes Austauschformat für begriffsorientierte Terminologiedaten. Es eignet sich als nachvollziehbare Übergabe zwischen der Redaktion in backstage und der Veröffentlichung in stage.

Unser derzeitiges Zielbild:

```text
flashterm backstage
        |
        | veröffentlicht ein geprüftes TBX-Paket
        v
flashterm stage
        |
        | validiert, übernimmt und aktiviert den Stand
        v
Wiki, Inspector, Translator und Exporte
```

Vorteile dieser Trennung:

- stage benötigt für die Auslieferung veröffentlichter Inhalte keine direkte Verbindung zu FileMaker.
- Backstage und stage können auf unterschiedlichen Servern betrieben werden.
- Mehrere Termbasen lassen sich als getrennte Bestände verwalten.
- Veröffentlichungen können versioniert, geprüft und bei Bedarf zurückverfolgt werden.
- Das Übergabeformat bleibt dokumentierbar und grundsätzlich portabel.
- Weitere Terminologiequellen können später über dasselbe fachliche Modell angebunden werden.

### TBX-Profil von flashterm

Die terminologischen Kerndaten folgen der Struktur von TBX 3. Inhalte, die über den üblichen Kern hinausgehen, werden in einem dokumentierten Profil **TBX-flashterm** eindeutig gekennzeichnet. Dazu gehört derzeit der sprachbezogene Fachartikel mit kontrolliertem HTML-Inhalt.

Auf der Homepage sollten wir deshalb nicht behaupten, ausschließlich ein unverändertes TBX-Core-Profil zu verwenden. Präziser wäre beispielsweise:

> flashterm nutzt TBX 3 als Grundlage und ergänzt es durch ein dokumentiertes Profil für anwendungsnahes Fachwissen.

Referenz: [ISO 30042:2019 – TermBase eXchange (TBX)](https://www.iso.org/standard/62510.html)

## Artikel, Bilder und Veröffentlichungspakete

HTML ermöglicht formatierte Fachartikel einschließlich Tabellen, Links und Bildern. Für einen sicheren und dauerhaft portablen Betrieb sollte stage nur kontrolliertes HTML akzeptieren und nicht erlaubte Inhalte beim Import zurückweisen oder bereinigen.

Langfristig bietet sich ein vollständiges Veröffentlichungspaket an:

```text
terminology.tbx
manifest.json
articles/
assets/images/
```

Bilder und andere Medien sollten möglichst über relative Pfade innerhalb des Pakets referenziert werden. Dadurch bleibt eine Veröffentlichung unabhängig von bisherigen FileMaker-Pfaden und kann später leichter vom Entwicklungs-Mac auf einen Windows-Server übernommen werden.

## Zugang und Systemtrennung

Personen melden sich an stage an und erhalten Zugriff auf die für sie freigegebenen Termbasen. Sie arbeiten dabei mit dem veröffentlichten Datenbestand von stage und nicht direkt mit der redaktionellen FileMaker-Datei.

Für die Homepage geeignete, sachliche Aussage:

> flashterm stage liefert veröffentlichte Terminologie aus einem eigenen Datenbestand aus – ohne direkten FileMaker-Zugriff der angemeldeten Personen.

Nicht ungeprüft verwenden:

- „lizenzfrei“,
- „garantiert ohne FileMaker-Lizenzen“,
- „umgeht FileMaker-Lizenzierung“.

Die konkrete produktive Architektur soll die Systeme und Nutzergruppen sauber trennen. Die lizenzrechtliche Bewertung muss vor dem kommerziellen Einsatz für den geltenden Claris-Vertrag bestätigt werden.

## Mögliche Positionierung

flashterm stage ist nicht die nächste komplexe Pflegeoberfläche. Es ist die anwendungsnahe Schicht zwischen redaktionell gepflegter Terminologie und den Menschen, die sie in Kommunikation, Dokumentation, Zulassung, Übersetzung oder anderen Fachbereichen benötigen.

Mögliche Differenzierungsmerkmale:

- Terminologie wird nicht nur gefunden, sondern verständlich vermittelt.
- Begriffe können mit strukturiertem Fachwissen verbunden werden.
- Redaktion und Nutzung sind technisch und organisatorisch getrennt.
- Inhalte werden bewusst nach Sprache und Bereich veröffentlicht.
- Mehrere Termbasen können kontrolliert bereitgestellt werden.
- TBX schafft eine nachvollziehbare und portable Übergabe.
- Suche, Textprüfung und mehrsprachige Nutzung greifen auf denselben freigegebenen Bestand zu.

## Entwürfe für Überschriften und Leitsätze

Diese Formulierungen sind Varianten, noch keine Festlegung:

- **Terminologie, wo sie gebraucht wird.**
- **Aus Terminologie wird nutzbares Unternehmenswissen.**
- **Begriffe finden. Zusammenhänge verstehen. Wissen sicher anwenden.**
- **Unternehmensterminologie, die mehr kann als Begriffe verwalten.**
- **Ein Begriff ist der Einstieg. Das Wissen dahinter macht ihn wertvoll.**
- **Freigegebene Terminologie für alle, die sie anwenden.**
- **flashterm verbindet Terminologiemanagement mit strukturiertem Fachwissen.**

## Entwurf für eine kurze Produktbeschreibung

> flashterm stage bringt freigegebene Unternehmensterminologie zu den Menschen, die sie täglich anwenden. Begriffe, Definitionen, Kontexte und mehrsprachige Benennungen werden durch Fachartikel, Tabellen und Bilder ergänzt. Die Redaktion behält in flashterm backstage die Kontrolle darüber, welche Sprachen, Bereiche und Inhalte veröffentlicht werden.

Alternative mit stärkerem Fokus auf die Systemtrennung:

> Terminologie wird in flashterm backstage gepflegt und gezielt veröffentlicht. flashterm stage übernimmt den geprüften Stand, stellt ihn unabhängig vom redaktionellen System bereit und macht ihn für berechtigte Personen durch Suche, Textprüfung und mehrsprachige Ansichten nutzbar.

## Möglicher Aufbau der Homepage

1. **Einstieg:** Leitsatz und unmittelbarer Nutzen.
2. **Das Problem:** Gepflegte Terminologie erreicht nicht automatisch alle Menschen, die sie benötigen.
3. **Die Lösung:** backstage verwaltet, stage veröffentlicht und vermittelt.
4. **Terminologie verstehen:** Definitionen, Kontexte, Status und Sprachen.
5. **Fachwissen ergänzen:** Fachartikel mit Tabellen, Links und Bildern.
6. **Terminologie anwenden:** Wiki, Inspector und Translator.
7. **Kontrolliert veröffentlichen:** Auswahl von Sprachen und Bereichen, Versionierung und Berechtigungen.
8. **Offen übergeben:** TBX-basierter Veröffentlichungsweg und mehrere Termbasen.
9. **Vertrauen:** Systemtrennung, Anmeldung und kontrollierte Inhalte.
10. **Handlungsaufforderung:** Demonstration ansehen oder Pilotprojekt besprechen.

## Beispiele für eine spätere Demonstration

Die vorhandenen Testdaten zeigen bereits anschaulich, welchen Mehrwert Fachartikel bieten können:

- tabellarische technische oder fachliche Parameter,
- ausführliche Beschreibungen und Anleitungen,
- ergänzende Links,
- Bildergalerien,
- sprachbezogene Artikel innerhalb eines mehrsprachigen Concepts.

Für die öffentliche Homepage sollten daraus kurze, gut verständliche und rechtlich unbedenkliche Beispieldaten erstellt werden. Reale oder vertrauliche Unternehmensinhalte gehören nicht in eine öffentliche Demonstration.

## Möglicher Beitrag zum Deutschen Terminologietag

Die Idee eines anwendungsnahen TBX-Viewers könnte sich für einen Vortrag oder eine Live-Demonstration beim Deutschen Terminologietag eignen. Interessant ist dabei weniger die reine Darstellung einer XML-Datei als der Schritt vom Austauschformat zur unmittelbar nutzbaren Terminologieanwendung.

Mögliche Kernaussage:

> TBX ist nicht länger nur ein Austauschformat zwischen Systemen, sondern wird zur unmittelbar nutzbaren Wissensquelle.

Mögliche Vortragstitel:

- **Von der TBX-Datei zum Terminologieportal – Terminologie ohne Systemhürde zugänglich machen**
- **TBX öffnen. Terminologie nutzen.**
- **Aus TBX wird Wissen: Ein Austauschformat als nutzbares Terminologieportal**

Eine Demonstration könnte zeigen:

1. Eine TBX-Datei wird lokal geöffnet.
2. Struktur, Dialekt, Sprachen und Inhalte werden geprüft.
3. Concepts werden als verständliche mehrsprachige Einträge dargestellt.
4. Definitionen, Kontexte, Benennungsstatus und Fachartikel werden sichtbar.
5. Tabellen, Links und Bilder ergänzen das terminologische Wissen.
6. Inspector und Translator arbeiten unmittelbar mit demselben Bestand.
7. Aus der lokalen Datei kann später eine geschützte veröffentlichte Termbase entstehen.

Der reale flashterm-Export kann als erster belastbarer Demonstrationsbestand dienen. Für einen öffentlichen Vortrag sollte daraus rechtzeitig eine anonymisierte oder synthetische Beispieldatei mit aussagekräftigen Inhalten entstehen.

## Sprachliche Leitplanken für die Homepage

- **Fachartikel** oder **Zusatzwissen** statt der internen Feldbezeichnung **Infobox** verwenden.
- Zwischen terminologischer Definition und ergänzendem Artikel klar unterscheiden.
- Von einem **TBX-basierten, dokumentierten flashterm-Profil** sprechen.
- Die Systemtrennung konkret beschreiben, aber keine ungeprüften Lizenzversprechen geben.
- Sicherheitsmerkmale nur nennen, wenn sie im angebotenen Produktstand tatsächlich umgesetzt und überprüft sind.
- Keine allgemeine Marktführerschaft oder vollständige Unterstützung aller TBX-Dialekte behaupten.
- Den Nutzen für die Anwender in den Vordergrund stellen; FileMaker, HTML und Serverdetails gehören in nachgeordnete technische Informationen.

## Später zu entscheiden

- Soll der sichtbare Name **Fachartikel** oder **Zusatzwissen** lauten?
- Welche Zielgruppe soll die Homepage zuerst ansprechen?
- Soll backstage als eigenes Produkt oder als redaktioneller Teil von flashterm dargestellt werden?
- Welche zwei oder drei Anwendungsfälle eignen sich am besten für die erste öffentliche Darstellung?
- Wie sieht der endgültige Editor für Artikel, Tabellen, Links und Bilder aus?
- Welche HTML-Elemente werden im Veröffentlichungsprozess zugelassen?
- Wie werden Bilder in das Veröffentlichungspaket übernommen und referenziert?
- Welche TBX-Dialekte sollen neben TBX-flashterm importiert werden können?
- Welche Aussagen zur FileMaker- und Claris-Lizenzierung sind schriftlich bestätigt?
- Welche Funktionen gehören bereits zum ersten Angebot und welche werden als Ausblick gekennzeichnet?
