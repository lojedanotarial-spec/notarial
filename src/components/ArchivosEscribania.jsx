// Pestaña de archivos de un expediente: se guardan en el almacenamiento privado de Notarial, separados por registro. Cualquier
// usuario del registro sube, ve, descarga y borra, entre con email o con Google. Lo borrado queda 30 días en la papelera
// (el administrador de Notarial puede recuperarlo). Spec: specs/almacenamiento-propio/.
import { useCallback, useEffect, useRef, useState } from "react";
import { C } from "../constants";
import { useAuth } from "../context/AuthContext";
import SubidaCelular from "./SubidaCelular";
import {
  borrarArchivoEscribania, driveEstado, guardarBlob, identificarLote, listarArchivos, listarBorrados, renombrarArchivo,
  restaurarArchivo, subirArchivoEscribania, traerArchivo,
} from "../utils/driveApi";
import {
  LIMITE_ZIP_BYTES, MAX_BYTES_ARCHIVO, TIPOS_ARCHIVO, esPrevisualizable, etiquetaTipo, fechaHora, formatearTamano, hayIdentificacionEnCurso,
  marcaIdentificacion, nombreZip, partir, textoPapelera, totalBytes,
} from "../utils/driveCliente";
import { CANCELADO, armarZip } from "../utils/descargarTodo";
import { miniaturaParaIdentificar } from "../utils/capturaArchivo";

const fuente = "'Montserrat', sans-serif";
const OK = "#2e7d32";      // éxito (D7)
const ERROR = "#c0392b";
const AVISO_TEXTO = "#7a5f18";

const boton = (primario, deshabilitado) => ({
  padding: "7px 16px", borderRadius: 8, fontFamily: fuente, fontSize: 12, fontWeight: 700,
  border: primario ? "none" : `1px solid ${C.cerulean}`,
  background: deshabilitado ? "rgba(26,35,50,.12)" : primario ? C.cerulean : "transparent",
  color: deshabilitado ? C.faint : primario ? "#fff" : "#2f6a8f",
  cursor: deshabilitado ? "default" : "pointer",
});
const botonTexto = { border: "none", background: "transparent", color: "#2f6a8f", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 };

function Aviso({ tipo = "aviso", children }) {
  const [fondo, borde, texto] = tipo === "error" ? ["#fdf0f0", "rgba(192,57,43,.3)", ERROR] : tipo === "ok" ? ["#e8f5e9", "rgba(46,125,50,.3)", OK] : ["rgba(201,169,97,.12)", "rgba(201,169,97,.3)", AVISO_TEXTO];
  return <div role={tipo === "error" ? "alert" : "status"} style={{ background: fondo, border: `1px solid ${borde}`, color: texto, borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>{children}</div>;
}

// Esc cierra (salvo que `bloqueado`, por ejemplo mientras se guarda); tocar el fondo solo cierra los de solo lectura.
function Modal({ children, titulo, ancho = 420, onCerrar, bloqueado = false, cierraAlTocarFondo = false }) {
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === "Escape" && !bloqueado) onCerrar(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar, bloqueado]);
  return (
    <div onClick={cierraAlTocarFondo && !bloqueado ? onCerrar : undefined} style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()} style={{ background: "#FDFCFA", borderRadius: 12, padding: "22px 22px 16px", width: "100%", maxWidth: ancho, maxHeight: "92vh", overflow: "auto", boxShadow: "0 8px 32px rgba(26,35,50,.18)" }}>{children}</div>
    </div>
  );
}

