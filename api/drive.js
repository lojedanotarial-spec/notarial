// Drive de la escribanía. Una sola función con `accion` (Vercel Hobby tiene tope de funciones).
// Spec y plan: specs/drive-escribania/.
//
// Quién llama a qué:
//   Usuario logueado (Authorization: Bearer):   estado · iniciar_subida · confirmar_subida · ver · descargar · borrar
//   Administrador (Bearer + usuarios.is_admin): admin_estado · admin_enlace · admin_desconectar
//   Quien recibe el enlace (solo el código):    enlace_info · enlace_iniciar
//   Google (GET /api/drive-callback, ruta en vercel.json): callback
//
// El token de Google vive cifrado en `drive_conexiones`, que no tiene políticas RLS: solo esta función la toca, con la
// service key. El registro del usuario se deduce SIEMPRE en el servidor; el cliente nunca lo elige.
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { tokenDeRequest, usuarioDeToken } from "./_auth.js";
import { clienteServicio } from "./_capturaPurga.js";
import { crearGoogle, emailDeIdToken } from "./_driveGoogle.js";
import {
  MAX_BYTES_ARCHIVO, STATE_VENCE_MS, generarCodigo, hashCodigo, calcularVencimientoEnlace, motivoEnlaceInvalido,
  cifrar, descifrar, firmarState, verificarState, validarArchivo, nombreCarpetaExpediente, esPrevisualizable,
  clasificarErrorGoogle, mensajeParaUsuario, armarAuditoria, armarUrlAutorizacion, urlDeRetorno, resumenConexion,
  esAdmin, registroDelUsuario, nombreParaRenombrar, tipoValido,
} from "./_drive.js";
import {
  calcularVencimientoSesion, motivoSesionInvalida, urlSesion, puedeQuitar, resumenSesionParaCelular, vencimientoLimpieza,
} from "./_driveCelular.js";
import { validarMiniatura, normalizarIdentificacion, armarNombreArchivo, extensionDe, evitarDuplicado } from "./_driveIdentificar.js";
import { crearIA } from "./_driveIA.js";

export const BASE = "https://notarial.lat";
export const REDIRECT_URI = `${BASE}/api/drive-callback`;
const NOMBRE_RAIZ = "Notarial";

class ErrorHttp extends Error {
  constructor(status, mensaje, codigo) { super(mensaje); this.status = status; this.codigo = codigo; }
}

const HTTP_POR_TIPO = { rota: 503, configuracion: 503, sin_espacio: 507, limite: 429, no_encontrado: 404, otro: 502 };

// ── Base de datos y Google: utilidades ───────────────────────────────────────

async function perfilDe(d, usuario) {
  const { data } = await d.sb.from("usuarios").select("registro_numero,is_admin,email,registros_id").eq("id", usuario.id).maybeSingle();
  if (!data) throw new ErrorHttp(403, "Tu usuario no tiene un registro asignado.");
  let nombre = null;
  if (data.registros_id) {
    const { data: r } = await d.sb.from("registros").select("nombre,apellido").eq("id", data.registros_id).maybeSingle();
    nombre = [r?.nombre, r?.apellido].filter(Boolean).join(" ") || null;
  }
  return { id: usuario.id, registro: registroDelUsuario(data), admin: esAdmin(data), nombre: nombre || data.email || usuario.email || null };
}

function exigirAdmin(perfil) {
  if (!perfil.admin) throw new ErrorHttp(403, "Solo el administrador de Notarial puede hacer esto.");
}

async function auditar(d, datos) {
  const { error } = await d.sb.from("drive_auditoria").insert(armarAuditoria(datos));
  if (error) throw new Error(`auditoria: ${error.message}`);
}

async function conexionDe(d, registro) {
  const { data } = await d.sb.from("drive_conexiones").select("*").eq("registro_numero", registro).maybeSingle();
  return data || null;
}

// Convierte un error de Google (o de nuestro cifrado) en la respuesta que ve el usuario, y deja el estado al día.
async function fallaGoogle(d, registro, e) {
  if (e instanceof ErrorHttp) return e;
  const config = e?.message === "token_invalido" || e?.message === "clave_invalida";
  const c = config ? { tipo: "configuracion" } : clasificarErrorGoogle(e);
  if (c.tipo === "rota") {
    await d.sb.from("drive_conexiones").update({ estado: "rota", motivo: c.motivo, actualizada_en: new Date(d.ahora()).toISOString() }).eq("registro_numero", registro);
    await auditar(d, { registro, accion: "conexion_rota", detalle: { motivo: c.motivo } }).catch(() => {});
  } else if (c.tipo === "sin_espacio") {
    await d.sb.from("drive_conexiones").update({ sin_espacio: true }).eq("registro_numero", registro);
  } else if (c.tipo === "otro") {
    console.error("drive: error inesperado", e?.name, e?.status, e?.error, e?.reason, config ? "" : e?.message);
  }
  return new ErrorHttp(HTTP_POR_TIPO[c.tipo] || 502, mensajeParaUsuario(c.tipo), c.tipo);
}

