import { useState, useMemo } from "react";
import { C } from "../../constants";

/* ─── ARANCELES VIGENTES AL 25-03-2026 ────────────────────────────────────
   Ley 5053-8100  (honorarios notariales)
   Ley Impositiva 2026 n° 9680  (Sellos ATM + Tasas Registro)
   Tasas municipales: planilla Colegio de Escribanos, Febrero 2026
   ─────────────────────────────────────────────────────────────────────── */

const MIN                = 900_000;   // mínimo general
const SELLOS_PCT         = 0.01;      // 1 % total — tasa general (Ley Imp. 2026 n° 9680)
const SELLOS_INMUEBLE_PCT = 0.02;     // 2 % total — inmuebles (Ley Imp. 2026 n° 9680)
const APORTES_PCT        = 0.004;     // 0,40 % del valor del acto (Ley 3.364 Art. 54)
const APORTES_MIN        = 108_450;   // mínimo desde 01-07-2026 (Ley 3.364 Art. 54)
const LLANA         = 9_000;     // por hoja / foja (Art. 6.a1)
const DILIGENC_FIJ  = 135_000;   // (Art. 6.c1)
const DILIGENC_PCT  = 0.002;
const ESTUDIO_FIJ   = 135_000;   // (Art. 6.c2)
const ESTUDIO_PCT   = 0.003;

// Tasas Registro de la Propiedad — planilla 2026 (Ley 9680)
const TASAS_REG = {
  // Certificado de bloqueo — hoja "2026 Certificado de Bloqueo y Otros"
  cert_bloqueo_portal:     6_500,   // 1 inmueble, vía portal web
  cert_bloqueo_presencial: 7_800,   // 1 inmueble, COD 897 (ventanilla)
  cert_bloqueo_adicional_portal:     3_900,  // por cada inm adicional (portal)
  cert_bloqueo_adicional_presencial: 2_600,  // por cada inm adicional (COD 897)

  // Inhibición — misma hoja
  cert_inhibicion_1tit:    20_800,  // 1 titular
  cert_inhibicion_adicional: 6_500, // por cada titular adicional

  // Cancelación hipoteca / usufructo / medida cautelar — hoja "USUF. Y CANCELAC."
  cancelacion_hip:         13_000,  // con tasa, CÓDIGO ESPECÍFICO
  cancelacion_hip_urgente: 26_000,

  // Estado jurídico inmueble (Form. D) — Apt. VI
  estado_jco:              5_000,
  estado_jco_urgente:      13_000,

  // Inscripción hipoteca / otros actos (estimado, no aplica tramos de dominio)
  inscripcion_otros:       10_000,  // Apt. IV — estimado para hipoteca y otros
  inscripcion_urgente:     31_000,
};

// Inscripción de dominio (compraventa) — tramos Ley 9680 planilla Registro 2026
// COD 620 (≤$2M) / COD 621 (≤$6M) / COD 622 (≤$30M) / COD 628 (>$30M)
function calcInscripcionDominio(v) {
  if (v <= 2_000_000)  return { monto: 10_000,  cod: "COD 620" };
  if (v <= 6_000_000)  return { monto: 50_000,  cod: "COD 621" };
  if (v <= 30_000_000) return { monto: 100_000, cod: "COD 622" };
  return                        { monto: 140_000, cod: "COD 628" };
}

// Tasas municipales — planilla Colegio de Escribanos, Febrero 2026
// transf: tasa de transferencia/empadronamiento (adquirente)
// libreDeuda: certificado libre deuda (transmitente); null = consultar
const MUNICIPIOS = {
  capital:    { label: "Capital",        transf: 0,      libreDeuda: 0      }, // exento ambos
  godoy_cruz: { label: "Godoy Cruz",     transf: 46_900, libreDeuda: null   },
  guaymallen: { label: "Guaymallén",     transf: 52_000, libreDeuda: null   },
  las_heras:  { label: "Las Heras",      transf: 75_000, libreDeuda: 4_800  },
  maipu:      { label: "Maipú",          transf: 40_000, libreDeuda: 12_803 },
  lavalle:    { label: "Lavalle",        transf: 29_001, libreDeuda: null   },
  lujan:      { label: "Luján",          transf: 47_000, libreDeuda: null   },
  san_martin: { label: "San Martín",     transf: 12_450, libreDeuda: null   },
  la_paz:     { label: "La Paz",         transf: 5_000,  libreDeuda: null   },
  rivadavia:  { label: "Rivadavia",      transf: 25_000, libreDeuda: null   },
  santa_rosa: { label: "Santa Rosa",     transf: 35_000, libreDeuda: null   },
  junin:      { label: "Junín",          transf: 25_000, libreDeuda: 3_000  },
  tunuyan:    { label: "Tunuyán",        transf: 28_000, libreDeuda: null   },
  tupungato:  { label: "Tupungato",      transf: 80_000, libreDeuda: null   },
  san_carlos: { label: "San Carlos",     transf: 28_000, libreDeuda: null   },
  malargue:   { label: "Malargüe",       transf: 0,      libreDeuda: null   }, // exento transferencia
  san_rafael: { label: "San Rafael",     transf: 18_000, libreDeuda: null   },
  gral_alvear:{ label: "General Alvear", transf: 18_000, libreDeuda: null   },
};

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

const fmt = n =>
  n == null ? null
  : "$ " + Math.round(n).toLocaleString("es-AR");

const parseMonto = s => {
  const n = parseFloat(
    String(s || "").replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "")
  );
  return isNaN(n) ? 0 : n;
};

const fmtInput = s => {
  const n = parseMonto(s);
  return n ? Math.round(n).toLocaleString("es-AR") : s;
};

/* ─── CÁLCULOS POR TIPO DE ACTO ──────────────────────────────────────────
   Cada función devuelve:
   { adquirente?, transmitente?, compartido?, unico?, notas }
   Cada sección es un array de { label, sub, valor, pendiente?, opcional? }
   valor=null → pendiente de confirmación
   ─────────────────────────────────────────────────────────────────────── */

