import { describe, it, expect } from "vitest";
import { buildVars, sustituirVars } from "../utils/templateVars";

const parteBase = {
  apellido:    "MORAN",
  nombre:      "RAUL ALBERTO",
  genero:      "M",
  nroDoc:      "22358282",
  nacionalidad:"argentina",
  estadoCivil: "soltero",
  rol:         "comprador",
  calle:       "Av. San Martín",
  numero:      "1234",
  localidad:   "Mendoza",
  departamento:"Capital",
  fechaNac:    "1971-08-21",
};

const escribanoBase = {
  nombre:          "ANA GARCÍA",
  caracter:        "Titular",
  registro:        "123",
  circunscripcion: "primera",
};

const fechaBase = { dia: 2, mes: 5, anio: 2026, ciudad: "Mendoza" };

describe("buildVars", () => {
  it("no explota con partes vacías", () => {
    expect(() => buildVars({ partes: [], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} })).not.toThrow();
  });

  it("genera PARTE_1 con parte completa", () => {
    const vars = buildVars({ partes: [parteBase], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} });
    expect(vars.PARTE_1_APELLIDO).toBe("MORAN");
    expect(vars.PARTE_1_NOMBRE).toBe("RAUL ALBERTO");
    expect(vars.PARTE_1_DNI).toBe("22.358.282");
    expect(vars.PARTE_1_NOMBRE).toBe("Raul Alberto");   // título case
    expect(vars.PARTE_1_APELLIDO).toBe("MORAN");        // uppercase
    expect(vars.PARTE_1_ESTADO_CIVIL).toBe("soltero");
  });

  it("ROL siempre en mayúsculas", () => {
    const vars = buildVars({ partes: [{ ...parteBase, rol: "comprador" }], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} });
    expect(vars.PARTE_1_ROL).toBe("COMPRADOR");
  });

  it("concordancia de nacionalidad masculino", () => {
    const vars = buildVars({ partes: [{ ...parteBase, genero: "M", nacionalidad: "argentina" }], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} });
    expect(vars.PARTE_1_NACIONALIDAD).toBe("argentino");
  });

  it("nacionalidad femenina no se modifica", () => {
    const vars = buildVars({ partes: [{ ...parteBase, genero: "F", nacionalidad: "argentina" }], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} });
    expect(vars.PARTE_1_NACIONALIDAD).toBe("argentina");
  });

  it("fecha de nacimiento formateada", () => {
    const vars = buildVars({ partes: [parteBase], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} });
    expect(vars.PARTE_1_FECHA_NAC).toBe("21 de agosto de 1971");
  });

  it("artículo de género correcto", () => {
    const varsM = buildVars({ partes: [{ ...parteBase, genero: "M" }], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} });
    const varsF = buildVars({ partes: [{ ...parteBase, genero: "F" }], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} });
    expect(varsM.PARTE_1_ARTICULO).toBe("el señor");
    expect(varsF.PARTE_1_ARTICULO).toBe("la señora");
  });

  it("variables de escribano correctas", () => {
    const vars = buildVars({ partes: [], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} });
    expect(vars.ESCRIBANO_NOMBRE).toBe("ANA GARCÍA");
    expect(vars.ESCRIBANO_REGISTRO).toBe("123");
    expect(vars.ESCRIBANO_CIRCUNSCRIPCION).toBe("primera");
  });

  it("fecha en letras", () => {
    const vars = buildVars({ partes: [], escribano: escribanoBase, fecha: fechaBase, protocolo: {}, instrumento: {} });
    expect(vars.FECHA_DIA_LETRAS).toBeTruthy();
    expect(vars.FECHA_MES_LETRAS).toBe("JUNIO");
    expect(vars.FECHA_ANIO_LETRAS).toBeTruthy();
  });
});

describe("sustituirVars", () => {
  it("reemplaza variables conocidas", () => {
    const vars = { NOMBRE: "RAUL", DNI: "22.358.282" };
    expect(sustituirVars("Hola {{NOMBRE}}, DNI {{DNI}}", vars)).toBe("Hola RAUL, DNI 22.358.282");
  });

  it("deja intactas las variables desconocidas", () => {
    const vars = { NOMBRE: "RAUL" };
    expect(sustituirVars("{{NOMBRE}} - {{APELLIDO}}", vars)).toBe("RAUL - {{APELLIDO}}");
  });

  it("no explota con texto sin variables", () => {
    expect(sustituirVars("texto plano", {})).toBe("texto plano");
  });
});
