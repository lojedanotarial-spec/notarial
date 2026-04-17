import { useState, useCallback, useEffect, useRef } from "react";
import {
  C, A4W, A4H, mm, PROT, NOPROT,
  ZOOM_LEVELS, FUENTES, MESES_LABEL,
  PARTE_VACIA, ESCRIBANO_INI, FECHA_HOY, PROTOCOLO_INI, INSTRUMENTO_INI,
  ELABELS, inp,
} from "../constants";
import { diaLetras, anioLetras, gen } from "../utils";
import { usePagination }  from "../hooks/usePagination";
import { PageEditor }     from "../components/PageEditor";
import { NavBar }         from "../components/NavBar";
import { Modal }          from "../components/Modal";
import { Btn }            from "../components/ui/Btn";
import { Warn }           from "../components/ui/FormElements";
import { TbBtn, Dropdown, DdSection, DdItem } from "../components/ui/Toolbar";
import { ModalPartes }    from "../components/modals/ModalPartes";
import { ModalEscribano, ModalInstrumento, ModalProtocolo, ModalFecha } from "../components/modals/ModalOtros";
import { exportarDocx }   from "../utils/exportDocx";
import { buildCertFirmaF08 } from "../templates/certFirmaF08";

const LINE_HEIGHT_PT = 24;
const LINE_HEIGHT_PX = LINE_HEIGHT_PT * (96 / 72);

const HIGHLIGHT_COLORS = [
  { color: "#fef9c3", title: "Amarillo" },
  { color: "#d1fae5", title: "Verde menta" },
  { color: "#fce7f3", title: "Rosa palo" },
];

const v = (label, value) => {
  const isEmpty = !value;
  return '<span data-variable data-label="' + label + '" style="' +
    (isEmpty
      ? "color:#c0392b;font-weight:700;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;"
      : "color:#3a7ca5;font-weight:700;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;") +
    '">' + (isEmpty ? "{{" + label + "}}" : value) + "</span>";
};

