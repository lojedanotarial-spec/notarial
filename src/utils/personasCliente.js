// Personas del expediente, lado del navegador: llamadas al servidor y lógica de presentación (sin React, se prueba sola).
// Las fichas se LEEN directo de la base (reglas por registro); se ESCRIBEN por el servidor (/api/drive), que avisa los duplicados
// y deja el historial. Spec: specs/personas-expediente/.
import { supabase } from "../supabase";
import { apiPost } from "./apiFetch";
import { fmtDni } from "./formato";
import {
  CAMPOS_FICHA, ESTADOS_CIVILES_F, ESTADOS_CIVILES_M, calcularCUIT, concordarEstadoCivil, normalizarDni, normalizarTexto,
} from "./personasDatos";

const llamar = (accion, datos = {}) => apiPost("/api/drive", { accion, ...datos });

// ── Servidor ─────────────────────────────────────────────────────────────────

// Crea o edita una ficha. Al crear, si ya existe otra igual, responde { duplicada: { por, persona } } SIN escribir nada;
// repetir con `actualizarExistente: true` la actualiza. Con `expedienteId`, además la suma al expediente.
export const guardarPersona = ({ personaId, expedienteId, datos, actualizarExistente }) =>
  llamar("persona_guardar", { datos, ...(personaId ? { persona_id: personaId } : {}), ...(expedienteId ? { expediente_id: expedienteId } : {}), ...(actualizarExistente ? { actualizar_existente: true } : {}) });
export const agregarPersonaAlExpediente = (expedienteId, personaId) => llamar("persona_agregar", { expediente_id: expedienteId, persona_id: personaId });
export const quitarPersonaDelExpediente = (expedienteId, personaId) => llamar("persona_quitar", { expediente_id: expedienteId, persona_id: personaId });
export const borrarPersona = (personaId) => llamar("persona_borrar", { persona_id: personaId });
// Asigna archivos a una persona (o los deja sin asignar con `null`).
export const asignarArchivos = (archivoIds, personaId) => llamar("archivo_asignar", { archivo_ids: archivoIds, persona_id: personaId ?? null });

// ── Lectura (directo de la base, con las reglas de acceso por registro) ──────

// Las personas de un expediente, ordenadas por apellido.
export async function listarPersonasDelExpediente(expedienteId) {
  const { data: miembros, error } = await supabase.from("expediente_personas").select("persona_id").eq("expediente_id", expedienteId);
  if (error) throw new Error("No pude cargar las personas del expediente.");
  const ids = (miembros || []).map((m) => m.persona_id);
  if (!ids.length) return [];
  const { data, error: e2 } = await supabase.from("personas").select("*").in("id", ids);
  if (e2) throw new Error("No pude cargar las personas del expediente.");
  return ordenarPorApellido(data || []);
}

// Toda la libreta del registro (para buscar y para proponer): se filtra en el navegador, sin importar tildes.
export async function listarLibreta(registro) {
  let q = supabase.from("personas").select("*").order("apellido", { ascending: true }).limit(1000);
  if (registro) q = q.eq("registro_id", String(registro));
  const { data, error } = await q;
  if (error) throw new Error("No pude cargar la libreta de personas.");
  return data || [];
}

// ── Presentación ─────────────────────────────────────────────────────────────

const ordenarPorApellido = (lista) => [...lista].sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"));

export function nombreCompleto(p) {
  const partes = [p?.apellido, p?.nombre].map((x) => String(x ?? "").trim()).filter(Boolean);
  return partes.join(", ") || "Sin nombre";
}

// "DNI 31.645.431 · casado"
export function resumenPersona(p) {
  const nro = String(p?.nro_doc ?? "").trim();
  const tipo = String(p?.tipo_doc || "DNI");
  const doc = nro ? `${tipo} ${tipo === "DNI" || tipo === "LE" || tipo === "LC" ? fmtDni(nro) || nro : nro}` : "Sin documento cargado";
  return [doc, String(p?.estado_civil ?? "").trim()].filter(Boolean).join(" · ");
}

// "Actualizada hace 3 días": para saber qué tan vigente es el estado civil.
export function textoActualizada(iso, ahora = Date.now()) {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return "";
  const dias = Math.floor((ahora - t) / 86400000);
  if (dias <= 0) return "Actualizada hoy";
  if (dias === 1) return "Actualizada ayer";
  if (dias < 30) return `Actualizada hace ${dias} días`;
  if (dias < 365) { const m = Math.floor(dias / 30); return `Actualizada hace ${m} ${m === 1 ? "mes" : "meses"}`; }
  const f = new Date(t);
  return `Actualizada el ${String(f.getDate()).padStart(2, "0")}/${String(f.getMonth() + 1).padStart(2, "0")}/${f.getFullYear()}`;
}

