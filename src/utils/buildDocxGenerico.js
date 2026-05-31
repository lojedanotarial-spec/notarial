import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { buildVars, sustituirVars } from "./templateVars";

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
}) {
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2;
  const margin = MARGENES[margenKey] || MARGENES.protocolar;

  const lineSpacing = interlineado?.line || 276;
  const lineRule   = interlineado?.rule || "auto";

  const vars = { ...buildVars({ partes, escribano, fecha, protocolo, instrumento }), ...datosExtra };
  const textoFinal = sustituirVars(contenido || "", vars);

  const lineas = textoFinal.split("\n");

  const parrafos = lineas.map(linea => {
    const texto = linea.trim();
    const esTitulo = ES_TITULO(texto);

    return new Paragraph({
      alignment: esTitulo ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { line: lineSpacing, lineRule, after: esTitulo ? 80 : 0 },
      children: [
        new TextRun({
          text: texto,
          size,
          font: fontName,
          bold: esTitulo,
          language: { value: "es-AR", eastAsia: "es-AR", bidi: "es-AR" },
        }),
      ],
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
