// Arma el comprimido de "Descargar todo" en el navegador. Baja los archivos de a uno (cuida la memoria) y los va sumando.
// `traer(archivo)` devuelve el Blob (en la app: el servidor, con la sesión del usuario) y `JSZip` se inyecta para probarlo.
// Un archivo que no se puede bajar no frena a los demás: se cuenta en `fallidos` y el comprimido sale con el resto.
import { nombresParaZip } from "./driveCliente";

export const CANCELADO = "cancelado";

// `debeParar()` se consulta antes de cada archivo: si devuelve true se corta y se lanza Error("cancelado").
export async function armarZip(archivos, { traer, JSZip, onProgreso, debeParar } = {}) {
  const zip = new JSZip();
  const fallidos = [];
  const lista = nombresParaZip(archivos);
  for (const [i, { archivo, nombre }] of lista.entries()) {
    if (debeParar?.()) throw new Error(CANCELADO);
    onProgreso?.({ hechos: i, total: lista.length, actual: nombre });
    try {
      zip.file(nombre, await traer(archivo));
    } catch {
      fallidos.push(archivo.nombre);
    }
  }
  onProgreso?.({ hechos: lista.length, total: lista.length, actual: null, armando: true });
  // Las fotos y los PDF ya vienen comprimidos: se guardan tal cual (más rápido y sin gastar memoria del navegador).
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  return { blob: new Blob([bytes], { type: "application/zip" }), fallidos, incluidos: lista.length - fallidos.length };
}
