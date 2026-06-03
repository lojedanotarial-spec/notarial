import { describe, it, expect } from "vitest";
import { aplicarTildesNombre } from "../utils/tildesNombres";

describe("aplicarTildesNombre", () => {
  it("nombre simple", () => {
    expect(aplicarTildesNombre("RAUL")).toBe("RAÚL");
    expect(aplicarTildesNombre("JOSE")).toBe("JOSÉ");
    expect(aplicarTildesNombre("MARIA")).toBe("MARÍA");
  });

  it("nombre compuesto", () => {
    expect(aplicarTildesNombre("JOSE LUIS")).toBe("JOSÉ LUIS");
    expect(aplicarTildesNombre("MARIA JOSE")).toBe("MARÍA JOSÉ");
    expect(aplicarTildesNombre("RAUL ALBERTO")).toBe("RAÚL ALBERTO");
  });

  it("nombre sin tilde — no toca lo que no está en el lookup", () => {
    expect(aplicarTildesNombre("CARLOS")).toBe("CARLOS");
    expect(aplicarTildesNombre("LUCAS")).toBe("LUCAS");
    expect(aplicarTildesNombre("DIEGO")).toBe("DIEGO");
  });

  it("maneja vacío y null", () => {
    expect(aplicarTildesNombre("")).toBe("");
    expect(aplicarTildesNombre(null)).toBe(null);
    expect(aplicarTildesNombre(undefined)).toBe(undefined);
  });

  it("más nombres comunes", () => {
    expect(aplicarTildesNombre("MARTIN")).toBe("MARTÍN");
    expect(aplicarTildesNombre("NICOLAS")).toBe("NICOLÁS");
    expect(aplicarTildesNombre("SEBASTIAN")).toBe("SEBASTIÁN");
    expect(aplicarTildesNombre("SOFIA")).toBe("SOFÍA");
    expect(aplicarTildesNombre("TOMAS")).toBe("TOMÁS");
    expect(aplicarTildesNombre("BELEN")).toBe("BELÉN");
    expect(aplicarTildesNombre("FATIMA")).toBe("FÁTIMA");
    expect(aplicarTildesNombre("VICTOR")).toBe("VÍCTOR");
    expect(aplicarTildesNombre("HECTOR")).toBe("HÉCTOR");
    expect(aplicarTildesNombre("ANGEL")).toBe("ÁNGEL");
  });
});
