// Página pública para conectar el Drive de una escribanía. La abre quien tiene el mail de la escribanía desde el
// enlace que le mandó el administrador (/drive/<codigo>), SIN login: el código del enlace es la autorización.
// También sirve /drive/listo (todo salió bien) y /drive/error?error=... (Google devolvió algo distinto).
// Spec: specs/drive-escribania/.
import { useEffect, useState } from "react";
import { C } from "../constants";
import { drivePublico } from "../utils/driveApi";
import { mensajeRetorno } from "../utils/driveCliente";

const fuente = "'Montserrat', sans-serif";

function Marco({ children }) {
  return (
    // La app fija html/body en alto 100% sin scroll: esta página es su propio contenedor con scroll (si no, en un celular chico se corta).
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", background: C.warm, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", padding: "32px 16px 48px", boxSizing: "border-box" }}>
        <div style={{ fontFamily: fuente, fontWeight: 800, fontSize: 18, color: C.dark, letterSpacing: "-.02em", marginBottom: 18 }}>Notarial</div>
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

const Titulo = ({ children }) => <div style={{ fontFamily: fuente, fontSize: 19, fontWeight: 800, color: C.dark, marginBottom: 10, lineHeight: 1.3 }}>{children}</div>;
const Parrafo = ({ children, style }) => <p style={{ fontSize: 14, color: C.faint, lineHeight: 1.55, margin: "8px 0", ...style }}>{children}</p>;

function Resultado({ icono, color, titulo, detalle }) {
  return (
    <Marco>
      <div style={{ fontSize: 34, color, marginBottom: 6 }} aria-hidden="true">{icono}</div>
      <Titulo>{titulo}</Titulo>
      <Parrafo>{detalle}</Parrafo>
    </Marco>
  );
}

export default function DriveConectar({ parte }) {
  const params = new URLSearchParams(window.location.search);
  const errorDeUrl = params.get("error");
  const [estado, setEstado] = useState(parte === "listo" || parte === "error" ? "fijo" : "cargando");
  const [info, setInfo] = useState(null);
  const [fallo, setFallo] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (estado !== "cargando") return undefined;
    let cancelado = false;
    (async () => {
      try {
        const r = await drivePublico("enlace_info", { codigo: parte });
        if (cancelado) return;
        setInfo(r);
        setEstado(r.valido ? "listo" : "invalido");
      } catch (e) {
        if (cancelado) return;
        setFallo(e.message);
        setEstado("red");
      }
    })();
    return () => { cancelado = true; };
  }, [estado, parte]);

  async function autorizar() {
    setEnviando(true);
    setFallo("");
    try {
      const { url } = await drivePublico("enlace_iniciar", { codigo: parte });
      window.location.assign(url);
    } catch (e) {
      if (e.codigo === "vencido" || e.codigo === "usado") { setInfo({ valido: false, motivo: e.codigo }); setEstado("invalido"); }
      else { setFallo(e.message); setEnviando(false); }
    }
  }

  if (parte === "listo") {
    return <Resultado icono="✓" color="#27ae60" titulo="Listo, el Drive de la escribanía quedó conectado" detalle="No tenés que hacer nada más. Ya podés cerrar esta pestaña: desde ahora, quienes trabajan en Notarial guardan y ven la documentación de los expedientes en el Drive de la escribanía." />;
  }
  if (parte === "error") {
    const m = mensajeRetorno(errorDeUrl);
    return <Resultado icono="!" color="#c0392b" titulo={m.titulo} detalle={m.detalle} />;
  }
  if (estado === "cargando") return <Marco><Parrafo>Cargando…</Parrafo></Marco>;
  if (estado === "red") {
    return <Resultado icono="!" color="#c0392b" titulo="No pudimos abrir el enlace" detalle={`${fallo} Probá de nuevo en un momento.`} />;
  }
  if (estado === "invalido") {
    const m = mensajeRetorno(info?.motivo);
    return <Resultado icono="!" color="#c0392b" titulo={m.titulo} detalle={m.detalle} />;
  }

  const rechazo = errorDeUrl ? mensajeRetorno(errorDeUrl) : null;
  return (
    <Marco>
      <Titulo>Conectar el Drive de la escribanía{info?.registro_numero ? ` (registro ${info.registro_numero})` : ""}</Titulo>
      {rechazo && <div style={{ background: C.fawn50, color: "#8a6d1f", borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.45, margin: "10px 0" }}>{rechazo.titulo}. {rechazo.detalle}</div>}
      <Parrafo>Estás por permitir que Notarial guarde la documentación de los expedientes en el Drive de la escribanía.</Parrafo>
      <div style={{ background: C.ceruleanLight, borderRadius: 10, padding: "12px 14px", margin: "14px 0" }}>
        <div style={{ fontFamily: fuente, fontSize: 12, fontWeight: 800, color: C.cerulean, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 6 }}>Qué estás autorizando</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: C.dark, lineHeight: 1.6 }}>
          <li>Notarial solo puede ver y modificar <strong>los archivos que él mismo guarda</strong>, en una carpeta llamada “Notarial”.</li>
          <li>No puede ver el resto de tu Drive, ni tu correo, ni tu contraseña.</li>
          <li>Podés quitarle el permiso cuando quieras desde tu cuenta de Google (Seguridad → Apps con acceso).</li>
        </ul>
      </div>
      <Parrafo><strong>Hacelo desde una computadora</strong> y, cuando Google te pregunte con qué cuenta, elegí <strong>la de la escribanía</strong>.</Parrafo>
      {fallo && <div style={{ background: "#fdf0f0", color: "#c0392b", borderRadius: 10, padding: "10px 12px", fontSize: 13, margin: "10px 0" }}>{fallo}</div>}
      <button onClick={autorizar} disabled={enviando}
        style={{ width: "100%", marginTop: 8, padding: "14px 16px", borderRadius: 12, border: "none", fontFamily: fuente, fontSize: 15, fontWeight: 700, color: "#fff", background: enviando ? "rgba(26,35,50,.25)" : C.cerulean, cursor: enviando ? "default" : "pointer" }}>
        {enviando ? "Abriendo Google…" : "Autorizar con Google"}
      </button>
      <Parrafo style={{ fontSize: 12, textAlign: "center", marginTop: 12 }}>Este enlace sirve una sola vez.</Parrafo>
    </Marco>
  );
}
