import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { buildVars, sustituirVars } from "./templateVars";

const mm2twip = (mm) => Math.round(mm * 56.69);

const MARGENES = {
  protocolar:   { top: mm2twip(76), bottom: mm2twip(20), left: mm2twip(36), right: mm2twip(15) },
  noProtocolar: { top: mm2twip(35), bottom: mm2twip(20), left: mm2twip(30), right: mm2twip(20) },
};

// Líneas que van centradas (títulos del instrumento)
const ES_TITULO = (linea) => /^[A-ZÁÉÍÓÚ\s]{6,}$/.test(linea.trim());

export async function buildDocxGenerico({
  contenido,
  partes, escribano, fecha, protocolo, instrumento,
  margenKey = "protocolar",
  fontSize = 11,
  fuente,
  datosExtra = {},
}) {
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2;
  const margin = MARGENES[margenKey] || MARGENES.protocolar;

  const vars = { ...buildVars({ partes, escribano, fecha, protocolo, instrumento }), ...datosExtra };
  const textoFinal = sustituirVars(contenido || "", vars);

  const lineas = textoFinal.split("\n");

  const parrafos = lineas.map(linea => {
    const texto = linea.trim();
    const esTitulo = ES_TITULO(texto);

    return new Paragraph({
      alignment: esTitulo ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { line: 276, after: esTitulo ? 80 : 0 },
      children: [
        new TextRun({
          text: texto,
          size,
          font: fontName,
          bold: esTitulo,
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
