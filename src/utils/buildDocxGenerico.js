import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } from "docx";
import JSZip from "jszip";
import { buildVars, sustituirVars } from "./templateVars";

async function inyectarMargenesSimetricos(blob) {
  const buf = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const file = zip.file("word/settings.xml");
  if (!file) return blob;
  let xml = await file.async("string");
  if (!xml.includes("w:mirrorMargins")) {
    xml = xml.replace("</w:settings>", "<w:mirrorMargins/></w:settings>");
    zip.file("word/settings.xml", xml);
  }
  const nuevo = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([nuevo], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

// Variables que siempre van en negrita
const VARS_BOLD = new Set([
  'PARTE_1_COMPLETO','PARTE_2_COMPLETO','PARTE_3_COMPLETO','PARTE_4_COMPLETO',
  'PARTE_1_APELLIDO','PARTE_2_APELLIDO','PARTE_3_APELLIDO','PARTE_4_APELLIDO',
  'PARTE_1_NOMBRE',  'PARTE_2_NOMBRE',  'PARTE_3_NOMBRE',  'PARTE_4_NOMBRE',
  'PARTE_1_ROL',     'PARTE_2_ROL',     'PARTE_3_ROL',     'PARTE_4_ROL',
  'ESCRIBANO_NOMBRE',
  // Datos del rodado
  'VEHICULO_MARCA','VEHICULO_MODELO','VEHICULO_TIPO_DESC',
  'VEHICULO_DOMINIO','VEHICULO_CHASIS','VEHICULO_MOTOR',
  // Fecha en letras
  'FECHA_DIA_LETRAS','FECHA_MES_LETRAS','FECHA_ANIO_LETRAS','FECHA_CIUDAD',
]);

// Variables que siempre van subrayadas
const VARS_UNDERLINE = new Set([
  'PARTE_1_COMPLETO','PARTE_2_COMPLETO','PARTE_3_COMPLETO','PARTE_4_COMPLETO',
]);

/**
 * Pre-procesa el texto eliminando variables vacías junto con la coma adyacente.
 * Evita el patrón ", , " cuando un campo opcional (ej: estado_civil) está vacío.
 */
function limpiarVarsVacias(texto, vars) {
  // Quitar ", {{VAR}}" cuando VAR es vacío o no existe
  let r = texto.replace(/,\s*\{\{([^}]+)\}\}/g, (m, key) =>
    (vars[key] == null || vars[key] === "") ? "" : m);
  // Quitar "{{VAR}}, " cuando VAR es vacío o no existe
  r = r.replace(/\{\{([^}]+)\}\}\s*,/g, (m, key) =>
    (vars[key] == null || vars[key] === "") ? "" : m);
  return r;
}

/**
 * Parsea texto con marcadores de formato y variables:
 *   **texto**     → negrita
 *   __texto__     → subrayado
 *   ~~texto~~     → dato ingresado por el usuario (seg.fromUser = true → azul con showVarHighlight)
 *   {{VAR}}       → sustitución (con bold/underline automáticos según VARS_*)
 *
 * Los marcadores son anidables: ~~**__nombre__**~~ = nombre negrita+subrayado+azul.
 * Los constructores de bloque en templateVars.js (PARTES_CF_BLOQUE, PARTES_F08_BLOQUE,
 * AUTORIZANTE_TEXTO, AUTORIZADOS_TEXTO, PARTE_N_IDENTIDAD, PARTE_N_IDENTIDAD_ACTA) deben
 * envolver todos los valores ingresados por el usuario con ~~ para que el resaltado funcione.
 *
 * Colores con showVarHighlight activado:
 *   rojo  (C0392B) → variable del template sin valor ({{VAR}} vacía)
 *   azul  (2E75B6) → dato de parte/persona ingresado en modal
 *   sin color      → texto fijo del template
 */
function parsearSegmentos(texto, vars, ctxBold = false, ctxUnderline = false, boldVars = VARS_BOLD, underlineVars = VARS_UNDERLINE, ctxFromUser = false) {
  const segments = [];
  // ~~texto~~ = dato ingresado por el usuario (coloreable con showVarHighlight)
  const re = /\*\*(.+?)\*\*|__(.+?)__|(?<!~)~~(?!~)(.+?)(?<!~)~~(?!~)|{{([^}]+)}}/gs;
  let last = 0, m;

  while ((m = re.exec(texto)) !== null) {
    if (m.index > last) {
      const plain = texto.slice(last, m.index);
      if (plain) segments.push({ text: plain, bold: ctxBold, underline: ctxUnderline, fromUser: ctxFromUser });
    }

    if (m[1] !== undefined) {
      // **bold**
      segments.push(...parsearSegmentos(m[1], vars, true, ctxUnderline, boldVars, underlineVars, ctxFromUser));
    } else if (m[2] !== undefined) {
      // __underline__
      segments.push(...parsearSegmentos(m[2], vars, ctxBold, true, boldVars, underlineVars, ctxFromUser));
    } else if (m[3] !== undefined) {
      // ~~dato de usuario~~
      segments.push(...parsearSegmentos(m[3], vars, ctxBold, ctxUnderline, boldVars, underlineVars, true));
    } else if (m[4] !== undefined) {
      // {{VAR}}
      const key = m[4];
      const found = vars[key] !== undefined;
      const val = found ? String(vars[key]) : `{{${key}}}`;
      if (val) {
        const boldVar  = ctxBold || boldVars.has(key);
        const ulVar    = ctxUnderline || underlineVars.has(key);
        const emptyVar = !found || val === "";
        if (val.includes("**") || val.includes("__") || val.includes("~~")) {
          const sub = parsearSegmentos(val, vars, boldVar, ulVar, boldVars, underlineVars, ctxFromUser);
          sub.forEach(s => { s.fromVar = true; s.emptyVar = emptyVar; });
          segments.push(...sub);
        } else {
          segments.push({ text: val, bold: boldVar, underline: ulVar, fromVar: true, emptyVar, fromUser: ctxFromUser });
        }
      }
    }

    last = m.index + m[0].length;
  }

  if (last < texto.length) {
    const plain = texto.slice(last);
    if (plain) segments.push({ text: plain, bold: ctxBold, underline: ctxUnderline, fromUser: ctxFromUser });
  }

  return segments;
}

