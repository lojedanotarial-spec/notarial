import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } from "docx";
import { buildVars, sustituirVars } from "./templateVars";

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
 *   {{VAR}}       → sustitución (con bold/underline automáticos según VARS_*)
 * Los marcadores son anidables: __**texto**__ = negrita + subrayado
 */
function parsearSegmentos(texto, vars, ctxBold = false, ctxUnderline = false) {
  const segments = [];
  const re = /\*\*(.+?)\*\*|__(.+?)__|{{([^}]+)}}/gs;
  let last = 0, m;

  while ((m = re.exec(texto)) !== null) {
    if (m.index > last) {
      const plain = texto.slice(last, m.index);
      if (plain) segments.push({ text: plain, bold: ctxBold, underline: ctxUnderline });
    }

    if (m[1] !== undefined) {
      // **bold**
      segments.push(...parsearSegmentos(m[1], vars, true, ctxUnderline));
    } else if (m[2] !== undefined) {
      // __underline__
      segments.push(...parsearSegmentos(m[2], vars, ctxBold, true));
    } else if (m[3] !== undefined) {
      // {{VAR}}
      const key = m[3];
      const val = vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
      if (val) {
        const boldVar = ctxBold || VARS_BOLD.has(key);
        const ulVar   = ctxUnderline || VARS_UNDERLINE.has(key);
        // Si el valor contiene marcadores de formato, procesarlos recursivamente
        if (val.includes("**") || val.includes("__")) {
          segments.push(...parsearSegmentos(val, vars, boldVar, ulVar));
        } else {
          segments.push({ text: val, bold: boldVar, underline: ulVar });
        }
      }
    }

    last = m.index + m[0].length;
  }

  if (last < texto.length) {
    const plain = texto.slice(last);
    if (plain) segments.push({ text: plain, bold: ctxBold, underline: ctxUnderline });
  }

  return segments;
}

const mm2twip = (mm) => Math.round(mm * 56.69);

const MARGENES = {
  protocolar:   { top: mm2twip(76), bottom: mm2twip(20), left: mm2twip(36), right: mm2twip(15) },
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
}) {
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2;
  const margin = MARGENES[margenKey] || MARGENES.protocolar;
  const lineSpacing = interlineado?.line || 276;
  const lineRule   = interlineado?.rule || "auto";

  const vars = {
    ...buildVars({ partes, escribano, fecha, protocolo, instrumento, extravars, rolesContextuales, vehiculos }),
    ...datosExtra,
  };

  // Derivar variantes de TIPO_VEHICULO (default "VEHÍCULO" si no se seleccionó)
  {
    const tv = (vars.TIPO_VEHICULO || "VEHÍCULO").trim().toUpperCase();
    if (!vars.TIPO_VEHICULO) vars.TIPO_VEHICULO = tv;
    vars.TIPO_VEHICULO_MIN = tv === "MOTOVEHÍCULO" ? "moto vehículo" : "vehículo";
  }

  const lineas = (contenido || "").split("\n");
  const lang = { value: "es-AR", eastAsia: "es-AR", bidi: "es-AR" };

  const parrafos = lineas.map(linea => {
    const textoRaw = linea.trim();
    const texto = limpiarVarsVacias(textoRaw, vars);
    const textoSustituido = sustituirVars(texto.replace(/\*\*(.+?)\*\*|__(.+?)__/g, '$1$2'), vars);
    const esTitulo = ES_TITULO(textoSustituido);
    const segmentos = parsearSegmentos(texto, vars, esTitulo, false);

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
      })),
    });
  });

  const doc = new Document({
    sections: [{ properties: { page: { margin } }, children: parrafos }],
  });

  return Packer.toBlob(doc);
}
