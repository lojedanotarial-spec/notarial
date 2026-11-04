import { describe, it, expect } from "vitest";
import { nombreDeMiembro, caracterDeMiembro, escribanoDesdeMiembro } from "../utils/escribano";

describe("escribano", () => {
  it("nombre: usa nombre_preferido y si no nombre + apellido", () => {
    expect(nombreDeMiembro({ nombre_preferido: "Fátima A. Taha", nombre: "X", apellido: "Y" })).toBe("Fátima A. Taha");
    expect(nombreDeMiembro({ nombre: "Ana", apellido: "Pérez" })).toBe("Ana Pérez");
  });
  it("carácter respeta rol y género", () => {
    expect(caracterDeMiembro({ rol: "titular", genero: "f" })).toBe("Notaria Titular");
    expect(caracterDeMiembro({ rol: "titular", genero: "m" })).toBe("Notario Titular");
    expect(caracterDeMiembro({ rol: "adscripta" })).toBe("Notaria Adscripta");
    expect(caracterDeMiembro({ rol: "adscripto" })).toBe("Notario Adscripto");
    expect(caracterDeMiembro({ rol: "otro" })).toBe("Notario/a Adscripto/a");
  });
  it("escribanoDesdeMiembro arma el objeto completo", () => {
    expect(escribanoDesdeMiembro({ nombre: "Ana", apellido: "P", rol: "titular", genero: "f", registro: "853", circunscripcion: "primera", localidad_registro: "Mendoza" }))
      .toEqual({ nombre: "Ana P", caracter: "Notaria Titular", registro: "853", circunscripcion: "primera", localidad_registro: "Mendoza", genero: "f" });
  });
});
