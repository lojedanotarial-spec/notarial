// Lógica pura de la captura de documentos desde el celular (sin red ni base: se prueba sola).
// El handler (api/captura.js) la usa. Spec: specs/captura-documentos-celular/.
import { createHash, randomBytes } from "node:crypto";

// ── Códigos ──────────────────────────────────────────────────────────────────

export const MIN = 60_000;
export const INACTIVIDAD_MS = 10 * MIN;   // el código sirve mientras haya actividad cada 10 min…
export const VENCE_DURO_MS = 60 * MIN;    // …con tope absoluto de 60 min desde la creación
export const PURGA_MS = 24 * 60 * MIN;    // fotos y datos: 24 h como máximo
export const MAX_FOTOS = 20;
export const MAX_BYTES_FOTO = 3 * 1024 * 1024;

export const MODOS = ["parte", "vehiculos", "libre"];

export function generarCodigo() {
  return randomBytes(32).toString("base64url");
}

export function hashCodigo(codigo) {
  return createHash("sha256").update(String(codigo || "")).digest("hex");
}

export function calcularVencimientos(ahora = Date.now()) {
  return {
    expira_en: new Date(ahora + INACTIVIDAD_MS).toISOString(),
    vence_duro: new Date(ahora + VENCE_DURO_MS).toISOString(),
    purgar_en: new Date(ahora + PURGA_MS).toISOString(),
  };
}

// Cada acción del celular corre el vencimiento 10 min, sin pasar del tope duro.
export function renovarExpiracion(captura, ahora = Date.now()) {
  const tope = new Date(captura.vence_duro).getTime();
  return new Date(Math.min(ahora + INACTIVIDAD_MS, tope)).toISOString();
}

export function codigoVigente(captura, ahora = Date.now()) {
  if (!captura) return false;
  if (["cancelada", "vencida", "entregada"].includes(captura.estado)) return false;
  return new Date(captura.expira_en).getTime() > ahora && new Date(captura.vence_duro).getTime() > ahora;
}

// ── Etiqueta y expectativas ──────────────────────────────────────────────────

const limpiar = (s, max = 80) => String(s || "").replace(/[<>]/g, "").trim().slice(0, max);

export function armarEtiqueta(modo, contexto = {}) {
  if (modo === "parte") {
    const rol = limpiar(contexto.rol, 40).toUpperCase();
    return `Frente y dorso del documento${rol ? ` del ${rol}` : " de la persona"}`;
  }
  if (modo === "vehiculos") return "Tarjeta verde o título de cada vehículo (frente y dorso)";
  return limpiar(contexto.etiqueta, 120) || "Fotos de documentos (podés pasar todo junto)";
}

export function esperadasPara(modo) {
  if (modo === "parte") return { minimo: 2, texto: "frente y dorso" };
  if (modo === "vehiculos") return { minimo_por_grupo: 1, texto: "frente y dorso de cada vehículo" };
  return {};
}

// ── Lectura: normalización y fusión ──────────────────────────────────────────

const soloDigitos = (s) => String(s || "").replace(/\D/g, "");
const sinTildes = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const vacio = (v) => v === undefined || v === null || String(v).trim() === "";

// Qué tan confiable es cada tipo de documento como fuente de nombre/número/fecha (gana el DNI).
const PRIORIDAD_DOC = { DNI: 0, dni: 0, pasaporte: 1, Pasaporte: 1, licencia: 2, partida_nacimiento: 3, partida_matrimonio: 3 };
const prioridad = (tipo) => PRIORIDAD_DOC[tipo] ?? 9;

const CLAVES_CRITICAS = ["apellido", "nombre", "nro_doc", "fecha_nac"];
const CAMPOS_PERSONA = [
  "apellido", "nombre", "nro_doc", "tipo_doc", "genero", "fecha_nac", "estado_civil", "nacionalidad", "cuit",
  "calle", "numero", "barrio", "manzana", "casa", "localidad", "departamento", "provincia", "pais",
];

export function claveDePersona(p) {
  const dni = soloDigitos(p?.nro_doc);
  if (dni.length >= 6) return `doc:${dni}`;
  const nombre = `${sinTildes(p?.apellido)}|${sinTildes(p?.nombre)}`;
  return nombre === "|" ? null : `nom:${nombre}`;
}

// items: [{ persona, tipo_documento, foto }] -> [{ ...persona fusionada, _fotos:[..], _discrepancias:[..] }]
// Mismo número de documento (o mismo apellido+nombre) = misma persona. Para cada campo gana el primer valor no
// vacío de la fuente más confiable (DNI antes que licencia). Si dos fuentes dan valores distintos en un campo
// crítico, se anota la discrepancia para mostrarla al usuario.
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
  const fusionar = (lista) => {
    const ordenada = [...lista].sort((a, b) => prioridad(a.tipo_documento) - prioridad(b.tipo_documento));
    const out = { _fotos: [], _discrepancias: [] };
    for (const campo of CAMPOS_PERSONA) {
      const candidatos = ordenada.map((i) => i.persona[campo]).filter((v) => !vacio(v));
      if (candidatos.length) out[campo] = candidatos[0];
      if (CLAVES_CRITICAS.includes(campo) && candidatos.length > 1) {
        const distintos = new Set(candidatos.map((v) => (campo === "nro_doc" ? soloDigitos(v) : sinTildes(v))));
        if (distintos.size > 1) out._discrepancias.push({ campo, valores: [...new Set(candidatos.map(String))] });
      }
    }
    const rol = ordenada.map((i) => i.persona._rol_sugerido).find((v) => !vacio(v));
    if (rol) out._rol_sugerido = rol;
    out._fotos = ordenada.map((i) => i.foto).filter((f) => f !== undefined);
    return out;
  };
  return [...[...grupos.values()].map(fusionar), ...sinClave.map((i) => fusionar([i]))];
}