// Qué datos importantes le faltan a la ficha (para avisarlo en la lista).
export function datosQueFaltan(p) {
  const falta = [];
  if (!String(p?.nro_doc ?? "").trim()) falta.push("el documento");
  if (!String(p?.estado_civil ?? "").trim()) falta.push("el estado civil");
  if (!String(p?.calle ?? "").trim() && !String(p?.localidad ?? "").trim()) falta.push("el domicilio");
  return falta;
}

// Buscar en la libreta por apellido, nombre o el comienzo del documento. Sin texto, todas (ordenadas). `excluir` = ids ya en el expediente.
export function filtrarLibreta(libreta, texto, excluir = new Set(), max = 30) {
  const q = normalizarTexto(texto);
  const digitos = String(texto ?? "").replace(/\D/g, "");
  const tokens = q.split(" ").filter(Boolean);
  const hay = (libreta || []).filter((p) => !excluir.has(p.id)).filter((p) => {
    if (!tokens.length) return true;
    if (digitos.length >= 3 && normalizarDni(p.nro_doc)?.startsWith(digitos)) return true;
    const nombre = normalizarTexto(`${p.apellido ?? ""} ${p.nombre ?? ""}`);
    return tokens.every((t) => nombre.includes(t));
  });
  return ordenarPorApellido(hay).slice(0, max);
}

// ── Archivos de cada persona ─────────────────────────────────────────────────

// { porPersona: Map(id → archivos), sinAsignar }. Un archivo de una persona que ya no está en el expediente cuenta como sin asignar.
export function agruparArchivos(archivos, personas) {
  const porPersona = new Map(personas.map((p) => [p.id, []]));
  const sinAsignar = [];
  for (const a of archivos || []) {
    if (a.persona_id && porPersona.has(a.persona_id)) porPersona.get(a.persona_id).push(a);
    else sinAsignar.push(a);
  }
  return { porPersona, sinAsignar };
}

// Clave para comparar "Pérez Juan" con "Juan Pérez": palabras sin tildes, ordenadas.
export const clavePersona = (apellido, nombre) => normalizarTexto(`${apellido ?? ""} ${nombre ?? ""}`).split(" ").filter(Boolean).sort().join(" ");

// Propuestas a partir de los nombres que la lectura automática leyó en los archivos SIN asignar:
//   asignar = ya está en el expediente · agregar = está en la libreta · crear = no existe. Nunca se hace nada solo.
// `descartadas` = claves que el usuario ya rechazó en esta sesión.
export function propuestasDeArchivos(archivos, delExpediente, libreta, descartadas = new Set()) {
  const grupos = new Map();
  for (const a of archivos || []) {
    if (a.persona_id || (!String(a.ident_apellido ?? "").trim() && !String(a.ident_nombre ?? "").trim())) continue;
    const clave = clavePersona(a.ident_apellido, a.ident_nombre);
    if (!clave || descartadas.has(clave)) continue;
    if (!grupos.has(clave)) grupos.set(clave, { clave, apellido: String(a.ident_apellido ?? "").trim(), nombre: String(a.ident_nombre ?? "").trim(), archivos: [] });
    grupos.get(clave).archivos.push(a);
  }
  const enExp = new Map((delExpediente || []).map((p) => [clavePersona(p.apellido, p.nombre), p]));
  const enLibreta = new Map((libreta || []).map((p) => [clavePersona(p.apellido, p.nombre), p]));
  const propuestas = [...grupos.values()].map((g) => {
    if (enExp.has(g.clave)) return { tipo: "asignar", persona: enExp.get(g.clave), ...g };
    if (enLibreta.has(g.clave)) return { tipo: "agregar", persona: enLibreta.get(g.clave), ...g };
    return { tipo: "crear", ...g };
  });
  return propuestas.sort((a, b) => a.apellido.localeCompare(b.apellido, "es"));
}

// ── Ficha: valores y lectura del DNI ─────────────────────────────────────────

export const ETIQUETAS_CAMPO = {
  apellido: "Apellido", nombre: "Nombre", genero: "Género", nacionalidad: "Nacionalidad", tipo_doc: "Tipo de documento", nro_doc: "N° de documento",
  cuit: "CUIT / CUIL", fecha_nac: "Fecha de nacimiento", estado_civil: "Estado civil", calle: "Calle", numero: "Número", piso: "Piso", dpto: "Depto.",
  barrio: "Barrio", manzana: "Manzana", casa: "Casa / Lote", localidad: "Localidad", departamento: "Departamento", provincia: "Provincia", pais: "País", notas: "Notas",
};

// Una ficha en blanco con todas las columnas en texto (los formularios necesitan valores controlados).
export const vacioFicha = () => ({ ...Object.fromEntries(CAMPOS_FICHA.map((c) => [c, ""])), tipo_doc: "DNI" });

