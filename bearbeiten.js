/* Bearbeiten-Funktion für das Familienarchiv.
   Lädt die zentral gespeicherten Änderungen von /api/data, legt sie über die
   gebaute Seite ("die Webseite ist führend") und stellt ein Formular bereit,
   das per POST speichert. Das Passwort-Gate liegt davor in functions/_middleware.js. */

(function () {
  let webDaten = { personen: {}, geaendert: {} };
  let gewaehlt = null;

  /* ---------- Stil ergänzen ---------- */
  const stil = document.createElement("style");
  stil.textContent = `
    .formular{background:var(--karte);border:1px solid var(--linie);border-radius:8px;padding:18px;max-width:760px}
    .formular label{display:block;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--leise);margin:12px 0 3px}
    .formular input,.formular textarea,.formular select{width:100%;padding:8px 10px;border:1px solid var(--linie);
        border-radius:5px;background:#fbf7ee;font-size:14px;color:var(--tinte);font-family:inherit;box-sizing:border-box}
    .formular textarea{min-height:58px;resize:vertical}
    .feldpaar{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    @media(max-width:620px){.feldpaar{grid-template-columns:1fr}}
    .knopfreihe{display:flex;gap:10px;margin-top:18px;align-items:center;flex-wrap:wrap}
    .knopfreihe button{padding:9px 18px;border-radius:6px;border:1px solid var(--akzent);
        background:var(--akzent);color:#fff;font-size:14px;cursor:pointer}
    .knopfreihe button.zweit{background:transparent;color:var(--akzent)}
    .status{font-size:13px;color:var(--gruen)}
    .status.fehler{color:var(--rot)}
    .webmarke{font-size:10px;color:var(--akzent);border:1px solid var(--akzent);border-radius:99px;padding:0 6px;margin-left:6px}
  `;
  document.head.appendChild(stil);

  /* ---------- Daten laden und anwenden ---------- */
  async function ladeWebDaten() {
    try {
      const antwort = await fetch("/api/data", { headers: { Accept: "application/json" } });
      if (!antwort.ok) return;
      webDaten = await antwort.json();
    } catch (fehler) {
      console.warn("Web-Änderungen nicht ladbar:", fehler);
      return;
    }
    const über = webDaten.personen || {};
    Object.entries(über).forEach(([id, felder]) => {
      const person = byId[id];
      if (person) {
        Object.assign(person, felder, { web: true });
      } else {
        const neu = Object.assign({ id }, felder, { web: true, generation: 0 });
        DATA.personen.push(neu);
        byId[id] = neu;
      }
    });
    neuRechnen();
  }

  /* Reihen/Verbundenheit neu berechnen - die Variablen sind const, werden aber in-place gefüllt */
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
    document.getElementById("z-personen").textContent = DATA.personen.length;
    document.getElementById("z-gen").textContent = Math.max(...Object.values(reihen)) + 1;
    document.getElementById("z-belege").textContent = DATA.befunde.length;
  }

  /* ---------- Oberfläche ---------- */
  function baueReiter() {
    const nav = document.querySelector("nav");
    if (!nav || document.getElementById("knopf-bearbeiten")) return;
    const knopf = document.createElement("button");
    knopf.id = "knopf-bearbeiten";
    knopf.dataset.tab = "bearbeiten";
    knopf.textContent = "Bearbeiten";
    knopf.addEventListener("click", () => {
      document.querySelectorAll("main > section").forEach(s => s.classList.add("versteckt"));
      document.getElementById("tab-bearbeiten").classList.remove("versteckt");
      document.querySelectorAll("nav button").forEach(b => b.classList.remove("aktiv"));
      knopf.classList.add("aktiv");
      fuelleFormular(document.getElementById("f-person").value);
    });
    nav.appendChild(knopf);

    /* beim Wechsel auf einen anderen Reiter die Bearbeiten-Fläche ausblenden */
    document.querySelectorAll("nav button").forEach(b => {
      if (b !== knopf) b.addEventListener("click", () =>
        document.getElementById("tab-bearbeiten").classList.add("versteckt"));
    });

    const bereich = document.createElement("section");
    bereich.id = "tab-bearbeiten";
    bereich.className = "versteckt";
    bereich.innerHTML = `
      <p style="font-size:13px;color:var(--leise);max-width:760px;margin-top:0">
        Änderungen werden zentral gespeichert und gelten für alle, die die Seite öffnen —
        die Webseite ist führend. Leere Felder bleiben leer.</p>
      <div class="formular">
        <label>Person</label>
        <select id="f-person"></select>
        <div class="feldpaar">
          <div><label>Vorname</label><input id="f-vorname"></div>
          <div><label>Nachname</label><input id="f-nachname"></div>
        </div>
        <div class="feldpaar">
          <div><label>Geburtsjahr</label><input id="f-jahr" type="number" inputmode="numeric"></div>
          <div><label>Sterbejahr</label><input id="f-jahr_bis" type="number" inputmode="numeric"></div>
        </div>
        <div class="feldpaar">
          <div><label>Genaues Datum</label><input id="f-datum" placeholder="z. B. 23.07.1955"></div>
          <div><label>Ort</label><input id="f-ort"></div>
        </div>
        <label>Rolle</label><input id="f-rolle">
        <label>Notiz</label><textarea id="f-notiz"></textarea>
        <label>Offene Fragen (mit ; trennen)</label><textarea id="f-offen"></textarea>
        <div class="feldpaar">
          <div><label>Eltern (IDs, mit Komma)</label><input id="f-eltern"></div>
          <div><label>Partner (IDs, mit Komma)</label><input id="f-partner"></div>
        </div>
        <div class="knopfreihe">
          <button id="f-speichern">Speichern</button>
          <button id="f-neu" class="zweit">＋ neue Person</button>
          <span id="f-status" class="status"></span>
        </div>
      </div>`;
    document.querySelector("main").appendChild(bereich);

    document.getElementById("f-person").addEventListener("change", ev => fuelleFormular(ev.target.value));
    document.getElementById("f-speichern").addEventListener("click", speichern);
    document.getElementById("f-neu").addEventListener("click", () => {
      document.getElementById("f-person").value = "__neu";
      fuelleFormular("__neu");
    });
    fuelleListe();
  }

  function fuelleListe() {
    const auswahl = document.getElementById("f-person");
    const vorher = auswahl.value;
    const sortiert = DATA.personen.slice().sort((a, b) =>
      (a.generation - b.generation) || String(a.name).localeCompare(String(b.name), "de"));
    auswahl.innerHTML = sortiert.map(p =>
      `<option value="${p.id}">${p.name} (${jahre(p)})</option>`).join("") +
      `<option value="__neu">＋ neue Person</option>`;
    if (vorher && [...auswahl.options].some(o => o.value === vorher)) auswahl.value = vorher;
    else if (sortiert.length) auswahl.value = sortiert[0].id;
  }

  function setze(id, wert) {
    const el = document.getElementById(id);
    if (el) el.value = wert === null || wert === undefined ? "" : wert;
  }

  function fuelleFormular(id) {
    if (!document.getElementById("f-vorname")) return;
    const person = id === "__neu" ? null : byId[id];
    gewaehlt = id;
    setze("f-vorname", person ? person.vorname : "");
    setze("f-nachname", person ? person.nachname : "");
    setze("f-jahr", person ? person.jahr : "");
    setze("f-jahr_bis", person ? person.jahr_bis : "");
    setze("f-datum", person ? person.datum : "");
    setze("f-ort", person ? person.ort : "");
    setze("f-rolle", person ? person.rolle : "");
    setze("f-notiz", person ? person.notiz : "");
    setze("f-offen", person && Array.isArray(person.offen) ? person.offen.join("; ") : "");
    setze("f-eltern", person && Array.isArray(person.eltern) ? person.eltern.join(", ") : "");
    setze("f-partner", person && Array.isArray(person.partner) ? person.partner.join(", ") : "");
    const status = document.getElementById("f-status");
    status.className = "status";
    status.textContent = person && webDaten.geaendert && webDaten.geaendert[id]
      ? "zuletzt geändert: " + new Date(webDaten.geaendert[id]).toLocaleString("de-DE") : "";
  }

  function lies(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  async function speichern() {
    const status = document.getElementById("f-status");
    const vorname = lies("f-vorname"), nachname = lies("f-nachname");
    if (!vorname && !nachname) {
      status.className = "status fehler";
      status.textContent = "Vor- oder Nachname fehlt.";
      return;
    }
    const id = gewaehlt === "__neu" || !gewaehlt
      ? "web_" + Date.now().toString(36) : gewaehlt;

    const felder = {
      vorname, nachname,
      name: `${vorname} ${nachname}`.trim(),
      jahr: lies("f-jahr") || null,
      jahr_bis: lies("f-jahr_bis") || null,
      datum: lies("f-datum"),
      ort: lies("f-ort"),
      rolle: lies("f-rolle"),
      notiz: lies("f-notiz"),
      offen: lies("f-offen"),
      eltern: lies("f-eltern").split(",").map(s => s.trim()).filter(Boolean),
      partner: lies("f-partner").split(",").map(s => s.trim()).filter(Boolean),
      belegt: "Angabe über die Webseite",
    };

    document.getElementById("f-speichern").disabled = true;
    try {
      const antwort = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, felder }),
      });
      const ergebnis = await antwort.json();
      if (!antwort.ok || !ergebnis.ok) throw new Error(ergebnis.fehler || antwort.status);

      webDaten = ergebnis.daten;
      const vorhanden = byId[id];
      if (vorhanden) Object.assign(vorhanden, felder, { web: true });
      else {
        const neu = Object.assign({ id, generation: 0 }, felder, { web: true });
        DATA.personen.push(neu);
        byId[id] = neu;
      }
      neuRechnen(); neuZeichnen(); fuelleListe();
      document.getElementById("f-person").value = id;
      gewaehlt = id;
      status.className = "status";
      status.textContent = "gespeichert " + new Date().toLocaleTimeString("de-DE");
    } catch (fehler) {
      status.className = "status fehler";
      status.textContent = "Nicht gespeichert: " + fehler.message;
    } finally {
      document.getElementById("f-speichern").disabled = false;
    }
  }

  /* ---------- Start ---------- */
  ladeWebDaten().then(() => {
    neuZeichnen();
    baueReiter();
    const fuss = document.querySelector("footer");
    if (fuss && !document.getElementById("abmelden")) {
      const ab = document.createElement("a");
      ab.id = "abmelden";
      ab.href = "/logout";
      ab.textContent = "abmelden";
      ab.style.cssText = "margin-left:12px;font-size:12px";
      fuss.appendChild(ab);
    }
  });
})();
