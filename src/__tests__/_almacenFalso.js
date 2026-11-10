// Almacén de mentira para los tests de la API: guarda los objetos en memoria con la misma interfaz que
// `crearAlmacen` de api/_almacen.js.
import { vi } from "vitest";

export function crearAlmacenFalso({ fallarAlBorrar = () => false } = {}) {
  const objetos = new Map(); // clave -> { bytes: Buffer, tipo }
  const poner = (clave, bytes, tipo = "image/jpeg") => objetos.set(clave, { bytes: Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes), tipo });
  return {
    objetos,
    poner,
    // Simula que el navegador ya subió el archivo a la dirección firmada.
    ponerGrande: (clave, tamano, tipo = "image/jpeg") => objetos.set(clave, { bytes: { length: tamano }, tipo }),
    firmarSubida: vi.fn(async (clave) => `https://r2.falso/${clave}?firma=1`),
    consultar: vi.fn(async (clave) => {
      const o = objetos.get(clave);
      return o ? { tamano: o.bytes.length, tipo: o.tipo } : null;
    }),
    copiar: vi.fn(async (origen, destino) => {
      const o = objetos.get(origen);
      if (!o) throw new Error(`copiar: no existe ${origen}`);
      objetos.set(destino, { ...o });
    }),
    borrar: vi.fn(async (clave) => {
      if (fallarAlBorrar(clave)) throw new Error(`no pude borrar ${clave}`);
      objetos.delete(clave);
    }),
    leer: vi.fn(async (clave) => {
      const o = objetos.get(clave);
      if (!o) return null;
      return new Response(o.bytes, { headers: { "content-length": String(o.bytes.length), "content-type": o.tipo } });
    }),
  };
}
