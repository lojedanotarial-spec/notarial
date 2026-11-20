import { describe, it, expect } from "vitest";
import {
  interpretarBusqueda, armarFiltros, etiquetasFiltros, rutaVisible, fechaCorta, hayFiltros, formatoCantidad, FILTROS_VACIOS,
} from "../utils/explorador";

describe("interpretarBusqueda (D25)", () => {
  it("11 dígitos es CUIT, con guiones o sin", () => {
    expect(interpretarBusqueda("20316454313").texto).toBe("Buscando por CUIT 20-31645431-3");
    expect(interpretarBusqueda("20-31645431-3").tipo).toBe("cuit");
  });
  it("7 u 8 dígitos es DNI, con puntos o sin", () => {
    expect(interpretarBusqueda("31645431").texto).toBe("Buscando por DNI 31.645.431");
    expect(interpretarBusqueda("8.442.110").texto).toBe("Buscando por DNI 8.442.110");
  });
  it("otros números buscan por el comienzo", () => {
    expect(interpretarBusqueda("3164").tipo).toBe("numero");
  });
  it("texto busca por nombre, título o acto", () => {
    expect(interpretarBusqueda("  Pérez ").texto).toBe("Buscando por nombre, apellido, título o acto: «Pérez»");
  });
  it("vacío no interpreta nada", () => {
    expect(interpretarBusqueda("   ")).toBeNull();
    expect(interpretarBusqueda(null)).toBeNull();
    expect(interpretarBusqueda("..-")).toBeNull();
  });
});

describe("armarFiltros", () => {
  it("manda solo lo que tiene valor, con el registro activo", () => {
    expect(armarFiltros({ ...FILTROS_VACIOS, clase: "P", anio: 2026, q: " garcia " }, "52")).toEqual({ registro: "52", clase: "P", anio: 2026, q: "garcia" });
  });
  it("sin filtros ni registro, objeto vacío", () => {
    expect(armarFiltros(FILTROS_VACIOS, null)).toEqual({});
    expect(hayFiltros(FILTROS_VACIOS)).toBe(false);
  });
});

describe("etiquetas y ruta (D26)", () => {
  const nombres = { actos: { compraventa_urbana: "Compraventa inmueble urbano" }, personas: { "31645431": "Pérez, Julián" } };
  it("usa los nombres para mostrar, nunca los códigos", () => {
    const f = { ...FILTROS_VACIOS, anio: 2026, clase: "NP", acto: "compraventa_urbana", estado: "revision", persona: "31645431" };
    expect(etiquetasFiltros(f, nombres).map(e => e.label)).toEqual(["Año 2026", "Extraprotocolar", "Compraventa inmueble urbano", "En revisión", "Pérez, Julián"]);
    expect(rutaVisible(f, nombres)).toBe("2026  ›  Extraprotocolar  ›  Compraventa inmueble urbano");
  });
  it("sin filtros la ruta es todo el archivo", () => {
    expect(rutaVisible(FILTROS_VACIOS)).toBe("Todo el archivo");
    expect(etiquetasFiltros(FILTROS_VACIOS)).toEqual([]);
  });
  it("sin definir se llama así", () => {
    expect(etiquetasFiltros({ ...FILTROS_VACIOS, clase: "sin_definir" })[0].label).toBe("Sin definir");
  });
});

describe("formatos", () => {
  it("fecha corta argentina", () => {
    expect(fechaCorta("2026-11-14")).toBe("14/11/2026");
    expect(fechaCorta("2026-11-14T13:00:00Z")).toBe("14/11/2026");
    expect(fechaCorta(null)).toBe("—");
  });
  it("miles con punto", () => {
    expect(formatoCantidad(1240)).toBe("1.240");
    expect(formatoCantidad(undefined)).toBe("0");
  });
});