function calcCompraventa({ valor, hojas, tracto, municipio }) {
  const v = parseMonto(valor);
  if (!v) return null;
  const hon      = Math.max(v * 0.02, MIN);
  const nHojas   = Math.max(1, Number(hojas) || 12);
  const llanas   = nHojas * LLANA;
  const aportes  = Math.max(v * APORTES_PCT, APORTES_MIN);
  const sellos   = v * SELLOS_INMUEBLE_PCT;
  const diligenc = DILIGENC_FIJ + v * DILIGENC_PCT;
  const estudio  = ESTUDIO_FIJ  + v * ESTUDIO_PCT;
  const tractoH  = tracto ? hon * 0.20 : 0;
  const insc     = calcInscripcionDominio(v);
  const muni     = MUNICIPIOS[municipio] || MUNICIPIOS.capital;

  return {
    adquirente: [
      { label: "Honorarios escribano",          sub: "2% del valor, mín $900.000 — Art. 2, Ley 5053",          valor: hon },
      { label: "Llanas y 1.er testimonio",      sub: `${nHojas} hojas × $9.000 — Art. 6.a1`,                   valor: llanas },
      { label: "Aportes Colegio Notarial",      sub: "0,40% del valor, mín $108.450 — Ley 3.364, Art. 54",     valor: aportes },
      { label: "Sellos ATM (50%)",              sub: "50% del 2% del valor — Ley Imp. 2026 n° 9680",           valor: sellos / 2 },
      { label: "Inscripción de dominio (Registro)", sub: `Planilla Registro 2026 — ${insc.cod}`,               valor: insc.monto },
      { label: "Tasa munic. transferencia",     sub: `${muni.label} — planilla Feb 2026${muni.transf === 0 ? " · exento" : ""}`, valor: muni.transf },
    ],
    transmitente: [
      { label: "Diligenciamiento certificados", sub: "$135.000 + 0,2% — Art. 6.c1",                            valor: diligenc },
      { label: "Estudio de títulos",            sub: "$135.000 + 0,3% — Art. 6.c2",                            valor: estudio },
      ...(tracto ? [{ label: "Tracto abreviado", sub: "20% de honorarios — Art. 5",                            valor: tractoH }] : []),
      { label: "Sellos ATM (50%)",              sub: "50% del 2% del valor — Ley Imp. 2026 n° 9680",           valor: sellos / 2 },
      { label: "Certificado de bloqueo",        sub: "1 inmueble vía portal — planilla Registro 2026",          valor: TASAS_REG.cert_bloqueo_portal },
      {
        label: "Libre deuda munic.",
        sub: `${muni.label} — planilla Feb 2026${muni.libreDeuda === null ? " · consultar" : muni.libreDeuda === 0 ? " · exento" : ""}`,
        valor: muni.libreDeuda,
        pendiente: muni.libreDeuda === null,
      },
      { label: "Retención ARCA / ITI",          sub: "3% del precio — solo si NO es única vivienda habitual del vendedor", valor: null, pendiente: true, opcional: true },
    ],
    notas: [
      "Sellos ATM: 2% total para inmuebles (Ley 9680); 50% a cargo de cada parte.",
      `Inscripción de dominio (Registro): ${fmt(insc.monto)} — tramo ${insc.cod} según valor.`,
      "Aportes Colegio: base = precio escriturado o 3–4× avalúo fiscal (el mayor). Mínimo $108.450 desde 01-07-2026.",
      "Libre deuda munic.: los valores son de la planilla Colegio, Feb 2026. Sujetos a actualización trimestral.",
      "ITI (ARCA): no aplica si el inmueble es la única vivienda habitual del vendedor.",
      "Cert. bloqueo: $6.500 portal / $7.800 ventanilla para 1 inmueble; +$3.900/$2.600 c/u adicional.",
    ],
  };
}

function calcCancelacion({ valor, hojas }) {
  const v = parseMonto(valor);
  if (!v) return null;
  const hon = Math.max(270_000 + v * 0.003, 360_000);
  const nHojas = Math.max(1, Number(hojas) || 8);
  return {
    unico: [
      { label: "Honorarios escribano", sub: "$270.000 + 0,3% del monto, mín $360.000 — Art. g.1", valor: hon },
      { label: "Llanas y testimonio",  sub: `${nHojas} hojas × $9.000 — Art. 6.a1`,               valor: nHojas * LLANA },
      { label: "Cancelación Registro (USUF/HIP/CAUTELAR)", sub: "Planilla Registro 2026 — COD específico", valor: TASAS_REG.cancelacion_hip },
    ],
    notas: ["Las cancelaciones generalmente no están sujetas a Impuesto de Sellos.", "Tasa Registro: $13.000 con tasa (planilla 2026). Urgente: $26.000."],
  };
}

function calcHipoteca({ valor, hojas }) {
  const v = parseMonto(valor);
  if (!v) return null;
  const hon = Math.max(v * 0.02, MIN);
  const nHojas = Math.max(1, Number(hojas) || 12);
  const sellos = v * SELLOS_PCT;
  return {
    unico: [
      { label: "Honorarios escribano", sub: "2% del monto del préstamo, mín $900.000 — regla general", valor: hon },
      { label: "Llanas y testimonio",  sub: `${nHojas} hojas × $9.000 — Art. 6.a1`,                   valor: nHojas * LLANA },
      { label: "Sellos ATM",           sub: "1% del monto del préstamo — Ley Imp. 2026 n° 9680",       valor: sellos },
      { label: "Inscripción Registro (hipoteca)", sub: "Estimado Apt. IV — planilla Registro 2026", valor: TASAS_REG.inscripcion_otros, pendiente: true },
    ],
    notas: ["Honorario por regla general (Art. 2) ya que constitución de hipoteca no está contemplada expresamente en el arancel."],
  };
}

