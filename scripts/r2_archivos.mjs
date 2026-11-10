// Crea la infraestructura de R2 para los archivos de Notarial (specs/almacenamiento-propio, T0.1).
// Es repetible: si algo ya existe, lo reutiliza. No imprime ningún secreto.
//
//   node scripts/r2_archivos.mjs
//
// Hace, en orden:
//   1. Bucket privado `notarial-archivos` (sin dirección pública).
//   2. Regla de CORS: solo https://notarial.lat y http://localhost:5173 (subida directa desde el navegador).
//   3. Ciclo de vida: borra solo lo que quede en `tmp/` a las 24 h (subidas a medias).
//   4. Token de API limitado a ESE bucket (lectura y escritura de objetos) y credenciales S3 derivadas.
//   5. Guarda ARCHIVOS_R2_* en scripts/.env (después: node scripts/vercel_env.mjs ARCHIVOS_R2_...).
import fs from "node:fs";
import crypto from "node:crypto";

const RUTA_ENV = new URL("./.env", import.meta.url);
const leerEnv = () => Object.fromEntries(
  fs.readFileSync(RUTA_ENV, "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
);
const env = leerEnv();
for (const k of ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"]) {
  if (!env[k]) { console.error(`Falta ${k} en scripts/.env`); process.exit(1); }
}

const CUENTA = env.CLOUDFLARE_ACCOUNT_ID;
const BUCKET = "notarial-archivos";
const base = `https://api.cloudflare.com/client/v4/accounts/${CUENTA}`;

async function cf(ruta, { metodo = "GET", cuerpo, tolerar = [] } = {}) {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!j.success) {
    const codigos = (j.errors || []).map((e) => e.code);
    if (codigos.some((c) => tolerar.includes(c))) return { yaExiste: true };
    throw new Error(`${metodo} ${ruta} -> ${r.status} ${JSON.stringify(j.errors)}`);
  }
  return j.result;
}

// 1) Bucket
const existentes = await cf("/r2/buckets");
if ((existentes.buckets || []).some((b) => b.name === BUCKET)) {
  console.log(`1. Bucket ${BUCKET}: ya existía.`);
} else {
  await cf("/r2/buckets", { metodo: "POST", cuerpo: { name: BUCKET } });
  console.log(`1. Bucket ${BUCKET}: creado (privado).`);
}

// 2) CORS
await cf(`/r2/buckets/${BUCKET}/cors`, {
  metodo: "PUT",
  cuerpo: {
    rules: [{
      allowed: {
        origins: ["https://notarial.lat", "http://localhost:5173"],
        methods: ["PUT", "GET", "HEAD"],
        headers: ["*"],
      },
      exposeHeaders: ["ETag"],
      maxAgeSeconds: 3600,
    }],
  },
});
console.log("2. CORS: solo notarial.lat y localhost:5173.");

// 3) Ciclo de vida de tmp/
await cf(`/r2/buckets/${BUCKET}/lifecycle`, {
  metodo: "PUT",
  cuerpo: {
    rules: [{
      id: "tmp-24h",
      enabled: true,
      conditions: { prefix: "tmp/" },
      deleteObjectsTransition: { condition: { type: "Age", maxAge: 86400 } },
    }],
  },
});
console.log("3. Ciclo de vida: tmp/ se borra a las 24 h.");

// 4) Token limitado al bucket
if (env.ARCHIVOS_R2_ACCESS_KEY_ID && env.ARCHIVOS_R2_SECRET_ACCESS_KEY) {
  console.log("4. Token: ya hay credenciales ARCHIVOS_R2_* en scripts/.env, no se crea otro.");
} else {
  const grupos = await cf("/tokens/permission_groups");
  const buscar = (nombre) => grupos.find((g) => g.name === nombre);
  const lectura = buscar("Workers R2 Storage Bucket Item Read");
  const escritura = buscar("Workers R2 Storage Bucket Item Write");
  if (!lectura || !escritura) throw new Error("No encuentro los permisos de R2 en la cuenta.");
  const recurso = `com.cloudflare.edge.r2.bucket.${CUENTA}_default_${BUCKET}`;
  const token = await cf("/tokens", {
    metodo: "POST",
    cuerpo: {
      name: `notarial-archivos ${new Date().toISOString().slice(0, 10)}`,
      policies: [{
        effect: "allow",
        resources: { [recurso]: "*" },
        permission_groups: [{ id: lectura.id }, { id: escritura.id }],
      }],
    },
  });
  const secreto = crypto.createHash("sha256").update(token.value).digest("hex");
  fs.appendFileSync(RUTA_ENV, [
    "",
    `# R2 archivos de Notarial (creado ${new Date().toISOString().slice(0, 10)}, limitado al bucket ${BUCKET})`,
    `ARCHIVOS_R2_ACCOUNT_ID=${CUENTA}`,
    `ARCHIVOS_R2_ACCESS_KEY_ID=${token.id}`,
    `ARCHIVOS_R2_SECRET_ACCESS_KEY=${secreto}`,
    `ARCHIVOS_R2_BUCKET=${BUCKET}`,
    "",
  ].join("\n"));
  console.log("4. Token limitado al bucket: creado y guardado en scripts/.env (valores no impresos).");
}

console.log("Listo. Siguiente: node scripts/vercel_env.mjs ARCHIVOS_R2_ACCOUNT_ID ARCHIVOS_R2_ACCESS_KEY_ID ARCHIVOS_R2_SECRET_ACCESS_KEY ARCHIVOS_R2_BUCKET");