// Token de acceso del Drive de un registro (renovado con el refresh token guardado).
async function accesoDe(d, registro) {
  const conexion = await conexionDe(d, registro);
  if (!conexion) throw new ErrorHttp(409, mensajeParaUsuario("no_conectado"), "no_conectado");
  if (conexion.estado !== "activa") throw new ErrorHttp(503, mensajeParaUsuario("rota"), "rota");
  try {
    const access = await d.google.renovar(descifrar(conexion.refresh_token_cifrado, d.clave));
    return { access, conexion };
  } catch (e) {
    throw await fallaGoogle(d, registro, e);
  }
}

async function expedienteAutorizado(d, perfil, expedienteId) {
  const { data: exp } = await d.sb.from("expedientes").select("id,nombre,registro_id,drive_carpeta_escribania_id").eq("id", String(expedienteId || "")).maybeSingle();
  const registro = String(exp?.registro_id ?? "").trim();
  if (!exp || (!perfil.admin && registro !== perfil.registro)) throw new ErrorHttp(404, "No encontré ese expediente.");
  if (!registro) throw new ErrorHttp(409, mensajeParaUsuario("no_conectado"), "no_conectado");
  return { exp, registro };
}

async function archivoAutorizado(d, perfil, archivoId) {
  const { data: arch } = await d.sb.from("expediente_archivos").select("*").eq("id", String(archivoId || "")).maybeSingle();
  if (!arch || arch.almacen !== "escribania" || arch.borrado_en) throw new ErrorHttp(404, "No encontré ese archivo.");
  const { exp, registro } = await expedienteAutorizado(d, perfil, arch.expediente_id);
  return { arch, exp, registro };
}

const archivoPublico = (a) => ({
  id: a.id, expediente_id: a.expediente_id, nombre: a.nombre, tipo: a.tipo, mime_type: a.mime_type,
  tamano: a.tamano, created_at: a.created_at, subido_por_nombre: a.subido_por_nombre,
  origen: a.origen ?? "compu", identificacion: a.identificacion ?? null,
});

// ── Acciones del usuario ─────────────────────────────────────────────────────

// Estado del Drive del registro del usuario. Con `expediente_id`, el del registro de ESE expediente (el administrador
// puede mirar expedientes de otros registros y tiene que ver el Drive que corresponde).
async function estado(d, perfil, body = {}) {
  const registro = body.expediente_id ? (await expedienteAutorizado(d, perfil, body.expediente_id)).registro : perfil.registro;
  const c = registro ? await conexionDe(d, registro) : null;
  return {
    conectado: !!c, operativa: c?.estado === "activa", estado: c ? c.estado : "no_conectado", sin_espacio: !!c?.sin_espacio,
    identificar_compu: !!d.config?.identificarCompu, // la pantalla ofrece "Automático" solo si el servidor lo tiene prendido
  };
}

async function asegurarRaiz(d, access, conexion) {
  if (conexion.carpeta_raiz_id) return conexion.carpeta_raiz_id;
  const id = (await d.google.buscarCarpeta(access, NOMBRE_RAIZ, null)) || (await d.google.crearCarpeta(access, NOMBRE_RAIZ, null));
  await d.sb.from("drive_conexiones").update({ carpeta_raiz_id: id }).eq("registro_numero", conexion.registro_numero);
  conexion.carpeta_raiz_id = id;
  return id;
}

// Carpeta del expediente dentro de "Notarial". Si dos personas suben el primer archivo a la vez, gana una y la otra
// manda su carpeta sobrante a la papelera.
async function asegurarCarpetaExpediente(d, access, exp, raizId) {
  if (exp.drive_carpeta_escribania_id) return exp.drive_carpeta_escribania_id;
  const id = await d.google.crearCarpeta(access, nombreCarpetaExpediente(exp), raizId);
  const { data: ganada } = await d.sb.from("expedientes").update({ drive_carpeta_escribania_id: id })
    .eq("id", exp.id).is("drive_carpeta_escribania_id", null).select("drive_carpeta_escribania_id");
  if (ganada?.length) { exp.drive_carpeta_escribania_id = id; return id; }
  await d.google.papelera(access, id).catch(() => {});
  const { data: ahora } = await d.sb.from("expedientes").select("drive_carpeta_escribania_id").eq("id", exp.id).maybeSingle();
  exp.drive_carpeta_escribania_id = ahora?.drive_carpeta_escribania_id;
  return exp.drive_carpeta_escribania_id;
}

async function iniciarSubida(d, perfil, body) {
  const v = validarArchivo({ nombre: body.nombre, mime: body.mime, tamano: body.tamano, tipo: body.tipo });
  if (!v.ok) throw new ErrorHttp(v.codigo === "muy_grande" ? 413 : 400, v.mensaje, v.codigo);
  return prepararSubida(d, await expedienteAutorizado(d, perfil, body.expediente_id), v);
}

