// Cámara propia de la captura de documentos (página del celular). Por qué existe: el selector de archivos del sistema
// abre la cámara NATIVA del teléfono, que (1) arranca con el flash en automático/encendido y arruina un documento
// brillante, y (2) obliga a reabrirla para cada foto. Acá se usa un visor en vivo: capturar el fotograma de un <video>
// nunca dispara el flash, la linterna se fuerza apagada, y se puede sacar una foto atrás de otra sin cerrar nada.
// Spec: specs/captura-documentos-celular/.
import { useEffect, useRef, useState } from "react";
import { capturarFotograma } from "../utils/capturaImagen";

const fuente = "'Montserrat', sans-serif";

function mensajeDeError(e) {
  switch (e?.name) {
    case "NotAllowedError": case "SecurityError":
      return "No tengo permiso para usar la cámara. Permitilo en el navegador (candado de la barra de direcciones) y volvé a intentar, o elegí las fotos de la galería.";
    case "NotFoundError": case "OverconstrainedError":
      return "No encontré una cámara en este dispositivo. Elegí las fotos de la galería.";
    case "NotReadableError":
      return "La cámara está ocupada por otra aplicación. Cerrala y volvé a intentar.";
    default:
      return "No pude abrir la cámara desde la página. Elegí las fotos de la galería.";
  }
}

const estiloBoton = { border: "none", cursor: "pointer", fontFamily: fuente };

export default function CamaraCaptura({ etiqueta, fotos, grupo, esVehiculos, llena, onFoto, onOtroVehiculo, onCerrar }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [estado, setEstado] = useState("iniciando"); // iniciando | lista | error
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [destello, setDestello] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setEstado("error"); setError("Este navegador no deja usar la cámara desde la página. Elegí las fotos de la galería."); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1440 } },
        });
        if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        // Linterna SIEMPRE apagada y enfoque continuo cuando el equipo lo permite (si no lo soporta, se ignora)
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track.getCapabilities?.() || {};
          const avanzadas = [];
          if (caps.torch) avanzadas.push({ torch: false });
          if (caps.focusMode?.includes?.("continuous")) avanzadas.push({ focusMode: "continuous" });
          if (avanzadas.length) await track.applyConstraints({ advanced: avanzadas });
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

  function disparar() {
    if (estado !== "lista") return;
    if (llena) { setAviso("Llegaste al máximo de fotos por lote."); return; }
    try {
      onFoto(capturarFotograma(videoRef.current));
      setAviso("");
      navigator.vibrate?.(25);
      setDestello(true);
      setTimeout(() => setDestello(false), 140);
    } catch (e) {
      setAviso(e.message || "No pude sacar la foto, probá de nuevo.");
    }
  }

  const ultimas = fotos.slice(-4);
  const delGrupo = fotos.filter((f) => f.grupo === grupo && f.estado !== "error").length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000", display: "flex", flexDirection: "column", fontFamily: fuente, color: "#fff" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <video ref={videoRef} playsInline muted autoPlay style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />

        {/* Marco de ayuda para encuadrar el documento */}
        {estado === "lista" && (
          <div style={{ position: "absolute", left: "7%", right: "7%", top: "22%", bottom: "30%", border: `2px dashed ${destello ? "#fff" : "rgba(255,255,255,.6)"}`, borderRadius: 14, pointerEvents: "none", transition: "border-color .1s" }} />
        )}

        {/* Barra superior */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 14px", background: "linear-gradient(rgba(0,0,0,.65), transparent)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{etiqueta}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 3 }}>
            Sin flash · {esVehiculos ? `Vehículo ${grupo + 1}: ${delGrupo} foto${delGrupo === 1 ? "" : "s"}` : `${fotos.filter((f) => f.estado !== "error").length} foto${fotos.filter((f) => f.estado !== "error").length === 1 ? "" : "s"}`}
          </div>
        </div>

        {estado === "iniciando" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>Abriendo la cámara…</div>}
        {estado === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 16 }}>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{error}</div>
            <button onClick={onCerrar} style={{ ...estiloBoton, padding: "12px 22px", borderRadius: 10, background: "#fff", color: "#1a2332", fontSize: 14, fontWeight: 700 }}>Volver</button>
          </div>
        )}
        {aviso && <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: "rgba(192,57,43,.92)", borderRadius: 10, padding: "9px 12px", fontSize: 13 }}>{aviso}</div>}
        {estado === "lista" && !aviso && <div style={{ position: "absolute", left: 14, right: 14, bottom: 12, fontSize: 12, textAlign: "center", opacity: 0.85, textShadow: "0 1px 3px #000" }}>Evitá los reflejos: inclinás un poco el documento. Podés sacar todas las fotos seguidas.</div>}
      </div>

      {/* Barra inferior: miniaturas, disparador, listo */}
      <div style={{ background: "#0d1119", padding: "14px 16px calc(14px + env(safe-area-inset-bottom))", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
          {ultimas.map((f) => (
            <div key={f.key} style={{ position: "relative", width: 40, height: 52, borderRadius: 6, overflow: "hidden", background: "#222", border: `2px solid ${f.estado === "error" ? "#c0392b" : f.estado === "ok" ? "#3a7ca5" : "rgba(255,255,255,.4)"}`, flexShrink: 0 }}>
              {f.vista && <img src={f.vista} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
          ))}
        </div>
        <button onClick={disparar} disabled={estado !== "lista"} aria-label="Sacar foto"
          style={{ ...estiloBoton, width: 74, height: 74, borderRadius: 37, background: estado === "lista" ? "#fff" : "#555", border: "5px solid rgba(255,255,255,.45)", backgroundClip: "padding-box", transform: destello ? "scale(.92)" : "scale(1)", transition: "transform .1s" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          {esVehiculos && (
            <button onClick={onOtroVehiculo} disabled={delGrupo === 0} style={{ ...estiloBoton, padding: "7px 10px", borderRadius: 8, background: delGrupo === 0 ? "rgba(255,255,255,.12)" : "rgba(58,124,165,.9)", color: delGrupo === 0 ? "rgba(255,255,255,.4)" : "#fff", fontSize: 12, fontWeight: 700 }}>
              ＋ Otro vehículo
            </button>
          )}
          <button onClick={onCerrar} style={{ ...estiloBoton, padding: "9px 16px", borderRadius: 10, background: "#fff", color: "#1a2332", fontSize: 14, fontWeight: 700 }}>Listo</button>
        </div>
      </div>
    </div>
  );
}
