// Pestaña de archivos de un expediente: se guardan en el Drive de la escribanía (uno por registro), no en el de quien
// sube. Cualquier usuario del registro sube, ve, descarga y borra, entre con email o con Google.
// Spec: specs/drive-escribania/.
import { useEffect, useRef, useState } from "react";
import { C } from "../constants";
import { borrarArchivoEscribania, driveEstado, guardarBlob, subirArchivoEscribania, traerArchivo } from "../utils/driveApi";
import { MAX_BYTES_ARCHIVO, TIPOS_ARCHIVO, esPrevisualizable, etiquetaTipo, fechaHora, formatearTamano } from "../utils/driveCliente";

const fuente = "'Montserrat', sans-serif";
const MENSAJE_DRIVE_CAIDO = "El Drive de la escribanía no está disponible. Avisale a quien administra Notarial.";

const boton = (primario, deshabilitado) => ({
  padding: "7px 16px", borderRadius: 7, fontFamily: fuente, fontSize: 12, fontWeight: 700,
  border: primario ? "none" : `1px solid ${C.cerulean}`,
  background: deshabilitado ? "rgba(26,35,50,.12)" : primario ? C.cerulean : "transparent",
  color: deshabilitado ? C.muted : primario ? "#fff" : C.cerulean,
  cursor: deshabilitado ? "default" : "pointer",
});

