import { describe, it, expect } from "vitest";
import { ESTADOS_EXPEDIENTE, ESTADOS_ELEGIBLES, ESTADO_INICIAL, infoEstado } from "../utils/estadosExpediente";

describe("estados del expediente (D33)", () => {
  it("son cuatro, en este orden, y Archivado ya no está", () => {
    expect(ESTADOS_EXPEDIENTE.map(e => e.key)).toEqual(["abierto", "en_tramite", "completado", "cerrado"]);
  });

  it("Cerrado no se elige a mano: lo pone el cierre del expediente", () => {
    expect(ESTADOS_ELEGIBLES.map(e => e.key)).toEqual(["abierto", "en_tramite", "completado"]);
  });

  it("un expediente nuevo empieza abierto", () => {
    expect(ESTADO_INICIAL).toBe("abierto");
    expect(ESTADOS_ELEGIBLES.some(e => e.key === ESTADO_INICIAL)).toBe(true);
  });

  it("todo estado conocido tiene texto, ícono y colores", () => {
    for (const e of ESTADOS_EXPEDIENTE) {
      expect(e.label).toBeTruthy();
      expect(e.icono).toBeTruthy();
      expect(e.color).toBeTruthy();
      expect(e.fondo).toBeTruthy();
    }
  });

  it("un valor viejo o desconocido se muestra tal cual, sin ícono", () => {
    const viejo = infoEstado("archivado");
    expect(viejo.label).toBe("Archivado");
    expect(viejo.icono).toBeNull();
    expect(infoEstado("en_revision").label).toBe("En revision");
    expect(infoEstado(null).label).toBe("Sin estado");
  });
});
