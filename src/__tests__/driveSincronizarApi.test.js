// Sincronizar con Drive (api/drive.js, acción `sincronizar`) y limpieza a los 30 días. Si alguien borra un archivo directo en Drive,
// Notarial lo oculta; ante cualquier duda NO oculta nada. El historial de actividad no se toca. Con la base y Google de mentira.
import { describe, it, expect, vi } from "vitest";
import { GoogleError, crearGoogle } from "../../api/_driveGoogle.js";
import { limitePurgaArchivos, PURGA_ARCHIVOS_MS, ACCIONES_AUDITORIA } from "../../api/_drive.js";
import { T0, entorno } from "./_driveHarness.js";

const DIA = 24 * 60 * 60 * 1000;
const fila = (n, extra = {}) => ({ id: `a${n}`, expediente_id: "e853b", almacen: "escribania", nombre: `Archivo ${n}.jpg`, drive_file_id: `f${n}`, borrado_en: null, ...extra });
// Un entorno con el Drive del 853 conectado y 3 archivos anotados en el expediente e853b (que ya tiene su carpeta).
function conArchivos(opciones = {}, n = 3) {
  const e = entorno(opciones);
  e.conectar("853");
  for (let i = 1; i <= n; i++) e.tablas.expediente_archivos.push(fila(i));
  return e;
}
const sync = (e, token = "tok-fati", expediente_id = "e853b") => e.llamar({ accion: "sincronizar", expediente_id }, token);
const visibles = (e) => e.tablas.expediente_archivos.filter((a) => !a.borrado_en).map((a) => a.id);

describe("sincronizar: lo que se borró directo en Drive se oculta", () => {
  it("sin sesión 401; de otro registro 404", async () => {
    const e = conArchivos();
    expect((await e.llamar({ accion: "sincronizar", expediente_id: "e853b" })).statusCode).toBe(401);
    expect((await sync(e, "tok-otro")).statusCode).toBe(404);
    expect(e.google.listarCarpeta).not.toHaveBeenCalled();
  });
  it("CASO REAL: oculta lo que está en la papelera o ya no existe, deja lo demás, y lo registra en el historial", async () => {
    const e = conArchivos({ google: {
      listarCarpeta: vi.fn(async () => new Set(["f2"])),
      estadoArchivo: vi.fn(async (a, id) => (id === "f1" ? { existe: true, papelera: true } : { existe: false, papelera: false })),
    } });
    const r = await sync(e, "tok-fati2");
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody).toEqual({ ocultados: 2 });
    expect(visibles(e)).toEqual(["a2"]);
    const h = e.tablas.drive_auditoria.filter((a) => a.accion === "borrado_en_drive");
    expect(h).toHaveLength(2);
    expect(h[0]).toMatchObject({ usuario_id: "u-fati2", registro_numero: "853", expediente_id: "e853b" });
    expect(h.map((x) => x.detalle.motivo).sort()).toEqual(["eliminado", "papelera"]);
    expect(h[0].detalle.nombre).toMatch(/^Archivo \d\.jpg$/);
    expect(ACCIONES_AUDITORIA).toContain("borrado_en_drive");
  });
  it("es idempotente: la segunda vez no hay nada nuevo y el historial no se repite", async () => {
    const e = conArchivos({ google: { listarCarpeta: vi.fn(async () => new Set(["f2", "f3"])), estadoArchivo: vi.fn(async () => ({ existe: false, papelera: false })) } });
    expect((await sync(e)).jsonBody.ocultados).toBe(1);
    expect((await sync(e)).jsonBody.ocultados).toBe(0);
    expect(e.tablas.drive_auditoria.filter((a) => a.accion === "borrado_en_drive")).toHaveLength(1);
  });
  it("un archivo que MOVIERON a otra carpeta (sigue existiendo) NO se oculta", async () => {
    const e = conArchivos({ google: { listarCarpeta: vi.fn(async () => new Set()), estadoArchivo: vi.fn(async () => ({ existe: true, papelera: false })) } });
    expect((await sync(e)).jsonBody.ocultados).toBe(0);
    expect(visibles(e)).toEqual(["a1", "a2", "a3"]);
  });
  it("lo que ya está en la carpeta ni se consulta uno por uno", async () => {
    const e = conArchivos({ google: { listarCarpeta: vi.fn(async () => new Set(["f1", "f2", "f3"])) } });
    expect((await sync(e)).jsonBody.ocultados).toBe(0);
    expect(e.google.estadoArchivo).not.toHaveBeenCalled();
  });
  it("lista la carpeta DEL EXPEDIENTE y con el token del registro", async () => {
    const e = conArchivos();
    await sync(e);
    expect(e.google.listarCarpeta).toHaveBeenCalledWith("acceso-1", "carpeta-exp");
  });
});

