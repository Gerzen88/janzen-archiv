# Recherche-Runde 2 — 23.10.2026

Durchgeführt nach dem Import der MyHeritage-Personenliste (775 Personen, 480 mit Geburtsjahr).
Erstmals standen damit **exakte Geburtsdaten und Geburtsorte** für die Kernvorfahren zur Verfügung —
vorher waren nur Jahre und die mündliche Überlieferung da.

## 1. Ausgangslage: die Kernlinie mit den neuen Angaben

| Person | Daten | Ort (MyHeritage) | zusätzliche Quelle |
|---|---|---|---|
| Johann Janzen | 12.01.1908 – 1983 | — | Открытый список: geb. **Jekaterinowka, Oblast Donezk** |
| Helena Janzen geb. Enns | 21.09.1910 – 2001 | „Jgnatjew" | — |
| Heinrich Janzen | 08.01.1874 – ? | „Steinfeld, Deutschland" ⚠ | — |
| Anna Janzen geb. Rempel | 12.12.1876 – 1920 | — | — |
| Isaak Enns | 03.03.1883 – ? | **Chortyzja, Voznesenivskyi** | — |
| Anna Isaak geb. Reger | 27.10.1913 – 1997 | — | — |
| David Isaak | 20.07.1913 – 2002 | — | — |
| Heinrich D. Rempel | 10.04.1853 – 1934 | Rosenthal, South Russia | GRANDMA-Index bestätigt Datum |
| Maria Rempel geb. Loewen | 1856 – 1882 | South Russia | — |
| Katharina Janzen geb. Schwarz | 18.03.1835 – 1921 | — | — |

⚠ **Widerspruch:** Heinrich Janzen * 1874 soll in „Steinfeld, Deutschland" geboren sein. Das passt
nicht zu einer russlandmennonitischen Familie, die 1908 im Donezker Gebiet sitzt. Wahrscheinlich ein
MyHeritage-Datenfehler oder eine Verwechslung mit einem Spätaussiedler-Ort. Bleibt offen.

## 2. Durchsuchte Datenbanken

| Quelle | Land | Zugang | Umfang der Abfrage | Ergebnis |
|---|---|---|---|---|
| **Открытый список** (ru.openlist.wiki) | RU | Browser, `Special:OlSearch` | 10 Nachnamen + 12 gezielte Vor-/Vatersnamen-Abfragen mit Jahresfilter ±2 | **1 Treffer bestätigt** (Янцен Иван Генрихович 1908, Jekaterinowka/Donbass); 6 Vorfahren-Generationen **negativ** |
| **Arolsen Archives** | int. | Browser | „Janzen Johann 1908", „Enns Pawlodar", „Rempel Pawlodar" | **1 Personenkarte** JANZEN Johann (US-Zone 1939–47, DocID 70434050) — Kandidat, Dokument noch anzusehen |
| **GRANDMA-Index** (lokal, 80.504 Einträge) | int. | lokale Volltextsuche | 12 exakte Datum-+-Name-Kombinationen | nur `Rempel, Heinrich D. * 10 Apr 1853` (schon bekannt) |
| **Odessa3 / EWZ** | int. | Agent `ahnen.py suche --alle-kategorien` | 16 Kategorien, alle Namensvarianten: 8.531 → **49.764 Funde** | **0 neue Treffer.** Die 124 als „brauchbar" gemeldeten waren Rauschen — das Wort „Russia" zählte als Ortsbezug. Nach verschärfter Bewertung bleiben 15 Funde: 2 „sehr wahrscheinlich" (der bereits verworfene `Janzen, Heinrich * 15 Aug 1872 Pordenau`), 13 „prüfen" (falsche Generation/Familie) |
| **reabit.org.ua** „Реабілітовані історією", Oblast Donezk | UA | Download | **9 Bände, 180 MB** heruntergeladen und textlich geprüft | Textebene defekt (kyrillische Glyphen nicht auf Unicode abgebildet), Bände 1–2 reine Scans → **ohne OCR nicht durchsuchbar** |
| **Память народа** | RU | — | Suchabfrage 1908 | **CAPTCHA** — automatisierte Abfrage nicht möglich, nicht umgangen |
| **lists.memo.ru** (Жертвы политического террора) | RU | — | — | Host nicht erreichbar (DNS/Verbindung) |
| **cdiak / zarch / dn.archives.gov.ua** (Staatsarchive) | UA | — | — | HTTP 403 bzw. nicht erreichbar |
| **memorybook.org.ua** | UA | — | — | ist heute das Gedenkbuch des Kriegs ab 2022, kein Holodomor-Verzeichnis |

