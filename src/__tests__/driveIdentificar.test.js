// Identificación y nombre automáticos de documentos (api/_driveIdentificar.js): lógica pura.
// Spec: specs/documentacion-celular-expediente/ (UC-4). Cubre TB.3.
import { describe, it, expect } from "vitest";
import {
  TIPOS_IDENTIFICABLES, MAX_MINIATURA_BYTES, PROMPT_IDENTIFICAR,
  validarMiniatura, normalizarIdentificacion, armarNombreArchivo, extensionDe, evitarDuplicado,
} from "../../api/_driveIdentificar.js";

const base = (extra = {}) => ({ tipo: "dni", nombre: "Juan", apellido: "García", lado: "anverso", pagina: null, paginas_total: null, legible: true, confianza: "alta", ...extra });
const ok = (r) => { expect(r.ok, JSON.stringify(r)).toBe(true); return r.ident; };

describe("miniatura que manda el navegador", () => {
  const jpeg = (n) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n, 1)]).toString("base64");
  it("acepta un JPEG de tamaño razonable", () => {
    expect(validarMiniatura(jpeg(50_000))).toMatchObject({ ok: true });
  });
  it("rechaza lo que no es JPEG, lo vacío, lo muy grande y lo que no es base64", () => {
    expect(validarMiniatura(Buffer.from("no soy una imagen").toString("base64")).ok).toBe(false);
    expect(validarMiniatura("").ok).toBe(false);
    expect(validarMiniatura(undefined).ok).toBe(false);
    expect(validarMiniatura(jpeg(MAX_MINIATURA_BYTES + 10)).ok).toBe(false);
    expect(validarMiniatura("¡¡no es base64!!").ok).toBe(false);
    expect(validarMiniatura(123).ok).toBe(false);
  });
  it("tolera el prefijo data: si lo trae", () => {
    expect(validarMiniatura(`data:image/jpeg;base64,${jpeg(100)}`).ok).toBe(true);
  });
});