function calcParticion({ valor, hojas }) {
  const v = parseMonto(valor);
  if (!v) return null;
  const hon = Math.max(v * 0.02, MIN);
  const nHojas = Math.max(1, Number(hojas) || 12);
  return {
    unico: [
      { label: "Honorarios escribano", sub: "2% del valor por bien, mín $900.000 — Art. g.8", valor: hon },
      { label: "Llanas y testimonio",  sub: `${nHojas} hojas × $9.000 — Art. 6.a1`,           valor: nHojas * LLANA },
    ],
    notas: ["El honorario se calcula por bien. Si la partición incluye varios bienes, multiplicar el honorario."],
  };
}

function calcPermuta({ valor }) {
  const v = parseMonto(valor);
  if (!v) return null;
  const hon = Math.max(v * 0.02, MIN);
  return {
    unico: [
      { label: "Honorarios escribano (por bien)", sub: "2% del valor por bien, mín $900.000 — Art. g.5", valor: hon },
    ],
    notas: ["El honorario se multiplica por la cantidad de bienes permutados."],
  };
}

function calcHerencia() {
  return {
    unico: [
      { label: "Honorarios escribano", sub: "Art. g.3", valor: 900_000 },
    ],
    notas: [],
  };
}

function calcDeclaratoria() {
  return {
    unico: [
      { label: "Honorarios escribano", sub: "Art. g.9", valor: 900_000 },
    ],
    notas: [],
  };
}

function calcAfectacionVivienda() {
  return {
    unico: [
      { label: "Honorarios escribano", sub: "Afectación a bien de familia — Art. g.1", valor: 450_000 },
    ],
    notas: [],
  };
}

function calcPoder({ tipo, otorgantes, asuntosExtra }) {
  const ots = Math.max(1, Number(otorgantes) || 1);
  const extras = Math.max(0, Number(asuntosExtra) || 0);
  const BASE = {
    especial_1asunto:    225_000,
    especial_irrevocable:270_000,
    gral_admin:          360_000,
    gral_amplio:         540_000,
    gral_juicios:        225_000,
  };
  const base = BASE[tipo] || 225_000;
  const porOtorgante = base * (1 + (ots - 1) * 0.5);
  const extras_hon = extras * 108_000;
  const hon = porOtorgante + extras_hon;

  const LABELS = {
    especial_1asunto:    "Poder especial (1 asunto) — Art. a.1",
    especial_irrevocable:"Poder especial irrevocable — Art. a.1",
    gral_admin:          "Poder general de administración — Art. a.3",
    gral_amplio:         "Poder general amplio — Art. a.4",
    gral_juicios:        "Poder general para juicios — Art. a.2",
  };

  return {
    unico: [
      {
        label: "Honorarios escribano",
        sub: `${LABELS[tipo] || "Poder"}${ots > 1 ? ` · ${ots} otorgantes (+50% c/u)` : ""}${extras > 0 ? ` · ${extras} asunto(s) extra ($108.000 c/u)` : ""}`,
        valor: hon,
      },
    ],
    notas: ots > 1 ? ["Por cada otorgante adicional el honorario se incrementa un 50%."] : [],
  };
}

function calcAsentimiento({ bienes, otorgantes }) {
  const bs = Math.max(1, Number(bienes) || 1);
  const ots = Math.max(1, Number(otorgantes) || 1);
  const hon = 225_000 * bs * (1 + (ots - 1) * 0.5);
  return {
    unico: [
      {
        label: "Honorarios escribano",
        sub: `$225.000 × ${bs} bien${bs > 1 ? "es" : ""}${ots > 1 ? ` · ${ots} otorgantes (+50% c/u)` : ""} — Art. B.1`,
        valor: hon,
      },
    ],
    notas: [],
  };
}

function calcCertFirma({ tipo, firmas }) {
  const f = Math.max(1, Number(firmas) || 1);
  const precio = tipo === "representacion" ? 63_000 : 45_000;
  const hon = precio * f;
  return {
    unico: [
      {
        label: "Honorarios escribano",
        sub: `${f} firma${f > 1 ? "s" : ""} × $${precio.toLocaleString("es-AR")} — Art. ${tipo === "representacion" ? "e.2" : "e.1"}`,
        valor: hon,
      },
    ],
    notas: [],
  };
}

function calcActa({ tipo }) {
  if (tipo === "fuera") {
    return {
      unico: [{ label: "Honorarios escribano", sub: "A convenir, mín $270.000 — Art. d.2", valor: 270_000 }],
      notas: ["El honorario es convencional; $270.000 es el mínimo legal."],
    };
  }
  return {
    unico: [{ label: "Honorarios escribano", sub: "En notaría: $180.000–$270.000 — Art. d.1", valor: 180_000 }],
    notas: ["El honorario varía entre $180.000 y $270.000 según la complejidad del acta."],
  };
}

function calcInventario({ valor }) {
  const v = parseMonto(valor);
  if (!v) return null;
  return {
    unico: [
      { label: "Honorarios escribano", sub: "2% del valor del inventario, mín $900.000 — Art. d.3", valor: Math.max(v * 0.02, MIN) },
    ],
    notas: [],
  };
}

function calcTestamento() {
  return {
    unico: [
      { label: "Honorarios escribano", sub: "Testamento por escritura pública — Art. g.2", valor: 1_350_000 },
    ],
    notas: ["Testamento a domicilio: convencional, mínimo $1.620.000."],
  };
}

function calcPromesa({ valor }) {
  const v = parseMonto(valor);
  if (!v) return null;
  const hon = Math.max(v * 0.01, 450_000);
  return {
    unico: [
      { label: "Honorarios escribano", sub: "1% del precio, mín $450.000 — Art. f.2", valor: hon },
    ],
    notas: ["50% al firmar la promesa; 50% al escriturar el contrato definitivo."],
  };
}

