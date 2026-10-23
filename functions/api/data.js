// Änderungen aus dem Web speichern und laden.
// KV-Binding AHNEN_KV (Namespace "ahnen-archiv-daten"), Schlüssel "daten".
// Struktur: { personen: { <id>: { ...felder } }, stand: "ISO-Datum", geaendert: { <id>: "ISO" } }

const SCHLUESSEL = "daten";

async function lade(env) {
  const roh = await env.AHNEN_KV.get(SCHLUESSEL);
  if (!roh) return { personen: {}, geaendert: {}, stand: null };
  try {
    return JSON.parse(roh);
  } catch {
    return { personen: {}, geaendert: {}, stand: null };
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const ERLAUBT = ["name", "vorname", "nachname", "geburtsname", "geschlecht",
                 "jahr", "jahr_bis", "datum", "ort",
                 "rolle", "notiz", "belegt", "offen", "eltern", "partner", "kandidaten",
                 "pos_x", "pos_y"];

function aufraeumen(quelle) {
  const ziel = {};
  for (const feld of ERLAUBT) {
    if (!(feld in (quelle || {}))) continue;
    let wert = quelle[feld];
    if (feld === "jahr" || feld === "jahr_bis" || feld === "pos_x" || feld === "pos_y") {
      wert = wert === "" || wert === null ? null : Number(wert);
      if (Number.isNaN(wert)) wert = null;
    }
    if (feld === "offen" || feld === "kandidaten") {
      wert = Array.isArray(wert) ? wert : String(wert || "").split(";").map(s => s.trim()).filter(Boolean);
    }
    if (feld === "eltern" || feld === "partner") {
      wert = Array.isArray(wert) ? wert : String(wert || "").split(",").map(s => s.trim()).filter(Boolean);
    }
    if (feld === "geschlecht") {
      const g = String(wert || "").trim().toLowerCase();
      wert = /^(m|männlich|maennlich|male|mann)$/.test(g) ? "m"
           : /^(w|weiblich|female|frau|f)$/.test(g) ? "w" : "";
    }
    if (feld === "geburtsname") wert = String(wert || "").trim();
    ziel[feld] = wert;
  }
  return ziel;
}

export async function onRequestGet({ env }) {
  if (!env.AHNEN_KV) return json({ fehler: "KV-Binding AHNEN_KV fehlt" }, 500);
  return json(await lade(env));
}

export async function onRequestPost({ request, env }) {
  if (!env.AHNEN_KV) return json({ fehler: "KV-Binding AHNEN_KV fehlt" }, 500);
  let koerper;
  try {
    koerper = await request.json();
  } catch {
    return json({ fehler: "Ungültiges JSON" }, 400);
  }

  const daten = await lade(env);
  const jetzt = new Date().toISOString();

  if (koerper.loeschen) {
    delete daten.personen[koerper.loeschen];
    delete daten.geaendert[koerper.loeschen];
  } else if (koerper.id) {
    const felder = aufraeumen(koerper.felder);
    daten.personen[koerper.id] = { ...(daten.personen[koerper.id] || {}), ...felder };
    daten.geaendert[koerper.id] = jetzt;
  } else {
    return json({ fehler: "id oder loeschen erforderlich" }, 400);
  }

  daten.stand = jetzt;
  await env.AHNEN_KV.put(SCHLUESSEL, JSON.stringify(daten));
  return json({ ok: true, daten });
}
