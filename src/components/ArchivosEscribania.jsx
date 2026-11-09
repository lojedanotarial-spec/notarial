// Pestaña de archivos de un expediente: se guardan en el Drive de la escribanía (uno por registro), no en el de quien
// sube. Cualquier usuario del registro sube, ve, descarga y borra, entre con email o con Google.
// Spec: specs/drive-escribania/.
import { useCallback, useEffect, useRef, useState } from "react";
import { C } from "../constants";
import SubidaCelular from "./SubidaCelular";
import { borrarArchivoEscribania, driveEstado, guardarBlob, identificarLote, listarArchivos, renombrarArchivo, sincronizarDrive, subirArchivoEscribania, traerArchivo } from "../utils/driveApi";
import { MAX_BYTES_ARCHIVO, TIPOS_ARCHIVO, esPrevisualizable, etiquetaTipo, fechaHora, formatearTamano, marcaIdentificacion, hayIdentificacionEnCurso, partir } from "../utils/driveCliente";
import { miniaturaParaIdentificar } from "../utils/capturaArchivo";

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
  const [tipo, setTipo] = useState(null); // null = lo que corresponda: "Automático" si el servidor lo ofrece, si no "Otro"
  const [cola, setCola] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [vista, setVista] = useState(null);       // { archivo, url, cargando, error }
  const [porBorrar, setPorBorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [qrAbierto, setQrAbierto] = useState(false);
  const [avisoSync, setAvisoSync] = useState("");
  const [sincronizando, setSincronizando] = useState(false);
  const ultimaSync = useRef(0);
  const [porEditar, setPorEditar] = useState(null);
  const [edicion, setEdicion] = useState({ nombre: "", tipo: "otro" });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");
  const fileRef = useRef(null);

  // Mientras el QR está abierto, vuelve a pedir la lista cada pocos segundos para que lo que llega del celular aparezca solo.
  const refrescar = useCallback(async () => {
    try { setArchivos(await listarArchivos(expedienteId)); } catch { /* se reintenta en el próximo ciclo */ }
  }, [expedienteId, setArchivos]);
  const urlVista = useRef(null);

  async function leerEstado() {
    try { setEstadoDrive(await driveEstado(expedienteId)); } catch { setEstadoDrive({ conectado: true, operativa: true, estado: "activa", sin_espacio: false, desconocido: true }); }
  }
  // Notarial solo se entera de lo que borra él mismo: si alguien borra un archivo directo en Drive, se compara con lo que hay en la carpeta y
  // se oculta. Automático al abrir la pestaña (a lo sumo una vez por minuto) y a mano con "Actualizar". Si Drive no responde, no oculta nada.
  async function sincronizar(manual = false) {
    if (!manual && Date.now() - ultimaSync.current < 60_000) return;
    ultimaSync.current = Date.now();
    if (manual) setSincronizando(true);
    try {
      const r = await sincronizarDrive(expedienteId);
      if (r?.ocultados > 0) {
        // Se sacan de la lista ya mismo (sin esperar otra consulta) y después se vuelve a pedir para quedar al día.
        const ocultos = new Set(r.ids || []);
        if (ocultos.size) setArchivos((prev) => prev.filter((a) => !ocultos.has(a.id)));
        await refrescar();
        setAvisoSync(`Se ${r.ocultados === 1 ? "ocultó 1 archivo que se borró" : `ocultaron ${r.ocultados} archivos que se borraron`} directo en Drive.`);
      } else if (manual) {
        setAvisoSync(r?.disponible === false ? "No pude consultar el Drive en este momento. Probá de nuevo en un rato." : "La lista está al día con el Drive.");
      }
    } catch { /* es una comprobación de cortesía: si falla, la lista queda como está */ } finally {
      if (manual) setSincronizando(false);
    }
  }
  useEffect(() => { leerEstado(); sincronizar(); }, [expedienteId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (urlVista.current) URL.revokeObjectURL(urlVista.current); }, []);

  // "Automático" (identificar y poner nombre solos después de subir) solo si el servidor lo tiene prendido.
  const automaticoDisponible = !!estadoDrive?.identificar_compu;
  const tipoActual = tipo ?? (automaticoDisponible ? "automatico" : "otro");
  const sinDrive = estadoDrive && !estadoDrive.conectado;
  const caido = estadoDrive && estadoDrive.conectado && !estadoDrive.operativa;
  const puedeSubir = !subiendo && !sinDrive && !caido;

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
    let hubo = false;
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
        hubo = true;
        marcar(item.id, { estado: "error", mensaje: e.message });
      }
    }
    setSubiendo(false);
    if (hubo) leerEstado();
    if (paraIdentificar.length) await identificarTanda(paraIdentificar);
  }

  // Si al tocar un archivo el servidor dice que ya no está (lo borraron en Drive, o lo quitó otra persona), no se muestra un error técnico:
  // se limpia la lista con lo que haya en Drive y se avisa en lenguaje claro.
  const esArchivoPerdido = (m) => /No encontré ese archivo|ya no está en el Drive/i.test(String(m));
  async function archivoPerdido() {
    setErrorGeneral("");
    await sincronizar(true);
    await refrescar();
    setAvisoSync("Ese archivo ya no estaba (se borró en Drive o lo quitó otra persona). Actualicé la lista.");
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

  function cerrarVista() {
    if (urlVista.current) { URL.revokeObjectURL(urlVista.current); urlVista.current = null; }
    setVista(null);
  }

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
    } catch (e) {
      setPorBorrar(null);
      if (esArchivoPerdido(e.message)) await archivoPerdido(); else setErrorGeneral(e.message);
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
      {avisoSync && <Aviso>{avisoSync} <button onClick={() => setAvisoSync("")} style={{ border: "none", background: "transparent", color: C.cerulean, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, marginLeft: 6 }}>Entendido</button></Aviso>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="tipo-archivo" style={{ fontSize: 12, color: C.muted }}>Tipo:</label>
          <select id="tipo-archivo" value={tipoActual} onChange={(e) => setTipo(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "#fff", fontFamily: fuente, fontSize: 12, color: C.dark }}>
            {automaticoDisponible && <option value="automatico">Automático (le pone nombre solo)</option>}
            {TIPOS_ARCHIVO.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <input ref={fileRef} type="file" multiple style={{ display: "none" }}
          onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; subir(files); }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setQrAbierto(true)} disabled={sinDrive || caido} style={boton(false, sinDrive || caido)}>Subir desde el celular</button>
          <button onClick={() => fileRef.current?.click()} disabled={!puedeSubir} style={boton(true, !puedeSubir)}>
            {subiendo ? "Subiendo…" : "Subir archivos"}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        <strong>Máximo {formatearTamano(MAX_BYTES_ARCHIVO)} por archivo.</strong> Se guardan en el Drive de la escribanía y los ve todo el registro.
        Lo que se suba a mano directamente en Drive no aparece acá, y lo que se borre directo en Drive desaparece de acá al abrir el expediente.
        {" "}<button onClick={() => sincronizar(true)} disabled={sincronizando} style={{ border: "none", background: "transparent", color: C.cerulean, fontWeight: 700, fontSize: 11.5, cursor: sincronizando ? "default" : "pointer", padding: 0 }}>{sincronizando ? "Actualizando…" : "↻ Actualizar"}</button>
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
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.nombre}
                    {(() => { const m = marcaIdentificacion(a); return m && m.clave !== "ok" ? <span style={{ marginLeft: 8, padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: m.tono === "aviso" ? "#8a6d1f" : C.cerulean, background: m.tono === "aviso" ? "rgba(201,169,97,.18)" : C.ceruleanLight }}>{m.texto}</span> : null; })()}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.5 }}>
                    {etiquetaTipo(a.tipo)}{a.tamano ? ` · ${formatearTamano(a.tamano)}` : ""} · {fechaHora(a.created_at)}{a.subido_por_nombre ? ` · subido por ${a.subido_por_nombre}` : ""}{a.origen === "celular" ? " · 📱 desde el celular" : ""}{a.identificacion === "ok" ? " · nombre automático" : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => abrir(a)} style={boton(false)}>{esPrevisualizable(a.mime_type) ? "Ver" : "Descargar"}</button>
                {esPrevisualizable(a.mime_type) && <button onClick={() => descargar(a)} style={boton(false)}>Descargar</button>}
                <button onClick={() => abrirEdicion(a)} style={boton(false)}>Editar</button>
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

      {qrAbierto && (
        <SubidaCelular expedienteId={expedienteId} archivos={archivos} alActualizar={refrescar}
          onCerrar={() => { setQrAbierto(false); refrescar(); }} />
      )}

      {porEditar && (
        <Modal onCerrar={() => !guardandoEdicion && setPorEditar(null)}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Editar archivo</div>
          <label htmlFor="edit-nombre" style={{ fontSize: 12, color: C.muted }}>Nombre</label>
          <input id="edit-nombre" value={edicion.nombre} onChange={(e) => setEdicion((x) => ({ ...x, nombre: e.target.value }))} maxLength={150}
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", margin: "4px 0 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 13, color: C.dark }} />
          <label htmlFor="edit-tipo" style={{ fontSize: 12, color: C.muted }}>Tipo de documento</label>
          <select id="edit-tipo" value={edicion.tipo} onChange={(e) => setEdicion((x) => ({ ...x, tipo: e.target.value }))}
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", margin: "4px 0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 13, color: C.dark }}>
            {TIPOS_ARCHIVO.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {porEditar.nombre_original && porEditar.nombre_original !== edicion.nombre && (
            <div style={{ fontSize: 12, color: C.muted, margin: "-6px 0 12px", lineHeight: 1.5 }}>
              Nombre original: <strong style={{ color: C.dark }}>{porEditar.nombre_original}</strong>{" "}
              <button onClick={() => setEdicion((x) => ({ ...x, nombre: porEditar.nombre_original }))} style={{ border: "none", background: "transparent", color: C.cerulean, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}>Volver al original</button>
            </div>
          )}
          {errorEdicion && <Aviso tipo="error">{errorEdicion}</Aviso>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setPorEditar(null)} disabled={guardandoEdicion} style={boton(false, guardandoEdicion)}>Cancelar</button>
            <button onClick={guardarEdicion} disabled={guardandoEdicion || !edicion.nombre.trim()} style={boton(true, guardandoEdicion || !edicion.nombre.trim())}>{guardandoEdicion ? "Guardando…" : "Guardar"}</button>
          </div>
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
