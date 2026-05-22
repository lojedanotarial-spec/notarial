import { useAutoguardado } from "../hooks/useAutoguardado";
import { useAuth } from "../context/AuthContext";
import {
  C, FUENTES, INTERLINEADOS, MESES_LABEL,
  PARTE_VACIA, ESCRIBANO_INI, FECHA_HOY, PROTOCOLO_INI, INSTRUMENTO_INI,
  ELABELS, inp,
} from "../constants";
import { diaLetras, anioLetras, gen } from "../utils";
import { NavBar }  from "../components/NavBar";
import { Modal }   from "../components/Modal";
import { Btn }     from "../components/ui/Btn";
import { Warn }    from "../components/ui/FormElements";
import { ModalPartes }    from "../components/modals/ModalPartes";
import { ModalEscribano, ModalInstrumento, ModalProtocolo, ModalFecha } from "../components/modals/ModalOtros";
import { ModalFormato }  from "../components/modals/ModalFormato";
import { buildDocxCertFirmaF08 } from "../utils/buildDocx";
import { OnlyOfficeEditor }     from "../components/OnlyOfficeEditor";
import { supabase } from "../supabase";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const ONLYOFFICE_URL = "https://onlyoffice.notarial.lat";


function PanelSection({ label, onClick, children, alerta }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.cerulean}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(26,35,50,.15)"}
      style={{
        padding: "10px 12px", borderRadius: 8,
        border: "1px solid rgba(26,35,50,.15)",
        cursor: "pointer", transition: "border-color .12s",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 6,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "rgba(26,35,50,1)",
          textTransform: "uppercase", letterSpacing: ".07em",
        }}>
          {label}
        </div>
        {alerta && (
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#e07070", flexShrink: 0,
          }}/>
        )}
      </div>
      {children}
    </div>
  );
}


