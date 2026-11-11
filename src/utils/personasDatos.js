// Datos de las personas (fichas de la libreta del registro): estados civiles y armado de la fila a guardar.
// Compartido entre el editor de partes y las fichas del expediente (specs/personas-expediente/).

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
