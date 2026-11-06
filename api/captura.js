// Captura de documentos desde el celular. Una sola función con `accion` (Vercel Hobby tiene tope de funciones).
// Spec y plan: specs/captura-documentos-celular/.
//
// Quién llama a qué:
//   Compu (usuario logueado, Authorization: Bearer <token>):  crear · estado · entregar · cancelar
//   Celular (solo el código del QR, sin login):               info · subir · quitar · leer · confirmar
//   Cron / Worker (token de servidor):                        purgar
//
// La tabla `capturas` no tiene políticas RLS: solo esta función la toca, con la service key.
import { tokenDeRequest, usuarioDeToken } from "./_auth.js";
import { extraerDocumento } from "./vision.js";
import { BUCKET, clienteServicio, destruirCaptura, purgarVencidas } from "./_capturaPurga.js";
import {
  MODOS, MAX_FOTOS, MAX_BYTES_FOTO, EXTENSIONES, generarCodigo, hashCodigo, calcularVencimientos,
  renovarExpiracion, codigoVigente, armarEtiqueta, esperadasPara, fusionarVehiculosPorGrupo,
  armarResultadoLibre, armarResultadoParte, rutaFoto,
} from "./_captura.js";

const MAX_LECTURAS = 5;
const CONCURRENCIA_LECTURA = 4;

class ErrorHttp extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status; }
}

// ── Utilidades ───────────────────────────────────────────────────────────────

async function capturaPorCodigo(sb, codigo) {
  if (!codigo || typeof codigo !== "string" || codigo.length < 20) throw new ErrorHttp(404, "Código inválido");
  const { data } = await sb.from("capturas").select("*").eq("codigo_hash", hashCodigo(codigo)).maybeSingle();
  if (!data) throw new ErrorHttp(404, "Código inválido");
  if (!codigoVigente(data)) {
    const motivo = data.estado === "cancelada" ? "Esta captura se canceló desde la compu."
      : data.estado === "entregada" ? "Esta captura ya se completó."
      : "El código venció. Generá uno nuevo desde la compu.";
    throw new ErrorHttp(410, motivo);
  }
  return data;
}

async function capturaDelUsuario(sb, id, usuario) {
  const { data } = await sb.from("capturas").select("*").eq("id", id).eq("usuario_id", usuario.id).maybeSingle();
  if (!data) throw new ErrorHttp(404, "No encontré esa captura");
  return data;
}

async function tocar(sb, captura, cambios = {}) {
  const { error } = await sb.from("capturas")
    .update({ expira_en: renovarExpiracion(captura), ...cambios }).eq("id", captura.id);
  if (error) throw new Error(error.message);
}