// Lo que se manda al servidor: solo las columnas editables.
export const datosDeFicha = (ficha) => Object.fromEntries(CAMPOS_FICHA.filter((c) => c in (ficha || {})).map((c) => [c, ficha[c] ?? ""]));

const titulo = (s) => String(s ?? "").trim().toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep, l) => sep + l.toUpperCase());
// Campos que la lectura del documento puede traer, y cómo se limpia cada uno.
const DE_LECTURA = {
  apellido: titulo, nombre: titulo, nro_doc: (v) => normalizarDni(v) ?? "", tipo_doc: (v) => String(v ?? "").trim(),
  genero: (v) => { const g = String(v ?? "").trim().toUpperCase(); return g === "M" || g === "F" ? g : ""; },
  fecha_nac: (v) => String(v ?? "").trim(), nacionalidad: (v) => String(v ?? "").trim(), estado_civil: (v) => String(v ?? "").trim().toLowerCase(),
  calle: titulo, numero: (v) => String(v ?? "").trim(), barrio: titulo, manzana: (v) => String(v ?? "").trim(), casa: (v) => String(v ?? "").trim(),
  localidad: titulo, departamento: titulo,
};
const mismoValor = (campo, a, b) => (campo === "nro_doc" || campo === "fecha_nac"
  ? String(a ?? "").replace(/\D/g, "") === String(b ?? "").replace(/\D/g, "")
  : normalizarTexto(a) === normalizarTexto(b));

// CUIT/CUIL que corresponde al DNI y al género ("" si todavía no se puede calcular).
export function cuitCalculado(f) {
  const nro = String(f?.nro_doc ?? "").replace(/\D/g, "");
  if ((f?.tipo_doc || "DNI") !== "DNI" || !/^\d{7,8}$/.test(nro) || (f?.genero !== "M" && f?.genero !== "F")) return "";
  const c = calcularCUIT(nro, f.genero);
  return c ? `${c.prefijo}-${nro.padStart(8, "0")}-${c.verificador}` : "";
}

// Errores de la ficha antes de guardar: { campo: mensaje }. Lo que no es un error objetivo (un dato raro) se deja pasar.
export function validarFicha(f) {
  const e = {};
  if (!String(f?.apellido ?? "").trim() && !String(f?.nombre ?? "").trim()) e.apellido = "Escribí al menos el apellido o el nombre.";
  const nro = String(f?.nro_doc ?? "").replace(/\D/g, "");
  if (["DNI", "LE", "LC"].includes(f?.tipo_doc || "DNI") && nro && !/^\d{7,8}$/.test(nro)) e.nro_doc = "El documento tiene 7 u 8 números.";
  const fecha = String(f?.fecha_nac ?? "").trim();
  if (fecha) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fecha);
    const d = m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
    if (!d || d.getDate() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || Number(m[3]) < 1900 || d.getTime() > Date.now()) e.fecha_nac = "Escribí una fecha real con el formato dd/mm/aaaa.";
  }
  return e;
}

// Compara lo que leyó el lector con la ficha. NUNCA pisa lo escrito:
//   rellenar = campos vacíos que se pueden completar · discrepancias = el documento dice otra cosa que lo que ya está cargado
//   leidos = cuántos datos se leyeron. Acepta el resultado del lector ({ personas: [..] }) o la persona sola.
export function comparacionLectura(ficha, lectura) {
  const leida = lectura?.personas ? lectura.personas[0] : lectura;
  const limpia = {};
  for (const [campo, limpiar] of Object.entries(DE_LECTURA)) {
    const v = limpiar(leida?.[campo]);
    if (v) limpia[campo] = v;
  }
  const generoFinal = String(ficha?.genero ?? "").trim() || limpia.genero || "";
  if (limpia.estado_civil) {
    const ec = limpia.estado_civil;
    limpia.estado_civil = ESTADOS_CIVILES_F.includes(ec) || ESTADOS_CIVILES_M.includes(ec) ? concordarEstadoCivil(ec, generoFinal) : undefined;
    if (!limpia.estado_civil) delete limpia.estado_civil;
  }
  const rellenar = {};
  const discrepancias = [];
  for (const [campo, valor] of Object.entries(limpia)) {
    const actual = String(ficha?.[campo] ?? "").trim();
    if (!actual) rellenar[campo] = valor;
    else if (!mismoValor(campo, actual, valor)) discrepancias.push({ campo, dni: valor, actual });
  }
  if (!String(ficha?.cuit ?? "").trim()) {
    const cuit = cuitCalculado({ tipo_doc: String(ficha?.tipo_doc ?? "").trim() || rellenar.tipo_doc || "DNI", nro_doc: String(ficha?.nro_doc ?? "").trim() || rellenar.nro_doc, genero: generoFinal });
    if (cuit) rellenar.cuit = cuit;
  }
  return { rellenar, discrepancias, leidos: Object.keys(limpia).length };
}