function Aviso({ tipo = "aviso", children }) {
  const [fondo, borde, texto] = tipo === "error" ? ["#fdf0f0", "rgba(192,57,43,.3)", "#c0392b"] : ["rgba(201,169,97,.12)", "rgba(201,169,97,.3)", C.dark];
  return <div style={{ background: fondo, border: `1px solid ${borde}`, color: texto, borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>{children}</div>;
}

function Modal({ children, ancho = 420, onCerrar }) {
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#FDFCFA", borderRadius: 12, padding: "22px 22px 16px", width: "100%", maxWidth: ancho, maxHeight: "92vh", overflow: "auto", boxShadow: "0 8px 32px rgba(26,35,50,.18)" }}>{children}</div>
    </div>
  );
}

export default function ArchivosEscribania({ expedienteId, archivos, setArchivos, carpetaId }) {
  const [estadoDrive, setEstadoDrive] = useState(null);
  const [tipo, setTipo] = useState("otro");
  const [cola, setCola] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [vista, setVista] = useState(null);       // { archivo, url, cargando, error }
  const [porBorrar, setPorBorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const fileRef = useRef(null);
  const urlVista = useRef(null);

  async function leerEstado() {
    try { setEstadoDrive(await driveEstado(expedienteId)); } catch { setEstadoDrive({ conectado: true, operativa: true, estado: "activa", sin_espacio: false, desconocido: true }); }
  }
  useEffect(() => { leerEstado(); }, [expedienteId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (urlVista.current) URL.revokeObjectURL(urlVista.current); }, []);

  const sinDrive = estadoDrive && !estadoDrive.conectado;
  const caido = estadoDrive && estadoDrive.conectado && !estadoDrive.operativa;
  const puedeSubir = !subiendo && !sinDrive && !caido;

  const marcar = (id, cambios) => setCola((c) => c.map((x) => (x.id === id ? { ...x, ...cambios } : x)));

  // Sube de a uno (cuida la memoria del celular). Un archivo que falla no frena a los demás.
  async function subir(files) {
    if (!files.length) return;
    setErrorGeneral("");
    const nuevos = files.map((f, i) => ({ id: `${Date.now()}-${i}`, archivo: f, nombre: f.name, estado: "esperando", progreso: 0, mensaje: "" }));
    setCola((c) => [...c, ...nuevos]);
    setSubiendo(true);
    let hubo = false;
    for (const item of nuevos) {
      marcar(item.id, { estado: "subiendo" });
      try {
        const nuevo = await subirArchivoEscribania(item.archivo, { expedienteId, tipo, onProgreso: (p) => marcar(item.id, { progreso: p }) });
        setArchivos((prev) => [nuevo, ...prev.filter((a) => a.id !== nuevo.id)]);
        marcar(item.id, { estado: "ok", progreso: 1 });
        setTimeout(() => setCola((c) => c.filter((x) => x.id !== item.id)), 4000);
      } catch (e) {
        hubo = true;
        marcar(item.id, { estado: "error", mensaje: e.message });
      }
    }
    setSubiendo(false);
    if (hubo) leerEstado();
  }

  async function abrir(a) {
    if (!esPrevisualizable(a.mime_type)) return descargar(a);
    setVista({ archivo: a, url: null, cargando: true, error: "" });
    try {
      const blob = await traerArchivo(a.id, false);
      const url = URL.createObjectURL(blob);
      urlVista.current = url;
      setVista({ archivo: a, url, cargando: false, error: "" });
    } catch (e) {
      setVista({ archivo: a, url: null, cargando: false, error: e.message });
    }
  }

  function cerrarVista() {
    if (urlVista.current) { URL.revokeObjectURL(urlVista.current); urlVista.current = null; }
    setVista(null);
  }

  async function descargar(a) {
    setErrorGeneral("");
    try { guardarBlob(await traerArchivo(a.id, true), a.nombre); } catch (e) { setErrorGeneral(e.message); }
  }

  async function borrar() {
    setBorrando(true);
    try {
      await borrarArchivoEscribania(porBorrar.id);
      setArchivos((prev) => prev.filter((a) => a.id !== porBorrar.id));
      setPorBorrar(null);
    } catch (e) {
      setErrorGeneral(e.message);
      setPorBorrar(null);
    } finally {
      setBorrando(false);
    }
  }

  return (
    <>
      {sinDrive && <Aviso>La escribanía todavía no conectó su Drive. Pedile a quien administra Notarial que lo conecte para poder guardar archivos.</Aviso>}
      {caido && <Aviso tipo="error">{MENSAJE_DRIVE_CAIDO}</Aviso>}
      {estadoDrive?.sin_espacio && !caido && !sinDrive && <Aviso tipo="error">El Drive de la escribanía no tiene más espacio. Avisale a quien administra Notarial.</Aviso>}
      {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="tipo-archivo" style={{ fontSize: 12, color: C.muted }}>Tipo:</label>
          <select id="tipo-archivo" value={tipo} onChange={(e) => setTipo(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "#fff", fontFamily: fuente, fontSize: 12, color: C.dark }}>
            {TIPOS_ARCHIVO.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <input ref={fileRef} type="file" multiple style={{ display: "none" }}
          onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; subir(files); }} />
        <button onClick={() => fileRef.current?.click()} disabled={!puedeSubir} style={boton(true, !puedeSubir)}>
          {subiendo ? "Subiendo…" : "Subir archivos"}
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        <strong>Máximo {formatearTamano(MAX_BYTES_ARCHIVO)} por archivo.</strong> Se guardan en el Drive de la escribanía y los ve todo el registro.
        Lo que se suba a mano directamente en Drive no aparece acá.
        {carpetaId && <> <a href={`https://drive.google.com/drive/folders/${carpetaId}`} target="_blank" rel="noopener noreferrer" style={{ color: C.cerulean, fontWeight: 600 }}>Abrir la carpeta en Drive</a>.</>}
      </div>

      {cola.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {cola.map((x) => (
            <div key={x.id} style={{ background: x.estado === "error" ? "#fdf0f0" : "#fff", border: `1px solid ${x.estado === "error" ? "rgba(192,57,43,.3)" : C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: C.dark, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</span>
                <span style={{ color: x.estado === "error" ? "#c0392b" : x.estado === "ok" ? "#27ae60" : C.muted, flexShrink: 0 }}>
                  {x.estado === "esperando" && "En espera"}
                  {x.estado === "subiendo" && `Subiendo ${Math.round(x.progreso * 100)} %`}
                  {x.estado === "ok" && "✓ Subido"}
                  {x.estado === "error" && <button onClick={() => setCola((c) => c.filter((y) => y.id !== x.id))} style={{ border: "none", background: "transparent", color: "#c0392b", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Quitar ✕</button>}
                </span>
              </div>
              {x.estado === "subiendo" && <div style={{ height: 4, borderRadius: 3, background: "rgba(26,35,50,.08)", marginTop: 6 }}><div style={{ width: `${Math.round(x.progreso * 100)}%`, height: "100%", background: C.cerulean, borderRadius: 3 }} /></div>}
              {x.estado === "error" && <div style={{ color: "#c0392b", marginTop: 4, lineHeight: 1.45 }}>{x.mensaje}</div>}
            </div>
          ))}
        </div>
      )}

      {archivos.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 50, color: C.muted }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>☁️</div>
          <div style={{ fontSize: 13 }}>Todavía no hay archivos en este expediente</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Subí fotos de DNI, tarjeta verde, poderes…</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {archivos.map((a) => (
            <div key={a.id} style={{ background: "#FDFCFA", borderRadius: 9, padding: "10px 14px", border: "1px solid rgba(26,35,50,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 20 }}>{a.mime_type?.startsWith("image/") ? "🖼️" : "📄"}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre}</div>
                  <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5 }}>
                    {etiquetaTipo(a.tipo)}{a.tamano ? ` · ${formatearTamano(a.tamano)}` : ""} · {fechaHora(a.created_at)}{a.subido_por_nombre ? ` · subido por ${a.subido_por_nombre}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => abrir(a)} style={boton(false)}>{esPrevisualizable(a.mime_type) ? "Ver" : "Descargar"}</button>
                {esPrevisualizable(a.mime_type) && <button onClick={() => descargar(a)} style={boton(false)}>Descargar</button>}
                <button onClick={() => setPorBorrar(a)} title="Borrar" aria-label={`Borrar ${a.nombre}`} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(26,35,50,.14)", background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {vista && (
        <Modal ancho={820} onCerrar={cerrarVista}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vista.archivo.nombre}</div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => descargar(vista.archivo)} style={boton(false)}>Descargar</button>
              <button onClick={cerrarVista} style={boton(true)}>Cerrar</button>
            </div>
          </div>
          {vista.cargando && <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 13 }}>Cargando…</div>}
          {vista.error && <Aviso tipo="error">{vista.error}</Aviso>}
          {vista.url && (vista.archivo.mime_type === "application/pdf"
            ? <iframe title={vista.archivo.nombre} src={vista.url} style={{ width: "100%", height: "72vh", border: "none", borderRadius: 8, background: "#fff" }} />
            : <img alt={vista.archivo.nombre} src={vista.url} style={{ maxWidth: "100%", maxHeight: "72vh", display: "block", margin: "0 auto", borderRadius: 8 }} />)}
        </Modal>
      )}

      {porBorrar && (
        <Modal onCerrar={() => !borrando && setPorBorrar(null)}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Borrar archivo</div>
          <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5, marginBottom: 18 }}>
            ¿Borrar <strong style={{ color: C.dark }}>{porBorrar.nombre}</strong>? Desaparece de la lista para todo el registro, pero queda en la <strong>papelera del Drive de la escribanía</strong>, donde se puede recuperar.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setPorBorrar(null)} disabled={borrando} style={boton(false, borrando)}>Cancelar</button>
            <button onClick={borrar} disabled={borrando} style={{ ...boton(true, borrando), background: borrando ? "rgba(26,35,50,.12)" : "#c0392b" }}>{borrando ? "Borrando…" : "Borrar"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
