import { describe, it, expect } from "vitest";
import { htmlATexto, pareceHtml, aTextoPlano } from "../utils/htmlATexto";

describe("htmlATexto", () => {
  it("un párrafo por línea", () => {
    expect(htmlATexto("<p>Uno</p><p>Dos</p>")).toBe("Uno\nDos");
  });
  it("span de variable conserva {{VAR}}", () => {
    expect(htmlATexto('<p>Lote <span data-variable="LOTE" class="v">{{LOTE}}</span></p>')).toBe("Lote {{LOTE}}");
  });
  it("negrita y subrayado pasan a marcas del generador", () => {
    expect(htmlATexto("<p><strong>COMPARECE</strong> y <u>firma</u></p>")).toBe("**COMPARECE** y __firma__");
  });
  it("br es salto, entidades se decodifican, sin líneas vacías", () => {
    expect(htmlATexto("<p>a&nbsp;b &amp; c<br>d</p><p></p>")).toBe("a b & c\nd");
  });
  it("vacío", () => {
    expect(htmlATexto("")).toBe("");
    expect(htmlATexto(null)).toBe("");
  });
});

describe("aTextoPlano", () => {
  it("texto plano pasa sin tocar (incluye < de comparaciones)", () => {
    const t = "ESCRITURA {{N}}\nsuperficie < 100 m2";
    expect(pareceHtml(t)).toBe(false);
    expect(aTextoPlano(t)).toBe(t);
  });
  it("HTML se convierte", () => {
    expect(aTextoPlano("<p>Hola {{X}}</p>")).toBe("Hola {{X}}");
  });
});
