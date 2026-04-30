import { useState, useEffect } from "react";
import { C, PARTE_VACIA } from "../constants";
import { NavBar } from "../components/NavBar";
import { Modal } from "../components/Modal";
import { Btn } from "../components/ui/Btn";
import { Fg } from "../components/ui/FormElements";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";
import { ModalPartes } from "../components/modals/ModalPartes";
import { InputFecha, InputDinero, InputDecimal } from "../components/ui/Masked";
import { ModeloScreen } from "./ModeloScreen";
import { LoteDocScreen } from "./LoteDocScreen";

const LOTE_VACIO = () => ({
  id: crypto.randomUUID(),
  nroEscritura: "", fechaEscritura: "", escribano: "",
  manzana: "", lote: "",
  supMensura: "", supTitulo1: "", supTitulo2: "", supTitulo3: "",
  norte: "", norteM: "", sur: "", surM: "",
  este: "", esteM: "", oeste: "", oesteM: "",
  noreste: "", noresteM: "", noroeste: "", noroesteM: "",
  sureste: "", suresteM: "", suroeste: "", suroesteM: "",
  precio: "", certRegistro: "", fechaRegistro: "",
  certCatastro: "", fechaCatastro: "", nomenclatura: "",
  padronRentas: "", avaluo: "", padronMuni: "",
  partes: [],
});

function estaCompleto(l) {
  return !!(l.manzana && l.lote && l.partes.length > 0 &&
    l.nroEscritura && l.supMensura && l.norte && l.sur && l.este && l.oeste &&
    l.precio && l.nomenclatura && l.padronRentas && l.avaluo && l.padronMuni);
}

function BadgeEstado({ completo }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: completo ? "#e8f5e9" : "#fff3e0",
      color: completo ? "#2e7d32" : "#e65100",
      border: "1px solid " + (completo ? "#a5d6a7" : "#ffcc80"),
      whiteSpace: "nowrap",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%",
                    background: completo ? "#43a047" : "#fb8c00", flexShrink: 0 }}/>
      {completo ? "Completo" : "Incompleto"}
    </div>
  );
}

