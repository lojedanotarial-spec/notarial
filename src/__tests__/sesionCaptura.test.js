import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { iniciarSesionCaptura } from "../hooks/useSesionCaptura.js";

// API de mentira: registra las llamadas y responde según un guion de estados.
function apiFalsa({ estados = [], falloEn = {} } = {}) {
  const llamadas = [];
  let i = 0;
  const api = vi.fn(async (accion, datos) => {
    llamadas.push(accion);
    if (falloEn[accion]) {
      const f = falloEn[accion];
      if (f.veces === undefined || f.veces-- > 0) throw new Error(f.mensaje || "boom");
    }
    if (accion === "crear") return { id: "S1", url: "https://notarial.lat/c/abc", etiqueta: "Etiqueta" };
    if (accion === "estado") return estados[Math.min(i++, estados.length - 1)];
    return { ok: true, ...datos };
  });
  return { api, llamadas };
}

const opciones = (extra = {}) => {
  const cambios = [];
  return {
    cambios,
    o: { modo: "parte", contexto: {}, generarSvg: async () => "<svg/>", onCambio: (c) => cambios.push(c), onResultado: vi.fn(async () => {}), cadaMs: 2000, ...extra },
  };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("sesión de captura (lado compu)", () => {
  it("camino feliz: crea, espera, aplica una vez y recién después entrega", async () => {
    const { api, llamadas } = apiFalsa({ estados: [
      { estado: "abierta", fotos: 1, expira_en: new Date(Date.now() + 600000).toISOString() },
      { estado: "leida", fotos: 2 },
      { estado: "confirmada", fotos: 2, resultado: { personas: [{ apellido: "PEREZ" }] } },
    ] });
    const { o, cambios } = opciones();
    const s = iniciarSesionCaptura(api, o);
    await vi.advanceTimersByTimeAsync(10000);
    await s.terminada;
    expect(o.onResultado).toHaveBeenCalledTimes(1);
    expect(o.onResultado).toHaveBeenCalledWith({ personas: [{ apellido: "PEREZ" }] });
    expect(llamadas.indexOf("entregar")).toBeGreaterThan(llamadas.lastIndexOf("estado"));
    expect(llamadas).not.toContain("cancelar");
    expect(cambios.at(-1)).toEqual({ estado: "entregada" });
  });

  it("si aplicar los datos falla, NO entrega y avisa el error (la limpieza la hace el cierre)", async () => {
    const { api, llamadas } = apiFalsa({ estados: [{ estado: "confirmada", resultado: { x: 1 } }] });
    const { o, cambios } = opciones({ onResultado: vi.fn(async () => { throw new Error("No se encontraron datos"); }) });
    const s = iniciarSesionCaptura(api, o);
    await vi.advanceTimersByTimeAsync(5000);
    await s.terminada;
    expect(llamadas).not.toContain("entregar");
    expect(cambios.at(-1)).toEqual({ estado: "error", error: "No se encontraron datos" });
    s.detener();
    expect(llamadas).toContain("cancelar");
  });

  it("si falla solo el aviso de 'entregar', reintenta SIN volver a aplicar los datos", async () => {
    const { api, llamadas } = apiFalsa({
      estados: [{ estado: "confirmada", resultado: { x: 1 } }],
      falloEn: { entregar: { veces: 2, mensaje: "red" } },
    });
    const { o } = opciones();
    const s = iniciarSesionCaptura(api, o);
    await vi.advanceTimersByTimeAsync(20000);
    await s.terminada;
    expect(o.onResultado).toHaveBeenCalledTimes(1);
    expect(llamadas.filter((a) => a === "entregar").length).toBeGreaterThanOrEqual(1);
  });

  it("un corte de red momentáneo no corta la espera", async () => {
    const { api } = apiFalsa({
      estados: [{ estado: "abierta", fotos: 0 }, { estado: "confirmada", resultado: { x: 1 } }],
      falloEn: { estado: { veces: 2, mensaje: "Failed to fetch" } },
    });
    const { o, cambios } = opciones();
    const s = iniciarSesionCaptura(api, o);
    await vi.advanceTimersByTimeAsync(30000);
    await s.terminada;
    expect(cambios.at(-1)).toEqual({ estado: "entregada" });
  });

  it("si venció la sesión de login, corta y avisa", async () => {
    const { api } = apiFalsa({ estados: [{ estado: "abierta" }], falloEn: { estado: { mensaje: "Tu sesión venció. Volvé a iniciar sesión." } } });
    const { o, cambios } = opciones();
    const s = iniciarSesionCaptura(api, o);
    await vi.advanceTimersByTimeAsync(5000);
    await s.terminada;
    expect(cambios.at(-1).estado).toBe("error");
  });

  it("un código que venció sin que el celular lo usara se marca 'vencida'", async () => {
    const { api } = apiFalsa({ estados: [{ estado: "abierta", fotos: 0, expira_en: new Date(Date.now() - 1000).toISOString() }] });
    const { o, cambios } = opciones();
    const s = iniciarSesionCaptura(api, o);
    await vi.advanceTimersByTimeAsync(5000);
    await s.terminada;
    expect(cambios.at(-1)).toEqual({ estado: "vencida" });
  });

  it("cerrar antes de entregar cancela la sesión (el servidor borra todo)", async () => {
    const { api, llamadas } = apiFalsa({ estados: [{ estado: "abierta", fotos: 1, expira_en: new Date(Date.now() + 600000).toISOString() }] });
    const { o } = opciones();
    const s = iniciarSesionCaptura(api, o);
    await vi.advanceTimersByTimeAsync(3000);
    s.detener();
    await vi.advanceTimersByTimeAsync(1000);
    expect(llamadas).toContain("cancelar");
    expect(llamadas.filter((a) => a === "estado").length).toBeLessThanOrEqual(3);   // y deja de sondear
  });

  it("cerrar ANTES de que el servidor responda la creación también cancela esa sesión", async () => {
    const { api, llamadas } = apiFalsa({ estados: [{ estado: "abierta" }] });
    const { o } = opciones();
    const s = iniciarSesionCaptura(api, o);
    s.detener();                                  // cierra con la creación todavía en vuelo
    await vi.advanceTimersByTimeAsync(1000);
    expect(llamadas).toEqual(["crear", "cancelar"]);
    expect(o.onResultado).not.toHaveBeenCalled();
  });

  it("si no se puede crear la captura, lo dice", async () => {
    const { api } = apiFalsa({ falloEn: { crear: { mensaje: "Modo inválido" } } });
    const { o, cambios } = opciones();
    await iniciarSesionCaptura(api, o).terminada;
    expect(cambios.at(-1)).toEqual({ estado: "error", error: "Modo inválido" });
  });
});
