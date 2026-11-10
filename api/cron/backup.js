// Backup diario de Notarial a Cloudflare R2 (bucket privado notarial-backups).
//
// Qué guarda:
//   tablas/AAAA-MM-DD/<tabla>.json.gz   volcado completo de cada tabla de `public` (se borra a los 30 días,
//                                       regla de ciclo de vida del bucket, prefijo tablas/)
//   tablas/AAAA-MM-DD/_auth_users.json.gz  usuarios de Auth (sin hashes de contraseña: la API admin no los da)
//   tablas/AAAA-MM-DD/_resumen.json     filas por tabla, archivos copiados, duración, errores
//   storage/<bucket>/<ruta>             espejo de los buckets oo-docs y documentos (solo copia lo nuevo o
//                                       modificado; NO se borra con el ciclo de vida ni cuando se borra el original)
//   storage/_manifest.json              qué ya se copió (bucket/ruta -> updated_at)
//
// Corre con la service key (ya está en Vercel). No usa la contraseña de la base: todo va por la API REST.
// Limitación conocida: es un volcado lógico en JSON, no un pg_dump. No incluye el esquema (políticas RLS,
// funciones, índices): eso vive en scripts/*.sql y en docs/db_schema_snapshot.sql.
//
// Autoriza igual que scriba-learning (CRON_SECRET, que Vercel manda solo) o con BACKUP_TRIGGER_TOKEN
// (disparo manual).

import { AwsClient } from "aws4fetch";
import { gzipSync } from "node:zlib";
import { SUPABASE_URL } from "../_supabaseConfig.js";
import { avisar } from "../_telegram.js";
import { clienteServicio, purgarVencidas } from "../_capturaPurga.js";
import { purgarArchivosSiHayAlmacen } from "../_almacenPurga.js";

const BUCKETS_STORAGE = ["oo-docs", "documentos"];
// Tablas que NO se copian: guardan datos personales leídos de documentos hasta que se entregan (después se
// vacían). Una copia en R2 duraría 30 días y contradice la regla de destruir apenas se confirma la lectura.
// El bucket `capturas` ya queda afuera porque no está en BUCKETS_STORAGE.
// `drive_conexiones` (token de Google cifrado) y `drive_enlaces` (enlaces de conexión) tampoco viajan a R2: si hay
// que restaurar, se reconecta el Drive con un enlace nuevo. `drive_auditoria` sí se respalda.
export const TABLAS_EXCLUIDAS = new Set(["capturas", "drive_conexiones", "drive_enlaces"]);
const PAGINA = 1000;
const PRESUPUESTO_MS = 240_000; // la función tiene 300 s; lo que no entre sigue en la próxima corrida
const CONCURRENCIA = 8;

function autorizado(req) {
  const auth = req.headers.authorization || "";
  return [process.env.CRON_SECRET, process.env.BACKUP_TRIGGER_TOKEN]
    .filter(Boolean)
    .some((s) => auth === `Bearer ${s}`);
}

function crearR2() {
  const { BACKUP_R2_ACCOUNT_ID: cuenta, BACKUP_R2_ACCESS_KEY_ID: id, BACKUP_R2_SECRET_ACCESS_KEY: secreto, BACKUP_R2_BUCKET: bucket } = process.env;
  if (!cuenta || !id || !secreto || !bucket) throw new Error("Faltan variables BACKUP_R2_*");
  const cliente = new AwsClient({ accessKeyId: id, secretAccessKey: secreto, service: "s3", region: "auto" });
  const base = `https://${cuenta}.r2.cloudflarestorage.com/${bucket}`;
  const url = (clave) => `${base}/${clave.split("/").map(encodeURIComponent).join("/")}`;
  return {
    async put(clave, cuerpo, tipo = "application/octet-stream") {
      const r = await cliente.fetch(url(clave), { method: "PUT", body: cuerpo, headers: { "Content-Type": tipo } });
      if (!r.ok) throw new Error(`R2 PUT ${clave}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    },
    async getJson(clave) {
      const r = await cliente.fetch(url(clave));
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`R2 GET ${clave}: ${r.status}`);
      return r.json();
    },
  };
}

function crearSupabase(serviceKey) {
  const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  return {
    async json(ruta, opciones = {}) {
      const r = await fetch(`${SUPABASE_URL}${ruta}`, { ...opciones, headers: { ...h, ...(opciones.headers || {}) } });
      if (!r.ok) throw new Error(`Supabase ${ruta}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      return r.json();
    },
    async bytes(ruta) {
      const r = await fetch(`${SUPABASE_URL}${ruta}`, { headers: h });
      if (!r.ok) throw new Error(`Supabase ${ruta}: ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    },
  };
}

// Tablas y su columna de orden: el esquema lo da el OpenAPI de PostgREST. Se ordena por `id` si existe
// para que la paginación sea estable.
async function listarTablas(sb) {
  const api = await sb.json("/rest/v1/", { headers: { Accept: "application/openapi+json" } });
  const defs = api.definitions || api.components?.schemas || {};
  return Object.entries(defs)
    .filter(([nombre]) => !TABLAS_EXCLUIDAS.has(nombre))
    .map(([nombre, def]) => ({ nombre, ordenarPorId: !!def?.properties?.id }));
}

async function volcarTabla(sb, { nombre, ordenarPorId }) {
  const filas = [];
  for (let desde = 0; ; desde += PAGINA) {
    const orden = ordenarPorId ? "&order=id.asc" : "";
    const lote = await sb.json(`/rest/v1/${encodeURIComponent(nombre)}?select=*${orden}`, {
      headers: { Range: `${desde}-${desde + PAGINA - 1}`, "Range-Unit": "items" },
    });
    filas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return filas;
}

async function listarArchivos(sb, bucket, prefijo = "") {
  const archivos = [];
  for (let offset = 0; ; offset += 100) {
    const pagina = await sb.json(`/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: prefijo, limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
    });
    for (const o of pagina) {
      const ruta = prefijo ? `${prefijo}/${o.name}` : o.name;
      if (o.id === null) archivos.push(...(await listarArchivos(sb, bucket, ruta))); // carpeta
      else archivos.push({ ruta, actualizado: o.updated_at || o.created_at || "" });
    }
    if (pagina.length < 100) break;
  }
  return archivos;
}

async function enParalelo(items, n, tarea, venceEn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length && Date.now() < venceEn) await tarea(items[i++]);
  }));
}