export default function ArchivosEscribania({ expedienteId, archivos, setArchivos, nombreExpediente }) {
  const { miUsuario } = useAuth();
  const esAdmin = !!miUsuario?.is_admin;
  const [estado, setEstado] = useState(null);
  const [tipo, setTipo] = useState(null); // null = lo que corresponda: "Automático" si el servidor lo ofrece, si no "Otro"
  const [cola, setCola] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [vista, setVista] = useState(null);       // { archivo, url, cargando, error }
  const [porBorrar, setPorBorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [aviso, setAviso] = useState("");
  const [qrAbierto, setQrAbierto] = useState(false);
  const [porEditar, setPorEditar] = useState(null);
  const [edicion, setEdicion] = useState({ nombre: "", tipo: "otro" });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [descarga, setDescarga] = useState(null); // null | { fase: "confirmar" | "armando" | "listo" | "error", ... }
  const [papelera, setPapelera] = useState({ abierta: false, cargando: false, lista: [], error: "", restaurando: null });
  const fileRef = useRef(null);
  const cancelarZip = useRef(false);
  const urlVista = useRef(null);

  // Mientras el QR está abierto, vuelve a pedir la lista cada pocos segundos para que lo que llega del celular aparezca solo.
  const refrescar = useCallback(async () => {
    try { setArchivos(await listarArchivos(expedienteId)); } catch { /* se reintenta en el próximo ciclo */ }
  }, [expedienteId, setArchivos]);

  useEffect(() => { driveEstado(expedienteId).then(setEstado).catch(() => setEstado({ propio: true })); }, [expedienteId]);
  useEffect(() => () => { if (urlVista.current) URL.revokeObjectURL(urlVista.current); }, []);

  // "Automático" (identificar y poner nombre solos después de subir) solo si el servidor lo tiene prendido.
  const automaticoDisponible = !!estado?.identificar_compu;
  const tipoActual = tipo ?? (automaticoDisponible ? "automatico" : "otro");

  // Mientras haya archivos identificándose, vuelve a pedir la lista cada 3 segundos para que aparezca el nombre nuevo.
  const identificando = hayIdentificacionEnCurso(archivos);
  useEffect(() => {
    if (!identificando) return undefined;
    const t = setInterval(() => { refrescar(); }, 3000);
    return () => clearInterval(t);
  }, [identificando, refrescar]);

  // Identificación de lo que se acaba de subir con "Automático": las fotos van JUNTAS (de a 10), así el sistema puede emparejar las caras
  // de un mismo documento. Si falla, los archivos quedan guardados y "Sin identificar".
  async function identificarTanda(lista) {
    for (const tanda of partir(lista)) {
      try {
        const items = [];
        for (const p of tanda) items.push({ archivo_id: p.id, miniatura: await miniaturaParaIdentificar(p.file) });
        const r = await identificarLote(items);
        const porId = new Map((r?.archivos || []).map((a) => [a.id, a]));
        setArchivos((prev) => prev.map((a) => (porId.has(a.id) ? { ...a, ...porId.get(a.id) } : a)));
      } catch {
        refrescar();
      }
    }
  }

  const marcar = (id, cambios) => setCola((c) => c.map((x) => (x.id === id ? { ...x, ...cambios } : x)));

  // Sube de a uno (cuida la memoria del celular). Un archivo que falla no frena a los demás.
  async function subir(files) {
    if (!files.length) return;
    setErrorGeneral("");
    const nuevos = files.map((f, i) => ({ id: `${Date.now()}-${i}`, archivo: f, nombre: f.name, estado: "esperando", progreso: 0, mensaje: "" }));
    setCola((c) => [...c, ...nuevos]);
    setSubiendo(true);
    const paraIdentificar = [];   // PRIMERO se suben todos; recién después se identifican, de a uno (nunca en el medio de las subidas)
    for (const item of nuevos) {
      marcar(item.id, { estado: "subiendo" });
      try {
        const automatico = tipoActual === "automatico";
        const nuevo = await subirArchivoEscribania(item.archivo, { expedienteId, tipo: automatico ? "otro" : tipoActual, automatico, onProgreso: (p) => marcar(item.id, { progreso: p }) });
        setArchivos((prev) => [nuevo, ...prev.filter((a) => a.id !== nuevo.id)]);
        if (nuevo.identificacion === "pendiente") paraIdentificar.push({ file: item.archivo, id: nuevo.id });
        marcar(item.id, { estado: "ok", progreso: 1 });
        setTimeout(() => setCola((c) => c.filter((x) => x.id !== item.id)), 4000);
      } catch (e) {
        marcar(item.id, { estado: "error", mensaje: e.message });
      }
    }
    setSubiendo(false);
    if (paraIdentificar.length) await identificarTanda(paraIdentificar);
  }

  // Si al tocar un archivo el servidor dice que ya no está (lo quitó otra persona), no se muestra un error técnico:
  // se actualiza la lista y se avisa en lenguaje claro.
  const esArchivoPerdido = (m) => /No encontré ese archivo|ya no está|no está disponible/i.test(String(m));
  async function archivoPerdido() {
    setErrorGeneral("");
    await refrescar();
    setAviso("Ese archivo ya no estaba (lo quitó otra persona). Actualicé la lista.");
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
      if (esArchivoPerdido(e.message)) { setVista(null); await archivoPerdido(); return; }
      setVista({ archivo: a, url: null, cargando: false, error: e.message });
    }
  }

  const cerrarVista = useCallback(() => {
    if (urlVista.current) { URL.revokeObjectURL(urlVista.current); urlVista.current = null; }
    setVista(null);
  }, []);

  async function descargar(a) {
    setErrorGeneral("");
    try { guardarBlob(await traerArchivo(a.id, true), a.nombre); } catch (e) {
      if (esArchivoPerdido(e.message)) await archivoPerdido(); else setErrorGeneral(e.message);
    }
  }

  function abrirEdicion(a) {
    setEdicion({ nombre: a.nombre, tipo: a.tipo || "otro" });
    setErrorEdicion("");
    setPorEditar(a);
  }

  // Corregir a mano el nombre y el tipo (cualquier usuario del registro). Si le sacás la extensión, el servidor se la devuelve.
  async function guardarEdicion() {
    setGuardandoEdicion(true);
    setErrorEdicion("");
    try {
      const { archivo } = await renombrarArchivo(porEditar.id, edicion);
      setArchivos((prev) => prev.map((a) => (a.id === porEditar.id ? { ...a, ...archivo } : a)));
      setPorEditar(null);
    } catch (e) {
      if (esArchivoPerdido(e.message)) { setPorEditar(null); await archivoPerdido(); } else setErrorEdicion(e.message);
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function borrar() {
    setBorrando(true);
    try {
      await borrarArchivoEscribania(porBorrar.id);
      setArchivos((prev) => prev.filter((a) => a.id !== porBorrar.id));
      setPorBorrar(null);
      if (papelera.abierta) cargarPapelera();
    } catch (e) {
      setPorBorrar(null);
      if (esArchivoPerdido(e.message)) await archivoPerdido(); else setErrorGeneral(e.message);
    } finally {
      setBorrando(false);
    }
  }

  // ── Descargar todo ─────────────────────────────────────────────────────────
  const pesoTotal = totalBytes(archivos);
  const muyPesado = pesoTotal > LIMITE_ZIP_BYTES;

  async function bajarTodo() {
    cancelarZip.current = false;
    setDescarga({ fase: "armando", progreso: { hechos: 0, total: archivos.length, actual: "" } });
    try {
      const { default: JSZip } = await import("jszip");   // se carga recién acá: casi nadie usa esta función
      const { blob, fallidos, incluidos } = await armarZip(archivos, {
        JSZip, traer: (a) => traerArchivo(a.id, true), debeParar: () => cancelarZip.current,
        onProgreso: (p) => setDescarga((d) => (d?.fase === "armando" ? { ...d, progreso: p } : d)),
      });
      if (!incluidos) throw new Error("No pude bajar ningún archivo. Probá de nuevo en un rato.");
      guardarBlob(blob, nombreZip(nombreExpediente));
      setDescarga({ fase: "listo", fallidos, incluidos });
    } catch (e) {
      setDescarga(e.message === CANCELADO ? null : { fase: "error", mensaje: e.message });
    }
  }

  // ── Papelera (solo el administrador de Notarial) ───────────────────────────
  async function cargarPapelera() {
    setPapelera((p) => ({ ...p, cargando: true, error: "" }));
    try {
      const r = await listarBorrados(expedienteId);
      setPapelera((p) => ({ ...p, cargando: false, lista: r.archivos || [] }));
    } catch (e) {
      setPapelera((p) => ({ ...p, cargando: false, error: e.message }));
    }
  }
  function alternarPapelera() {
    const abrir = !papelera.abierta;
    setPapelera((p) => ({ ...p, abierta: abrir }));
    if (abrir) cargarPapelera();
  }
  async function restaurar(a) {
    setPapelera((p) => ({ ...p, restaurando: a.id, error: "" }));
    try {
      await restaurarArchivo(a.id);
      setPapelera((p) => ({ ...p, restaurando: null, lista: p.lista.filter((x) => x.id !== a.id) }));
      await refrescar();
      setAviso(`Listo: "${a.nombre}" volvió a la lista.`);
    } catch (e) {
      setPapelera((p) => ({ ...p, restaurando: null, error: e.message }));
    }
  }

  const progresoZip = descarga?.fase === "armando" ? descarga.progreso : null;
  const nombresListos = archivos.length;

  return (
    <>
      {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}
      {aviso && <Aviso tipo="ok">{aviso} <button onClick={() => setAviso("")} style={{ ...botonTexto, marginLeft: 6 }}>Entendido</button></Aviso>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="tipo-archivo" style={{ fontSize: 12, color: C.faint }}>Tipo:</label>
          <select id="tipo-archivo" value={tipoActual} onChange={(e) => setTipo(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontFamily: fuente, fontSize: 12, color: C.dark }}>
            {automaticoDisponible && <option value="automatico">Automático (le pone nombre solo)</option>}
            {TIPOS_ARCHIVO.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <input ref={fileRef} type="file" multiple style={{ display: "none" }} aria-label="Elegir archivos para subir"
          onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; subir(files); }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setQrAbierto(true)} style={boton(false)}>Subir desde el celular</button>
          <button onClick={() => fileRef.current?.click()} disabled={subiendo} style={boton(true, subiendo)}>
            {subiendo ? "Subiendo…" : "Subir archivos"}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: C.faint, marginBottom: 14, lineHeight: 1.5 }}>
        <strong>Máximo {formatearTamano(MAX_BYTES_ARCHIVO)} por archivo.</strong> Se guardan de forma privada en Notarial y los ve todo el registro.
        Lo que se borra queda 30 días en la papelera.
      </div>

      {cola.length > 0 && (
        <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {cola.map((x) => (
            <div key={x.id} style={{ background: x.estado === "error" ? "#fdf0f0" : "#fff", border: `1px solid ${x.estado === "error" ? "rgba(192,57,43,.3)" : C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: C.dark, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</span>
                <span style={{ color: x.estado === "error" ? ERROR : x.estado === "ok" ? OK : C.faint, flexShrink: 0 }}>
                  {x.estado === "esperando" && "En espera"}
                  {x.estado === "subiendo" && `Subiendo ${Math.round(x.progreso * 100)} %`}
                  {x.estado === "ok" && "Subido"}
                  {x.estado === "error" && <button onClick={() => setCola((c) => c.filter((y) => y.id !== x.id))} style={{ border: "none", background: "transparent", color: ERROR, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Quitar</button>}
                </span>
              </div>
              {x.estado === "subiendo" && <div style={{ height: 4, borderRadius: 3, background: "rgba(26,35,50,.08)", marginTop: 6 }}><div style={{ width: `${Math.round(x.progreso * 100)}%`, height: "100%", background: C.cerulean, borderRadius: 3 }} /></div>}
              {x.estado === "error" && <div style={{ color: ERROR, marginTop: 4, lineHeight: 1.45 }}>{x.mensaje}</div>}
            </div>
          ))}
        </div>
      )}

      {archivos.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 40, color: C.faint }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Todavía no hay archivos en este expediente</div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>Subí fotos de DNI, tarjeta verde, poderes… desde esta computadora, o escaneá el QR para sacarlas con el celular.</div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: C.faint }}>{nombresListos} {nombresListos === 1 ? "archivo" : "archivos"}{pesoTotal > 0 ? ` · ${formatearTamano(pesoTotal)}` : ""}</div>
            <button onClick={() => setDescarga({ fase: "confirmar" })} style={boton(false)}>Descargar todo</button>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {archivos.map((a) => {
              const m = marcaIdentificacion(a);
              return (
                <li key={a.id} style={{ background: "#FDFCFA", borderRadius: 8, padding: "10px 14px", border: "1px solid rgba(26,35,50,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.nombre}
                      {m && m.clave !== "ok" && <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, color: m.tono === "aviso" ? AVISO_TEXTO : "#2f6a8f", background: m.tono === "aviso" ? "rgba(201,169,97,.18)" : C.ceruleanLight }}>{m.texto}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.5 }}>
                      {etiquetaTipo(a.tipo)}{a.tamano ? ` · ${formatearTamano(a.tamano)}` : ""} · {fechaHora(a.created_at)}{a.subido_por_nombre ? ` · subido por ${a.subido_por_nombre}` : ""}{a.origen === "celular" ? " · desde el celular" : ""}{a.identificacion === "ok" ? " · nombre automático" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => abrir(a)} style={boton(false)}>{esPrevisualizable(a.mime_type) ? "Ver" : "Descargar"}</button>
                    {esPrevisualizable(a.mime_type) && <button onClick={() => descargar(a)} style={boton(false)}>Descargar</button>}
                    <button onClick={() => abrirEdicion(a)} style={boton(false)}>Editar</button>
                    <button onClick={() => setPorBorrar(a)} aria-label={`Borrar ${a.nombre}`} style={{ ...boton(false), borderColor: "rgba(192,57,43,.45)", color: ERROR }}>Borrar</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {esAdmin && (
        <div style={{ marginTop: 22, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <button onClick={alternarPapelera} aria-expanded={papelera.abierta} style={botonTexto}>
            {papelera.abierta ? "Ocultar la papelera" : "Ver la papelera (solo administrador)"}
          </button>
          {papelera.abierta && (
            <div style={{ marginTop: 10 }}>
              {papelera.error && <Aviso tipo="error">{papelera.error}</Aviso>}
              {papelera.cargando ? <div style={{ fontSize: 12, color: C.faint }}>Buscando lo borrado…</div>
                : papelera.lista.length === 0 ? <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.5 }}>La papelera de este expediente está vacía. Lo que se borra queda acá 30 días.</div>
                : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {papelera.lista.map((a) => (
                      <li key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 12px", borderRadius: 8, border: `1px dashed ${C.borderStrong}`, background: "#fff" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre}</div>
                          <div style={{ fontSize: 11, color: C.faint }}>Borrado {fechaHora(a.borrado_en)} · {textoPapelera(a.dias_restantes)}</div>
                        </div>
                        <button onClick={() => restaurar(a)} disabled={papelera.restaurando === a.id} style={boton(false, papelera.restaurando === a.id)}>{papelera.restaurando === a.id ? "Restaurando…" : "Restaurar"}</button>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          )}
        </div>
      )}

      {vista && (
        <Modal titulo={vista.archivo.nombre} ancho={820} onCerrar={cerrarVista} cierraAlTocarFondo>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vista.archivo.nombre}</div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => descargar(vista.archivo)} style={boton(false)}>Descargar</button>
              <button onClick={cerrarVista} style={boton(true)}>Cerrar</button>
            </div>
          </div>
          {vista.cargando && <div role="status" style={{ padding: 40, textAlign: "center", color: C.faint, fontSize: 13 }}>Abriendo el archivo…</div>}
          {vista.error && <Aviso tipo="error">{vista.error}</Aviso>}
          {vista.url && (vista.archivo.mime_type === "application/pdf"
            ? <iframe title={vista.archivo.nombre} src={vista.url} style={{ width: "100%", height: "72vh", border: "none", borderRadius: 8, background: "#fff" }} />
            : <img alt={vista.archivo.nombre} src={vista.url} style={{ maxWidth: "100%", maxHeight: "72vh", display: "block", margin: "0 auto", borderRadius: 8 }} />)}
        </Modal>
      )}

      {qrAbierto && (
        <SubidaCelular expedienteId={expedienteId} archivos={archivos} alActualizar={refrescar}
          onCerrar={() => { setQrAbierto(false); refrescar(); }} />
      )}

      {porEditar && (
        <Modal titulo="Editar archivo" onCerrar={() => setPorEditar(null)} bloqueado={guardandoEdicion}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Editar archivo</div>
          <label htmlFor="edit-nombre" style={{ fontSize: 12, color: C.faint }}>Nombre</label>
          <input id="edit-nombre" value={edicion.nombre} onChange={(e) => setEdicion((x) => ({ ...x, nombre: e.target.value }))} maxLength={150}
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", margin: "4px 0 12px", borderRadius: 8, border: `1px solid ${C.borderStrong}`, background: "#fff", fontSize: 13, color: C.dark }} />
          <label htmlFor="edit-tipo" style={{ fontSize: 12, color: C.faint }}>Tipo de documento</label>
          <select id="edit-tipo" value={edicion.tipo} onChange={(e) => setEdicion((x) => ({ ...x, tipo: e.target.value }))}
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", margin: "4px 0 14px", borderRadius: 8, border: `1px solid ${C.borderStrong}`, background: "#fff", fontSize: 13, color: C.dark }}>
            {TIPOS_ARCHIVO.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {porEditar.nombre_original && porEditar.nombre_original !== edicion.nombre && (
            <div style={{ fontSize: 12, color: C.faint, margin: "-6px 0 12px", lineHeight: 1.5 }}>
              Nombre original: <strong style={{ color: C.dark }}>{porEditar.nombre_original}</strong>{" "}
              <button onClick={() => setEdicion((x) => ({ ...x, nombre: porEditar.nombre_original }))} style={botonTexto}>Volver al original</button>
            </div>
          )}
          {errorEdicion && <Aviso tipo="error">{errorEdicion}</Aviso>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setPorEditar(null)} disabled={guardandoEdicion} style={boton(false, guardandoEdicion)}>Cancelar</button>
            <button onClick={guardarEdicion} disabled={guardandoEdicion || !edicion.nombre.trim()} style={boton(true, guardandoEdicion || !edicion.nombre.trim())}>{guardandoEdicion ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </Modal>
      )}

      {porBorrar && (
        <Modal titulo="Borrar archivo" onCerrar={() => setPorBorrar(null)} bloqueado={borrando} cierraAlTocarFondo>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Borrar archivo</div>
          <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5, marginBottom: 18 }}>
            {porBorrar.almacen !== "escribania" ? (
              <>¿Borrar <strong style={{ color: C.dark }}>{porBorrar.nombre}</strong>? Desaparece de la lista para todo el registro y queda <strong>30 días en la papelera</strong>. Pasado ese plazo se elimina para siempre. En esos 30 días, el administrador de Notarial puede recuperarlo.</>
            ) : (
              <>¿Borrar <strong style={{ color: C.dark }}>{porBorrar.nombre}</strong>? Desaparece de la lista para todo el registro, pero queda en la <strong>papelera del Drive anterior</strong>, donde se puede recuperar.</>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button autoFocus onClick={() => setPorBorrar(null)} disabled={borrando} style={boton(false, borrando)}>Cancelar</button>
            <button onClick={borrar} disabled={borrando} style={{ ...boton(true, borrando), background: borrando ? "rgba(26,35,50,.12)" : ERROR }}>{borrando ? "Borrando…" : "Borrar archivo"}</button>
          </div>
        </Modal>
      )}

      {descarga && (
        <Modal titulo="Descargar todo" onCerrar={() => setDescarga(null)} bloqueado={descarga.fase === "armando"}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Descargar todo</div>
          {descarga.fase === "confirmar" && (
            <>
              <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5, marginBottom: 12 }}>
                Se baja un solo archivo comprimido (.zip) con los <strong style={{ color: C.dark }}>{nombresListos} {nombresListos === 1 ? "archivo" : "archivos"}</strong> del expediente
                {pesoTotal > 0 ? <> (<strong style={{ color: C.dark }}>{formatearTamano(pesoTotal)}</strong>)</> : null}, con los nombres que tienen ahora.
              </div>
              {muyPesado && <Aviso>Pesa más de {formatearTamano(LIMITE_ZIP_BYTES)}: armarlo puede tardar mucho o fallar en esta computadora. Si pasa, bajá los archivos de a uno.</Aviso>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setDescarga(null)} style={boton(false)}>Cancelar</button>
                <button autoFocus onClick={bajarTodo} style={boton(true)}>{muyPesado ? "Descargar igual" : "Descargar"}</button>
              </div>
            </>
          )}
          {descarga.fase === "armando" && (
            <>
              <div aria-live="polite" style={{ fontSize: 13, color: C.dark, fontWeight: 600 }}>
                {progresoZip?.armando ? "Armando el archivo comprimido…" : `Preparando ${Math.min((progresoZip?.hechos ?? 0) + 1, progresoZip?.total || 1)} de ${progresoZip?.total || nombresListos}`}
              </div>
              {progresoZip?.actual && <div style={{ fontSize: 12, color: C.faint, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{progresoZip.actual}</div>}
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresoZip?.total ? Math.round((progresoZip.hechos / progresoZip.total) * 100) : 0}
                style={{ height: 6, borderRadius: 3, background: "rgba(26,35,50,.1)", margin: "12px 0", overflow: "hidden" }}>
                <div style={{ width: `${progresoZip?.total ? Math.round((progresoZip.hechos / progresoZip.total) * 100) : 0}%`, height: "100%", background: C.cerulean, transition: "width .25s" }} />
              </div>
              <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.5, marginBottom: 12 }}>No cierres esta ventana. Si un archivo no se puede bajar, seguimos con los demás y te avisamos al final.</div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => { cancelarZip.current = true; }} style={boton(false)}>Cancelar</button>
              </div>
            </>
          )}
          {descarga.fase === "listo" && (
            <>
              <Aviso tipo="ok">Listo: se bajó el archivo comprimido con {descarga.incluidos} {descarga.incluidos === 1 ? "archivo" : "archivos"}.</Aviso>
              {descarga.fallidos.length > 0 && <Aviso>No se pudo bajar: {descarga.fallidos.join(", ")}. Probá bajarlos de a uno desde la lista.</Aviso>}
              <div style={{ display: "flex", justifyContent: "flex-end" }}><button autoFocus onClick={() => setDescarga(null)} style={boton(true)}>Cerrar</button></div>
            </>
          )}
          {descarga.fase === "error" && (
            <>
              <Aviso tipo="error">{descarga.mensaje}</Aviso>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setDescarga(null)} style={boton(false)}>Cerrar</button>
                <button autoFocus onClick={bajarTodo} style={boton(true)}>Reintentar</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