function calcLocacion({ tipo, valor }) {
  const v = parseMonto(valor);
  if (!v) return null;
  const cfg = {
    inmueble:       { pct: 0.02, min: 540_000, sub: "2% del valor total del contrato, mín $540.000 — Art. f.3.1" },
    fondo_comercio: { pct: 0.02, min: MIN,      sub: "2% del valor total del contrato, mín $900.000 — Art. f.3.3" },
    muebles:        { pct: 0.01, min: 270_000,  sub: "1% del valor total del contrato, mín $270.000 — Art. f.3.2" },
  }[tipo] || { pct: 0.02, min: 540_000, sub: "2% del valor total del contrato" };

  return {
    unico: [
      { label: "Honorarios escribano", sub: cfg.sub, valor: Math.max(v * cfg.pct, cfg.min) },
    ],
    notas: tipo === "inmueble" ? ["El valor total del contrato = alquiler mensual × cantidad de meses."] : [],
  };
}

function calcTransfFondo({ valor }) {
  const v = parseMonto(valor);
  if (!v) return null;
  return {
    unico: [
      { label: "Honorarios escribano", sub: "3% del monto, mín $900.000 — Art. f.5", valor: Math.max(v * 0.03, MIN) },
    ],
    notas: [],
  };
}

function calcSociedad({ tipo, capital }) {
  const c = parseMonto(capital);
  if (!c && tipo !== "civil_sin_est" && tipo !== "civil_con_est") return null;
  if (tipo === "civil_sin_est") return { unico: [{ label: "Honorarios escribano", sub: "Art. g.6", valor: 1_170_000 }], notas: [] };
  if (tipo === "civil_con_est") return { unico: [{ label: "Honorarios escribano", sub: "Art. g.6 (con estatuto)", valor: 2_700_000 }], notas: [] };
  return {
    unico: [
      { label: "Honorarios escribano", sub: "1% del capital social, mín $900.000 — Art. g.13", valor: Math.max(c * 0.01, MIN) },
    ],
    notas: ["Si la constitución incluye aporte de inmuebles, se aplican también Arts. 2, 3 y 9 de la ley."],
  };
}

function calcReglamentoPH({ unidades_vivienda, unidades_cochera }) {
  const uv = Math.max(0, Number(unidades_vivienda) || 0);
  const uc = Math.max(0, Number(unidades_cochera) || 0);
  const hon = uv * 900_000 + uc * 450_000;
  if (!hon) return null;
  return {
    unico: [
      {
        label: "Honorarios escribano",
        sub: `${uv} u. vivienda × $900.000 + ${uc} u. cochera × $450.000 — Art. g.10`,
        valor: hon,
      },
    ],
    notas: ["Espacios comunes: sin honorarios. Solicitar conformidad profesional para cocheras."],
  };
}

/* ─── DEFINICIÓN DE ACTOS ────────────────────────────────────────────────── */

