// Vínculo documento-expediente: idempotente y sin duplicar.
import { describe, it, expect } from "vitest";
import { vincularDocumentoAExpediente } from "../utils/expedienteVinculo.js";

function supabaseFalso({ existente = null, errBuscar = null, errInsertar = null } = {}) {
  const llamadas = { insert: [], filtros: [] };
  const buscar = {
    select: () => buscar,
    eq: (k, v) => { llamadas.filtros.push([k, v]); return buscar; },
    maybeSingle: async () => ({ data: existente, error: errBuscar }),
  };
  return {
    llamadas,
    from: () => ({ ...buscar, insert: async (fila) => { llamadas.insert.push(fila); return { error: errInsertar }; } }),
  };
}

describe("vincular un documento con su expediente", () => {
  it("crea el vínculo si no existe", async () => {
    const sb = supabaseFalso();
    expect(await vincularDocumentoAExpediente(sb, "e1", "d1")).toEqual({ ok: true, yaExistia: false });
    expect(sb.llamadas.insert).toEqual([{ expediente_id: "e1", documento_id: "d1" }]);
    expect(sb.llamadas.filtros).toEqual([["expediente_id", "e1"], ["documento_id", "d1"]]);
  });
  it("si ya existe no lo duplica", async () => {
    const sb = supabaseFalso({ existente: { id: "x" } });
    expect(await vincularDocumentoAExpediente(sb, "e1", "d1")).toEqual({ ok: true, yaExistia: true });
    expect(sb.llamadas.insert).toEqual([]);
  });
  it("si otro guardado lo creó justo antes (23505) lo toma como hecho", async () => {
    const sb = supabaseFalso({ errInsertar: { code: "23505", message: "dup" } });
    expect(await vincularDocumentoAExpediente(sb, "e1", "d1")).toEqual({ ok: true, yaExistia: true });
  });
  it("un error real se informa, sin tirar la excepción", async () => {
    expect(await vincularDocumentoAExpediente(supabaseFalso({ errInsertar: { code: "42501", message: "sin permiso" } }), "e1", "d1")).toEqual({ ok: false, error: "sin permiso" });
    expect(await vincularDocumentoAExpediente(supabaseFalso({ errBuscar: { message: "red" } }), "e1", "d1")).toEqual({ ok: false, error: "red" });
  });
  it("sin expediente o sin documento no hace nada", async () => {
    const sb = supabaseFalso();
    expect((await vincularDocumentoAExpediente(sb, null, "d1")).ok).toBe(false);
    expect((await vincularDocumentoAExpediente(sb, "e1", undefined)).ok).toBe(false);
    expect(sb.llamadas.insert).toEqual([]);
  });
});
