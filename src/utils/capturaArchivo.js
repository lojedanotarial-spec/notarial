// Fotos para ARCHIVAR (subir desde el celular al expediente): calidad original, sin reducir.
// A diferencia de capturaImagen.js (que achica a 2000 px para que la IA lea rápido), acá no se toca el tamaño de lo
// que viene de la cámara del teléfono o de la galería, y el fotograma de la cámara de la página sale a la mayor
// resolución que el teléfono entregue. Spec: specs/documentacion-celular-expediente/.

// Un canvas deja su memoria ocupada hasta que el navegador lo recoge (en Safari tarda): se achica a 0 apenas se usa.
function liberar(canvas) { canvas.width = 0; canvas.height = 0; }

export const CALIDAD_ARCHIVO = 0.92;

// Fotograma de la cámara en vivo -> File JPEG a resolución completa del video. Capturar el fotograma de un <video> no
// usa el flash. Se usa toBlob (no toDataURL): una foto de 12 MP en base64 llena la memoria de un teléfono modesto.
export function fotogramaAFile(video, nombre, calidad = CALIDAD_ARCHIVO) {
  const ancho = video?.videoWidth, alto = video?.videoHeight;
  if (!ancho || !alto) return Promise.reject(new Error("La cámara todavía no está lista"));
  const canvas = document.createElement("canvas");
  canvas.width = ancho; canvas.height = alto;
  canvas.getContext("2d").drawImage(video, 0, 0, ancho, alto);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      liberar(canvas);
      if (!blob) return reject(new Error("No pude sacar la foto, probá de nuevo."));
      resolve(new File([blob], nombre, { type: "image/jpeg" }));
    }, "image/jpeg", calidad);
  });
}

// Miniatura chica (data URL) para mostrar en la lista sin decodificar la foto entera una y otra vez (cuida la memoria).
// Si el navegador no puede abrir ese formato (por ejemplo HEIC en algunos equipos), devuelve null y se muestra un ícono.
export async function miniaturaDe(file, lado = 140) {
  try {
    if (!file?.type?.startsWith("image/") || typeof createImageBitmap !== "function") return null;
    const bmp = await createImageBitmap(file);
    const e = lado / Math.max(bmp.width, bmp.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * Math.min(1, e)));
    canvas.height = Math.max(1, Math.round(bmp.height * Math.min(1, e)));
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const url = canvas.toDataURL("image/jpeg", 0.6);
    liberar(canvas);
    return url;
  } catch {
    return null;
  }
}