const ACTOS = [
  // ── ESCRITURAS ─────────────────────────────────────────────────────────
  {
    id: "compraventa_inmueble", label: "Compraventa de Inmueble", grupo: "Escrituras",
    inputs: [
      { id: "valor",     label: "Valor de la operación",    type: "monto" },
      {
        id: "municipio", label: "Municipio del inmueble",   type: "select",
        options: Object.entries(MUNICIPIOS).map(([k, m]) => ({ value: k, label: m.label })),
        default: "capital",
      },
      { id: "hojas",  label: "Hojas del testimonio",        type: "number", default: 12 },
      { id: "tracto", label: "Tracto abreviado",            type: "boolean", default: false },
    ],
    calcular: calcCompraventa,
  },
  {
    id: "cancelacion_hipoteca", label: "Cancelación / Liberación de Hipoteca", grupo: "Escrituras",
    inputs: [
      { id: "valor", label: "Monto de la hipoteca",  type: "monto" },
      { id: "hojas", label: "Hojas del testimonio",  type: "number", default: 8 },
    ],
    calcular: calcCancelacion,
  },
  {
    id: "hipoteca", label: "Constitución de Hipoteca", grupo: "Escrituras",
    inputs: [
      { id: "valor", label: "Monto del préstamo",    type: "monto" },
      { id: "hojas", label: "Hojas del testimonio",  type: "number", default: 12 },
    ],
    calcular: calcHipoteca,
  },
  {
    id: "particion_extrajudicial", label: "Partición Extrajudicial", grupo: "Escrituras",
    inputs: [
      { id: "valor", label: "Valor del bien",        type: "monto" },
      { id: "hojas", label: "Hojas del testimonio",  type: "number", default: 12 },
    ],
    calcular: calcParticion,
  },
  {
    id: "permuta_inmueble", label: "Permuta de Inmueble (por bien)", grupo: "Escrituras",
    inputs: [
      { id: "valor", label: "Valor del bien",        type: "monto" },
    ],
    calcular: calcPermuta,
  },
  {
    id: "herencia_aceptacion", label: "Aceptación / Renuncia de Herencia", grupo: "Escrituras",
    inputs: [],
    calcular: calcHerencia,
  },
  {
    id: "declaratoria_dominio", label: "Declaratoria de Dominio", grupo: "Escrituras",
    inputs: [],
    calcular: calcDeclaratoria,
  },
  {
    id: "afectacion_vivienda", label: "Afectación a Bien de Familia", grupo: "Escrituras",
    inputs: [],
    calcular: calcAfectacionVivienda,
  },
  {
    id: "reglamento_ph", label: "Reglamento de Copropiedad PH", grupo: "Escrituras",
    inputs: [
      { id: "unidades_vivienda", label: "Unidades vivienda / comercio / oficina", type: "number", default: 1 },
      { id: "unidades_cochera",  label: "Unidades cochera",                        type: "number", default: 0 },
    ],
    calcular: calcReglamentoPH,
  },
  // ── PODERES ────────────────────────────────────────────────────────────
  {
    id: "poder", label: "Poder Notarial", grupo: "Poderes y Mandatos",
    inputs: [
      {
        id: "tipo", label: "Tipo de poder", type: "select",
        options: [
          { value: "especial_1asunto",     label: "Especial — 1 asunto ($225.000)" },
          { value: "especial_irrevocable", label: "Especial irrevocable ($270.000)" },
          { value: "gral_admin",           label: "General de administración ($360.000)" },
          { value: "gral_amplio",          label: "General amplio ($540.000)" },
          { value: "gral_juicios",         label: "General para juicios ($225.000)" },
        ],
        default: "especial_1asunto",
      },
      { id: "otorgantes",  label: "Número de otorgantes",        type: "number", default: 1 },
      { id: "asuntosExtra", label: "Asuntos adicionales (poder especial)", type: "number", default: 0 },
    ],
    calcular: calcPoder,
  },
  {
    id: "asentimiento_conyugal", label: "Asentimiento Conyugal", grupo: "Poderes y Mandatos",
    inputs: [
      { id: "bienes",     label: "Número de bienes",    type: "number", default: 1 },
      { id: "otorgantes", label: "Número de otorgantes", type: "number", default: 1 },
    ],
    calcular: calcAsentimiento,
  },
  // ── CERTIFICACIONES ───────────────────────────────────────────────────
  {
    id: "cert_firma", label: "Certificación de Firma", grupo: "Certificaciones",
    inputs: [
      {
        id: "tipo", label: "Modalidad", type: "select",
        options: [
          { value: "personal",       label: "En forma personal ($45.000/firma)" },
          { value: "representacion", label: "En representación ($63.000/firma)" },
        ],
        default: "personal",
      },
      { id: "firmas", label: "Número de firmas", type: "number", default: 1 },
    ],
    calcular: calcCertFirma,
  },
  // ── ACTAS ─────────────────────────────────────────────────────────────
  {
    id: "acta_notarial", label: "Acta Notarial", grupo: "Actas",
    inputs: [
      {
        id: "tipo", label: "Lugar", type: "select",
        options: [
          { value: "notaria", label: "En notaría ($180.000–$270.000)" },
          { value: "fuera",   label: "Fuera de notaría (convencional, mín $270.000)" },
        ],
        default: "notaria",
      },
    ],
    calcular: calcActa,
  },
  {
    id: "acta_inventario", label: "Acta de Inventario", grupo: "Actas",
    inputs: [
      { id: "valor", label: "Valor del inventario", type: "monto" },
    ],
    calcular: calcInventario,
  },
  // ── TESTAMENTOS ───────────────────────────────────────────────────────
  {
    id: "testamento_ep", label: "Testamento por Escritura Pública", grupo: "Testamentos",
    inputs: [],
    calcular: calcTestamento,
  },
  // ── DOCUMENTOS PRIVADOS ───────────────────────────────────────────────
  {
    id: "promesa_compraventa", label: "Promesa de Compraventa", grupo: "Documentos Privados",
    inputs: [
      { id: "valor", label: "Precio de la operación", type: "monto" },
    ],
    calcular: calcPromesa,
  },
  {
    id: "locacion", label: "Locación", grupo: "Documentos Privados",
    inputs: [
      {
        id: "tipo", label: "Tipo de locación", type: "select",
        options: [
          { value: "inmueble",       label: "Inmueble / arrendamiento rural (2%)" },
          { value: "muebles",        label: "Muebles / obra / servicio (1%)" },
          { value: "fondo_comercio", label: "Fondo de comercio (2%)" },
        ],
        default: "inmueble",
      },
      { id: "valor", label: "Valor total del contrato", type: "monto" },
    ],
    calcular: calcLocacion,
  },
  {
    id: "transferencia_fondo", label: "Transferencia de Fondo de Comercio", grupo: "Documentos Privados",
    inputs: [
      { id: "valor", label: "Monto de la transferencia", type: "monto" },
    ],
    calcular: calcTransfFondo,
  },
  // ── SOCIEDADES ────────────────────────────────────────────────────────
  {
    id: "sociedad", label: "Constitución de Sociedad", grupo: "Sociedades",
    inputs: [
      {
        id: "tipo", label: "Tipo", type: "select",
        options: [
          { value: "comercial",    label: "Comercial — SRL / SA (1% del capital)" },
          { value: "civil_sin_est",label: "Civil sin estatuto ($1.170.000)" },
          { value: "civil_con_est",label: "Civil con estatuto ($2.700.000)" },
        ],
        default: "comercial",
      },
      { id: "capital", label: "Capital social (para SRL / SA)", type: "monto" },
    ],
    calcular: calcSociedad,
  },
];

const GRUPOS_ORDEN = ["Escrituras", "Poderes y Mandatos", "Certificaciones", "Actas", "Testamentos", "Documentos Privados", "Sociedades"];

/* ─── COMPONENTES UI ─────────────────────────────────────────────────────── */

function SecTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase",
      color: "rgba(26,35,50,.4)", fontFamily: "'Montserrat',sans-serif", marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function ResultRow({ label, sub, valor, pendiente, opcional, showPrint, editMode, editValue, onEdit }) {
  const efectivo = editValue !== undefined ? editValue : valor;
  const editado  = editValue !== undefined;
  const fmtValor = fmt(efectivo);

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "9px 0", borderBottom: "1px solid rgba(26,35,50,.05)",
      opacity: opcional ? 0.7 : 1,
    }}>
      <div style={{ flex: 1, paddingRight: 12 }}>
        <div style={{ fontSize: 13, color: C.dark, fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
          {label}
          {opcional && <span style={{ fontSize: 10, color: C.muted }}>(condicional)</span>}
          {editado && <span style={{ fontSize: 10, color: "#3a7ca5", fontWeight: 700 }}>editado</span>}
        </div>
        {sub && !showPrint && (
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", marginTop: 1 }}>{sub}</div>
        )}
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        {editMode && !pendiente ? (
          <input
            key={String(efectivo)}
            type="text"
            inputMode="numeric"
            defaultValue={efectivo != null ? Math.round(efectivo).toLocaleString("es-AR") : ""}
            onBlur={e => {
              const raw = e.target.value.replace(/\./g, "").replace(",", ".");
              const n   = parseFloat(raw);
              onEdit(!isNaN(n) ? n : undefined);
            }}
            style={{
              width: 130, textAlign: "right", padding: "4px 8px",
              border: `1.5px solid ${editado ? "#3a7ca5" : "rgba(26,35,50,.2)"}`,
              borderRadius: 6,
              background: editado ? "rgba(58,124,165,.06)" : "#fff",
              fontSize: 13, fontWeight: 600, color: C.dark,
              fontFamily: "'Montserrat',sans-serif", outline: "none",
            }}
          />
        ) : pendiente && efectivo == null ? (
          <span style={{ fontSize: 12, color: "#e67e22", fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>
            pendiente
          </span>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, fontFamily: "'Montserrat',sans-serif" }}>
            {fmtValor}
          </span>
        )}
      </div>
    </div>
  );
}

