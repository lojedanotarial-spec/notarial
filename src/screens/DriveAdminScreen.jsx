// Panel del administrador: Drive de cada escribanía (conectar con un enlace de un solo uso, ver estado, desconectar).
// Spec: specs/drive-escribania/. Solo el administrador puede usarlo: el servidor lo verifica en cada acción.
import { useCallback, useEffect, useState } from "react";
import { C } from "../constants";
import { NavBar } from "../components/NavBar";
import { driveAdmin } from "../utils/driveApi";
import { estadoVisual, fechaHora, formatearTamano, urlGmail, urlWhatsApp } from "../utils/driveCliente";

const fuente = "'Montserrat', sans-serif";

const botonBase = { padding: "7px 14px", borderRadius: 8, fontFamily: fuente, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const botonPrimario = { ...botonBase, border: "none", background: C.cerulean, color: "#fff" };
const botonLinea = (color) => ({ ...botonBase, border: `1.5px solid ${color}`, background: "transparent", color });

function Modal({ children, onCerrar }) {
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.porcelain, borderRadius: 12, padding: "24px 24px 18px", width: "100%", maxWidth: 480, boxShadow: "0 8px 32px rgba(26,35,50,.18)" }}>
        {children}
      </div>
    </div>
  );
}

function ModalEnlace({ enlace, onCerrar }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(enlace.url); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { /* el campo se puede seleccionar a mano */ }
  }
  return (
    <Modal onCerrar={onCerrar}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Enlace para conectar el registro {enlace.registro_numero}</div>
      <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5, marginBottom: 12 }}>
        Mandáselo a quien tiene el mail de la escribanía. Tiene que abrirlo desde una computadora, con ese mail, y tocar “Autorizar con Google”.
        Sirve <strong>una sola vez</strong> y vence el {fechaHora(enlace.expira_en)}. Si generás otro, este deja de servir.
      </div>
      <input readOnly value={enlace.url} onFocus={(e) => e.target.select()}
        style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 12.5, color: C.dark, fontFamily: "monospace" }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button onClick={() => window.open(urlWhatsApp(enlace.url), "_blank", "noopener")} style={botonPrimario}>Enviar por WhatsApp</button>
        <button onClick={() => window.open(urlGmail(enlace.url), "_blank", "noopener")} style={botonPrimario}>Enviar por mail</button>
        <button onClick={copiar} style={botonLinea(C.cerulean)}>{copiado ? "¡Copiado!" : "Copiar enlace"}</button>
      </div>
      <div style={{ textAlign: "right", marginTop: 14 }}>
        <button onClick={onCerrar} style={{ ...botonBase, border: "none", background: "transparent", color: C.muted }}>Cerrar</button>
      </div>
    </Modal>
  );
}

function ModalDesconectar({ registro, trabajando, onConfirmar, onCerrar }) {
  return (
    <Modal onCerrar={onCerrar}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Desconectar el Drive del registro {registro.registro_numero}</div>
      <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5, marginBottom: 16 }}>
        Los usuarios de este registro no van a poder subir ni ver archivos hasta que se vuelva a conectar. Se le quita el permiso a Notarial en
        {" "}<strong>{registro.google_email}</strong>. Los archivos ya guardados <strong>quedan en el Drive de la escribanía</strong>, sin tocar.
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCerrar} disabled={trabajando} style={{ ...botonBase, border: `1px solid ${C.border}`, background: "transparent", color: C.muted }}>Cancelar</button>
        <button onClick={onConfirmar} disabled={trabajando} style={{ ...botonBase, border: "none", background: "#c0392b", color: "#fff" }}>{trabajando ? "Desconectando…" : "Desconectar"}</button>
      </div>
    </Modal>
  );
}

