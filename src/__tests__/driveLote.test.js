// Identificación EN LOTE (api/_driveLote.js y el cliente del modelo): emparejar las caras de un mismo documento entre fotos.
// Spec: specs/documentacion-celular-expediente/ (UC-4). Lo más delicado: NUNCA emparejar documentos de personas distintas.
import { describe, it, expect, vi } from "vitest";
import { armarPromptLote, normalizarLote, aplicarGrupos, MAX_IMAGENES_LOTE } from "../../api/_driveLote.js";
import { armarNombreArchivo } from "../../api/_driveIdentificar.js";
import { crearIA, maxTokensLote, ErrorIA } from "../../api/_driveIA.js";

const img = (n, extra = {}) => ({ n, grupo: n, evidencia: "ninguna", tipo: "dni", descripcion: "", apellido: "", nombre: "", lado: "anverso", pagina: null, paginas_total: null, legible: true, confianza: "alta", ...extra });
const lote = (...imagenes) => JSON.stringify({ imagenes });
const nombres = (items) => items.map((it) => (it.ok ? armarNombreArchivo(it.ident, ".jpg") : null));

describe("prompt del lote", () => {
  it("numera las imágenes, pide agrupar con evidencia y no inventar", () => {
    const p = armarPromptLote(4);
    expect(p).toMatch(/Imagen 1 a Imagen 4/);
    for (const t of ["numero", "nombre", "continuidad", "ninguna"]) expect(p).toContain(t);
    expect(p).toMatch(/CUIL contiene el DNI/);
    expect(p).toMatch(/NO se agrupan/);
    expect(p).toMatch(/No inventes/);
    expect(p).toMatch(/dorso de una licencia/);
    expect(armarPromptLote(1)).toMatch(/1 imagen numerada/);
  });
  it("pide el nombre solo del titular y nunca de un firmante o responsable", () => {
    expect(armarPromptLote(2)).toMatch(/NUNCA el de un funcionario, firmante, responsable/);
  });
  it("no pide datos que no se guardan", () => {
    expect(armarPromptLote(2)).not.toMatch(/nro_doc|fecha_nac|domicilio/i);
  });
  it("el límite por consulta es 10 imágenes", () => expect(MAX_IMAGENES_LOTE).toBe(10));
});

describe("normalizar la respuesta del lote", () => {
  it("una entrada por imagen, en orden, con grupo y evidencia", () => {
    const r = normalizarLote(lote(img(1, { grupo: 1, evidencia: "numero" }), img(2, { grupo: 1, evidencia: "numero", lado: "reverso" })), 2);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ n: 1, ok: true, grupo: 1, evidencia: "numero" });
    expect(r[1].ident.lado).toBe("reverso");
  });
  it("tolera texto alrededor y un arreglo suelto", () => {
    expect(normalizarLote("Resultado:\n```json\n" + lote(img(1)) + "\n```", 1)[0].ok).toBe(true);
    expect(normalizarLote(JSON.stringify([img(1)]), 1)[0].ok).toBe(true);
    expect(normalizarLote({ imagenes: [img(1)] }, 1)[0].ok).toBe(true);
  });
  it("JSON roto, vacío o sin lista: todas quedan sin identificar", () => {
    for (const x of ["", "no hay json", "{ roto", null, undefined, "{\"otra\":1}", 42]) {
      const r = normalizarLote(x, 3);
      expect(r, String(x)).toHaveLength(3);
      expect(r.every((it) => !it.ok), String(x)).toBe(true);
    }
  });
  it("una imagen sin entrada, repetida o fuera de rango no rompe a las demás", () => {
    const r = normalizarLote(lote(img(1), img(1, { tipo: "poder" }), img(7), img(3)), 3);
    expect(r[0]).toMatchObject({ ok: true });
    expect(r[0].ident.tipo).toBe("dni");        // la repetida se ignora: manda la primera
    expect(r[1]).toMatchObject({ ok: false, motivo: "faltante" });
    expect(r[2]).toMatchObject({ ok: true, n: 3 });
  });
  it("una imagen ilegible o dudosa queda sin identificar sin afectar a las otras", () => {
    const r = normalizarLote(lote(img(1), img(2, { legible: false }), img(3, { confianza: "baja" })), 3);
    expect(r.map((x) => x.ok)).toEqual([true, false, false]);
    expect(r[1].motivo).toBe("ilegible");
    expect(r[2].motivo).toBe("confianza_baja");
  });
  it("evidencia fuera de la lista = 'ninguna'; grupo ausente = la imagen va sola", () => {
    const r = normalizarLote(lote(img(1, { evidencia: "me parece" }), { ...img(2), grupo: undefined }, { ...img(3), grupo: "x" }), 3);
    expect(r[0].evidencia).toBe("ninguna");
    expect(new Set(r.map((x) => x.grupo)).size).toBe(3);
  });
  it("lo que no está en la lista permitida no pasa (nada de números, domicilios, fechas)", () => {
    const r = normalizarLote(lote(img(1, { nro_doc: "30123456", domicilio: "Calle Falsa 123", cuit: "20-30123456-1" })), 1);
    expect(JSON.stringify(r)).not.toMatch(/30123456|Falsa/);
  });
});

