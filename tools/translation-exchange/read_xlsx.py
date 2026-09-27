"""Read the literal exchange table, without executing Excel formulas or macros."""
import json
import posixpath
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def read_table(path):
    with zipfile.ZipFile(path) as book:
        infos = book.infolist()
        if len(infos) > 2000 or sum(i.file_size for i in infos) > 30_000_000:
            raise ValueError("Datei überschreitet die zulässige Größe.")
        if len({i.filename for i in infos}) != len(infos):
            raise ValueError("Mehrdeutiges Excel-Dateipaket.")
        if any("vbaproject" in i.filename.lower() or "externallinks/" in i.filename.lower() for i in infos):
            raise ValueError("Makros und externe Arbeitsmappenverknüpfungen sind nicht erlaubt.")
        workbook = ET.fromstring(book.read("xl/workbook.xml"))
        sheets = [s for s in workbook.findall("s:sheets/s:sheet", NS) if s.get("name") == "Übersetzung"]
        if len(sheets) != 1:
            raise ValueError("Blatt Übersetzung fehlt oder ist mehrdeutig.")
        relations = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
        links = [r for r in relations if r.get("Id") == sheets[0].get(REL)]
        if len(links) != 1 or links[0].get("TargetMode") == "External":
            raise ValueError("Ungültiger Blattverweis.")
        target = links[0].get("Target", "")
        target = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
        if not target.startswith("xl/worksheets/"):
            raise ValueError("Ungültiger Blattpfad.")
        strings = []
        if "xl/sharedStrings.xml" in book.namelist():
            for item in ET.fromstring(book.read("xl/sharedStrings.xml")).findall("s:si", NS):
                strings.append("".join(t.text or "" for t in item.findall(".//s:t", NS)))
        root = ET.fromstring(book.read(target))
        rows = {}
        seen_cells = set()
        for cell in root.findall("s:sheetData/s:row/s:c", NS):
            address = cell.get("r", "")
            match = re.fullmatch(r"([A-Z]+)([1-9][0-9]*)", address)
            if not match or address in seen_cells:
                raise ValueError("Ungültige oder doppelte Zelladresse.")
            seen_cells.add(address)
            column = 0
            for letter in match[1]:
                column = column * 26 + ord(letter) - 64
            row = int(match[2])
            if column > 12 or row > 10010:
                raise ValueError("Zusätzliche Spalten oder zu viele Zeilen.")
            if cell.find("s:f", NS) is not None:
                raise ValueError("Formeln sind in der Rücklieferung nicht erlaubt.")
            kind = cell.get("t", "n")
            node = cell.find("s:v", NS)
            value = node.text if node is not None and node.text is not None else ""
            if kind == "s":
                if not value.isdigit() or int(value) >= len(strings):
                    raise ValueError("Ungültiger Textverweis.")
                value = strings[int(value)]
            elif kind == "inlineStr":
                value = "".join(t.text or "" for t in cell.findall("s:is//s:t", NS))
            elif kind not in ("str", "n") or (kind == "n" and value):
                raise ValueError("Nur Textzellen sind erlaubt; Kennungen als Text belassen.")
            if len(value) > 32000:
                raise ValueError("Zelltext ist zu lang.")
            rows.setdefault(row, [""] * 12)[column - 1] = value
        # The first eight rows contain title and instructions. Header is row 9.
        if 9 not in rows:
            raise ValueError("Tabellenkopf fehlt.")
        return [rows[9]] + [rows[r] for r in sorted(rows) if r > 9]


if __name__ == "__main__":
    try:
        result = read_table(sys.argv[1])
        print(json.dumps(result, ensure_ascii=False))
    except (ValueError, KeyError, IndexError, zipfile.BadZipFile, ET.ParseError):
        # Never echo arbitrary workbook payloads into command logs.
        print("Rücklieferung ist kein gültiges Übersetzungsblatt. Bitte Format, Zelltypen und Formeln prüfen.", file=sys.stderr)
        sys.exit(2)