function BarraEspacio({ cuota, color }) {
  if (cuota?.porcentaje == null) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 6, borderRadius: 4, background: "rgba(26,35,50,.08)", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, cuota.porcentaje)}%`, height: "100%", background: color }} />
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{formatearTamano(cuota.usada)} de {formatearTamano(cuota.total)} usados ({Math.round(cuota.porcentaje)} %)</div>
    </div>
  );
}

function TarjetaRegistro({ r, ocupado, onConectar, onDesconectar }) {
  const v = estadoVisual(r);
  return (
    <div style={{ background: C.porcelain, borderRadius: 12, border: "1px solid rgba(26,35,50,.08)", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.ceruleanLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.cerulean, flexShrink: 0 }}>{r.registro_numero}</div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Registro {r.registro_numero}
            <span style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginLeft: 8 }}>{r.usuarios} {r.usuarios === 1 ? "usuario" : "usuarios"}</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: v.color, marginRight: 6 }} />
            <span style={{ color: v.color, fontWeight: 700 }}>{v.etiqueta}</span>
            {r.conectado && <span style={{ color: C.muted }}> · {r.google_email} · desde {fechaHora(r.conectada_en).split(" ")[0]}</span>}
          </div>
        </div>
        {v.accion === "conectar"
          ? <button onClick={() => onConectar(r)} disabled={ocupado} style={botonPrimario}>{ocupado ? "Generando…" : r.conectado ? "Generar enlace para reconectar" : "Generar enlace de conexión"}</button>
          : <button onClick={() => onDesconectar(r)} disabled={ocupado} style={botonLinea("#c0392b")}>Desconectar</button>}
      </div>
      {v.detalle && <div style={{ fontSize: 12, color: v.color === "#27ae60" ? C.faint : v.color, marginTop: 8, lineHeight: 1.45 }}>{v.detalle}</div>}
      {r.conectado && r.estado === "activa" && <BarraEspacio cuota={r.cuota} color={v.color} />}
    </div>
  );
}

export function DriveAdminScreen({ onGo }) {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [enlace, setEnlace] = useState(null);
  const [porDesconectar, setPorDesconectar] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setError("");
      setRegistros((await driveAdmin.estado()).registros);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function conectar(r) {
    setOcupado(r.registro_numero);
    try { setEnlace(await driveAdmin.enlace(r.registro_numero)); } catch (e) { setError(e.message); } finally { setOcupado(""); }
  }

  async function desconectar() {
    const nro = porDesconectar.registro_numero;
    setOcupado(nro);
    try { await driveAdmin.desconectar(nro); setPorDesconectar(null); await cargar(); } catch (e) { setError(e.message); setPorDesconectar(null); } finally { setOcupado(""); }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", overflow: "hidden", background: C.warm }}>
      <NavBar onGo={onGo} screenTitle="Drive de las escribanías" />
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, letterSpacing: "-.02em" }}>Drive de las escribanías</div>
              <div style={{ fontSize: 12.5, color: C.faint, marginTop: 3, lineHeight: 1.45 }}>Cada registro guarda la documentación de sus expedientes en un único Drive: el de la escribanía.</div>
            </div>
            <button onClick={() => onGo("admin")} style={botonLinea(C.muted)}>← Registros</button>
          </div>

          {error && <div style={{ background: "#fdf0f0", color: "#c0392b", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>{error}</div>}
          {cargando
            ? <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>Cargando…</div>
            : registros.map((r) => (
              <TarjetaRegistro key={r.registro_numero} r={r} ocupado={ocupado === r.registro_numero} onConectar={conectar} onDesconectar={setPorDesconectar} />
            ))}
        </div>
      </div>
      {enlace && <ModalEnlace enlace={enlace} onCerrar={() => { setEnlace(null); cargar(); }} />}
      {porDesconectar && <ModalDesconectar registro={porDesconectar} trabajando={ocupado === porDesconectar.registro_numero} onConfirmar={desconectar} onCerrar={() => setPorDesconectar(null)} />}
    </div>
  );
}
