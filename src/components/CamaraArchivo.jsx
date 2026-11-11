// Cámara dentro de la página para ARCHIVAR documentación (subir desde el celular al expediente). Parecida a la de la
// captura de datos (sin flash, varias fotos seguidas sin cerrar nada), pero entrega cada foto a la MÁXIMA resolución que
// el teléfono permita, sin reducirla. Es un componente aparte para no tocar la captura de datos.
// Spec: specs/documentacion-celular-expediente/.
//
// Rendimiento (feedback de Lucas, 11/11/26: "la interfaz es sumamente lenta"): donde el navegador lo permite (Chrome en Android) la
// vista previa es un video liviano (1280×960) y la foto se pide aparte con ImageCapture.takePhoto, que la saca a la resolución
// completa del sensor y la comprime el propio teléfono. Antes se dibujaba cada fotograma de 12 MP en un canvas y se comprimía en
// la pantalla: un tirón de más de un segundo por foto. Donde no existe ImageCapture (iPhone) se usa el camino de antes.
import { memo, useEffect, useRef, useState } from "react";
import { C } from "../constants";
import { fotogramaAFile } from "../utils/capturaArchivo";
import { opcionesFotoMaxima } from "../utils/driveCliente";

// Colores propios de la pantalla de la cámara (fondo negro, como cualquier app de cámara): no son parte de la paleta clara del producto.
const CAM = { barra: "#0d1119", vacia: "#222", apagado: "#555", error: "#e57373", sombra: "#000" }; // design-lint-ignore
const fuente = "'Montserrat', sans-serif";
const PREVIA = { width: { ideal: 1280 }, height: { ideal: 960 } };
const MAXIMA = { width: { ideal: 4096 }, height: { ideal: 3072 } };
const MINIMO_ORIGINAL = 2000; // un fotograma de menos de este ancho no es "calidad original"

function mensajeDeError(e) {
  switch (e?.name) {
    case "NotAllowedError": case "SecurityError":
      return "No tengo permiso para usar la cámara. Permitilo en el navegador (candado de la barra de direcciones) y volvé a intentar, o usá la cámara del teléfono o la galería.";
    case "NotFoundError": case "OverconstrainedError":
      return "No encontré una cámara en este dispositivo. Elegí las fotos de la galería.";
    case "NotReadableError":
      return "La cámara está ocupada por otra aplicación. Cerrala y volvé a intentar.";
    default:
      return "No pude abrir la cámara desde la página. Usá la cámara del teléfono o la galería.";
  }
}

const estiloBoton = { border: "none", cursor: "pointer", fontFamily: fuente };
const MENSAJE_SIN_ORIGINAL = "Esta cámara no puede sacar fotos en calidad original desde la página. Tocá Listo y usá «Usar la cámara del teléfono».";