describe("agrupar: el servidor decide, no el modelo", () => {
  const dniFrente = (n, g, extra) => img(n, { grupo: g, evidencia: "numero", apellido: "Ojeda", nombre: "Lucas Matias", lado: "anverso", ...extra });
  const dniDorso = (n, g, extra) => img(n, { grupo: g, evidencia: "numero", apellido: "", nombre: "", lado: "reverso", ...extra });
  const aplicar = (...im) => aplicarGrupos(normalizarLote(lote(...im), im.length));

  it("CASO REAL: el dorso sin nombre hereda el del frente de su grupo", () => {
    const r = aplicar(dniFrente(1, 1), dniDorso(2, 1));
    expect(nombres(r)).toEqual(["DNI Ojeda Lucas Matias - anverso.jpg", "DNI Ojeda Lucas Matias - reverso.jpg"]);
    expect(r.every((x) => x.agrupado)).toBe(true);
  });
  it("CASO REAL: licencia (otro) frente y dorso, aunque lleguen desordenadas y mezcladas con el DNI", () => {
    const lic = (n, g, extra) => img(n, { tipo: "otro", descripcion: "Licencia de conducir", grupo: g, evidencia: "numero", ...extra });
    const r = aplicar(lic(1, 2, { lado: "reverso" }), dniDorso(2, 1), dniFrente(3, 1), lic(4, 2, { apellido: "Ojeda", nombre: "Lucas Matias", lado: "anverso" }));
    expect(nombres(r)).toEqual([
      "Licencia de conducir Ojeda Lucas Matias - reverso.jpg", "DNI Ojeda Lucas Matias - reverso.jpg",
      "DNI Ojeda Lucas Matias - anverso.jpg", "Licencia de conducir Ojeda Lucas Matias - anverso.jpg",
    ]);
  });
  it("un DNI y una licencia de la misma persona NO se funden en un grupo", () => {
    const r = aplicar(dniFrente(1, 1), img(2, { tipo: "otro", descripcion: "Licencia de conducir", grupo: 1, evidencia: "nombre", apellido: "Ojeda", nombre: "Lucas Matias" }));
    expect(r.map((x) => x.agrupado)).toEqual([false, false]);
  });
  it("dos DNI de personas DISTINTAS en el mismo grupo: se desconfía de todo el grupo y no se hereda nada", () => {
    const r = aplicar(dniFrente(1, 1), dniDorso(2, 1, { apellido: "González", nombre: "Mariana" }), dniDorso(3, 1));
    expect(r.map((x) => x.agrupado)).toEqual([false, false, false]);
    expect(nombres(r)).toEqual(["DNI Ojeda Lucas Matias - anverso.jpg", "DNI González Mariana - reverso.jpg", "DNI - reverso.jpg"]);   // el tercero NO hereda
  });
  it("sin evidencia no se agrupa, aunque el modelo ponga el mismo grupo", () => {
    const r = aplicar(dniFrente(1, 1, { evidencia: "ninguna" }), dniDorso(2, 1, { evidencia: "ninguna" }));
    expect(r.map((x) => x.agrupado)).toEqual([false, false]);
    expect(nombres(r)[1]).toBe("DNI - reverso.jpg");
  });
  it("alcanza con que UNA imagen del grupo no informe evidencia para no confiar en el grupo", () => {
    const r = aplicar(dniFrente(1, 1), dniDorso(2, 1, { evidencia: "ninguna" }));
    expect(r.map((x) => x.agrupado)).toEqual([false, false]);
  });
  it("de tipos distintos en el mismo grupo: no se agrupa", () => {
    const r = aplicar(dniFrente(1, 1), img(2, { tipo: "tarjeta_verde", grupo: 1, evidencia: "nombre" }));
    expect(r.map((x) => x.agrupado)).toEqual([false, false]);
  });
  it("se compara sin tildes ni mayúsculas (la línea de lectura viene sin tildes)", () => {
    const r = aplicar(dniFrente(1, 1, { apellido: "Martínez", nombre: "Laura" }), dniDorso(2, 1, { apellido: "MARTINEZ", nombre: "LAURA" }));
    expect(r.every((x) => x.agrupado)).toBe(true);
  });
  it("hereda el nombre más completo del grupo", () => {
    const r = aplicar(dniFrente(1, 1, { apellido: "Ojeda", nombre: "Lucas" }), dniFrente(2, 1, { apellido: "Ojeda", nombre: "Lucas" }), dniDorso(3, 1));
    expect(nombres(r)[2]).toBe("DNI Ojeda Lucas - reverso.jpg");
  });
  it("tarjeta verde y poder se agrupan (lado y páginas coherentes) pero nunca llevan nombre de persona", () => {
    const tv = (n, lado) => img(n, { tipo: "tarjeta_verde", grupo: 1, evidencia: "nombre", lado, apellido: "Rodríguez", nombre: "Martín" });
    const p = (n, pagina) => img(n, { tipo: "poder", grupo: 2, evidencia: "continuidad", lado: null, pagina, paginas_total: 2, apellido: "García", nombre: "Juan" });
    const r = aplicar(tv(1, "anverso"), tv(2, "reverso"), p(3, 1), p(4, 2));
    expect(nombres(r)).toEqual(["Tarjeta verde - anverso.jpg", "Tarjeta verde - reverso.jpg", "Poder - pág 1 de 2.jpg", "Poder - pág 2 de 2.jpg"]);
    expect(r.every((x) => x.agrupado)).toBe(true);
  });
  it("una imagen sola no hereda nada y una sin identificar no arrastra a las demás", () => {
    const r = aplicar(dniFrente(1, 1), dniDorso(2, 2), img(3, { legible: false, grupo: 1, evidencia: "numero" }));
    expect(r[1].agrupado).toBe(false);
    expect(nombres(r)[1]).toBe("DNI - reverso.jpg");
    expect(r[2].ok).toBe(false);
    expect(r[0].agrupado).toBe(false);   // quedó sola en su grupo: no hay con quién emparejar
  });
  it("con la confianza media del dorso, el nombre sale igual de la herencia del frente (que sí es seguro)", () => {
    const r = aplicar(dniFrente(1, 1), dniDorso(2, 1, { confianza: "media" }));
    expect(nombres(r)[1]).toBe("DNI Ojeda Lucas Matias - reverso.jpg");
  });
  it("no muta lo recibido", () => {
    const crudo = normalizarLote(lote(dniFrente(1, 1), dniDorso(2, 1)), 2);
    const copia = JSON.stringify(crudo);
    aplicarGrupos(crudo);
    expect(JSON.stringify(crudo)).toBe(copia);
  });
});