function PartyBlock({ title, lineas, showPrint, section, editMode, overrides, onOverride }) {
  const total = lineas.reduce((s, l, i) => {
    const key = `${section}:${i}`;
    const v   = overrides[key] !== undefined ? overrides[key] : l.valor;
    if (v != null && (!l.pendiente || overrides[key] !== undefined)) return s + v;
    return s;
  }, 0);

  return (
    <div style={{
      background: "#FDFCFA", borderRadius: 10,
      border: "1px solid rgba(26,35,50,.09)",
      padding: "16px 18px",
      flex: 1, minWidth: 0,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
        color: C.cerulean, fontFamily: "'Montserrat',sans-serif", marginBottom: 12,
      }}>
        {title}
      </div>
      {lineas.map((l, i) => {
        const key = `${section}:${i}`;
        return (
          <ResultRow key={i} {...l} showPrint={showPrint}
            editMode={editMode}
            editValue={overrides[key]}
            onEdit={v => onOverride(key, v)}
          />
        );
      })}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 12, marginTop: 4,
      }}>
        <span style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter',sans-serif" }}>
          Total confirmado
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.dark, fontFamily: "'Montserrat',sans-serif" }}>
          {fmt(total)}
        </span>
      </div>
    </div>
  );
}

/* ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────── */

const INP_STYLE = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid rgba(26,35,50,.18)", background: "#FDFCFA",
  fontSize: 14, color: "#1a2332", fontFamily: "'Inter',sans-serif",
  outline: "none", boxSizing: "border-box",
};

