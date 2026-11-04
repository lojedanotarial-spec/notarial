import JSZip from "jszip";
import { DOCX_MIME } from "./docxMime";

// Activa "márgenes simétricos" (espejo) en un .docx generado por la librería docx.
// Los documentos protocolares notariales se imprimen a doble faz con margen interno mayor.
export async function inyectarMargenesSimetricos(blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const file = zip.file("word/settings.xml");
  if (!file) return blob;
  let xml = await file.async("string");
  if (!xml.includes("w:mirrorMargins")) {
    xml = xml.replace("</w:settings>", "<w:mirrorMargins/></w:settings>");
    zip.file("word/settings.xml", xml);
  }
  return new Blob([await zip.generateAsync({ type: "arraybuffer" })], { type: DOCX_MIME });
}
