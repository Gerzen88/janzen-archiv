// Passwortschutz für das Familienarchiv.
// Liegt unter functions/_middleware.js und läuft vor JEDER Auslieferung –
// auch vor /Akten/*. Das Passwort steht als verschlüsseltes Secret in der
// Pages-Konfiguration (Variable PASSWORD), nicht im Quelltext.

const COOKIE = "ahnen_auth";
const MAX_ALTER = 60 * 60 * 24 * 30; // 30 Tage

async function token(passwort) {
  const daten = new TextEncoder().encode(passwort + "|janzen-archiv|v1");
  const hash = await crypto.subtle.digest("SHA-256", daten);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function cookieWert(request, name) {
  const kopf = request.headers.get("Cookie") || "";
  for (const teil of kopf.split(";")) {
    const [k, ...rest] = teil.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function loginSeite(fehler = "") {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Familienarchiv Janzen</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f2e7;color:#2b2620;
       font-family:"Segoe UI",system-ui,sans-serif}
  .karte{background:#fffdf7;border:1px solid #ddd2bd;border-radius:10px;padding:34px 30px;
         width:min(360px,90vw);box-shadow:0 10px 30px rgba(0,0,0,.07)}
  h1{font-family:Georgia,serif;font-size:22px;margin:0 0 4px}
  p{color:#6d6355;font-size:13px;margin:0 0 20px}
  input{width:100%;padding:10px 12px;border:1px solid #ddd2bd;border-radius:6px;font-size:15px;
        background:#fbf7ee;box-sizing:border-box}
  button{margin-top:14px;width:100%;padding:11px;border:0;border-radius:6px;background:#7c2d12;
         color:#fff;font-size:15px;cursor:pointer}
  .fehler{color:#8c2f2f;font-size:13px;margin-top:12px}
</style></head><body>
<form class="karte" method="POST" action="/login">
  <h1>Familienarchiv Janzen</h1>
  <p>Dieses Archiv ist geschützt. Bitte Passwort eingeben.</p>
  <input type="password" name="passwort" autofocus autocomplete="current-password" placeholder="Passwort">
  <button type="submit">Öffnen</button>
  ${fehler ? `<div class="fehler">${fehler}</div>` : ""}
</form></body></html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!env.PASSWORD) {
    return new Response("Serverfehler: kein Passwort konfiguriert (Variable PASSWORD fehlt).",
                        { status: 500 });
  }
  const erwartet = await token(env.PASSWORD);

  if (url.pathname === "/logout") {
    return new Response(null, {
      status: 302, headers: {
        Location: "/",
        "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      },
    });
  }

  if (url.pathname === "/login" && request.method === "POST") {
    const form = await request.formData();
    if ((form.get("passwort") || "") === env.PASSWORD) {
      return new Response(null, {
        status: 303, headers: {
          Location: "/",
          "Set-Cookie": `${COOKIE}=${erwartet}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_ALTER}`,
        },
      });
    }
    return new Response(loginSeite("Passwort falsch."),
                        { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (cookieWert(request, COOKIE) === erwartet) return next();

  return new Response(loginSeite(),
                      { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
