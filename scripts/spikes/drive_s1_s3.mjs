// Spike S3 (cuenta y cuota con drive.file) y S1 (subida reanudable de ~20 MB con cabecera Origin / CORS).
// Usa GOOGLE_DRIVE_TEST_REFRESH_TOKEN de scripts/.env. No imprime secretos. Borra el archivo de prueba al final.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENV = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
const env = {};
for (const l of fs.readFileSync(ENV, "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const ORIGEN = "https://notarial.lat";
const MB = 1024 * 1024;

const tk = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: env.GOOGLE_DRIVE_CLIENT_ID, client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_DRIVE_TEST_REFRESH_TOKEN, grant_type: "refresh_token",
  }),
});
const tj = await tk.json();
if (!tk.ok) { console.error("No se pudo renovar el token:", tj.error); process.exit(1); }
const AUTH = { Authorization: `Bearer ${tj.access_token}` };
console.log("Renovación de token con refresh token: OK");

// ---------- S3 ----------
const ab = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress),storageQuota", { headers: AUTH });
const aj = await ab.json();
console.log("\n[S3] about.get con drive.file →", ab.status);
if (ab.ok) {
  const q = aj.storageQuota || {};
  console.log("  cuenta:", aj.user?.emailAddress);
  console.log("  usado:", (Number(q.usage) / MB).toFixed(1), "MB · límite:", q.limit ? (Number(q.limit) / 1024 / MB).toFixed(0) + " GB" : "(sin dato)");
} else console.log("  error:", aj.error?.message);

// ---------- S1 ----------
const TAM = 20 * MB;
const cuerpo = Buffer.alloc(TAM, 7);
console.log("\n[S1] iniciando sesión reanudable con Origin:", ORIGEN);
const ini = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,size", {
  method: "POST",
  headers: {
    ...AUTH, "content-type": "application/json; charset=UTF-8", Origin: ORIGEN,
    "X-Upload-Content-Type": "application/octet-stream", "X-Upload-Content-Length": String(TAM),
  },
  body: JSON.stringify({ name: "spike-s1-20MB.bin" }),
});
const sesion = ini.headers.get("location");
console.log("  inicio:", ini.status, "· devolvió URL de sesión:", !!sesion);
if (!sesion) { console.log("  cuerpo:", await ini.text()); process.exit(1); }

const pre = await fetch(sesion, {
  method: "OPTIONS",
  headers: { Origin: ORIGEN, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" },
});
console.log("  preflight OPTIONS:", pre.status,
  "· allow-origin:", pre.headers.get("access-control-allow-origin"),
  "· allow-methods:", pre.headers.get("access-control-allow-methods"),
  "· allow-headers:", pre.headers.get("access-control-allow-headers"));

const t0 = Date.now();
const put = await fetch(sesion, {
  method: "PUT",
  headers: { Origin: ORIGEN, "content-type": "application/octet-stream" },
  body: cuerpo,
});
const pj = await put.json().catch(() => ({}));
console.log("  PUT 20 MB:", put.status, "en", ((Date.now() - t0) / 1000).toFixed(1), "s",
  "· allow-origin en la respuesta:", put.headers.get("access-control-allow-origin"),
  "· expose-headers:", put.headers.get("access-control-expose-headers"));
console.log("  archivo creado:", pj.id ? "sí" : "no", "· tamaño según Drive:", pj.size);

if (pj.id) {
  const del = await fetch(`https://www.googleapis.com/drive/v3/files/${pj.id}`, { method: "DELETE", headers: AUTH });
  console.log("  archivo de prueba borrado:", del.status === 204 ? "sí" : "NO (" + del.status + ")");
}