// `nombrarFoto()` devuelve el nombre de cada foto; `onFoto(file)` recibe el File JPEG; `recientes` = miniaturas ya sacadas.
function CamaraArchivo({ cantidad, recientes = [], nombrarFoto, onFoto, onCerrar }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const capturaRef = useRef(null);     // ImageCapture, si el navegador lo tiene
  const opcionesRef = useRef({ fillLightMode: "off" });
  const tiraRef = useRef(null);
  const [estado, setEstado] = useState("iniciando"); // iniciando | lista | error
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [destello, setDestello] = useState(false);
  const [resolucion, setResolucion] = useState("");
  const ocupada = useRef(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setEstado("error"); setError("Este navegador no deja usar la cámara desde la página. Usá la cámara del teléfono o la galería."); return; }
      const conTakePhoto = typeof window.ImageCapture === "function";
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, ...(conTakePhoto ? PREVIA : MAXIMA) },
        });
        if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track.getCapabilities?.() || {};
          const avanzadas = [];
          if (caps.torch) avanzadas.push({ torch: false }); // linterna SIEMPRE apagada
          if (caps.focusMode?.includes?.("continuous")) avanzadas.push({ focusMode: "continuous" });
          if (avanzadas.length) await track.applyConstraints({ advanced: avanzadas });
          if (conTakePhoto) {
            capturaRef.current = new window.ImageCapture(track);
            try {
              const fotoCaps = await capturaRef.current.getPhotoCapabilities();
              opcionesRef.current = opcionesFotoMaxima(fotoCaps);
              if (fotoCaps?.imageWidth?.max) setResolucion(`${fotoCaps.imageWidth.max}×${fotoCaps.imageHeight?.max ?? ""}`);
            } catch { /* se usan las opciones por defecto */ }
          } else {
            const s = track.getSettings?.() || {};
            if (s.width && s.height) setResolucion(`${s.width}×${s.height}`);
          }
        } catch { /* no es crítico */ }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        if (!cancelado) setEstado("lista");
      } catch (e) {
        if (!cancelado) { setEstado("error"); setError(mensajeDeError(e)); }
      }
    })();
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      capturaRef.current = null;
    };
  }, []);

  // La tira de fotos queda mostrando la última sacada.
  useEffect(() => {
    const t = tiraRef.current;
    if (t) t.scrollLeft = t.scrollWidth;
  }, [recientes.length]);

  async function sacarFoto() {
    const nombre = nombrarFoto();
    if (capturaRef.current) {
      try {
        let blob;
        try { blob = await capturaRef.current.takePhoto(opcionesRef.current); } catch { blob = await capturaRef.current.takePhoto(); } // algunos equipos no aceptan las opciones
        return new File([blob], nombre, { type: blob.type || "image/jpeg" });
      } catch {
        capturaRef.current = null; // en este equipo no anda: no se vuelve a intentar
        if (!(videoRef.current?.videoWidth >= MINIMO_ORIGINAL)) throw new Error(MENSAJE_SIN_ORIGINAL);
      }
    }
    return fotogramaAFile(videoRef.current, nombre);
  }

  async function disparar() {
    if (estado !== "lista" || ocupada.current) return;
    ocupada.current = true;
    try {
      onFoto(await sacarFoto());
      setAviso("");
      navigator.vibrate?.(25);
      setDestello(true);
      setTimeout(() => setDestello(false), 140);
    } catch (e) {
      setAviso(e.message || "No pude sacar la foto, probá de nuevo.");
    } finally {
      ocupada.current = false;
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000", display: "flex", flexDirection: "column", fontFamily: fuente, color: "#fff" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* "contain": se ve la imagen COMPLETA que se va a guardar (con "cover" se recortaban los costados y la foto salía con más de lo que se veía) */}
        <video ref={videoRef} playsInline muted autoPlay style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 14px", background: "linear-gradient(rgba(0,0,0,.65), transparent)" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Sacá todas las fotos que quieras</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>Sin flash · calidad original{resolucion ? ` (${resolucion})` : ""}</div>
        </div>
        {estado === "iniciando" && <div role="status" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>Abriendo la cámara…</div>}
        {estado === "error" && (
          <div role="alert" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 16 }}>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{error}</div>
            <button onClick={onCerrar} style={{ ...estiloBoton, padding: "12px 22px", borderRadius: 12, background: "#fff", color: C.dark, fontSize: 14, fontWeight: 700 }}>Volver</button>
          </div>
        )}
        {aviso && <div role="alert" style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: "rgba(192,57,43,.95)", borderRadius: 12, padding: "10px 12px", fontSize: 13, lineHeight: 1.4 }}>{aviso}</div>}
        {estado === "lista" && !aviso && <div style={{ position: "absolute", left: 14, right: 14, bottom: 12, fontSize: 13, textAlign: "center", textShadow: `0 1px 3px ${CAM.sombra}`, opacity: destello ? 1 : 0.92 }}>Que el documento ocupe casi toda la imagen y sin reflejos.</div>}
      </div>

      <div style={{ background: CAM.barra, padding: "10px 16px calc(14px + env(safe-area-inset-bottom))" }}>
        {recientes.length > 0 && (
          <div ref={tiraRef} role="list" aria-label="Fotos sacadas" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, WebkitOverflowScrolling: "touch" }}>
            {recientes.map((f, i) => (
              <div key={f.id} role="listitem" aria-label={`Foto ${i + 1}${f.estado === "error" ? ", no se pudo subir" : ""}`}
                style={{ width: 44, height: 56, borderRadius: 8, overflow: "hidden", background: CAM.vacia, border: `2px solid ${f.estado === "error" ? CAM.error : f.estado === "ok" ? C.ceruleanOnDark : "rgba(255,255,255,.4)"}`, flexShrink: 0 }}>
                {f.vista && <img src={f.vista} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
          <div aria-live="polite" style={{ fontSize: 14, fontWeight: 700 }}>{cantidad} {cantidad === 1 ? "foto" : "fotos"}</div>
          <button onClick={disparar} disabled={estado !== "lista"} aria-label="Sacar foto"
            style={{ ...estiloBoton, width: 72, height: 72, borderRadius: 9999, background: estado === "lista" ? "#fff" : CAM.apagado, border: "5px solid rgba(255,255,255,.45)", backgroundClip: "padding-box", transform: destello ? "scale(.92)" : "scale(1)", transition: "transform .1s" }} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onCerrar} style={{ ...estiloBoton, minHeight: 44, padding: "9px 18px", borderRadius: 12, background: "#fff", color: C.dark, fontSize: 14, fontWeight: 700 }}>Listo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// La cámara solo se vuelve a dibujar si cambia algo que se ve (cantidad o miniaturas). Las funciones que recibe usan referencias y
// estado que no dependen de cada dibujo, así que no hace falta volver a pasarlas: evita redibujar la cámara en cada aviso de la subida.
const mismasFotos = (a, b) => a.length === b.length && a.every((x, i) => x.id === b[i].id && x.estado === b[i].estado && x.vista === b[i].vista);
export default memo(CamaraArchivo, (ant, sig) => ant.cantidad === sig.cantidad && mismasFotos(ant.recientes || [], sig.recientes || []));
