import { describe, it, expect } from "vitest";
import { limpiarDatosCaptura, notaDatosCaptura, resolverDistribucion } from "../../api/_capturaScriba.js";
import { CAMPOS_PERSONA } from "../../api/_captura.js";

const DATOS = {
  modo: "libre",
  personas: [
    { apellido: "PEREZ", nombre: "JUAN", nro_doc: "20123456", tipo_doc: "DNI", fecha_nac: "01/02/1980", calle: "San Martin", numero: "100", _fotos: [0, 1], malicioso: "x" },
    { apellido: "GOMEZ", nombre: "MARIA", nro_doc: "27111222", _discrepancias: [{ campo: "fecha_nac", valores: ["a", "b"] }] },
  ],
  vehiculos: [{ vehiculo: { marca: "FORD", modelo: "FIESTA", dominio: "AB123CD", extra: "no" }, titular: { apellido: "PEREZ", nombre: "JUAN", nro_doc: "20123456" } }],
  dorsos: [{ personas: [{ apellido: "PEREZ", nombre: "JUAN" }] }],
  otros: [{}],
};

describe("limpiar los datos que manda el navegador", () => {
  it("deja solo los campos esperados", () => {
    const d = limpiarDatosCaptura(DATOS);
    expect(d.personas[0]).not.toHaveProperty("malicioso");
    expect(d.personas[0]).not.toHaveProperty("_fotos");
    expect(d.vehiculos[0].vehiculo).toEqual({ marca: "FORD", modelo: "FIESTA", dominio: "AB123CD" });
    expect(d.otros).toBe(1);
  });
  it("rechaza lo que no es un objeto o es enorme", () => {
    expect(limpiarDatosCaptura("hola")).toBeNull();
    expect(limpiarDatosCaptura(null)).toBeNull();
    const persona = Object.fromEntries(CAMPOS_PERSONA.map((k, i) => [k, String.fromCharCode(65 + i).repeat(200)]));
    expect(limpiarDatosCaptura({ personas: Array.from({ length: 20 }, () => persona), vehiculos: [] })).toBeNull();
  });
  it("modo desconocido cae en libre", () => {
    expect(limpiarDatosCaptura({ ...DATOS, modo: "hackeo" }).modo).toBe("libre");
  });
});

describe("la nota que ve el modelo", () => {
  const nota = notaDatosCaptura(limpiarDatosCaptura(DATOS));
  it("numera personas y vehículos", () => {
    expect(nota).toContain("[0] PEREZ, JUAN");
    expect(nota).toContain("[1] GOMEZ, MARIA");
    expect(nota).toContain("dominio AB123CD");
  });
  it("avisa lo que no se pudo leer y las discrepancias", () => {
    expect(nota).toContain("NO SE PUDO LEER: fecha de nacimiento");
    expect(nota).toContain("DISCREPANCIAS");
  });
  it("avisa de los dorsos sin emparejar y le prohíbe usar las otras herramientas", () => {
    expect(nota).toContain("SIN emparejar");
    expect(nota).toContain("distribuir_captura");
    expect(nota).toContain("NO uses completar_parte");
  });
  it("sin datos no agrega nada", () => {
    expect(notaDatosCaptura(null)).toBe("");
  });
});

describe("resolver la distribución", () => {
  const datos = limpiarDatosCaptura(DATOS);

  it("arma la acción con los datos reales (no los que copie el modelo) y los roles en mayúscula", () => {
    const r = resolverDistribucion(datos, { personas: [{ indice: 0, rol: "comprador" }, { indice: 1, rol: "Vendedor" }], vehiculos: [{ indice: 0 }] });
    expect(r.error).toBeUndefined();
    expect(r.accion.tipo).toBe("aplicar_captura");
    expect(r.accion.personas.map((p) => [p.apellido, p.rol])).toEqual([["PEREZ", "COMPRADOR"], ["GOMEZ", "VENDEDOR"]]);
    expect(r.accion.personas[1]).not.toHaveProperty("_discrepancias");
    expect(r.accion.vehiculos[0]).toMatchObject({ dominio: "AB123CD", tipo_vehiculo: "VEHÍCULO" });
    expect(r.accion.resumen).toEqual(["COMPRADOR: PEREZ, JUAN (DNI 20123456)", "VENDEDOR: GOMEZ, MARIA (DNI 27111222)", "Vehículo: FORD FIESTA AB123CD"]);
  });
  it("un índice que no existe es un error para el modelo", () => {
    expect(resolverDistribucion(datos, { personas: [{ indice: 5, rol: "x" }] }).error).toMatch(/no existe/);
    expect(resolverDistribucion(datos, { vehiculos: [{ indice: 3 }] }).error).toMatch(/no existe/);
    expect(resolverDistribucion(datos, { personas: [{ indice: "0", rol: "x" }] }).error).toMatch(/no existe/);
  });
  it("no deja repetir una persona", () => {
    expect(resolverDistribucion(datos, { personas: [{ indice: 0, rol: "a" }, { indice: 0, rol: "b" }] }).error).toMatch(/repetida/);
  });
  it("sin datos o sin nada para aplicar es un error", () => {
    expect(resolverDistribucion(null, { personas: [{ indice: 0 }] }).error).toMatch(/No hay fotos/);
    expect(resolverDistribucion(datos, {}).error).toMatch(/al menos/);
  });
});
