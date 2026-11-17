// Fusión de lecturas de documentos: de varias fotos (o páginas de un PDF) a una lista de personas distintas.
// Lógica pura, sin red ni Node: la usan el servidor (api/_captura.js, captura desde el celular) y la ficha de la persona (ModalPersona).
// Mismo número de documento (o mismo apellido+nombre) = misma persona. Para cada campo gana el primer valor no vacío de la fuente
// más confiable (DNI antes que licencia). Si dos fuentes dan valores distintos en un campo crítico, se anota la discrepancia.

export const soloDigitos = (s) => String(s || "").replace(/\D/g, "");
export const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export const vacio = (v) => v === undefined || v === null || String(v).trim() === "";

// Qué tan confiable es cada tipo de documento como fuente de nombre/número/fecha (gana el DNI).
const PRIORIDAD_DOC = { DNI: 0, dni: 0, pasaporte: 1, Pasaporte: 1, licencia: 2, partida_nacimiento: 3, partida_matrimonio: 3 };
const prioridad = (tipo) => PRIORIDAD_DOC[tipo] ?? 9;

export const CLAVES_CRITICAS = ["apellido", "nombre", "nro_doc", "fecha_nac"];
// En la ficha también importa que el domicilio del DNI y el de la licencia no coincidan (es común que la gente se mude).
export const CLAVES_FICHA = [...CLAVES_CRITICAS, "calle", "numero", "localidad", "departamento", "provincia"];
export const CAMPOS_PERSONA = [
  "apellido", "nombre", "nro_doc", "tipo_doc", "genero", "fecha_nac", "estado_civil", "nacionalidad", "cuit",
  "calle", "numero", "barrio", "manzana", "casa", "localidad", "departamento", "provincia", "pais",
];

export function claveDePersona(p) {
  const dni = soloDigitos(p?.nro_doc);
  if (dni.length >= 6) return `doc:${dni}`;
  const nombre = `${sinTildes(p?.apellido)}|${sinTildes(p?.nombre)}`;
  return nombre === "|" ? null : `nom:${nombre}`;
}

// Fusiona los items de UNA misma persona: [{ persona, tipo_documento, foto }] -> { ...campos, _fotos, _discrepancias }
// `criticas`: en qué campos se avisa si dos documentos dicen cosas distintas (por defecto, los que identifican a la persona).
export function fusionarGrupo(lista, criticas = CLAVES_CRITICAS) {
  const ordenada = [...lista].sort((a, b) => prioridad(a.tipo_documento) - prioridad(b.tipo_documento));
  const out = { _fotos: [], _discrepancias: [] };
  for (const campo of CAMPOS_PERSONA) {
    const candidatos = ordenada.map((i) => i.persona[campo]).filter((v) => !vacio(v));
    if (candidatos.length) out[campo] = candidatos[0];
    if (criticas.includes(campo) && candidatos.length > 1) {
      const distintos = new Set(candidatos.map((v) => (campo === "nro_doc" ? soloDigitos(v) : sinTildes(v))));
      if (distintos.size > 1) out._discrepancias.push({ campo, valores: [...new Set(candidatos.map(String))] });
    }
  }
  const rol = ordenada.map((i) => i.persona._rol_sugerido).find((v) => !vacio(v));
  if (rol) out._rol_sugerido = rol;
  out._fotos = ordenada.map((i) => i.foto).filter((f) => f !== undefined);
  return out;
}

// items: [{ persona, tipo_documento, foto }] -> [{ ...persona fusionada, _fotos:[..], _discrepancias:[..] }]
export function fusionarPersonas(items) {
  const grupos = new Map();
  const sinClave = [];
  for (const it of items) {
    if (!it?.persona) continue;
    const k = claveDePersona(it.persona);
    if (!k) { sinClave.push(it); continue; }
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(it);
  }
  return [...[...grupos.values()].map((g) => fusionarGrupo(g)), ...sinClave.map((i) => fusionarGrupo([i]))];
}

// Mismas palabras de apellido+nombre, en cualquier orden y sin tildes ("GARCÍA Juan Carlos" = "Juan Carlos García").
const claveNombre = (p) => {
  const palabras = `${sinTildes(p?.apellido)} ${sinTildes(p?.nombre)}`.split(" ").filter(Boolean).sort();
  return palabras.length ? palabras.join(" ") : null;
};

// De entre las personas leídas, cuál es la de esta ficha (por número de documento o por nombre). -1 si ninguna coincide o la ficha
// está vacía: en ese caso hay que preguntarle al usuario.
export function indiceQueCoincide(ficha, personas) {
  const dni = soloDigitos(ficha?.nro_doc), nombre = claveNombre(ficha);
  const hallados = [];
  personas.forEach((p, i) => {
    const pd = soloDigitos(p.nro_doc);
    if ((dni.length >= 6 && pd === dni) || (nombre && claveNombre(p) === nombre)) hallados.push(i);
  });
  return hallados.length === 1 ? hallados[0] : -1;
}

// Para las fotos de UNA persona o de varias a la vez (un DNI y una licencia en el mismo cuadro, un PDF con documentos de dos personas).
// Más cuidadoso que fusionarPersonas con lo que sale de fotos sueltas:
//  · una foto que trae solo el nombre se une a la que trae nombre y número, aunque el orden de las palabras sea otro;
//  · una foto sin nombre ni número (el dorso con la dirección) se suma a la persona SOLO si hay una sola; con varias no se sabe
//    de quién es y queda afuera (se cuenta en `sinAtribuir`), en vez de inventar una "persona" nueva.
// Devuelve { personas: [...fusionadas], sinAtribuir }.
export function agruparLecturas(items) {
  const validos = (items || []).filter((i) => i?.persona);
  const nombreADoc = new Map();
  for (const it of validos) {
    const dni = soloDigitos(it.persona.nro_doc), n = claveNombre(it.persona);
    if (dni.length >= 6 && n && !nombreADoc.has(n)) nombreADoc.set(n, dni);
  }
  const grupos = new Map();
  let sueltos = [];
  for (const it of validos) {
    const dni = soloDigitos(it.persona.nro_doc);
    let clave;
    if (dni.length >= 6) clave = `doc:${dni}`;
    else {
      const n = claveNombre(it.persona);
      if (!n) { sueltos.push(it); continue; }
      clave = nombreADoc.has(n) ? `doc:${nombreADoc.get(n)}` : `nom:${n}`;
    }
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(it);
  }
  let sinAtribuir = 0;
  if (grupos.size === 1) { grupos.values().next().value.push(...sueltos); sueltos = []; }
  else sinAtribuir = sueltos.length;
  return { personas: [...grupos.values()].map((g) => fusionarGrupo(g, CLAVES_FICHA)), sinAtribuir };
}
