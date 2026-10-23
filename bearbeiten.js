/* Bearbeiten direkt im Stammbaum + grafische Ansicht.
   Lädt zentrale Änderungen von /api/data, legt sie über die gebaute Seite
   ("die Webseite ist führend") und bietet:
     - Klick auf Person -> Akte -> "Bearbeiten" (Formular direkt im Panel)
     - Auswahlfelder für Vater, Mutter, Ehepartner (keine IDs tippen)
     - Reiter "Grafik": Stammbaum als SVG mit Verbindungslinien
   Passwort-Gate davor: functions/_middleware.js */

(function () {
  let webDaten = { personen: {}, geaendert: {} };

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
    #grafik{overflow:auto;border:1px solid var(--linie);border-radius:8px;background:var(--karte);padding:8px}
    #grafik svg{display:block}
    #grafik .box{cursor:pointer}
    #grafik .box:hover rect{stroke:var(--akzent);stroke-width:2}
    .grafikinfo{font-size:12.5px;color:var(--leise);margin:0 0 10px}
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
      const person = byId[id];
      if (person) Object.assign(person, felder, { web: true });
      else {
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
    zahlenAktualisieren();
  }

  function zahlenAktualisieren() {
    const werte = { "z-personen": DATA.personen.length,
                    "z-belege": DATA.befunde.length,
                    "z-dok": DATA.dokumente.length };
    Object.entries(werte).forEach(([id, wert]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = wert;
    });
    const gen = document.getElementById("z-gen");
    if (gen) gen.textContent = Math.max(...Object.values(reihen)) + 1;
  }

  /* ---------- Hilfen ---------- */
  function jahresText(p) { return (p.jahr || "?") + "–" + (p.jahr_bis || "?"); }

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
    return DATA.personen
      .filter(p => !ausschluss.has(p.id))
      .sort((a, b) => (reihen[a.id] ?? 0) - (reihen[b.id] ?? 0) ||
                      String(a.name).localeCompare(String(b.name), "de"))
      .map(p => `<option value="${p.id}"${p.id === gewaehlt ? " selected" : ""}>${p.name} (${jahresText(p)})</option>`)
      .join("");
  }

  function wert(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
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
    const esc = s => String(s == null ? "" : s).replace(/"/g, "&quot;");

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

    document.getElementById("e-speichern").addEventListener("click", () =>
      speichere(istNeu ? null : p.id));
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

    const felder = {
      vorname, nachname, name: `${vorname} ${nachname}`.trim(),
      jahr: wert("e-jahr") || null,
      jahr_bis: wert("e-jahr_bis") || null,
      datum: wert("e-datum"),
      ort: wert("e-ort"),
      rolle: wert("e-rolle"),
      notiz: wert("e-notiz"),
      offen: wert("e-offen"),
      eltern, partner,
      belegt: "Angabe über die Webseite",
    };
    status.className = "status";
    status.textContent = "speichert …";
    try {
      const antwort = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ziel, felder }),
      });
      const ergebnis = await antwort.json();
      if (!antwort.ok || !ergebnis.ok) throw new Error(ergebnis.fehler || antwort.status);

      webDaten = ergebnis.daten;
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
      const antwort = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loeschen: id }),
      });
      const ergebnis = await antwort.json();
      if (!antwort.ok) throw new Error(ergebnis.fehler || antwort.status);
      webDaten = ergebnis.daten;
      location.reload();
    } catch (fehler) {
      alert("Nicht zurückgesetzt: " + fehler.message);
    }
  }

  /* ---------- Grafische Ansicht (SVG) ---------- */
  function baueGrafik() {
    const behaelter = document.getElementById("grafik");
    if (!behaelter) return;
    const personen = DATA.personen.filter(p => verbunden.has(p.id));
    if (!personen.length) {
      behaelter.innerHTML = '<p class="grafikinfo">Keine verbundenen Personen.</p>';
      return;
    }

    const BOX_B = 176, BOX_H = 62, LUECKE = 26, REIHE_H = 132, RAND = 24, PAAR = 30;
    const reihenListe = {};
    personen.forEach(p => {
      const r = reihen[p.id] ?? 0;
      (reihenListe[r] = reihenListe[r] || []).push(p);
    });
    const reihenNummern = Object.keys(reihenListe).map(Number).sort((a, b) => a - b);

    const x = {}, y = {}, einheiten = [];
    let breiteste = 0;

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
        } else {
          benutzt.add(p.id);
          gruppen.push([p]);
        }
      });

      const elternX = gruppe => {
        const werte = gruppe.flatMap(p => (p.eltern || []).map(e => x[e])).filter(v => v !== undefined);
        return werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : Number.MAX_SAFE_INTEGER;
      };
      gruppen.sort((a, b) => elternX(a) - elternX(b));

      let links = RAND;
      gruppen.forEach(gruppe => {
        gruppe.forEach((p, i) => {
          x[p.id] = links + i * (BOX_B + PAAR);
          y[p.id] = RAND + index * REIHE_H;
        });
        links += gruppe.length * BOX_B + (gruppe.length - 1) * PAAR + LUECKE;
        einheiten.push({ personen: gruppe });
      });
      breiteste = Math.max(breiteste, links);
    });

    const hoehe = RAND * 2 + (reihenNummern.length - 1) * REIHE_H + BOX_H;
    const teile = [];

    einheiten.filter(e => e.personen.length === 2).forEach(({ personen: [a, b] }) => {
      const yMitte = y[a.id] + BOX_H / 2;
      teile.push(`<line x1="${x[a.id] + BOX_B}" y1="${yMitte}" x2="${x[b.id]}" y2="${yMitte}" stroke="#7c2d12" stroke-width="1.6"/>`);
    });

    personen.forEach(kind => {
      const eltern = (kind.eltern || []).filter(e => x[e] !== undefined);
      if (!eltern.length) return;
      const mitten = eltern.map(e => x[e] + BOX_B / 2);
      const vonX = mitten.reduce((a, b) => a + b, 0) / mitten.length;
      const vonY = Math.max(...eltern.map(e => y[e] + BOX_H));
      const zuX = x[kind.id] + BOX_B / 2;
      const zuY = y[kind.id];
      const bus = vonY + (zuY - vonY) / 2;
      teile.push(`<path d="M ${vonX} ${vonY} L ${vonX} ${bus} L ${zuX} ${bus} L ${zuX} ${zuY}" fill="none" stroke="#bcae95" stroke-width="1.4"/>`);
    });

    personen.forEach(p => {
      const px = x[p.id], py = y[p.id];
      const strich = p.web ? ' stroke-dasharray="4 3"' : "";
      const fuellung = p.web ? "#f3e4d6" : "#fffdf7";
      const name = String(p.name).length > 24 ? String(p.name).slice(0, 23) + "…" : String(p.name);
      teile.push(`
        <g class="box" data-id="${p.id}">
          <rect x="${px}" y="${py}" width="${BOX_B}" height="${BOX_H}" rx="7" fill="${fuellung}" stroke="#c9bca3" stroke-width="1.3"${strich}/>
          <text x="${px + 10}" y="${py + 24}" font-size="12.5" font-weight="600" fill="#2b2620" font-family="Segoe UI,sans-serif">${name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
          <text x="${px + 10}" y="${py + 42}" font-size="11.5" fill="#6d6355" font-family="Segoe UI,sans-serif">${jahresText(p)}</text>
          <text x="${px + 10}" y="${py + 55}" font-size="9.5" fill="#7c2d12" font-family="Segoe UI,sans-serif">${(p.rolle || "").slice(0, 30).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
        </g>`);
    });

    const breite = Math.ceil(breiteste + RAND);
    behaelter.innerHTML =
      `<p class="grafikinfo">${personen.length} Personen, ${reihenNummern.length} Generationen ·
        gestrichelt = über die Webseite geändert · Klick öffnet die Akte</p>
       <svg width="${breite}" height="${hoehe}" viewBox="0 0 ${breite} ${hoehe}">${teile.join("")}</svg>`;

    behaelter.querySelectorAll(".box").forEach(el =>
      el.addEventListener("click", () => { zeigeTab("baum"); zeigePerson(el.dataset.id); }));
  }

  /* ---------- Reiter "Grafik" + Knopf "neue Person" ---------- */
  function baueReiter() {
    const nav = document.querySelector("nav");
    if (!nav || document.getElementById("knopf-grafik")) return;

    const knopf = document.createElement("button");
    knopf.id = "knopf-grafik";
    knopf.dataset.tab = "grafik";
    knopf.textContent = "Grafik";
    knopf.addEventListener("click", () => {
      document.querySelectorAll("main > section").forEach(s => s.classList.add("versteckt"));
      document.getElementById("tab-grafik").classList.remove("versteckt");
      document.querySelectorAll("nav button").forEach(b => b.classList.remove("aktiv"));
      knopf.classList.add("aktiv");
      baueGrafik();
    });
    nav.appendChild(knopf);

    document.querySelectorAll("nav button").forEach(b => {
      if (b !== knopf) b.addEventListener("click", () =>
        document.getElementById("tab-grafik").classList.add("versteckt"));
    });

    const bereich = document.createElement("section");
    bereich.id = "tab-grafik";
    bereich.className = "versteckt";
    bereich.innerHTML = `<div id="grafik"></div>`;
    document.querySelector("main").appendChild(bereich);

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
    neuZeichnen();
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
