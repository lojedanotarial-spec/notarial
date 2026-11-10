import { describe, it, expect, vi, afterEach } from "vitest";
import {
  claveTemporal, claveDefinitiva, esClaveTemporal, registroDeClave, perteneceAlRegistro,
  configAlmacen, crearAlmacen, ErrorAlmacen, SUBIDA_VENCE_SEG,
} from "../../api/_almacen.js";

const ENV = { ARCHIVOS_R2_ACCOUNT_ID: "cuenta1", ARCHIVOS_R2_ACCESS_KEY_ID: "AKIA-prueba", ARCHIVOS_R2_SECRET_ACCESS_KEY: "secreto-super-privado", ARCHIVOS_R2_BUCKET: "notarial-archivos" };
const UUID = "8885c28b-8285-427a-8c70-52abfe9953b5";

describe("claves", () => {
  it("la temporal vive bajo tmp/ y rechaza ids raros", () => {
    expect(claveTemporal(UUID)).toBe(`tmp/${UUID}`);
    expect(esClaveTemporal(claveTemporal(UUID))).toBe(true);
    for (const malo of ["", "../x", "a/b", "a b", null, undefined, "x".repeat(65)]) expect(() => claveTemporal(malo)).toThrow();
  });

  it("la definitiva de un expediente y la de un lote llevan registro, tipo, dueño y archivo (sin nombre)", () => {
    expect(claveDefinitiva({ registro: "853", expedienteId: "e1", archivoId: "a1" })).toBe("853/exp/e1/a1");
    expect(claveDefinitiva({ registro: "853", loteId: "l1", archivoId: "a1" })).toBe("853/lote/l1/a1");
  });

  it("exige exactamente un dueño: expediente o lote", () => {
    expect(() => claveDefinitiva({ registro: "853", archivoId: "a1" })).toThrow();
    expect(() => claveDefinitiva({ registro: "853", expedienteId: "e1", loteId: "l1", archivoId: "a1" })).toThrow();
  });

  it("no deja armar claves que se salgan de su carpeta", () => {
    for (const malo of ["../9876", "853/..", "a/b", "", "x y"]) {
      expect(() => claveDefinitiva({ registro: malo, expedienteId: "e1", archivoId: "a1" })).toThrow();
      expect(() => claveDefinitiva({ registro: "853", expedienteId: malo, archivoId: "a1" })).toThrow();
      expect(() => claveDefinitiva({ registro: "853", expedienteId: "e1", archivoId: malo })).toThrow();
    }
  });

  it("registroDeClave y perteneceAlRegistro: un registro no alcanza claves de otro", () => {
    expect(registroDeClave("853/exp/e1/a1")).toBe("853");
    expect(registroDeClave("853/lote/l1/a1")).toBe("853");
    expect(perteneceAlRegistro("853/exp/e1/a1", "853")).toBe(true);
    expect(perteneceAlRegistro("853/exp/e1/a1", 853)).toBe(true);
    expect(perteneceAlRegistro("853/exp/e1/a1", "9876")).toBe(false);
    expect(perteneceAlRegistro("853/exp/e1/a1", null)).toBe(false);
    // temporales, claves truncadas o con partes de más no pertenecen a nadie
    for (const mala of ["tmp/abc", "853", "853/exp/e1", "853/otro/e1/a1", "853/exp/e1/a1/x", "../exp/e1/a1", null]) {
      expect(registroDeClave(mala)).toBeNull();
      expect(perteneceAlRegistro(mala, "853")).toBe(false);
    }
  });
});

describe("configuración", () => {
  it("solo hay almacén si están las cuatro variables", () => {
    expect(configAlmacen(ENV)).toMatchObject({ cuenta: "cuenta1", bucket: "notarial-archivos" });
    for (const k of Object.keys(ENV)) expect(configAlmacen({ ...ENV, [k]: "" })).toBeNull();
    expect(() => crearAlmacen({})).toThrow(/ARCHIVOS_R2/);
  });
});