describe("normalizar la respuesta del modelo", () => {
  it("acepta un JSON válido y lo devuelve acotado a los campos permitidos", () => {
    const i = ok(normalizarIdentificacion(JSON.stringify(base({ nro_doc: "12345678", domicilio: "Calle Falsa 123", fecha_nac: "01/01/1990" }))));
    expect(Object.keys(i).sort()).toEqual(["apellido", "descripcion", "lado", "nombre", "pagina", "paginas_total", "tipo"]);
    expect(JSON.stringify(i)).not.toMatch(/12345678|Falsa|1990/);
  });
  it("tolera texto alrededor y bloques de código", () => {
    const txt = "Acá está el resultado:\n```json\n" + JSON.stringify(base()) + "\n```\nListo.";
    expect(ok(normalizarIdentificacion(txt)).tipo).toBe("dni");
  });
  it("acepta también un objeto ya parseado", () => {
    expect(ok(normalizarIdentificacion(base())).apellido).toBe("García");
  });
  it("JSON roto, vacío o sin objeto: no se inventa nada", () => {
    for (const x of ["", "no hay json", "{ roto", null, undefined, "[]", 42]) {
      const r = normalizarIdentificacion(x);
      expect(r.ok, String(x)).toBe(false);
    }
  });
  it("no legible o confianza baja: sin identificar", () => {
    expect(normalizarIdentificacion(base({ legible: false }))).toMatchObject({ ok: false, motivo: "ilegible" });
    expect(normalizarIdentificacion(base({ confianza: "baja" }))).toMatchObject({ ok: false, motivo: "confianza_baja" });
    expect(normalizarIdentificacion(base({ legible: "false" }))).toMatchObject({ ok: false });
  });
  it("un tipo desconocido pasa a 'otro', y 'otro' necesita una descripción para poder nombrarse", () => {
    expect(normalizarIdentificacion(base({ tipo: "pasaporte" }))).toMatchObject({ ok: false, motivo: "sin_descripcion" });
    expect(ok(normalizarIdentificacion(base({ tipo: "pasaporte", descripcion: "Pasaporte" }))).tipo).toBe("otro");
    expect(ok(normalizarIdentificacion(base({ tipo: "otro", descripcion: "partida de nacimiento" }))).descripcion).toBe("Partida de nacimiento");
  });
  it("la descripción solo cuenta para 'otro' y se sanea", () => {
    expect(ok(normalizarIdentificacion(base({ tipo: "dni", descripcion: "algo" }))).descripcion).toBe("");
    expect(ok(normalizarIdentificacion(base({ tipo: "otro", descripcion: "Título/de*propiedad <b>" }))).descripcion).not.toMatch(/[/*<>]/);
    expect(ok(normalizarIdentificacion(base({ tipo: "otro", descripcion: "x".repeat(200) }))).descripcion.length).toBeLessThanOrEqual(40);
  });
  it("saneado de nombres: solo letras, espacios, guion y apóstrofe; capitalizados; largo acotado", () => {
    const i = ok(normalizarIdentificacion(base({ apellido: "GARCÍA  <script>", nombre: "juan carlos; DROP", lado: "reverso" })));
    expect(i.apellido).toBe("García Script");
    expect(i.nombre).toBe("Juan Carlos Drop");
    expect(ok(normalizarIdentificacion(base({ apellido: "o'brien-smith", nombre: "ana" }))).apellido).toBe("O'Brien-Smith");
    expect(ok(normalizarIdentificacion(base({ apellido: "x".repeat(200) }))).apellido.length).toBeLessThanOrEqual(40);
  });
  it("la persona solo va en DNI y en 'otro' (partidas, licencias); nunca en poderes, formularios ni tarjeta verde", () => {
    expect(ok(normalizarIdentificacion(base({ tipo: "poder", lado: null, pagina: 1 }))).apellido).toBe("");
    expect(ok(normalizarIdentificacion(base({ tipo: "formulario", lado: null }))).apellido).toBe("");
    expect(ok(normalizarIdentificacion(base({ tipo: "tarjeta_verde" }))).apellido).toBe("");
    expect(ok(normalizarIdentificacion(base({ tipo: "otro", descripcion: "Licencia de conducir" }))).apellido).toBe("García");
  });
  it("lado solo anverso/reverso y solo en DNI y tarjeta verde; página solo en el resto", () => {
    expect(ok(normalizarIdentificacion(base({ lado: "frente" }))).lado).toBe(null);
    expect(ok(normalizarIdentificacion(base({ lado: "REVERSO" }))).lado).toBe("reverso");
    expect(ok(normalizarIdentificacion(base({ tipo: "tarjeta_verde", lado: "anverso" }))).lado).toBe("anverso");
    const p = ok(normalizarIdentificacion(base({ tipo: "poder", lado: "anverso", pagina: 2, paginas_total: 3 })));
    expect(p).toMatchObject({ lado: null, pagina: 2, paginas_total: 3 });
    expect(ok(normalizarIdentificacion(base({ tipo: "dni", pagina: 4 }))).pagina).toBe(null);
  });
  it("página: entero razonable; el total nunca es menor que la página", () => {
    for (const pagina of [0, -1, 1000, 1.5, "x", null]) expect(ok(normalizarIdentificacion(base({ tipo: "poder", lado: null, pagina }))).pagina, String(pagina)).toBe(null);
    expect(ok(normalizarIdentificacion(base({ tipo: "poder", lado: null, pagina: 3, paginas_total: 2 }))).paginas_total).toBe(null);
    expect(ok(normalizarIdentificacion(base({ tipo: "poder", lado: null, pagina: "2" }))).pagina).toBe(2);
  });
  it("sin nombre ni apellido legibles, igual identifica el tipo", () => {
    const i = ok(normalizarIdentificacion(base({ nombre: "", apellido: null })));
    expect(i).toMatchObject({ tipo: "dni", nombre: "", apellido: "" });
  });
});

describe("armado del nombre del archivo", () => {
  const nombre = (extra, ext = ".jpg") => armarNombreArchivo(ok(normalizarIdentificacion(base(extra))), ext);
  it("DNI con persona y lado", () => {
    expect(nombre({})).toBe("DNI García Juan - anverso.jpg");
    expect(nombre({ lado: "reverso" })).toBe("DNI García Juan - reverso.jpg");
  });
  it("DNI sin persona legible: solo tipo y lado", () => {
    expect(nombre({ nombre: "", apellido: "" })).toBe("DNI - anverso.jpg");
    expect(nombre({ lado: null })).toBe("DNI García Juan.jpg");
  });
  it("tarjeta verde, formulario y poder con página", () => {
    expect(nombre({ tipo: "tarjeta_verde", lado: "reverso" })).toBe("Tarjeta verde - reverso.jpg");
    expect(nombre({ tipo: "formulario", lado: null })).toBe("Formulario 08.jpg");
    expect(nombre({ tipo: "poder", lado: null, pagina: 2 }, ".pdf")).toBe("Poder - pág 2.pdf");
    expect(nombre({ tipo: "poder", lado: null, pagina: 2, paginas_total: 3 })).toBe("Poder - pág 2 de 3.jpg");
  });
  it("otro tipo: usa la descripción, con persona si la tiene", () => {
    expect(nombre({ tipo: "otro", descripcion: "partida de nacimiento", lado: null })).toBe("Partida de nacimiento García Juan.jpg");
    expect(nombre({ tipo: "otro", descripcion: "Título de propiedad", nombre: "", apellido: "", lado: null, pagina: 1 })).toBe("Título de propiedad - pág 1.jpg");
  });
  it("sin extensión no inventa una", () => {
    expect(nombre({}, "")).toBe("DNI García Juan - anverso");
  });
  it("el nombre nunca trae caracteres que Drive o Windows rechacen y no pasa de 150", () => {
    const n = nombre({ tipo: "otro", descripcion: "a".repeat(39), apellido: "b".repeat(39), nombre: "c".repeat(39), pagina: 12, paginas_total: 20, lado: null });
    expect(n).not.toMatch(/[\\/:*?"<>|]/);
    expect(n.length).toBeLessThanOrEqual(150);
  });
});

describe("extensión y nombres repetidos", () => {
  it("toma la extensión del nombre original y, si no hay, del tipo", () => {
    expect(extensionDe("IMG_4821.JPG", "image/jpeg")).toBe(".jpg");
    expect(extensionDe("escaneo.pdf", "application/pdf")).toBe(".pdf");
    expect(extensionDe("sin_extension", "image/png")).toBe(".png");
    expect(extensionDe("foto.heic", "image/heic")).toBe(".heic");
    expect(extensionDe("raro", "application/octet-stream")).toBe("");
    expect(extensionDe(undefined, undefined)).toBe("");
  });
  it("agrega (2), (3)… antes de la extensión si el nombre ya existe en el expediente", () => {
    expect(evitarDuplicado("DNI García Juan - anverso.jpg", [])).toBe("DNI García Juan - anverso.jpg");
    expect(evitarDuplicado("DNI García Juan - anverso.jpg", ["DNI García Juan - anverso.jpg"])).toBe("DNI García Juan - anverso (2).jpg");
    expect(evitarDuplicado("Poder.pdf", ["Poder.pdf", "Poder (2).pdf"])).toBe("Poder (3).pdf");
  });
  it("compara sin distinguir mayúsculas, como Drive y Windows", () => {
    expect(evitarDuplicado("Poder.pdf", ["PODER.PDF"])).toBe("Poder (2).pdf");
  });
});

describe("el prompt", () => {
  it("cubre los tipos, los lados, las páginas y el 'no inventar', y pide solo JSON", () => {
    for (const t of TIPOS_IDENTIFICABLES) expect(PROMPT_IDENTIFICAR).toContain(t);
    expect(PROMPT_IDENTIFICAR).toMatch(/anverso/);
    expect(PROMPT_IDENTIFICAR).toMatch(/reverso/);
    expect(PROMPT_IDENTIFICAR).toMatch(/pagina/);
    expect(PROMPT_IDENTIFICAR).toMatch(/legible/);
    expect(PROMPT_IDENTIFICAR).toMatch(/JSON/);
    expect(PROMPT_IDENTIFICAR).toMatch(/no inventes/i);
  });
  it("es corto (cuesta tokens en cada foto)", () => {
    expect(PROMPT_IDENTIFICAR.length).toBeLessThan(2500);
  });
  it("no pide datos que no se guardan (números, domicilios, fechas)", () => {
    expect(PROMPT_IDENTIFICAR).not.toMatch(/nro_doc|domicilio|fecha_nac|cuit|dominio.*:/i);
  });
});

// ── Cliente del modelo (api/_driveIA.js) ─────────────────────────────────────
import { vi } from "vitest";
import { crearIA, ErrorIA, MAX_TOKENS_IDENTIFICAR } from "../../api/_driveIA.js";
import { MODELOS } from "../../api/_modelos.js";

describe("cliente del modelo", () => {
  const respuesta = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status });
  const buena = { content: [{ type: "text", text: "{\"tipo\":\"dni\"}" }], usage: { input_tokens: 1372, output_tokens: 221 }, stop_reason: "end_turn" };

  it("usa Haiku 5.5, deja margen para el razonamiento y pide poco esfuerzo (lo que se midió)", async () => {
    const f = vi.fn(async () => respuesta(buena));
    const ia = crearIA({ apiKey: "clave-secreta", fetch: f });
    const r = await ia.consultar("QUJD");
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(MODELOS.identificacion).toBe("claude-haiku-5-5");
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.max_tokens).toBe(MAX_TOKENS_IDENTIFICAR);
    expect(MAX_TOKENS_IDENTIFICAR).toBeGreaterThanOrEqual(1000);
    expect(body.output_config).toEqual({ effort: "low" });
    expect(body.thinking).toBeUndefined();               // Haiku 5.5 / Sonnet 5.5 rechazan thinking desactivado
    expect(body.messages.at(-1).role).toBe("user");      // sin prefill (Haiku 5.5 lo rechaza)
    expect(body.messages[0].content[0]).toEqual({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "QUJD" } });
    expect(body.messages[0].content[1].text).toBe(PROMPT_IDENTIFICAR);
    expect(f.mock.calls[0][1].headers["x-api-key"]).toBe("clave-secreta");
    expect(r).toEqual({ texto: "{\"tipo\":\"dni\"}", entrada: 1372, salida: 221, parada: "end_turn" });
  });
  it("sin clave no llama a nadie", async () => {
    const f = vi.fn();
    await expect(crearIA({ apiKey: "", fetch: f }).consultar("QUJD")).rejects.toMatchObject({ motivo: "sin_clave" });
    expect(f).not.toHaveBeenCalled();
  });
  it("traduce las fallas sin filtrar la clave ni el cuerpo", async () => {
    const e1 = await crearIA({ apiKey: "CLAVE-X", fetch: async () => respuesta({ error: { message: "invalid x-api-key CLAVE-X" } }, 401) }).consultar("QUJD").catch((e) => e);
    expect(e1).toBeInstanceOf(ErrorIA);
    expect(e1).toMatchObject({ motivo: "api", estado: 401 });
    expect(JSON.stringify(e1) + e1.message + e1.stack).not.toContain("CLAVE-X");
    for (const s of [429, 529]) expect((await crearIA({ apiKey: "k", fetch: async () => respuesta({}, s) }).consultar("QUJD").catch((e) => e)).motivo).toBe("saturada");
    expect((await crearIA({ apiKey: "k", fetch: async () => { throw new Error("ECONNRESET"); } }).consultar("QUJD").catch((e) => e)).motivo).toBe("red");
  });
  it("corta si el modelo tarda demasiado", async () => {
    const lento = (url, init) => new Promise((_, rechazar) => init.signal.addEventListener("abort", () => rechazar(Object.assign(new Error("abortado"), { name: "AbortError" }))));
    const e = await crearIA({ apiKey: "k", fetch: lento, timeoutMs: 20 }).consultar("QUJD").catch((x) => x);
    expect(e.motivo).toBe("timeout");
  });
  it("una respuesta sin texto o sin uso no rompe", async () => {
    const r = await crearIA({ apiKey: "k", fetch: async () => respuesta({ content: [], stop_reason: "max_tokens" }) }).consultar("QUJD");
    expect(r).toEqual({ texto: "", entrada: null, salida: null, parada: "max_tokens" });
  });
});
