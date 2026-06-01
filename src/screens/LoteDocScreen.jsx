import { useState, useEffect, useRef } from "react";
import { C, FUENTES, ZOOM_LEVELS, MESES_LABEL, inp } from "../constants";
import { NavBar } from "../components/NavBar";
import { Fg } from "../components/ui/FormElements";
import { InputFecha, InputDinero, InputDecimal } from "../components/ui/Masked";
import { ModalPartes } from "../components/modals/ModalPartes";
import { generarEscritura } from "../utils/generarEscritura";
import { exportarDocx } from "../utils/exportDocx";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { A4W, A4H, PROT, mm } from "../constants";

const LINE_HEIGHT_PT = 24;
const LINE_HEIGHT_PX = LINE_HEIGHT_PT * (96 / 72);

function VistaDocumento({ html, fuente, fontSize, zoom, hojaOn, showVars }) {
  const isAnverso = true;
  const margen = PROT;
  const boxL = margen.left;
  const boxR = margen.right;
  const boxT = margen.top;
  const boxW = A4W - boxR - boxL;
  const boxH = A4H - margen.bottom - boxT;

  return (
    <div>
      <div className="no-print" style={{
        fontSize:12, fontWeight:600, letterSpacing:".07em",
        textTransform:"uppercase", color:"rgba(26,35,50,1)",
        marginBottom:8, textAlign:"center",
      }}>
        Anverso · Página 1
      </div>
      <div style={{
        transform:"scale(" + zoom + ")",
        transformOrigin:"top center",
        width:A4W, height:A4H, flexShrink:0,
        marginBottom: zoom < 1 ? (-(1-zoom)*A4H)+"px" : 0,
      }}>
        <div style={{
          position:"relative", width:A4W, height:A4H,
          background:"#fff", boxShadow:"0 2px 16px rgba(26,35,50,.13)",
          overflow:"hidden",
        }}>
          {hojaOn && (
            <img src="/Protocolo_Front.png" alt="" style={{
              position:"absolute", inset:0, width:A4W, height:A4H,
              display:"block", pointerEvents:"none", zIndex:1,
            }}/>
          )}
<style>{`
            .var-filled { color: ${showVars ? "#3a7ca5" : "#1a2332"}; font-weight: ${showVars ? "700" : "400"}; }
            .var-empty  { color: ${showVars ? "#c0392b" : "#1a2332"}; font-weight: ${showVars ? "700" : "400"}; }
          `}</style>
          <div style={{
            position:"absolute",
            left:boxL, top:boxT,
            width:boxW, height:boxH,
            overflow:"hidden",
            fontFamily: fuente.family,
            fontSize: fontSize+"pt",
            lineHeight: LINE_HEIGHT_PX+"px",
            textAlign:"justify",
            color:"#1a2332",
            wordBreak:"break-word",
            paddingLeft: mm(2)+"px",
            paddingRight: mm(2)+"px",
            paddingTop: (LINE_HEIGHT_PX*0.1)+"px",
            boxSizing:"border-box",
            zIndex:2,
          }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}

function PanelSection({ label, children, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding:"10px 12px", borderRadius:8,
        border:"1px solid " + (hover ? C.cerulean : "rgba(26,35,50,.15)"),
        cursor: onClick ? "pointer" : "default",
        transition:"border-color .12s",
      }}
    >
      <div style={{ fontSize:11, fontWeight:700, color:"rgba(26,35,50,1)",
                    textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase",
                  color:"rgba(26,35,50,.4)", marginTop:8, marginBottom:4 }}>
      {children}
    </div>
  );
}