export default async function handler(req, res) {
  if (!autorizado(req)) return res.status(401).json({ error: "No autorizado" });

  const inicio = Date.now();
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: "Falta SUPABASE_SERVICE_KEY" });

  const hoy = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10); // fecha Argentina
  const sb = crearSupabase(serviceKey);
  const r2 = crearR2();
  const resumen = { fecha: hoy, tablas: {}, storage: {}, errores: [] };

  // 0) Red de seguridad de la captura desde el celular: destruir lo que haya pasado las 24 h. La purga
  // principal es horaria (Worker de Cloudflare); esta corrida diaria cubre si ese Worker llegara a fallar.
  try { resumen.capturas_purgadas = await purgarVencidas(clienteServicio()); }
  catch (e) { resumen.errores.push(`purga de capturas: ${e.message}`); }

  // 0b) Lo mismo para los archivos propios (papelera de 30 días y expedientes/lotes borrados).
  const purgaArchivos = await purgarArchivosSiHayAlmacen(clienteServicio());
  resumen.archivos_purgados = purgaArchivos;
  if (purgaArchivos.error) resumen.errores.push(`purga de archivos: ${purgaArchivos.error}`);

  // 1) Tablas
  try {
    for (const t of await listarTablas(sb)) {
      try {
        const filas = await volcarTabla(sb, t);
        await r2.put(`tablas/${hoy}/${t.nombre}.json.gz`, gzipSync(JSON.stringify(filas)), "application/gzip");
        resumen.tablas[t.nombre] = filas.length;
      } catch (e) { resumen.errores.push(`tabla ${t.nombre}: ${e.message}`); }
    }
  } catch (e) { resumen.errores.push(`listar tablas: ${e.message}`); }

  // 2) Usuarios de Auth (sin hashes)
  try {
    const usuarios = [];
    for (let pagina = 1; ; pagina++) {
      const { users } = await sb.json(`/auth/v1/admin/users?page=${pagina}&per_page=1000`);
      usuarios.push(...users);
      if (users.length < 1000) break;
    }
    await r2.put(`tablas/${hoy}/_auth_users.json.gz`, gzipSync(JSON.stringify(usuarios)), "application/gzip");
    resumen.tablas._auth_users = usuarios.length;
  } catch (e) { resumen.errores.push(`auth users: ${e.message}`); }

  // 3) Archivos de Storage (incremental)
  try {
    const manifest = (await r2.getJson("storage/_manifest.json")) || {};
    const venceEn = inicio + PRESUPUESTO_MS;
    for (const bucket of BUCKETS_STORAGE) {
      const archivos = await listarArchivos(sb, bucket);
      const pendientes = archivos.filter((a) => manifest[`${bucket}/${a.ruta}`] !== a.actualizado);
      let copiados = 0;
      await enParalelo(pendientes, CONCURRENCIA, async (a) => {
        try {
          const datos = await sb.bytes(`/storage/v1/object/${bucket}/${a.ruta.split("/").map(encodeURIComponent).join("/")}`);
          await r2.put(`storage/${bucket}/${a.ruta}`, datos);
          manifest[`${bucket}/${a.ruta}`] = a.actualizado;
          copiados++;
        } catch (e) { resumen.errores.push(`archivo ${bucket}/${a.ruta}: ${e.message}`); }
      }, venceEn);
      resumen.storage[bucket] = { total: archivos.length, copiados, pendientes_sin_copiar: pendientes.length - copiados };
    }
    await r2.put("storage/_manifest.json", JSON.stringify(manifest), "application/json");
  } catch (e) { resumen.errores.push(`storage: ${e.message}`); }

  resumen.duracion_s = Math.round((Date.now() - inicio) / 1000);
  try { await r2.put(`tablas/${hoy}/_resumen.json`, JSON.stringify(resumen, null, 2), "application/json"); }
  catch (e) { resumen.errores.push(`resumen: ${e.message}`); }

  const ok = resumen.errores.length === 0;
  if (!ok) console.error("[backup] terminó con errores:", resumen.errores);

  // Aviso por Telegram: el mensaje diario de OK también sirve de latido (si un día no llega, algo falló).
  const filas = Object.values(resumen.tablas).reduce((a, n) => a + n, 0);
  const archivosNuevos = Object.values(resumen.storage).reduce((a, s) => a + s.copiados, 0);
  const sinCopiar = Object.values(resumen.storage).reduce((a, s) => a + s.pendientes_sin_copiar, 0);
  await avisar(ok
    ? `✅ Backup ${hoy} OK\n${Object.keys(resumen.tablas).length} tablas, ${filas.toLocaleString("es-AR")} filas, ${archivosNuevos} archivos nuevos${sinCopiar ? `, ${sinCopiar} pendientes para mañana` : ""} (${resumen.duracion_s} s)`
    : `🔴 Backup ${hoy} con ERRORES\n${resumen.errores.slice(0, 5).join("\n").slice(0, 700)}`);

  return res.status(ok ? 200 : 500).json(resumen);
}
