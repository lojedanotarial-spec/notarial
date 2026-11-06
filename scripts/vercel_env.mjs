// Carga variables de scripts/.env en Vercel (producción) sin imprimir valores.
// Uso: node scripts/vercel_env.mjs NOMBRE1 NOMBRE2 ...   (solo NOMBRES; los valores salen de scripts/.env)
// Crea o actualiza (upsert) cada una como "sensitive" en el entorno Production de Notarial.
// Con --listar muestra los NOMBRES de las variables existentes (nunca los valores).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENV = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");
const PROYECTO = "prj_kTaRhwlb7c80Srzcsw3lxTAZPloc";
const TEAM = "lojedanotarial-1974s-projects";

const env = {};
for (const l of fs.readFileSync(ENV, "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const token = env.VERCEL_TOKEN;
if (!token) { console.error("Falta VERCEL_TOKEN en scripts/.env"); process.exit(1); }
const H = { Authorization: `Bearer ${token}`, "content-type": "application/json" };
const args = process.argv.slice(2);

if (args[0] === "--listar") {
  const r = await fetch(`https://api.vercel.com/v10/projects/${PROYECTO}/env?slug=${TEAM}`, { headers: H });
  const j = await r.json();
  if (!r.ok) { console.error("Error", r.status, j.error?.message); process.exit(1); }
  for (const e of j.envs) console.log(`${e.key}\t${e.type}\t${(e.target || []).join(",")}`);
  process.exit(0);
}

if (!args.length) { console.error("Indicá los NOMBRES de las variables."); process.exit(1); }
for (const nombre of args) {
  if (!env[nombre]) { console.error(`${nombre}: no está en scripts/.env`); process.exitCode = 1; continue; }
  const r = await fetch(`https://api.vercel.com/v10/projects/${PROYECTO}/env?slug=${TEAM}&upsert=true`, {
    method: "POST", headers: H,
    body: JSON.stringify({ key: nombre, value: env[nombre], type: "sensitive", target: ["production"] }),
  });
  const j = await r.json();
  console.log(r.ok ? `${nombre}: cargada` : `${nombre}: ERROR ${r.status} ${j.error?.message || ""}`);
  if (!r.ok) process.exitCode = 1;
}