describe("cliente de R2 (con fetch de mentira)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const falso = (respuestas) => {
    const llamadas = [];
    const fn = vi.fn(async (entrada, init) => {
      const req = entrada instanceof Request ? entrada : new Request(entrada, init);
      llamadas.push({ metodo: req.method, url: req.url, headers: Object.fromEntries(req.headers) });
      const r = respuestas.shift() ?? new Response("", { status: 200 });
      return r;
    });
    vi.stubGlobal("fetch", fn);
    return llamadas;
  };

  it("firma la subida: dirección del bucket, vence en 15 minutos, sin filtrar el secreto", async () => {
    const url = await crearAlmacen(ENV).firmarSubida(`tmp/${UUID}`);
    expect(url).toContain("https://cuenta1.r2.cloudflarestorage.com/notarial-archivos/tmp/");
    expect(url).toContain(`X-Amz-Expires=${SUBIDA_VENCE_SEG}`);
    expect(url).toContain("X-Amz-Signature=");
    expect(url).not.toContain("secreto-super-privado");
  });

  it("consultar devuelve tamaño y tipo, y null si no existe", async () => {
    const llamadas = falso([
      new Response(null, { status: 200, headers: { "content-length": "1234", "content-type": "image/png" } }),
      new Response(null, { status: 404 }),
    ]);
    const a = crearAlmacen(ENV);
    expect(await a.consultar("853/exp/e1/a1")).toEqual({ tamano: 1234, tipo: "image/png" });
    expect(await a.consultar("853/exp/e1/zz")).toBeNull();
    expect(llamadas[0].metodo).toBe("HEAD");
  });

  it("consultar propaga otros errores sin ocultarlos", async () => {
    falso([new Response("prohibido", { status: 403 })]);
    await expect(crearAlmacen(ENV).consultar("853/exp/e1/a1")).rejects.toBeInstanceOf(ErrorAlmacen);
  });

  it("ante un 500 de R2 reintenta (acotado) y si se recupera devuelve el resultado", async () => {
    const llamadas = falso([
      new Response("boom", { status: 500 }),
      new Response(null, { status: 200, headers: { "content-length": "7", "content-type": "image/jpeg" } }),
    ]);
    expect(await crearAlmacen(ENV).consultar("853/exp/e1/a1")).toEqual({ tamano: 7, tipo: "image/jpeg" });
    expect(llamadas).toHaveLength(2);
  });

  it("copiar manda el origen en x-amz-copy-source dentro del mismo bucket", async () => {
    const llamadas = falso([new Response("<CopyObjectResult/>", { status: 200 })]);
    await crearAlmacen(ENV).copiar(`tmp/${UUID}`, `853/exp/e1/${UUID}`);
    expect(llamadas[0].metodo).toBe("PUT");
    expect(llamadas[0].url).toContain(`/notarial-archivos/853/exp/e1/${UUID}`);
    expect(llamadas[0].headers["x-amz-copy-source"]).toBe(`/notarial-archivos/tmp/${UUID}`);
  });

  it("copiar falla con claridad si R2 responde error", async () => {
    falso([new Response("NoSuchKey", { status: 404 })]);
    await expect(crearAlmacen(ENV).copiar("tmp/x", "853/exp/e1/a1")).rejects.toThrow(/COPY/);
  });

  it("borrar tolera que el objeto ya no esté, pero no otros errores", async () => {
    const a = crearAlmacen(ENV);
    falso([new Response(null, { status: 204 })]);
    await expect(a.borrar("tmp/x")).resolves.toBeUndefined();
    falso([new Response(null, { status: 404 })]);
    await expect(a.borrar("tmp/x")).resolves.toBeUndefined();
    falso([new Response("no", { status: 403 })]);
    await expect(a.borrar("tmp/x")).rejects.toBeInstanceOf(ErrorAlmacen);
  });

  it("leer devuelve la respuesta en streaming, null si no existe y manda el rango cuando se pide", async () => {
    const llamadas = falso([
      new Response("hola", { status: 200 }),
      new Response(null, { status: 404 }),
      new Response("ho", { status: 206 }),
    ]);
    const a = crearAlmacen(ENV);
    const r = await a.leer("853/exp/e1/a1");
    expect(await r.text()).toBe("hola");
    expect(await a.leer("853/exp/e1/zz")).toBeNull();
    await a.leer("853/exp/e1/a1", { rango: "bytes=0-1" });
    expect(llamadas[2].headers.range).toBe("bytes=0-1");
  });
});
