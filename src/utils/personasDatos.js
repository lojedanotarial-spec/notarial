// Datos de las personas (fichas de la libreta del registro): estados civiles y armado de la fila a guardar.
// Compartido entre el editor de partes y las fichas del expediente (specs/personas-expediente/).

// Columnas de `personas` que se escriben desde las fichas (quedan afuera id, registro_id, fechas y representaciones).
export const CAMPOS_FICHA = [
  "apellido", "nombre", "genero", "nacionalidad", "tipo_doc", "nro_doc", "cuit", "fecha_nac", "estado_civil",
  "calle", "numero", "piso", "dpto", "barrio", "manzana", "casa", "localidad", "departamento", "provincia", "pais", "notas",
];

// Con concordancia de género, como los usa el editor de partes y llegan al documento. "Unión convivencial" no cambia con el género.
export const UNION_CONVIVENCIAL = "unión convivencial";
export const ESTADOS_CIVILES_F = ["soltera", "casada", "divorciada", "viuda", "separada de hecho", UNION_CONVIVENCIAL];
export const ESTADOS_CIVILES_M = ["soltero", "casado", "divorciado", "viudo", "separado de hecho", UNION_CONVIVENCIAL];

// Lista para el desplegable, según el género.
export const estadosCivilesPara = (genero) => (genero === "F" ? ESTADOS_CIVILES_F : ESTADOS_CIVILES_M);

// Cambia la concordancia al cambiar el género (casado -> casada). Lo que no reconoce lo deja como está.
export function concordarEstadoCivil(valor, genero) {
  const v = String(valor ?? "").trim();
  if (!v || (genero !== "F" && genero !== "M")) return v;
  const desde = genero === "F" ? ESTADOS_CIVILES_M : ESTADOS_CIVILES_F;
  const hacia = genero === "F" ? ESTADOS_CIVILES_F : ESTADOS_CIVILES_M;
  const i = desde.indexOf(v);
  return i >= 0 ? hacia[i] : v;
}

// Fila de `personas` a partir de una parte del editor. Un DNI vacío se guarda SIN valor (null), no como "": el índice único
// (registro, DNI) deja repetir los null pero no los "", y la segunda persona sin DNI fallaba en silencio.
export function armarFilaPersona(p, registroNumero, ahora = new Date().toISOString()) {
  const nroDoc = String(p?.nroDoc ?? "").trim();
  return {
    registro_id:      registroNumero,
    apellido:         p.apellido      || "",
    nombre:           p.nombre        || "",
    genero:           p.genero        || "",
    nacionalidad:     p.nacionalidad  || "",
    tipo_doc:         p.tipoDoc       || "DNI",
    nro_doc:          nroDoc || null,
    cuit:             p.cuit          || "",
    fecha_nac:        p.fechaNac      || "",
    estado_civil:     p.estadoCivil   || "",
    calle:            p.calle         || "",
    numero:           p.numero        || "",
    piso:             p.piso          || "",
    dpto:             p.dpto          || "",
    barrio:           p.barrio        || "",
    manzana:          p.manzana       || "",
    casa:             p.casa          || "",
    localidad:        p.localidad     || "",
    departamento:     p.departamento  || "",
    provincia:        p.provincia     || "",
    pais:             p.pais          || "",
    representaciones: p.representaciones || [],
    updated_at:       ahora,
  };
}

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

// CUIT/CUIL a partir del DNI y el género: { prefijo, verificador } (antes vivía dentro de PartesEditor).
export function calcularCUIT(dni, genero) {
  const dniStr = String(dni || "").replace(/\D/g, "").padStart(8, "0");
  if (dniStr.length !== 8) return null;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const calcVer = (pre) => {
    const num = String(pre) + dniStr;
    const suma = num.split("").reduce((acc, d, i) => acc + parseInt(d) * mult[i], 0);
    return 11 - (suma % 11);
  };
  const preBase = genero === "M" ? 20 : 27;
  let ver = calcVer(preBase);
  let pre = preBase;
  if (ver === 11) { ver = 0; }
  else if (ver === 10) {
    pre = genero === "M" ? 23 : 24;
    ver = calcVer(pre);
    if (ver === 11) ver = 0;
  }
  return { prefijo: String(pre), verificador: String(ver) };
}
