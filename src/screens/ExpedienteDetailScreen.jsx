import { useState, useEffect, useRef } from "react";
import { C } from "../constants";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import ConfirmarEliminarExpediente from "../components/ConfirmarEliminarExpediente";
import ArchivosEscribania from "../components/ArchivosEscribania";
import PersonasExpediente from "../components/personas/PersonasExpediente";
import { listarArchivos } from "../utils/driveApi";
import { listarLibreta, listarPersonasDelExpediente } from "../utils/personasCliente";

const ESTADOS = [
  { key: "abierto",    label: "Abierto",    color: "#3a7ca5" },
  { key: "en_tramite", label: "En trámite", color: "#c9a961" },
  { key: "completado", label: "Completado", color: "#27ae60" },
  { key: "archivado",  label: "Archivado",  color: "rgba(26,35,50,.4)" },
];

function Tag({ children, color = C.cerulean }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      color, background: color + "18", fontFamily: "'Montserrat',sans-serif",
      letterSpacing: ".04em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

export function ExpedienteDetailScreen({ onGo, params }) {
  const { registroActivo, miUsuario } = useAuth();
  const expedienteId = params?.expedienteId;

  const [expediente, setExpediente]   = useState(null);
  const [documentos, setDocumentos]   = useState([]);
  const [archivos, setArchivos]       = useState([]);
  const [docsDisp, setDocsDisp]       = useState([]);  // docs del registro para vincular
  const [cargando, setCargando]       = useState(true);
  const [editNombre, setEditNombre]   = useState(false);
  const [nombre, setNombre]           = useState("");
  const [notas, setNotas]             = useState("");
  const [tab, setTab]                 = useState("personas"); // personas | docs | archivos (se abre en Personas)
  const [personas, setPersonas]       = useState([]);
  const [estadoPersonas, setEstadoPersonas] = useState({ fase: "cargando", mensaje: "" });
  const [libreta, setLibreta]         = useState({ estado: "cargando", lista: [], mensaje: "" });
  const [modalVincular, setModalVincular] = useState(false);
  const [queryVincular, setQueryVincular] = useState("");
  const [filtroTipo, setFiltroTipo]       = useState("");
  const [filtroFecha, setFiltroFecha]     = useState("all");
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const vincularDocRef = useRef(params?.vincularDocId || null);

  // Carga los vínculos expediente_documentos + detalles de documentos sin FK join
  // (el join embebido documentos(*) requiere FK constraint en DB y falla con 400)
  async function cargarLinks(expId) {
    const { data: links } = await supabase
      .from("expediente_documentos")
      .select("id, expediente_id, documento_id, created_at")
      .eq("expediente_id", expId);
    if (!links?.length) return [];
    const { data: docDets } = await supabase
      .from("documentos")
      .select("id, titulo, template_key, created_at")
      .in("id", links.map(l => l.documento_id));
    return links.map(l => ({
      ...l,
      documentos: docDets?.find(d => d.id === l.documento_id) || null,
    }));
  }

  // Personas del expediente y libreta del registro: se cargan aparte para que un error acá no tape el resto de la pantalla.
  async function cargarPersonas(expId = expedienteId) {
    try {
      setPersonas(await listarPersonasDelExpediente(expId));
      setEstadoPersonas({ fase: "ok", mensaje: "" });
    } catch (e) { setEstadoPersonas({ fase: "error", mensaje: e.message }); }
  }
  async function cargarLibreta(registro) {
    try { setLibreta({ estado: "ok", lista: await listarLibreta(registro), mensaje: "" }); }
    catch (e) { setLibreta((l) => ({ ...l, estado: "error", mensaje: e.message })); }
  }
  async function recargarPersonasYArchivos() {
    const [arch] = await Promise.all([listarArchivos(expedienteId).catch(() => null), cargarPersonas(), cargarLibreta(expediente?.registro_id)]);
    if (arch) setArchivos(arch);
  }

  async function cargar() {
    // (`cargando` ya arranca en true: no se vuelve a marcar acá para no pisar la pantalla en cada recarga)
    const [{ data: exp }, links, arch] = await Promise.all([
      supabase.from("expedientes").select("*").eq("id", expedienteId).single(),
      cargarLinks(expedienteId),
      listarArchivos(expedienteId).catch(() => []),
    ]);
    setExpediente(exp);
    setNombre(exp?.nombre || "");
    setNotas(exp?.notas || "");
    setDocumentos(links);
    setArchivos(arch);
    setCargando(false);
    cargarPersonas(expedienteId);
    cargarLibreta(exp?.registro_id);

    // Auto-vincular si viene de "Crear y vincular" o "Vincular a existente" en el editor
    if (vincularDocRef.current) {
      const docId = vincularDocRef.current;
      vincularDocRef.current = null;
      await autoVincular(docId, links);
    }
  }

  async function autoVincular(docId, docsYaCargados) {
    const yaVinculado = docsYaCargados.some(d => d.documento_id === docId);
    if (!yaVinculado) {
      const { error } = await supabase.from("expediente_documentos")
        .insert({ expediente_id: expedienteId, documento_id: docId });
      if (error) {
        alert(`Error al vincular (${error.code}): ${error.message}`);
        return;
      }
    }
    const links = await cargarLinks(expedienteId);
    setDocumentos(links);
  }

  // Carga inicial: `cargar` actualiza estado recién al terminar de pedir los datos (patrón de siempre de esta pantalla).
  useEffect(() => { if (expedienteId) cargar(); }, [expedienteId]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  async function cambiarEstado(nuevoEstado) {
    await supabase.from("expedientes").update({ estado: nuevoEstado }).eq("id", expedienteId);
    setExpediente(prev => ({ ...prev, estado: nuevoEstado }));
  }

  async function guardarNombre() {
    await supabase.from("expedientes").update({ nombre, notas }).eq("id", expedienteId);
    setExpediente(prev => ({ ...prev, nombre, notas }));
    setEditNombre(false);
  }

  async function desvincularDoc(edId) {
    await supabase.from("expediente_documentos").delete().eq("id", edId);
    setDocumentos(prev => prev.filter(d => d.id !== edId));
  }

  async function abrirModalVincular() {
    const regId = registroActivo || miUsuario?.registro;
    let q = supabase.from("documentos")
      .select("id, titulo, template_key, created_at, partes")
      .order("created_at", { ascending: false }).limit(300);
    if (regId) q = q.eq("registro_id", regId);
    const { data } = await q;
    const yaVinculados = new Set(documentos.map(d => d.documento_id));
    setDocsDisp((data || []).filter(d => !yaVinculados.has(d.id)));
    setQueryVincular("");
    setFiltroTipo("");
    setFiltroFecha("all");
    setModalVincular(true);
  }

  async function vincularDoc(docId) {
    await supabase.from("expediente_documentos").insert({ expediente_id: expedienteId, documento_id: docId });
    setModalVincular(false);
    cargar();
  }

  async function eliminarExpediente() {
    await supabase.from("expediente_documentos").delete().eq("expediente_id", expedienteId);
    await supabase.from("expedientes").delete().eq("id", expedienteId);
    onGo?.("expedientes");
  }

  if (cargando) return <div style={{ padding: 40, color: C.muted }}>Cargando...</div>;
  if (!expediente) return <div style={{ padding: 40 }}>Expediente no encontrado.</div>;

  const stateInfo = ESTADOS.find(e => e.key === expediente.estado) || ESTADOS[0];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ed" }}>

      {/* Header */}
      <div style={{ background: C.dark, padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <button onClick={() => onGo?.("expedientes")} style={{ background: "transparent", border: "none", color: "rgba(253,252,250,.6)", cursor: "pointer", fontSize: 13 }}>
          ← Expedientes
        </button>
        <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {expediente.nombre}
        </span>
        {/* Selector de estado */}
        <select value={expediente.estado} onChange={e => cambiarEstado(e.target.value)}
          style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: stateInfo.color + "22", color: stateInfo.color, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
          {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Sidebar info */}
        <div style={{ width: 260, background: "#FDFCFA", borderRight: "1px solid rgba(26,35,50,.08)", padding: 18, display: "flex", flexDirection: "column", gap: 16, flexShrink: 0, overflowY: "auto" }}>

          {editNombre ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid " + C.cerulean, fontSize: 13, fontFamily: "'Inter',sans-serif" }}
                value={nombre} onChange={e => setNombre(e.target.value)} autoFocus/>
              <textarea rows={3} style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid rgba(26,35,50,.14)", fontSize: 12, fontFamily: "'Inter',sans-serif", resize: "vertical" }}
                value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas..."/>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={guardarNombre} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", background: C.cerulean, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>Guardar</button>
                <button onClick={() => setEditNombre(false)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(26,35,50,.14)", background: "transparent", fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>✕</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, lineHeight: 1.4 }}>{expediente.nombre}</div>
                <button onClick={() => setEditNombre(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, padding: "2px 4px" }}>✏</button>
              </div>
              {expediente.notas && <div style={{ fontSize: 12, color: C.dark, marginTop: 8, lineHeight: 1.5, background: "rgba(26,35,50,.04)", borderRadius: 6, padding: "8px 10px" }}>{expediente.notas}</div>}
            </div>
          )}

          <div style={{ fontSize: 11, color: C.muted }}>
            Creado {new Date(expediente.created_at).toLocaleDateString("es-AR")}
          </div>

          <button onClick={() => onGo?.("selector", { expedienteId })}
            style={{ padding: "9px 0", borderRadius: 8, border: "1px dashed " + C.cerulean, background: "transparent", color: C.cerulean, fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            + Nuevo documento
          </button>

          <div style={{ flex: 1 }} />

          <button onClick={() => setConfirmEliminar(true)}
            style={{ padding: "7px 0", borderRadius: 7, border: "1px solid rgba(231,76,60,.25)", background: "rgba(231,76,60,.06)", color: "#e74c3c", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
            Eliminar expediente
          </button>
        </div>

        {/* Contenido principal */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(26,35,50,.08)", background: "#FDFCFA", flexShrink: 0 }}>
            {[["personas", estadoPersonas.fase === "ok" ? `Personas (${personas.length})` : "Personas"], ["docs", `Documentos (${documentos.length})`], ["archivos", `Archivos (${archivos.length})`]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: "12px 20px", border: "none", background: "transparent",
                borderBottom: tab === k ? `2px solid ${C.cerulean}` : "2px solid transparent",
                color: tab === k ? C.cerulean : C.muted, fontFamily: "'Montserrat',sans-serif",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}>{l}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {/* Tab personas: quiénes intervienen, con su estado civil y sus archivos */}
            {tab === "personas" && (
              <PersonasExpediente expediente={expediente} personas={personas} estado={estadoPersonas} libreta={libreta} archivos={archivos}
                onRecargar={recargarPersonasYArchivos} onReintentar={() => { setEstadoPersonas({ fase: "cargando", mensaje: "" }); cargarPersonas(); }}
                onReintentarLibreta={() => { setLibreta((l) => ({ ...l, estado: "cargando" })); cargarLibreta(expediente?.registro_id); }}
                onIrAArchivos={() => setTab("archivos")} />
            )}

            {/* Tab documentos */}
            {tab === "docs" && (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                  <button onClick={abrirModalVincular} style={{
                    padding: "7px 16px", borderRadius: 7, border: "1px solid rgba(26,35,50,.14)",
                    background: "#FDFCFA", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Montserrat',sans-serif", color: C.dark,
                  }}>Vincular documento existente</button>
                </div>
                {documentos.length === 0 ? (
                  <div style={{ textAlign: "center", marginTop: 60, color: C.muted }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
                    <div style={{ fontSize: 13 }}>Sin documentos vinculados</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {documentos.map(ed => {
                      const doc = ed.documentos;
                      return (
                        <div key={ed.id} style={{
                          background: "#FDFCFA", borderRadius: 9, padding: "12px 16px",
                          border: "1px solid rgba(26,35,50,.08)", display: "flex",
                          alignItems: "center", justifyContent: "space-between",
                        }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{doc?.titulo || "Documento"}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                              {doc?.template_key} · {doc?.created_at ? new Date(doc.created_at).toLocaleDateString("es-AR") : ""}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => onGo?.("editor", { docId: ed.documento_id })}
                              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid " + C.cerulean, background: "transparent", color: C.cerulean, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
                              Abrir
                            </button>
                            <button onClick={() => desvincularDoc(ed.id)}
                              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(26,35,50,.14)", background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Tab archivos: almacenamiento propio de Notarial */}
            {tab === "archivos" && (
              <ArchivosEscribania expedienteId={expedienteId} archivos={archivos} setArchivos={setArchivos} nombreExpediente={expediente.nombre} personas={personas} />
            )}
          </div>
        </div>
      </div>

      {confirmEliminar && (
        <ConfirmarEliminarExpediente
          nombre={expediente.nombre}
          cantidadArchivos={archivos.length}
          onConfirm={eliminarExpediente}
          onCancel={() => setConfirmEliminar(false)}
        />
      )}

      {/* Modal vincular documentos */}
      {modalVincular && <ModalVincularDoc
        docsDisp={docsDisp}
        queryVincular={queryVincular} setQueryVincular={setQueryVincular}
        filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo}
        filtroFecha={filtroFecha} setFiltroFecha={setFiltroFecha}
        onVincular={vincularDoc}
        onClose={() => setModalVincular(false)}
      />}
    </div>
  );
}

const FECHA_OPTS = [
  { key: "all",       label: "Cualquier fecha" },
  { key: "semana",    label: "Última semana" },
  { key: "mes",       label: "Último mes" },
  { key: "trimestre", label: "Últimos 3 meses" },
];

function prettyKey(key) {
  return key?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || key;
}

function ModalVincularDoc({ docsDisp, queryVincular, setQueryVincular, filtroTipo, setFiltroTipo, filtroFecha, setFiltroFecha, onVincular, onClose }) {
  const tiposDisp = [...new Set(docsDisp.map(d => d.template_key).filter(Boolean))].sort();

  function aplicarFiltros(docs) {
    let r = docs;

    if (queryVincular.trim()) {
      const q = queryVincular.trim().toLowerCase();
      r = r.filter(d => {
        if (d.titulo?.toLowerCase().includes(q)) return true;
        if (Array.isArray(d.partes)) {
          return d.partes.some(p =>
            `${p.nombre || ""} ${p.apellido || ""}`.toLowerCase().includes(q) ||
            p.nroDoc?.includes(q)
          );
        }
        return false;
      });
    }

    if (filtroTipo) r = r.filter(d => d.template_key === filtroTipo);

    if (filtroFecha !== "all") {
      const dias = filtroFecha === "semana" ? 7 : filtroFecha === "mes" ? 30 : 90;
      const limite = Date.now() - dias * 864e5;
      r = r.filter(d => new Date(d.created_at).getTime() >= limite);
    }

    return r;
  }

  const filtrados = aplicarFiltros(docsDisp);
  const hayFiltros = queryVincular || filtroTipo || filtroFecha !== "all";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#FDFCFA", borderRadius: 12, width: 580, maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(26,35,50,.22)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 14 }}>Vincular documento al expediente</div>

          {/* Búsqueda texto */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              value={queryVincular}
              onChange={e => setQueryVincular(e.target.value)}
              placeholder="Buscar por título o por nombre de parte..."
              style={{
                width: "100%", boxSizing: "border-box", padding: "9px 34px 9px 32px",
                borderRadius: 7, border: "1px solid rgba(26,35,50,.16)",
                fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.dark, outline: "none",
                background: "#fff",
              }}
            />
            {queryVincular && (
              <button onClick={() => setQueryVincular("")}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 14, lineHeight: 1 }}>
                ✕
              </button>
            )}
          </div>

          {/* Fecha + chips de tipo */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" }}>
            <select
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
              style={{
                padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(26,35,50,.16)",
                fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.dark,
                background: filtroFecha !== "all" ? C.ceruleanLight : "#fff",
                cursor: "pointer", flexShrink: 0,
              }}>
              {FECHA_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setFiltroTipo("")}
                style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${filtroTipo === "" ? C.cerulean : "rgba(26,35,50,.16)"}`,
                  background: filtroTipo === "" ? C.cerulean : "#fff",
                  color: filtroTipo === "" ? "#fff" : C.dark,
                  fontFamily: "'Montserrat',sans-serif",
                }}>Todos</button>
              {tiposDisp.map(t => (
                <button key={t} onClick={() => setFiltroTipo(filtroTipo === t ? "" : t)}
                  style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${filtroTipo === t ? C.cerulean : "rgba(26,35,50,.16)"}`,
                    background: filtroTipo === t ? C.cerulean : "#fff",
                    color: filtroTipo === t ? "#fff" : C.dark,
                    fontFamily: "'Montserrat',sans-serif",
                  }}>{prettyKey(t)}</button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "rgba(26,35,50,.08)", marginLeft: -24, marginRight: -24 }} />
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
          {filtrados.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: 32 }}>
              {hayFiltros ? "Sin resultados con los filtros actuales." : "No hay documentos disponibles para vincular."}
            </div>
          ) : filtrados.map(doc => {
            const parteNombres = Array.isArray(doc.partes) && doc.partes.length > 0
              ? doc.partes.map(p => [p.nombre, p.apellido].filter(Boolean).join(" ")).filter(Boolean).join(" · ")
              : null;
            return (
              <div key={doc.id} onClick={() => onVincular(doc.id)}
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(26,35,50,.1)", cursor: "pointer", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                onMouseEnter={e => e.currentTarget.style.background = C.ceruleanLight}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.titulo || "Sin título"}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {prettyKey(doc.template_key)} · {new Date(doc.created_at).toLocaleDateString("es-AR")}
                  </div>
                  {parteNombres && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {parteNombres}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: C.cerulean, fontWeight: 700, flexShrink: 0 }}>Vincular →</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px 18px", borderTop: "1px solid rgba(26,35,50,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: C.muted }}>
            {filtrados.length} de {docsDisp.length} documento{docsDisp.length !== 1 ? "s" : ""}
            {hayFiltros && (
              <button onClick={() => { setQueryVincular(""); setFiltroTipo(""); setFiltroFecha("all"); }}
                style={{ marginLeft: 10, fontSize: 11, color: C.cerulean, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                Limpiar filtros
              </button>
            )}
          </span>
          <button onClick={onClose}
            style={{ padding: "7px 18px", borderRadius: 7, border: "1px solid rgba(26,35,50,.14)", background: "transparent", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 12 }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