function PanelLote({ lote, barrio, escribano, fecha, miembros, onChange }) {
  const [partesAbierto, setPartesAbierto] = useState(false);
  const upd = (campo, valor) => onChange({ ...lote, [campo]: valor });
  const sInp = { ...inp, fontSize:12, padding:"6px 9px" };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:10, display:"flex", flexDirection:"column", gap:7 }}>

      {/* ESCRIBANO */}
      <PanelSection label="Escribano">
        <Fg label="Seleccionar">
          <select style={sInp} value={lote.escribano || ""} onChange={e => upd("escribano", e.target.value)}>
            {miembros.map(m => {
              const nombre = m.nombre_preferido || `${m.nombre} ${m.apellido}`;
              return <option key={m.id} value={nombre}>{nombre}</option>;
            })}
          </select>
        </Fg>
        <div style={{ fontSize:11, color:"rgba(26,35,50,.5)", marginTop:4 }}>
          {escribano?.caracter} · Reg. {escribano?.registro}
        </div>
      </PanelSection>

      {/* ESCRITURA */}
      <PanelSection label="Escritura">
        <Fg label="N° Escritura">
          <input style={sInp} value={lote.nroEscritura || ""} onChange={e => upd("nroEscritura", e.target.value)} placeholder="ej: 29"/>
        </Fg>
        <Fg label="Fecha escritura">
          <InputFecha style={sInp} value={lote.fechaEscritura || ""} onChange={v => upd("fechaEscritura", v)}/>
        </Fg>

      </PanelSection>      

      {/* ADQUIRENTES */}
      <PanelSection label="Adquirentes" onClick={() => setPartesAbierto(true)}>
        {(lote.partes || []).length === 0 ? (
          <div style={{ fontSize:12, color:"rgba(26,35,50,.4)", fontStyle:"italic" }}>Sin adquirentes</div>
        ) : (lote.partes || []).map((p, idx) => (
          <div key={idx} style={{
            display:"flex", alignItems:"center", gap:8,
            paddingBottom: idx < lote.partes.length-1 ? 5 : 0,
            marginBottom: idx < lote.partes.length-1 ? 5 : 0,
            borderBottom: idx < lote.partes.length-1 ? "1px solid rgba(26,35,50,.07)" : "none",
          }}>
            <div style={{
              width:22, height:22, borderRadius:"50%", background:C.ceruleanLight,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:9, fontWeight:700, color:C.cerulean, flexShrink:0,
            }}>
              {(p.apellido?.[0] || "?").toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.dark,
                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {p.apellido}{p.nombre ? ", "+p.nombre : ""}
              </div>
              <div style={{ fontSize:10, color:"rgba(26,35,50,.5)" }}>DNI {p.nroDoc || "-"}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize:12, color:C.cerulean, marginTop:6, fontWeight:500 }}>
          {lote.partes?.length > 0 ? "+ Editar adquirentes" : "+ Agregar adquirentes"}
        </div>
      </PanelSection>



      {/* INMUEBLE */}
      <PanelSection label="Inmueble">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          <Fg label="Manzana">
            <input style={sInp} value={lote.manzana || ""} onChange={e => upd("manzana", e.target.value.toUpperCase())}/>
          </Fg>
          <Fg label="Lote">
            <input style={sInp} value={lote.lote || ""} onChange={e => upd("lote", e.target.value)}/>
          </Fg>
        </div>
        <Fg label="Sup. mensura">
          <InputDecimal style={sInp} value={lote.supMensura || ""} onChange={v => upd("supMensura", v)}/>
        </Fg>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          <Fg label="Título I"><InputDecimal style={sInp} value={lote.supTitulo1 || ""} onChange={v => upd("supTitulo1", v)}/></Fg>
          <Fg label="Título II"><InputDecimal style={sInp} value={lote.supTitulo2 || ""} onChange={v => upd("supTitulo2", v)}/></Fg>
          <Fg label="Título III"><InputDecimal style={sInp} value={lote.supTitulo3 || ""} onChange={v => upd("supTitulo3", v)}/></Fg>
          <Fg label="Título IV"><InputDecimal style={sInp} value={lote.supTitulo4 || ""} onChange={v => upd("supTitulo4", v)}/></Fg>
        </div>
      </PanelSection>

      {/* PRECIO */}
      <PanelSection label="Precio">
        <Fg label="Precio total">
          <InputDinero style={sInp} value={lote.precio || ""} onChange={v => upd("precio", v)}/>
        </Fg>
        <Fg label="Retención ganancias">
          <InputDinero style={sInp} value={lote.retencionGanancias || ""} onChange={v => upd("retencionGanancias", v)}/>
        </Fg>
      </PanelSection>

{/* REGISTRACIONES */}
      <PanelSection label="Registraciones">
        <Fg label="Nomenclatura">
          <input style={sInp} value={lote.nomenclatura || ""} onChange={e => upd("nomenclatura", e.target.value)}/>
        </Fg>
        <Fg label="Avalúo fiscal">
          <InputDinero style={sInp} value={lote.avaluo || ""} onChange={v => upd("avaluo", v)}/>
        </Fg>
        <Fg label="Padrón territorial">
          <input style={sInp} value={lote.padronRentas || ""} onChange={e => upd("padronRentas", e.target.value)}/>
        </Fg>
        <Fg label="Padrón municipal">
          <input style={sInp} value={lote.padronMuni || ""} onChange={e => upd("padronMuni", e.target.value)}/>
        </Fg>
        <Fg label="N° cert. registro">
          <input style={sInp} value={lote.certRegistro || ""} onChange={e => upd("certRegistro", e.target.value)}/>
        </Fg>
        <Fg label="Fecha cert. registro">
          <InputFecha style={sInp} value={lote.fechaRegistro || ""} onChange={v => upd("fechaRegistro", v)}/>
        </Fg>
        <Fg label="N° cert. catastro">
          <input style={sInp} value={lote.certCatastro || ""} onChange={e => upd("certCatastro", e.target.value)}/>
        </Fg>
        <Fg label="Fecha cert. catastro">
          <InputFecha style={sInp} value={lote.fechaCatastro || ""} onChange={v => upd("fechaCatastro", v)}/>
        </Fg>
      </PanelSection>

      {partesAbierto && (
        <ModalPartes
          partes={lote.partes?.length > 0 ? lote.partes : []}
          onApply={partes => { upd("partes", partes); setPartesAbierto(false); }}
          onClose={() => setPartesAbierto(false)}
          showRol={true}
        />
      )}
    </div>
  );
}

