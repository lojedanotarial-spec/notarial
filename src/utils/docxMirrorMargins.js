import JSZip from "jszip";

/**
 * Recibe un Blob docx generado por la librería docx y devuelve un nuevo Blob
 * con márgenes simétricos (espejo) activados en word/settings.xml.
 * Requerido para documentos protocolar notariales argentinos.
 */
export async function aplicarMargenesSimetricos(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const settingsFile = zip.file("word/settings.xml");
  if (!settingsFile) return blob; // fallback: devolver sin cambio

  let xml = await settingsFile.async("string");

  // Insertar <w:mirrorMargins/> justo antes del cierre </w:settings>
  if (!xml.includes("w:mirrorMargins")) {
    xml = xml.replace("</w:settings>", "<w:mirrorMargins/></w:settings>");
    zip.file("word/settings.xml", xml);
  }

  const newBuffer = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([newBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