async function enLotes(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

async function descargarComoImagen(sb, foto) {
  const { data, error } = await sb.storage.from(BUCKET).download(foto.path);
  if (error || !data) throw new Error("No pude recuperar una de las fotos");
  return { data: Buffer.from(await data.arrayBuffer()).toString("base64"), mediaType: foto.tipo };
}

// ── Acciones de la compu ─────────────────────────────────────────────────────

async function crear(sb, usuario, body, req) {
  const modo = body.modo;
  if (!MODOS.includes(modo)) throw new ErrorHttp(400, "Modo inválido");
  await purgarVencidas(sb, 20).catch(() => {}); // purga oportunista
  const { data: perfil } = await sb.from("usuarios").select("registro_numero").eq("id", usuario.id).maybeSingle();
  const codigo = generarCodigo();
  const etiqueta = armarEtiqueta(modo, body.contexto || {});
  const venc = calcularVencimientos();
  const { data, error } = await sb.from("capturas").insert({
    codigo_hash: hashCodigo(codigo), usuario_id: usuario.id, registro_numero: perfil?.registro_numero ?? null,
    modo, etiqueta, esperadas: esperadasPara(modo), ...venc,
  }).select("id, expira_en").single();
  if (error) throw new Error(error.message);
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const base = host && !/^localhost|^127\./.test(host) ? `https://${host}` : "https://notarial.lat";
  return { id: data.id, url: `${base}/c/${codigo}`, etiqueta, modo, expira_en: data.expira_en };
}

async function estado(sb, usuario, body) {
  const c = await capturaDelUsuario(sb, body.id, usuario);
  return {
    estado: c.estado, fotos: (c.fotos || []).length, etiqueta: c.etiqueta, modo: c.modo, expira_en: c.expira_en,
    // Los datos recién salen cuando el celular confirmó la lectura
    resultado: c.estado === "confirmada" ? c.resultado : null,
  };
}

async function entregar(sb, usuario, body) {
  const c = await capturaDelUsuario(sb, body.id, usuario);
  if (c.estado !== "confirmada") throw new ErrorHttp(409, "La captura todavía no está confirmada");
  await destruirCaptura(sb, c, "entregada");
  await sb.from("capturas").update({ entregada_en: new Date().toISOString() }).eq("id", c.id);
  return { ok: true };
}

async function cancelar(sb, usuario, body) {
  const c = await capturaDelUsuario(sb, body.id, usuario);
  await destruirCaptura(sb, c, "cancelada");
  return { ok: true };
}

// ── Acciones del celular ─────────────────────────────────────────────────────

function vistaParaCelular(c) {
  return {
    modo: c.modo, etiqueta: c.etiqueta, esperadas: c.esperadas, estado: c.estado,
    fotos: (c.fotos || []).map((f) => ({ id: f.id, grupo: f.grupo ?? 0 })),
    expira_en: c.expira_en,
    resultado: ["leida", "confirmada"].includes(c.estado) ? c.resultado : null,
  };
}

async function info(sb, body) {
  return vistaParaCelular(await capturaPorCodigo(sb, body.c));
}

async function subir(sb, body) {
  const c = await capturaPorCodigo(sb, body.c);
  if (c.estado === "confirmada") throw new ErrorHttp(409, "Esta captura ya se confirmó");
  const ext = EXTENSIONES[body.mediaType];
  if (!ext) throw new ErrorHttp(400, "Tipo de archivo no admitido (usá foto o PDF)");
  if (typeof body.data !== "string" || !body.data) throw new ErrorHttp(400, "Falta la foto");
  const bytes = Buffer.from(body.data, "base64");
  if (bytes.length === 0) throw new ErrorHttp(400, "La foto llegó vacía");
  if (bytes.length > MAX_BYTES_FOTO) throw new ErrorHttp(413, "La foto pesa demasiado (máximo 3 MB)");
  if ((c.fotos || []).length >= MAX_FOTOS) throw new ErrorHttp(409, `Máximo ${MAX_FOTOS} fotos por lote`);

  const fotoId = generarCodigo().slice(0, 16);
  const path = rutaFoto(c.id, fotoId, ext);
  const { error: errSubida } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: body.mediaType, upsert: false });
  if (errSubida) throw new Error(`No pude guardar la foto: ${errSubida.message}`);

  const grupo = Number.isInteger(body.grupo) && body.grupo >= 0 && body.grupo < 50 ? body.grupo : 0;
  const foto = { id: fotoId, path, grupo, tipo: body.mediaType, orden: (c.fotos || []).length };
  const { data: nuevas, error } = await sb.rpc("captura_agregar_foto", { p_id: c.id, p_foto: foto, p_max: MAX_FOTOS });
  if (error || !nuevas) {
    await sb.storage.from(BUCKET).remove([path]); // no dejar huérfana
    throw new ErrorHttp(409, `Máximo ${MAX_FOTOS} fotos por lote`);
  }
  // Una foto nueva invalida la lectura anterior
  await tocar(sb, c, { estado: "abierta", resultado: null });
  return { id: fotoId, fotos: nuevas.length };
}

async function quitar(sb, body) {
  const c = await capturaPorCodigo(sb, body.c);
  if (c.estado === "confirmada") throw new ErrorHttp(409, "Esta captura ya se confirmó");
  const foto = (c.fotos || []).find((f) => f.id === body.fotoId);
  if (!foto) return { fotos: (c.fotos || []).length };
  await sb.storage.from(BUCKET).remove([foto.path]);
  const { data: nuevas } = await sb.rpc("captura_quitar_foto", { p_id: c.id, p_foto_id: foto.id });
  await tocar(sb, c, { estado: "abierta", resultado: null });
  return { fotos: (nuevas || []).length };
}