export function PresupuestoNotarial({ onBack }) {
  const [tipoId, setTipoId] = useState("compraventa_inmueble");
  const [inputs, setInputs] = useState({});
  const [showPrint, setShowPrint] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState({});

  const actoDef = useMemo(() => ACTOS.find(a => a.id === tipoId), [tipoId]);

  const set = (id, val) => setInputs(prev => ({ ...prev, [id]: val }));

  const onOverride = (key, val) => setOverrides(prev =>
    val !== undefined
      ? { ...prev, [key]: val }
      : (({ [key]: _, ...rest }) => rest)(prev)
  );
  const hasOverrides = Object.keys(overrides).length > 0;

  const getVal = (inp) => {
    if (inp.id in inputs) return inputs[inp.id];
    if ("default" in inp) return inp.default;
    return "";
  };

  const resultado = useMemo(() => {
    if (!actoDef) return null;
    const args = {};
    actoDef.inputs.forEach(inp => { args[inp.id] = getVal(inp); });
    try { return actoDef.calcular(args); } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoId, inputs, actoDef]);

  const handleChangeTipo = (id) => {
    setTipoId(id);
    setInputs({});
    setOverrides({});
    setEditMode(false);
  };

  // resultado con overrides aplicados (para print y total)
  const resultadoEfectivo = useMemo(() => {
    if (!resultado) return null;
    const apply = (lineas, section) => lineas?.map((l, i) => {
      const key = `${section}:${i}`;
      return overrides[key] !== undefined ? { ...l, valor: overrides[key], pendiente: false } : l;
    });
    return {
      ...resultado,
      adquirente:   apply(resultado.adquirente,   "adquirente"),
      transmitente: apply(resultado.transmitente,  "transmitente"),
      compartido:   apply(resultado.compartido,    "compartido"),
      unico:        apply(resultado.unico,         "unico"),
    };
  }, [resultado, overrides]);

  const tieneSplit = resultado && (resultado.adquirente || resultado.transmitente);

  const totalGlobal = useMemo(() => {
    if (!resultadoEfectivo) return 0;
    const secciones = [
      ...(resultadoEfectivo.adquirente  || []),
      ...(resultadoEfectivo.transmitente || []),
      ...(resultadoEfectivo.compartido  || []),
      ...(resultadoEfectivo.unico       || []),
    ];
    return secciones.filter(l => l.valor != null && !l.pendiente).reduce((s, l) => s + l.valor, 0);
  }, [resultadoEfectivo]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ed", overflow: "hidden" }}>

      {/* ── HEADER ── */}
      <div style={{
        background: C.dark, padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: "transparent", border: "none",
          color: "rgba(253,252,250,.6)", cursor: "pointer",
          fontSize: 13, fontFamily: "'Inter',sans-serif",
        }}>
          ← Utilidades
        </button>
        <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14 }}>
          Presupuesto Notarial
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
          background: "rgba(201,169,97,.2)", color: "#c9a961",
          fontFamily: "'Montserrat',sans-serif", letterSpacing: ".04em", textTransform: "uppercase",
        }}>
          Ley 5053-8100 · Mar 2026
        </span>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 40px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* ── PANEL IZQUIERDO: inputs ── */}
          <div style={{
            width: 300, flexShrink: 0,
            background: "#FDFCFA", borderRadius: 12,
            border: "1px solid rgba(26,35,50,.1)",
            padding: "20px 20px",
          }}>
            <SecTitle>Tipo de acto</SecTitle>

            {/* Selector agrupado */}
            <select
              value={tipoId}
              onChange={e => handleChangeTipo(e.target.value)}
              style={{ ...INP_STYLE, marginBottom: 20, cursor: "pointer" }}
            >
              {GRUPOS_ORDEN.map(grupo => {
                const actos = ACTOS.filter(a => a.grupo === grupo);
                if (!actos.length) return null;
                return (
                  <optgroup key={grupo} label={grupo}>
                    {actos.map(a => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>

            {actoDef && actoDef.inputs.length > 0 && (
              <>
                <SecTitle>Parámetros</SecTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {actoDef.inputs.map(inp => (
                    <div key={inp.id}>
                      <label style={{
                        fontSize: 12, color: C.muted, fontFamily: "'Inter',sans-serif",
                        display: "block", marginBottom: 5,
                      }}>
                        {inp.label}
                      </label>

                      {inp.type === "monto" && (
                        <div style={{ position: "relative" }}>
                          <span style={{
                            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                            fontSize: 14, color: C.muted, fontFamily: "'Inter',sans-serif",
                          }}>$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={getVal(inp)}
                            onChange={e => set(inp.id, e.target.value.replace(/[^0-9.,]/g, ""))}
                            placeholder="0"
                            style={{ ...INP_STYLE, paddingLeft: 24 }}
                          />
                        </div>
                      )}

                      {inp.type === "number" && (
                        <input
                          type="number"
                          min={inp.min ?? 0}
                          value={getVal(inp)}
                          onChange={e => set(inp.id, e.target.value)}
                          style={INP_STYLE}
                        />
                      )}

                      {inp.type === "boolean" && (
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={!!getVal(inp)}
                            onChange={e => set(inp.id, e.target.checked)}
                            style={{ width: 16, height: 16, cursor: "pointer" }}
                          />
                          <span style={{ fontSize: 13, color: C.dark, fontFamily: "'Inter',sans-serif" }}>Sí</span>
                        </label>
                      )}

                      {inp.type === "select" && (
                        <select
                          value={getVal(inp)}
                          onChange={e => set(inp.id, e.target.value)}
                          style={{ ...INP_STYLE, cursor: "pointer" }}
                        >
                          {(inp.options || []).map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Nota de actualización */}
            <div style={{
              marginTop: 24, padding: "10px 12px", borderRadius: 8,
              background: "rgba(230,126,34,.07)", border: "1px solid rgba(230,126,34,.2)",
            }}>
              <div style={{ fontSize: 11, color: "#a05a10", fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
                Datos: Ley 5053-8100, Ley Imp. 9680 y planilla Colegio Feb 2026. <strong>Tasas municipales sujetas a actualización trimestral.</strong>
              </div>
            </div>
          </div>

          {/* ── PANEL DERECHO: resultados ── */}
          <div style={{ flex: 1, minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>

            {!resultado ? (
              <div style={{
                background: "#FDFCFA", borderRadius: 12, border: "1px solid rgba(26,35,50,.1)",
                padding: "40px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 13, color: C.muted, fontFamily: "'Inter',sans-serif" }}>
                  Ingresá los datos del acto para ver el presupuesto.
                </div>
              </div>
            ) : (
              <>
                {/* Modo split (transmitente / adquirente) */}
                {tieneSplit && (
                  <>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {resultado.adquirente && (
                        <PartyBlock title="Adquirente (comprador)" lineas={resultado.adquirente} showPrint={showPrint}
                          section="adquirente" editMode={editMode} overrides={overrides} onOverride={onOverride} />
                      )}
                      {resultado.transmitente && (
                        <PartyBlock title="Transmitente (vendedor)" lineas={resultado.transmitente} showPrint={showPrint}
                          section="transmitente" editMode={editMode} overrides={overrides} onOverride={onOverride} />
                      )}
                    </div>
                    {resultado.compartido?.length > 0 && (
                      <div style={{
                        background: "#FDFCFA", borderRadius: 10,
                        border: "1px solid rgba(26,35,50,.09)", padding: "14px 18px",
                      }}>
                        <div style={{
                          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: ".06em", color: "#7f8c8d",
                          fontFamily: "'Montserrat',sans-serif", marginBottom: 10,
                        }}>
                          A cargo de ambas partes
                        </div>
                        {resultado.compartido.map((l, i) => {
                          const key = `compartido:${i}`;
                          return <ResultRow key={i} {...l} showPrint={showPrint}
                            editMode={editMode} editValue={overrides[key]} onEdit={v => onOverride(key, v)} />;
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Modo único */}
                {resultado.unico && (
                  <div style={{
                    background: "#FDFCFA", borderRadius: 10,
                    border: "1px solid rgba(26,35,50,.09)", padding: "16px 18px",
                  }}>
                    <SecTitle>Honorarios y gastos</SecTitle>
                    {resultado.unico.map((l, i) => {
                      const key = `unico:${i}`;
                      return <ResultRow key={i} {...l} showPrint={showPrint}
                        editMode={editMode} editValue={overrides[key]} onEdit={v => onOverride(key, v)} />;
                    })}
                  </div>
                )}

                {/* Total global */}
                <div style={{
                  background: C.dark, borderRadius: 10, padding: "16px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: "rgba(253,252,250,.7)", fontFamily: "'Inter',sans-serif" }}>
                      Total estimado (ítems confirmados)
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(253,252,250,.45)", fontFamily: "'Inter',sans-serif", marginTop: 2 }}>
                      Excluye conceptos pendientes de confirmación
                    </div>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif" }}>
                    {fmt(totalGlobal)}
                  </span>
                </div>

                {/* Notas */}
                {resultado.notas?.length > 0 && (
                  <div style={{
                    background: "rgba(26,35,50,.04)", borderRadius: 8,
                    padding: "12px 16px",
                  }}>
                    {resultado.notas.map((n, i) => (
                      <div key={i} style={{
                        fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif",
                        lineHeight: 1.5, marginBottom: i < resultado.notas.length - 1 ? 4 : 0,
                      }}>
                        • {n}
                      </div>
                    ))}
                  </div>
                )}

                {/* Acciones */}
                <div style={{ display: "flex", gap: 8, alignSelf: "flex-end", flexWrap: "wrap" }}>
                  {hasOverrides && (
                    <button onClick={() => setOverrides({})} style={{
                      padding: "11px 16px", borderRadius: 8,
                      background: "transparent", border: "1px solid rgba(26,35,50,.2)",
                      color: C.dark, fontFamily: "'Montserrat',sans-serif",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}>
                      ↺ Restaurar
                    </button>
                  )}
                  <button onClick={() => setEditMode(m => !m)} style={{
                    padding: "11px 16px", borderRadius: 8,
                    background: editMode ? "rgba(58,124,165,.1)" : "transparent",
                    border: `1px solid ${editMode ? "#3a7ca5" : "rgba(26,35,50,.2)"}`,
                    color: editMode ? "#3a7ca5" : C.dark,
                    fontFamily: "'Montserrat',sans-serif",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    {editMode ? "✓ Listo" : "✎ Editar valores"}
                  </button>
                  <button onClick={() => setShowPrint(true)} style={{
                    padding: "11px 20px", borderRadius: 8,
                    background: C.dark, border: "none",
                    color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>
                    Imprimir para cliente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL PRINT ── */}
      {showPrint && resultadoEfectivo && (
        <PrintModal
          actoDef={actoDef}
          resultado={resultadoEfectivo}
          totalGlobal={totalGlobal}
          inputs={inputs}
          tieneSplit={tieneSplit}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

/* ─── PRINT MODAL ─────────────────────────────────────────────────────────── */

function PrintModal({ actoDef, resultado, totalGlobal, inputs, tieneSplit, onClose }) {
  const hoy = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

  const renderLineas = (lineas) => lineas.map((l, i) => (
    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
      <td style={{ padding: "7px 0", fontSize: 12, color: "#333", fontFamily: "'Inter',sans-serif" }}>
        {l.label}
        {l.opcional ? <span style={{ fontSize: 10, color: "#999", marginLeft: 4 }}>(condicional)</span> : null}
      </td>
      <td style={{ padding: "7px 0", textAlign: "right", fontSize: 12, fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>
        {l.pendiente && l.valor == null
          ? <span style={{ color: "#e67e22" }}>a confirmar</span>
          : fmt(l.valor)}
      </td>
    </tr>
  ));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(26,35,50,.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 12, maxWidth: 680, width: "100%",
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 12px 60px rgba(26,35,50,.35)",
      }} onClick={e => e.stopPropagation()}>

        <div id="presupuesto-print" style={{ padding: "40px 44px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28, borderBottom: "2px solid #1a2332", paddingBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#666", fontFamily: "'Montserrat',sans-serif", marginBottom: 6 }}>
              Presupuesto estimativo
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a2332", fontFamily: "'Montserrat',sans-serif", marginBottom: 4 }}>
              Honorarios y Gastos Notariales
            </div>
            <div style={{ fontSize: 12, color: "#666", fontFamily: "'Inter',sans-serif" }}>
              {actoDef.label} · {hoy}
            </div>
          </div>

          {/* Contenido */}
          {tieneSplit ? (
            <>
              {resultado.adquirente && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#3a7ca5", marginBottom: 8, fontFamily: "'Montserrat',sans-serif" }}>
                    Adquirente (Comprador)
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>{renderLineas(resultado.adquirente)}</tbody>
                  </table>
                </div>
              )}
              {resultado.transmitente && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#3a7ca5", marginBottom: 8, fontFamily: "'Montserrat',sans-serif" }}>
                    Transmitente (Vendedor)
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>{renderLineas(resultado.transmitente)}</tbody>
                  </table>
                </div>
              )}
              {resultado.compartido?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#7f8c8d", marginBottom: 8, fontFamily: "'Montserrat',sans-serif" }}>
                    A cargo de ambas partes
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>{renderLineas(resultado.compartido)}</tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
              <tbody>{renderLineas(resultado.unico || [])}</tbody>
            </table>
          )}

          {/* Total */}
          <div style={{
            background: "#1a2332", borderRadius: 8, padding: "14px 18px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 16,
          }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", fontFamily: "'Inter',sans-serif" }}>
              Total estimado (ítems confirmados)
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "'Montserrat',sans-serif" }}>
              {fmt(totalGlobal)}
            </span>
          </div>

          {/* Pie */}
          <div style={{
            marginTop: 20, padding: "12px 14px", background: "#fef9f0",
            borderRadius: 8, border: "1px solid #f0d9a0",
          }}>
            <div style={{ fontSize: 10, color: "#8a6a20", fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>
              Los conceptos indicados como "a confirmar" corresponden a tasas del Registro de la Propiedad, municipales o retenciones impositivas cuyo monto exacto se determinará al momento de la escrituración. Los honorarios notariales son estimativos y se actualizan trimestralmente por el Colegio de Escribanos de Mendoza (Ley 5053-8100, vigente 25-03-2026). Sellos ATM: 2% para inmuebles / 1% general (Ley Impositiva 2026 n° 9680).
            </div>
          </div>
        </div>

        {/* Botones */}
        <div style={{
          padding: "16px 44px 24px",
          display: "flex", gap: 12, justifyContent: "flex-end",
          borderTop: "1px solid rgba(26,35,50,.08)",
        }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(26,35,50,.18)",
            background: "transparent", color: C.dark,
            fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            Cerrar
          </button>
          <button onClick={() => window.print()} style={{
            padding: "9px 18px", borderRadius: 8, border: "none",
            background: C.dark, color: "#FDFCFA",
            fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            Imprimir / PDF
          </button>
        </div>
      </div>
    </div>
  );
}