// Núcleo de "empezar a subir", compartido por la compu (usuario con sesión) y el celular (código de sesión): quien
// llama ya resolvió y autorizó el expediente y su registro, y validó el archivo.
async function prepararSubida(d, { exp, registro }, v) {
  const { access, conexion } = await accesoDe(d, registro);
  for (let intento = 0; ; intento++) {
    try {
      const raizId = await asegurarRaiz(d, access, conexion);
      const carpetaId = await asegurarCarpetaExpediente(d, access, exp, raizId);
      const sesionUrl = await d.google.abrirSesionSubida(access, { nombre: v.nombre, mime: v.mime, tamano: v.tamano, carpetaId, origen: BASE });
      return { sesion_url: sesionUrl, nombre: v.nombre, tipo: v.tipo, mime: v.mime };
    } catch (e) {
      // Si alguien borró a mano la carpeta en Drive, el id guardado ya no sirve: se olvida y se reintenta una vez.
      if (intento === 0 && e?.status === 404 && (conexion.carpeta_raiz_id || exp.drive_carpeta_escribania_id)) {
        await d.sb.from("drive_conexiones").update({ carpeta_raiz_id: null }).eq("registro_numero", registro);
        await d.sb.from("expedientes").update({ drive_carpeta_escribania_id: null }).eq("id", exp.id);
        conexion.carpeta_raiz_id = null;
        exp.drive_carpeta_escribania_id = null;
        continue;
      }
      throw await fallaGoogle(d, registro, e);
    }
  }
}

async function confirmarSubida(d, perfil, body) {
  const ctx = await expedienteAutorizado(d, perfil, body.expediente_id);
  return registrarSubida(d, ctx, { fileId: String(body.drive_file_id || ""), tipo: body.tipo, quien: { id: perfil.id, nombre: perfil.nombre }, identificar: body.identificar === true });
}