async function leer(sb, body) {
  const c = await capturaPorCodigo(sb, body.c);
  if (c.estado === "confirmada") throw new ErrorHttp(409, "Esta captura ya se confirmó");
  const fotos = c.fotos || [];
  if (!fotos.length) throw new ErrorHttp(400, "Todavía no subiste ninguna foto");
  if ((c.lecturas || 0) >= MAX_LECTURAS) throw new ErrorHttp(429, "Ya se leyó este lote varias veces. Generá un código nuevo desde la compu.");
  await sb.from("capturas").update({ lecturas: (c.lecturas || 0) + 1 }).eq("id", c.id);

  let resultado;
  try {
    if (c.modo === "parte") {
      const imagenes = await Promise.all(fotos.map((f) => descargarComoImagen(sb, f)));
      resultado = armarResultadoParte(await extraerDocumento(imagenes), fotos.length);
    } else {
      const lecturas = await enLotes(fotos, CONCURRENCIA_LECTURA, async (f) => ({
        res: await extraerDocumento([await descargarComoImagen(sb, f)]), foto: f.orden ?? 0, grupo: f.grupo ?? 0,
      }));
      resultado = c.modo === "vehiculos"
        ? { vehiculos: fusionarVehiculosPorGrupo(lecturas), fotos: fotos.length, resumen: `${new Set(fotos.map((f) => f.grupo ?? 0)).size} grupo(s) de fotos` }
        : armarResultadoLibre(lecturas);
    }
  } catch (e) {
    console.error("captura leer:", e);
    throw new ErrorHttp(502, "No pude leer las fotos. Probá de nuevo en un momento.");
  }
  await tocar(sb, c, { estado: "leida", resultado });
  return { resultado };
}

async function confirmar(sb, body) {
  const c = await capturaPorCodigo(sb, body.c);
  if (c.estado !== "leida" || !c.resultado) throw new ErrorHttp(409, "Primero hay que leer las fotos");
  let resultado = c.resultado;
  if (c.modo === "parte" && resultado.hay_varias) {
    const i = body.eleccion;
    if (!Number.isInteger(i) || i < 0 || i >= resultado.personas.length) throw new ErrorHttp(400, "Elegí cuál es la persona de esta parte");
    resultado = { ...resultado, personas: [resultado.personas[i]], sobrantes: resultado.personas.filter((_, k) => k !== i), hay_varias: false };
  }
  await tocar(sb, c, { estado: "confirmada", confirmada_en: new Date().toISOString(), resultado });
  return { ok: true };
}

// ── Handler ──────────────────────────────────────────────────────────────────

const DE_USUARIO = { crear, estado, entregar, cancelar };
const DE_CELULAR = { info, subir, quitar, leer, confirmar };

function tokenDeServidor(req) {
  const auth = req.headers.authorization || "";
  return [process.env.CRON_SECRET, process.env.BACKUP_TRIGGER_TOKEN, process.env.CAPTURA_PURGA_TOKEN]
    .filter(Boolean).some((s) => auth === `Bearer ${s}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = req.body || {};
  const accion = body.accion;
  try {
    const sb = clienteServicio();
    if (accion === "purgar") {
      if (!tokenDeServidor(req)) return res.status(401).json({ error: "No autorizado" });
      return res.status(200).json({ purgadas: await purgarVencidas(sb, 100) });
    }
    if (DE_USUARIO[accion]) {
      const usuario = await usuarioDeToken(tokenDeRequest(req));
      if (!usuario) return res.status(401).json({ error: "No autenticado" });
      return res.status(200).json(await DE_USUARIO[accion](sb, usuario, body, req));
    }
    if (DE_CELULAR[accion]) return res.status(200).json(await DE_CELULAR[accion](sb, body));
    return res.status(400).json({ error: "Acción desconocida" });
  } catch (e) {
    if (e instanceof ErrorHttp) return res.status(e.status).json({ error: e.message });
    console.error("captura error:", e);
    return res.status(500).json({ error: "Error del servidor" });
  }
}
