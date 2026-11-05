// Sube el Worker de monitoreo (workers/monitor/index.js) a Cloudflare por la API, sin wrangler:
// crea el KV si no existe, sube el script con sus secretos y fija los cron triggers.
// Lee todo de scripts/.env (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).
// No imprime ningún secreto.
//
//   node scripts/deploy_monitor.mjs
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("./.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")])
);
for (const k of ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]) {
  if (!env[k]) { console.error(`Falta ${k} en scripts/.env`); process.exit(1); }
}

const NOMBRE = "notarial-monitor";
const SUPABASE_URL = "https://eueqluhhgvukovoyorrw.supabase.co";
const ANON = fs.readFileSync(new URL("../api/_supabaseConfig.js", import.meta.url), "utf8").match(/eyJ[\w.-]+/)[0];
const base = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`;
const H = { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` };

async function cf(ruta, opciones = {}) {
  const r = await fetch(`${base}${ruta}`, { ...opciones, headers: { ...H, ...(opciones.headers || {}) } });
  const j = await r.json();
  if (!j.success) throw new Error(`${ruta}: ${JSON.stringify(j.errors)}`);
  return j.result;
}

// 1) KV para el estado de cada chequeo
const kvs = await cf("/storage/kv/namespaces?per_page=100");
let kv = kvs.find((k) => k.title === "notarial-monitor-estado");
if (!kv) kv = await cf("/storage/kv/namespaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "notarial-monitor-estado" }) });

// 2) Script + bindings
const metadata = {
  main_module: "index.js",
  compatibility_date: "2026-01-01",
  bindings: [
    { type: "kv_namespace", name: "ESTADO", namespace_id: kv.id },
    { type: "plain_text", name: "SUPABASE_URL", text: SUPABASE_URL },
    { type: "plain_text", name: "SUPABASE_ANON_KEY", text: ANON },
    { type: "secret_text", name: "TELEGRAM_BOT_TOKEN", text: env.TELEGRAM_BOT_TOKEN },
    { type: "secret_text", name: "TELEGRAM_CHAT_ID", text: env.TELEGRAM_CHAT_ID },
  ],
};
const form = new FormData();
form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
form.append("index.js", new Blob([fs.readFileSync(new URL("../workers/monitor/index.js", import.meta.url))], { type: "application/javascript+module" }), "index.js");
await cf(`/workers/scripts/${NOMBRE}`, { method: "PUT", body: form });

// 3) Cron triggers: chequeo cada 5 min + latido diario 09:00 Argentina (12:00 UTC)
await cf(`/workers/scripts/${NOMBRE}/schedules`, {
  method: "PUT", headers: { "Content-Type": "application/json" },
  body: JSON.stringify([{ cron: "*/5 * * * *" }, { cron: "0 12 * * *" }]),
});

console.log(`OK: Worker ${NOMBRE} desplegado, KV ${kv.id}, crons fijados.`);
