// Regresión 05/11/26: al reabrir un documento "sin ediciones", el estado que vuelca cargar() disparaba
// una regeneración silenciosa que (con la plantilla aún sin cargar) lo reemplazaba por un docx en blanco.
// El hook se renderiza en el servidor (no hay jsdom en este proyecto) solo para obtener su API: los refs
// y callbacks que se prueban acá no dependen de efectos.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { useDocumentoOO, VENTANA_GRACIA_MS } from "../hooks/useDocumentoOO.js";

function montar(opts) {
  const salida = [];
  function Probe() { salida.push(useDocumentoOO(opts)); return null; }
  const silenciar = vi.spyOn(console, "error").mockImplementation(() => {}); // setState fuera de un render real
  renderToString(React.createElement(Probe));
  silenciar.mockRestore();
  return salida[0];
}

describe("useDocumentoOO — reabrir un documento guardado", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("no regenera por los cambios de estado de la propia carga", () => {
    const api = montar({ saltarAutoGenerar: true });
    const generar = vi.fn();
    api.handleGenerarRef.current = generar;

    api.abrirExistente("doc-123", false); // documento sin ediciones manuales: el caso del bug
    expect(api.regenerarSiCorresponde()).toBe(true);
    expect(generar).not.toHaveBeenCalled();
  });

  it("pasada la ventana de gracia, un cambio real del usuario sí regenera", () => {
    const api = montar({ saltarAutoGenerar: true });
    const generar = vi.fn();
    api.handleGenerarRef.current = generar;

    api.abrirExistente("doc-123", false);
    vi.advanceTimersByTime(VENTANA_GRACIA_MS + 100);
    api.regenerarSiCorresponde();
    expect(generar).toHaveBeenCalledTimes(1);
  });

  it("un documento nuevo (sin primera generación) no regenera ni cuenta como generado", () => {
    const api = montar({});
    const generar = vi.fn();
    api.handleGenerarRef.current = generar;

    expect(api.regenerarSiCorresponde()).toBe(false);
    expect(generar).not.toHaveBeenCalled();
  });

  it("generar un documento nuevo no abre ventana de gracia para regenerar", () => {
    const api = montar({});
    const generar = vi.fn();
    api.handleGenerarRef.current = generar;

    api.registrarGenerado({ key: "doc-1", filePath: "doc-1.docx" });
    api.regenerarSiCorresponde();
    expect(generar).toHaveBeenCalledTimes(1);
  });
});
