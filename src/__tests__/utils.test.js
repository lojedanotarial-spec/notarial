import { describe, it, expect } from "vitest";
import { diaLetras, anioLetras, gen, numeroALetras } from "../utils";

describe("diaLetras", () => {
  it("devuelve día 1 como PRIMERO y resto como cardinales", () => {
    expect(diaLetras(1)).toBe("PRIMERO");
    expect(diaLetras(2)).toBe("DOS");
    expect(diaLetras(15)).toBe("QUINCE");
    expect(diaLetras(31)).toBe("TREINTA Y UNO");
  });
});

describe("anioLetras", () => {
  it("devuelve el año en palabras", () => {
    expect(anioLetras(2024)).toBe("DOS MIL VEINTICUATRO");
    expect(anioLetras(2025)).toBe("DOS MIL VEINTICINCO");
    expect(anioLetras(2026)).toBe("DOS MIL VEINTISÉIS");
  });
});

describe("gen", () => {
  it("devuelve femenino para F", () => {
    expect(gen({ genero: "F" }, "la señora", "el señor")).toBe("la señora");
  });
  it("devuelve masculino para M y para ausente", () => {
    expect(gen({ genero: "M" }, "la señora", "el señor")).toBe("el señor");
    expect(gen({}, "la señora", "el señor")).toBe("el señor");
  });
});

describe("numeroALetras", () => {
  it("ceros y valores básicos", () => {
    expect(numeroALetras(0)).toBe("CERO CON 00/100");
    expect(numeroALetras(1)).toBe("UNO CON 00/100");
    expect(numeroALetras(10)).toBe("DIEZ CON 00/100");
    expect(numeroALetras(21)).toBe("VEINTIUNO CON 00/100");
    expect(numeroALetras(100)).toBe("CIEN CON 00/100");
  });
  it("miles", () => {
    expect(numeroALetras(1000)).toBe("MIL CON 00/100");
    expect(numeroALetras(15000)).toBe("QUINCE MIL CON 00/100");
    expect(numeroALetras(120000)).toBe("CIENTO VEINTE MIL CON 00/100");
    expect(numeroALetras(110)).toBe("CIENTO DIEZ CON 00/100");
  });
  it("decimales", () => {
    expect(numeroALetras(1.5)).toBe("UNO CON 50/100");
    expect(numeroALetras(99.99)).toBe("NOVENTA Y NUEVE CON 99/100");
  });
  it("no explota con string vacío o null", () => {
    expect(numeroALetras("")).toBe("");
    expect(numeroALetras(null)).toBe("");
    expect(numeroALetras("abc")).toBe("");
  });
});