function ConfirmEliminar({ titulo, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(26,35,50,.45)", zIndex:1000,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:12, padding:"24px 24px 18px",
                    width:340, boxShadow:"0 8px 32px rgba(26,35,50,.18)" }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.dark, marginBottom:8 }}>Eliminar</div>
        <div style={{ fontSize:13, color:"rgba(26,35,50,.6)", marginBottom:20, lineHeight:1.5 }}>
          ¿Confirmás que querés eliminar <strong style={{ color:C.dark }}>{titulo}</strong>? Esta acción no se puede deshacer.
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel}
                  style={{ padding:"7px 16px", borderRadius:7, border:"1px solid rgba(26,35,50,.14)",
                           background:"transparent", fontSize:13, fontWeight:600, color:C.dark,
                           cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>Cancelar</button>
          <button onClick={onConfirm}
                  style={{ padding:"7px 16px", borderRadius:7, border:"1px solid #e07070",
                           background:"#fdf0f0", fontSize:13, fontWeight:700, color:"#c0392b",
                           cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em",
                    textTransform: "uppercase", color: "rgba(3, 8, 16, 0.8)",
                    background: C.ceruleanLight, padding: "5px 10px",
                    marginBottom: 10, paddingBottom: 6,
                    borderBottom: "1px solid rgba(26,35,50,.07)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ModalLote({ lote, onSave, onClose }) {
  const [d, setD] = useState({ ...lote });
  const upd = (f, v) => setD(prev => ({ ...prev, [f]: v }));
  const { miembros } = useAuth();
  const [partesAbierto, setPartesAbierto] = useState(false);

  const inp = {
    width: "100%", padding: "7px 9px", borderRadius: 6,
    border: "1px solid rgba(26,35,50,.14)", background: "#FDFCFA",
    fontSize: 12, color: "#1a2332", fontFamily: "'Montserrat',sans-serif",
    outline: "none", boxSizing: "border-box",
  };

  const LIMITES = [
    ["norte","Norte"],["sur","Sur"],["este","Este"],["oeste","Oeste"],
    ["noreste","Noreste"],["noroeste","Noroeste"],["sureste","Sureste"],["suroeste","Suroeste"],
  ];

  return (
    <>
      <Modal
        title={"Lote " + (d.manzana || "?") + " - " + (d.lote || "?")}
        onClose={onClose}
        footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn primary onClick={() => { console.log("guardando lote:", d); onSave(d); onClose(); }}>Guardar</Btn></>}
      >
        <div style={{ maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
<Section title="Escritura">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <Fg label="N° Escritura"><input style={inp} value={d.nroEscritura} onChange={e => upd("nroEscritura", e.target.value)} placeholder="ej: 29"/></Fg>
              <Fg label="Fecha escritura"><InputFecha style={inp} value={d.fechaEscritura} onChange={v => upd("fechaEscritura", v)}/></Fg>
              <Fg label="Escribano">
                <select style={inp} value={d.escribano || (miembros[0] ? (miembros[0].nombre_preferido || `${miembros[0].nombre} ${miembros[0].apellido}`) : "")} onChange={e => upd("escribano", e.target.value)}>
                  {miembros.map(m => {
                    const nombre = m.nombre_preferido || `${m.nombre} ${m.apellido}`;
                    return <option key={m.id} value={nombre}>{nombre}</option>;
                  })}
                </select>
              </Fg>
            </div>
          </Section>

          <Section title="Inmueble">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Fg label="Manzana"><input style={inp} value={d.manzana} onChange={e => upd("manzana", e.target.value.toUpperCase())} placeholder="ej: U"/></Fg>
              <Fg label="Lote"><input style={inp} value={d.lote} onChange={e => upd("lote", e.target.value)} placeholder="ej: 25"/></Fg>
            </div>
          </Section>

          <Section title="Adquirentes">
            <div style={{ marginBottom: 8 }}>
              {d.partes.length > 0 ? (
                <div style={{ border: "1px solid rgba(26,35,50,.1)", borderRadius: 7, overflow: "hidden", marginBottom: 8 }}>
                  {d.partes.map((p, idx) => (
                    <div key={p.id} style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr 80px",
                      padding: "8px 12px", fontSize: 12, color: C.dark,
                      borderBottom: idx < d.partes.length - 1 ? "1px solid rgba(26,35,50,.06)" : "none",
                      background: "transparent",
                    }}>
                      <div style={{ fontWeight: 600 }}>{p.apellido || "?"}{p.nombre ? ", " + p.nombre : ""}</div>
                      <div style={{ color: "rgba(26,35,50,.5)" }}>DNI {p.nroDoc || "-"}</div>
                      <div style={{ color: C.cerulean, fontWeight: 600, fontSize: 11 }}>{p.rol || ""}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "rgba(26,35,50,.4)", fontStyle: "italic", marginBottom: 8 }}>
                  Sin adquirentes cargados
                </div>
              )}
              <button onClick={() => setPartesAbierto(true)} style={{
                padding: "5px 14px", borderRadius: 6, cursor: "pointer",
                border: "1px dashed rgba(26,35,50,.25)", background: "transparent",
                fontSize: 12, fontWeight: 600, color: "#1a2332",
                fontFamily: "'Montserrat',sans-serif",
              }}>
                {d.partes.length === 0 ? "+ Agregar adquirentes" : "Editar adquirentes"}
              </button>
            </div>
          </Section>

<Section title="Superficie">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              <Fg label="Mensura"><InputDecimal style={inp} value={d.supMensura} onChange={v => upd("supMensura", v)} placeholder="210,49"/></Fg>
              <Fg label="Titulo I"><InputDecimal style={inp} value={d.supTitulo1} onChange={v => upd("supTitulo1", v)} placeholder="210,49"/></Fg>
              <Fg label="Titulo II"><InputDecimal style={inp} value={d.supTitulo2} onChange={v => upd("supTitulo2", v)} placeholder="opcional"/></Fg>
              <Fg label="Titulo III"><InputDecimal style={inp} value={d.supTitulo3} onChange={v => upd("supTitulo3", v)} placeholder="opcional"/></Fg>
            </div>
          </Section>

<Section title="Limites">
            {LIMITES.map(([k, label]) => (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "90px 1fr 100px", gap: 8, marginBottom: 8, alignItems: "end" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a2332", paddingBottom: 8 }}>{label}</div>
                <Fg label="Colindante"><input style={inp} value={d[k]} onChange={e => upd(k, e.target.value)} placeholder="ej: Lote N° 24"/></Fg>
                <Fg label="Metros"><InputDecimal style={inp} value={d[k + "M"]} onChange={v => upd(k + "M", v)} placeholder="21,14"/></Fg>
              </div>
            ))}
          </Section>

          <Section title="Precio">
            <Fg label="Precio total"><InputDinero style={inp} value={d.precio} onChange={v => upd("precio", v)}/></Fg>
          </Section>

          <Section title="Registro Publico">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Fg label="N° Certificado"><input style={inp} value={d.certRegistro} onChange={e => upd("certRegistro", e.target.value)} placeholder="ej: 3018489"/></Fg>
              <Fg label="Fecha"><InputFecha style={inp} value={d.fechaRegistro} onChange={v => upd("fechaRegistro", v)}/></Fg>
            </div>
          </Section>

          <Section title="Catastro">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <Fg label="N° Certificado"><input style={inp} value={d.certCatastro} onChange={e => upd("certCatastro", e.target.value)} placeholder="ej: 2025000032590"/></Fg>
              <Fg label="Fecha"><InputFecha style={inp} value={d.fechaCatastro} onChange={v => upd("fechaCatastro", v)}/></Fg>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <Fg label="Nomenclatura catastral"><input style={inp} value={d.nomenclatura} onChange={e => upd("nomenclatura", e.target.value)} placeholder="03-03-03-..."/></Fg>
              <Fg label="Padron Rentas"><input style={inp} value={d.padronRentas} onChange={e => upd("padronRentas", e.target.value)} placeholder="03-76386-9"/></Fg>
              <Fg label="Avaluo fiscal"><InputDinero style={inp} value={d.avaluo} onChange={v => upd("avaluo", v)}/></Fg>
            </div>
          </Section>

          <Section title="Municipalidad">
            <Fg label="Padron municipal"><input style={inp} value={d.padronMuni} onChange={e => upd("padronMuni", e.target.value)} placeholder="ej: 67201"/></Fg>
          </Section>
        </div>
      </Modal>

      {partesAbierto && (
        <ModalPartes
          partes={d.partes.length > 0 ? d.partes : [PARTE_VACIA()]}
          onApply={partes => upd("partes", partes)}
          onClose={() => setPartesAbierto(false)}
          showRol={true}
        />
      )}
    </>
  );
}

function DetalleBarrio({ barrio, onUpd, onUpdLote, onAgregarLote, onEliminarLote, onVolver, onModelo, onVerDoc, onGo }) {
  const [editandoLote, setEditandoLote] = useState(null);
  const [confirmLote, setConfirmLote] = useState(null);
  const [verModelo, setVerModelo] = useState(false);
  const loteEditar = editandoLote ? barrio.lotes.find(l => l.id === editandoLote) : null;
  const completosCount = barrio.lotes.filter(estaCompleto).length;
  const inp = { width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid rgba(26,35,50,.14)", background: "#fff", fontSize: 12, color: "#1a2332", fontFamily: "'Montserrat',sans-serif", outline: "none", boxSizing: "border-box" };
  const [verDocLote, setVerDocLote] = useState(null);
    useEffect(() => {
      if (verDocLote) { onVerDoc(verDocLote); setVerDocLote(null); }
    }, [verDocLote]);
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Montserrat',sans-serif", overflow: "hidden", background: C.warm }}>
      <NavBar onGo={onGo} screenTitle={barrio.nombre} onVolver={onVolver} onExport={() => alert("Exportar barrio - próximamente")} onModelo={onModelo} />

      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid rgba(26,35,50,.08)", padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#1a2332", marginBottom: 12 }}>Datos del transmitente</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10 }}>
            {[["Transmitente","transmitente","Cooperativa / union vecinal"],["CUIT","cuit","ej: 33-54516418-9"],["Matricula SIRC","matricula","ej: 700062588"],["Plano de mensura","plano","ej: 03-51952"]].map(([label, campo, ph]) => (
              <Fg key={campo} label={label}><input style={inp} value={barrio[campo] || ""} onChange={e => onUpd(barrio.id, campo, e.target.value)} placeholder={ph}/></Fg>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid rgba(26,35,50,.08)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(26,35,50,.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2332" }}>
              Lotes <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(26,35,50,.4)" }}>{completosCount}/{barrio.lotes.length} completos</span>
            </span>
            <button onClick={() => onAgregarLote(barrio.id)} style={{ padding: "5px 14px", borderRadius: 6, border: "1px dashed rgba(26,35,50,.25)", background: "transparent", fontSize: 12, fontWeight: 600, color: "#1a2332", fontFamily: "'Montserrat',sans-serif", cursor: "pointer" }}>+ Agregar lote</button>
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ background: "#faf8f4" }}>
                {["#","Estado","Manzana","Lote","Adquirentes","N° Escritura","Escribano",""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "#1a2332", borderBottom: "2px solid rgba(26,35,50,.08)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barrio.lotes.map((l, idx) => {
                const completo = estaCompleto(l);
                const partesLabel = l.partes.length === 0 ? "Sin partes" : l.partes.map(p => p.apellido || "?").join(" + ");
                return (
                  <tr key={l.id} onMouseEnter={e => e.currentTarget.style.background = "rgba(26,35,50,.018)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(26,35,50,.05)", fontSize: 12, color: "#1a2332", fontWeight: 600, textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(26,35,50,.05)" }}><BadgeEstado completo={completo} /></td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(26,35,50,.05)", fontSize: 13, fontWeight: 700, color: "#1a2332" }}>{l.manzana || "-"}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(26,35,50,.05)", fontSize: 13, fontWeight: 700, color: "#1a2332" }}>{l.lote || "-"}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(26,35,50,.05)", fontSize: 12, color: l.partes.length > 0 ? "#1a2332" : "rgba(26,35,50,.4)", fontStyle: l.partes.length === 0 ? "italic" : "normal" }}>{partesLabel}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(26,35,50,.05)", fontSize: 12, color: "#1a2332" }}>{l.nroEscritura ? "Esc. " + l.nroEscritura : "-"}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(26,35,50,.05)", fontSize: 12, color: "#1a2332" }}>{l.escribano || "-"}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(26,35,50,.05)" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => setEditandoLote(l.id)} style={{ padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid " + C.cerulean, background: C.ceruleanLight, fontSize: 11, fontWeight: 600, color: "#1f4862", fontFamily: "'Montserrat',sans-serif", display:"flex", alignItems:"center", gap:5 }}>
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M11 2l3 3-9 9H2v-3L11 2z" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Editar datos
                        </button>
                        <button onClick={() => onVerDoc(l)} style={{ padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(26,35,50,.2)", background: "transparent", fontSize: 11, fontWeight: 600, color: "#1a2332", fontFamily: "'Montserrat',sans-serif", display:"flex", alignItems:"center", gap:5 }}>
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <rect x="2" y="1" width="12" height="14" rx="2"/>
                            <path d="M5 6h6M5 9h6M5 12h4" strokeLinecap="round"/>
                          </svg>
                          Ver documento
                        </button>
                        <button onClick={() => setConfirmLote(l)}
                          style={{ padding: "4px 8px", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(26,35,50,.15)", background: "transparent", fontSize: 13, color: "#1a2332", fontFamily: "'Montserrat',sans-serif" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#c0392b"; e.currentTarget.style.borderColor = "#c0392b"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#1a2332"; e.currentTarget.style.borderColor = "rgba(26,35,50,.15)"; }}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M3 5h10M6 5V3h4v2M6 8v5M10 8v5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editandoLote && loteEditar && (
        <ModalLote lote={loteEditar} onSave={data => onUpdLote(barrio.id, data.id, data)} onClose={() => setEditandoLote(null)} />
      )}
      {confirmLote && (
        <ConfirmEliminar
          titulo={"Lote " + (confirmLote.manzana || "?") + " - " + (confirmLote.lote || "?")}
          onConfirm={() => { onEliminarLote(barrio.id, confirmLote.id); setConfirmLote(null); }}
          onCancel={() => setConfirmLote(null)}
        />
      )}
    </div>
  );
}

function FilaBarrio({ b, idx, total, onSeleccionar, onConfirmEliminar }) {
  const [hover, setHover] = useState(false);
  const completosCount = b.lotes.filter(estaCompleto).length;
  const pct = b.lotes.length > 0 ? Math.round((completosCount / b.lotes.length) * 100) : 0;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display:"grid", gridTemplateColumns:"2fr 80px 80px 100px 32px",
               padding:"12px 16px", alignItems:"center",
               borderBottom: idx < total - 1 ? "1px solid rgba(26,35,50,.05)" : "none",
               background: hover ? "rgba(26,35,50,.02)" : "transparent",
               cursor:"pointer", transition:"background .1s" }}
      onClick={() => onSeleccionar(b.id)}>
      <div>
        <div style={{ fontSize:14, fontWeight:600, color:C.dark }}>{b.nombre || "Sin nombre"}</div>
        {b.transmitente && <div style={{ fontSize:11, color:"rgba(26,35,50,.45)", marginTop:2 }}>{b.transmitente}</div>}
      </div>
      <div style={{ fontSize:13, color:"rgba(26,35,50,.6)" }}>{b.lotes.length}</div>
      <div style={{ fontSize:13, color:"rgba(26,35,50,.6)" }}>{completosCount}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ flex:1, height:5, borderRadius:3, background:"rgba(26,35,50,.08)" }}>
          <div style={{ width:pct+"%", height:"100%", borderRadius:3,
                        background: pct===100 ? "#43a047" : C.cerulean, transition:"width .3s" }}/>
        </div>
        <span style={{ fontSize:11, color:"rgba(26,35,50,.4)", minWidth:28 }}>{pct}%</span>
      </div>
      <div>
        <button onClick={e => { e.stopPropagation(); onConfirmEliminar(b); }}
          style={{ width:26, height:26, borderRadius:5, border:"1px solid transparent",
                   background:"transparent", cursor:"pointer", display:"flex",
                   alignItems:"center", justifyContent:"center",
                   opacity: hover ? 1 : 0, transition:"opacity .1s" }}
          onMouseEnter={e => { e.currentTarget.style.background="#fdf0f0"; e.currentTarget.style.borderColor="#e07070"; }}
          onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#c0392b" strokeWidth="1.6">
            <path d="M3 5h10M6 5V3h4v2M6 8v5M10 8v5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function ListaBarrios({ barrios, onSeleccionar, onAgregar, onEliminar, onGo, cargando }) {
  const [confirmBarrio, setConfirmBarrio] = useState(null);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Montserrat',sans-serif", overflow: "hidden", background: C.warm }}>
      <NavBar onGo={onGo} screenTitle="Carga masiva" />

      <div style={{ flex: 1, overflow: "auto", padding: "24px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, letterSpacing: "-.02em" }}>
              Carga masiva
            </div>
            <button onClick={onAgregar}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px",
                       background: C.cerulean, color: "#fff", border: "none", borderRadius: 8,
                       fontSize: 13, fontWeight: 600, fontFamily: "'Montserrat',sans-serif",
                       cursor: "pointer" }}>
              + Nuevo barrio
            </button>
          </div>

          {cargando ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(26,35,50,.5)", fontSize: 13 }}>Cargando barrios...</div>
          ) : barrios.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏘</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#1a2332", marginBottom: 6 }}>No hay barrios cargados</div>
              <div style={{ fontSize: 13, color: "rgba(26,35,50,.6)", marginBottom: 20 }}>Crea un nuevo barrio para empezar a cargar lotes</div>
              <button onClick={onAgregar} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: C.cerulean, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", cursor: "pointer" }}>+ Nuevo barrio</button>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(26,35,50,.08)", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 100px 32px",
                            padding: "8px 16px", borderBottom: "2px solid rgba(26,35,50,.07)", background: "#faf8f4" }}>
                {["Barrio","Lotes","Completos","Progreso",""].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
                                        textTransform: "uppercase", color: "rgba(26,35,50,.4)" }}>{h}</div>
                ))}
              </div>
              {barrios.map((b, idx) => (
                <FilaBarrio key={b.id} b={b} idx={idx} total={barrios.length} onSeleccionar={onSeleccionar} onConfirmEliminar={setConfirmBarrio}/>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmBarrio && (
        <ConfirmEliminar
          titulo={confirmBarrio.nombre}
          onConfirm={() => { onEliminar(confirmBarrio.id); setConfirmBarrio(null); }}
          onCancel={() => setConfirmBarrio(null)}
        />
      )}
    </div>
  );
}

