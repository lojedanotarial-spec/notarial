import { describe, it, expect } from "vitest";
import { parseFechaDDMMAAAA, fechaDeHoy } from "../utils/fechas";

const HOY = new Date(2026, 10, 4); // 4/11/2026

describe("parseFechaDDMMAAAA", () => {
  it("enero devuelve mes 0, no el mes actual (bug 04/11/26)", () => {
    expect(parseFechaDDMMAAAA("15/01/2027", HOY)).toEqual({ dia: 15, mes: 0, anio: 2027 });
  });
  it("diciembre devuelve mes 11", () => {
    expect(parseFechaDDMMAAAA("31/12/2026", HOY)).toEqual({ dia: 31, mes: 11, anio: 2026 });
  });
  it("vacío o undefined -> hoy", () => {
    expect(parseFechaDDMMAAAA("", HOY)).toEqual(fechaDeHoy(HOY));
    expect(parseFechaDDMMAAAA(undefined, HOY)).toEqual(fechaDeHoy(HOY));
  });
  it("partes inválidas se completan con hoy", () => {
    expect(parseFechaDDMMAAAA("aa/13/xx", HOY)).toEqual(fechaDeHoy(HOY));
  });
  it("fecha parcial", () => {
    expect(parseFechaDDMMAAAA("10/05/", HOY)).toEqual({ dia: 10, mes: 4, anio: 2026 });
  });
});
