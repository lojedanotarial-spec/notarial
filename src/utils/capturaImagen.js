// Preparar las fotos del celular antes de subirlas: reducirlas (lado mayor 2000 px, JPEG 0,85 ≈ 300–600 KB).
// Pasar por canvas también borra los metadatos (ubicación GPS, modelo del celular) y normaliza el formato:
// las fotos HEIC de un iPhone las decodifica Safari y salen como JPEG.
//
// Dos orígenes: un archivo (galería, PDF) y un fotograma de la cámara en vivo (nunca dispara el flash).
// Memoria: se procesa de a UNA foto (la cola está en la página) y cada lienzo se libera apenas se usa, porque en
// un celular varias fotos de 12 MP decodificadas a la vez agotan la memoria. Spec: specs/captura-documentos-celular/.

export const LADO_MAXIMO = 2000;
export const CALIDAD_JPEG = 0.85;
export const MAX_BYTES_ARCHIVO = 3 * 1024 * 1024; // lo mismo que acepta el servidor
const LADO_MINIATURA = 160;

// Escala para que el lado mayor no pase de `max` (nunca agranda).
export function calcularEscala(ancho, alto, max = LADO_MAXIMO) {
  const mayor = Math.max(ancho, alto);
  return mayor > max ? max / mayor : 1;
}

export function dimensionesFinales(ancho, alto, max = LADO_MAXIMO) {
  const e = calcularEscala(ancho, alto, max);
  return { ancho: Math.max(1, Math.round(ancho * e)), alto: Math.max(1, Math.round(alto * e)) };
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

// Un canvas deja su memoria ocupada hasta que el navegador lo recoge (en Safari tarda): se achica a 0 apenas se usa.
function liberar(canvas) { canvas.width = 0; canvas.height = 0; }

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

// Dibuja `fuente` (imagen o fotograma de video) reducida y la devuelve como JPEG + miniatura.
function comprimir(fuente, anchoOriginal, altoOriginal) {
  const { ancho, alto } = dimensionesFinales(anchoOriginal, altoOriginal);
  const canvas = document.createElement("canvas");
  canvas.width = ancho; canvas.height = alto;
  canvas.getContext("2d").drawImage(fuente, 0, 0, ancho, alto);
  const base64 = canvas.toDataURL("image/jpeg", CALIDAD_JPEG).split(",")[1];

  const mini = document.createElement("canvas");
  const e = LADO_MINIATURA / Math.max(ancho, alto);
  mini.width = Math.max(1, Math.round(ancho * e)); mini.height = Math.max(1, Math.round(alto * e));
  mini.getContext("2d").drawImage(canvas, 0, 0, mini.width, mini.height);
  const vista = mini.toDataURL("image/jpeg", 0.6);

  liberar(canvas); liberar(mini);
  if (bytesDeBase64(base64) > MAX_BYTES_ARCHIVO) throw new Error("La foto pesa demasiado. Probá con una más chica.");
  return { base64, mediaType: "image/jpeg", vista };
}

// Fotograma de la cámara en vivo -> { base64, mediaType, vista }. Capturar el fotograma de un <video> no usa el
// flash del teléfono (a diferencia de la cámara nativa que abre un selector de archivos).
export function capturarFotograma(video) {
  const ancho = video?.videoWidth, alto = video?.videoHeight;
  if (!ancho || !alto) throw new Error("La cámara todavía no está lista");
  return comprimir(video, ancho, alto);
}

// File (foto o PDF) -> { base64, mediaType, vista } listo para subir. `vista` es una miniatura (data URL).
export async function prepararArchivo(archivo) {
  if (esPdf(archivo)) {
    if (archivo.size > MAX_BYTES_ARCHIVO) throw new Error("El PDF pesa más de 3 MB. Sacale una foto a cada página.");
    return { base64: await leerComoBase64(archivo), mediaType: "application/pdf", vista: null };
  }
  const { img, url } = await cargarImagen(archivo);
  try {
    return comprimir(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
  } finally {
    URL.revokeObjectURL(url);
    img.src = ""; // suelta la imagen decodificada
  }
}
