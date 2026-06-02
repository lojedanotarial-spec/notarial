import { describe, it, expect } from "vitest";

// Los mismos patrones que usa manejarActualizacionLocal en ScribaPanel.jsx
const VERBOS = "añad[ae]?(?:mos)?|sumar?|sum[aé]le?|agrega[r]?|pon[e]?(?:mos)?|ponle|coloca[r]?";
const ROLES  = "vendedor|comprador|donante|donatario|fiduciante|fiduciario|mandante|mandatario|cedente|cesionario|locador|locatario|deudor|acreedor|garante|hipotecante";

function matchEC(texto) {
  return texto.match(
    new RegExp(
      `(?:(?:${VERBOS})\\s+(?:el\\s+|la\\s+)?(?:estado\\s+civil\\s+)?(?:de\\s+)?|estado\\s+civil\\s+)(soltero|casad[ao]|divorciad[ao]|viud[ao]|separad[ao]|conviviente)`,
      "i"
    )
  );
}

function matchRol(texto) {
  return texto.match(
    new RegExp(
      `(?:(?:${VERBOS})\\s+(?:el\\s+|de\\s+)?(?:rol\\s+(?:de\\s+|es\\s+)?)?|(?:su|el)\\s+rol\\s+es\\s+|rol\\s+es\\s+)(${ROLES})`,
      "i"
    )
  );
}

describe("regex estado civil", () => {
  it("añade estado civil soltero", () => {
    expect(matchEC("añade estado civil soltero")?.[1]).toBe("soltero");
  });
  it("suma el estado civil soltero", () => {
    expect(matchEC("suma el estado civil soltero")?.[1]).toBe("soltero");
  });
  it("bare: estado civil soltero", () => {
    expect(matchEC("estado civil soltero")?.[1]).toBe("soltero");
  });
  it("bare: estado civil casado", () => {
    expect(matchEC("estado civil casado")?.[1]).toBe("casado");
  });
  it("suma el estado civil soltero y el rol es comprador — matchea EC", () => {
    expect(matchEC("suma el estado civil soltero y el rol es comprador")?.[1]).toBe("soltero");
  });
  it("no matchea texto sin estado civil", () => {
    expect(matchEC("el rol es comprador")).toBeNull();
  });
});

describe("regex rol", () => {
  it("su rol es comprador", () => {
    expect(matchRol("su rol es comprador")?.[1]).toBe("comprador");
  });
  it("el rol es vendedor", () => {
    expect(matchRol("el rol es vendedor")?.[1]).toBe("vendedor");
  });
  it("suma el estado civil soltero y el rol es comprador — matchea ROL", () => {
    expect(matchRol("suma el estado civil soltero y el rol es comprador")?.[1]).toBe("comprador");
  });
  it("añade el rol de donante", () => {
    expect(matchRol("añade el rol de donante")?.[1]).toBe("donante");
  });
  it("ponle rol locatario", () => {
    expect(matchRol("ponle rol locatario")?.[1]).toBe("locatario");
  });
  it("no matchea texto sin rol", () => {
    expect(matchRol("estado civil soltero")).toBeNull();
  });
});

describe("ambos en un solo mensaje", () => {
  it("matchea EC y ROL en la misma frase", () => {
    const texto = "suma el estado civil soltero y el rol es comprador";
    expect(matchEC(texto)?.[1]).toBe("soltero");
    expect(matchRol(texto)?.[1]).toBe("comprador");
  });
  it("añade estado civil casado, su rol es vendedor", () => {
    const texto = "añade estado civil casado, su rol es vendedor";
    expect(matchEC(texto)?.[1]).toMatch(/casad/i);
    expect(matchRol(texto)?.[1]).toBe("vendedor");
  });
});

describe("normalización ROL a mayúsculas", () => {
  it("siempre toUpperCase del match", () => {
    expect(matchRol("el rol es comprador")?.[1].toUpperCase()).toBe("COMPRADOR");
    expect(matchRol("su rol es vendedor")?.[1].toUpperCase()).toBe("VENDEDOR");
  });
});
