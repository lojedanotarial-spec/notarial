// Panel del QR en la compu: muestra el QR del expediente, la cuenta regresiva de 30 minutos y cuántas fotos llegaron, y
// refresca la lista del expediente solo mientras está abierto. Cerrarlo cierra la sesión: el celular deja de poder subir.
// Spec: specs/documentacion-celular-expediente/.
import { useEffect, useRef, useState } from "react";
import { C } from "../constants";
import { celularCerrar, celularCrear } from "../utils/driveApi";
import { cuentaRegresiva } from "../utils/driveCliente";
import { generarSvgQR } from "../hooks/useSesionCaptura";

const fuente = "'Montserrat', sans-serif";
export const CADA_MS = 3000;

const boton = (primario) => ({
  padding: "8px 16px", borderRadius: 8, fontFamily: fuente, fontSize: 12, fontWeight: 700, cursor: "pointer",
  border: primario ? "none" : `1px solid ${C.cerulean}`, background: primario ? C.cerulean : "transparent", color: primario ? "#fff" : C.cerulean,
});

// `archivos` = la lista actual del expediente (para contar lo que llegó en esta sesión); `alActualizar` vuelve a pedirla.
export default function SubidaCelular({ expedienteId, archivos, alActualizar, onCerrar }) {
  const [sesion, setSesion] = useState(null);   // { url, expira_en, sesion_id }
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const [generacion, setGeneracion] = useState(0); // sube para generar un QR nuevo
  const [cerrando, setCerrando] = useState(false);
  const sesionRef = useRef(null);

  // Abre la sesión y dibuja el QR.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const s = await celularCrear(expedienteId);
        if (cancelado) { celularCerrar(s.sesion_id).catch(() => {}); return; }
        sesionRef.current = s;
        setSesion(s);
        setSvg(await generarSvgQR(s.url));
      } catch (e) {
        if (!cancelado) setError(e.message);
      }
    })();
    return () => { cancelado = true; };
  }, [expedienteId, generacion]);

  const vencida = !!sesion && new Date(sesion.expira_en).getTime() <= ahora;

  // Cuenta regresiva y, mientras el QR sirve, consulta de la lista cada 3 segundos para que lo que llega aparezca solo.
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);
  useEffect(() => {
    if (!sesion || vencida) return undefined;
    const t = setInterval(() => { alActualizar?.(); }, CADA_MS);
    return () => clearInterval(t);
  }, [sesion, vencida, alActualizar]);

  async function cerrar() {
    setCerrando(true);
    try { if (sesionRef.current) await celularCerrar(sesionRef.current.sesion_id); } catch { /* si falla, igual vence solo */ }
    onCerrar();
  }

  function otroQR() {
    if (sesionRef.current) celularCerrar(sesionRef.current.sesion_id).catch(() => {});
    sesionRef.current = null;
    setSesion(null); setSvg(""); setError("");
    setGeneracion((g) => g + 1);
  }

  const llegaron = sesion ? archivos.filter((a) => a.sesion_id === sesion.sesion_id).length : 0;

  return (
    // Tocar fuera del panel NO lo cierra: cerrarlo corta la sesión del celular, y no debe pasar por accidente.
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#FDFCFA", borderRadius: 12, padding: "22px 22px 16px", width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(26,35,50,.18)", textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Subir desde el celular</div>
        {error ? (
          <>
            <div style={{ background: "#fdf0f0", color: "#c0392b", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.5, margin: "10px 0", textAlign: "left" }}>{error}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button onClick={otroQR} style={boton(true)}>Reintentar</button>
              <button onClick={onCerrar} style={boton(false)}>Cerrar</button>
            </div>
          </>
        ) : !sesion || !svg ? (
          <div role="status" style={{ padding: "40px 0", fontSize: 13, color: C.faint }}>Generando el QR…</div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: C.faint, lineHeight: 1.5, marginBottom: 8 }}>Escaneá el QR con la cámara del celular. Sacá o elegí todas las fotos de una: se guardan en este expediente, en calidad original.</div>
            <div style={{ opacity: vencida ? 0.2 : 1, display: "inline-block" }} dangerouslySetInnerHTML={{ __html: svg }} />
            {vencida ? (
              <div style={{ margin: "6px 0 2px", fontSize: 13, color: "#c0392b", fontWeight: 600 }}>El QR venció.</div>
            ) : (
              <div style={{ margin: "6px 0 2px", fontSize: 12.5, color: C.muted }}>Vence en <strong style={{ color: C.dark }}>{cuentaRegresiva(sesion.expira_en, ahora)}</strong></div>
            )}
            <div style={{ margin: "4px 0 12px", fontSize: 13, color: C.dark, fontWeight: 600 }}>
              {llegaron === 0 ? "Todavía no llegó ninguna foto" : `${llegaron} ${llegaron === 1 ? "archivo llegó" : "archivos llegaron"} desde el celular`}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {vencida && <button onClick={otroQR} style={boton(true)}>Generar otro QR</button>}
              <button onClick={cerrar} disabled={cerrando} style={boton(!vencida)}>{cerrando ? "Cerrando…" : vencida ? "Cerrar" : "Terminar y cerrar el QR"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