describe("sincronizar: ante cualquier duda, NO se oculta nada", () => {
  it("si Drive falla al listar (caído, saturado, revocado), no se oculta nada y no es un error", async () => {
    for (const falla of [new GoogleError({ status: 500 }), new GoogleError({ status: 429 }), new GoogleError({ status: 404 }), new Error("ECONNRESET")]) {
      const e = conArchivos({ google: { listarCarpeta: vi.fn(async () => { throw falla; }) } });
      const r = await sync(e);
      expect(r.statusCode).toBe(200);
      expect(r.jsonBody).toEqual({ ocultados: 0, disponible: false });
      expect(visibles(e)).toEqual(["a1", "a2", "a3"]);
    }
  });
  it("si no se puede renovar el acceso (conexión caída), tampoco", async () => {
    const e = conArchivos({ google: { renovar: vi.fn(async () => { throw new GoogleError({ status: 400, error: "invalid_grant" }); }) } });
    expect((await sync(e)).jsonBody).toMatchObject({ ocultados: 0, disponible: false });
    expect(visibles(e)).toHaveLength(3);
  });
  it("sin Drive conectado o con la conexión rota: no hace nada", async () => {
    const sin = entorno(); sin.tablas.expediente_archivos.push(fila(1));
    expect((await sync(sin)).jsonBody).toMatchObject({ ocultados: 0, disponible: false });
    const rota = conArchivos(); rota.tablas.drive_conexiones[0].estado = "rota";
    expect((await sync(rota)).jsonBody).toMatchObject({ ocultados: 0, disponible: false });
    expect(visibles(rota)).toHaveLength(3);
  });
  it("si no se puede confirmar el estado de UN archivo, ese se salta y los demás siguen", async () => {
    const e = conArchivos({ google: {
      listarCarpeta: vi.fn(async () => new Set()),
      estadoArchivo: vi.fn(async (a, id) => { if (id === "f2") throw new GoogleError({ status: 500 }); return { existe: false, papelera: false }; }),
    } });
    expect((await sync(e)).jsonBody.ocultados).toBe(2);
    expect(visibles(e)).toEqual(["a2"]);
  });
  it("un expediente sin archivos o sin carpeta no llama a Drive", async () => {
    const vacio = entorno(); vacio.conectar("853");
    expect((await sync(vacio)).jsonBody).toEqual({ ocultados: 0 });
    expect(vacio.google.listarCarpeta).not.toHaveBeenCalled();
    const sinCarpeta = conArchivos();
    sinCarpeta.tablas.expedientes.find((x) => x.id === "e853b").drive_carpeta_escribania_id = null;
    expect((await sync(sinCarpeta)).jsonBody).toEqual({ ocultados: 0 });
    expect(sinCarpeta.google.listarCarpeta).not.toHaveBeenCalled();
  });
  it("no verifica más de 50 por vez (no se cuelga con un expediente enorme)", async () => {
    const e = conArchivos({ google: { listarCarpeta: vi.fn(async () => new Set()), estadoArchivo: vi.fn(async () => ({ existe: false, papelera: false })) } }, 0);
    for (let i = 1; i <= 60; i++) e.tablas.expediente_archivos.push(fila(i));
    expect((await sync(e)).jsonBody.ocultados).toBe(50);
    expect(e.google.estadoArchivo).toHaveBeenCalledTimes(50);
    expect((await sync(e)).jsonBody.ocultados).toBe(10);   // el resto, en la próxima
  });
  it("solo toca archivos de ESE expediente y del Drive de la escribanía (no los del almacén viejo ni de otro expediente)", async () => {
    const e = conArchivos({ google: { listarCarpeta: vi.fn(async () => new Set()), estadoArchivo: vi.fn(async () => ({ existe: false, papelera: false })) } }, 1);
    e.tablas.expediente_archivos.push(fila(9, { expediente_id: "e853" }), fila(8, { almacen: "personal" }));
    await sync(e);
    expect(e.tablas.expediente_archivos.find((a) => a.id === "a9").borrado_en).toBe(null);
    expect(e.tablas.expediente_archivos.find((a) => a.id === "a8").borrado_en).toBe(null);
    expect(e.tablas.expediente_archivos.find((a) => a.id === "a1").borrado_en).toBeTruthy();
  });
});

