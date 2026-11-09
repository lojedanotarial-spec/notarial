// Lógica pura del Drive de la escribanía (sin red ni base: se prueba sola).
// El handler (api/drive.js) la usa. Spec y plan: specs/drive-escribania/.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Mismo generador y hash que la captura desde el celular: 256 bits al azar, solo se guarda el hash.
export { generarCodigo, hashCodigo } from "./_captura.js";

// ── Constantes ───────────────────────────────────────────────────────────────

const MB = 1024 * 1024;
export const MAX_BYTES_ARCHIVO = 25 * MB;
export const ENLACE_VENCE_MS = 24 * 60 * 60 * 1000;  // el enlace de conexión sirve 24 h y una sola vez
export const STATE_VENCE_MS = 15 * 60 * 1000;         // tiempo para completar la pantalla de Google
export const UMBRAL_CUOTA = 0.8;
// Lo borrado (desde Notarial o directo en Drive) deja de figurar en la lista al instante; la fila oculta se elimina a los 30 días, que es
// lo que Drive guarda en su papelera (después ya no se puede recuperar el archivo, así que no tiene sentido guardar su nombre).
// El HISTORIAL de actividad, en cambio, se conserva completo hasta que se borra el expediente (decisión de Lucas, 09/11/26).
export const PURGA_ARCHIVOS_MS = 30 * 24 * 60 * 60 * 1000;
export const limitePurgaArchivos = (ahora = Date.now()) => new Date(ahora - PURGA_ARCHIVOS_MS).toISOString();
export const TIPOS_ARCHIVO = ["dni", "tarjeta_verde", "poder", "formulario", "otro"];
export const SCOPES_GOOGLE = ["https://www.googleapis.com/auth/drive.file", "openid", "email"];
export const ACCIONES_AUDITORIA = ["conectar", "desconectar", "subir", "ver", "descargar", "borrar", "conexion_rota", "celular_abrir", "celular_cerrar", "renombrar", "identificar", "borrado_en_drive"];
const PREVISUALIZABLES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

// ── Enlaces de conexión ──────────────────────────────────────────────────────

export function calcularVencimientoEnlace(ahora = Date.now()) {
  return new Date(ahora + ENLACE_VENCE_MS).toISOString();
}

// Por qué un enlace no sirve (null si sirve). "Usado" gana sobre "vencido": es lo más útil de decirle a la persona.
export function motivoEnlaceInvalido(enlace, ahora = Date.now()) {
  if (!enlace) return "inexistente";
  if (enlace.usado_en) return "usado";
  if (new Date(enlace.expira_en).getTime() <= ahora) return "vencido";
  return null;
}

export const enlaceVigente = (enlace, ahora = Date.now()) => motivoEnlaceInvalido(enlace, ahora) === null;

// ── Cifrado del token de Google (AES-256-GCM) ────────────────────────────────
// Formato "v1.<iv>.<tag>.<cifrado>" en base64url. La versión permite rotar la clave sin adivinar.

function clave32(claveB64) {
  const k = Buffer.from(String(claveB64 || ""), "base64");
  if (k.length !== 32) throw new Error("clave_invalida");
  return k;
}

