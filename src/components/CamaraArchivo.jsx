// Cámara dentro de la página para ARCHIVAR documentación (subir desde el celular al expediente). Parecida a la de la
// captura de datos (sin flash, varias fotos seguidas sin cerrar nada), pero entrega cada foto a la MÁXIMA resolución que
// el teléfono permita, sin reducirla. Es un componente aparte para no tocar la captura de datos.
// Spec: specs/documentacion-celular-expediente/.
import { useEffect, useRef, useState } from "react";
import { fotogramaAFile } from "../utils/capturaArchivo";

const fuente = "'Montserrat', sans-serif";

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

// `nombrarFoto()` devuelve el nombre de cada foto; `onFoto(file)` recibe el File JPEG; `recientes` = miniaturas ya sacadas.
export default function CamaraArchivo({ cantidad, recientes = [], nombrarFoto, onFoto, onCerrar }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
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
      try {
        // Máxima resolución: se pide lo más alto y el navegador entrega lo que el equipo permita.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 4096 }, height: { ideal: 3072 } },
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
          const s = track.getSettings?.() || {};
          if (s.width && s.height) setResolucion(`${s.width}×${s.height}`);
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
    };
  }, []);

  async function disparar() {
    if (estado !== "lista" || ocupada.current) return;
    ocupada.current = true;
    try {
      const file = await fotogramaAFile(videoRef.current, nombrarFoto());
      onFoto(file);
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
        <video ref={videoRef} playsInline muted autoPlay style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {estado === "lista" && <div style={{ position: "absolute", left: "7%", right: "7%", top: "22%", bottom: "30%", border: `2px dashed ${destello ? "#fff" : "rgba(255,255,255,.6)"}`, borderRadius: 14, pointerEvents: "none", transition: "border-color .1s" }} />}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 14px", background: "linear-gradient(rgba(0,0,0,.65), transparent)" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Sacá todas las fotos que quieras</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>Sin flash · {cantidad} foto{cantidad === 1 ? "" : "s"}{resolucion ? ` · ${resolucion}` : ""}</div>
        </div>
        {estado === "iniciando" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>Abriendo la cámara…</div>}
        {estado === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 16 }}>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{error}</div>
            <button onClick={onCerrar} style={{ ...estiloBoton, padding: "12px 22px", borderRadius: 10, background: "#fff", color: "#1a2332", fontSize: 14, fontWeight: 700 }}>Volver</button>
          </div>
        )}
        {aviso && <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: "rgba(192,57,43,.92)", borderRadius: 10, padding: "9px 12px", fontSize: 13 }}>{aviso}</div>}
        {estado === "lista" && !aviso && <div style={{ position: "absolute", left: 14, right: 14, bottom: 12, fontSize: 12, textAlign: "center", opacity: 0.85, textShadow: "0 1px 3px #000" }}>Evitá los reflejos: inclinás un poco el documento. Cada foto se sube sola.</div>}
      </div>
      <div style={{ background: "#0d1119", padding: "14px 16px calc(14px + env(safe-area-inset-bottom))", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
          {recientes.slice(-4).map((f) => (
            <div key={f.id} style={{ position: "relative", width: 40, height: 52, borderRadius: 6, overflow: "hidden", background: "#222", border: `2px solid ${f.estado === "error" ? "#c0392b" : f.estado === "ok" ? "#3a7ca5" : "rgba(255,255,255,.4)"}`, flexShrink: 0 }}>
              {f.vista && <img src={f.vista} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
          ))}
        </div>
        <button onClick={disparar} disabled={estado !== "lista"} aria-label="Sacar foto"
          style={{ ...estiloBoton, width: 74, height: 74, borderRadius: 37, background: estado === "lista" ? "#fff" : "#555", border: "5px solid rgba(255,255,255,.45)", backgroundClip: "padding-box", transform: destello ? "scale(.92)" : "scale(1)", transition: "transform .1s" }} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onCerrar} style={{ ...estiloBoton, padding: "9px 16px", borderRadius: 10, background: "#fff", color: "#1a2332", fontSize: 14, fontWeight: 700 }}>Listo</button>
        </div>
      </div>
    </div>
  );
}
