// Almacén propio de archivos de Notarial: bucket privado de Cloudflare R2 (spec: specs/almacenamiento-propio/).
// Reemplaza a Google Drive. Aquí viven (1) las reglas puras de claves y (2) el cliente de R2 con aws4fetch.
// El resto de la API recibe el almacén por dependencia (`deps.almacen`), igual que antes recibía a Google,
// para poder probarla con un almacén de mentira.
//
// Claves de los objetos (nunca llevan el nombre del archivo, así renombrar es solo un cambio en la base):
//   definitivas   <registro>/exp/<expediente>/<archivo>   ó   <registro>/lote/<lote>/<archivo>
//   temporales    tmp/<id>      (una regla de ciclo de vida del bucket las borra a las 24 h)
import { AwsClient } from "aws4fetch";

export const PREFIJO_TEMPORAL = "tmp";
export const SUBIDA_VENCE_SEG = 15 * 60; // la dirección firmada de subida sirve 15 minutos

const SEGMENTO = /^[A-Za-z0-9_-]{1,64}$/;
const segmentoValido = (s) => typeof s === "string" && SEGMENTO.test(s);

// ── Reglas puras ─────────────────────────────────────────────────────────────

export function claveTemporal(id) {
  if (!segmentoValido(id)) throw new Error("Identificador de archivo inválido");
  return `${PREFIJO_TEMPORAL}/${id}`;
}

// Un archivo pertenece a un expediente o a un lote (uno solo), dentro de un registro.
export function claveDefinitiva({ registro, expedienteId = null, loteId = null, archivoId } = {}) {
  if ((expedienteId == null) === (loteId == null)) throw new Error("El archivo debe pertenecer a un expediente o a un lote");
  const [tipo, duenio] = expedienteId != null ? ["exp", expedienteId] : ["lote", loteId];
  for (const s of [registro, duenio, archivoId]) if (!segmentoValido(String(s ?? ""))) throw new Error("Clave inválida");
  return `${registro}/${tipo}/${duenio}/${archivoId}`;
}

export const esClaveTemporal = (clave) => typeof clave === "string" && clave.startsWith(`${PREFIJO_TEMPORAL}/`);

export function registroDeClave(clave) {
  if (typeof clave !== "string" || esClaveTemporal(clave)) return null;
  const [registro, tipo, duenio, archivo, ...resto] = clave.split("/");
  if (resto.length || !archivo || !["exp", "lote"].includes(tipo)) return null;
  return [registro, duenio, archivo].every(segmentoValido) ? registro : null;
}

// Defensa extra: antes de leer o borrar un objeto se comprueba que su clave sea del registro del usuario.
export const perteneceAlRegistro = (clave, registro) => registro != null && registroDeClave(clave) === String(registro);

export function configAlmacen(env = process.env) {
  const { ARCHIVOS_R2_ACCOUNT_ID: cuenta, ARCHIVOS_R2_ACCESS_KEY_ID: id, ARCHIVOS_R2_SECRET_ACCESS_KEY: secreto, ARCHIVOS_R2_BUCKET: bucket } = env;
  return cuenta && id && secreto && bucket ? { cuenta, id, secreto, bucket } : null;
}

// ── Cliente de R2 ────────────────────────────────────────────────────────────

export class ErrorAlmacen extends Error {
  constructor(mensaje, estado) { super(mensaje); this.name = "ErrorAlmacen"; this.estado = estado; }
}

export function crearAlmacen(env = process.env) {
  const cfg = configAlmacen(env);
  if (!cfg) throw new Error("Faltan variables ARCHIVOS_R2_*");
  const cliente = new AwsClient({ accessKeyId: cfg.id, secretAccessKey: cfg.secreto, service: "s3", region: "auto", retries: 3 }); // aws4fetch reintenta solo los 5xx/429; 3 para no agotar la función
  const base = `https://${cfg.cuenta}.r2.cloudflarestorage.com/${cfg.bucket}`;
  const ruta = (clave) => clave.split("/").map(encodeURIComponent).join("/");
  const url = (clave) => `${base}/${ruta(clave)}`;
  const falla = async (accion, clave, r) => {
    throw new ErrorAlmacen(`R2 ${accion} ${clave}: ${r.status} ${(await r.text().catch(() => "")).slice(0, 200)}`, r.status);
  };

  return {
    // Dirección firmada para que el navegador suba directo (PUT). No fija el tamaño: R2 no lo permite desde la
    // firma, por eso `confirmar_subida` mide el objeto antes de aceptarlo.
    async firmarSubida(clave, { vence = SUBIDA_VENCE_SEG } = {}) {
      const firmada = await cliente.sign(`${url(clave)}?X-Amz-Expires=${vence}`, { method: "PUT", aws: { signQuery: true } });
      return firmada.url;
    },
    // { tamano, tipo } o null si no existe.
    async consultar(clave) {
      const r = await cliente.fetch(url(clave), { method: "HEAD" });
      if (r.status === 404) return null;
      if (!r.ok) return falla("HEAD", clave, r);
      return { tamano: Number(r.headers.get("content-length")), tipo: r.headers.get("content-type") || "" };
    },
    async copiar(origen, destino) {
      const r = await cliente.fetch(url(destino), { method: "PUT", headers: { "x-amz-copy-source": `/${cfg.bucket}/${ruta(origen)}` } });
      if (!r.ok) return falla("COPY", `${origen} -> ${destino}`, r);
    },
    // Borrar algo que no existe no es un error (S3 responde 204 igual).
    async borrar(clave) {
      const r = await cliente.fetch(url(clave), { method: "DELETE" });
      if (!r.ok && r.status !== 404) return falla("DELETE", clave, r);
    },
    // Respuesta en streaming (Response web) o null si no existe. `rango` = "bytes=0-1023" para tramos.
    async leer(clave, { rango } = {}) {
      const r = await cliente.fetch(url(clave), { method: "GET", headers: rango ? { Range: rango } : {} });
      if (r.status === 404) return null;
      if (!r.ok) return falla("GET", clave, r);
      return r;
    },
  };
}