export function LoteDocScreen({ lote: loteInicial, barrio, onVolver, onGo }) {
  const { miUsuario, miembros, usuario } = useAuth();
  const [lote, setLote] = useState({ ...loteInicial });
  const [templateHTML, setTemplateHTML] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [docId, setDocId] = useState(null);
  const [estado, setEstado] = useState("borrador");
  const fechaDeEscritura = () => {
    if (!lote.fechaEscritura) return { dia: new Date().getDate(), mes: new Date().getMonth(), anio: new Date().getFullYear() };
    const [dia, mes, anio] = lote.fechaEscritura.split("/").map(Number);
    return { dia: dia || new Date().getDate(), mes: (mes - 1) || new Date().getMonth(), anio: anio || new Date().getFullYear() };
  };
  const fecha = fechaDeEscritura();
  const [zoomIdx, setZoomIdx] = useState(4);
  const [hojaOn, setHojaOn] = useState(true);
  const [showVars, setShowVars] = useState(true);
  const [fuente, setFuente] = useState(FUENTES[0]);
  const [fontSize, setFontSize] = useState(11);
  const zoom = ZOOM_LEVELS[zoomIdx];

  const escribano = miUsuario ? {
    nombre: miUsuario.nombre_preferido || `${miUsuario.nombre} ${miUsuario.apellido}`,
    caracter: miUsuario.rol === "titular" ? "Notario/a Titular" : "Notario/a Adscripto/a",
    registro: miUsuario.registro,
    circunscripcion: miUsuario.circunscripcion,
    localidad_registro: miUsuario.localidad_registro,
  } : {};

  // Cargar template del barrio
  useEffect(() => {
    if (!barrio?.id) return;
    async function cargar() {
      setCargando(true);
      const { data: tmpl } = await supabase
        .from("templates_barrio")
        .select("html")
        .eq("barrio_id", barrio.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Buscar doc existente para este lote
      const { data: doc } = await supabase
        .from("documentos")
        .select("id, estado")
        .eq("lote_id", lote.id)
        .maybeSingle();

      if (doc) {
        setDocId(doc.id);
        setEstado(doc.estado || "borrador");
      }

      // Recargar datos frescos del lote desde Supabase
      const { data: loteData } = await supabase
        .from("lotes")
        .select("datos_json")
        .eq("id", lote.id)
        .maybeSingle();
      if (loteData?.datos_json) {
        setLote({ ...loteData.datos_json, id: lote.id });
      }

      setTemplateHTML(tmpl?.html || "<p>Sin modelo cargado para este barrio.</p>");
      setCargando(false);
    }
    cargar();
  }, [barrio?.id, lote.id]);

  // Guardar lote actualizado en Supabase
  const guardarLote = async (loteActualizado) => {
    await supabase.from("lotes").update({ datos_json: loteActualizado }).eq("id", lote.id);
  };

  // Guardar documento en Supabase
  const guardarDoc = async () => {
    if (!templateHTML) return;
    setGuardando(true);
    const htmlGenerado = generarEscritura(templateHTML, lote, barrio, escribano, fecha, lote.nroEscritura);
    const titulo = `Escritura - Mz ${lote.manzana || "?"} Lote ${lote.lote || "?"} - ${barrio.nombre}`;
    const payload = {
      titulo,
      estado,
      contenido: { lote, barrio, fecha },
      template_key: "escrituraBarrio",
      registro_id: miUsuario?.registro,
      usuario_id: usuario?.id,
      lote_id: lote.id,
      updated_at: new Date().toISOString(),
    };
    if (docId) {
      await supabase.from("documentos").update(payload).eq("id", docId);
    } else {
      const { data } = await supabase.from("documentos")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select("id").single();
      if (data) setDocId(data.id);
    }
    setGuardando(false);
  };

  const htmlGenerado = templateHTML
    ? generarEscritura(templateHTML, lote, barrio, escribano, fecha, lote.nroEscritura)
    : "";

  const handleExportar = () => {
    exportarDocx({
      html: htmlGenerado,
      fuente,
      fontSize,
      docTitle: `Escritura Mz ${lote.manzana || "?"} Lote ${lote.lote || "?"} - ${barrio.nombre}`,
      margenKey: "protocolar",
    });
  };

  const handleCambioLote = (loteActualizado) => {
    setLote(loteActualizado);
    guardarLote(loteActualizado);
  };

  if (cargando) {
    return (
      <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"'Inter', sans-serif", color:"rgba(26,35,50,.5)" }}>
        Cargando documento...
      </div>
    );
  }

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  fontFamily:"'Inter', sans-serif", overflow:"hidden" }}>
      <NavBar
        screenTitle={`Mz ${lote.manzana || "?"} · Lote ${lote.lote || "?"} · ${barrio.nombre}`}
        estado={estado}
        onExport={handleExportar}
        indicadorGuardado={guardando ? "Guardando..." : docId ? "Guardado" : "Sin guardar"}
        onGuardar={guardarDoc}
        onGo={onGo}
        onVolver={onVolver}
      />

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
{/* VISTA DEL DOCUMENTO */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{
            flexShrink:0, background:"#fff", borderBottom:"1px solid rgba(26,35,50,.1)",
            padding:"0 16px", height:40, display:"flex", alignItems:"center", gap:6,
          }}>
            <button onClick={() => setZoomIdx(Math.max(0, zoomIdx-1))}
              style={{ padding:"2px 10px", borderRadius:6, border:"1px solid rgba(26,35,50,.14)",
                       background:"transparent", cursor:"pointer", fontSize:13, color:C.dark }}>−</button>
            <span style={{ fontSize:13, fontWeight:500, color:C.dark, minWidth:44, textAlign:"center" }}>
              {Math.round(zoom*100)}%
            </span>
            <button onClick={() => setZoomIdx(Math.min(ZOOM_LEVELS.length-1, zoomIdx+1))}
              style={{ padding:"2px 10px", borderRadius:6, border:"1px solid rgba(26,35,50,.14)",
                       background:"transparent", cursor:"pointer", fontSize:13, color:C.dark }}>+</button>
            <div style={{ width:1, height:18, background:"rgba(26,35,50,.12)", margin:"0 4px" }}/>
            <button onClick={() => setHojaOn(!hojaOn)} style={{
              padding:"2px 10px", borderRadius:6, fontSize:14, cursor:"pointer",
              border:"1px solid rgba(26,35,50,.14)", fontFamily:"'Inter', sans-serif",
              background: hojaOn ? C.ceruleanLight : "transparent",
              color: hojaOn ? C.cerulean : C.dark,
            }}>Fondo</button>
            <button onClick={() => setShowVars(!showVars)} style={{
              padding:"2px 10px", borderRadius:6, fontSize:14, cursor:"pointer",
              border:"1px solid rgba(26,35,50,.14)", fontFamily:"'Inter', sans-serif",
              background: showVars ? C.ceruleanLight : "transparent",
              color: showVars ? C.cerulean : C.dark,
            }}>Variables</button>
          </div>
          <div style={{ flex:1, background:C.warm, overflowY:"auto", overflowX:"auto",
                        display:"flex", flexDirection:"column", alignItems:"center",
                        padding:"28px 20px", gap:32 }}>
            <VistaDocumento html={htmlGenerado} fuente={fuente} fontSize={fontSize} zoom={zoom} hojaOn={hojaOn} showVars={showVars}/>
          </div>
        </div>

        {/* PANEL LATERAL */}
        <div style={{ width:240, flexShrink:0, background:"#fff",
                      borderLeft:"1px solid rgba(26,35,50,.15)",
                      display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ padding:"12px 14px", borderBottom:"1px solid rgba(26,35,50,.1)",
                        fontSize:14, fontWeight:700, color:C.dark }}>
            Datos del lote
          </div>
          <PanelLote
            lote={lote}
            barrio={barrio}
            escribano={escribano}
            fecha={fecha}
            miembros={miembros}
            onChange={handleCambioLote}
          />
        </div>
      </div>
    </div>
  );
}