export function cifrar(texto, claveB64) {
  const k = clave32(claveB64);
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const datos = Buffer.concat([c.update(String(texto), "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), datos.toString("base64url")].join(".");
}

export function descifrar(token, claveB64) {
  const k = clave32(claveB64);
  const partes = String(token || "").split(".");
  if (partes.length !== 4 || partes[0] !== "v1") throw new Error("token_invalido");
  try {
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(partes[1], "base64url"));
    d.setAuthTag(Buffer.from(partes[2], "base64url"));
    return Buffer.concat([d.update(Buffer.from(partes[3], "base64url")), d.final()]).toString("utf8");
  } catch {
    // Dato alterado, clave equivocada o formato roto: siempre el mismo error, sin detalles del cifrado.
    throw new Error("token_invalido");
  }
}

// ── State de OAuth firmado (anti-CSRF) ───────────────────────────────────────
// La firma usa una clave derivada, distinta de la que cifra el token.

function claveFirma(claveB64) {
  return createHash("sha256").update("notarial-drive-state:").update(clave32(claveB64)).digest();
}

export function firmarState(payload, claveB64) {
  const cuerpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const firma = createHmac("sha256", claveFirma(claveB64)).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

export function verificarState(state, claveB64, ahora = Date.now()) {
  try {
    const partes = String(state || "").split(".");
    if (partes.length !== 2) return null;
    const esperada = createHmac("sha256", claveFirma(claveB64)).update(partes[0]).digest();
    const recibida = Buffer.from(partes[1], "base64url");
    if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
    const payload = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8"));
    if (!payload || typeof payload.exp !== "number" || payload.exp <= ahora) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Validación de archivos ───────────────────────────────────────────────────

// Saca los caracteres de control (saltos de línea, nulos, etc.), que no tienen lugar en un nombre de archivo.
const sinControl = (s) => Array.from(String(s ?? "")).filter((ch) => { const c = ch.charCodeAt(0); return c > 31 && c !== 127; }).join("");

function nombreLimpio(nombre) {
  let n = sinControl(nombre);
  n = n.split(/[\\/]/).pop().trim();
  if (!n || /^\.+$/.test(n)) return "archivo";
  if (n.length > 150) {
    const punto = n.lastIndexOf(".");
    const ext = punto > 0 && n.length - punto <= 11 ? n.slice(punto) : "";
    n = n.slice(0, 150 - ext.length) + ext;
  }
  return n;
}

function mimeLimpio(mime) {
  const m = String(mime ?? "").split(";")[0].trim().toLowerCase();
  return /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/.test(m) ? m : "application/octet-stream";
}

export function validarArchivo({ nombre, mime, tamano, tipo } = {}) {
  if (!Number.isInteger(tamano) || tamano <= 0) {
    return { ok: false, codigo: "tamano_invalido", mensaje: "No se pudo leer el tamaño del archivo. Probá de nuevo." };
  }
  if (tamano > MAX_BYTES_ARCHIVO) {
    return { ok: false, codigo: "muy_grande", mensaje: "El archivo supera el máximo de 25 MB." };
  }
  return {
    ok: true,
    nombre: nombreLimpio(nombre),
    mime: mimeLimpio(mime),
    tamano,
    tipo: TIPOS_ARCHIVO.includes(tipo) ? tipo : "otro",
  };
}

// Nombre nuevo que escribe una persona al corregir un archivo: se limpia igual que al subir y conserva la
// extensión del archivo si la persona se la sacó (un .jpg sin extensión deja de abrirse bien).
export function nombreParaRenombrar(nuevo, actual) {
  let n = nombreLimpio(nuevo);
  if (n === "archivo" && !String(nuevo ?? "").trim()) return null; // vacío: no es un nombre
  const ext = (s) => { const m = /\.[A-Za-z0-9]{1,8}$/.exec(s); return m ? m[0] : ""; };
  const extActual = ext(String(actual ?? ""));
  if (extActual && !ext(n)) n = n.slice(0, 150 - extActual.length) + extActual;
  return n;
}

export const tipoValido = (tipo) => (TIPOS_ARCHIVO.includes(tipo) ? tipo : null);

// Solo imágenes y PDF se muestran dentro de Notarial; todo lo demás se descarga (un HTML subido no se ejecuta acá).
export const esPrevisualizable = (mime) => PREVISUALIZABLES.has(mimeLimpio(mime));

export function nombreCarpetaExpediente({ id, nombre } = {}) {
  const sufijo = ` (${String(id ?? "").slice(0, 8)})`;
  let base = sinControl(nombre).replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  if (!base) base = "Expediente";
  return base.slice(0, 120 - sufijo.length).trim() + sufijo;
}

// ── Errores de Google → qué hacer y qué decirle a la gente ───────────────────

export function clasificarErrorGoogle(e) {
  const { status, error, reason } = e || {};
  // La clave del cliente de Google (o su secreto) cambió o falta: es un problema de configuración nuestro,
  // NO de la escribanía. No hay que marcar ninguna conexión como rota por esto.
  if (error === "invalid_client") return { tipo: "configuracion" };
  if (error === "invalid_grant") return { tipo: "rota", motivo: "revocada" };
  if (status === 401) return { tipo: "rota", motivo: "otro" };
  if (status === 403 && (reason === "storageQuotaExceeded" || reason === "quotaExceeded")) return { tipo: "sin_espacio" };
  if (status === 429 || (status === 403 && /ratelimit|dailylimit/i.test(String(reason || "")))) return { tipo: "limite" };
  if (status === 404) return { tipo: "no_encontrado" };
  return { tipo: "otro" };
}

const MENSAJES = {
  rota: "El Drive de la escribanía no está disponible. Avisale a quien administra Notarial.",
  configuracion: "El Drive de la escribanía no está disponible. Avisale a quien administra Notarial.",
  sin_espacio: "El Drive de la escribanía no tiene más espacio. Avisale a quien administra Notarial.",
  limite: "Hay muchas solicitudes en este momento. Probá de nuevo en un minuto.",
  no_encontrado: "Ese archivo ya no está en el Drive de la escribanía.",
  no_conectado: "La escribanía todavía no conectó su Drive. Pedile a quien administra Notarial que lo conecte.",
  otro: "No se pudo completar la operación. Probá de nuevo.",
};
export const mensajeParaUsuario = (tipo) => MENSAJES[tipo] || MENSAJES.otro;

// ── Cuota ────────────────────────────────────────────────────────────────────

export function estadoCuota(c) {
  const usada = Number(c?.usada);
  const total = Number(c?.total);
  if (!Number.isFinite(usada) || !Number.isFinite(total) || total <= 0) {
    return { porcentaje: null, advertencia: false, llena: false };
  }
  return {
    porcentaje: Math.round((usada / total) * 1000) / 10,
    advertencia: usada * 5 >= total * 4,   // 80 %, sin errores de coma flotante
    llena: usada >= total,
  };
}

// ── Auditoría ────────────────────────────────────────────────────────────────

export function armarAuditoria({ registro, usuarioId = null, accion, expedienteId = null, archivoId = null, detalle = null } = {}) {
  if (!ACCIONES_AUDITORIA.includes(accion)) throw new Error("accion_invalida");
  const reg = String(registro ?? "").trim();
  if (!reg) throw new Error("registro_requerido");
  let d = detalle;
  if (d != null) {
    const txt = JSON.stringify(d);
    if (txt.length > 1000) d = { truncado: true, texto: txt.slice(0, 900) };
  }
  return { registro_numero: reg, usuario_id: usuarioId, accion, expediente_id: expedienteId, archivo_id: archivoId, detalle: d ?? null };
}

// ── Autorización con Google ──────────────────────────────────────────────────

export function armarUrlAutorizacion({ clientId, redirectUri, state }) {
  return "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES_GOOGLE.join(" "),
    access_type: "offline",   // para recibir el refresh token
    prompt: "consent",        // Google solo lo entrega si se pide el consentimiento de nuevo
    state,
  }).toString();
}

const ERRORES_RETORNO = new Set(["rechazado", "vencido", "usado", "invalido", "inexistente"]);

export function urlDeRetorno(resultado, codigo) {
  if (resultado === "ok") return "/drive/listo";
  const error = ERRORES_RETORNO.has(resultado) ? resultado : "invalido";
  const c = String(codigo || "");
  return /^[A-Za-z0-9_-]+$/.test(c) ? `/drive/${c}?error=${error}` : `/drive/error?error=${error}`;
}

// ── Lo que se expone ─────────────────────────────────────────────────────────

// Resumen de una conexión para el panel del administrador. NUNCA incluye el token (ni cifrado).
export function resumenConexion(fila) {
  if (!fila) return { conectado: false, operativa: false, estado: "no_conectado" };
  return {
    conectado: true,
    operativa: fila.estado === "activa",
    registro_numero: fila.registro_numero,
    google_email: fila.google_email,
    estado: fila.estado,
    motivo: fila.motivo ?? null,
    sin_espacio: !!fila.sin_espacio,
    conectada_en: fila.conectada_en,
    conectada_por: fila.conectada_por ?? null,
    cuota: { usada: fila.cuota_usada ?? null, total: fila.cuota_total ?? null, ...estadoCuota({ usada: fila.cuota_usada, total: fila.cuota_total }) },
  };
}

export const esAdmin = (perfil) => perfil?.is_admin === true;

export function registroDelUsuario(perfil) {
  const v = perfil?.registro_numero;
  if (v === undefined || v === null) return null;
  return String(v).trim() || null;
}