describe("cliente del modelo: consulta en lote", () => {
  const respuesta = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status });
  const buena = { content: [{ type: "text", text: "{\"imagenes\":[]}" }], usage: { input_tokens: 6499, output_tokens: 1823 }, stop_reason: "end_turn" };

  it("manda TODAS las imágenes en una sola consulta, numeradas, con el margen de tokens y el esfuerzo medidos", async () => {
    const f = vi.fn(async () => respuesta(buena));
    const r = await crearIA({ apiKey: "clave", fetch: f }).consultarLote(["QUJD", "REVG", "R0hJ"]);
    expect(f).toHaveBeenCalledTimes(1);
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.max_tokens).toBe(maxTokensLote(3));
    expect(body.output_config).toEqual({ effort: "low" });
    expect(body.thinking).toBeUndefined();
    const c = body.messages[0].content;
    expect(c.filter((b) => b.type === "image").map((b) => b.source.data)).toEqual(["QUJD", "REVG", "R0hJ"]);
    expect(c.filter((b) => b.type === "text").slice(0, 3).map((b) => b.text)).toEqual(["Imagen 1:", "Imagen 2:", "Imagen 3:"]);
    expect(c.at(-1).text).toBe(armarPromptLote(3));
    expect(r).toEqual({ texto: "{\"imagenes\":[]}", entrada: 6499, salida: 1823, parada: "end_turn" });
  });
  it("el margen de tokens crece con la cantidad de imágenes (el razonamiento cuenta) y tiene tope", () => {
    expect(maxTokensLote(1)).toBeGreaterThanOrEqual(2000);
    expect(maxTokensLote(10)).toBeGreaterThan(maxTokensLote(4));
    expect(maxTokensLote(500)).toBe(8000);
  });
  it("sin clave no llama; las fallas no filtran la clave", async () => {
    const f = vi.fn();
    await expect(crearIA({ apiKey: "", fetch: f }).consultarLote(["QUJD"])).rejects.toMatchObject({ motivo: "sin_clave" });
    expect(f).not.toHaveBeenCalled();
    const e = await crearIA({ apiKey: "CLAVE-X", fetch: async () => respuesta({ error: { message: "bad CLAVE-X" } }, 401) }).consultarLote(["QUJD"]).catch((x) => x);
    expect(e).toBeInstanceOf(ErrorIA);
    expect(JSON.stringify(e) + e.message + e.stack).not.toContain("CLAVE-X");
    expect((await crearIA({ apiKey: "k", fetch: async () => respuesta({}, 529) }).consultarLote(["QUJD"]).catch((x) => x)).motivo).toBe("saturada");
  });
  it("corta si el lote tarda demasiado", async () => {
    const lento = (url, init) => new Promise((_, no) => init.signal.addEventListener("abort", () => no(Object.assign(new Error("x"), { name: "AbortError" }))));
    expect((await crearIA({ apiKey: "k", fetch: lento, timeoutLoteMs: 20 }).consultarLote(["QUJD"]).catch((x) => x)).motivo).toBe("timeout");
  });
});
