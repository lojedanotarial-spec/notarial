// Escáner automático para la cámara de la página (celular): mira el visor en vivo, encuentra un documento (una hoja o una
// tarjeta sobre una superficie que contraste), espera a que esté quieto y nítido y avisa cuándo sacar la foto.
// Sin librerías: todo es aritmética sobre una imagen chica en escala de grises (320 px de ancho), unas 6 veces por segundo.
//
// Límites a propósito (Paso 1): encuentra el documento como un rectángulo "casi derecho" (inclinado hasta unos 10°) y
// recorta a ese rectángulo con margen; no endereza la perspectiva. Un documento blanco sobre una mesa blanca no se
// distingue: ahí queda el botón manual. Funciones puras (sin DOM), con pruebas en src/__tests__/escanerDocumento.test.js.

export const ANCHO_ANALISIS = 320;

// Fracción mínima/máxima de la imagen que tiene que ocupar el documento, y cuán "relleno" (rectangular) tiene que ser.
const AREA_MIN = 0.18;
const AREA_MAX = 0.95;
const RELLENO_MIN = 0.72; // una hoja inclinada ~8° llena 0,77 de su caja; a 15° baja a 0,64
const LADO_MIN = 0.25;
const BINS_FIRMA = 8;

export function aGris(rgba, n) {
  const g = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return g;
}

// Umbral de Otsu: el nivel de gris que mejor separa "fondo" de "documento".
export function umbralOtsu(gris) {
  const h = new Float64Array(256);
  for (let i = 0; i < gris.length; i++) h[gris[i]]++;
  const total = gris.length;
  let suma = 0;
  for (let i = 0; i < 256; i++) suma += i * h[i];
  let wB = 0, sumaB = 0, mejor = -1, umbral = 127;
  for (let i = 0; i < 256; i++) {
    wB += h[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumaB += i * h[i];
    const mB = sumaB / wB, mF = (suma - sumaB) / wF;
    const entre = wB * wF * (mB - mF) * (mB - mF);
    if (entre > mejor) { mejor = entre; umbral = i; }
  }
  return umbral;
}

// Componentes conexas (4 vecinos) de una máscara. Devuelve las etiquetas y las estadísticas de cada una.
function etiquetar(mascara, w, h) {
  const n = w * h;
  const etq = new Int32Array(n); // 0 = nada
  const pila = new Int32Array(n);
  const comps = [null]; // índice = etiqueta
  for (let s = 0; s < n; s++) {
    if (!mascara[s] || etq[s]) continue;
    const id = comps.length;
    let tope = 0;
    pila[tope++] = s; etq[s] = id;
    let area = 0, minx = w, maxx = 0, miny = h, maxy = 0;
    while (tope) {
      const p = pila[--tope];
      const x = p % w, y = (p - x) / w;
      area++;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      if (x > 0 && mascara[p - 1] && !etq[p - 1]) { etq[p - 1] = id; pila[tope++] = p - 1; }
      if (x < w - 1 && mascara[p + 1] && !etq[p + 1]) { etq[p + 1] = id; pila[tope++] = p + 1; }
      if (y > 0 && mascara[p - w] && !etq[p - w]) { etq[p - w] = id; pila[tope++] = p - w; }
      if (y < h - 1 && mascara[p + w] && !etq[p + w]) { etq[p + w] = id; pila[tope++] = p + w; }
    }
    comps.push({ id, area, minx, maxx, miny, maxy });
  }
  return { etq, comps };
}

// ¿Esta componente parece un documento? Devuelve { rect (fracciones 0–1), puntaje } o null.
function evaluar(c, etq, w, h) {
  const bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1;
  const fracArea = (bw * bh) / (w * h);
  if (fracArea < AREA_MIN || fracArea > AREA_MAX) return null;
  if (Math.min(bw / w, bh / h) < LADO_MIN) return null;
  // Un documento no toca tres o cuatro bordes a la vez: eso es el fondo (la mesa, la pared).
  const lados = (c.minx <= 1) + (c.maxx >= w - 2) + (c.miny <= 1) + (c.maxy >= h - 2);
  if (lados >= 3) return null;
  // Área "rellena": por cada fila, del primer al último píxel de la componente (tapa el texto y la foto, que son huecos).
  let relleno = 0;
  for (let y = c.miny; y <= c.maxy; y++) {
    let a = -1, b = -1;
    const fila = y * w;
    for (let x = c.minx; x <= c.maxx; x++) if (etq[fila + x] === c.id) { if (a < 0) a = x; b = x; }
    if (a >= 0) relleno += b - a + 1;
  }
  const ocupacion = relleno / (bw * bh);
  if (ocupacion < RELLENO_MIN) return null;
  return { rect: { x: c.minx / w, y: c.miny / h, w: bw / w, h: bh / h }, puntaje: fracArea * ocupacion, ocupacion };
}

// Varianza del laplaciano dentro del rectángulo (achicado un 8 %): más alto = más nítido.
function nitidezEn(gris, w, h, rect) {
  const x0 = Math.max(1, Math.round((rect.x + rect.w * 0.08) * w)), x1 = Math.min(w - 2, Math.round((rect.x + rect.w * 0.92) * w));
  const y0 = Math.max(1, Math.round((rect.y + rect.h * 0.08) * h)), y1 = Math.min(h - 2, Math.round((rect.y + rect.h * 0.92) * h));
  let suma = 0, suma2 = 0, n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = y * w + x;
      const l = 4 * gris[p] - gris[p - 1] - gris[p + 1] - gris[p - w] - gris[p + w];
      suma += l; suma2 += l * l; n++;
    }
  }
  if (!n) return 0;
  const media = suma / n;
  return suma2 / n - media * media;
}

