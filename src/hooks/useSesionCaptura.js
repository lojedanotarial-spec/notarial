// Captura de documentos desde el celular — lado de la compu: crea la sesión, genera el QR y espera los datos.
// Lo usan la ventana del QR (modal de partes y de vehículos) y el panel de Scriba. Spec: specs/captura-documentos-celular/.
import { useEffect, useRef, useState } from "react";
import { capturaCompu } from "../utils/capturaApi";

export const CADA_MS = 2000;

// Interruptor único de la captura desde el celular (botones de los modales y herramientas de Scriba).
// Abierto para todos los usuarios desde el 06/11/26. Para volver a restringirlo (por ejemplo a admin) hay que
// decidirlo explícitamente: return !!(auth?.miUsuario?.is_admin || auth?.usuario?.is_admin);
export function capturaCelularHabilitada() {
  return true;
}

// Máquina de la sesión, sin React (se prueba con una API de mentira). Reglas que garantiza:
//  - los datos se aplican UNA sola vez, aunque falle algo después;
//  - "entregar" (el servidor destruye fotos y datos) se pide recién después de aplicarlos bien;
//  - si se cierra antes de entregar, se cancela la sesión (el servidor borra todo), incluso si se cerró
//    antes de que el servidor llegara a responder la creación.
export function iniciarSesionCaptura(api, { modo, contexto, onResultado, onCambio, generarSvg, cadaMs = CADA_MS, ahora = Date.now }) {
  let vivo = true, id = null, entregada = false, aplicada = false, timer = null, liberar = null;
  const emitir = (cambio) => { if (vivo) onCambio(cambio); };
  const pausa = (ms) => new Promise((r) => { liberar = r; timer = setTimeout(r, ms); });

  const correr = async () => {
    let s;
    try { s = await api("crear", { modo, contexto }); }
    catch (e) { emitir({ estado: "error", error: e.message || "No pude crear la captura" }); return; }
    if (!vivo) { api("cancelar", { id: s.id }).catch(() => {}); return; }
    id = s.id;

    let svg;
    try { svg = await generarSvg(s.url); }
    catch (e) { emitir({ estado: "error", error: e.message || "No pude generar el código QR" }); return; }
    if (!vivo) return;
    emitir({ sesion: s, svg, estado: "abierta" });

    while (vivo && !entregada) {
      try {
        const e = await api("estado", { id });
        if (!vivo) return;
        emitir({ fotos: e.fotos, estado: e.estado });
        if (e.estado === "confirmada" && e.resultado) {
          if (!aplicada) {
            aplicada = true;
            try { await onResultado(e.resultado); }
            catch (err) { emitir({ estado: "error", error: err?.message || "No pude cargar los datos" }); return; }
          }
          await api("entregar", { id });
          entregada = true;
          emitir({ estado: "entregada" });
          return;
        }
        if (["cancelada", "vencida", "entregada"].includes(e.estado)) return;
        if (e.estado === "abierta" && e.expira_en && new Date(e.expira_en).getTime() < ahora()) {
          emitir({ estado: "vencida" });
          return;
        }
      } catch (err) {
        if (!vivo) return;
        if (/sesión venció|autenticado/i.test(err.message || "")) { emitir({ estado: "error", error: err.message }); return; }
        // un fallo de red momentáneo no corta la espera
      }
      await pausa(cadaMs);
    }
  };

  const terminada = correr();
  return {
    terminada,
    detener() {
      vivo = false;
      clearTimeout(timer);
      if (liberar) liberar();
      if (id && !entregada) api("cancelar", { id }).catch(() => {});
    },
  };
}

export async function generarSvgQR(url) {
  const QR = (await import("qrcode")).default;
  return QR.toString(url, { type: "svg", margin: 1, width: 240, errorCorrectionLevel: "M" });
}

export function useSesionCaptura({ modo, contexto, onResultado }) {
  const [sesion, setSesion] = useState(null);
  const [svg, setSvg] = useState("");
  const [estado, setEstado] = useState("creando"); // creando | abierta | leida | confirmada | entregada | cancelada | vencida | error
  const [fotos, setFotos] = useState(0);
  const [error, setError] = useState("");
  const alResultado = useRef(onResultado);
  useEffect(() => { alResultado.current = onResultado; });
  const contextoJson = JSON.stringify(contexto || {});

  useEffect(() => {
    const control = iniciarSesionCaptura(capturaCompu, {
      modo,
      contexto: JSON.parse(contextoJson),
      onResultado: (r) => alResultado.current(r),
      generarSvg: generarSvgQR,
      onCambio: (c) => {
        if ("sesion" in c) setSesion(c.sesion);
        if ("svg" in c) setSvg(c.svg);
        if ("estado" in c) setEstado(c.estado);
        if ("fotos" in c) setFotos(c.fotos);
        if ("error" in c) setError(c.error);
      },
    });
    return () => control.detener();
  }, [modo, contextoJson]);

  return { sesion, svg, estado, fotos, error };
}