export function EditorScreen({ onGo, params = {} }) {
  const { miUsuario, miembros, registroActivo } = useAuth();
  const [modal,        setModal]        = useState(null);
  const [estado,       setEstado]       = useState("borrador");
  const [fuente,       setFuente]       = useState(FUENTES[0]);
  const [margenKey,    setMargenKey]    = useState("protocolar");
  const [fontSize,     setFontSize]     = useState(11);
  const [interlineado, setInterlineado] = useState(INTERLINEADOS[0]);
  const [documentUrl,  setDocumentUrl]  = useState(null);
  const [documentKey,  setDocumentKey]  = useState(null);
  const [generating,   setGenerating]   = useState(false);
  const [pluginTick,   setPluginTick]   = useState(0);
  const pluginWindowRef   = useRef(null);
  const [isDirty,          setIsDirty]          = useState(false);
  const [showProps,        setShowProps]        = useState(true);
  const [showVarHighlight, setShowVarHighlight] = useState(true);
  const generatedOnceRef  = useRef(false);
  const handleGenerarRef  = useRef(null);
  const generateAfterRef  = useRef(false);

  const [partes,      setPartes]      = useState([PARTE_VACIA()]);
  const [escribano,   setEscribano]   = useState(() => miUsuario ? {
    nombre:          miUsuario.nombre_preferido || `${miUsuario.nombre} ${miUsuario.apellido}`,
    caracter:        miUsuario.rol === "titular" ? "Notario/a Titular" : "Notario/a Adscripto/a",
    registro:        miUsuario.registro,
    circunscripcion: miUsuario.circunscripcion,
  } : ESCRIBANO_INI);
  const [templateKey, setTemplateKey] = useState(params?.templateKey || "certFirmaF08");
  const [fecha,       setFecha]       = useState(FECHA_HOY());
  const [protocolo,   setProtocolo]   = useState(PROTOCOLO_INI);
  const [instrumento, setInstrumento] = useState(INSTRUMENTO_INI);

  const { usuario } = useAuth();

  // Para admin: cargar datos del titular del registro activo
  useEffect(() => {
    if (!miUsuario?.is_admin || !registroActivo || params?.docId) return;
    supabase
      .from("registros")
      .select("*")
      .eq("registro", registroActivo)
      .then(({ data }) => {
        const titular = (data || []).find(m => m.rol === "titular") || data?.[0];
        if (titular) setEscribano({
          nombre:          titular.nombre_preferido || `${titular.nombre} ${titular.apellido}`,
          caracter:        titular.rol === "titular" ? "Notario/a Titular" : "Notario/a Adscripto/a",
          registro:        titular.registro,
          circunscripcion: titular.circunscripcion,
        });
      });
  }, [miUsuario?.is_admin, registroActivo]);

  const handleGenerar = useCallback(async () => {
    const instrTexto  = instrumento.descripcion || "el instrumento adjunto a la presente Actuación Notarial";
    const fechaLetras = diaLetras(fecha.dia) + " días del mes de " + MESES_LABEL[fecha.mes] + " de " + anioLetras(fecha.anio);
    setGenerating(true);
    try {
      const blob = await buildDocxCertFirmaF08({
        partes, escribano, fecha, protocolo, instrumento,
        instrTexto, fechaLetras, gen,
        margenKey, fontSize, fuente, interlineado,
        showVarHighlight,
      });

      const key      = `doc-${Date.now()}`;
      const filePath = `${key}.docx`;

      const { error: uploadError } = await supabase.storage
        .from("oo-docs")
        .upload(filePath, blob, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: true,
        });
      if (uploadError) throw new Error(`Error al subir archivo: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from("oo-docs")
        .getPublicUrl(filePath);

      setDocumentUrl(publicUrl);
      setDocumentKey(key);
      generatedOnceRef.current = true;
      setIsDirty(false);
    } catch (e) {
      alert("Error al generar el documento: " + e.message);
    } finally {
      setGenerating(false);
    }
  }, [partes, escribano, fecha, protocolo, instrumento, margenKey, fontSize, fuente, interlineado, showVarHighlight]);

  // Keep ref updated so the mount effect can call the latest version
  useEffect(() => { handleGenerarRef.current = handleGenerar; }, [handleGenerar]);

  // Auto-generate once on mount (delay lets the admin escribano effect settle first)
  useEffect(() => {
    const t = setTimeout(() => handleGenerarRef.current?.(), 800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark dirty whenever data changes after first generation; auto-generate si viene de un modal
  useEffect(() => {
    if (!generatedOnceRef.current) return;
    setIsDirty(true);
    if (generateAfterRef.current) {
      generateAfterRef.current = false;
      handleGenerarRef.current?.();
    }
  }, [partes, escribano, fecha, protocolo, instrumento, margenKey, fontSize, fuente, interlineado, showVarHighlight]);

  // ── CARGA DE DOCUMENTO EXISTENTE ──────────────────────────────────────────
  useEffect(() => {
    if (!params.docId) return;
    async function cargar() {
      const { data } = await supabase.from("documentos")
        .select("*").eq("id", params.docId).single();
      if (!data) return;
      const c = data.contenido || {};
      if (c.partes)      setPartes(c.partes);
      if (c.escribano)   setEscribano(c.escribano);
      if (c.fecha)       setFecha(c.fecha);
      if (c.protocolo)   setProtocolo(c.protocolo);
      if (c.instrumento) setInstrumento(c.instrumento);
      if (data.estado)   setEstado(data.estado);
      if (data.template_key) setTemplateKey(data.template_key);
    }
    cargar();
  }, [params.docId]);

  const contenidoParaGuardar = useMemo(
    () => ({ partes, escribano, fecha, protocolo, instrumento }),
    [partes, escribano, fecha, protocolo, instrumento]
  );

  useEffect(() => {
    const handler = (e) => setModal(e.detail.modal);
    window.addEventListener("notarial:openmodal", handler);
    return () => window.removeEventListener("notarial:openmodal", handler);
  }, []);

  // Plugin: receive "ready" and "open-modal" messages
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== "oo-plugin") return;
      if (e.data.action === "ready") {
        pluginWindowRef.current = e.source;
        setPluginTick(t => t + 1);
      } else if (e.data.action === "open-modal") {
        setModal(e.data.modal);
      } else if (e.data.action === "regenerar") {
        handleGenerarRef.current?.();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Plugin: push updated data whenever document state changes or plugin reopens
  useEffect(() => {
    if (!pluginTick || !pluginWindowRef.current) return;
    pluginWindowRef.current.postMessage({
      type: "oo-plugin-data",
      partes, escribano, fecha, protocolo, instrumento,
      fuente, fontSize, margenKey, interlineado, isDirty, generating,
    }, "*");
  }, [partes, escribano, fecha, protocolo, instrumento, fuente, fontSize, margenKey, interlineado, isDirty, generating, pluginTick]);

  const diaStr   = String(fecha.dia).padStart(2, "0");
  const mesStr   = String(fecha.mes + 1).padStart(2, "0");
  const fechaStr = diaStr + "/" + mesStr + "/" + fecha.anio;

  const partesLabel = partes
    .filter(p => p.apellido || p.nombre)
    .map(p => {
      const nombre = [p.apellido, p.nombre].filter(Boolean).join(" ");
      const reprs  = (p.representaciones || [])
        .filter(r => r.razon_social).map(r => r.razon_social).join(", ");
      return reprs ? nombre + " (" + reprs + ")" : nombre;
    })
    .join(", ");

  const docTitle = partesLabel
    ? "Certificación de firma - " + partesLabel + " - " + fechaStr
    : "Certificación de firma - nuevo documento";

  const { indicador, guardarAhora, hayPendiente } = useAutoguardado({
    titulo: docTitle,
    estado,
    contenido: contenidoParaGuardar,
    templateKey,
    registroNumero: miUsuario?.registro || registroActivo,
    usuarioId: usuario?.id,
    initialDocId: params?.docId,
  });

  const applyAndGen = (setter) => (val) => { generateAfterRef.current = true; setter(val); };

  function handleGo(screen, p) {
    if (hayPendiente) {
      if (!window.confirm("Hay cambios sin guardar. ¿Querés salir igual?")) return;
    }
    onGo(screen, p);
  }

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'Montserrat',sans-serif", overflow: "hidden",
    }}>

      <NavBar
        docTitle={docTitle}
        estado={estado}
        onStatus={() => setModal("estado")}

        indicadorGuardado={indicador}
        onGuardar={guardarAhora}
        onGo={handleGo}
      />

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Editor */}
        <div style={{ flex: 1, position: "relative", display: "flex", overflow: "hidden" }}>
          <OnlyOfficeEditor
            documentUrl={documentUrl}
            documentKey={documentKey}
            documentTitle={docTitle}
            serverUrl={ONLYOFFICE_URL}
          />
        </div>

        {/* Panel de propiedades React */}
        {showProps && (
          <div style={{
            width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
            borderLeft: "1px solid rgba(26,35,50,.1)", background: "#fff", overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 14px 8px", borderBottom: "1px solid rgba(26,35,50,.08)",
              fontSize: 11, fontWeight: 700, color: "rgba(26,35,50,.5)",
              textTransform: "uppercase", letterSpacing: ".07em", flexShrink: 0,
            }}>
              Propiedades del acto
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>

              <PanelSection label="Escribano" onClick={() => setModal("escribano")}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{escribano.nombre || "Sin nombre"}</div>
                <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginTop: 2 }}>
                  {escribano.caracter || ""} &middot; Reg. {escribano.registro || ""}
                </div>
              </PanelSection>

              <PanelSection label="Fecha y lugar" onClick={() => setModal("fecha")}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{fechaStr}</div>
                <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginTop: 2 }}>
                  {fecha.ciudad || "Ciudad"}, Mendoza
                </div>
              </PanelSection>

              <PanelSection
                label="Partes"
                onClick={() => setModal("partes")}
                alerta={partes.some(p => !p.apellido || !p.nombre)}
              >
                {partes.map((p, i) => {
                  const a0 = p.apellido ? p.apellido[0].toUpperCase() : "?";
                  const n0 = p.nombre   ? p.nombre[0].toUpperCase()   : "";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, minWidth: 0 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", background: "#ddeef7",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, color: "#1f4862", flexShrink: 0,
                      }}>{a0 + n0}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.apellido || "Sin nombre"}{p.nombre ? ", " + p.nombre : ""}
                      </span>
                    </div>
                  );
                })}
                <div style={{ fontSize: 12, color: C.cerulean, fontWeight: 500, marginTop: 3 }}>+ Editar partes</div>
              </PanelSection>

              <PanelSection label="Protocolo" onClick={() => setModal("protocolo")} alerta={!protocolo.nroActa}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Libro {protocolo.nroLibro || "—"}</div>
                <div style={{ fontSize: 12, color: protocolo.nroActa ? "rgba(26,35,50,.5)" : "#c0392b", fontWeight: protocolo.nroActa ? 400 : 600, marginTop: 2 }}>
                  Acta n&ordm; {protocolo.nroActa || "pendiente"}
                </div>
              </PanelSection>

              <PanelSection label="Instrumento" onClick={() => setModal("instrumento")}>
                <div style={{ fontSize: 14, fontWeight: instrumento.descripcion ? 600 : 400, fontStyle: instrumento.descripcion ? "normal" : "italic", color: instrumento.descripcion ? C.dark : "rgba(26,35,50,.4)" }}>
                  {instrumento.descripcion || "Sin especificar"}
                </div>
              </PanelSection>

              <PanelSection label="Formato" onClick={() => setModal("formato")}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                  {fuente.label || "Merriweather"} {fontSize}pt
                </div>
                <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginTop: 2 }}>
                  {margenKey === "protocolar" ? "Protocolar" : "No protocolar"} &middot; {interlineado.label || "Protocolar"}
                </div>
              </PanelSection>

            </div>
            {isDirty && (
              <div style={{ flexShrink: 0, padding: "10px 12px", borderTop: "1px solid rgba(26,35,50,.08)" }}>
                <button
                  onClick={handleGenerar}
                  disabled={generating}
                  style={{
                    width: "100%", padding: "8px", borderRadius: 7, border: "none",
                    background: "#1a5276", color: "#fff", cursor: generating ? "default" : "pointer",
                    fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700,
                    opacity: generating ? 0.6 : 1,
                  }}
                >
                  {generating ? "Actualizando..." : "↻ Actualizar documento"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Strip vertical */}
        <div style={{
          width: 40, flexShrink: 0, background: "#f5f3ef",
          borderLeft: "1px solid rgba(26,35,50,.1)",
          display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 4,
        }}>
          <button
            onClick={() => setShowProps(v => !v)}
            title="Propiedades del acto"
            style={{
              width: 32, height: 32, borderRadius: 6, border: "none",
              background: showProps ? "#ddeef7" : "transparent",
              color: showProps ? "#1a5276" : "rgba(26,35,50,.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .12s, color .12s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <circle cx="3" cy="6" r="1" fill="currentColor" stroke="none"/>
              <circle cx="3" cy="12" r="1" fill="currentColor" stroke="none"/>
              <circle cx="3" cy="18" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </button>

          <button
            onClick={() => { generateAfterRef.current = true; setShowVarHighlight(v => !v); }}
            title={showVarHighlight ? "Ocultar resaltado de variables" : "Mostrar resaltado de variables"}
            style={{
              width: 32, height: 32, borderRadius: 6, border: "none",
              background: showVarHighlight ? "rgba(201,169,97,.2)" : "transparent",
              color: showVarHighlight ? "#a07c30" : "rgba(26,35,50,.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .12s, color .12s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>
            </svg>
          </button>
        </div>

      </div>

      {/* MODALES */}
      {modal === "partes"      && <ModalPartes partes={partes} onApply={applyAndGen(setPartes)} onClose={() => setModal(null)} showRol={templateKey === "certFirmaF08"}/>}
      {modal === "escribano"   && <ModalEscribano   escribano={escribano}     onApply={applyAndGen(setEscribano)}   onClose={() => setModal(null)}/>}
      {modal === "instrumento" && <ModalInstrumento instrumento={instrumento} onApply={applyAndGen(setInstrumento)} onClose={() => setModal(null)}/>}
      {modal === "protocolo"   && <ModalProtocolo   protocolo={protocolo}     onApply={applyAndGen(setProtocolo)}   onClose={() => setModal(null)}/>}
      {modal === "fecha"       && <ModalFecha       fecha={fecha}             onApply={applyAndGen(setFecha)}       onClose={() => setModal(null)}/>}
      {modal === "formato"     && <ModalFormato
        fuente={fuente} fontSize={fontSize} margenKey={margenKey} interlineado={interlineado}
        onApply={({ fuente: f, fontSize: fs, margenKey: mk, interlineado: il }) => {
          generateAfterRef.current = true;
          setFuente(f); setFontSize(fs); setMargenKey(mk); setInterlineado(il);
        }}
        onClose={() => setModal(null)}
      />}

      {modal === "estado" && (
        <Modal title="Estado del documento" onClose={() => setModal(null)}
               footer={<><Btn onClick={() => setModal(null)}>Cancelar</Btn>
                          <Btn primary onClick={() => setModal(null)}>Guardar</Btn></>}>
          {[["borrador","Borrador"],["revision","En revisión"],["completo","Completo"]].map(([v2, l]) => (
            <label key={v2} onClick={() => setEstado(v2)}
                   style={{
                     display: "flex", alignItems: "center", gap: 10,
                     padding: "10px 12px",
                     border: "1px solid " + (estado === v2 ? C.cerulean : "rgba(26,35,50,.12)"),
                     borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500,
                     color: C.dark, fontFamily: "'Montserrat',sans-serif",
                     background: estado === v2 ? C.ceruleanLight : "transparent",
                   }}>
              <input type="radio" name="est" checked={estado === v2}
                     onChange={() => setEstado(v2)} style={{ accentColor: C.cerulean }}/>
              {l}
            </label>
          ))}
          <Warn>Ningún estado bloquea la edición del documento.</Warn>
        </Modal>
      )}


    </div>
  );
}