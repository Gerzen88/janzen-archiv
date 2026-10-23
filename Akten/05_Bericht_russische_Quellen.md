# Russischsprachige Quellen — Befund vom 23.10.2026

Zwei Quellen waren ergiebig, eine dritte ist vorbereitet. Alles hier ist **Kandidat**,
solange kein Dokument die Identität bestätigt.

---

## 1. Открытый список (ru.openlist.wiki) — Opfer politischer Repression in der UdSSR

**Zugang:** Die Textsuche der API ist abgeschaltet. Auslesbar ist die Datenbank über
`list=allpages` (Namenspräfix) plus `prop=revisions` (Seiteninhalt). Werkzeug:
`ru_openlist.py`, `ru_scan.py` im Projektordner.

**Bestand (Namenspräfixe):** Янцен 686 · Янзен 8 · Ремпель 322 · Эннс 214 Seiten.
(Deutsche Schreibweise Шварц ist zu häufig, um sie sinnvoll zu filtern.)

### Haupttreffer: Янцен Иван Генрихович (1908)

| Feld | Inhalt |
|---|---|
| Name | Янцен Иван Генрихович — *Johann, Sohn des Heinrich* |
| Geburt | 1908 |
| Geburtsort | Gebiet Donezk, Dorf **Jekaterinowka** |
| Nationalität | Deutscher |
| Beruf | Elektromonteur |
| Wohnort vor Verhaftung | **Gebiet Pawlodar**, Rajon Jermakowski, Kolchose **Shana-Ekpen** |
| Verhaftung | 15.08.1945, Kaganowitscher RO des UNKWD Pawlodar |
| Urteil | 10.11.1945, Gebietsgericht Pawlodar, Art. **58-10** StGB RSFSR, **7 Jahre ITL** |
| Rehabilitierung | 10.09.1966, Oberster Gerichtshof der Kasachischen SSR |
| Archivquelle | ДКНБ РК по Павлодарской обл.; МВД Республики Казахстан |

Link: https://ru.openlist.wiki/Янцен_Иван_Генрихович_(1908)

**Warum das passt:** Vorname Johann, Vatersname Heinrich, Jahrgang 1908, Deutscher,
Wohnort Kasachstan (Pawlodar) — vier von vier Angaben stimmen mit dem Stammbaum überein.

**Warum es noch kein Beweis ist:** Es gibt in derselben Datenbank weitere
„Янцен Иван Генрихович" (Jahrgänge 1907 und 1910). Der 1907er war in der Trudarmee
(Kirower RVK, 26.05.1942), der 1910er hat keinen Biografie-Text. Ohne die Strafakte
ist die Zuordnung sehr plausibel, aber nicht gesichert.

### Negative Befunde (auch das ist Information)
- **Heinrich Janzen * 1874** kommt nicht vor — er wurde entweder nicht verfolgt,
  starb vor 1937, oder die Akte ist nicht in dieser Datenbank erfasst.
- **Anna Rempel * 1876** kommt nicht vor.
- **Katharina Schwarz * 1835** liegt vor der Sowjetzeit — dort nicht zu erwarten.

---

## 2. de-archiv.kz — „Listen der gewaltsam in die Kasachische SSR verbrachten Deutschen"

**Zugang:** GET `https://de-archiv.kz/ru/baza-dannyh?q=<Name>`, Ergebnisse werden
per JavaScript geladen → nur mit echtem Browser lesbar (browser_exec), nicht per curl.
Gespeichert: `funde/de_archiv.json`.

**Bestand je Nachname:** Янцен 31 · Ремпель 9 · Эннс 20 · Шварц 41 Einträge
(jeweils mit Geburtsjahr und **Geburtsort**).

### Die entscheidende Beobachtung: die Herkunftsdörfer

| Ort in den Listen | Mennonitensiedlung |
|---|---|
| Розенорт (Rosenort) | Don-Jekaterinoslaw / Donezker Kolonie |
| Лихтенау (Lichtnau) | Donezker Kolonie |
| Орлово (Orloff) | Donezker Kolonie |
| Тиге (Tiege) | Donezker Kolonie |
| Екатериновка (Jekaterinowka) | Donezker Kolonie — **genau der Geburtsort aus dem Открытый-список-Eintrag** |
| Гольбант (Halbstadt) | Molotschna |

Das ist ein geschlossenes Bild: Die Familie stammt nicht aus dem alten Chortitza oder
Molotschna, sondern aus der **Donezker Mennonitenkolonie** (ab 1880er Jahren gegründet,
Raum Jusowka/Stalino, heute Donezk). Von dort erfolgte 1941 die Deportation nach
Kasachstan — Pawlodar, Rajon Jermakowski.

### Einzelne Namen, die weiterzuverfolgen sind
- **Янцен Сусана Петровна, * 1874, с. Гольбант** — gleicher Jahrgang wie Heinrich 1874,
  aber anderer Vorname. Könnte eine Schwägerin/Cousine sein.
- **Янцен Генрих Абрамович, * 1925, Орлово** und **Янцен Лена Абрамовна, * 1922, Орлово** —
  Geschwisterpaar aus Orloff, nächste Generation.
- **Янцен Елена Францовна, * 1921, Лихтенау** mit Geschwistern (1928, 1933) — Familie aus Lichtnau.
- **Ремпель Анна Генриховна, * 1902, Местенберг (Münsterberg)** — Tochter eines Heinrich,
  aber Jahrgang 1902; passt nicht zu unserer Anna 1876.
- **Эннс Иван** mit Kindern in Лихтенау und Орлово (1924–1941) — die Enns-Linie
  scheint ebenfalls aus der Donezker Kolonie zu stammen.

---

## 3. Was daraus folgt (Hypothesen, ausdrücklich als solche)

1. Die Familie Janzen lebte vor 1941 in der **Donezker Mennonitenkolonie**,
   vermutlich in **Jekaterinowka** oder **Orloff/Lichtnau**.
2. Die Deportation erfolgte 1941 nach **Gebiet Pawlodar** (Rajon Jermakowski).
3. Johann (1908) wurde 1945 dort verhaftet und 1952/53 entlassen; er starb 1983.
4. Heinrich (1874) ist in Kasachstan gestorben, ohne dass eine Akte digital erfasst ist.

## 4. Nächste Schritte

1. **Strafakte anfordern** — beim ДКНБ РК по Павлодарской области (bzw. МВД РК) zur
   Akte Янцен Иван Генрихович, 1908. Die Akte enthält Verhörprotokolle,
   Familienangaben und ein Foto; das würde die Identität endgültig klären.
2. **Geburtsregister Jekaterinowka** (Donezker Kolonie) — Taufen 1908 und 1874.
   Zuständig: Staatsarchiv Donezk bzw. verfilmt bei FamilySearch.
3. **GRanDMA-Zugang** für die Rempel-Linie (Bernhard 1805 → Dietrich 1829 →
   Heinrich D. 1853 → Anna H. 1876) — dort stehen die Eltern.
4. **de-archiv.kz breiter abfragen** (Jahrgänge 1870–1930, alle vier Nachnamen) —
   die Liste ist paginiert, es lohnt das Durchblättern.
