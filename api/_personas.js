// Fichas de personas del registro (lógica pura, sin red ni base: se prueba sola).
// Las usa api/drive.js. Spec y plan: specs/personas-expediente/.
//
// Regla de oro: la ficha es de UN registro. El registro lo deduce siempre el servidor; el cliente nunca lo elige.
// El historial (drive_auditoria) guarda QUÉ campos cambiaron, jamás sus valores: nombres, documentos y domicilios no van a los registros.
import { ESTADOS_CIVILES_F, ESTADOS_CIVILES_M, concordarEstadoCivil } from "../src/utils/personasDatos.js";

// Columnas de `personas` que el usuario puede escribir. Quedan afuera id, registro_id, created_at, updated_at y representaciones
// (esas las maneja el servidor o el editor de partes).
export const CAMPOS_FICHA = [
  "apellido", "nombre", "genero", "nacionalidad", "tipo_doc", "nro_doc", "cuit", "fecha_nac", "estado_civil",
  "calle", "numero", "piso", "dpto", "barrio", "manzana", "casa", "localidad", "departamento", "provincia", "pais", "notas",
];
const MAX_CAMPO = 200;
const MAX_NOTAS = 2000;

// Para comparar nombres: sin tildes, sin mayúsculas, sin signos y con espacios simples ("Pérez  Gómez" = "perez gomez").
export function normalizarTexto(valor) {
  return String(valor ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

// El documento se guarda sin puntos ni espacios; vacío = sin valor (null), que el índice único del registro permite repetir.
export function normalizarDni(valor) {
  const s = String(valor ?? "").replace(/[\s.-]/g, "").toUpperCase();
  return s || null;
}

const estadoCivilValido = (v) => ESTADOS_CIVILES_F.includes(v) || ESTADOS_CIVILES_M.includes(v);

// Limpia lo que manda el navegador. Devuelve SOLO las columnas que vinieron (sirve para crear y para editar).
// Con { crear: true } exige al menos apellido o nombre.
export function limpiarDatosFicha(entrada, { crear = false } = {}) {
  const datos = {};
  const origen = entrada && typeof entrada === "object" ? entrada : {};
  for (const campo of CAMPOS_FICHA) {
    if (!(campo in origen)) continue;
    const crudo = origen[campo];
    if (crudo != null && typeof crudo !== "string" && typeof crudo !== "number") return { ok: false, error: "Hay un dato con un formato que no se puede guardar." };
    const texto = String(crudo ?? "").trim();
    if (texto.length > (campo === "notas" ? MAX_NOTAS : MAX_CAMPO)) return { ok: false, error: campo === "notas" ? "Las notas son demasiado largas." : "Hay un dato demasiado largo." };
    datos[campo] = campo === "nro_doc" ? normalizarDni(texto) : texto;
  }
  if ("genero" in datos && !["", "F", "M"].includes(datos.genero)) return { ok: false, error: "El género no es válido." };
  if ("estado_civil" in datos) {
    const v = datos.estado_civil.toLowerCase();
    if (v && !estadoCivilValido(v)) return { ok: false, error: "El estado civil no es válido." };
    datos.estado_civil = v;
  }
  if (crear && !datos.apellido && !datos.nombre) return { ok: false, error: "Escribí al menos el apellido o el nombre." };
  return { ok: true, datos };
}

// Al editar, la ficha no puede quedar sin nombre: se comprueba con la fila final.
export const sinNombre = (fila) => !String(fila?.apellido ?? "").trim() && !String(fila?.nombre ?? "").trim();

// La fila final a guardar: lo existente + lo nuevo, con el estado civil concordando con el género (casado → casada).
export function armarFilaFicha(existente, datos) {
  const fila = { ...(existente || {}), ...datos };
  if ("estado_civil" in datos || "genero" in datos) fila.estado_civil = concordarEstadoCivil(fila.estado_civil, fila.genero);
  return fila;
}

// Defaults de una ficha nueva (las columnas de texto no admiten ausencia en el resto del producto).
export function fichaNueva(datos, registro, ahora) {
  const base = Object.fromEntries(CAMPOS_FICHA.map((c) => [c, ""]));
  const fila = armarFilaFicha({ ...base, tipo_doc: "DNI", nro_doc: null }, datos);
  if (!fila.tipo_doc) fila.tipo_doc = "DNI";
  return { ...fila, tipo: "fisica", registro_id: registro, representaciones: [], updated_at: ahora };
}

// ¿Ya existe esta persona en el registro? Por documento (lo impide la base) o, si no tiene documento, por apellido y nombre.
// `personas` = las fichas DEL MISMO REGISTRO. `excluirId` = la ficha que se está editando.
export function buscarDuplicada(personas, { nro_doc, apellido, nombre }, excluirId = null) {
  const lista = (personas || []).filter((p) => p.id !== excluirId);
  const dni = normalizarDni(nro_doc);
  if (dni) {
    const p = lista.find((x) => normalizarDni(x.nro_doc) === dni);
    return p ? { por: "dni", persona: p } : null;
  }
  const clave = normalizarTexto(`${apellido ?? ""} ${nombre ?? ""}`);
  if (!clave) return null;
  const p = lista.find((x) => normalizarTexto(`${x.apellido ?? ""} ${x.nombre ?? ""}`) === clave);
  return p ? { por: "nombre", persona: p } : null;
}

// Nombres de las columnas que cambiaron (nunca sus valores).
export function camposCambiados(antes, despues) {
  const igual = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();
  return CAMPOS_FICHA.filter((c) => c in (despues || {}) && !igual(antes?.[c], despues[c]));
}

// Lo que se devuelve al navegador: la ficha sin el registro (que no le sirve) ni los datos internos.
export function fichaPublica(p) {
  if (!p) return null;
  const { registro_id: _r, ...resto } = p;
  return resto;
}
