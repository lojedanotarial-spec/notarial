// Prueba previa T1.1 (subir desde el celular): ¿se puede renombrar en Drive un archivo creado por la app con drive.file?
// Usa GOOGLE_DRIVE_TEST_REFRESH_TOKEN de scripts/.env. No imprime secretos. Borra el archivo de prueba al final.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENV = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
const env = {};
for (const l of fs.readFileSync(ENV, "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }

const tk = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_id: env.GOOGLE_DRIVE_CLIENT_ID, client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET, refresh_token: env.GOOGLE_DRIVE_TEST_REFRESH_TOKEN, grant_type: "refresh_token" }),
});
const tj = await tk.json();
if (!tk.ok) { console.error("No se pudo renovar el token:", tj.error); process.exit(1); }
const A = { Authorization: `Bearer ${tj.access_token}` };
const API = "https://www.googleapis.com/drive/v3";

// 1) Crear un archivo chico creado por la app
const crear = await fetch(`${API}/files?fields=id,name`, { method: "POST", headers: { ...A, "content-type": "application/json" }, body: JSON.stringify({ name: "IMG_4821.jpg", mimeType: "image/jpeg" }) });
const creado = await crear.json();
console.log("crear:", crear.status, creado.name);
if (!creado.id) process.exit(1);

// 2) Renombrar
const ren = await fetch(`${API}/files/${creado.id}?fields=id,name`, { method: "PATCH", headers: { ...A, "content-type": "application/json" }, body: JSON.stringify({ name: "DNI García Juan - anverso.jpg" }) });
const renj = await ren.json();
console.log("renombrar:", ren.status, "->", renj.name);

// 3) Confirmar leyéndolo de nuevo (con tildes y espacios)
const leer = await fetch(`${API}/files/${creado.id}?fields=name`, { headers: A });
console.log("leído de nuevo:", (await leer.json()).name);

// 4) Limpieza
const del = await fetch(`${API}/files/${creado.id}`, { method: "DELETE", headers: A });
console.log("archivo de prueba borrado:", del.status === 204 ? "sí" : "NO (" + del.status + ")");