export function BulkScreen({ onGo }) {
  const { miUsuario } = useAuth();
  const [barrios, setBarrios] = useState([]);
  const [vista, setVista] = useState({ tipo: "lista" });
  const [modalNombre, setModalNombre] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [cargando, setCargando] = useState(true);

  const registroNumero = miUsuario?.registro;

  useEffect(() => {
    if (!registroNumero) return;
    async function cargar() {
      setCargando(true);
      const { data: barriosData } = await supabase
        .from("barrios").select("*").eq("registro_id", registroNumero)
        .order("created_at", { ascending: false });
      if (!barriosData) { setCargando(false); return; }
      const barriosConLotes = await Promise.all(barriosData.map(async b => {
        const { data: lotesData } = await supabase
          .from("lotes").select("*").eq("barrio_id", b.id).order("created_at", { ascending: true });
        const lotes = (lotesData || []).map(l => ({ ...l.datos_json, id: l.id }));
        return { ...b, lotes };
      }));
      setBarrios(barriosConLotes);
      setCargando(false);
    }
    cargar();
  }, [registroNumero]);

  const updBarrio = async (bid, campo, valor) => {
    setBarrios(prev => prev.map(b => b.id === bid ? { ...b, [campo]: valor } : b));
    await supabase.from("barrios").update({ [campo]: valor }).eq("id", bid);
  };

  const confirmarNuevoBarrio = async () => {
    if (!nombreNuevo.trim()) return;
    const { data } = await supabase.from("barrios")
      .insert({ nombre: nombreNuevo.trim(), registro_id: registroNumero, created_at: new Date().toISOString() })
      .select().single();
    if (data) { setBarrios(prev => [{ ...data, lotes: [] }, ...prev]); setBarrioActualId(data.id); }
    setModalNombre(false); setNombreNuevo("");
  };

  const eliminarBarrio = async (bid) => {
    await supabase.from("lotes").delete().eq("barrio_id", bid);
    await supabase.from("barrios").delete().eq("id", bid);
    setBarrios(prev => prev.filter(b => b.id !== bid));
    if (vista.barrioId === bid) setVista({ tipo: "lista" });
  };

  const updLote = async (bid, lid, data) => {
    setBarrios(prev => prev.map(b => b.id === bid ? { ...b, lotes: b.lotes.map(l => l.id === lid ? data : l) } : b));
    await supabase.from("lotes").update({ datos_json: data }).eq("id", lid);
  };

  const agregarLote = async (bid) => {
    const loteLocal = LOTE_VACIO();
    const { data } = await supabase.from("lotes")
      .insert({ barrio_id: bid, datos_json: loteLocal, created_at: new Date().toISOString() })
      .select().single();
    if (data) {
      setBarrios(prev => prev.map(b => b.id === bid ? { ...b, lotes: [...b.lotes, { ...loteLocal, id: data.id }] } : b));
    }
  };

  const eliminarLote = async (bid, lid) => {
    await supabase.from("lotes").delete().eq("id", lid);
    setBarrios(prev => prev.map(b => b.id === bid ? { ...b, lotes: b.lotes.filter(l => l.id !== lid) } : b));
  };

  const barrioActual = barrios.find(b => b.id === vista.barrioId) || null;

  if (vista.tipo === "detalle" && barrioActual) {
    return <DetalleBarrio barrio={barrioActual} onUpd={updBarrio} onUpdLote={updLote}
      onAgregarLote={agregarLote} onEliminarLote={eliminarLote}
      onVolver={() => setVista({ tipo: "lista" })}
      onModelo={() => setVista({ tipo: "modelo", barrioId: barrioActual.id })}
      onVerDoc={lote => setVista({ tipo: "lote", barrioId: barrioActual.id, lote })}
      onGo={onGo} />;
  }
  
  if (vista.tipo === "lote" && barrioActual && vista.lote) {
    return <LoteDocScreen
      lote={vista.lote}
      barrio={barrioActual}
      onVolver={() => setVista({ tipo: "detalle", barrioId: barrioActual.id })}
      onGo={onGo}
    />;
  }


  if (vista.tipo === "modelo" && barrioActual) {
    return <ModeloScreen barrio={barrioActual} onVolver={() => setVista({ tipo: "detalle", barrioId: barrioActual.id })} onGo={onGo} />;
  }
  if (vista.tipo === "modelo" && barrioActual) {
    return <ModeloScreen barrio={barrioActual} onVolver={() => setVista({ tipo: "detalle", barrioId: barrioActual.id })} onGo={onGo} />;
  }
  return (
    <>
     <ListaBarrios barrios={barrios} onSeleccionar={id => setVista({ tipo: "detalle", barrioId: id })}
        onAgregar={() => setModalNombre(true)} onEliminar={eliminarBarrio}
        onGo={onGo} cargando={cargando} />
      {modalNombre && (
        <Modal title="Nuevo barrio" onClose={() => { setModalNombre(false); setNombreNuevo(""); }}
          footer={<><Btn onClick={() => { setModalNombre(false); setNombreNuevo(""); }}>Cancelar</Btn><Btn primary onClick={confirmarNuevoBarrio}>Crear</Btn></>}>
          <Fg label="Nombre del barrio o loteo">
            <input autoFocus value={nombreNuevo} onChange={e => setNombreNuevo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && confirmarNuevoBarrio()}
              placeholder="ej: Barrio Portal del Algarrobal"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid rgba(26,35,50,.14)", background: "#FDFCFA", fontSize: 14, color: "#1a2332", fontFamily: "'Montserrat',sans-serif", outline: "none", boxSizing: "border-box" }}/>
          </Fg>
        </Modal>
      )}
    </>
  );
}
