// Engancha el escáner automático a un <video> en vivo: unas 6 veces por segundo mira un cuadro chico, lo analiza y, cuando el
// documento está quieto y nítido, llama a `alDisparar(rect)`. Lógica pura en utils/escanerDocumento.js.
import { useEffect, useRef, useState } from "react";
import { ANCHO_ANALISIS, aGris, analizarCuadro, crearDisparador, distanciaRect } from "../utils/escanerDocumento";

const INTERVALO_MS = 160;
export const ESTADO_INICIAL = { fase: "buscando", progreso: 0, rect: null, ancho: 0, alto: 0 };

// ¿Cambió algo que se ve? Evita redibujar la cámara en cada cuadro si el marco está quieto.
function cambio(a, b) {
  if (a.fase !== b.fase || a.ancho !== b.ancho || a.alto !== b.alto) return true;
  if (Math.abs(a.progreso - b.progreso) >= 0.08) return true;
  if (!a.rect !== !b.rect) return true;
  return !!a.rect && distanciaRect(a.rect, b.rect) > 0.004;
}

// Preferencia "foto automática" (prendida por defecto). Es una comodidad de este teléfono: si el navegador no deja guardarla, sigue funcionando.
const CLAVE_AUTO = "notarial.camaraAutomatica";
export function usePreferenciaAutomatica() {
  const [auto, setAuto] = useState(() => { try { return localStorage.getItem(CLAVE_AUTO) !== "no"; } catch { return true; } });
  function cambiar(valor) {
    setAuto(valor);
    try { localStorage.setItem(CLAVE_AUTO, valor ? "si" : "no"); } catch { /* sin almacenamiento: queda solo en esta pantalla */ }
  }
  return [auto, cambiar];
}

// `estaPausado()`: true mientras se está sacando una foto (no se analiza nada). Devuelve el estado para dibujar el marco.
export function useEscaner({ videoRef, activo, estaPausado, alDisparar }) {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const ultimo = useRef(ESTADO_INICIAL);
  const funciones = useRef({ estaPausado, alDisparar });
  useEffect(() => { funciones.current = { estaPausado, alDisparar }; });

  useEffect(() => {
    if (!activo) return undefined;
    const lienzo = document.createElement("canvas");
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    const disparador = crearDisparador();
    let id = null;

    function paso() {
      const v = videoRef.current;
      if (!v || !v.videoWidth || v.readyState < 2 || document.hidden || funciones.current.estaPausado?.()) return;
      try {
        const w = ANCHO_ANALISIS, h = Math.max(1, Math.round((w * v.videoHeight) / v.videoWidth));
        if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; }
        ctx.drawImage(v, 0, 0, w, h);
        const analisis = analizarCuadro(aGris(ctx.getImageData(0, 0, w, h).data, w * h), w, h);
        const r = disparador.actualizar(analisis, performance.now());
        const nuevo = { fase: r.fase === "disparado" ? "esperando" : r.fase, progreso: r.progreso, rect: r.rect, ancho: v.videoWidth, alto: v.videoHeight };
        if (cambio(ultimo.current, nuevo)) { ultimo.current = nuevo; setEstado(nuevo); }
        if (r.disparar) funciones.current.alDisparar?.(r.rect);
      } catch {
        clearInterval(id); // si el navegador no deja leer el video, se queda solo el botón manual
      }
    }
    id = setInterval(paso, INTERVALO_MS);
    return () => { clearInterval(id); ultimo.current = ESTADO_INICIAL; setEstado(ESTADO_INICIAL); lienzo.width = 0; lienzo.height = 0; };
  }, [activo, videoRef]);

  return activo ? estado : ESTADO_INICIAL;
}
