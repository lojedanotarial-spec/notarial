import { describe, it, expect } from "vitest";
import { crearSb, T0 } from "./_driveHarness.js";
import { crearAlmacenFalso } from "./_almacenFalso.js";
import fs from "node:fs";
import { purgarArchivosPropios, purgarArchivosSiHayAlmacen } from "../../api/_almacenPurga.js";

const DIA = 24 * 60 * 60 * 1000;
const hace = (dias) => new Date(T0 - dias * DIA).toISOString();
const K1 = "853/exp/e1/a1", K2 = "853/exp/e1/a2", K3 = "9876/lote/l1/a3";

function armar({ archivos = [], cola = [], almacenOpts } = {}) {
  const tablas = { expediente_archivos: archivos, archivos_a_purgar: cola, drive_auditoria: [] };
  const sb = crearSb(tablas);
  const almacen = crearAlmacenFalso(almacenOpts);
  for (const k of [K1, K2, K3]) almacen.poner(k, "x");
  const purgar = (extra = {}) => purgarArchivosPropios({ sb, almacen, ahora: T0, ...extra });
  return { tablas, almacen, purgar };
}
const fila = (id, clave, extra = {}) => ({ id, expediente_id: "e1", lote_id: null, almacen: "propio", clave, borrado_en: null, ...extra });

describe("purga de archivos borrados hace más de 30 días", () => {
  it("elimina el objeto y la fila, y deja el rastro en el historial", async () => {
    const { tablas, almacen, purgar } = armar({ archivos: [fila("a1", K1, { borrado_en: hace(31) })] });
    expect(await purgar()).toMatchObject({ archivos: 1, errores: 0 });
    expect(almacen.objetos.has(K1)).toBe(false);
    expect(tablas.expediente_archivos).toHaveLength(0);
    expect(tablas.drive_auditoria).toEqual([expect.objectContaining({ accion: "purgar", registro_numero: "853", expediente_id: "e1" })]);
  });

  it("de un lote deja el rastro con el lote", async () => {
    const { tablas, purgar } = armar({ archivos: [fila("a3", K3, { expediente_id: null, lote_id: "l1", borrado_en: hace(40) })] });
    await purgar();
    expect(tablas.drive_auditoria[0]).toMatchObject({ registro_numero: "9876", lote_id: "l1", expediente_id: null });
  });

  it("no toca lo vigente, lo borrado hace menos de 30 días ni lo que no es del almacén propio", async () => {
    const { tablas, almacen, purgar } = armar({
      archivos: [
        fila("a1", K1),
        fila("a2", K2, { borrado_en: hace(29) }),
        { id: "d1", expediente_id: "e1", almacen: "escribania", clave: null, drive_file_id: "g1", borrado_en: hace(90) },
      ],
    });
    expect(await purgar()).toMatchObject({ archivos: 0, errores: 0 });
    expect(tablas.expediente_archivos).toHaveLength(3);
    expect(almacen.borrar).not.toHaveBeenCalled();
  });

  it("si el objeto no se puede borrar, conserva la fila para reintentar y sigue con los demás", async () => {
    const { tablas, almacen, purgar } = armar({
      archivos: [fila("a1", K1, { borrado_en: hace(31) }), fila("a2", K2, { borrado_en: hace(31) })],
      almacenOpts: { fallarAlBorrar: (k) => k === K1 },
    });
    expect(await purgar()).toMatchObject({ archivos: 1, errores: 1 });
    expect(tablas.expediente_archivos.map((f) => f.id)).toEqual(["a1"]);
    expect(almacen.objetos.has(K1)).toBe(true);
    expect(almacen.objetos.has(K2)).toBe(false);
  });

  it("jamás borra una clave que no sea definitiva (temporal, truncada o ajena al formato)", async () => {
    const { tablas, almacen, purgar } = armar({
      archivos: [
        fila("m1", "tmp/abc", { borrado_en: hace(31) }),
        fila("m2", "853", { borrado_en: hace(31) }),
        fila("m3", "../x/exp/e1/a1", { borrado_en: hace(31) }),
      ],
    });
    expect(await purgar()).toMatchObject({ archivos: 0, errores: 3 });
    expect(almacen.borrar).not.toHaveBeenCalled();
    expect(tablas.expediente_archivos).toHaveLength(3);
  });

  it("respeta el límite por corrida", async () => {
    const { tablas, purgar } = armar({ archivos: [fila("a1", K1, { borrado_en: hace(31) }), fila("a2", K2, { borrado_en: hace(31) })] });
    expect(await purgar({ limite: 1 })).toMatchObject({ archivos: 1 });
    expect(tablas.expediente_archivos).toHaveLength(1);
  });
});