// Núcleo de "confirmar lo subido", compartido por la compu y el celular. `quien` = a quién se le atribuye (en el celular,
// el usuario que generó el QR). El servidor le pregunta a Google por el archivo y no confía en lo que diga el navegador.
async function registrarSubida(d, { exp, registro }, { fileId, tipo, quien, origen = "compu", sesionId = null, identificar = false }) {
  const { access } = await accesoDe(d, registro);
  if (!fileId) throw new ErrorHttp(400, "Falta el archivo.");
  let meta;
  try { meta = await d.google.metadatos(access, fileId); } catch (e) {
    // Un archivo de otro Drive no es visible con el token de este registro: llega como 404.
    if (e?.status === 404) throw new ErrorHttp(404, "No encontré el archivo subido.");
    throw await fallaGoogle(d, registro, e);
  }
  if (!exp.drive_carpeta_escribania_id || !meta.parents?.includes(exp.drive_carpeta_escribania_id) || meta.trashed) {
    throw new ErrorHttp(400, "El archivo no está en la carpeta de este expediente.");
  }
  const tamano = Number(meta.size);
  if (!(tamano > 0) || tamano > MAX_BYTES_ARCHIVO) {
    await d.google.papelera(access, fileId).catch(() => {});
    throw new ErrorHttp(413, "El archivo supera el máximo de 25 MB.", "muy_grande");
  }
  const v = validarArchivo({ nombre: meta.name, mime: meta.mimeType, tamano, tipo });
  const fila = {
    expediente_id: exp.id, drive_file_id: fileId, nombre: v.nombre, tipo: v.tipo, mime_type: v.mime, tamano: v.tamano,
    almacen: "escribania", subido_por: quien.id, subido_por_nombre: quien.nombre,
    origen, sesion_id: sesionId, nombre_original: v.nombre,
    // Identificación automática (después de guardar, nunca antes): desde el celular siempre que esté prendida; desde la compu
    // solo si la persona eligió "Automático" y está prendida. Solo las imágenes se identifican (un PDF cuesta varias veces más).
    identificacion: (origen === "celular" ? !!d.config?.identificar : !!d.config?.identificarCompu && identificar)
      ? (/^image\//.test(v.mime) ? "pendiente" : "sin_identificar") : null,
  };
  const { data: nueva, error } = await d.sb.from("expediente_archivos").insert(fila).select().single();
  let guardada = nueva;
  if (error) {
    if (error.code !== "23505") throw new Error(`insert archivo: ${error.message}`);
    // Ya estaba registrado (confirmación repetida): se devuelve el mismo, sin duplicar.
    const { data: previa } = await d.sb.from("expediente_archivos").select("*").eq("drive_file_id", fileId).eq("almacen", "escribania").maybeSingle();
    guardada = previa;
  } else {
    await auditar(d, { registro, usuarioId: quien.id, accion: "subir", expedienteId: exp.id, archivoId: nueva.id, detalle: { nombre: v.nombre, tamano: v.tamano, ...(origen === "celular" ? { via: "celular" } : {}) } });
  }
  // Mejor esfuerzo: dejar al día el espacio y limpiar la marca de "sin espacio" si volvió a funcionar.
  try {
    const c = await d.google.cuenta(access);
    await d.sb.from("drive_conexiones").update({ cuota_usada: c.usada, cuota_total: c.total, cuota_leida_en: new Date(d.ahora()).toISOString(), sin_espacio: false }).eq("registro_numero", registro);
  } catch { /* no es crítico */ }
  return { archivo: archivoPublico(guardada) };
}

const nombreAscii = (n) => String(n).replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");

async function entregar(d, perfil, body, res, descargar) {
  const { arch, exp, registro } = await archivoAutorizado(d, perfil, body.archivo_id);
  const { access } = await accesoDe(d, registro);
  let r;
  try { r = await d.google.descargar(access, arch.drive_file_id); } catch (e) { throw await fallaGoogle(d, registro, e); }
  await auditar(d, { registro, usuarioId: perfil.id, accion: descargar ? "descargar" : "ver", expedienteId: exp.id, archivoId: arch.id, detalle: { nombre: arch.nombre } });
  const enLinea = !descargar && esPrevisualizable(arch.mime_type);
  res.statusCode = 200;
  res.setHeader("Content-Type", arch.mime_type || "application/octet-stream");
  res.setHeader("Content-Disposition", `${enLinea ? "inline" : "attachment"}; filename="${nombreAscii(arch.nombre)}"; filename*=UTF-8''${encodeURIComponent(arch.nombre)}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Cache-Control", "private, no-store");
  const largo = r.headers?.get?.("content-length");
  if (largo) res.setHeader("Content-Length", largo);
  await pipeline(Readable.fromWeb(r.body), res);
  return null; // ya respondió
}

async function borrar(d, perfil, body) {
  const { arch, exp, registro } = await archivoAutorizado(d, perfil, body.archivo_id);
  const { access } = await accesoDe(d, registro);
  try { await d.google.papelera(access, arch.drive_file_id); } catch (e) {
    // Si ya no estaba en Drive, igual se saca de la lista.
    if (e?.status !== 404) throw await fallaGoogle(d, registro, e);
  }
  await d.sb.from("expediente_archivos").update({ borrado_en: new Date(d.ahora()).toISOString(), borrado_por: perfil.id }).eq("id", arch.id);
  await auditar(d, { registro, usuarioId: perfil.id, accion: "borrar", expedienteId: exp.id, archivoId: arch.id, detalle: { nombre: arch.nombre } });
  return { ok: true };
}

// ── Identificación y nombre automáticos (UC-4) ───────────────────────────────
// Se hace DESPUÉS de guardar, con una miniatura que arma el navegador. Nunca frena ni rompe una subida: ante cualquier falla el
// archivo queda "Sin identificar" con su nombre original. De lo que lee el modelo solo se guardan el nombre y el tipo.

async function marcarSinIdentificar(d, arch) {
  await d.sb.from("expediente_archivos").update({ identificacion: "sin_identificar" }).eq("id", arch.id);
  return { archivo: archivoPublico({ ...arch, identificacion: "sin_identificar" }), identificado: false };
}

async function identificarArchivo(d, { arch, exp, registro, miniatura, quien }) {
  // Un solo intento por archivo: el que logra pasar de "pendiente" a "procesando" es el único que llama al modelo.
  const { data: tomado } = await d.sb.from("expediente_archivos").update({ identificacion: "procesando" })
    .eq("id", arch.id).eq("identificacion", "pendiente").select("id");
  if (!tomado?.length) {
    const { data: actual } = await d.sb.from("expediente_archivos").select("*").eq("id", arch.id).maybeSingle();
    return { archivo: archivoPublico(actual || arch), identificado: false };
  }
  const m = validarMiniatura(miniatura);
  if (!m.ok) return marcarSinIdentificar(d, arch);
  let respuesta;
  try { respuesta = await d.ia.consultar(m.base64); } catch { return marcarSinIdentificar(d, arch); }
  const n = normalizarIdentificacion(respuesta.texto);
  if (!n.ok) return marcarSinIdentificar(d, arch);

  // Si mientras el modelo miraba la foto alguien la quitó, no se renombra nada (caso real del 09/11/26: una foto quitada se renombró igual).
  const { data: vigente } = await d.sb.from("expediente_archivos").select("borrado_en").eq("id", arch.id).maybeSingle();
  if (!vigente || vigente.borrado_en) return { archivo: archivoPublico({ ...arch, identificacion: "sin_identificar" }), identificado: false };

  const { data: otros } = await d.sb.from("expediente_archivos").select("id,nombre").eq("expediente_id", exp.id).eq("almacen", "escribania").is("borrado_en", null);
  const nombre = evitarDuplicado(armarNombreArchivo(n.ident, extensionDe(arch.nombre, arch.mime_type)), (otros || []).filter((o) => o.id !== arch.id).map((o) => o.nombre));
  try {
    const { access } = await accesoDe(d, registro);
    await d.google.renombrar(access, arch.drive_file_id, nombre);
  } catch { return marcarSinIdentificar(d, arch); }

  const cambios = { nombre, tipo: n.ident.tipo, identificacion: "ok", nombre_original: arch.nombre_original ?? arch.nombre };
  const { error } = await d.sb.from("expediente_archivos").update(cambios).eq("id", arch.id);
  if (error) throw new Error(`update archivo: ${error.message}`);
  await auditar(d, { registro, usuarioId: quien, accion: "identificar", expedienteId: exp.id, archivoId: arch.id,
    detalle: { de: arch.nombre, a: nombre, tipo: n.ident.tipo, modelo: d.ia.modelo ?? null, tokens_entrada: respuesta.entrada, tokens_salida: respuesta.salida } });
  return { archivo: archivoPublico({ ...arch, ...cambios }), identificado: true };
}

// Desde la compu (usuario con sesión): para lo que se subió con "Automático".
async function identificar(d, perfil, body) {
  const { arch, exp, registro } = await archivoAutorizado(d, perfil, body.archivo_id);
  return identificarArchivo(d, { arch, exp, registro, miniatura: body.miniatura, quien: perfil.id });
}

// ── Subir desde el celular: acciones de la compu ─────────────────────────────

async function celularCrear(d, perfil, body) {
  const { exp, registro } = await expedienteAutorizado(d, perfil, body.expediente_id);
  const c = await conexionDe(d, registro);
  if (!c) throw new ErrorHttp(409, mensajeParaUsuario("no_conectado"), "no_conectado");
  if (c.estado !== "activa") throw new ErrorHttp(503, mensajeParaUsuario("rota"), "rota");
  // Limpieza oportunista (los dos cupos de cron están usados): sesiones de más de 7 días.
  await d.sb.from("drive_sesiones_celular").delete().lt("creada_en", vencimientoLimpieza(d.ahora()));
  const codigo = generarCodigo();
  const expira_en = calcularVencimientoSesion(d.ahora());
  const { data: sesion, error } = await d.sb.from("drive_sesiones_celular").insert({
    codigo_hash: hashCodigo(codigo), expediente_id: exp.id, registro_numero: registro,
    usuario_id: perfil.id, usuario_nombre: perfil.nombre, creada_en: new Date(d.ahora()).toISOString(), expira_en,
  }).select("id").single();
  if (error) throw new Error(`insert sesion: ${error.message}`);
  await auditar(d, { registro, usuarioId: perfil.id, accion: "celular_abrir", expedienteId: exp.id, detalle: { sesion: sesion.id } });
  return { url: urlSesion(BASE, codigo), expira_en, sesion_id: sesion.id };
}

async function celularCerrar(d, perfil, body) {
  const { data: s } = await d.sb.from("drive_sesiones_celular").select("*").eq("id", String(body.sesion_id || "")).maybeSingle();
  if (!s || (!perfil.admin && s.registro_numero !== perfil.registro)) throw new ErrorHttp(404, "No encontré esa sesión.");
  if (!s.cerrada_en) {
    await d.sb.from("drive_sesiones_celular").update({ cerrada_en: new Date(d.ahora()).toISOString() }).eq("id", s.id);
    await auditar(d, { registro: s.registro_numero, usuarioId: perfil.id, accion: "celular_cerrar", expedienteId: s.expediente_id, detalle: { sesion: s.id } });
  }
  return { ok: true };
}

// Corregir a mano el nombre y/o el tipo de un archivo (cualquier usuario del registro). Cambia el nombre también en Drive.
async function renombrar(d, perfil, body) {
  const { arch, exp, registro } = await archivoAutorizado(d, perfil, body.archivo_id);
  const nombre = nombreParaRenombrar(body.nombre, arch.nombre);
  if (!nombre) throw new ErrorHttp(400, "Escribí un nombre para el archivo.");
  const tipo = body.tipo === undefined ? arch.tipo : tipoValido(body.tipo);
  if (!tipo) throw new ErrorHttp(400, "El tipo de documento no es válido.");
  if (nombre === arch.nombre && tipo === arch.tipo) return { archivo: archivoPublico(arch) };
  const { access } = await accesoDe(d, registro);
  if (nombre !== arch.nombre) {
    try { await d.google.renombrar(access, arch.drive_file_id, nombre); } catch (e) { throw await fallaGoogle(d, registro, e); }
  }
  const cambios = { nombre, tipo, identificacion: "manual", nombre_original: arch.nombre_original ?? arch.nombre };
  const { error } = await d.sb.from("expediente_archivos").update(cambios).eq("id", arch.id);
  if (error) throw new Error(`update archivo: ${error.message}`);
  await auditar(d, { registro, usuarioId: perfil.id, accion: "renombrar", expedienteId: exp.id, archivoId: arch.id, detalle: { de: arch.nombre, a: nombre, tipo } });
  return { archivo: archivoPublico({ ...arch, ...cambios }) };
}

// ── Subir desde el celular: acciones del celular (solo el código del QR, sin login) ──
// Con el código solo se puede agregar archivos a ESE expediente, quitar lo subido en ESA sesión y ver los nombres de
// lo subido en esa sesión. Nada más: no se lista, ve ni baja nada del expediente ni del Drive.

const MENSAJES_SESION = {
  inexistente: "Este código no es válido. Pedí un QR nuevo desde la compu.",
  vencida: "El QR venció. Generá uno nuevo desde la compu.",
  cerrada: "Esta sesión se cerró desde la compu. Generá un QR nuevo si querés seguir.",
};

async function buscarSesion(d, codigo) {
  if (typeof codigo !== "string" || codigo.length < 20) return null;
  const { data } = await d.sb.from("drive_sesiones_celular").select("*").eq("codigo_hash", hashCodigo(codigo)).maybeSingle();
  return data || null;
}

async function exigirSesion(d, codigo, opciones) {
  const sesion = await buscarSesion(d, codigo);
  const motivo = motivoSesionInvalida(sesion, d.ahora(), opciones);
  if (motivo) throw new ErrorHttp(motivo === "inexistente" ? 404 : 410, MENSAJES_SESION[motivo], motivo);
  return sesion;
}

async function expedienteDeSesion(d, sesion) {
  const { data: exp } = await d.sb.from("expedientes").select("id,nombre,registro_id,drive_carpeta_escribania_id").eq("id", sesion.expediente_id).maybeSingle();
  const registro = String(exp?.registro_id ?? "").trim();
  if (!exp || registro !== sesion.registro_numero) throw new ErrorHttp(404, MENSAJES_SESION.inexistente, "inexistente");
  return { exp, registro };
}

async function celularInfo(d, _perfil, body) {
  const sesion = await buscarSesion(d, body.codigo);
  if (!sesion) return resumenSesionParaCelular(null, null, [], d.ahora());
  const { data: exp } = await d.sb.from("expedientes").select("nombre").eq("id", sesion.expediente_id).maybeSingle();
  const { data: archivos } = await d.sb.from("expediente_archivos").select("*").eq("sesion_id", sesion.id).eq("almacen", "escribania").is("borrado_en", null);
  const c = await conexionDe(d, sesion.registro_numero);
  // `ahora` = la hora del servidor: el celular calcula la cuenta regresiva con ella, así un reloj mal puesto no lo confunde.
  return { ...resumenSesionParaCelular(sesion, exp, archivos || [], d.ahora()), drive_disponible: c?.estado === "activa", ahora: new Date(d.ahora()).toISOString(), identificar: !!d.config?.identificar };
}

async function celularIniciarSubida(d, _perfil, body) {
  const sesion = await exigirSesion(d, body.codigo);
  const v = validarArchivo({ nombre: body.nombre, mime: body.mime, tamano: body.tamano, tipo: "otro" });
  if (!v.ok) throw new ErrorHttp(v.codigo === "muy_grande" ? 413 : 400, v.mensaje, v.codigo);
  const r = await prepararSubida(d, await expedienteDeSesion(d, sesion), v);
  return { sesion_url: r.sesion_url, nombre: r.nombre, mime: r.mime };
}

async function celularConfirmar(d, _perfil, body) {
  // Con gracia: una subida ya empezada se puede confirmar hasta 5 min después de vencida, pero no si se cerró.
  const sesion = await exigirSesion(d, body.codigo, { paraConfirmar: true });
  return registrarSubida(d, await expedienteDeSesion(d, sesion), {
    fileId: String(body.drive_file_id || ""), tipo: "otro", quien: { id: sesion.usuario_id, nombre: sesion.usuario_nombre }, origen: "celular", sesionId: sesion.id,
  });
}

// Identifica un archivo subido en ESTA sesión (nunca uno ajeno).
async function celularIdentificar(d, _perfil, body) {
  const sesion = await exigirSesion(d, body.codigo, { paraConfirmar: true });
  const { exp, registro } = await expedienteDeSesion(d, sesion);
  const { data: arch } = await d.sb.from("expediente_archivos").select("*").eq("id", String(body.archivo_id || "")).maybeSingle();
  if (!puedeQuitar(arch, sesion)) throw new ErrorHttp(404, "No encontré esa foto.");
  return identificarArchivo(d, { arch, exp, registro, miniatura: body.miniatura, quien: sesion.usuario_id });
}

async function celularQuitar(d, _perfil, body) {
  const sesion = await exigirSesion(d, body.codigo);
  const { exp, registro } = await expedienteDeSesion(d, sesion);
  const { data: arch } = await d.sb.from("expediente_archivos").select("*").eq("id", String(body.archivo_id || "")).maybeSingle();
  if (!puedeQuitar(arch, sesion)) throw new ErrorHttp(404, "No encontré esa foto.");
  const { access } = await accesoDe(d, registro);
  try { await d.google.papelera(access, arch.drive_file_id); } catch (e) {
    if (e?.status !== 404) throw await fallaGoogle(d, registro, e);
  }
  await d.sb.from("expediente_archivos").update({ borrado_en: new Date(d.ahora()).toISOString(), borrado_por: sesion.usuario_id }).eq("id", arch.id);
  await auditar(d, { registro, usuarioId: sesion.usuario_id, accion: "borrar", expedienteId: exp.id, archivoId: arch.id, detalle: { nombre: arch.nombre, via: "celular" } });
  return { ok: true };
}

// ── Acciones del administrador ───────────────────────────────────────────────

async function refrescarCuota(d, c) {
  try {
    const access = await d.google.renovar(descifrar(c.refresh_token_cifrado, d.clave));
    const cuenta = await d.google.cuenta(access);
    const cambios = { cuota_usada: cuenta.usada, cuota_total: cuenta.total, cuota_leida_en: new Date(d.ahora()).toISOString() };
    await d.sb.from("drive_conexiones").update(cambios).eq("registro_numero", c.registro_numero);
    return { ...c, ...cambios };
  } catch (e) {
    const err = await fallaGoogle(d, c.registro_numero, e);
    return err.codigo === "rota" ? { ...c, estado: "rota", motivo: "revocada" } : c;
  }
}

async function adminEstado(d, perfil) {
  exigirAdmin(perfil);
  const { data: usuarios } = await d.sb.from("usuarios").select("registro_numero");
  const { data: conexiones } = await d.sb.from("drive_conexiones").select("*");
  const porRegistro = new Map();
  for (const u of usuarios || []) {
    const r = registroDelUsuario(u);
    if (r) porRegistro.set(r, (porRegistro.get(r) || 0) + 1);
  }
  const actualizadas = new Map();
  await Promise.all((conexiones || []).map(async (c) => {
    actualizadas.set(c.registro_numero, c.estado === "activa" ? await refrescarCuota(d, c) : c);
  }));
  const numeros = new Set([...porRegistro.keys(), ...actualizadas.keys()]);
  const registros = [...numeros].sort((a, b) => a.localeCompare(b, "es", { numeric: true })).map((n) => ({
    ...resumenConexion(actualizadas.get(n) || null), registro_numero: n, usuarios: porRegistro.get(n) || 0,
  }));
  return { registros };
}

async function adminEnlace(d, perfil, body) {
  exigirAdmin(perfil);
  const registro = String(body.registro_numero ?? "").trim();
  if (!registro) throw new ErrorHttp(400, "Falta el registro.");
  const { data: usuarios } = await d.sb.from("usuarios").select("id").eq("registro_numero", registro).limit(1);
  if (!usuarios?.length) throw new ErrorHttp(404, "No hay usuarios en ese registro.");
  const c = await conexionDe(d, registro);
  if (c && c.estado === "activa") throw new ErrorHttp(409, "Ese registro ya tiene un Drive conectado. Desconectalo primero si querés cambiar de cuenta.");
  // Un solo enlace sin usar por registro: el nuevo invalida al anterior. Y se limpian los muy viejos.
  await d.sb.from("drive_enlaces").delete().eq("registro_numero", registro).is("usado_en", null);
  await d.sb.from("drive_enlaces").delete().lt("expira_en", new Date(d.ahora() - 7 * 24 * 3600 * 1000).toISOString());
  const codigo = generarCodigo();
  const expira_en = calcularVencimientoEnlace(d.ahora());
  const { error } = await d.sb.from("drive_enlaces").insert({ codigo_hash: hashCodigo(codigo), registro_numero: registro, creado_por: perfil.id, expira_en });
  if (error) throw new Error(`insert enlace: ${error.message}`);
  return { url: `${BASE}/drive/${codigo}`, expira_en, registro_numero: registro };
}

async function adminDesconectar(d, perfil, body) {
  exigirAdmin(perfil);
  const registro = String(body.registro_numero ?? "").trim();
  const c = registro ? await conexionDe(d, registro) : null;
  if (!c) throw new ErrorHttp(404, "Ese registro no tiene un Drive conectado.");
  try { await d.google.revocar(descifrar(c.refresh_token_cifrado, d.clave)); } catch { /* sigue: igual se corta la conexión de nuestro lado */ }
  const { error } = await d.sb.from("drive_conexiones").delete().eq("registro_numero", registro);
  if (error) throw new Error(`delete conexion: ${error.message}`);
  await auditar(d, { registro, usuarioId: perfil.id, accion: "desconectar", detalle: { cuenta: c.google_email } });
  return { ok: true };
}

// ── Quien recibe el enlace (sin login) ───────────────────────────────────────

async function enlacePorCodigo(d, codigo) {
  if (!codigo || typeof codigo !== "string" || codigo.length < 20) return null;
  const { data } = await d.sb.from("drive_enlaces").select("*").eq("codigo_hash", hashCodigo(codigo)).maybeSingle();
  return data || null;
}

async function enlaceInfo(d, body) {
  const enlace = await enlacePorCodigo(d, body.codigo);
  const motivo = motivoEnlaceInvalido(enlace, d.ahora());
  return { valido: motivo === null, motivo, registro_numero: enlace?.registro_numero ?? null };
}

async function enlaceIniciar(d, body) {
  const enlace = await enlacePorCodigo(d, body.codigo);
  const motivo = motivoEnlaceInvalido(enlace, d.ahora());
  if (motivo) throw new ErrorHttp(410, motivo, motivo);
  const state = firmarState({ enlace: enlace.id, exp: d.ahora() + STATE_VENCE_MS }, d.clave);
  return { url: armarUrlAutorizacion({ clientId: d.clientId, redirectUri: REDIRECT_URI, state }) };
}

function redirigir(res, resultado) {
  res.statusCode = 302;
  res.setHeader("Location", urlDeRetorno(resultado, ""));
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

// Vuelta de Google. Nada queda conectado si algo falla; el enlace solo se gasta cuando todo salió bien.
async function callback(d, req, res) {
  const q = req.query || {};
  if (q.error) return redirigir(res, "rechazado");
  const payload = verificarState(q.state, d.clave, d.ahora());
  if (!payload || !q.code) return redirigir(res, "invalido");
  const { data: enlace } = await d.sb.from("drive_enlaces").select("*").eq("id", payload.enlace).maybeSingle();
  const motivo = motivoEnlaceInvalido(enlace, d.ahora());
  if (motivo) return redirigir(res, motivo);
  const registro = enlace.registro_numero;
  const previa = await conexionDe(d, registro);
  if (previa && previa.estado === "activa") return redirigir(res, "invalido");

  let tokens;
  try { tokens = await d.google.canjearCodigo(String(q.code), REDIRECT_URI); } catch (e) {
    console.error("drive callback: canje falló", e?.status, e?.error);
    return redirigir(res, "invalido");
  }
  const permisos = String(tokens.scope || "").split(" ");
  if (!tokens.refresh_token || !permisos.includes("https://www.googleapis.com/auth/drive.file")) {
    // Aceptó a medias o Google no devolvió el permiso permanente: no se conecta nada y se limpia lo que haya.
    await d.google.revocar(tokens.refresh_token || tokens.access_token).catch(() => {});
    return redirigir(res, tokens.refresh_token ? "rechazado" : "invalido");
  }
  let cuenta = { email: emailDeIdToken(tokens.id_token), usada: null, total: null };
  try { cuenta = { ...cuenta, ...(await d.google.cuenta(tokens.access_token)) }; } catch { /* la cuota se lee después */ }
  if (!cuenta.email) {
    await d.google.revocar(tokens.refresh_token).catch(() => {});
    return redirigir(res, "invalido");
  }
  // Se gasta el enlace de forma atómica: si dos pestañas llegan a la vez, solo una gana.
  const { data: gastado } = await d.sb.from("drive_enlaces").update({ usado_en: new Date(d.ahora()).toISOString() }).eq("id", enlace.id).is("usado_en", null).select("id");
  if (!gastado?.length) {
    await d.google.revocar(tokens.refresh_token).catch(() => {});
    return redirigir(res, "usado");
  }
  const { error } = await d.sb.from("drive_conexiones").upsert({
    registro_numero: registro, google_email: cuenta.email, refresh_token_cifrado: cifrar(tokens.refresh_token, d.clave),
    estado: "activa", motivo: null, sin_espacio: false, carpeta_raiz_id: null,
    cuota_usada: cuenta.usada, cuota_total: cuenta.total, cuota_leida_en: new Date(d.ahora()).toISOString(),
    conectada_en: new Date(d.ahora()).toISOString(), conectada_por: enlace.creado_por, actualizada_en: new Date(d.ahora()).toISOString(),
  }, { onConflict: "registro_numero" });
  if (error) throw new Error(`upsert conexion: ${error.message}`);
  await auditar(d, { registro, usuarioId: enlace.creado_por, accion: "conectar", detalle: { cuenta: cuenta.email } });
  return redirigir(res, "ok");
}

// ── Entrada ──────────────────────────────────────────────────────────────────

const PUBLICAS = {
  enlace_info: (d, p, b) => enlaceInfo(d, b), enlace_iniciar: (d, p, b) => enlaceIniciar(d, b),
  celular_info: celularInfo, celular_iniciar_subida: celularIniciarSubida, celular_confirmar: celularConfirmar, celular_quitar: celularQuitar,
  celular_identificar: celularIdentificar,
};
const DE_USUARIO = { estado, iniciar_subida: iniciarSubida, confirmar_subida: confirmarSubida, borrar, celular_crear: celularCrear, celular_cerrar: celularCerrar, renombrar, identificar };
const DE_ADMIN = { admin_estado: adminEstado, admin_enlace: adminEnlace, admin_desconectar: adminDesconectar };

export function depsReales() {
  return {
    sb: clienteServicio(),
    google: crearGoogle({ clientId: process.env.GOOGLE_DRIVE_CLIENT_ID, clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET }),
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clave: process.env.DRIVE_CIFRADO_CLAVE,
    usuarioDeToken,
    ahora: () => Date.now(),
    ia: crearIA({ apiKey: process.env.ANTHROPIC_API_KEY }),
    // Interruptores de la identificación automática: se apagan en un minuto, sin tocar el código (variables en Vercel).
    config: { identificar: process.env.DRIVE_IDENTIFICAR === "1", identificarCompu: process.env.DRIVE_IDENTIFICAR_COMPU === "1" },
  };
}

export function crearHandler(fabricaDeps = depsReales) {
  return async function handler(req, res) {
    try {
      const d = fabricaDeps();
      if (req.method === "GET") {
        if (req.query?.accion !== "callback") return res.status(405).json({ error: "Method not allowed" });
        return await callback(d, req, res);
      }
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      const body = req.body || {};
      const accion = body.accion;
      if (PUBLICAS[accion]) return res.status(200).json(await PUBLICAS[accion](d, null, body));
      const usuarioAuth = (DE_USUARIO[accion] || DE_ADMIN[accion] || accion === "ver" || accion === "descargar")
        ? await d.usuarioDeToken(tokenDeRequest(req)) : undefined;
      if (usuarioAuth === undefined) return res.status(400).json({ error: "Acción desconocida" });
      if (!usuarioAuth) return res.status(401).json({ error: "No autenticado" });
      const perfil = await perfilDe(d, usuarioAuth);
      if (accion === "ver" || accion === "descargar") {
        await entregar(d, perfil, body, res, accion === "descargar");
        return;
      }
      const resultado = await (DE_USUARIO[accion] || DE_ADMIN[accion])(d, perfil, body);
      return res.status(200).json(resultado);
    } catch (e) {
      if (res.headersSent) { res.destroy?.(e); return; }
      if (e instanceof ErrorHttp) return res.status(e.status).json({ error: e.message, codigo: e.codigo });
      console.error("drive error:", e?.message);
      return res.status(500).json({ error: "Error del servidor" });
    }
  };
}

export default crearHandler();