describe("limpieza: las filas ocultas se eliminan a los 30 días (el historial NO)", () => {
  it("el plazo es el de la papelera de Drive", () => {
    expect(PURGA_ARCHIVOS_MS).toBe(30 * DIA);
    expect(new Date(limitePurgaArchivos(T0)).getTime()).toBe(T0 - 30 * DIA);
  });
  it("elimina las ocultas hace más de 30 días y conserva las recientes, las visibles y las del almacén viejo", async () => {
    const e = conArchivos({}, 0);
    const hace = (dias) => new Date(T0 - dias * DIA).toISOString();
    e.tablas.expediente_archivos.push(
      fila(1, { borrado_en: hace(31) }), fila(2, { borrado_en: hace(29) }), fila(3), fila(4, { borrado_en: hace(90), almacen: "personal" }),
      fila(5, { borrado_en: hace(45), expediente_id: "e111" }),   // de otro expediente: también se limpia (es una limpieza general)
    );
    await sync(e);
    expect(e.tablas.expediente_archivos.map((a) => a.id).sort()).toEqual(["a2", "a3", "a4"]);
  });
  it("el historial de actividad no se toca por la limpieza", async () => {
    const e = conArchivos({}, 0);
    e.tablas.drive_auditoria.push({ id: 1, accion: "subir", registro_numero: "853", expediente_id: "e853b", detalle: { nombre: "DNI García Juan - anverso.jpg" } });
    e.tablas.expediente_archivos.push(fila(1, { borrado_en: new Date(T0 - 100 * DIA).toISOString() }));
    await sync(e);
    expect(e.tablas.expediente_archivos).toHaveLength(0);
    expect(e.tablas.drive_auditoria).toHaveLength(1);
    expect(e.tablas.drive_auditoria[0].detalle.nombre).toBe("DNI García Juan - anverso.jpg");
  });
});

describe("cliente de Google: listar la carpeta y consultar un archivo", () => {
  const resp = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status });
  it("lista solo la carpeta pedida, sin la papelera, y sigue las páginas", async () => {
    const f = vi.fn()
      .mockImplementationOnce(async () => resp({ files: [{ id: "a" }, { id: "b" }], nextPageToken: "T2" }))
      .mockImplementationOnce(async () => resp({ files: [{ id: "c" }] }));
    const ids = await crearGoogle({ fetch: f }).listarCarpeta("acc", "carpeta1");
    expect([...ids]).toEqual(["a", "b", "c"]);
    const u1 = new URL(f.mock.calls[0][0]);
    expect(u1.searchParams.get("q")).toBe("'carpeta1' in parents and trashed=false");
    expect(new URL(f.mock.calls[1][0]).searchParams.get("pageToken")).toBe("T2");
    expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer acc");
  });
  it("una falla de Drive al listar se propaga (así no se oculta nada)", async () => {
    await expect(crearGoogle({ fetch: async () => resp({ error: { code: 500 } }, 500) }).listarCarpeta("acc", "c")).rejects.toMatchObject({ status: 500 });
  });
  it("estadoArchivo: existe, en la papelera, 404 = ya no existe; otra falla se propaga", async () => {
    const con = (cuerpo, status) => crearGoogle({ fetch: async () => resp(cuerpo, status) });
    expect(await con({ id: "x", trashed: false }, 200).estadoArchivo("a", "x")).toEqual({ existe: true, papelera: false });
    expect(await con({ id: "x", trashed: true }, 200).estadoArchivo("a", "x")).toEqual({ existe: true, papelera: true });
    expect(await con({ error: { code: 404 } }, 404).estadoArchivo("a", "x")).toEqual({ existe: false, papelera: false });
    await expect(con({ error: { code: 500 } }, 500).estadoArchivo("a", "x")).rejects.toMatchObject({ status: 500 });
    await expect(con({ error: { code: 403 } }, 403).estadoArchivo("a", "x")).rejects.toBeInstanceOf(GoogleError);
  });
});
