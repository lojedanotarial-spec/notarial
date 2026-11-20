import { describe, it, expect } from "vitest";
import { actoNormalizado, claseEfectiva, plantillaDefine, ETIQUETA_CLASE } from "../utils/protocolo";

describe("actoNormalizado (igual que la función de la base)", () => {
  it("usa el slug del acto cuando existe", () => {
    expect(actoNormalizado("compraventa_urbana", "x")).toBe("compraventa_urbana");
  });
  it("traduce las claves viejas de dibujo", () => {
    expect(actoNormalizado("", "certFirma")).toBe("cert_firma");
    expect(actoNormalizado(null, "certFirmaF08")).toBe("cert_firma_f08");
    expect(actoNormalizado(undefined, "escrituraBarrio")).toBe("compraventa_lote");
  });
  it("también traduce una clave vieja que llegó como acto (el editor a veces la pasa así)", () => {
    expect(actoNormalizado("certFirma", "")).toBe("cert_firma");
  });
  it("sin nada es un documento libre", () => {
    expect(actoNormalizado("  ", "")).toBe("documento_libre");
    expect(actoNormalizado(null, null)).toBe("documento_libre");
  });
});

describe("claseEfectiva", () => {
  it("lo elegido a mano le gana a la plantilla", () => {
    expect(claseEfectiva("P", "NP")).toEqual({ clase: "P", origen: "documento" });
    expect(claseEfectiva("NP", "ambas")).toEqual({ clase: "NP", origen: "documento" });
  });
  it("sin elección, manda la plantilla si la define", () => {
    expect(claseEfectiva(null, "NP")).toEqual({ clase: "NP", origen: "catalogo" });
  });
  it("si la plantilla admite las dos formas y nadie eligió, queda sin definir", () => {
    expect(claseEfectiva(null, "ambas")).toEqual({ clase: "sin_definir", origen: "sin_dato" });
    expect(claseEfectiva(undefined, null)).toEqual({ clase: "sin_definir", origen: "sin_dato" });
  });
  it("ignora valores que no son P ni NP", () => {
    expect(claseEfectiva("protocolar", "P")).toEqual({ clase: "P", origen: "catalogo" });
  });
});

describe("textos", () => {
  it("nunca muestra los códigos internos", () => {
    expect(ETIQUETA_CLASE.P).toBe("Protocolar");
    expect(ETIQUETA_CLASE.NP).toBe("Extraprotocolar");
    expect(ETIQUETA_CLASE.sin_definir).toBe("Sin definir");
  });
  it("la plantilla define solo con P o NP", () => {
    expect(plantillaDefine("P")).toBe(true);
    expect(plantillaDefine("ambas")).toBe(false);
    expect(plantillaDefine(null)).toBe(false);
  });
});
