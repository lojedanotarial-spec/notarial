// Preparar las fotos del celular antes de subirlas: reducirlas (lado mayor 2000 px, JPEG 0,85 ≈ 300–600 KB).
// Pasar por canvas también borra los metadatos (ubicación GPS, modelo del celular) y normaliza el formato:
// las fotos HEIC de un iPhone las decodifica Safari y salen como JPEG.
// Spec: specs/captura-documentos-celular/.

export const LADO_MAXIMO = 2000;
export const CALIDAD_JPEG = 0.85;
export const MAX_BYTES_ARCHIVO = 3 * 1024 * 1024; // lo mismo que acepta el servidor

// Escala para que el lado mayor no pase de `max` (nunca agranda).
export function calcularEscala(ancho, alto, max = LADO_MAXIMO) {
  const mayor = Math.max(ancho, alto);
  return mayor > max ? max / mayor : 1;
}

// Bytes reales de un string base64 (sin decodificarlo).
export function bytesDeBase64(b64) {
  const limpio = String(b64 || "");
  const relleno = limpio.endsWith("==") ? 2 : limpio.endsWith("=") ? 1 : 0;
  return Math.floor((limpio.length * 3) / 4) - relleno;
}

export function esPdf(archivo) {
  return archivo?.type === "application/pdf" || /\.pdf$/i.test(archivo?.name || "");
}

function leerComoBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("No pude leer el archivo"));
    r.readAsDataURL(blob);
  });
}

function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No pude abrir esta imagen")); };
    img.src = url;
  });
}

// File (foto o PDF) -> { base64, mediaType, vista } listo para subir. `vista` es una miniatura (data URL).
export async function prepararArchivo(archivo) {
  if (esPdf(archivo)) {
    if (archivo.size > MAX_BYTES_ARCHIVO) throw new Error("El PDF pesa más de 3 MB. Sacale una foto a cada página.");
    return { base64: await leerComoBase64(archivo), mediaType: "application/pdf", vista: null };
  }
  const { img, url } = await cargarImagen(archivo);
  try {
    const escala = calcularEscala(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const ancho = Math.max(1, Math.round((img.naturalWidth || img.width) * escala));
    const alto = Math.max(1, Math.round((img.naturalHeight || img.height) * escala));
    const canvas = document.createElement("canvas");
    canvas.width = ancho; canvas.height = alto;
    canvas.getContext("2d").drawImage(img, 0, 0, ancho, alto);
    const dataUrl = canvas.toDataURL("image/jpeg", CALIDAD_JPEG);
    const base64 = dataUrl.split(",")[1];
    if (bytesDeBase64(base64) > MAX_BYTES_ARCHIVO) throw new Error("La foto pesa demasiado. Probá con una más chica.");
    // Miniatura chica para la lista (no se sube)
    const mini = document.createElement("canvas");
    const e2 = 160 / Math.max(ancho, alto);
    mini.width = Math.round(ancho * e2); mini.height = Math.round(alto * e2);
    mini.getContext("2d").drawImage(canvas, 0, 0, mini.width, mini.height);
    return { base64, mediaType: "image/jpeg", vista: mini.toDataURL("image/jpeg", 0.6) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
