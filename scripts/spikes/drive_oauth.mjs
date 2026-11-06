// Spike de Drive (Fase 1): hace el baile OAuth de Google en la compu y guarda el
// refresh token de PRUEBA en scripts/.env (GOOGLE_DRIVE_TEST_REFRESH_TOKEN).
// No imprime secretos. Requiere la URI http://localhost:53682/callback en el cliente
// de Google (temporal, se borra al terminar la Fase 1). Ver specs/drive-escribania/tasks.md.
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.join(AQUI, "..", ".env");
const PUERTO = 53682;
const REDIRECT = `http://localhost:${PUERTO}/callback`;

function leerEnv() {
  const out = {};
  for (const linea of fs.readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function guardarEnv(clave, valor) {
  let txt = fs.readFileSync(ENV, "utf8");
  const re = new RegExp(`^${clave}=.*$`, "m");
  txt = re.test(txt) ? txt.replace(re, `${clave}=${valor}`) : txt.replace(/\s*$/, "\n") + `${clave}=${valor}\n`;
  fs.writeFileSync(ENV, txt);
}

const env = leerEnv();
const clientId = env.GOOGLE_DRIVE_CLIENT_ID;
const clientSecret = env.GOOGLE_DRIVE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("Faltan GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET en scripts/.env");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");
const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
  client_id: clientId,
  redirect_uri: REDIRECT,
  response_type: "code",
  scope: "https://www.googleapis.com/auth/drive.file openid email",
  access_type: "offline",
  prompt: "consent",
  state,
}).toString();

const servidor = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PUERTO}`);
  if (u.pathname !== "/callback") { res.writeHead(404).end(); return; }
  const fin = (codigo, msg) => { res.writeHead(codigo, { "content-type": "text/html; charset=utf-8" }); res.end(`<p style="font:18px sans-serif">${msg}</p>`); };
  try {
    if (u.searchParams.get("error")) throw new Error("Google devolvió: " + u.searchParams.get("error"));
    if (u.searchParams.get("state") !== state) throw new Error("state inválido");
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: u.searchParams.get("code"), client_id: clientId, client_secret: clientSecret,
        redirect_uri: REDIRECT, grant_type: "authorization_code",
      }),
    });
    const j = await r.json();
    if (!r.ok || !j.refresh_token) throw new Error("Sin refresh_token: " + (j.error || r.status));
    guardarEnv("GOOGLE_DRIVE_TEST_REFRESH_TOKEN", j.refresh_token);
    const email = j.id_token ? JSON.parse(Buffer.from(j.id_token.split(".")[1], "base64url").toString()).email : "(sin email)";
    console.log(`Token de prueba guardado en scripts/.env para ${email}. Scopes: ${j.scope}`);
    fin(200, "Listo, ya podés cerrar esta pestaña.");
  } catch (e) {
    console.error("ERROR:", e.message);
    fin(400, "Algo falló: " + e.message);
  } finally {
    setTimeout(() => process.exit(0), 300);
  }
});

servidor.listen(PUERTO, () => {
  console.log("Abrí esta dirección en el navegador (con la sesión de lojeda.notarial@gmail.com):\n");
  console.log(url + "\n");
  console.log("Esperando la autorización…");
});
setTimeout(() => { console.error("Pasaron 10 minutos sin respuesta; cierro."); process.exit(1); }, 10 * 60 * 1000);
