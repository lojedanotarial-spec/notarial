// Lector de documentos (DNI, tarjeta verde…): lee una foto o un PDF con la IA y devuelve los datos de las personas.
// Antes vivía dentro de PartesEditor.jsx; se comparte con las fichas de personas del expediente (specs/personas-expediente/).
import { enviarAVision } from "./apiFetch";

// Renderiza una página de PDF a un canvas, con el mismo tope de 1200px y
// misma calidad JPEG que ya se usa para fotos -- así un PDF entra por el
// camino liviano que ya funciona, en vez de mandar los bytes crudos (que
// pueden ser varios MB por una sola foto de DNI escaneada con el celular).
async function rasterizarPaginaPdf(page) {
  const MAX = 1200;
  const base = page.getViewport({ scale: 1 });
  const scale = MAX / Math.max(base.width, base.height);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
}

// Un DNI/tarjeta verde escaneado a PDF es casi siempre 1 página -- tope
// para no colgar el navegador si por error se elige un PDF de muchas.
const MAX_PAGINAS_PDF = 3;

async function rasterizarPdf(archivo) {
  const pdfjsLib = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await archivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const paginas = Math.min(pdf.numPages, MAX_PAGINAS_PDF);
  const base64s = [];
  for (let i = 1; i <= paginas; i++) {
    base64s.push(await rasterizarPaginaPdf(await pdf.getPage(i)));
  }
  return base64s;
}

export async function escanearDocumento(archivo) {
  if (archivo.type === "application/pdf") {
    const paginas = await rasterizarPdf(archivo);
    let acumulado = null;
    for (const base64 of paginas) {
      acumulado = mergePersonas(acumulado, await enviarAVision(base64, "image/jpeg"));
    }
    return acumulado;
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const base64 = canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
      enviarAVision(base64, "image/jpeg").then(resolve).catch(reject);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Merge de dos resultados de visión: usa el primer valor no vacío de cada campo
export function mergePersonas(base, nuevo) {
  if (!base) return nuevo;
  const p1 = base?.personas?.[0] || {};
  const p2 = nuevo?.personas?.[0] || {};
  const m = (a, b) => a || b;
  return {
    ...base,
    personas: [{
      apellido:     m(p1.apellido,     p2.apellido),
      nombre:       m(p1.nombre,       p2.nombre),
      nro_doc:      m(p1.nro_doc,      p2.nro_doc),
      tipo_doc:     m(p1.tipo_doc,     p2.tipo_doc),
      genero:       m(p1.genero,       p2.genero),
      fecha_nac:    m(p1.fecha_nac,    p2.fecha_nac),
      estado_civil: m(p1.estado_civil, p2.estado_civil),
      nacionalidad: m(p1.nacionalidad, p2.nacionalidad),
      calle:        m(p1.calle,        p2.calle),
      numero:       m(p1.numero,       p2.numero),
      localidad:    m(p1.localidad,    p2.localidad),
      departamento: m(p1.departamento, p2.departamento),
      barrio:       m(p1.barrio,       p2.barrio),
      manzana:      m(p1.manzana,      p2.manzana),
      casa:         m(p1.casa,         p2.casa),
    }],
  };
}
