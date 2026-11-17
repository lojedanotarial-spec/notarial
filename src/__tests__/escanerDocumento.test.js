import { describe, it, expect } from "vitest";
import { analizarCuadro, crearDisparador, distanciaRect, recorteConMargen, umbralOtsu } from "../utils/escanerDocumento";

const W = 320, H = 240;

// Cuadro sintético: fondo `fondo`, documento `doc` en el rectángulo (px) con "texto" (rayas oscuras) adentro.
function cuadro({ fondo = 40, doc = 205, rect = { x: 60, y: 50, w: 200, h: 130 }, texto = true, borroso = false, giro = 0 } = {}) {
  const g = new Uint8Array(W * H).fill(fondo);
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, c = Math.cos(giro), s = Math.sin(giro);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // punto en el sistema del documento
      const dx = x - cx, dy = y - cy;
      const u = dx * c + dy * s, v = -dx * s + dy * c;
      if (Math.abs(u) <= rect.w / 2 && Math.abs(v) <= rect.h / 2) {
        let val = doc;
        if (texto && Math.floor((v + rect.h / 2) / 6) % 2 === 0 && Math.abs(u) < rect.w / 2 - 14 && Math.abs(v) < rect.h / 2 - 12) val = borroso ? doc - 25 : 60;
        g[y * W + x] = val;
      }
    }
  }
  return g;
}

const aprox = (a, b, tol = 0.03) => Math.abs(a - b) <= tol;

describe("analizarCuadro", () => {
  it("encuentra una hoja clara sobre una mesa oscura", () => {
    const r = analizarCuadro(cuadro(), W, H);
    expect(r.rect).not.toBeNull();
    expect(aprox(r.rect.x, 60 / W)).toBe(true);
    expect(aprox(r.rect.y, 50 / H)).toBe(true);
    expect(aprox(r.rect.w, 200 / W)).toBe(true);
    expect(aprox(r.rect.h, 130 / H)).toBe(true);
  });

  it("encuentra una tarjeta oscura sobre una mesa clara", () => {
    const r = analizarCuadro(cuadro({ fondo: 220, doc: 70, texto: false }), W, H);
    expect(r.rect).not.toBeNull();
    expect(aprox(r.rect.w, 200 / W)).toBe(true);
  });

  it("no ve nada en una imagen lisa", () => {
    expect(analizarCuadro(new Uint8Array(W * H).fill(120), W, H).rect).toBeNull();
  });

  it("no toma el fondo entero como documento", () => {
    // el documento llena todo el cuadro: toca los cuatro bordes
    expect(analizarCuadro(cuadro({ rect: { x: 0, y: 0, w: W, h: H } }), W, H).rect).toBeNull();
  });

  it("ignora un objeto chico", () => {
    expect(analizarCuadro(cuadro({ rect: { x: 140, y: 100, w: 40, h: 30 } }), W, H).rect).toBeNull();
  });

  it("acepta una inclinación leve y rechaza una de 45°", () => {
    expect(analizarCuadro(cuadro({ giro: (8 * Math.PI) / 180 }), W, H).rect).not.toBeNull();
    expect(analizarCuadro(cuadro({ giro: Math.PI / 4 }), W, H).rect).toBeNull();
  });

  it("el texto nítido da más nitidez que el borroso", () => {
    const nitido = analizarCuadro(cuadro(), W, H).nitidez;
    const borroso = analizarCuadro(cuadro({ borroso: true }), W, H).nitidez;
    expect(nitido).toBeGreaterThan(borroso * 3);
  });

  it("el anverso y el reverso (distinto contenido) tienen firmas distintas", () => {
    const a = analizarCuadro(cuadro({ texto: true }), W, H);
    const b = analizarCuadro(cuadro({ texto: false }), W, H);
    const d = a.firma.reduce((s, v, i) => s + Math.abs(v - b.firma[i]), 0) / 2;
    expect(d).toBeGreaterThan(0.3);
  });
});

describe("umbralOtsu", () => {
  it("separa dos niveles", () => {
    const g = new Uint8Array(100).map((_, i) => (i < 50 ? 30 : 200));
    const t = umbralOtsu(g);
    expect(t).toBeGreaterThanOrEqual(30);
    expect(t).toBeLessThan(200);
  });
});

