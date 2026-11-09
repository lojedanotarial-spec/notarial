// Drive de la escribanía, lado del navegador: lógica pura (src/utils/driveCliente.js).
import { describe, it, expect, vi } from "vitest";
import {
  MAX_BYTES_ARCHIVO, TIPOS_ARCHIVO, etiquetaTipo, formatearTamano, validarArchivoLocal, esPrevisualizable,
  mensajeRetorno, textoInvitacion, urlWhatsApp, urlGmail, subirASesion, MENSAJE_CORTE, fechaHora, estadoVisual,
} from "../utils/driveCliente.js";

const MB = 1024 * 1024;

describe("tamaño y validación local", () => {
  it("el máximo es 25 MB", () => expect(MAX_BYTES_ARCHIVO).toBe(25 * MB));
  it("formatea tamaños legibles", () => {
    expect(formatearTamano(500)).toBe("500 B");
    expect(formatearTamano(2048)).toBe("2 KB");
    expect(formatearTamano(3.4 * MB)).toBe("3.4 MB");
    expect(formatearTamano(2 * MB)).toBe("2 MB");
    expect(formatearTamano(25 * MB)).toBe("25 MB");
    expect(formatearTamano(-1)).toBe("");
    expect(formatearTamano("x")).toBe("");
  });
  it("acepta hasta 25 MB justos y rechaza lo que pasa, nombrando el archivo", () => {
    expect(validarArchivoLocal({ name: "a.jpg", size: 25 * MB })).toEqual({ ok: true });
    const r = validarArchivoLocal({ name: "scan.pdf", size: 26 * MB });
    expect(r.ok).toBe(false);
    expect(r.mensaje).toBe('"scan.pdf" pesa 26 MB y el máximo es 25 MB.');
  });
  it("rechaza archivos vacíos o ilegibles", () => {
    for (const f of [{ name: "v.txt", size: 0 }, { name: "x", size: NaN }, null, undefined]) expect(validarArchivoLocal(f).ok).toBe(false);
  });
});

describe("tipos y vista previa", () => {
  it("los tipos son los de siempre", () => {
    expect(TIPOS_ARCHIVO.map((t) => t.key)).toEqual(["dni", "tarjeta_verde", "poder", "formulario", "otro"]);
    expect(etiquetaTipo("tarjeta_verde")).toBe("Tarjeta verde");
    expect(etiquetaTipo("cualquiera")).toBe("Otro");
  });
  it("solo imágenes y PDF se previsualizan (igual que en el servidor)", () => {
    for (const m of ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "IMAGE/JPEG", "application/pdf; charset=x"]) expect(esPrevisualizable(m)).toBe(true);
    for (const m of ["text/html", "image/svg+xml", "application/octet-stream", "", null, undefined]) expect(esPrevisualizable(m)).toBe(false);
  });
  it("fechaHora tolera fechas inválidas", () => {
    expect(fechaHora("no es fecha")).toBe("");
    expect(fechaHora("2026-11-09T15:30:00Z")).toMatch(/\d/);
  });
});

describe("cómo se ve cada registro en el panel", () => {
  const ok = { conectado: true, operativa: true, estado: "activa", sin_espacio: false, cuota: { porcentaje: 10, advertencia: false, llena: false } };
  it("no conectado: ofrece conectar", () => {
    for (const r of [null, undefined, { conectado: false }]) expect(estadoVisual(r)).toMatchObject({ clave: "no_conectado", accion: "conectar" });
  });
  it("conectado y sano: ofrece desconectar, sin advertencias", () => {
    expect(estadoVisual(ok)).toMatchObject({ clave: "conectado", accion: "desconectar", detalle: "" });
  });
  it("conexión caída: ofrece reconectar y explica por qué", () => {
    const v = estadoVisual({ ...ok, estado: "rota", operativa: false, motivo: "revocada" });
    expect(v).toMatchObject({ clave: "caida", accion: "conectar" });
    expect(v.detalle).toMatch(/enlace nuevo/);
  });
  it("desde el 80 % advierte, y llena o sin espacio es un problema", () => {
    expect(estadoVisual({ ...ok, cuota: { porcentaje: 85.2, advertencia: true, llena: false } })).toMatchObject({ clave: "advertencia" });
    expect(estadoVisual({ ...ok, cuota: { porcentaje: 85.2, advertencia: true, llena: false } }).detalle).toMatch(/85 %/);
    expect(estadoVisual({ ...ok, sin_espacio: true }).clave).toBe("sin_espacio");
    expect(estadoVisual({ ...ok, cuota: { porcentaje: 100, advertencia: true, llena: true } }).clave).toBe("sin_espacio");
  });
  it("la caída pesa más que el espacio", () => {
    expect(estadoVisual({ ...ok, estado: "rota", sin_espacio: true }).clave).toBe("caida");
  });
});