export function camposNoLeidos(persona) {
  const etiquetas = { apellido: "apellido", nombre: "nombre", nro_doc: "número de documento", fecha_nac: "fecha de nacimiento" };
  return CLAVES_CRITICAS.filter((c) => vacio(persona?.[c])).map((c) => etiquetas[c]);
}

// ── Clasificación de cada foto y fusión de vehículos ────────────────────────

// Resultado de extraerDocumento() para UNA foto -> 'persona' | 'vehiculo_frente' | 'vehiculo_dorso' | 'otro'
export function clasificarFoto(res) {
  if (!res || typeof res !== "object") return "otro";
  if (res.vehiculo && (res.vehiculo.dominio || res.vehiculo.chasis || res.vehiculo.marca)) return "vehiculo_frente";
  if (res.tipo_documento === "tarjeta_verde" && res.personas?.length) return "vehiculo_dorso";
  if (res.personas?.some((p) => !vacio(p.apellido) || !vacio(p.nombre) || !vacio(p.nro_doc))) return "persona";
  return "otro";
}

const dominioNorm = (d) => String(d || "").toUpperCase().replace(/[\s-]/g, "");

// items: [{ res, foto, grupo }] de una captura de VEHÍCULOS: el grupo lo armó el usuario en el celular.
// Un vehículo por grupo: el frente da el vehículo y el titular; el dorso, titular y autorizados.
export function fusionarVehiculosPorGrupo(items) {
  const grupos = new Map();
  for (const it of items) {
    const g = it.grupo ?? 0;
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(it);
  }
  return [...grupos.entries()].sort((a, b) => a[0] - b[0]).map(([grupo, lista]) => {
    let vehiculo = null, titular = null;
    const personas = [];
    for (const { res } of lista) {
      if (res?.vehiculo && !vehiculo) vehiculo = res.vehiculo;
      if (res?.titular && !titular && !vacio(res.titular.nro_doc || res.titular.apellido)) titular = res.titular;
      if (res?.personas?.length) personas.push(...res.personas);
    }
    return { grupo, vehiculo, titular, personas, fotos: lista.length, _fotos: lista.map((i) => i.foto) };
  }).filter((v) => v.vehiculo || v.personas.length);
}

// Modo libre: una lectura por foto -> personas fusionadas, vehículos (por dominio), dorsos sin emparejar y otras.
export function armarResultadoLibre(porFoto) {
  const personasItems = [], vehiculos = new Map(), dorsos = [], otros = [];
  for (const { res, foto } of porFoto) {
    const tipo = clasificarFoto(res);
    if (tipo === "persona") {
      for (const p of res.personas) personasItems.push({ persona: p, tipo_documento: res.tipo_documento, foto });
    } else if (tipo === "vehiculo_frente") {
      const k = dominioNorm(res.vehiculo.dominio) || `foto${foto}`;
      if (!vehiculos.has(k)) vehiculos.set(k, { vehiculo: res.vehiculo, titular: res.titular || null, _fotos: [] });
      const v = vehiculos.get(k);
      v._fotos.push(foto);
      if (!v.titular && res.titular) v.titular = res.titular;
    } else if (tipo === "vehiculo_dorso") {
      dorsos.push({ personas: res.personas, _fotos: [foto] });
    } else {
      otros.push({ foto, nota: res?.notas || "" });
    }
  }
  const personas = fusionarPersonas(personasItems);
  const lista = [...vehiculos.values()];
  const partes = [];
  if (personas.length) partes.push(`${personas.length} ${personas.length === 1 ? "persona" : "personas"}`);
  if (lista.length) partes.push(`${lista.length} ${lista.length === 1 ? "vehículo" : "vehículos"}`);
  if (dorsos.length) partes.push(`${dorsos.length} ${dorsos.length === 1 ? "dorso" : "dorsos"} de tarjeta sin emparejar`);
  if (otros.length) partes.push(`${otros.length} ${otros.length === 1 ? "foto que no pude clasificar" : "fotos que no pude clasificar"}`);
  return { personas, vehiculos: lista, dorsos, otros, resumen: partes.join(", ") || "no pude leer nada" };
}

// Captura de una PARTE: una sola llamada con todas las fotos. Si aparecen varias personas hay que preguntar cuál es.
export function armarResultadoParte(res, nFotos) {
  const personas = (res?.personas || []).filter((p) => !vacio(p.apellido) || !vacio(p.nombre) || !vacio(p.nro_doc));
  return {
    personas,
    hay_varias: personas.length > 1,
    notas: res?.notas || "",
    fotos: nFotos,
    resumen: personas.length === 0 ? "no pude leer a ninguna persona" : personas.length === 1 ? "1 persona" : `${personas.length} personas`,
  };
}

// ── Purga ────────────────────────────────────────────────────────────────────

const TERMINALES = ["entregada", "cancelada", "vencida"];

// ¿Esta captura tiene que destruirse ahora? (pasó el tope de 24 h y todavía guarda algo)
export function debePurgarse(captura, ahora = Date.now()) {
  if (!captura) return false;
  const guarda = (captura.fotos?.length || 0) > 0 || captura.resultado != null;
  if (TERMINALES.includes(captura.estado)) return guarda; // terminada pero quedó algo: limpiar
  return new Date(captura.purgar_en).getTime() <= ahora;
}

export const ESTADO_AL_PURGAR = (captura) => (TERMINALES.includes(captura.estado) ? captura.estado : "vencida");

export function rutaFoto(capturaId, fotoId, extension) {
  return `${capturaId}/${fotoId}.${extension}`;
}

export const EXTENSIONES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