describe("crearDisparador", () => {
  const rectA = { x: 0.2, y: 0.2, w: 0.6, h: 0.55 };
  const nitido = { rect: rectA, nitidez: 100, firma: [1, 0, 0, 0, 0, 0, 0, 0] };

  function correr(d, analisis, desde, hasta, paso = 150) {
    let ultimo = null;
    for (let t = desde; t <= hasta; t += paso) {
      const r = d.actualizar(typeof analisis === "function" ? analisis(t) : analisis, t);
      if (r.disparar) return { disparo: t, r };
      ultimo = r;
    }
    return { disparo: null, r: ultimo };
  }

  it("no dispara de entrada: espera a que el documento esté quieto casi un segundo", () => {
    const d = crearDisparador();
    expect(d.actualizar(nitido, 0).disparar).toBe(false);
    expect(d.actualizar(nitido, 500).disparar).toBe(false);
    const { disparo } = correr(d, nitido, 600, 3000);
    expect(disparo).toBeGreaterThanOrEqual(900);
    expect(disparo).toBeLessThan(1300);
  });

  it("si el documento se mueve, la cuenta empieza de nuevo", () => {
    const d = crearDisparador();
    let disparos = 0;
    for (let t = 0; t <= 3000; t += 150) {
      const corrido = { ...nitido, rect: { ...rectA, x: 0.2 + (t % 300 === 0 ? 0.08 : 0) } };
      if (d.actualizar(corrido, t).disparar) disparos++;
    }
    expect(disparos).toBe(0);
  });

  it("si no está nítido no dispara, y cuando enfoca sí", () => {
    const d = crearDisparador();
    const analisis = (t) => ({ ...nitido, nitidez: t < 1800 ? 5 : 100 });
    // antes de 1800 la nitidez actual (5) es mucho menor que la mejor vista en la ventana? la ventana arranca en 5: es relativa.
    const { disparo } = correr(d, (t) => ({ ...nitido, nitidez: t < 1500 ? (t % 300 === 0 ? 100 : 5) : 100 }), 0, 4000);
    expect(disparo).not.toBeNull();
    const d2 = crearDisparador();
    const chata = correr(d2, { ...nitido, nitidez: 0.5 }, 0, 4000);
    expect(chata.disparo).toBeNull();
    expect(chata.r.fase).toBe("enfocando");
    void analisis;
  });

  it("después de sacar una foto no saca otra mientras el documento siga igual", () => {
    const d = crearDisparador();
    expect(correr(d, nitido, 0, 3000).disparo).not.toBeNull();
    const otra = correr(d, nitido, 3150, 12000);
    expect(otra.disparo).toBeNull();
    expect(otra.r.fase).toBe("esperando");
  });

  it("vuelve a sacar cuando retiran el documento y ponen otro", () => {
    const d = crearDisparador();
    const primero = correr(d, nitido, 0, 3000);
    expect(primero.disparo).not.toBeNull();
    // sale del cuadro más de 800 ms
    correr(d, { rect: null }, 3150, 4500);
    const segundo = correr(d, nitido, 4650, 8000);
    expect(segundo.disparo).not.toBeNull();
  });

  it("un cuadro suelto sin detección no corta la cuenta", () => {
    const d = crearDisparador();
    let disparo = null;
    for (let t = 0; t <= 3000 && disparo === null; t += 150) {
      const a = t === 450 ? { rect: null } : nitido;
      if (d.actualizar(a, t).disparar) disparo = t;
    }
    expect(disparo).not.toBeNull();
  });

  it("al darlo vuelta (mismo lugar, otro contenido) saca el reverso", () => {
    const d = crearDisparador();
    expect(correr(d, nitido, 0, 3000).disparo).not.toBeNull();
    const reverso = { ...nitido, firma: [0, 0, 0, 0, 0, 0, 0, 1] };
    expect(correr(d, reverso, 3150, 6500).disparo).not.toBeNull();
  });

  it("si el documento se mueve a otro lado después de la foto, rearma", () => {
    const d = crearDisparador();
    expect(correr(d, nitido, 0, 3000).disparo).not.toBeNull();
    const otro = { ...nitido, rect: { x: 0.05, y: 0.1, w: 0.5, h: 0.6 } };
    expect(correr(d, otro, 3150, 6500).disparo).not.toBeNull();
  });
});

describe("recorte", () => {
  it("agrega margen y no se sale de la imagen", () => {
    const c = recorteConMargen({ x: 0.2, y: 0.2, w: 0.6, h: 0.5 }, 1000, 800, 0.1);
    expect(c.sx).toBe(140);
    expect(c.sw).toBe(720);
    const borde = recorteConMargen({ x: 0, y: 0, w: 1, h: 1 }, 1000, 800);
    expect(borde).toEqual({ sx: 0, sy: 0, sw: 1000, sh: 800 });
  });

  it("distanciaRect mide el mayor desvío", () => {
    expect(distanciaRect({ x: 0, y: 0, w: 1, h: 1 }, { x: 0.1, y: 0, w: 1, h: 0.9 })).toBeCloseTo(0.1);
  });
});
