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

function VistaDocumento({ html, fuente, fontSize, zoom, hojaOn }) {
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

function PanelLote({ lote, barrio, escribano, fecha, miembros, onChange, onChangeEscribano, onChangeFecha }) {
  const [partesAbierto, setPartesAbierto] = useState(false);

  const upd = (campo, valor) => onChange({ ...lote, [campo]: valor });

  const sInp = { ...inp, fontSize:12, padding:"6px 9px" };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:10, display:"flex", flexDirection:"column", gap:7 }}>

      {/* ESCRITURA */}
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase",
                    color:"rgba(26,35,50,.4)", marginBottom:2 }}>Escritura</div>
      <Fg label="N° Escritura">
        <input style={sInp} value={lote.nroEscritura || ""} onChange={e => upd("nroEscritura", e.target.value)} placeholder="ej: 29"/>
      </Fg>
      <Fg label="Fecha escritura">
        <InputFecha style={sInp} value={lote.fechaEscritura || ""} onChange={v => upd("fechaEscritura", v)}/>
      </Fg>
      <Fg label="Escribano">
        <select style={sInp} value={lote.escribano || ""} onChange={e => upd("escribano", e.target.value)}>
          {miembros.map(m => {
            const nombre = m.nombre_preferido || `${m.nombre} ${m.apellido}`;
            return <option key={m.id} value={nombre}>{nombre}</option>;
          })}
        </select>
      </Fg>

      {/* FECHA DEL ACTO */}
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase",
                    color:"rgba(26,35,50,.4)", marginTop:6, marginBottom:2 }}>Fecha del acto</div>
      <Fg label="Día">
        <input style={sInp} type="number" min="1" max="31" value={fecha.dia}
          onChange={e => onChangeFecha({ ...fecha, dia: Number(e.target.value) })}/>
      </Fg>
      <Fg label="Mes">
        <select style={sInp} value={fecha.mes} onChange={e => onChangeFecha({ ...fecha, mes: Number(e.target.value) })}>
          {MESES_LABEL.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </Fg>
      <Fg label="Año">
        <input style={sInp} type="number" value={fecha.anio}
          onChange={e => onChangeFecha({ ...fecha, anio: Number(e.target.value) })}/>
      </Fg>

      {/* ADQUIRENTES */}
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase",
                    color:"rgba(26,35,50,.4)", marginTop:6, marginBottom:2 }}>Adquirentes</div>
      {lote.partes?.length > 0 ? (
        <div style={{ border:"1px solid rgba(26,35,50,.1)", borderRadius:7, overflow:"hidden", marginBottom:4 }}>
          {lote.partes.map((p, idx) => (
            <div key={p.id} style={{
              padding:"7px 10px", fontSize:12, color:C.dark,
              borderBottom: idx < lote.partes.length-1 ? "1px solid rgba(26,35,50,.06)" : "none",
            }}>
              <div style={{ fontWeight:600 }}>{p.apellido}{p.nombre ? ", "+p.nombre : ""}</div>
              <div style={{ fontSize:11, color:"rgba(26,35,50,.45)" }}>DNI {p.nroDoc || "-"}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize:12, color:"rgba(26,35,50,.4)", fontStyle:"italic" }}>Sin adquirentes</div>
      )}
      <button onClick={() => setPartesAbierto(true)} style={{
        padding:"5px 10px", borderRadius:6, cursor:"pointer",
        border:"1px dashed rgba(26,35,50,.25)", background:"transparent",
        fontSize:11, fontWeight:600, color:"#1a2332", fontFamily:"'Montserrat',sans-serif",
      }}>
        {lote.partes?.length > 0 ? "Editar adquirentes" : "+ Agregar adquirentes"}
      </button>

      {/* INMUEBLE */}
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase",
                    color:"rgba(26,35,50,.4)", marginTop:6, marginBottom:2 }}>Inmueble</div>
      <Fg label="Manzana">
        <input style={sInp} value={lote.manzana || ""} onChange={e => upd("manzana", e.target.value.toUpperCase())}/>
      </Fg>
      <Fg label="Lote">
        <input style={sInp} value={lote.lote || ""} onChange={e => upd("lote", e.target.value)}/>
      </Fg>
      <Fg label="Sup. mensura">
        <InputDecimal style={sInp} value={lote.supMensura || ""} onChange={v => upd("supMensura", v)}/>
      </Fg>
      <Fg label="Sup. título I">
        <InputDecimal style={sInp} value={lote.supTitulo1 || ""} onChange={v => upd("supTitulo1", v)}/>
      </Fg>

      {/* PRECIO */}
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase",
                    color:"rgba(26,35,50,.4)", marginTop:6, marginBottom:2 }}>Precio</div>
      <Fg label="Precio total">
        <InputDinero style={sInp} value={lote.precio || ""} onChange={v => upd("precio", v)}/>
      </Fg>

      {/* REGISTRACIONES */}
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase",
                    color:"rgba(26,35,50,.4)", marginTop:6, marginBottom:2 }}>Registraciones</div>
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
  const [fecha, setFecha] = useState({ dia: new Date().getDate(), mes: new Date().getMonth(), anio: new Date().getFullYear() });
  const [zoomIdx, setZoomIdx] = useState(4);
  const [hojaOn, setHojaOn] = useState(true);
  const [fuente, setFuente] = useState(FUENTES[0]);
  const [fontSize, setFontSize] = useState(11);
  const zoom = ZOOM_LEVELS[zoomIdx];

  const escribano = miUsuario ? {
    nombre: miUsuario.nombre_preferido || `${miUsuario.nombre} ${miUsuario.apellido}`,
    caracter: miUsuario.rol === "titular" ? "Notario/a Titular" : "Notario/a Adscripto/a",
    registro: miUsuario.registro,
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
                    fontFamily:"'Montserrat',sans-serif", color:"rgba(26,35,50,.5)" }}>
        Cargando documento...
      </div>
    );
  }

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>
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
        <div style={{ flex:1, background:C.warm, overflowY:"auto", overflowX:"auto",
                      display:"flex", flexDirection:"column", alignItems:"center",
                      padding:"28px 20px", gap:32 }}>
          <div style={{ display:"flex", gap:8, marginBottom:4 }}>
            <button onClick={() => setZoomIdx(Math.max(0, zoomIdx-1))}
              style={{ padding:"3px 10px", borderRadius:6, border:"1px solid rgba(26,35,50,.14)",
                       background:"transparent", cursor:"pointer", fontSize:13 }}>−</button>
            <span style={{ fontSize:13, fontWeight:500, color:C.dark, minWidth:48, textAlign:"center",
                           lineHeight:"28px" }}>{Math.round(zoom*100)}%</span>
            <button onClick={() => setZoomIdx(Math.min(ZOOM_LEVELS.length-1, zoomIdx+1))}
              style={{ padding:"3px 10px", borderRadius:6, border:"1px solid rgba(26,35,50,.14)",
                       background:"transparent", cursor:"pointer", fontSize:13 }}>+</button>
            <button onClick={() => setHojaOn(!hojaOn)}
              style={{ padding:"3px 10px", borderRadius:6, fontSize:13, cursor:"pointer",
                       border:"1px solid rgba(26,35,50,.14)",
                       background: hojaOn ? C.ceruleanLight : "transparent",
                       color: hojaOn ? C.cerulean : C.dark, fontFamily:"'Montserrat',sans-serif" }}>
              Fondo
            </button>
          </div>
          <VistaDocumento html={htmlGenerado} fuente={fuente} fontSize={fontSize} zoom={zoom} hojaOn={hojaOn}/>
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
            onChangeFecha={setFecha}
          />
        </div>
      </div>
    </div>
  );
}