function TbSep() {
  return (
    <div style={{
      width: 1, height: 20,
      background: "rgba(26,35,50,.13)",
      margin: "0 6px", flexShrink: 0,
    }}/>
  );
}

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
          fontSize: 11, fontWeight: 700, color: "rgba(26,35,50,.4)",
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
  const [modal,     setModal]     = useState(null);
  const [hojaOn,    setHojaOn]    = useState(true);
  const [estado,    setEstado]    = useState("borrador");
  const [zoomIdx,   setZoomIdx]   = useState(4);
  const [fuente,    setFuente]    = useState(FUENTES[0]);
  const [margenKey, setMargenKey] = useState("protocolar");
  const [ddOpen,    setDdOpen]    = useState(null);
  const [showVars,  setShowVars]  = useState(true);
  const [fontSize,  setFontSize]  = useState(11);

  const [partes,      setPartes]      = useState([PARTE_VACIA()]);
  const [escribano,   setEscribano]   = useState(ESCRIBANO_INI);
  const [fecha,       setFecha]       = useState(FECHA_HOY());
  const [protocolo,   setProtocolo]   = useState(PROTOCOLO_INI);
  const [instrumento, setInstrumento] = useState(INSTRUMENTO_INI);

  // Ref al editor activo (el que tiene el foco) — la toolbar opera sobre él
  const activeEditor = useRef(null);

  useEffect(() => {
  const handler = (e) => setModal(e.detail.modal);
  window.addEventListener("notarial:openmodal", handler);
  return () => window.removeEventListener("notarial:openmodal", handler);
  }, []);

  const zoom = ZOOM_LEVELS[zoomIdx];

  const primerApellido = partes[0]?.apellido || null;
  const diaStr  = String(fecha.dia).padStart(2, "0");
  const mesStr  = String(fecha.mes + 1).padStart(2, "0");
  const docTitle = primerApellido
    ? "Certificacion de firma - " + primerApellido + " - " + diaStr + "/" + mesStr + "/" + fecha.anio
    : "Certificacion de firma - nuevo documento";

  const instrTexto  = instrumento.descripcion || "el instrumento adjunto a la presente Actuación Notarial";
  const fechaLetras = diaLetras(fecha.dia) + " días del mes de " + MESES_LABEL[fecha.mes] + " de " + anioLetras(fecha.anio);

  const buildDocHTML = useCallback(() => {
    const fmtDni  = (val) => val ? Number(String(val).replace(/\D/g, "")).toLocaleString("es-AR") : "";
    const fmtCuit = (c) => {
      if (!c) return "";
      const [pre, mid, suf] = c.split("-");
      return pre + "-" + (mid ? Number(mid).toLocaleString("es-AR") : "") + "-" + (suf || "");
    };

    let partesHTML = "";
    if (partes.length === 0) {
      partesHTML = v("PARTE", "");
    } else {
      const fraseIdentidad = partes.length === 1
        ? ", y cuya identidad justifica conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhibe el documento anteriormente relacionado cuya copia archivo en esta escribanía.- "
        : ", y cuyas identidades justifican conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhiben los documentos anteriormente relacionados cuyas copias archivo en esta escribanía.- ";
      const fraseCapacidad = partes.length === 1
        ? gen(partes[0], "La compareciente", "El compareciente") + " manifiesta no tener su capacidad de ejercicio restringida por sentencia alguna.-"
        : "Los comparecientes manifiestan no tener su capacidad de ejercicio restringida por sentencia alguna.-";

      partes.forEach((p, idx) => {
        const esUltima = idx === partes.length - 1;
        const domicilio = [p.calle, p.numero,
          p.piso && "piso " + p.piso,
          p.dpto && "departamento " + p.dpto,
          p.localidad,
        ].filter(Boolean).join(", ");

        if (idx === 0) partesHTML += "por ";
        if (idx > 0 && !esUltima) partesHTML += "; ";
        if (idx > 0 && esUltima)  partesHTML += "; y ";

        partesHTML += gen(p, "la señora", "el señor") + " ";
        partesHTML += v("APELLIDO Y NOMBRE", p.apellido ? p.apellido + (p.nombre ? ", " + p.nombre : "") : "");
        partesHTML += ", ";
        partesHTML += v("NACIONALIDAD", p.nacionalidad);
        partesHTML += ", con ";
        partesHTML += v("TIPO DOC", p.tipoDoc);
        partesHTML += " número ";
        partesHTML += v("N° DOCUMENTO", fmtDni(p.nroDoc));
        if (p.cuit) partesHTML += ", C.U.I.T./L. " + v("CUIT/CUIL", fmtCuit(p.cuit));
        if (p.fechaNac) partesHTML += ", nacid" + gen(p, "a", "o") + " el " + v("FECHA NAC", p.fechaNac);
        partesHTML += ", quien manifiesta ser de estado de familia ";
        partesHTML += v("ESTADO CIVIL", p.estadoCivil);
        if (domicilio) {
          partesHTML += ", con domicilio en " + v("DOMICILIO", domicilio);
          partesHTML += ", departamento " + v("DEPARTAMENTO", p.departamento);
          partesHTML += ", de esta Provincia de Mendoza";
        }
        partesHTML += "; datos que surgen del Documento Nacional de Identidad que he tenido a la vista para este acto, ";
        partesHTML += gen(p, "la que", "el que") + " firma en su carácter de ";
        partesHTML += v("ROL", p.rol);
      });
      partesHTML += fraseIdentidad + fraseCapacidad;
    }

    const al_del = escribano.caracter?.toLowerCase().includes("titular") ? "del" : "al";

    return buildCertFirmaF08({ partes, escribano, fecha, protocolo, instrumento, instrTexto, fechaLetras, MESES_LABEL, gen });
  }, [partes, escribano, fecha, protocolo, instrumento, instrTexto, fechaLetras]);

  // ── PAGINACIÓN ─────────────────────────────────────────────────────────────
  const { pages, updatePage, addPage, removePage, prependToPage } = usePagination(buildDocHTML());

  // Cuando cambian los datos del documento, regenerar y resetear a 1 página
  useEffect(() => {
    // Sólo resetear si el usuario no tiene múltiples páginas editadas
    // (heurística: resetear siempre al cambiar datos del panel)
    const html = buildDocHTML();
    // Forzamos a una sola página con el nuevo contenido
    // usePagination no expone reset directo; lo hacemos via updatePage de la primera
    updatePage(pages[0].id, html);
    // Eliminar páginas extra si existían
    pages.slice(1).forEach(p => removePage(p.id));
  }, [partes, escribano, fecha, protocolo, instrumento]);

  // Handler de overflow: recibe HTML que desbordó de la página pageId
  const handleOverflow = useCallback((pageId, overflowHTML) => {
    const idx = pages.findIndex(p => p.id === pageId);
    if (idx === -1) return;

    const nextPage = pages[idx + 1];
    if (nextPage) {
      // Prepend al inicio de la siguiente página
      const combined = overflowHTML + nextPage.content.replace(/^<p><\/p>/, "");
      prependToPage(nextPage.id, combined);
    } else {
      // Crear nueva página con el overflow
      addPage(pageId, overflowHTML);
    }
  }, [pages, addPage, prependToPage]);

  // Handler de underflow: si página queda vacía, eliminarla (excepto la primera)
  const handleUnderflow = useCallback((pageId) => {
    removePage(pageId);
  }, [removePage]);

  // ── TOOLBAR ────────────────────────────────────────────────────────────────
  const tbCmd = (fn) => () => {
    const ed = activeEditor.current;
    if (!ed) return;
    fn(ed);
  };

  const handleDocx = () => {
    const ed = activeEditor.current;
    if (!ed) return;
    // Concatena el HTML de todas las páginas para exportar
    const allHTML = pages.map(p => p.content).join("\n");
    exportarDocx({ html: allHTML, fuente, fontSize, docTitle });
  };

  const handlePrint = () => window.print();

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
      />

      {/* TOOLBAR */}
      <div
        className="no-print"
        style={{
          background: "#f8f6f2", borderBottom: "1px solid rgba(26,35,50,.1)",
          padding: "0 14px", height: 42, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 2,
        }}
      >
        <TbBtn title="Negrita"
               active={activeEditor.current?.isActive("bold")}
               onClick={tbCmd(ed => ed.chain().focus().toggleBold().run())}>
          <b>N</b>
        </TbBtn>
        <TbBtn title="Cursiva"
               active={activeEditor.current?.isActive("italic")}
               onClick={tbCmd(ed => ed.chain().focus().toggleItalic().run())}>
          <i style={{ fontStyle: "italic" }}>I</i>
        </TbBtn>
        <TbBtn title="Subrayado"
               active={activeEditor.current?.isActive("underline")}
               onClick={tbCmd(ed => ed.chain().focus().toggleUnderline().run())}>
          <span style={{ textDecoration: "underline" }}>S</span>
        </TbBtn>

        <TbSep/>

        <TbBtn title="MAYÚSCULAS" onClick={tbCmd(ed => {
          const { from, to } = ed.state.selection;
          const text = ed.state.doc.textBetween(from, to);
          ed.chain().focus().insertContentAt({ from, to }, text.toUpperCase()).run();
        })}><span style={{ fontSize: 12, fontWeight: 600 }}>AA</span></TbBtn>
        <TbBtn title="minúsculas" onClick={tbCmd(ed => {
          const { from, to } = ed.state.selection;
          const text = ed.state.doc.textBetween(from, to);
          ed.chain().focus().insertContentAt({ from, to }, text.toLowerCase()).run();
        })}><span style={{ fontSize: 12 }}>aa</span></TbBtn>
        <TbBtn title="Capitalizar" onClick={tbCmd(ed => {
          const { from, to } = ed.state.selection;
          const text = ed.state.doc.textBetween(from, to);
          const cap = text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
          ed.chain().focus().insertContentAt({ from, to }, cap).run();
        })}><span style={{ fontSize: 12 }}>Aa</span></TbBtn>

        <TbSep/>

        <div style={{ position: "relative" }}>
          <TbBtn
            active={ddOpen === "formato"}
            onClick={() => setDdOpen(ddOpen === "formato" ? null : "formato")}
          >
            {fuente.label}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 2.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TbBtn>
          <Dropdown open={ddOpen === "formato"}>
            <DdSection label="Fuente">
              {FUENTES.map(f => (
                <DdItem key={f.key} active={fuente.key === f.key}
                        onClick={() => {
                          setFuente(f);
                          setDdOpen(null);
                          activeEditor.current?.chain().focus().setFontFamily(f.family).run();
                        }}>
                  <span style={{ fontFamily: f.family, fontSize: 14 }}>{f.label}</span>
                </DdItem>
              ))}
            </DdSection>
          </Dropdown>
        </div>

        <select
          value={fontSize}
          onChange={e => setFontSize(Number(e.target.value))}
          style={{
            padding: "3px 4px", border: "1px solid " + C.borderStrong,
            borderRadius: 5, fontSize: 13, background: "#f8f6f2",
            color: C.dark, fontFamily: "'Montserrat',sans-serif", width: 48,
          }}
        >
          {[8,9,10,11,12,13,14,16,18].map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <TbSep/>

        {HIGHLIGHT_COLORS.map(({ color, title }) => (
          <button
            key={color}
            title={"Resaltar: " + title}
            onClick={tbCmd(ed => ed.chain().focus().setHighlight({ color }).run())}
            style={{
              width: 20, height: 20, borderRadius: 4, background: color,
              border: "1px solid rgba(26,35,50,.2)", cursor: "pointer",
              flexShrink: 0, padding: 0,
            }}
          />
        ))}
        <button
          title="Quitar resaltado"
          onClick={tbCmd(ed => ed.chain().focus().unsetHighlight().run())}
          style={{
            width: 20, height: 20, borderRadius: 4, background: "transparent",
            border: "1px solid rgba(26,35,50,.2)", cursor: "pointer",
            flexShrink: 0, display: "flex", alignItems: "center",
            justifyContent: "center", padding: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
               stroke="rgba(26,35,50,.4)" strokeWidth="1.5">
            <path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round"/>
          </svg>
        </button>

        <TbSep/>

        <div style={{ position: "relative" }}>
          <TbBtn
            active={ddOpen === "margenes"}
            onClick={() => setDdOpen(ddOpen === "margenes" ? null : "margenes")}
          >
            Márgenes
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 2.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TbBtn>
          <Dropdown open={ddOpen === "margenes"}>
            <DdSection label="Formato de página">
              <DdItem active={margenKey === "protocolar"} meta="36·76·15·20 mm"
                      onClick={() => { setMargenKey("protocolar"); setDdOpen(null); }}>
                Protocolar
              </DdItem>
              <DdItem active={margenKey === "noprotocolar"} meta="30·35·20·20 mm"
                      onClick={() => { setMargenKey("noprotocolar"); setDdOpen(null); }}>
                No protocolar
              </DdItem>
            </DdSection>
          </Dropdown>
        </div>

        <TbSep/>

        <TbBtn title="Deshacer" onClick={tbCmd(ed => ed.chain().focus().undo().run())}>↩</TbBtn>
        <TbBtn title="Rehacer" onClick={tbCmd(ed => ed.chain().focus().redo().run())}>↪</TbBtn>

        <TbSep/>

        <TbBtn onClick={() => setZoomIdx(Math.max(0, zoomIdx - 1))}>−</TbBtn>
        <span style={{
          fontSize: 13, fontWeight: 500, color: C.dark,
          minWidth: 38, textAlign: "center",
        }}>
          {Math.round(zoom * 100)}%
        </span>
        <TbBtn onClick={() => setZoomIdx(Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1))}>+</TbBtn>
        <TbBtn title="Restablecer zoom" onClick={() => setZoomIdx(4)}>↺</TbBtn>

        <TbSep/>

        <TbBtn active={hojaOn} onClick={() => setHojaOn(!hojaOn)}>Fondo</TbBtn>
        <TbBtn active={showVars} onClick={() => setShowVars(!showVars)}>Variables</TbBtn>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ÁREA DE PÁGINAS */}
        <div style={{
          flex: 1, background: C.warm,
          overflowY: "auto", overflowX: "auto",
          display: "flex", flexDirection: "column",
          alignItems: "center",
          padding: "28px 20px", gap: 32,
        }}>
          {pages.map((page, idx) => (
            <PageEditor
              key={page.id}
              page={page}
              pageIndex={idx}
              isFirst={idx === 0}
              hojaOn={hojaOn}
              margenKey={margenKey}
              fuente={fuente}
              fontSize={fontSize}
              zoom={zoom}
              activeEditor={activeEditor}
              showVariables={showVars}
              onOverflow={(overflowHTML) => handleOverflow(page.id, overflowHTML)}
              onUnderflow={() => handleUnderflow(page.id)}
              onUpdate={(html) => updatePage(page.id, html)}
            />
          ))}
        </div>

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
              <div style={{ fontSize: 12, color: "rgba(26,35,50,.6)", marginTop: 2 }}>
                {escribano.caracter} · Reg. {escribano.registro}
              </div>
            </PanelSection>

            <PanelSection label="Fecha y lugar" onClick={() => setModal("fecha")}>
              <div style={{ fontSize: 14, color: C.dark, fontWeight: 600 }}>
                {String(fecha.dia).padStart(2,"0")}/{String(fecha.mes+1).padStart(2,"0")}/{fecha.anio}
              </div>
              <div style={{ fontSize: 12, color: "rgba(26,35,50,.6)", marginTop: 2 }}>
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
              textTransform: "uppercase", color: "rgba(26,35,50,.4)", marginBottom: 7,
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
      {modal === "partes"      && <ModalPartes partes={partes} onApply={setPartes} onClose={() => setModal(null)} showRol={params?.templateKey === "certFirmaF08"}/>}
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

      {modal === "exportar" && (
        <Modal title="Exportar documento" onClose={() => setModal(null)}
               footer={<Btn onClick={() => setModal(null)}>Cerrar</Btn>}>
          <div style={{ display: "flex", gap: 12 }}>
            <div
              onClick={handleDocx}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.cerulean;
                e.currentTarget.style.background = C.ceruleanLight;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(26,35,50,.12)";
                e.currentTarget.style.background = "transparent";
              }}
              style={{
                flex: 1, padding: 20,
                border: "1px solid rgba(26,35,50,.12)", borderRadius: 10,
                textAlign: "center", cursor: "pointer", transition: "all .12s",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 6 }}>DOCX</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Sin fondo · Para seguir editando</div>
              <div style={{
                fontSize: 12, color: "rgba(26,35,50,.55)", lineHeight: 1.5,
                borderTop: "1px solid rgba(26,35,50,.08)", paddingTop: 8, textAlign: "left",
              }}>
                ⚠ El salto de línea puede variar en Word. Para el documento oficial usá Imprimir / PDF.
              </div>
            </div>
            <div
              onClick={handlePrint}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.cerulean;
                e.currentTarget.style.background = C.ceruleanLight;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(26,35,50,.12)";
                e.currentTarget.style.background = "transparent";
              }}
              style={{
                flex: 1, padding: 20,
                border: "1px solid rgba(26,35,50,.12)", borderRadius: 10,
                textAlign: "center", cursor: "pointer", transition: "all .12s",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Imprimir / PDF</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {hojaOn ? "Con fondo protocolar" : "Sin fondo"}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
