import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { buildVars, sustituirVars } from "./templateVars";

// Variables que siempre van en negrita en el documento final
const VARS_BOLD = new Set([
  'PARTE_1_COMPLETO','PARTE_2_COMPLETO','PARTE_3_COMPLETO','PARTE_4_COMPLETO',
  'PARTE_1_APELLIDO','PARTE_2_APELLIDO','PARTE_3_APELLIDO','PARTE_4_APELLIDO',
  'PARTE_1_NOMBRE',  'PARTE_2_NOMBRE',  'PARTE_3_NOMBRE',  'PARTE_4_NOMBRE',
  'PARTE_1_ROL',     'PARTE_2_ROL',     'PARTE_3_ROL',     'PARTE_4_ROL',
  'ESCRIBANO_NOMBRE',
]);

// Sustituye variables y devuelve segmentos [{text, bold}]
function sustituirConFormato(texto, vars) {
  const segments = [];
  let remaining = texto;
  while (remaining.length) {
    const s = remaining.indexOf('{{');
    if (s === -1) { segments.push({ text: remaining, bold: false }); break; }
    const e = remaining.indexOf('}}', s);
    if (e === -1) { segments.push({ text: remaining, bold: false }); break; }
    if (s > 0) segments.push({ text: remaining.slice(0, s), bold: false });
    const key = remaining.slice(s + 2, e);
    const val = vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
    if (val) segments.push({ text: val, bold: VARS_BOLD.has(key) });
    remaining = remaining.slice(e + 2);
  }
  return segments;
}

const mm2twip = (mm) => Math.round(mm * 56.69);

const MARGENES = {
  protocolar:    { top: mm2twip(76), bottom: mm2twip(20), left: mm2twip(36), right: mm2twip(15) },
  noprotocolar:  { top: mm2twip(25), bottom: mm2twip(25), left: mm2twip(30), right: mm2twip(25) },
};

// Líneas que van centradas (títulos del instrumento)
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
}) {
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2;
  const margin = MARGENES[margenKey] || MARGENES.protocolar;

  const lineSpacing = interlineado?.line || 276;
  const lineRule   = interlineado?.rule || "auto";

  const vars = {
    ...buildVars({ partes, escribano, fecha, protocolo, instrumento, extravars }),
    ...datosExtra,
  };

  const lineas = (contenido || "").split("\n");
  const lang = { value: "es-AR", eastAsia: "es-AR", bidi: "es-AR" };

  const parrafos = lineas.map(linea => {
    const texto = linea.trim();
    const textoSustituido = sustituirVars(texto, vars);
    const esTitulo = ES_TITULO(textoSustituido);
    const segmentos = sustituirConFormato(texto, vars);

    return new Paragraph({
      alignment: esTitulo ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { line: lineSpacing, lineRule, after: esTitulo ? 80 : 0 },
      children: segmentos.map(seg => new TextRun({
        text: seg.text,
        size,
        font: fontName,
        bold: esTitulo || seg.bold,
        language: lang,
      })),
    });
  });

  const doc = new Document({
    sections: [{
      properties: { page: { margin } },
      children: parrafos,
    }],
  });

  return Packer.toBlob(doc);
}
