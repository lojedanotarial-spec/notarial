// Captura de documentos desde el celular — lado de la compu: crea la sesión, muestra el QR y espera los datos.
// Lo usan el modal de partes, el de vehículos y el panel de Scriba. Spec: specs/captura-documentos-celular/.
import { useEffect, useState } from "react";
import { C } from "../constants";
import { useAuth } from "../context/AuthContext";
import { useSesionCaptura, capturaCelularHabilitada } from "../hooks/useSesionCaptura";

const TEXTO_ESTADO = {
  creando: "Preparando el código…",
  abierta: "Esperando las fotos del celular…",
  leida: "Revisando lo leído en el celular…",
  confirmada: "Cargando los datos…",
  entregada: "Listo, los datos ya están cargados.",
  vencida: "El código venció. Cerrá y generá uno nuevo.",
  cancelada: "La captura se canceló.",
};

// Cuadro con el QR (para usar dentro de una ventana o del panel de Scriba)
export function PanelQR({ estado, svg, fotos, etiqueta, error }) {
  return (
    <div style={{ textAlign: "center" }}>
      {etiqueta && <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 10 }}>{etiqueta}</div>}
      {svg && estado !== "vencida" && estado !== "entregada" && (
        <div style={{ display: "inline-block", padding: 8, background: "#fff", borderRadius: 10, border: `1px solid ${C.border}` }}
          dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      <div style={{ fontSize: 13, color: estado === "error" || estado === "vencida" ? "#c0392b" : C.faint, marginTop: 10, lineHeight: 1.5 }}>
        {estado === "error" ? (error || "No pude crear la captura.") : TEXTO_ESTADO[estado] || ""}
        {estado === "abierta" && fotos > 0 && <div><strong>{fotos}</strong> {fotos === 1 ? "foto recibida" : "fotos recibidas"}</div>}
      </div>
      {estado === "abierta" && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          Escaneá el código con la cámara del celular. Podés sacar fotos o elegir las que ya tenés guardadas.
        </div>
      )}
    </div>
  );
}

function VentanaCaptura({ titulo, modo, contexto, onResultado, onClose }) {
  const { sesion, svg, estado, fotos, error } = useSesionCaptura({ modo, contexto, onResultado });
  useEffect(() => {
    if (estado !== "entregada") return undefined;
    const t = setTimeout(onClose, 700);
    return () => clearTimeout(t);
  }, [estado, onClose]);
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.porcelain, borderRadius: 12, padding: "20px 24px", width: 340, maxWidth: "92vw", boxShadow: "0 8px 32px rgba(26,35,50,.2)", fontFamily: "'Montserrat', sans-serif" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 14, textAlign: "center" }}>{titulo || "Subir desde el celular"}</div>
        <PanelQR estado={estado} svg={svg} fotos={fotos} etiqueta={sesion?.etiqueta} error={error} />
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "7px 18px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.dark, cursor: "pointer", fontFamily: "'Montserrat', sans-serif" }}>
            {estado === "entregada" ? "Cerrar" : "Cancelar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Botón "Desde el celular" que abre la ventana con el QR.
export function CapturaBtn({ modo, contexto, onResultado, titulo, style }) {
  const auth = useAuth();
  const [abierto, setAbierto] = useState(false);
  if (!capturaCelularHabilitada(auth)) return null;
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6,
          border: `1px solid ${C.cerulean}`, background: "transparent", color: C.cerulean,
          fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Montserrat', sans-serif", ...style,
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" />
        </svg>
        Desde el celular
      </button>
      {abierto && <VentanaCaptura titulo={titulo} modo={modo} contexto={contexto} onResultado={onResultado} onClose={() => setAbierto(false)} />}
    </>
  );
}
