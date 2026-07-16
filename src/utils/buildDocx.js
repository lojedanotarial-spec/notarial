import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import JSZip from "jszip";

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

const mm2twip = (mm) => Math.round(mm * 56.69);

export async function buildDocxBlanco({ escribano, margenKey = "protocolar", fontSize = 11, fuente, estilos = {} }) {
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2;
  const margenes = margenKey === "protocolar"
    ? { top: mm2twip(10), bottom: mm2twip(10), left: mm2twip(35), right: mm2twip(20) }
    : { top: mm2twip(20), bottom: mm2twip(20), left: mm2twip(25), right: mm2twip(25) };

  const escribanoNombre = (estilos.escribanoUppercase ?? true)
    ? (escribano?.nombre || "").toUpperCase()
    : (escribano?.nombre || "");

  const doc = new Document({
    sections: [{
      properties: { page: { margin: margenes } },
      children: [
        new Paragraph({
          children: [new TextRun({ text: escribanoNombre, bold: estilos.escribanoNegrita ?? true, size, font: fontName })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ children: [new TextRun({ text: "", size, font: fontName })] }),
      ],
    }],
  });
  return Packer.toBlob(doc);
}