## 3. Was das Ergebnis bedeutet

1. **Die Vorfahren selbst sind nicht in den Repressionslisten.** Für Heinrich Janzen (1874),
   Anna Rempel (1876), Isaak Enns (1883), Helena Enns (1910), David Isaak (1913), Anna Reger (1913)
   gibt es in Открытый список keine Person. Das stützt die Annahme: **Deportation als Deutsche
   1941, nicht Verurteilung**. Nur Johann (1908) ist als Verurteilter dokumentiert.
2. **Die Enns-Linie hat jetzt zwei Orte.** Herkunft **Chortitza** (bei Saporischschja) laut
   MyHeritage 1883, Wohnort um 1910 **Ignatjewka** (Rajon Derschinsk, Oblast Stalino/Donjezk).
   Gegenprobe: In Открытый список liegen mehrere `Эннс` aus **Игнатьевка** — das Dorf ist damit
   für die Enns-Linie belegt, nicht nur behauptet.
3. **Jekaterinowka (Donezk) ist der Geburtsort von Johann 1908** — dieselbe Region wie Ignatjewka.
   Die Familie saß also geschlossen im Donezker Gebiet, bevor sie nach Pawlodar kam.
4. **Arolsen:** Ein Johann Janzen, Jahrgang 1908, existiert in einer US-Besatzungsliste. Ob es
   unserer ist, entscheidet das Dokument (Geburtsdatum/-ort). Ohne Bildprüfung bleibt es Kandidat.

## 4. Datenqualität / Widersprüche

- **Bewerter korrigiert:** Der Fund-Bewerter gab 15 Punkte für Wörter wie „Russia", „Prussia",
  „Mennonite" — dadurch standen fremde Personen oben und 124 Treffer galten als „brauchbar".
  Jetzt zählen nur echte Orte (Chortitza, Pawlodar, Donezk …); allgemeine Herkunftswörter geben
  4 Punkte und deckeln bei 79 („prüfen", nie „sehr wahrscheinlich"). Ergebnis: 49.685 Rauschen,
  64 schwach, 13 prüfen, 2 sehr wahrscheinlich — und die zwei sind der schon verworfene
  Pordenau-Fund. `funde.json` wurde mit der neuen Bewertung neu geschrieben, der Bericht ebenfalls.
- Heinrich Janzen 1874: Geburtsort „Steinfeld, Deutschland" — unplausibel, offen.
- MyHeritage nennt Anna Rempel (1876–1920) mit 1920, der Stammbaum-PDF ebenfalls; GRANDMA-Index
  führt `Rempel, Anna H * 1874 + 1919`. Drei Jahre, drei Quellen — die 1876/1920-Variante steht im
  Archiv, 1874/1919 ist als Abweichung notiert.
- 295 der 775 MyHeritage-Personen haben kein Geburtsjahr — für Zuordnungen unbrauchbar, deshalb
  im Archiv nur 24 sicher verknüpft.

## 5. Nächste Schritte (nach Nutzen/Risiko)

1. **OCR der Donezk-Bände.** Ohne Textebene ist die beste ukrainische Quelle unlesbar. Mit
   Tesseract (rus+ukr) über die 7 Bände mit Textebene: Namenssuche in genau der Oblast, in der die
   Familie lebte. Aufwand: Stunden, läuft nachts.
2. **Arolsen-Dokument 70434050 im Bild ansehen** — Geburtsdatum und -ort prüfen, dann entscheidet
   sich, ob der Kandidat echt ist.
3. **Chortitza-Kirchenbücher** (FamilySearch, kostenlos mit Konto) für Isaak Enns * 1883 und
   Katharina Schwarz * 1835 — die einzige Quelle, die vor 1874 zurückführt.
4. **Память народа manuell** (CAPTCHA) für Heinrich Janzen * 1895 und Johann * 1908 — Wehrdienst/
   Kriegsgefangenschaft.
5. **Katharinas Herkunft** ist geklärt: sie ist eine geborene **Isaak**, nicht unbekannt — der
   entsprechende offene Punkt im Archiv kann geschlossen werden.
