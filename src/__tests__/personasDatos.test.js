// Datos de personas y lector de documentos compartido.
import { describe, it, expect } from "vitest";
import { armarFilaPersona, estadosCivilesPara, ESTADOS_CIVILES_F, ESTADOS_CIVILES_M } from "../utils/personasDatos.js";
import { mergePersonas } from "../utils/escanearDocumento.js";

describe("fila de persona a guardar", () => {
  it("un DNI vacío se guarda sin valor, para que dos personas sin DNI no choquen con el índice único", () => {
    for (const nroDoc of ["", "  ", undefined, null]) {
      expect(armarFilaPersona({ apellido: "PÉREZ", nroDoc }, "9876").nro_doc).toBeNull();
    }
  });
  it("con DNI lo guarda tal cual y completa los valores por defecto", () => {
    const f = armarFilaPersona({ apellido: "PÉREZ", nombre: "JUAN", nroDoc: "20123456" }, "9876", "2026-11-11T10:00:00Z");
    expect(f).toMatchObject({ registro_id: "9876", apellido: "PÉREZ", nombre: "JUAN", nro_doc: "20123456", tipo_doc: "DNI", genero: "", representaciones: [], updated_at: "2026-11-11T10:00:00Z" });
  });
});

describe("estados civiles", () => {
  it("concuerdan con el género y por defecto van en masculino (como el editor)", () => {
    expect(estadosCivilesPara("F")).toBe(ESTADOS_CIVILES_F);
    expect(estadosCivilesPara("M")).toBe(ESTADOS_CIVILES_M);
    expect(estadosCivilesPara("")).toBe(ESTADOS_CIVILES_M);
    expect(ESTADOS_CIVILES_F).toContain("casada");
    expect(ESTADOS_CIVILES_M).toContain("casado");
  });
});

describe("unir lecturas de varias fotos del mismo documento", () => {
  it("el primer valor no vacío de cada campo gana", () => {
    const frente = { personas: [{ apellido: "PÉREZ", nombre: "JUAN", nro_doc: "", calle: "" }] };
    const dorso = { personas: [{ apellido: "OTRO", nro_doc: "20123456", calle: "San Martín" }] };
    expect(mergePersonas(frente, dorso).personas[0]).toMatchObject({ apellido: "PÉREZ", nombre: "JUAN", nro_doc: "20123456", calle: "San Martín" });
  });
  it("sin lectura previa devuelve la nueva", () => {
    const nueva = { personas: [{ apellido: "X" }] };
    expect(mergePersonas(null, nueva)).toBe(nueva);
  });
});
