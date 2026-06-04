import { useState, useEffect, useRef } from "react";
import { C } from "../constants";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { subirArchivoDrive, urlDescargaDrive } from "../utils/driveHelper";

const ESTADOS = [
  { key: "abierto",    label: "Abierto",    color: "#3a7ca5" },
  { key: "en_tramite", label: "En trámite", color: "#c9a961" },
  { key: "completado", label: "Completado", color: "#27ae60" },
  { key: "archivado",  label: "Archivado",  color: "rgba(26,35,50,.4)" },
];

const TIPOS_ARCHIVO = [
  { key: "dni",           label: "DNI" },
  { key: "tarjeta_verde", label: "Tarjeta verde" },
  { key: "poder",         label: "Poder" },
  { key: "formulario",    label: "Formulario 08" },
  { key: "otro",          label: "Otro" },
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
  const { session, registroActivo, miUsuario } = useAuth();
  const expedienteId = params?.expedienteId;

  const [expediente, setExpediente]   = useState(null);
  const [documentos, setDocumentos]   = useState([]);
  const [archivos, setArchivos]       = useState([]);
  const [docsDisp, setDocsDisp]       = useState([]);  // docs del registro para vincular
  const [cargando, setCargando]       = useState(true);
  const [subiendo, setSubiendo]       = useState(false);
  const [editNombre, setEditNombre]   = useState(false);
  const [nombre, setNombre]           = useState("");
  const [notas, setNotas]             = useState("");
  const [tab, setTab]                 = useState("docs"); // docs | archivos
  const [modalVincular, setModalVincular] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { if (expedienteId) cargar(); }, [expedienteId]);

  async function cargar() {
    setCargando(true);
    const [{ data: exp }, { data: docs }, { data: arch }] = await Promise.all([
      supabase.from("expedientes").select("*").eq("id", expedienteId).single(),
      supabase.from("expediente_documentos").select("*, documentos(*)").eq("expediente_id", expedienteId),
      supabase.from("expediente_archivos").select("*").eq("expediente_id", expedienteId).order("created_at", { ascending: false }),
    ]);
    setExpediente(exp);
    setNombre(exp?.nombre || "");
    setNotas(exp?.notas || "");
    setDocumentos(docs || []);
    setArchivos(arch || []);
    setCargando(false);
  }

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

  async function eliminarArchivo(arch) {
    await supabase.from("expediente_archivos").delete().eq("id", arch.id);
    setArchivos(prev => prev.filter(a => a.id !== arch.id));
  }

  async function subirArchivo(file, tipo = "otro") {
    if (!session?.provider_token) {
      alert("Necesitás iniciar sesión con Google para subir archivos a Drive.");
      return;
    }
    setSubiendo(true);
    try {
      const resultado = await subirArchivoDrive(
        session, file, file.name, file.type, null
      );
      await supabase.from("expediente_archivos").insert({
        expediente_id: expedienteId,
        drive_file_id: resultado.id,
        nombre: file.name,
        tipo,
        mime_type: file.type,
      });
      await cargar();
    } catch (e) {
      alert("Error subiendo archivo: " + e.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function abrirModalVincular() {
    const regId = registroActivo || miUsuario?.registro;
    let q = supabase.from("documentos").select("id, titulo, template_key, created_at").order("created_at", { ascending: false }).limit(50);
    if (regId) q = q.eq("registro_id", regId);
    const { data } = await q;
    const yaVinculados = new Set(documentos.map(d => d.documento_id));
    setDocsDisp((data || []).filter(d => !yaVinculados.has(d.id)));
    setModalVincular(true);
  }

  async function vincularDoc(docId) {
    await supabase.from("expediente_documentos").insert({ expediente_id: expedienteId, documento_id: docId });
    setModalVincular(false);
    cargar();
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
              {expediente.tipo_acto && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{expediente.tipo_acto}</div>}
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
        </div>

        {/* Contenido principal */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(26,35,50,.08)", background: "#FDFCFA", flexShrink: 0 }}>
            {[["docs", `Documentos (${documentos.length})`], ["archivos", `Archivos Drive (${archivos.length})`]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: "12px 20px", border: "none", background: "transparent",
                borderBottom: tab === k ? `2px solid ${C.cerulean}` : "2px solid transparent",
                color: tab === k ? C.cerulean : C.muted, fontFamily: "'Montserrat',sans-serif",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}>{l}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

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

            {/* Tab archivos Drive */}
            {tab === "archivos" && (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                  <input ref={fileRef} type="file" multiple style={{ display: "none" }}
                    onChange={async e => {
                      const files = Array.from(e.target.files || []);
                      for (const f of files) await subirArchivo(f);
                      e.target.value = "";
                    }}
                  />
                  <button onClick={() => fileRef.current?.click()} disabled={subiendo}
                    style={{
                      padding: "7px 16px", borderRadius: 7, border: "none",
                      background: subiendo ? C.cerulean + "88" : C.cerulean,
                      color: "#fff", fontSize: 12, fontWeight: 700, cursor: subiendo ? "default" : "pointer",
                      fontFamily: "'Montserrat',sans-serif",
                    }}>
                    {subiendo ? "Subiendo..." : "↑ Subir a Drive"}
                  </button>
                </div>
                {!session?.provider_token && (
                  <div style={{ background: "rgba(201,169,97,.12)", border: "1px solid rgba(201,169,97,.3)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.dark, marginBottom: 14 }}>
                    Para subir archivos a Drive, iniciá sesión con Google.
                  </div>
                )}
                {archivos.length === 0 ? (
                  <div style={{ textAlign: "center", marginTop: 60, color: C.muted }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>☁️</div>
                    <div style={{ fontSize: 13 }}>Sin archivos en Drive</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Subí fotos de DNI, tarjeta verde, poderes...</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {archivos.map(a => (
                      <div key={a.id} style={{
                        background: "#FDFCFA", borderRadius: 9, padding: "10px 14px",
                        border: "1px solid rgba(26,35,50,.08)", display: "flex",
                        alignItems: "center", justifyContent: "space-between",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{a.mime_type?.startsWith("image/") ? "🖼️" : "📄"}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{a.nombre}</div>
                            <div style={{ fontSize: 10, color: C.muted }}>
                              {TIPOS_ARCHIVO.find(t => t.key === a.tipo)?.label || a.tipo} · {new Date(a.created_at).toLocaleDateString("es-AR")}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <a href={urlDescargaDrive(a.drive_file_id)} target="_blank" rel="noreferrer"
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid " + C.cerulean, color: C.cerulean, fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "'Montserrat',sans-serif" }}>
                            Ver
                          </a>
                          <button onClick={() => eliminarArchivo(a)}
                            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(26,35,50,.14)", background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer" }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal vincular documentos */}
      {modalVincular && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#FDFCFA", borderRadius: 12, padding: "24px", width: 500, maxHeight: "70vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(26,35,50,.18)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Vincular documento al expediente</div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {docsDisp.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: 20 }}>No hay documentos disponibles para vincular.</div>
              ) : docsDisp.map(doc => (
                <div key={doc.id} onClick={() => vincularDoc(doc.id)}
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(26,35,50,.1)", cursor: "pointer", background: "#fff" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.ceruleanLight}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{doc.titulo || "Sin título"}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{doc.template_key} · {new Date(doc.created_at).toLocaleDateString("es-AR")}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setModalVincular(false)}
              style={{ marginTop: 16, padding: "8px 0", borderRadius: 7, border: "1px solid rgba(26,35,50,.14)", background: "transparent", cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 12 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
