// Parte con DOM del escáner (la lógica pura está en escanerDocumento.js): mirar una imagen o un fotograma y devolver dónde
// recortar. El recorte se calcula sobre la foto FINAL, no sobre el visor: así no importa si la foto sale con otro
// encuadre que la vista previa ni si el documento se movió un poco entre la detección y el disparo.
import { ANCHO_ANALISIS, aGris, analizarCuadro, distanciaRect, recorteConMargen } from "./escanerDocumento";

// Cuánto puede diferir lo que se ve en la foto de lo que el visor detectó, para considerar que es el mismo documento.
const TOLERANCIA_MISMO_DOCUMENTO = 0.12;
// Si el recorte ya es casi toda la imagen, no vale la pena tocarla.
const RECORTE_INUTIL = 0.94;

// `fuente`: video, canvas o ImageBitmap de `ancho`×`alto`. Devuelve { sx, sy, sw, sh } en píxeles de la fuente, o null.
export function recorteDeFuente(fuente, ancho, alto, rectVivo) {
  try {
    if (!rectVivo || !ancho || !alto) return null;
    const w = ANCHO_ANALISIS, h = Math.max(1, Math.round((w * alto) / ancho));
    const lienzo = document.createElement("canvas");
    lienzo.width = w; lienzo.height = h;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(fuente, 0, 0, w, h);
    const datos = ctx.getImageData(0, 0, w, h).data;
    lienzo.width = 0; lienzo.height = 0;
    const a = analizarCuadro(aGris(datos, w * h), w, h);
    if (!a.rect || distanciaRect(a.rect, rectVivo) > TOLERANCIA_MISMO_DOCUMENTO) return null;
    const r = recorteConMargen(a.rect, ancho, alto);
    if ((r.sw * r.sh) / (ancho * alto) > RECORTE_INUTIL) return null;
    return r;
  } catch {
    return null;
  }
}
