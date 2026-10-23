/* Bearbeiten, Grafik-Board und Export für das Familienarchiv Janzen.
 *
 *  - Änderungen liegen in Cloudflare KV (KV AHNEN_KV, Schlüssel "daten") und
 *    überschreiben beim Laden die gebaute Seite ("die Webseite ist führend").
 *  - Grafik-Board: Personen frei verschieben (Positionen werden gespeichert),
 *    Verknüpfungen per Ziehen vom Griff unten am Kasten, neue Personen per
 *    Doppelklick auf die Fläche.
 *  - Export: GEDCOM (für Ahnenprogramme), CSV (Excel), JSON (Vollsicherung).
 */
(function () {
  let webDaten = { personen: {}, geaendert: {} };

  const BOX_B = 176, BOX_H = 62, RAND = 30;
  const positionen = {};        // id -> {x, y}, Weltkoordinaten (auch negativ)
  let modus = "kind";           // "kind" = Eltern-Kind, "ehe" = Partnerschaft
  let ziehen = null;            // {id, dx, dy}
  let verbinden = null;         // {von, x, y}
  let schieben = null;          // {sx, sy, x0, y0} - Fläche verschieben
  let ansicht = { x: -200, y: -150, zoom: 1 };
  let ansichtGesetzt = false;
  const verlauf = [];           // Rückgängig-Stapel
  const redoStapel = [];        // Wiederholen-Stapel
  let rasterAn = false;         // Einrasten auf 24-px-Raster
  let entwurf = null;           // {x, y, eltern, partnerVon} während der Namenseingabe
  let speicherStand = "";       // Anzeige im Werkzeugkasten

  /* ---------- Stil ---------- */
  const stil = document.createElement("style");
  stil.textContent = `
    .bearb-knopf{margin-top:2px;padding:6px 14px;border-radius:6px;border:1px solid var(--akzent);
        background:var(--akzent);color:#fff;font-size:13px;cursor:pointer;width:100%}
    .editor label{display:block;font-size:10.5px;letter-spacing:1px;text-transform:uppercase;
        color:var(--leise);margin:10px 0 3px}
    .editor input,.editor textarea,.editor select{width:100%;padding:7px 9px;border:1px solid var(--linie);
        border-radius:5px;background:#fbf7ee;font-size:13.5px;color:var(--tinte);font-family:inherit;box-sizing:border-box}
    .editor textarea{min-height:52px;resize:vertical}
    .editor .paar{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .editor .reihe{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
    .editor .reihe button{padding:8px 14px;border-radius:6px;border:1px solid var(--akzent);
        background:var(--akzent);color:#fff;font-size:13px;cursor:pointer}
    .editor .reihe button.zweit{background:transparent;color:var(--akzent)}
    .editor .reihe button.rot{background:transparent;border-color:var(--rot);color:var(--rot)}
    .status{font-size:12.5px;color:var(--gruen);align-self:center}
    .status.fehler{color:var(--rot)}
    .neueperson{margin-bottom:12px;padding:7px 14px;border-radius:6px;border:1px dashed var(--linie);
        background:transparent;color:var(--akzent);font-size:13px;cursor:pointer}
    .boardwerkzeug{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
    .boardwerkzeug button{padding:6px 12px;border-radius:6px;border:1px solid var(--linie);
        background:var(--karte);color:var(--tinte);font-size:12.5px;cursor:pointer}
    .boardwerkzeug button.an{border-color:var(--akzent);background:var(--akzent);color:#fff}
    .boardwerkzeug .hinweis{font-size:12px;color:var(--leise)}
    #grafik{overflow:hidden;border:1px solid var(--linie);border-radius:8px;background:var(--karte);
        padding:0;height:72vh;min-height:460px;position:relative;touch-action:none}
    #board{width:100%;height:100%;display:block;background:#fffdf7;touch-action:none;cursor:grab}
    #board.schiebend{cursor:grabbing}
    #grafik .box{cursor:grab}
    #grafik .box:active{cursor:grabbing}
    #grafik .box:hover rect.haupt{stroke:var(--akzent);stroke-width:2}
    #grafik .griff{cursor:crosshair;opacity:.5}
    #grafik .griff:hover{opacity:1}
    #grafik .treffer{pointer-events:stroke;cursor:pointer}
    #grafik .treffer:hover + .sichtbar{stroke:#8c2f2f;stroke-width:2.4}
    .zoomanzeige{font-size:11.5px;color:var(--leise);min-width:44px;text-align:center}
    .exportkarte{background:var(--karte);border:1px solid var(--linie);border-radius:8px;padding:18px;
        max-width:760px;margin-bottom:14px}
    .exportkarte h3{margin:0 0 6px;font-family:Georgia,serif;font-size:17px}
    .exportkarte p{margin:0 0 12px;font-size:13px;color:var(--leise)}
    .exportkarte button{padding:9px 16px;border-radius:6px;border:1px solid var(--akzent);
        background:var(--akzent);color:#fff;font-size:13.5px;cursor:pointer}
  `;
  document.head.appendChild(stil);

  /* ---------- Daten ---------- */
  async function ladeWebDaten() {
    try {
      const antwort = await fetch("/api/data", { headers: { Accept: "application/json" } });
      if (antwort.ok) webDaten = await antwort.json();
    } catch (fehler) {
      console.warn("Web-Änderungen nicht ladbar (offline?):", fehler);
      return;
    }
    const ueber = webDaten.personen || {};
    Object.entries(ueber).forEach(([id, felder]) => {
      // Reine Board-Positionen sind keine inhaltliche Änderung -> nicht als "geändert" markieren
      const nurPosition = Object.keys(felder).every(k => k === "pos_x" || k === "pos_y");
      const person = byId[id];
      if (person) {
        Object.assign(person, felder);
        if (!nurPosition) person.web = true;
      } else {
        const neu = Object.assign({ id, generation: 0 }, felder, { web: true });
        DATA.personen.push(neu);
        byId[id] = neu;
      }
    });
    neuRechnen();
  }

  function neuRechnen() {
    try {
      const r = berechneReihen();
      Object.keys(reihen).forEach(k => delete reihen[k]);
      Object.assign(reihen, r);
      const v = verbundene();
      verbunden.clear();
      v.forEach(x => verbunden.add(x));
    } catch (e) { console.warn(e); }
  }

  function neuZeichnen() {
    try { baueBaum(); } catch (e) { console.warn(e); }
    try { bauePersonen(); } catch (e) { console.warn(e); }
    try { baueZeit(); } catch (e) { console.warn(e); }
    try { baueGrafik(); } catch (e) { console.warn(e); }
    try { fuelleStartListe(); if (baumModus !== "generationen") zeichnePedigree(); }
    catch (e) { console.warn(e); }
    zahlenAktualisieren();
  }

  function zahlenAktualisieren() {
    const werte = { "z-personen": DATA.personen.length, "z-belege": DATA.befunde.length,
                    "z-dok": DATA.dokumente.length };
    Object.entries(werte).forEach(([id, wert]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = wert;
    });
    const gen = document.getElementById("z-gen");
    if (gen) gen.textContent = Math.max(...Object.values(reihen)) + 1;
  }

  /* ---------- Hilfen ---------- */
  const femaleNamen = new Set(["anna", "helena", "katharina", "maria", "lena", "aganetta",
    "sara", "sarah", "susan", "susanna", "suzana", "elisabeth", "lisa", "justina", "irene",
    "irma", "margarete", "margarita", "eva", "emma", "olga", "leah", "marie"]);

  function jahresText(p) { return (p.jahr || "?") + "–" + (p.jahr_bis || "?"); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  function istWeiblich(p) { return femaleNamen.has(String(p.vorname || "").toLowerCase()); }

  function kinderVon(id) {
    const alle = new Set();
    const stapel = [id];
    while (stapel.length) {
      const k = stapel.pop();
      DATA.personen.filter(p => (p.eltern || []).includes(k)).forEach(p => {
        if (!alle.has(p.id)) { alle.add(p.id); stapel.push(p.id); }
      });
    }
    return alle;
  }

  function auswahlOptionen(ausschluss, gewaehlt) {
    return DATA.personen.filter(p => !ausschluss.has(p.id))
      .sort((a, b) => (reihen[a.id] ?? 0) - (reihen[b.id] ?? 0) ||
                      String(a.name).localeCompare(String(b.name), "de"))
      .map(p => `<option value="${p.id}"${p.id === gewaehlt ? " selected" : ""}>${esc(p.name)} (${jahresText(p)})</option>`)
      .join("");
  }

  function wert(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }

  async function sendeAPI(daten) {
    zeigeSpeicherstand("speichert …", false);
    try {
      const antwort = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(daten),
      });
      const ergebnis = await antwort.json();
      if (!antwort.ok || ergebnis.fehler) throw new Error(ergebnis.fehler || antwort.status);
      webDaten = ergebnis.daten;
      zeigeSpeicherstand("gespeichert " + new Date().toLocaleTimeString("de-DE").slice(0, 5), true);
      return ergebnis;
    } catch (fehler) {
      zeigeSpeicherstand("nicht gespeichert: " + fehler.message, false, true);
      throw fehler;
    }
  }

  function zeigeSpeicherstand(text, ok, fehler = false) {
    speicherStand = text;
    const el = document.getElementById("b-save");
    if (!el) return;
    el.textContent = text;
    el.style.color = fehler ? "#8c2f2f" : (ok ? "#2f6b3f" : "#9a6a12");
  }

  /* ---------- Editor im Detailpanel ---------- */
  function oeffneEditor(id) {
    const istNeu = !id || id === "__neu";
    const p = istNeu ? { id: "__neu" } : byId[id];
    if (!p) return;
    const ausschluss = new Set([p.id]);
    if (!istNeu) kinderVon(p.id).forEach(k => ausschluss.add(k));

    const vater = !istNeu && (p.eltern || [])[0] ? p.eltern[0] : "";
    const mutter = !istNeu && (p.eltern || [])[1] ? p.eltern[1] : "";
    const partner = !istNeu && (p.partner || [])[0] ? p.partner[0] : "";

    document.getElementById("detail").innerHTML = `
      <h2 style="margin-bottom:2px">${istNeu ? "Neue Person" : esc(p.name)}</h2>
      <div class="rolle" style="margin-bottom:10px">${istNeu ? "wird beim Speichern angelegt" : esc(p.rolle || "")}</div>
      <div class="editor">
        <div class="paar">
          <div><label>Vorname</label><input id="e-vorname" value="${esc(p.vorname)}"></div>
          <div><label>Nachname</label><input id="e-nachname" value="${esc(p.nachname || "Janzen")}"></div>
        </div>
        <div class="paar">
          <div><label>Geburtsjahr</label><input id="e-jahr" type="number" value="${p.jahr ?? ""}"></div>
          <div><label>Sterbejahr</label><input id="e-jahr_bis" type="number" value="${p.jahr_bis ?? ""}"></div>
        </div>
        <div class="paar">
          <div><label>Genaues Datum</label><input id="e-datum" value="${esc(p.datum)}" placeholder="23.07.1955"></div>
          <div><label>Ort</label><input id="e-ort" value="${esc(p.ort)}"></div>
        </div>
        <label>Rolle</label><input id="e-rolle" value="${esc(p.rolle)}">
        <label>Vater</label>
        <select id="e-vater"><option value="">— unbekannt —</option>${auswahlOptionen(ausschluss, vater)}</select>
        <label>Mutter</label>
        <select id="e-mutter"><option value="">— unbekannt —</option>${auswahlOptionen(ausschluss, mutter)}</select>
        <label>Ehepartner</label>
        <select id="e-partner"><option value="">— niemand —</option>${auswahlOptionen(new Set([p.id]), partner)}</select>
        <label>Notiz</label><textarea id="e-notiz">${esc(p.notiz)}</textarea>
        <label>Offene Fragen (mit ; trennen)</label><textarea id="e-offen">${Array.isArray(p.offen) ? p.offen.join("; ") : ""}</textarea>
        <div class="reihe">
          <button id="e-speichern">Speichern</button>
          <button id="e-abbruch" class="zweit">Abbrechen</button>
          ${istNeu ? "" : `<button id="e-loeschen" class="rot">Web-Änderung zurücksetzen</button>`}
          <span id="e-status" class="status"></span>
        </div>
      </div>`;

    document.getElementById("e-speichern").addEventListener("click", () => speichere(istNeu ? null : p.id));
    document.getElementById("e-abbruch").addEventListener("click", () =>
      istNeu ? zeigePerson("gerhard") : zeigePerson(p.id));
    const loeschen = document.getElementById("e-loeschen");
    if (loeschen) loeschen.addEventListener("click", () => zuruecksetzen(p.id));
  }

  async function speichere(id) {
    const status = document.getElementById("e-status");
    const vorname = wert("e-vorname"), nachname = wert("e-nachname");
    if (!vorname && !nachname) {
      status.className = "status fehler";
      status.textContent = "Vor- oder Nachname fehlt.";
      return;
    }
    const eltern = [wert("e-vater"), wert("e-mutter")].filter(Boolean);
    const partner = [wert("e-partner")].filter(Boolean);
    const ziel = id || ("web_" + Date.now().toString(36));

    let anzeige = `${vorname} ${nachname}`.trim();
    const partnerPerson = partner.length ? byId[partner[0]] : null;
    if (partnerPerson && partnerPerson.nachname && partnerPerson.nachname !== nachname) {
      anzeige = `${vorname} ${partnerPerson.nachname} (geb. ${nachname})`;
    }

    const felder = {
      vorname, nachname, name: anzeige,
      jahr: wert("e-jahr") || null, jahr_bis: wert("e-jahr_bis") || null,
      datum: wert("e-datum"), ort: wert("e-ort"), rolle: wert("e-rolle"),
      notiz: wert("e-notiz"), offen: wert("e-offen"),
      eltern, partner, belegt: "Angabe über die Webseite",
    };
    status.className = "status";
    status.textContent = "speichert …";
    try {
      await sendeAPI({ id: ziel, felder });
      const vorhanden = byId[ziel];
      if (vorhanden) Object.assign(vorhanden, felder, { web: true });
      else {
        const neu = Object.assign({ id: ziel, generation: 0 }, felder, { web: true });
        DATA.personen.push(neu);
        byId[ziel] = neu;
      }
      neuRechnen();
      neuZeichnen();
      zeigePerson(ziel);
    } catch (fehler) {
      status.className = "status fehler";
      status.textContent = "Nicht gespeichert: " + fehler.message;
    }
  }

  async function zuruecksetzen(id) {
    if (!confirm("Alle Web-Änderungen an dieser Person verwerfen?")) return;
    try {
      await sendeAPI({ loeschen: id });
      location.reload();
    } catch (fehler) { alert("Nicht zurückgesetzt: " + fehler.message); }
  }

  /* ---------- Grafik-Board ---------- */
  function autoLayout() {
    const personen = DATA.personen.filter(p => verbunden.has(p.id));
    const reihenListe = {};
    personen.forEach(p => {
      const r = reihen[p.id] ?? 0;
      (reihenListe[r] = reihenListe[r] || []).push(p);
    });
    const reihenNummern = Object.keys(reihenListe).map(Number).sort((a, b) => a - b);
    reihenNummern.forEach((r, index) => {
      const inReihe = reihenListe[r];
      const benutzt = new Set();
      const gruppen = [];
      inReihe.forEach(p => {
        if (benutzt.has(p.id)) return;
        const partnerId = (p.partner || []).find(pid =>
          inReihe.some(q => q.id === pid) && !benutzt.has(pid) && pid !== p.id);
        if (partnerId) {
          benutzt.add(p.id); benutzt.add(partnerId);
          gruppen.push([p, byId[partnerId]]);
        } else { benutzt.add(p.id); gruppen.push([p]); }
      });
      let links = RAND;
      gruppen.forEach(gruppe => {
        gruppe.forEach((p, i) => {
          positionen[p.id] = { x: links + i * (BOX_B + 30), y: RAND + index * 140 };
        });
        links += gruppe.length * BOX_B + (gruppe.length - 1) * 30 + 30;
      });
    });
  }

  function boardGroesse() {
    const ids = Object.keys(positionen);
    if (!ids.length) return { breite: 800, hoehe: 500 };
    const maxX = Math.max(...ids.map(k => positionen[k].x)) + BOX_B + 80;
    const maxY = Math.max(...ids.map(k => positionen[k].y)) + BOX_H + 80;
    return { breite: Math.max(800, maxX), hoehe: Math.max(500, maxY) };
  }

  function baueGrafik() {
    const behaelter = document.getElementById("grafik");
    if (!behaelter) return;
    // Alles zeigen, was verbunden ist ODER eine eigene Position hat
    // (neu angelegte Personen sind noch nicht verbunden, sollen aber sichtbar sein)
    const personen = DATA.personen.filter(p => verbunden.has(p.id) ||
      (typeof p.pos_x === "number" && typeof p.pos_y === "number"));
    if (!personen.length) { behaelter.innerHTML = '<p style="padding:16px">Keine verbundenen Personen.</p>'; return; }

    // Positionen: gespeicherte übernehmen, Rest automatisch
    let fehlend = false;
    personen.forEach(p => {
      if (typeof p.pos_x === "number" && typeof p.pos_y === "number") {
        positionen[p.id] = { x: p.pos_x, y: p.pos_y };
      }
    });
    if (Object.keys(positionen).length < personen.length) {
      const vorher = { ...positionen };
      autoLayout();
      personen.forEach(p => { if (vorher[p.id]) positionen[p.id] = vorher[p.id]; });
      fehlend = true;
    }

    const werkzeug = `
      <div class="boardwerkzeug">
        <button id="b-modus-kind" class="${modus === "kind" ? "an" : ""}">Verknüpfen: Eltern → Kind</button>
        <button id="b-modus-ehe" class="${modus === "ehe" ? "an" : ""}">Verknüpfen: Ehepartner</button>
        <button id="b-neu">＋ Person</button>
        <button id="b-undo">↶ Rückgängig</button>
        <button id="b-redo">↷ Wiederholen</button>
        <button id="b-raster" class="${rasterAn ? "an" : ""}">Raster</button>
        <button id="b-jetzt">Aktuelle Generation</button>
        <button id="b-reset">Neu anordnen</button>
        <button id="b-zoom-out">−</button>
        <span class="zoomanzeige" id="b-zoom">100 %</span>
        <button id="b-zoom-in">+</button>
        <span class="hinweis">Doppelklick = Person · Rechtsklick = Menü · Fläche ziehen = verschieben · Rad = zoomen · Griff = verknüpfen · Linie = löschen</span>
        <span id="b-save" class="hinweis"></span>
        <span id="b-status" class="hinweis"></span>
      </div>`;

    behaelter.innerHTML = werkzeug +
      `<svg id="board">
         <defs>
           <pattern id="raster" width="24" height="24" patternUnits="userSpaceOnUse">
             <circle cx="2" cy="2" r="1.1" fill="#e2d6bf"/>
           </pattern>
         </defs>
         <rect id="hintergrund" x="0" y="0" width="100" height="100" fill="url(#raster)"/>
         <g id="linien"></g>
         <g id="knoten"></g>
       </svg>`;
    zeichneKnoten();
    zeichneLinien();
    verdrahten();
    if (!ansichtGesetzt) { zeigeAktuelleGeneration(); ansichtGesetzt = true; }
    else zeichneAnsicht();
    aktualisiereWerkzeug();
    if (fehlend) speichereAllePositionen();
  }

  function zeichneAnsicht() {
    const svg = document.getElementById("board");
    if (!svg) return;
    const rechteck = svg.getBoundingClientRect();
    const breite = Math.max(120, rechteck.width) / ansicht.zoom;
    const hoehe = Math.max(120, rechteck.height) / ansicht.zoom;
    svg.setAttribute("viewBox", `${ansicht.x} ${ansicht.y} ${breite} ${hoehe}`);
    const hintergrund = document.getElementById("hintergrund");
    if (hintergrund) {
      hintergrund.setAttribute("x", ansicht.x);
      hintergrund.setAttribute("y", ansicht.y);
      hintergrund.setAttribute("width", breite);
      hintergrund.setAttribute("height", hoehe);
    }
    const anzeige = document.getElementById("b-zoom");
    if (anzeige) anzeige.textContent = Math.round(ansicht.zoom * 100) + " %";
  }

  function weltPunkt(ev) {
    const svg = document.getElementById("board");
    const rechteck = svg.getBoundingClientRect();
    return {
      x: ansicht.x + (ev.clientX - rechteck.left) / ansicht.zoom,
      y: ansicht.y + (ev.clientY - rechteck.top) / ansicht.zoom,
    };
  }

  /* Start beim Öffnen: die jüngste (aktuelle) Generation mittig zeigen */
  function zeigeAktuelleGeneration() {
    const svg = document.getElementById("board");
    if (!svg) return;
    const personen = DATA.personen.filter(p => verbunden.has(p.id) && positionen[p.id]);
    if (!personen.length) return;
    const maxReihe = Math.max(...personen.map(p => reihen[p.id] ?? 0));
    const aktuell = personen.filter(p => (reihen[p.id] ?? 0) === maxReihe);
    const minX = Math.min(...aktuell.map(p => positionen[p.id].x));
    const maxX = Math.max(...aktuell.map(p => positionen[p.id].x + BOX_B));
    const minY = Math.min(...aktuell.map(p => positionen[p.id].y));
    const maxY = Math.max(...aktuell.map(p => positionen[p.id].y + BOX_H));
    const rechteck = svg.getBoundingClientRect();
    const sichtbarBreit = Math.max(120, rechteck.width) / ansicht.zoom;
    const sichtbarHoch = Math.max(120, rechteck.height) / ansicht.zoom;
    ansicht.x = (minX + maxX) / 2 - sichtbarBreit / 2;
    ansicht.y = (minY + maxY) / 2 - sichtbarHoch / 2;
    zeichneAnsicht();
  }

  function zoome(faktor, anker) {
    const neu = Math.min(2.6, Math.max(0.25, ansicht.zoom * faktor));
    if (neu === ansicht.zoom) return;
    const svg = document.getElementById("board");
    const rechteck = svg.getBoundingClientRect();
    const punkt = anker || { x: rechteck.width / 2, y: rechteck.height / 2 };
    const weltX = ansicht.x + punkt.x / ansicht.zoom;
    const weltY = ansicht.y + punkt.y / ansicht.zoom;
    ansicht.zoom = neu;
    ansicht.x = weltX - punkt.x / neu;
    ansicht.y = weltY - punkt.y / neu;
    zeichneAnsicht();
  }

  function aktualisiereWerkzeug() {
    const knopf = document.getElementById("b-undo");
    if (knopf) {
      knopf.disabled = !verlauf.length;
      knopf.style.opacity = verlauf.length ? "1" : ".45";
      knopf.textContent = verlauf.length
        ? `↶ Rückgängig (${verlauf.length})` : "↶ Rückgängig";
    }
    const status = document.getElementById("b-status");
    if (status && !status.textContent) status.textContent = "";
    const z = document.getElementById("b-zoom");
    if (z) z.textContent = Math.round(ansicht.zoom * 100) + " %";
    const save = document.getElementById("b-save");
    if (save && speicherStand) save.textContent = speicherStand;
  }

  function meldung(text) {
    const status = document.getElementById("b-status");
    if (status) status.textContent = text;
  }

  function zeichneKnoten() {
    const gruppe = document.getElementById("knoten");
    if (!gruppe) return;
    const personen = DATA.personen.filter(p =>
      (verbunden.has(p.id) || typeof p.pos_x === "number") && positionen[p.id]);
    gruppe.innerHTML = personen.map(p => {
      const { x, y } = positionen[p.id];
      const strich = p.web ? ' stroke-dasharray="4 3"' : "";
      const fuellung = p.web ? "#f3e4d6" : "#fffdf7";
      const name = String(p.name).length > 23 ? String(p.name).slice(0, 22) + "…" : String(p.name);
      return `<g class="box" data-id="${p.id}" transform="translate(${x},${y})">
        <rect class="haupt" x="0" y="0" width="${BOX_B}" height="${BOX_H}" rx="7"
              fill="${fuellung}" stroke="#c9bca3" stroke-width="1.3"${strich}/>
        <text x="10" y="23" font-size="12.5" font-weight="600" fill="#2b2620"
              font-family="Segoe UI,sans-serif">${esc(name)}</text>
        <text x="10" y="41" font-size="11.5" fill="#6d6355"
              font-family="Segoe UI,sans-serif">${jahresText(p)}</text>
        <text x="10" y="55" font-size="9.5" fill="#7c2d12"
              font-family="Segoe UI,sans-serif">${esc((p.rolle || "").slice(0, 30))}</text>
        <circle class="griff" cx="${BOX_B / 2}" cy="${BOX_H}" r="7" fill="#7c2d12"/>
      </g>`;
    }).join("");
  }

  function zeichneLinien() {
    const gruppe = document.getElementById("linien");
    if (!gruppe) return;
    const teile = [];

    // Ehe-Linien (klickbar zum Löschen)
    const gesehen = new Set();
    DATA.personen.forEach(p => {
      (p.partner || []).forEach(pid => {
        if (!positionen[p.id] || !positionen[pid]) return;
        const schluessel = [p.id, pid].sort().join("|");
        if (gesehen.has(schluessel)) return;
        gesehen.add(schluessel);
        const a = positionen[p.id], b = positionen[pid];
        let pfad;
        if (Math.abs(a.y - b.y) < 4) {
          const links = a.x < b.x ? a.x + BOX_B : b.x + BOX_B;
          const rechts = a.x < b.x ? b.x : a.x;
          const yMitte = a.y + BOX_H / 2;
          pfad = `M ${links} ${yMitte} L ${rechts} ${yMitte}`;
        } else {
          pfad = `M ${a.x + BOX_B / 2} ${a.y + BOX_H / 2} L ${b.x + BOX_B / 2} ${b.y + BOX_H / 2}`;
        }
        teile.push(`<path d="${pfad}" fill="none" stroke="#7c2d12" stroke-width="1.7"/>`);
        teile.push(`<path d="${pfad}" fill="none" stroke="transparent" stroke-width="14"
          class="treffer" data-art="ehe" data-a="${p.id}" data-b="${pid}"><title>Ehe-Verbindung löschen</title></path>`);
      });
    });

    // Eltern-Kind-Linien
    DATA.personen.forEach(kind => {
      const eltern = (kind.eltern || []).filter(e => positionen[e]);
      if (!eltern.length || !positionen[kind.id]) return;
      const mitten = eltern.map(e => positionen[e].x + BOX_B / 2);
      const vonX = mitten.reduce((a, b) => a + b, 0) / mitten.length;
      const vonY = Math.max(...eltern.map(e => positionen[e].y + BOX_H));
      const zuX = positionen[kind.id].x + BOX_B / 2;
      const zuY = positionen[kind.id].y;
      const bus = vonY + Math.max(14, (zuY - vonY) / 2);
      const pfad = `M ${vonX} ${vonY} L ${vonX} ${bus} L ${zuX} ${bus} L ${zuX} ${zuY}`;
      teile.push(`<path d="${pfad}" fill="none" stroke="#bcae95" stroke-width="1.5"/>`);
      teile.push(`<path d="${pfad}" fill="none" stroke="transparent" stroke-width="14"
        class="treffer" data-art="kind" data-kind="${kind.id}"><title>Eltern-Verbindung löschen</title></path>`);
    });

    if (verbinden) {
      teile.push(`<line x1="${verbinden.x1}" y1="${verbinden.y1}" x2="${verbinden.x}" y2="${verbinden.y}"
        stroke="#7c2d12" stroke-width="2" stroke-dasharray="6 4" pointer-events="none"/>`);
    }
    gruppe.innerHTML = teile.join("");

    gruppe.querySelectorAll(".treffer").forEach(pfad => {
      pfad.addEventListener("click", ev => {
        ev.stopPropagation();
        loescheVerbindung(pfad.dataset);
      });
    });
  }

  function verdrahten() {
    const svg = document.getElementById("board");
    if (!svg) return;

    svg.addEventListener("pointerdown", ev => {
      const treffer = ev.target.closest(".treffer");
      if (treffer) return;                       // Linienklick = löschen, nicht ziehen
      const griff = ev.target.closest(".griff");
      const kasten = ev.target.closest(".box");
      if (griff && kasten) {
        const id = kasten.dataset.id;
        const p = positionen[id];
        const punkt = weltPunkt(ev);
        verbinden = { von: id, x1: p.x + BOX_B / 2, y1: p.y + BOX_H, x: punkt.x, y: punkt.y };
        svg.setPointerCapture(ev.pointerId);
        zeichneLinien();
        ev.preventDefault();
        return;
      }
      if (kasten) {
        const id = kasten.dataset.id;
        const punkt = weltPunkt(ev);
        ziehen = { id, dx: punkt.x - positionen[id].x, dy: punkt.y - positionen[id].y, bewegt: false };
        svg.setPointerCapture(ev.pointerId);
        ev.preventDefault();
        return;
      }
      // freie Fläche: Ansicht verschieben (unendliche Fläche)
      schieben = { sx: ev.clientX, sy: ev.clientY, x0: ansicht.x, y0: ansicht.y };
      svg.setPointerCapture(ev.pointerId);
      svg.classList.add("schiebend");
      ev.preventDefault();
    });

    svg.addEventListener("pointermove", ev => {
      if (schieben) {
        ansicht.x = schieben.x0 - (ev.clientX - schieben.sx) / ansicht.zoom;
        ansicht.y = schieben.y0 - (ev.clientY - schieben.sy) / ansicht.zoom;
        zeichneAnsicht();
        return;
      }
      if (!ziehen && !verbinden) return;
      const punkt = weltPunkt(ev);
      if (ziehen) {
        let neuX = punkt.x - ziehen.dx;
        let neuY = punkt.y - ziehen.dy;
        if (rasterAn) {
          neuX = Math.round(neuX / 24) * 24;
          neuY = Math.round(neuY / 24) * 24;
        }
        positionen[ziehen.id] = { x: neuX, y: neuY };
        ziehen.bewegt = true;
        const knoten = document.querySelector(`.box[data-id="${ziehen.id}"]`);
        if (knoten) knoten.setAttribute("transform",
          `translate(${positionen[ziehen.id].x},${positionen[ziehen.id].y})`);
        zeichneLinien();
      } else if (verbinden) {
        verbinden.x = punkt.x; verbinden.y = punkt.y;
        zeichneLinien();
      }
    });

    svg.addEventListener("pointerup", async ev => {
      if (schieben) {
        schieben = null;
        svg.classList.remove("schiebend");
        return;
      }
      if (verbinden) {
        const ziel = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".box");
        const von = verbinden.von;
        verbinden = null;
        if (ziel && ziel.dataset.id !== von) await verknuepfe(von, ziel.dataset.id);
        else zeichneLinien();
      }
      if (ziehen) {
        const id = ziehen.id;
        const bewegt = ziehen.bewegt;
        ziehen = null;
        if (bewegt) await speicherePosition(id);
      }
    });

    svg.addEventListener("pointercancel", () => {
      schieben = null; ziehen = null; verbinden = null;
      svg.classList.remove("schiebend");
      zeichneLinien();
    });

    svg.addEventListener("wheel", ev => {
      ev.preventDefault();
      const rechteck = svg.getBoundingClientRect();
      zoome(ev.deltaY < 0 ? 1.12 : 1 / 1.12,
            { x: ev.clientX - rechteck.left, y: ev.clientY - rechteck.top });
    }, { passive: false });

    svg.addEventListener("dblclick", ev => {
      if (ev.target.closest(".box") || ev.target.closest(".treffer")) return;
      const punkt = weltPunkt(ev);
      starteEntwurf(Math.round(punkt.x), Math.round(punkt.y));
    });

    svg.addEventListener("contextmenu", ev => {
      const kasten = ev.target.closest(".box");
      if (!kasten) return;
      ev.preventDefault();
      zeigeKontextmenue(ev, kasten.dataset.id);
    });
  }

  /* ---------- Rückgängig ---------- */
  function merke(text, schritte) {
    verlauf.push({ text, schritte });
    if (verlauf.length > 50) verlauf.shift();
    aktualisiereWerkzeug();
  }

  async function rueckgaengig() {
    const eintrag = verlauf.pop();
    if (!eintrag) { meldung("nichts mehr rückgängig zu machen"); return; }
    const gegen = [];
    try {
      for (const schritt of eintrag.schritte) {
        if (!schritt.loeschen) {
          const person = byId[schritt.id];
          const alt = {};
          for (const feld of Object.keys(schritt.felder || {})) {
            alt[feld] = person && person[feld] !== undefined ? person[feld] : null;
          }
          gegen.push({ id: schritt.id, felder: alt });
        }
        await sendeAPI(schritt);
        if (schritt.loeschen) {
          const index = DATA.personen.findIndex(p => p.id === schritt.loeschen);
          if (index >= 0) DATA.personen.splice(index, 1);
          delete byId[schritt.loeschen];
          delete positionen[schritt.loeschen];
        } else if (byId[schritt.id]) {
          Object.assign(byId[schritt.id], schritt.felder);
        }
      }
      const hatLoeschen = eintrag.schritte.some(s => s.loeschen);
      if (gegen.length && !hatLoeschen) redoStapel.push({ text: eintrag.text, schritte: gegen });
      neuRechnen();
      neuZeichnen();
      baueGrafik();
      meldung("rückgängig: " + eintrag.text);
    } catch (fehler) {
      meldung("Rückgängig fehlgeschlagen: " + fehler.message);
    }
  }

  async function wiederholen() {
    const eintrag = redoStapel.pop();
    if (!eintrag) { meldung("nichts zu wiederholen"); return; }
    const gegen = [];
    try {
      for (const schritt of eintrag.schritte) {
        const person = byId[schritt.id];
        const alt = {};
        for (const feld of Object.keys(schritt.felder || {})) {
          alt[feld] = person && person[feld] !== undefined ? person[feld] : null;
        }
        gegen.push({ id: schritt.id, felder: alt });
        await sendeAPI(schritt);
        if (byId[schritt.id]) Object.assign(byId[schritt.id], schritt.felder);
      }
      if (gegen.length) verlauf.push({ text: eintrag.text, schritte: gegen });
      neuRechnen();
      neuZeichnen();
      baueGrafik();
      meldung("wiederholt: " + eintrag.text);
    } catch (fehler) {
      meldung("Wiederholen fehlgeschlagen: " + fehler.message);
    }
  }

  async function verknuepfe(vonId, zuId) {
    const von = byId[vonId], zu = byId[zuId];
    const alteVon = { partner: [...(von.partner || [])] };
    const alteZu = { partner: [...(zu.partner || [])], eltern: [...(zu.eltern || [])] };
    try {
      if (modus === "ehe") {
        const partnerVon = new Set(von.partner || []); partnerVon.add(zuId);
        const partnerZu = new Set(zu.partner || []); partnerZu.add(vonId);
        await sendeAPI({ id: vonId, felder: { partner: [...partnerVon] } });
        await sendeAPI({ id: zuId, felder: { partner: [...partnerZu] } });
        Object.assign(von, { partner: [...partnerVon], web: true });
        Object.assign(zu, { partner: [...partnerZu], web: true });
        merke(`${von.name} ⇄ ${zu.name} verheiratet`,
              [{ id: vonId, felder: alteVon }, { id: zuId, felder: { partner: alteZu.partner } }]);
        neuRechnen();
        neuZeichnen();
        baueGrafik();
        meldung(`${von.name} ⇄ ${zu.name} verheiratet`);
      } else {
        const partner = (von.partner || []).find(pid => byId[pid]) || null;
        const eltern = partner ? [vonId, partner] : [vonId];
        await sendeAPI({ id: zuId, felder: { eltern } });
        zu.eltern = eltern;
        zu.web = true;
        merke(`${zu.name} ← Eltern ${von.name}`,
              [{ id: zuId, felder: { eltern: alteZu.eltern } }]);
        neuRechnen();
        neuZeichnen();
        baueGrafik();
        meldung(`${zu.name} ist jetzt Kind von ${von.name}`);
      }
    } catch (fehler) {
      meldung("Nicht verknüpft: " + fehler.message);
    }
  }

  /* Verbindung löschen - per Klick auf die Linie */
  async function loescheVerbindung(daten) {
    if (daten.art === "ehe") {
      const a = byId[daten.a], b = byId[daten.b];
      if (!a || !b) return;
      if (!confirm(`Ehe-Verbindung ${a.name} ⇄ ${b.name} löschen?`)) return;
      const altA = [...(a.partner || [])], altB = [...(b.partner || [])];
      const neuA = altA.filter(x => x !== b.id);
      const neuB = altB.filter(x => x !== a.id);
      try {
        await sendeAPI({ id: a.id, felder: { partner: neuA } });
        await sendeAPI({ id: b.id, felder: { partner: neuB } });
        Object.assign(a, { partner: neuA, web: true });
        Object.assign(b, { partner: neuB, web: true });
        merke(`Ehe ${a.name} ⇄ ${b.name} gelöscht`,
              [{ id: a.id, felder: { partner: altA } }, { id: b.id, felder: { partner: altB } }]);
        neuRechnen(); neuZeichnen(); baueGrafik();
        meldung(`Ehe-Verbindung ${a.name} ⇄ ${b.name} gelöscht`);
      } catch (fehler) { meldung("Nicht gelöscht: " + fehler.message); }
      return;
    }

    // art = "kind": Eltern des Kindes entfernen
    const kind = byId[daten.kind];
    if (!kind) return;
    const alt = [...(kind.eltern || [])];
    if (!alt.length) return;
    const namen = alt.map(e => byId[e]?.name || e).join(" und ");
    if (!confirm(`Eltern-Verbindung löschen: ${kind.name} ist nicht mehr Kind von ${namen}?`)) return;
    try {
      await sendeAPI({ id: kind.id, felder: { eltern: [] } });
      kind.eltern = [];
      kind.web = true;
      merke(`Eltern von ${kind.name} gelöst`, [{ id: kind.id, felder: { eltern: alt } }]);
      neuRechnen(); neuZeichnen(); baueGrafik();
      meldung(`Eltern-Verbindung von ${kind.name} gelöscht`);
    } catch (fehler) { meldung("Nicht gelöscht: " + fehler.message); }
  }

  async function neuePersonBei(x, y, name, optionen = {}) {
    const id = "web_" + Date.now().toString(36);
    const teile = String(name || "").trim().split(/\s+/).filter(Boolean);
    const vorname = teile[0] || "Neu";
    const nachname = teile.slice(1).join(" ") || "Janzen";
    const eltern = (optionen.eltern || []).filter(e => byId[e]);
    const partnerVon = optionen.partnerVon && byId[optionen.partnerVon] ? optionen.partnerVon : null;
    const felder = {
      vorname, nachname, name: `${vorname} ${nachname}`.trim(),
      jahr: null, jahr_bis: null, datum: "", ort: "",
      rolle: optionen.rolle || "auf dem Board angelegt",
      notiz: "", offen: "", eltern, partner: partnerVon ? [partnerVon] : [],
      belegt: "Angabe über die Webseite",
      pos_x: Math.round(x), pos_y: Math.round(y),
    };
    try {
      await sendeAPI({ id, felder });
      const neu = Object.assign({ id, generation: 0 }, felder, { web: true });
      DATA.personen.push(neu);
      byId[id] = neu;
      positionen[id] = { x: felder.pos_x, y: felder.pos_y };

      // Partner zusätzlich auf der Gegenseite eintragen
      let rueckPartner = null;
      if (optionen.partnerVon && byId[optionen.partnerVon]) {
        const anderer = byId[optionen.partnerVon];
        rueckPartner = [...(anderer.partner || [])];
        const partnerListe = [...new Set([...rueckPartner, id])];
        await sendeAPI({ id: anderer.id, felder: { partner: partnerListe } });
        anderer.partner = partnerListe;
        anderer.web = true;
        neu.partner = [anderer.id];
      }

      const rueckschritte = [{ loeschen: id }];
      if (rueckPartner) {
        rueckschritte.push({ id: optionen.partnerVon, felder: { partner: rueckPartner } });
      }
      merke(`neue Person ${felder.name}`, rueckschritte);
      neuRechnen();
      neuZeichnen();
      baueGrafik();
      meldung(`${felder.name} angelegt`);
      return neu;
    } catch (fehler) {
      alert("Konnte nicht angelegt werden: " + fehler.message);
      return null;
    }
  }

  /* ---------- Namenseingabe direkt auf dem Board ---------- */
  function starteEntwurf(x, y, optionen = {}) {
    beendeEntwurf();
    const behaelter = document.getElementById("grafik");
    const svg = document.getElementById("board");
    const rSvg = svg.getBoundingClientRect();
    const rBox = behaelter.getBoundingClientRect();
    const links = (x - ansicht.x) * ansicht.zoom + (rSvg.left - rBox.left);
    const oben = (y - ansicht.y) * ansicht.zoom + (rSvg.top - rBox.top);

    const feld = document.createElement("div");
    feld.id = "entwurf";
    feld.style.cssText = `position:absolute;left:${links}px;top:${oben}px;
      width:${BOX_B * ansicht.zoom}px;background:#fffdf7;border:2px solid #7c2d12;
      border-radius:7px;padding:6px;box-shadow:0 6px 18px rgba(0,0,0,.18);z-index:30`;
    feld.innerHTML = `<div style="font-size:10px;color:#6d6355;letter-spacing:1px;
        text-transform:uppercase;margin-bottom:3px">Name – Enter speichert, Esc bricht ab</div>
      <input id="entwurf-feld" type="text" placeholder="Vorname Nachname"
        style="width:100%;box-sizing:border-box;padding:5px 7px;border:1px solid #ddd2bd;
        border-radius:4px;font-size:13px;background:#fbf7ee;color:#2b2620">`;
    behaelter.appendChild(feld);
    entwurf = { x, y, optionen, element: feld };

    const eingabe = feld.querySelector("#entwurf-feld");
    eingabe.focus();
    eingabe.addEventListener("keydown", async ev => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        const name = eingabe.value.trim();
        if (!name) { beendeEntwurf(); return; }
        const auftrag = entwurf.optionen;
        beendeEntwurf();
        await neuePersonBei(x, y, name, auftrag);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        beendeEntwurf();
      }
    });
    eingabe.addEventListener("blur", () => setTimeout(() => {
      if (entwurf && document.activeElement !== document.getElementById("entwurf-feld")) {
        const wertJetzt = document.getElementById("entwurf-feld");
        if (wertJetzt && wertJetzt.value.trim()) wertJetzt.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        else beendeEntwurf();
      }
    }, 160));
  }

  function beendeEntwurf() {
    if (!entwurf) return;
    entwurf.element?.remove();
    entwurf = null;
  }

  /* ---------- Kontextmenü ---------- */
  function zeigeKontextmenue(ev, id) {
    schliesseKontextmenue();
    const person = byId[id];
    if (!person) return;
    const eltern = (person.eltern || []).length;
    const menue = document.createElement("div");
    menue.id = "kontextmenue";
    menue.style.cssText = `position:fixed;left:${ev.clientX}px;top:${ev.clientY}px;z-index:50;
      background:#fffdf7;border:1px solid #ddd2bd;border-radius:8px;padding:5px 0;
      box-shadow:0 8px 24px rgba(0,0,0,.16);min-width:210px;font-size:13px`;
    const eintrag = (text, aktion, farbe) =>
      `<button class="km" data-aktion="${aktion}" style="display:block;width:100%;text-align:left;
        padding:7px 14px;border:0;background:transparent;font-size:13px;cursor:pointer;
        color:${farbe || "#2b2620"}">${text}</button>`;
    menue.innerHTML =
      eintrag("✎ Bearbeiten", "bearbeiten") +
      eintrag("＋ Kind hinzufügen", "kind") +
      eintrag("＋ Partner hinzufügen", "partner") +
      (eltern ? eintrag("Eltern-Verbindung lösen", "eltern-loesen", "#8c2f2f") : "") +
      eintrag("Auf der Karte zeigen", "zeigen");
    document.body.appendChild(menue);

    menue.querySelectorAll(".km").forEach(knopf => {
      knopf.addEventListener("click", async () => {
        const aktion = knopf.dataset.aktion;
        schliesseKontextmenue();
        const pos = positionen[id] || { x: 0, y: 0 };
        if (aktion === "bearbeiten") { zeigeTab("baum"); oeffneEditor(id); }
        if (aktion === "zeigen") { zeigeTab("baum"); zeigePerson(id); }
        if (aktion === "kind") {
          const partner = (person.partner || []).find(p => byId[p]) || null;
          starteEntwurf(pos.x + 20, pos.y + 150,
            { eltern: partner ? [id, partner] : [id], rolle: "Kind von " + person.name });
        }
        if (aktion === "partner") {
          starteEntwurf(pos.x + BOX_B + 60, pos.y,
            { partnerVon: id, rolle: "Partner von " + person.name });
        }
        if (aktion === "eltern-loesen") {
          if (!confirm(`Eltern-Verbindung von ${person.name} lösen?`)) return;
          const alt = [...(person.eltern || [])];
          await sendeAPI({ id, felder: { eltern: [] } });
          person.eltern = [];
          person.web = true;
          merke(`Eltern von ${person.name} gelöst`, [{ id, felder: { eltern: alt } }]);
          neuRechnen(); neuZeichnen(); baueGrafik();
          meldung(`Eltern-Verbindung von ${person.name} gelöst`);
        }
      });
    });
  }

  function schliesseKontextmenue() {
    document.getElementById("kontextmenue")?.remove();
  }

  async function speicherePosition(id) {
    const pos = positionen[id];
    if (!pos) return;
    try {
      await sendeAPI({ id, felder: { pos_x: Math.round(pos.x), pos_y: Math.round(pos.y) } });
      if (byId[id]) Object.assign(byId[id], { pos_x: Math.round(pos.x), pos_y: Math.round(pos.y) });
    } catch (fehler) { console.warn("Position nicht gespeichert:", fehler); }
  }

  function speichereAllePositionen() {
    DATA.personen.forEach(p => {
      if (positionen[p.id] && (p.pos_x == null || p.pos_y == null)) speicherePosition(p.id);
    });
  }

  /* ---------- Vorfahren- und Nachkommen-Ansicht ---------- */
  let baumModus = "generationen";     // generationen | vorfahren | nachkommen
  let startPerson = "gerhard";
  let ahnenTiefe = 3;
  const ahnenVerlauf = [];

  function baueStammbaumModi() {
    const baum = document.getElementById("baum");
    if (!baum || document.getElementById("stammbaum-modi")) return;

    const leiste = document.createElement("div");
    leiste.id = "stammbaum-modi";
    leiste.className = "boardwerkzeug";
    leiste.innerHTML = `
      <button data-modus="generationen" class="an">Generationen</button>
      <button data-modus="vorfahren">Vorfahren</button>
      <button data-modus="nachkommen">Nachkommen</button>
      <span class="hinweis">Startperson</span>
      <select id="p-start" style="padding:5px 8px;border:1px solid var(--linie);border-radius:6px;
        background:var(--karte);font-size:12.5px;max-width:220px"></select>
      <span class="hinweis">Tiefe</span>
      <select id="p-tiefe" style="padding:5px 8px;border:1px solid var(--linie);border-radius:6px;
        background:var(--karte);font-size:12.5px">
        <option value="2">2</option><option value="3" selected>3</option>
        <option value="4">4</option><option value="5">5</option>
      </select>
      <button id="p-zurueck">↶ zurück</button>
      <button id="p-board">Im Board zeigen</button>
      <span id="p-status" class="hinweis"></span>`;

    const pedigree = document.createElement("div");
    pedigree.id = "pedigree";
    pedigree.className = "versteckt";
    pedigree.style.cssText = "overflow:auto;border:1px solid var(--linie);border-radius:8px;" +
      "background:var(--karte);padding:10px;min-height:420px";

    baum.parentNode.insertBefore(leiste, baum);
    baum.parentNode.insertBefore(pedigree, baum.nextSibling);

    fuelleStartListe();
    document.getElementById("p-start").addEventListener("change", ev => {
      startPerson = ev.target.value;
      ahnenVerlauf.length = 0;
      zeichnePedigree();
    });
    document.getElementById("p-tiefe").addEventListener("change", ev => {
      ahnenTiefe = parseInt(ev.target.value, 10);
      zeichnePedigree();
    });
    leiste.querySelectorAll("[data-modus]").forEach(knopf => {
      knopf.addEventListener("click", () => setzeBaumModus(knopf.dataset.modus));
    });
    document.getElementById("p-zurueck").addEventListener("click", () => {
      if (!ahnenVerlauf.length) { meldungPedigree("kein Schritt zurück"); return; }
      startPerson = ahnenVerlauf.pop();
      document.getElementById("p-start").value = startPerson;
      zeichnePedigree();
    });
    document.getElementById("p-board").addEventListener("click", () => {
      zeigeBereich("board");
      baueGrafik();
      const pos = positionen[startPerson];
      if (pos) {
        const svg = document.getElementById("board");
        const r = svg.getBoundingClientRect();
        ansicht.x = pos.x + BOX_B / 2 - (r.width / ansicht.zoom) / 2;
        ansicht.y = pos.y + BOX_H / 2 - (r.height / ansicht.zoom) / 2;
        zeichneAnsicht();
      }
      meldung(`${byId[startPerson]?.name || startPerson} im Board gezeigt`);
    });
  }

  function meldungPedigree(text) {
    const el = document.getElementById("p-status");
    if (el) el.textContent = text;
  }

  /* Bereiche umschalten - auch für Reiter, die das Original-zeigeTab() nicht kennt */
  function zeigeBereich(name) {
    document.querySelectorAll("main > section").forEach(s => s.classList.add("versteckt"));
    document.getElementById("tab-" + name)?.classList.remove("versteckt");
    document.querySelectorAll("nav button").forEach(b =>
      b.classList.toggle("aktiv", b.dataset.tab === name));
  }

  function fuelleStartListe() {
    const auswahl = document.getElementById("p-start");
    if (!auswahl) return;
    const personen = DATA.personen.slice().sort((a, b) =>
      String(a.name).localeCompare(String(b.name), "de"));
    auswahl.innerHTML = personen.map(p =>
      `<option value="${p.id}"${p.id === startPerson ? " selected" : ""}>${esc(p.name)} (${jahresText(p)})</option>`)
      .join("");
    if (!personen.some(p => p.id === startPerson) && personen.length) startPerson = personen[0].id;
    auswahl.value = startPerson;
  }

  function setzeBaumModus(modus) {
    baumModus = modus;
    const leiste = document.getElementById("stammbaum-modi");
    leiste?.querySelectorAll("[data-modus]").forEach(b =>
      b.classList.toggle("an", b.dataset.modus === modus));
    const generationsWerkzeug = document.getElementById("knopf-neu");
    if (modus === "generationen") {
      document.getElementById("baum")?.classList.remove("versteckt");
      document.getElementById("pedigree")?.classList.add("versteckt");
      if (generationsWerkzeug) generationsWerkzeug.classList.remove("versteckt");
      baueBaum();
    } else {
      document.getElementById("baum")?.classList.add("versteckt");
      document.getElementById("fremd-wrap")?.classList.add("versteckt");
      document.getElementById("pedigree")?.classList.remove("versteckt");
      if (generationsWerkzeug) generationsWerkzeug.classList.add("versteckt");
      zeichnePedigree();
    }
  }

  function elternVon(id) { return (byId[id]?.eltern || []).filter(e => byId[e]); }
  function kinderVonPerson(id) {
    return DATA.personen.filter(p => (p.eltern || []).includes(id)).map(p => p.id);
  }

  function zeichnePedigree() {
    const behaelter = document.getElementById("pedigree");
    if (!behaelter) return;
    if (!byId[startPerson]) { behaelter.innerHTML = '<p class="hinweis" style="padding:12px">Person wählen.</p>'; return; }

    const B = 168, H = 56, LUECKE = 26, REIHE = 116;
    const richtung = baumModus === "nachkommen" ? "ab" : "auf";
    const nachbarn = id => richtung === "auf" ? elternVon(id) : kinderVonPerson(id);

    const messCache = new Map();
    const messen = (id, gen) => {
      const schluessel = id + "@" + gen;
      if (messCache.has(schluessel)) return messCache.get(schluessel);
      const weiter = gen < ahnenTiefe ? nachbarn(id) : [];
      let breite = B;
      if (weiter.length) {
        const teile = weiter.map(k => messen(k, gen + 1));
        breite = Math.max(B, teile.reduce((a, b) => a + b, 0) + LUECKE * (weiter.length - 1));
      }
      messCache.set(schluessel, breite);
      return breite;
    };

    const knoten = [], kanten = [];
    const setzen = (id, gen, links) => {
      const breite = messen(id, gen);
      const x = links + breite / 2 - B / 2;
      const y = richtung === "auf" ? (ahnenTiefe - gen) * REIHE : gen * REIHE;
      knoten.push({ id, x, y, gen });
      const weiter = gen < ahnenTiefe ? nachbarn(id) : [];
      if (!weiter.length) return;
      const teile = weiter.map(k => messen(k, gen + 1));
      const gesamt = teile.reduce((a, b) => a + b, 0) + LUECKE * (weiter.length - 1);
      let start = links + (breite - gesamt) / 2;
      const kindMitte = x + B / 2;
      weiter.forEach((k, i) => {
        setzen(k, gen + 1, start);
        const kN = knoten[knoten.length - 1];
        const elternMitte = kN.x + B / 2;
        const yVon = richtung === "auf" ? kN.y + H : kN.y;
        const yZu = richtung === "auf" ? y : y + H;
        const bus = yVon + (yZu - yVon) / 2;
        kanten.push(`M ${elternMitte} ${yVon} L ${elternMitte} ${bus} L ${kindMitte} ${bus} L ${kindMitte} ${yZu}`);
        start += teile[i] + LUECKE;
      });
    };

    const gesamtBreite = messen(startPerson, 0);
    setzen(startPerson, 0, 0);
    const breite = gesamtBreite + 80;
    const hoehe = (ahnenTiefe + 1) * REIHE + H;

    const kaesten = knoten.map(k => {
      const person = byId[k.id];
      const zentral = k.id === startPerson;
      const name = String(person.name).length > 22 ? String(person.name).slice(0, 21) + "…" : String(person.name);
      return `<g class="pbox" data-id="${k.id}" style="cursor:pointer">
        <rect x="${k.x}" y="${k.y}" width="${B}" height="${H}" rx="7"
          fill="${zentral ? "#f3e4d6" : "#fffdf7"}"
          stroke="${zentral ? "#7c2d12" : "#c9bca3"}" stroke-width="${zentral ? 2 : 1.2}"/>
        <text x="${k.x + 9}" y="${k.y + 22}" font-size="12" font-weight="600" fill="#2b2620"
          font-family="Segoe UI,sans-serif">${esc(name)}</text>
        <text x="${k.x + 9}" y="${k.y + 38}" font-size="11" fill="#6d6355"
          font-family="Segoe UI,sans-serif">${jahresText(person)}</text>
        <text x="${k.x + 9}" y="${k.y + 50}" font-size="9" fill="#7c2d12"
          font-family="Segoe UI,sans-serif">${esc((person.rolle || "").slice(0, 28))}</text>
      </g>`;
    }).join("");

    const linien = kanten.map(d =>
      `<path d="${d}" fill="none" stroke="#bcae95" stroke-width="1.4"/>`).join("");

    behaelter.innerHTML =
      `<p class="hinweis" style="margin:0 0 8px">${richtung === "auf" ? "Vorfahren" : "Nachkommen"} von
        ${esc(byId[startPerson].name)} · ${ahnenTiefe} Generationen · ${knoten.length} Personen ·
        Klick auf eine Person setzt sie als Startpunkt</p>
       <svg width="${breite}" height="${hoehe}" viewBox="0 0 ${breite} ${hoehe}">
         ${linien}${kaesten}
       </svg>`;

    behaelter.querySelectorAll(".pbox").forEach(el =>
      el.addEventListener("click", () => {
        ahnenVerlauf.push(startPerson);
        startPerson = el.dataset.id;
        document.getElementById("p-start").value = startPerson;
        zeichnePedigree();
      }));
    meldungPedigree(`${knoten.length} Personen dargestellt`);
  }
  const MONATE = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  function gedcomDatum(p) {
    const datum = String(p.datum || "").trim();
    const treffer = datum.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (treffer) return `${parseInt(treffer[1], 10)} ${MONATE[parseInt(treffer[2], 10) - 1]} ${treffer[3]}`;
    if (p.jahr) return String(p.jahr);
    return "";
  }

  function gedcomText() {
    const personen = DATA.personen.slice();
    const nummern = {};
    personen.forEach((p, i) => { nummern[p.id] = "I" + (i + 1); });

    const familien = new Map();
    const eintrag = eltern => {
      const schluessel = eltern.slice().sort().join("|");
      if (!familien.has(schluessel)) familien.set(schluessel, { eltern: [...eltern].sort(), kinder: [] });
      return familien.get(schluessel);
    };
    personen.forEach(p => {
      const el = (p.eltern || []).filter(e => byId[e]);
      if (el.length) eintrag(el).kinder.push(p.id);
    });
    personen.forEach(p => (p.partner || []).filter(x => byId[x]).forEach(x => eintrag([p.id, x])));
    const famNummern = new Map();
    [...familien.keys()].forEach((k, i) => famNummern.set(k, "F" + (i + 1)));

    const heute = new Date();
    const zeilen = ["0 HEAD", "1 SOUR Familienarchiv Janzen", "1 GEDC", "2 VERS 5.5.1",
                    "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8",
                    `1 DATE ${heute.getDate()} ${MONATE[heute.getMonth()]} ${heute.getFullYear()}`];
    if (DATA.stand) zeilen.push("1 NOTE Stand " + DATA.stand);

    personen.forEach(p => {
      zeilen.push(`0 @${nummern[p.id]}@ INDI`);
      zeilen.push(`1 NAME ${p.vorname || ""} /${p.nachname || ""}/`.trim());
      if (p.vorname || p.nachname) zeilen.push(`1 SEX ${istWeiblich(p) ? "F" : "M"}`);
      const geburt = gedcomDatum(p);
      if (geburt || p.ort) {
        zeilen.push("1 BIRT");
        if (geburt) zeilen.push("2 DATE " + geburt);
        if (p.ort) zeilen.push("2 PLAC " + p.ort);
      }
      if (p.jahr_bis) { zeilen.push("1 DEAT"); zeilen.push("2 DATE " + p.jahr_bis); }
      else if (!p.jahr && p.jahr_bis === null) { /* unbekannt */ }
      if (p.rolle) zeilen.push("1 OCCU " + p.rolle);
      if (p.notiz) zeilen.push("1 NOTE " + String(p.notiz).replace(/\n/g, " "));
      if (Array.isArray(p.offen) && p.offen.length) zeilen.push("1 NOTE Offen: " + p.offen.join("; "));
      if (p.belegt) zeilen.push("1 NOTE Quelle: " + p.belegt);

      familien.forEach((fam, schluessel) => {
        if (fam.kinder.includes(p.id)) zeilen.push("1 FAMC @" + famNummern.get(schluessel) + "@");
        if (fam.eltern.includes(p.id)) zeilen.push("1 FAMS @" + famNummern.get(schluessel) + "@");
      });
    });

    familien.forEach((fam, schluessel) => {
      zeilen.push(`0 @${famNummern.get(schluessel)}@ FAM`);
      const [a, b] = fam.eltern;
      if (a && byId[a]) zeilen.push(`1 ${istWeiblich(byId[a]) ? "WIFE" : "HUSB"} @${nummern[a]}@`);
      if (b && byId[b]) zeilen.push(`1 ${istWeiblich(byId[b]) ? "WIFE" : "HUSB"} @${nummern[b]}@`);
      fam.kinder.forEach(k => zeilen.push(`1 CHIL @${nummern[k]}@`));
    });

    zeilen.push("0 TRLR");
    return zeilen.join("\n");
  }

  function csvText() {
    const spalten = ["id", "name", "vorname", "nachname", "jahr", "jahr_bis", "datum",
                     "ort", "rolle", "eltern", "partner", "belegt", "notiz"];
    const quote = s => `"${String(s == null ? "" : s).replace(/"/g, '""')}"`;
    const zeilen = [spalten.join(";")];
    DATA.personen.forEach(p => {
      zeilen.push(spalten.map(f => {
        const wert = p[f];
        if (Array.isArray(wert)) return quote(wert.join(", "));
        return quote(wert);
      }).join(";"));
    });
    return "\ufeff" + zeilen.join("\r\n");
  }

  function jsonText() {
    return JSON.stringify({
      familie: DATA.familie, region: DATA.region, stand: DATA.stand,
      exportiert: new Date().toISOString(),
      personen: DATA.personen, befunde: DATA.befunde, dokumente: DATA.dokumente,
    }, null, 1);
  }

  function herunterladen(name, inhalt, typ) {
    const blob = new Blob([inhalt], { type: typ });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function exportDatum() { return new Date().toISOString().slice(0, 10); }

  function baueExportBereich() {
    const bereich = document.createElement("section");
    bereich.id = "tab-export";
    bereich.className = "versteckt";
    bereich.innerHTML = `
      <div class="exportkarte">
        <h3>GEDCOM (.ged)</h3>
        <p>Standardformat für Ahnenprogramme: GRAMPS, MyHeritage, Ancestry, FamilySearch,
           MacFamilyTree. Enthält Personen, Geburt/Tod, Orte, Familien und Notizen.</p>
        <button id="x-ged">GEDCOM herunterladen</button>
      </div>
      <div class="exportkarte">
        <h3>CSV (.csv)</h3>
        <p>Tabelle für Excel oder Numbers — alle Personen mit Jahren, Orten, Eltern- und
           Partner-IDs. Semikolon als Trennzeichen, UTF-8 mit BOM.</p>
        <button id="x-csv">CSV herunterladen</button>
      </div>
      <div class="exportkarte">
        <h3>JSON (.json)</h3>
        <p>Vollsicherung: Personen, Belege mit Quellen und Zitaten, Dokumentenliste.
           Damit lässt sich das Archiv vollständig wiederherstellen.</p>
        <button id="x-json">JSON herunterladen</button>
      </div>`;
    document.querySelector("main").appendChild(bereich);

    document.getElementById("x-ged").addEventListener("click", () =>
      herunterladen(`familienarchiv-janzen-${exportDatum()}.ged`, gedcomText(), "text/plain;charset=utf-8"));
    document.getElementById("x-csv").addEventListener("click", () =>
      herunterladen(`familienarchiv-janzen-${exportDatum()}.csv`, csvText(), "text/csv;charset=utf-8"));
    document.getElementById("x-json").addEventListener("click", () =>
      herunterladen(`familienarchiv-janzen-${exportDatum()}.json`, jsonText(), "application/json;charset=utf-8"));
  }

  /* ---------- Reiter ---------- */
  function baueReiter() {
    const nav = document.querySelector("nav");
    if (!nav || document.getElementById("knopf-board")) return;
    const bereiche = [["board", "Board"], ["export", "Export"]];

    bereiche.forEach(([schluessel, titel]) => {
      const knopf = document.createElement("button");
      knopf.id = "knopf-" + schluessel;
      knopf.dataset.tab = schluessel;
      knopf.textContent = titel;
      knopf.addEventListener("click", () => {
        document.querySelectorAll("main > section").forEach(s => s.classList.add("versteckt"));
        document.getElementById("tab-" + schluessel).classList.remove("versteckt");
        document.querySelectorAll("nav button").forEach(b => b.classList.remove("aktiv"));
        knopf.classList.add("aktiv");
        if (schluessel === "board") baueGrafik();
      });
      nav.appendChild(knopf);
      document.querySelectorAll("nav button").forEach(b => {
        if (b !== knopf) b.addEventListener("click", () =>
          document.getElementById("tab-" + schluessel)?.classList.add("versteckt"));
      });
    });

    const grafik = document.createElement("section");
    grafik.id = "tab-board";
    grafik.className = "versteckt";
    grafik.innerHTML = `<div id="grafik"></div>`;
    document.querySelector("main").appendChild(grafik);
    baueExportBereich();

    const baum = document.getElementById("baum");
    if (baum && !document.getElementById("knopf-neu")) {
      const neu = document.createElement("button");
      neu.id = "knopf-neu";
      neu.className = "neueperson";
      neu.textContent = "＋ Person hinzufügen";
      neu.addEventListener("click", () => oeffneEditor("__neu"));
      baum.parentNode.insertBefore(neu, baum);
    }
  }

  /* ---------- Start ---------- */
  ladeWebDaten().then(() => {
    baueReiter();
    baueStammbaumModi();
    neuZeichnen();

    // Werkzeugleiste des Boards
    document.addEventListener("click", ev => {
      const id = ev.target.id;
      if (!ev.target.closest("#kontextmenue")) schliesseKontextmenue();
      if (id === "b-modus-kind" || id === "b-modus-ehe") {
        modus = id === "b-modus-kind" ? "kind" : "ehe";
        baueGrafik();
      }
      if (id === "b-undo") rueckgaengig();
      if (id === "b-redo") wiederholen();
      if (id === "b-raster") {
        rasterAn = !rasterAn;
        baueGrafik();
        meldung(rasterAn ? "Raster ein – Kästen rasten auf 24 px ein" : "Raster aus");
      }
      if (id === "b-jetzt") { zeigeAktuelleGeneration(); meldung("aktuelle Generation gezeigt"); }
      if (id === "b-zoom-in") zoome(1.15);
      if (id === "b-zoom-out") zoome(1 / 1.15);
      if (id === "b-neu") {
        const svg = document.getElementById("board");
        const r = svg.getBoundingClientRect();
        const x = ansicht.x + (r.width / ansicht.zoom) / 2 - BOX_B / 2;
        const y = ansicht.y + (r.height / ansicht.zoom) / 2 - BOX_H / 2;
        neuePersonBei(Math.round(x), Math.round(y));
      }
      if (id === "b-reset") {
        if (!confirm("Alle Kasten-Positionen verwerfen und neu nach Generationen anordnen?")) return;
        Object.keys(positionen).forEach(k => delete positionen[k]);
        autoLayout();
        zeichneKnoten(); zeichneLinien();
        zeigeAktuelleGeneration();
        speichereAllePositionen();
        meldung("neu angeordnet");
      }
    });

    document.addEventListener("keydown", ev => {
      const tippt = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      const strg = ev.ctrlKey || ev.metaKey;
      if (strg && ev.key.toLowerCase() === "z" && !tippt) {
        ev.preventDefault();
        if (ev.shiftKey) wiederholen(); else rueckgaengig();
        return;
      }
      if (strg && ev.key.toLowerCase() === "y" && !tippt) {
        ev.preventDefault();
        wiederholen();
        return;
      }
      if (ev.key === "Escape") {
        if (document.getElementById("kontextmenue")) { schliesseKontextmenue(); return; }
        if (entwurf) { beendeEntwurf(); return; }
        if (verbinden) { verbinden = null; zeichneLinien(); meldung("Verknüpfen abgebrochen"); }
      }
    });

    const detail = document.getElementById("detail");
    if (detail) {
      detail.addEventListener("click", ev => {
        const knopf = ev.target.closest("[data-bearb]");
        if (knopf) { ev.preventDefault(); oeffneEditor(knopf.dataset.bearb); }
      });
    }
    const fuss = document.querySelector("footer");
    if (fuss && !document.getElementById("abmelden")) {
      const ab = document.createElement("a");
      ab.id = "abmelden"; ab.href = "/logout"; ab.textContent = "abmelden";
      ab.style.cssText = "margin-left:12px;font-size:12px";
      fuss.appendChild(ab);
    }
  });
})();
