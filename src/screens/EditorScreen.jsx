import { useAutoguardado } from "../hooks/useAutoguardado";
import { useAuth } from "../context/AuthContext";
import {
  C, FUENTES, MESES_LABEL,
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
import { buildDocxCertFirmaF08 } from "../utils/buildDocx";
import { OnlyOfficeEditor }     from "../components/OnlyOfficeEditor";
import { supabase } from "../supabase";
import { useState, useEffect, useMemo } from "react";

const ONLYOFFICE_URL = import.meta.env.VITE_ONLYOFFICE_URL || "http://192.168.100.7";


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
  const [modal,       setModal]       = useState(null);
  const [estado,      setEstado]      = useState("borrador");
  const [fuente,      setFuente]      = useState(FUENTES[0]);
  const [margenKey,   setMargenKey]   = useState("protocolar");
  const [fontSize,    setFontSize]    = useState(11);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [documentKey, setDocumentKey] = useState(null);
  const [generating,  setGenerating]  = useState(false);

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

  const handleGenerar = async () => {
    setGenerating(true);
    try {
      const blob = await buildDocxCertFirmaF08({
        partes, escribano, fecha, protocolo, instrumento,
        instrTexto, fechaLetras, gen,
        margenKey, fontSize, fuente,
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
    } catch (e) {
      alert("Error al generar el documento: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

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

  const instrTexto  = instrumento.descripcion || "el instrumento adjunto a la presente Actuación Notarial";
  const fechaLetras = diaLetras(fecha.dia) + " días del mes de " + MESES_LABEL[fecha.mes] + " de " + anioLetras(fecha.anio);

  const { indicador, guardarAhora, hayPendiente } = useAutoguardado({
    titulo: docTitle,
    estado,
    contenido: contenidoParaGuardar,
    templateKey,
    registroNumero: miUsuario?.registro || registroActivo,
    usuarioId: usuario?.id,
    initialDocId: params?.docId,
  });

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
        onExport={() => setModal("exportar")}
        indicadorGuardado={indicador}
        onGuardar={guardarAhora}
        onGo={handleGo}
      />

      {/* TOOLBAR */}
      <div
        className="no-print"
        style={{
          background: "#f8f6f2", borderBottom: "1px solid rgba(26,35,50,.1)",
          padding: "0 14px", height: 42, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <select value={fuente.key} onChange={e => setFuente(FUENTES.find(f => f.key === e.target.value))}
          style={{ padding: "3px 6px", border: "1px solid " + C.borderStrong, borderRadius: 5,
                   fontSize: 13, background: "#f8f6f2", color: C.dark,
                   fontFamily: "'Montserrat',sans-serif" }}>
          {FUENTES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>

        <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
          style={{ padding: "3px 4px", border: "1px solid " + C.borderStrong, borderRadius: 5,
                   fontSize: 13, background: "#f8f6f2", color: C.dark,
                   fontFamily: "'Montserrat',sans-serif", width: 48 }}>
          {[8,9,10,11,12,13,14,16,18].map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={margenKey} onChange={e => setMargenKey(e.target.value)}
          style={{ padding: "3px 6px", border: "1px solid " + C.borderStrong, borderRadius: 5,
                   fontSize: 13, background: "#f8f6f2", color: C.dark,
                   fontFamily: "'Montserrat',sans-serif" }}>
          <option value="protocolar">Protocolar</option>
          <option value="noprotocolar">No protocolar</option>
        </select>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleGenerar}
          disabled={generating}
          style={{
            padding: "6px 18px", borderRadius: 7, border: "none",
            background: generating ? C.muted : C.cerulean,
            color: "#fff", cursor: generating ? "not-allowed" : "pointer",
            fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13,
          }}
        >
          {generating ? "Generando..." : documentUrl ? "Regenerar documento" : "Generar documento"}
        </button>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ÁREA EDITOR ONLYOFFICE */}
        <OnlyOfficeEditor
          documentUrl={documentUrl}
          documentKey={documentKey}
          documentTitle={docTitle}
          serverUrl={ONLYOFFICE_URL}
        />

        {/* PANEL LATERAL */}
        <div
          className="no-print"
          style={{
            width: 260, flexShrink: 0, background: "#fff",
            borderLeft: "1px solid rgba(26,35,50,.15)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          <div style={{
            padding: "12px 14px", borderBottom: "1px solid rgba(26,35,50,.1)",
            fontSize: 14, fontWeight: 700, color: C.dark,
          }}>
            Propiedades
          </div>

          <div style={{
            flex: 1, overflowY: "auto", padding: 10,
            display: "flex", flexDirection: "column", gap: 7,
          }}>
            <PanelSection label="Escribano" onClick={() => setModal("escribano")}>
              <div style={{ fontSize: 14, color: C.dark, fontWeight: 600 }}>{escribano.nombre}</div>
              <div style={{ fontSize: 12, color: "rgba(26,35,50,1)", marginTop: 2 }}>
                {escribano.caracter} · Reg. {escribano.registro}
              </div>
            </PanelSection>

            <PanelSection label="Fecha y lugar" onClick={() => setModal("fecha")}>
              <div style={{ fontSize: 14, color: C.dark, fontWeight: 600 }}>
                {String(fecha.dia).padStart(2,"0")}/{String(fecha.mes+1).padStart(2,"0")}/{fecha.anio}
              </div>
              <div style={{ fontSize: 12, color: "rgba(26,35,50,1)", marginTop: 2 }}>
                {fecha.ciudad}, Mendoza
              </div>
            </PanelSection>

            <PanelSection
              label="Partes"
              onClick={() => setModal("partes")}
              alerta={partes.some(p => !p.apellido || !p.nombre)}
            >
              {partes.map(p => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 7, marginBottom: 4,
                }}>
                  <div style={{
                    width: 22, height: 22, minWidth: 22, borderRadius: "50%",
                    background: C.ceruleanLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "#1f4862",
                  }}>
                    {((p.apellido?.[0] || "?") + (p.nombre?.[0] || "")).toUpperCase()}
                  </div>
                  <span style={{
                    fontSize: 14, color: C.dark, fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.apellido || "Sin nombre"}
                  </span>
                </div>
              ))}
              <div style={{ fontSize: 12, color: C.cerulean, marginTop: 3, fontWeight: 500 }}>
                + Editar partes
              </div>
            </PanelSection>

            <PanelSection
              label="Protocolo"
              onClick={() => setModal("protocolo")}
              alerta={!protocolo.nroActa}
            >
              <div style={{ fontSize: 14, color: C.dark, fontWeight: 600 }}>
                Libro {protocolo.nroLibro}
              </div>
              <div style={{
                fontSize: 12,
                color: protocolo.nroActa ? "rgba(26,35,50,.6)" : "#c0392b",
                marginTop: 2,
                fontWeight: protocolo.nroActa ? 400 : 600,
              }}>
                Acta nº {protocolo.nroActa || "pendiente"}
              </div>
            </PanelSection>

            <PanelSection label="Instrumento" onClick={() => setModal("instrumento")}>
              <div style={{
                fontSize: 14,
                color: instrumento.descripcion ? C.dark : "rgba(26,35,50,.45)",
                fontStyle: instrumento.descripcion ? "normal" : "italic",
                fontWeight: instrumento.descripcion ? 600 : 400,
              }}>
                {instrumento.descripcion || "Sin especificar"}
              </div>
            </PanelSection>
          </div>

          <div style={{ padding: 10, borderTop: "1px solid rgba(26,35,50,.1)" }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: ".07em",
              textTransform: "uppercase", color: "rgba(26,35,50,1)", marginBottom: 7,
            }}>
              Estado
            </div>
            <button onClick={() => setModal("estado")} style={{
              width: "100%", padding: "8px 10px", borderRadius: 7, cursor: "pointer",
              fontFamily: "'Montserrat',sans-serif", fontSize: 14, fontWeight: 600,
              border: "1px solid rgba(26,35,50,.2)", background: C.porcelain, color: C.dark,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              {ELABELS[estado]}
              <svg width="10" height="10" viewBox="0 0 8 8" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <path d="M1 2.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* MODALES */}
      {modal === "partes"      && <ModalPartes partes={partes} onApply={setPartes} onClose={() => setModal(null)} showRol={templateKey === "certFirmaF08"}/>}
      {modal === "escribano"   && <ModalEscribano   escribano={escribano}     onApply={setEscribano}   onClose={() => setModal(null)}/>}
      {modal === "instrumento" && <ModalInstrumento instrumento={instrumento} onApply={setInstrumento} onClose={() => setModal(null)}/>}
      {modal === "protocolo"   && <ModalProtocolo   protocolo={protocolo}     onApply={setProtocolo}   onClose={() => setModal(null)}/>}
      {modal === "fecha"       && <ModalFecha       fecha={fecha}             onApply={setFecha}       onClose={() => setModal(null)}/>}

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