// Histograma de grises (8 tramos) del interior: distingue el anverso del reverso de un documento que no se movió.
function firmaEn(gris, w, h, rect) {
  const x0 = Math.round((rect.x + rect.w * 0.1) * w), x1 = Math.round((rect.x + rect.w * 0.9) * w);
  const y0 = Math.round((rect.y + rect.h * 0.1) * h), y1 = Math.round((rect.y + rect.h * 0.9) * h);
  const bins = new Array(BINS_FIRMA).fill(0);
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { bins[gris[y * w + x] >> 5]++; n++; }
  return n ? bins.map((b) => b / n) : bins;
}

// Analiza UN cuadro (gris w×h). Devuelve { rect, nitidez, firma, ocupacion } o { rect: null }.
export function analizarCuadro(gris, w, h) {
  const umbral = umbralOtsu(gris);
  let mejor = null;
  for (const claro of [true, false]) {
    const mascara = new Uint8Array(w * h);
    for (let i = 0; i < mascara.length; i++) mascara[i] = (gris[i] > umbral) === claro ? 1 : 0;
    const { etq, comps } = etiquetar(mascara, w, h);
    // Se miran las 3 componentes más grandes: la más grande suele ser el fondo.
    const grandes = comps.slice(1).sort((a, b) => b.area - a.area).slice(0, 3);
    for (const c of grandes) {
      const r = evaluar(c, etq, w, h);
      if (r && (!mejor || r.puntaje > mejor.puntaje)) mejor = r;
    }
  }
  if (!mejor) return { rect: null };
  return { rect: mejor.rect, ocupacion: mejor.ocupacion, nitidez: nitidezEn(gris, w, h, mejor.rect), firma: firmaEn(gris, w, h, mejor.rect) };
}

export function distanciaRect(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.w - b.w), Math.abs(a.h - b.h));
}
export function distanciaFirma(a, b) {
  if (!a || !b) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / 2;
}

// Máquina de estados del disparo automático. `actualizar(analisis, ahora_ms)` → { fase, progreso, rect, disparar }.
//   buscando  : no hay documento a la vista
//   apuntando : hay documento, todavía se mueve o recién apareció
//   enfocando : está quieto pero todavía no es nítido
//   esperando : ya sacó la foto de este documento; no saca otra hasta que lo muevan, lo saquen o lo den vuelta
export function crearDisparador(config = {}) {
  const c = { firmeMs: 900, perdidoMs: 800, parpadeoMs: 300, tolMovimiento: 0.03, tolRearme: 0.12, tolFirma: 0.3, ventana: 8, minNitidez: 2, relNitidez: 0.8, ...config };
  let fase = "buscando", desde = 0, ancla = null, perdido = null, ultimo = null, nit = [], disparado = null;

  function reiniciar() { fase = "buscando"; ancla = null; perdido = null; nit = []; disparado = null; }

  function actualizar(a, t) {
    const rect = a?.rect || null;

    if (fase === "esperando") {
      if (!rect) {
        if (perdido === null) perdido = t;
        if (t - perdido >= c.perdidoMs) reiniciar();
        return { fase, progreso: 0, rect: null, disparar: false };
      }
      perdido = null;
      if (distanciaRect(rect, disparado.rect) <= c.tolRearme && distanciaFirma(a.firma, disparado.firma) <= c.tolFirma) {
        return { fase, progreso: 0, rect, disparar: false };
      }
      reiniciar(); // otro documento, otro lugar o el reverso: sigue evaluando este cuadro como uno nuevo
    }

    if (!rect) {
      if (perdido === null) perdido = t;
      if (t - perdido > c.parpadeoMs) { fase = "buscando"; ancla = null; nit = []; ultimo = null; return { fase, progreso: 0, rect: null, disparar: false }; }
      return { fase, progreso: 0, rect: ultimo, disparar: false }; // un cuadro sin detección no corta la cuenta
    }
    perdido = null;
    ultimo = rect;

    if (!ancla || distanciaRect(rect, ancla) > c.tolMovimiento) { ancla = rect; desde = t; nit = []; fase = "apuntando"; }
    nit.push(a.nitidez ?? 0);
    if (nit.length > c.ventana) nit.shift();
    const progreso = Math.min(1, (t - desde) / c.firmeMs);
    if (t - desde < c.firmeMs) return { fase: "apuntando", progreso, rect, disparar: false };

    const mejor = Math.max(...nit);
    const nitido = (a.nitidez ?? 0) >= c.minNitidez && (a.nitidez ?? 0) >= c.relNitidez * mejor;
    if (!nitido) { fase = "enfocando"; return { fase, progreso: 1, rect, disparar: false }; }
    fase = "esperando"; disparado = { rect, firma: a.firma };
    return { fase: "disparado", progreso: 1, rect, disparar: true };
  }

  return { actualizar, reiniciar };
}

// Recorte (en píxeles del video) con margen alrededor del rectángulo detectado. Con margen generoso a propósito:
// perder un borde de un DNI es peor que dejar un poco de mesa.
export function recorteConMargen(rect, ancho, alto, margen = 0.06) {
  const mx = rect.w * margen, my = rect.h * margen;
  const x0 = Math.max(0, rect.x - mx), y0 = Math.max(0, rect.y - my);
  const x1 = Math.min(1, rect.x + rect.w + mx), y1 = Math.min(1, rect.y + rect.h + my);
  const sx = Math.round(x0 * ancho), sy = Math.round(y0 * alto);
  return { sx, sy, sw: Math.max(1, Math.round(x1 * ancho) - sx), sh: Math.max(1, Math.round(y1 * alto) - sy) };
}