describe("purga de la cola (expedientes y lotes borrados)", () => {
  it("elimina los objetos vencidos y los saca de la cola; deja los que aún no vencen", async () => {
    const { tablas, almacen, purgar } = armar({
      cola: [
        { clave: K1, purgar_en: new Date(T0 - DIA).toISOString() },
        { clave: K2, purgar_en: new Date(T0 + DIA).toISOString() },
      ],
    });
    expect(await purgar()).toMatchObject({ huerfanos: 1, errores: 0 });
    expect(almacen.objetos.has(K1)).toBe(false);
    expect(almacen.objetos.has(K2)).toBe(true);
    expect(tablas.archivos_a_purgar.map((c) => c.clave)).toEqual([K2]);
    expect(tablas.drive_auditoria).toEqual([expect.objectContaining({ accion: "purgar", registro_numero: "853" })]);
  });

  it("si el objeto ya no existe, igual limpia la cola", async () => {
    const { tablas, purgar } = armar({ cola: [{ clave: "853/exp/e9/zz", purgar_en: hace(1) }] });
    expect(await purgar()).toMatchObject({ huerfanos: 1, errores: 0 });
    expect(tablas.archivos_a_purgar).toHaveLength(0);
  });

  it("si falla el borrado, la clave queda en la cola para la próxima corrida", async () => {
    const { tablas, purgar } = armar({
      cola: [{ clave: K1, purgar_en: hace(1) }, { clave: K2, purgar_en: hace(1) }],
      almacenOpts: { fallarAlBorrar: (k) => k === K1 },
    });
    expect(await purgar()).toMatchObject({ huerfanos: 1, errores: 1 });
    expect(tablas.archivos_a_purgar.map((c) => c.clave)).toEqual([K1]);
  });

  it("ignora claves inválidas de la cola sin borrar nada", async () => {
    const { tablas, almacen, purgar } = armar({ cola: [{ clave: "tmp/abc", purgar_en: hace(1) }] });
    expect(await purgar()).toMatchObject({ huerfanos: 0, errores: 1 });
    expect(almacen.borrar).not.toHaveBeenCalled();
    expect(tablas.archivos_a_purgar).toHaveLength(1);
  });
});

describe("disparadores (Worker horario y backup diario)", () => {
  const ENV = { ARCHIVOS_R2_ACCOUNT_ID: "c", ARCHIVOS_R2_ACCESS_KEY_ID: "i", ARCHIVOS_R2_SECRET_ACCESS_KEY: "s", ARCHIVOS_R2_BUCKET: "b" };

  it("sin variables del almacén no hace nada y no falla", async () => {
    const r = await purgarArchivosSiHayAlmacen({}, { env: {} });
    expect(r).toEqual({ omitida: "sin almacén configurado" });
  });

  it("con almacén configurado purga", async () => {
    const { tablas, almacen } = armar({ archivos: [fila("a1", K1, { borrado_en: hace(31) })] });
    const sb = crearSb(tablas);
    const r = await purgarArchivosSiHayAlmacen(sb, { env: ENV, crear: () => almacen });
    expect(r).toMatchObject({ archivos: 1 });
  });

  it("si el almacén falla, devuelve el error en lugar de lanzarlo (no tumba la purga de capturas ni el backup)", async () => {
    const sbRoto = { from: () => { throw new Error("base caída"); } };
    const r = await purgarArchivosSiHayAlmacen(sbRoto, { env: ENV, crear: () => crearAlmacenFalso() });
    expect(r).toEqual({ error: "base caída" });
  });

  it("el Worker (api/captura.js, acción purgar) y el backup diario llaman a la purga de archivos", () => {
    expect(fs.readFileSync("api/captura.js", "utf8")).toMatch(/purgarArchivosSiHayAlmacen\(sb\)/);
    expect(fs.readFileSync("api/cron/backup.js", "utf8")).toMatch(/purgarArchivosSiHayAlmacen\(clienteServicio\(\)\)/);
  });
});
