// Sube el Worker de purga (workers/purga/index.js) a Cloudflare por la API, sin wrangler, y fija su cron
// horario. Lee scripts/.env (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, BACKUP_TRIGGER_TOKEN; opcionales
// TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID). No imprime ningún secreto.
//
// El Worker se autentica con BACKUP_TRIGGER_TOKEN, que ya existe en Vercel y que api/captura.js acepta para la
// acción "purgar" (sirve para disparos de servidor a servidor). No hace falta una variable nueva.
//
//   node scripts/deploy_purga.mjs
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("./.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
);
for (const k of ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "BACKUP_TRIGGER_TOKEN"]) {
  if (!env[k]) { console.error(`Falta ${k} en scripts/.env`); process.exit(1); }
}

const NOMBRE = "notarial-purga";
const base = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`;
const H = { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` };

async function cf(ruta, opciones = {}) {
  const r = await fetch(`${base}${ruta}`, { ...opciones, headers: { ...H, ...(opciones.headers || {}) } });
  const j = await r.json();
  if (!j.success) throw new Error(`${ruta}: ${JSON.stringify(j.errors)}`);
  return j.result;
}

const bindings = [{ type: "secret_text", name: "CAPTURA_PURGA_TOKEN", text: env.BACKUP_TRIGGER_TOKEN }];
if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
  bindings.push({ type: "secret_text", name: "TELEGRAM_BOT_TOKEN", text: env.TELEGRAM_BOT_TOKEN });
  bindings.push({ type: "secret_text", name: "TELEGRAM_CHAT_ID", text: env.TELEGRAM_CHAT_ID });
}
const form = new FormData();
form.append("metadata", new Blob([JSON.stringify({ main_module: "index.js", compatibility_date: "2026-01-01", bindings })], { type: "application/json" }));
form.append("index.js", new Blob([fs.readFileSync(new URL("../workers/purga/index.js", import.meta.url))], { type: "application/javascript+module" }), "index.js");
await cf(`/workers/scripts/${NOMBRE}`, { method: "PUT", body: form });

await cf(`/workers/scripts/${NOMBRE}/schedules`, {
  method: "PUT", headers: { "Content-Type": "application/json" },
  body: JSON.stringify([{ cron: "0 * * * *" }]),
});

console.log(`OK: Worker ${NOMBRE} desplegado con cron horario.`);