const mm2twip = (mm) => Math.round(mm * 56.69);

const MARGENES = {
  protocolar:   { top: mm2twip(75), bottom: mm2twip(16), left: mm2twip(36), right: mm2twip(14) },
  noprotocolar: { top: mm2twip(25), bottom: mm2twip(25), left: mm2twip(30), right: mm2twip(25) },
};

// Línea solo con mayúsculas → título centrado
const ES_TITULO = (linea) => /^[A-ZÁÉÍÓÚ\s]{6,}$/.test(linea.trim());

export async function buildDocxGenerico({
  contenido,
  partes, escribano, fecha, protocolo, instrumento,
  margenKey = "protocolar",
  fontSize = 11,
  fuente,
  interlineado,
  datosExtra = {},
  extravars = {},
  rolesContextuales = null,
  vehiculos = [],
  estilos = {},
}) {
  const {
    nombresNegrita    = true,
    nombresSubrayado  = true,
    fechaNegrita      = true,
    vehiculoNegrita   = true,
    escribanoNegrita  = true,
    showVarHighlight  = false,
  } = estilos;

  // VARS_BOLD dinámico según estilos
  const VARS_BOLD_DYN = new Set([
    ...(nombresNegrita   ? ['PARTE_1_COMPLETO','PARTE_2_COMPLETO','PARTE_3_COMPLETO','PARTE_4_COMPLETO',
                            'PARTE_1_APELLIDO','PARTE_2_APELLIDO','PARTE_3_APELLIDO','PARTE_4_APELLIDO',
                            'PARTE_1_NOMBRE',  'PARTE_2_NOMBRE',  'PARTE_3_NOMBRE',  'PARTE_4_NOMBRE',
                            'PARTE_1_ROL',     'PARTE_2_ROL',     'PARTE_3_ROL',     'PARTE_4_ROL'] : []),
    ...(escribanoNegrita ? ['ESCRIBANO_NOMBRE'] : []),
    ...(fechaNegrita     ? ['FECHA_DIA_LETRAS','FECHA_MES_LETRAS','FECHA_ANIO_LETRAS','FECHA_CIUDAD'] : []),
    ...(vehiculoNegrita  ? ['VEHICULO_MARCA','VEHICULO_MODELO','VEHICULO_TIPO_DESC','VEHICULO_DOMINIO','VEHICULO_CHASIS','VEHICULO_MOTOR'] : []),
  ]);
  const VARS_UNDERLINE_DYN = new Set([
    ...(nombresSubrayado ? ['PARTE_1_COMPLETO','PARTE_2_COMPLETO','PARTE_3_COMPLETO','PARTE_4_COMPLETO'] : []),
  ]);
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2;
  const margin = MARGENES[margenKey] || MARGENES.protocolar;
  const lineSpacing = interlineado?.line || 276;
  const lineRule   = interlineado?.rule || "auto";

  const vars = {
    ...buildVars({ partes, escribano, fecha, protocolo, instrumento, extravars, rolesContextuales, vehiculos, estilos }),
    ...datosExtra,
  };

  // Derivar variantes de TIPO_VEHICULO (default "VEHÍCULO" si no se seleccionó)
  {
    const tv = (vars.TIPO_VEHICULO || "VEHÍCULO").trim().toUpperCase();
    if (!vars.TIPO_VEHICULO) vars.TIPO_VEHICULO = tv;
    vars.TIPO_VEHICULO_MIN = tv === "MOTOVEHÍCULO" ? "moto vehículo" : "vehículo";
  }

  // Documentos notariales no tienen puntos y aparte: sin \n literales ni saltos múltiples
  const lineas = (contenido || "")
    .replace(/\\n/g, " ")
    .replace(/\r?\n(\r?\n)+/g, "\n")
    .split("\n");
  const lang = { value: "es-AR", eastAsia: "es-AR", bidi: "es-AR" };

  const parrafos = lineas.map(linea => {
    const textoRaw = linea.trim();
    const texto = limpiarVarsVacias(textoRaw, vars);
    const textoSustituido = sustituirVars(texto.replace(/\*\*(.+?)\*\*|__(.+?)__/g, '$1$2'), vars);
    const esTitulo = ES_TITULO(textoSustituido);
    const segmentos = parsearSegmentos(texto, vars, esTitulo, false, VARS_BOLD_DYN, VARS_UNDERLINE_DYN);

    return new Paragraph({
      alignment: esTitulo ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { line: lineSpacing, lineRule, after: esTitulo ? 80 : 0 },
      children: segmentos.map(seg => new TextRun({
        text:      seg.text,
        size,
        font:      fontName,
        bold:      seg.bold,
        underline: seg.underline ? { type: UnderlineType.SINGLE } : undefined,
        language:  lang,
        color:     showVarHighlight && seg.fromVar && seg.emptyVar ? "C0392B" : undefined,
        highlight: showVarHighlight && seg.fromUser ? "yellow" : undefined,
      })),
    });
  });

  const doc = new Document({
    sections: [{ properties: { page: { margin } }, children: parrafos }],
  });

  const blob = await Packer.toBlob(doc);
  // Inyectar márgenes simétricos para documentos protocolar
  return margenKey === "protocolar" ? inyectarMargenesSimetricos(blob) : blob;
}