describe("mensajes de la página del enlace", () => {
  it("cada error dice qué pasó y qué hacer, sin términos técnicos", () => {
    for (const e of ["rechazado", "vencido", "usado", "inexistente", "invalido", "cualquier-cosa", undefined]) {
      const m = mensajeRetorno(e);
      expect(m.titulo.length).toBeGreaterThan(5);
      expect(m.detalle.length).toBeGreaterThan(20);
      expect(m.titulo + m.detalle).not.toMatch(/token|oauth|invalid_|error \d{3}|undefined/i);
    }
    expect(mensajeRetorno("vencido").detalle).toMatch(/nuevo/);
    expect(mensajeRetorno("usado").detalle).toMatch(/no tenés que hacer nada más/);
    expect(mensajeRetorno("rechazado").detalle).toMatch(/Permitir/);
  });
});

describe("cómo se manda el enlace", () => {
  const url = "https://notarial.lat/drive/abc_DEF-123";
  it("el texto trae el enlace, el mail de la escribanía y la vigencia", () => {
    const t = textoInvitacion(url);
    expect(t).toContain(url);
    expect(t).toMatch(/mail de la escribanía/);
    expect(t).toMatch(/una sola vez/);
    expect(t).toMatch(/24 horas/);
  });
  it("WhatsApp: abre el selector de contactos con el mensaje armado", () => {
    const u = new URL(urlWhatsApp(url));
    expect(u.origin + u.pathname).toBe("https://wa.me/");
    expect(u.searchParams.get("text")).toBe(textoInvitacion(url));
  });
  it("Gmail: abre una redacción con asunto y cuerpo, sin destinatario", () => {
    const u = new URL(urlGmail(url));
    expect(u.origin).toBe("https://mail.google.com");
    expect(u.searchParams.get("view")).toBe("cm");
    expect(u.searchParams.get("su")).toMatch(/Drive de la escribanía/);
    expect(u.searchParams.get("body")).toBe(textoInvitacion(url));
    expect(u.searchParams.has("to")).toBe(false);
  });
});

describe("subida directa a la sesión de Google", () => {
  class XHRFalso {
    static ultimo = null;
    constructor() { this.upload = {}; this.cabeceras = {}; XHRFalso.ultimo = this; }
    open(m, u) { this.metodo = m; this.url = u; }
    setRequestHeader(k, v) { this.cabeceras[k] = v; }
    send(cuerpo) { this.cuerpo = cuerpo; }
    responder(status, texto = "") { this.status = status; this.responseText = texto; this.onload(); }
  }
  const archivo = { name: "a.jpg", size: 10 };

  it("hace PUT con el tipo que abrió el servidor y devuelve el id", async () => {
    const p = subirASesion("https://upload.google/s1", archivo, "image/jpeg", null, XHRFalso);
    const x = XHRFalso.ultimo;
    expect(x.metodo).toBe("PUT");
    expect(x.url).toBe("https://upload.google/s1");
    expect(x.cabeceras).toEqual({ "Content-Type": "image/jpeg" });
    expect(x.cuerpo).toBe(archivo);
    x.responder(200, JSON.stringify({ id: "file-9" }));
    expect(await p).toEqual({ id: "file-9" });
  });
  it("informa el progreso", () => {
    const seguimiento = vi.fn();
    subirASesion("u", archivo, "image/jpeg", seguimiento, XHRFalso);
    XHRFalso.ultimo.upload.onprogress({ lengthComputable: true, loaded: 5, total: 10 });
    XHRFalso.ultimo.upload.onprogress({ lengthComputable: false, loaded: 1, total: 0 });
    expect(seguimiento).toHaveBeenCalledTimes(1);
    expect(seguimiento).toHaveBeenCalledWith(0.5);
  });
  it("sin tipo usa binario genérico", () => {
    subirASesion("u", archivo, "", null, XHRFalso);
    expect(XHRFalso.ultimo.cabeceras["Content-Type"]).toBe("application/octet-stream");
  });
  it("un error de Google, una respuesta sin id o un corte de red dan el mismo mensaje claro", async () => {
    const casos = [
      (x) => x.responder(403, "{}"),
      (x) => x.responder(200, "no es json"),
      (x) => x.responder(200, JSON.stringify({})),
      (x) => x.onerror(),
      (x) => x.ontimeout(),
      (x) => x.onabort(),
    ];
    for (const provocar of casos) {
      const p = subirASesion("u", archivo, "image/jpeg", null, XHRFalso);
      provocar(XHRFalso.ultimo);
      await expect(p).rejects.toThrow(MENSAJE_CORTE);
    }
    expect(MENSAJE_CORTE).not.toMatch(/google|cors|xhr|http|\d{3}/i);
  });
});
