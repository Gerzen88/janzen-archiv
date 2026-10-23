# Familienarchiv Janzen

Durchklickbares Ahnenarchiv der Familie Janzen (russlandmennonitische Linie,
Donezker Kolonie → Kasachstan/Pawlodar).

**Live:** https://janzen-archiv.pages.dev
**Kein Index bei Suchmaschinen** (`noindex`) — der Link ist zum Weitergeben gedacht,
die Seite soll aber nicht in Google auftauchen.

## Was drin ist

| Datei | Inhalt |
|---|---|
| `index.html` | die komplette Archiv-Seite (Stammbaum, Personen, Belege, Dokumente, Zeitleiste) — eine einzige Datei, kein Server, keine externen Abhängigkeiten |
| `Akten/01_Stammbaum_Janzen.pdf` | der handgezeichnete Stammbaum |
| `Akten/02_Openlist_Janzen_Ivan_1908.md` | Repressionsfall Янцен Иван Генрихович (1908), Pawlodar — russischer Volltext, Übersetzung, Bewertung |
| `Akten/03_Deportationslisten_Kasachstan.csv` | 101 Einträge zu Янцен/Ремпель/Эннс/Шварц mit Geburtsjahren und Herkunftsdörfern |
| `Akten/04_GRANDMA_Index_Rempel-Linie.md` | Belege für Bernhard Rempel 1805 → Heinrich D. 1853 → Anna H. 1874 |
| `Akten/05_Bericht_russische_Quellen.md` | Auswertung der russischsprachigen Quellen |

## Bedienung

`index.html` lokal doppelklicken oder die Live-Adresse öffnen. Fünf Reiter:

- **Stammbaum** — sieben Reihen von Heinrich Doell (1799) bis Gerhard Janzen; Klick auf
  eine Person öffnet rechts die Akte mit Eltern, Partnern, Kindern, offenen Fragen und Belegen.
- **Personen** — alle 27 Namen mit Suchfeld.
- **Belege** — jeder Fund mit Originalzitat, Quelle, Link und Sicherheitsstufe
  (`belegt` / `kandidat` / `geprüft-verworfen` / `negativ`).
- **Dokumente** — der Aktenordner.
- **Zeitleiste** — 1799 bis 1983.

## Herkunft der Seite

`index.html` wird lokal aus `familie.yaml` (Personen), `befunde.yaml` (Belege) und dem
Ordner `Akten/` erzeugt (`python ahnen.py html`). Dieses Repository enthält bewusst nur
das Ergebnis — nicht die Rohdaten und nicht die Recherche-Werkzeuge.

## Quellen

- Открытый список (ru.openlist.wiki) — Daten des ДКНБ РК по Павлодарской обл. und МВД Казахстана
- de-archiv.kz — Списки насильственно выселенных в Казахскую ССР немцев
- Odessa Digital Library (odessa3.org) — GRANDMA-Index, Busau-Kirchenbuch, EWZ-Register
- Stammbaum-PDF (Familienüberlieferung)

## Wichtig

„Belegt" heißt: in einer Transkription oder einem Dokument gefunden — nicht automatisch
urkundlich bewiesen. Die Zuordnung des Repressionsfalls zu Johann Janzen (1908) ist als
**Kandidat** markiert; Gewissheit gäbe nur die Strafakte aus Pawlodar.
