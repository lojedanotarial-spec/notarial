import { useState, useRef, useEffect } from "react";

// ── PALETA ────────────────────────────────────────────────
const C = {
  dark: "#1a2332", porcelain: "#FDFCFA", warm: "#f0ece3",
  cerulean: "#3a7ca5", ceruleanLight: "#e8f2f8", ceruleanMid: "#bdd9ec",
  gold: "#c9a961", fawn50: "#faf5e9",
  border: "rgba(26,35,50,.14)", borderStrong: "rgba(26,35,50,.22)",
  muted: "rgba(26,35,50,.45)", faint: "rgba(26,35,50,.3)",
};

// ── A4 / MÁRGENES ─────────────────────────────────────────
const A4W = 794;
const A4H = 1123;
const mm  = (v) => (v / 210) * A4W;

const PROT   = { left:mm(34), top:mm(70),  right:mm(12), bottom:mm(16.5) };
const NOPROT = { left:mm(30), top:mm(35),  right:mm(20), bottom:mm(20)   };
const LINE_COUNT = 24;

// ── CONSTANTES UI ─────────────────────────────────────────
const ZOOM_LEVELS = [0.5, 0.65, 0.75, 0.85, 1, 1.25, 1.5];
const FUENTES = [
  { key:"sitka",      label:"Sitka",           family:"'Sitka Text','Sitka',Georgia,serif" },
  { key:"georgia",    label:"Georgia",          family:"Georgia,serif" },
  { key:"times",      label:"Times New Roman",  family:"'Times New Roman',serif" },
  { key:"montserrat", label:"Montserrat",       family:"'Montserrat',sans-serif" },
];
const DEPARTAMENTOS = [
  "Ciudad","Godoy Cruz","Guaymallén","Las Heras","Lavalle","Luján de Cuyo",
  "Maipú","San Martín","Junín","Rivadavia","Santa Rosa","La Paz",
  "Tunuyán","Tupungato","San Carlos","San Rafael","General Alvear","Malargüe",
];
const MESES_LABEL = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
                     "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const MESES_ORD = [
  "primero","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez",
  "once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho",
  "diecinueve","veinte","veintiuno","veintidós","veintitrés","veinticuatro",
  "veinticinco","veintiséis","veintisiete","veintiocho","veintinueve","treinta","treinta y uno",
];
const ANIOS_LETRAS = {
  2024:"DOS MIL VEINTICUATRO", 2025:"DOS MIL VEINTICINCO",
  2026:"DOS MIL VEINTISÉIS",   2027:"DOS MIL VEINTISIETE",
  2028:"DOS MIL VEINTIOCHO",   2029:"DOS MIL VEINTINUEVE",
  2030:"DOS MIL TREINTA",
};
const FRECUENTES = ["Certificación de firma","Certificación de firma — Formulario 08",
                    "Poder especial","Acta de constatación","Autorización de viaje"];
const INSTRUMENTOS = {
  cert:      ["Certificación de firma","Certificación de firma — Formulario 08","Certificación de copia","Fe de vida"],
  acta:      ["Acta de constatación","Acta de notificación","Acta de manifestación"],
  escritura: ["Compraventa","Poder especial","Poder general","Donación","Hipoteca"],
  traslado:  ["Primer testimonio","Testimonios posteriores","Copia simple"],
};
const BADGE = {
  borrador: { bg:"rgba(26,35,50,.06)", color:"rgba(26,35,50,.55)", border:"1px solid rgba(26,35,50,.12)" },
  revision: { bg:C.ceruleanLight,     color:"#1f4862",             border:`1px solid ${C.ceruleanMid}` },
  completo: { bg:"#f5edcc",           color:"#4e3d21",             border:"1px solid rgba(201,169,97,.35)" },
};
const ELABELS = { borrador:"Borrador", revision:"En revisión", completo:"Completo" };

// ── ESTADO INICIAL ────────────────────────────────────────
const PARTE_VACIA = () => ({
  id: Date.now() + Math.random(),
  genero: "F",
  apellido: "", nombre: "", nacionalidad: "argentina",
  tipoDoc: "DNI", nroDoc: "", cuit: "", fechaNac: "",
  estadoCivil: "soltera",
  calle: "", numero: "", piso: "", dpto: "", localidad: "",
  departamento: "Ciudad", rol: "",
});

const ESCRIBANO_INI = {
  nombre: "FÁTIMA A. TAHA", caracter: "Notaria Adscripta",
  registro: "853", circunscripcion: "primera",
};
const FECHA_HOY = () => {
  const h = new Date();
  return { dia:h.getDate(), mes:h.getMonth(), anio:h.getFullYear(), ciudad:"Ciudad" };
};
const PROTOCOLO_INI  = { libro:"Libro de Requerimientos para Certificaciones de Firmas", nroLibro:"IV", nroActa:"" };
const INSTRUMENTO_INI = { descripcion:"", serie:"", nroActuacion:"", fojas:"", esF08:false };

// ── UTILS ─────────────────────────────────────────────────
function useClickOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}
const diaLetras  = (n) => (MESES_ORD[n-1] || String(n)).toUpperCase();
const anioLetras = (n) => ANIOS_LETRAS[n] || String(n);
const gen        = (p, f, m) => p.genero === "F" ? f : m;

// ── ESTILOS BASE ──────────────────────────────────────────
const inp = {
  padding:"8px 11px", border:`1px solid ${C.border}`, borderRadius:7,
  fontSize:13, background:C.porcelain, color:C.dark,
  fontFamily:"'Montserrat',sans-serif", width:"100%", boxSizing:"border-box",
};

// ── HOJA PROTOCOLAR ───────────────────────────────────────
function HojaProtocolarSVG({ margen }) {
  const boxL  = margen.left;
  const boxT  = margen.top;
  const boxR  = A4W - margen.right;
  const boxB  = A4H - margen.bottom;
  const lineH = (boxB - boxT) / LINE_COUNT;
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:1 }}>
      <img src="/MARCO_IMPRESION_FRENTE.svg" alt=""
           style={{ position:"absolute", inset:0, width:A4W, height:A4H, display:"block" }}/>
      <svg width={A4W} height={A4H} viewBox={`0 0 ${A4W} ${A4H}`}
           xmlns="http://www.w3.org/2000/svg" style={{ position:"absolute", inset:0 }}>
        <line x1={boxL-22} y1={boxT} x2={boxL-22} y2={boxB}
              stroke="rgba(90,90,90,0.08)" strokeWidth="0.4"/>
        {Array.from({length:LINE_COUNT},(_,i)=>{
          const y = boxT + (i+1)*lineH;
          return (
            <g key={i}>
              <line x1={boxL} y1={y} x2={boxR} y2={y} stroke="rgba(90,90,90,0.13)" strokeWidth="0.4"/>
              <text fontFamily="'Courier New',monospace" fontSize="9"
                    fill="rgba(90,90,90,0.30)" x={boxL-5} y={y-3} textAnchor="end">{i+1}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── COMPONENTES UI ────────────────────────────────────────
function NavBar({ docTitle, estado, onStatus, onExport }) {
  return (
    <nav style={{ background:C.dark, height:50, display:"flex", alignItems:"center",
                  padding:"0 24px", flexShrink:0, gap:12, zIndex:10 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5C7 1.5 9 4 12 4C12 8 9.5 11 7 12.5C4.5 11 2 8 2 4C5 4 7 1.5 7 1.5Z"
              stroke="#FDFCFA" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
      <div style={{ width:1, height:16, background:"rgba(253,252,250,.2)" }}/>
      <span style={{ color:"#FDFCFA", fontSize:13, fontWeight:700 }}>Notarial</span>
      {docTitle && (
        <span style={{ color:"rgba(253,252,250,.5)", fontSize:13,
                       overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          / {docTitle}
        </span>
      )}
      <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        {docTitle && (<>
          <button onClick={onStatus} style={{
            border:"1px solid rgba(255,255,255,.2)", borderRadius:20,
            background:"rgba(255,255,255,.07)", color:"rgba(255,255,255,.75)",
            fontSize:13, fontWeight:500, padding:"3px 12px", fontFamily:"'Montserrat',sans-serif",
            cursor:"pointer",
          }}>{ELABELS[estado]}</button>
          <button onClick={onExport} style={{
            border:"1px solid rgba(255,255,255,.2)", borderRadius:7,
            background:"transparent", color:"rgba(255,255,255,.8)",
            fontSize:13, fontWeight:500, padding:"5px 12px", fontFamily:"'Montserrat',sans-serif",
            cursor:"pointer",
          }}>Exportar</button>
        </>)}
        <div style={{ width:28, height:28, borderRadius:"50%", background:C.gold,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:10, fontWeight:700, color:"#FDFCFA" }}>FT</div>
      </div>
    </nav>
  );
}

function TbBtn({ children, active, onClick, title }) {
  const [h, setH] = useState(false);
  const on = active || h;
  return (
    <button title={title} onClick={onClick}
            onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
            style={{ padding:"5px 10px", border:`1px solid ${on?C.cerulean:C.borderStrong}`,
                     borderRadius:6, background:on?C.ceruleanLight:"transparent",
                     color:on?"#1f4862":C.dark, fontSize:13, fontWeight:500,
                     fontFamily:"'Montserrat',sans-serif", display:"flex",
                     alignItems:"center", gap:4, whiteSpace:"nowrap", transition:"all .12s",
                     cursor:"pointer" }}>
      {children}
    </button>
  );
}
const TbSep = () => (
  <div style={{ width:1, height:18, background:"rgba(26,35,50,.18)", margin:"0 4px", flexShrink:0 }}/>
);
function Dropdown({ open, children }) {
  if (!open) return null;
  return (
    <div style={{ position:"absolute", top:"calc(100% + 5px)", left:0, background:"#fff",
                  border:`1px solid ${C.border}`, borderRadius:9, minWidth:220, zIndex:200,
                  overflow:"hidden", boxShadow:"0 4px 20px rgba(26,35,50,.1)" }}>
      {children}
    </div>
  );
}
function DdSection({ label, children }) {
  return (
    <div style={{ padding:"4px 0", borderBottom:`1px solid rgba(26,35,50,.07)` }}>
      {label && <div style={{ padding:"6px 13px 3px", fontSize:9, fontWeight:600,
                               letterSpacing:".08em", textTransform:"uppercase",
                               color:C.faint, fontFamily:"'Montserrat',sans-serif" }}>{label}</div>}
      {children}
    </div>
  );
}
function DdItem({ children, active, onClick, meta }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
         style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"8px 13px", fontSize:13, fontWeight:active?600:400, cursor:"pointer",
                  color:C.dark, background:h?"rgba(26,35,50,.04)":"transparent",
                  fontFamily:"'Montserrat',sans-serif", gap:8 }}>
      <span>{children}</span>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {meta && <span style={{ fontSize:10, color:C.faint, fontFamily:"monospace" }}>{meta}</span>}
        {active && <svg width="13" height="13" viewBox="0 0 12 12" fill="none"
                        stroke={C.cerulean} strokeWidth="2">
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
    </div>
  );
}

// Variable resaltada

function Var({ children, empty, show, label }) {
  if (!show) return <span style={{ color:C.dark }}>{children || ""}</span>;
  const isEmpty = empty || children === "" || children == null;
  return (
    <span style={{ background:isEmpty?"#fdeaea":C.fawn50,
                   borderBottom:isEmpty?"1.5px dashed rgba(180,40,40,.55)":`1.5px dashed ${C.gold}`,
                   color:isEmpty?"#7a1a1a":"#4e3d21", borderRadius:2, padding:"0 2px" }}>
      {isEmpty ? `⚠ ${label || "pendiente"}` : children}
    </span>
  );
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div onClick={(e)=>e.target===e.currentTarget&&onClose()}
         style={{ position:"fixed", inset:0, background:"rgba(26,35,50,.35)", zIndex:300,
                  display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:20 }}>
      <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${C.border}`,
                    width:680, maxWidth:"94vw", maxHeight:"92vh", display:"flex",
                    flexDirection:"column", boxShadow:"0 8px 32px rgba(26,35,50,.12)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"14px 18px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <span style={{ fontSize:14, fontWeight:600, color:C.dark }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20,
                                             color:C.muted, cursor:"pointer" }}>×</button>
        </div>
        <div style={{ padding:18, overflowY:"auto", flex: 1, display:"flex", flexDirection:"column", gap:12 }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding:"12px 18px", borderTop:`1px solid ${C.border}`,
                        display:"flex", justifyContent:"flex-end", gap:8, flexShrink:0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
function Btn({ children, primary, danger, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
            style={{ padding:"8px 18px", borderRadius:7, fontSize:13, fontWeight:500,
                     fontFamily:"'Montserrat',sans-serif", cursor:"pointer",
                     background:primary?(h?"#2e3f52":C.dark):danger?"transparent":(h?"#f5f2eb":C.porcelain),
                     color:primary?"#FDFCFA":danger?"rgba(160,30,30,.9)":C.dark,
                     border:primary?"none":danger?"1px solid rgba(160,30,30,.25)":`1px solid rgba(26,35,50,.2)` }}>
      {children}
    </button>
  );
}
function Fg({ label, children, full }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, gridColumn:full?"1/-1":undefined }}>
      <label style={{ fontSize:11, fontWeight:500, color:C.muted, fontFamily:"'Montserrat',sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
function Warn({ children }) {
  return (
    <div style={{ display:"flex", gap:8, padding:"10px 12px", background:C.fawn50,
                  borderRadius:7, border:"1px solid rgba(201,169,97,.3)",
                  fontSize:13, color:"#4e3d21", fontFamily:"'Montserrat',sans-serif" }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink:0, marginTop:1 }}>
        <path d="M6.5 1.5L12 11H1L6.5 1.5z" stroke="#a6864a" strokeWidth="1.3" fill="none"/>
        <path d="M6.5 5v2.5" stroke="#a6864a" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="6.5" cy="9.2" r=".7" fill="#a6864a"/>
      </svg>
      {children}
    </div>
  );
}

// ---MODAL PARTES -------------------------------------------

function ModalPartes({ partes, onApply, onClose }) {
  const [draft,  setDraft]  = useState(partes.map(p=>({...p})));
  const [openId, setOpenId] = useState(draft[0]?.id ?? null);

  const upd = (id, field, val) =>
    setDraft(d => d.map(p => p.id===id ? {...p,[field]:val} : p));
  const agregar = () => {
    const nueva = PARTE_VACIA();
    setDraft(d => [...d, nueva]);
    setOpenId(nueva.id);
  };
  const quitar = (id) => {
    setDraft(d => d.filter(p => p.id!==id));
    setOpenId(draft.find(p=>p.id!==id)?.id ?? null);
  };

  const EC_F = ["soltera","casada","divorciada","viuda","separada de hecho"];
  const EC_M = ["soltero","casado","divorciado","viudo","separado de hecho"];
  const p = draft.find(x => x.id === openId);

  return (
    <Modal title="Partes comparecientes" onClose={onClose}
           footer={<>
             <Btn onClick={onClose}>Cancelar</Btn>
             <Btn primary onClick={()=>{ onApply(draft); onClose(); }}>Aplicar al documento</Btn>
           </>}>

      {/* Layout dos columnas */}
      <div style={{ display:"flex", gap:12, minHeight:420 }}>

        {/* Columna izquierda — lista */}
        <div style={{ width:180, flexShrink:0, display:"flex", flexDirection:"column", gap:8 }}>
          {draft.map((x, idx) => {
            const inicial = `${x.apellido?.[0]??"?"}${x.nombre?.[0]??""}`.toUpperCase();
            const activo  = openId === x.id;
            return (
              <div key={x.id} onClick={()=>setOpenId(x.id)}
                   style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
                            borderRadius:8, cursor:"pointer",
                            background: activo ? C.ceruleanLight : C.porcelain,
                            border: `1px solid ${activo ? C.cerulean : "rgba(26,35,50,.1)"}` }}>
                <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
                              background: activo ? C.cerulean : C.ceruleanLight,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:10, fontWeight:700,
                              color: activo ? "#fff" : "#1f4862" }}>{inicial}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.dark,
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {x.apellido || `Parte ${idx+1}`}
                  </div>
                  <div style={{ fontSize:10, color:C.muted }}>{x.rol || "sin rol"}</div>
                </div>
              </div>
            );
          })}
          <button onClick={agregar}
                  style={{ padding:"7px 10px", border:"1px dashed rgba(26,35,50,.2)", borderRadius:8,
                           fontSize:13, color:C.muted, background:"transparent",
                           fontFamily:"'Montserrat',sans-serif", cursor:"pointer", textAlign:"center" }}>
            + Agregar
          </button>
        </div>

        {/* Columna derecha — formulario con scroll */}
        <div style={{ flex:1, overflowY:"auto", paddingRight:4 }}>
          {p ? (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Fg label="Apellido">
                  <input style={inp} value={p.apellido}
                         onChange={e=>upd(p.id,"apellido",e.target.value.toUpperCase())}
                         placeholder="ingrese apellido/s"/>
                </Fg>
                <Fg label="Nombre/s">
                  <input style={inp} value={p.nombre}
                         onChange={e=>upd(p.id,"nombre",e.target.value.toUpperCase())}
                         placeholder="ingrese nombre/s"/>
                </Fg>
                <Fg label="Género">
                  <select style={inp} value={p.genero} onChange={e=>upd(p.id,"genero",e.target.value)}>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                  </select>
                </Fg>
                <Fg label="Estado civil">
                  <select style={inp} value={p.estadoCivil} onChange={e=>upd(p.id,"estadoCivil",e.target.value)}>
                    {(p.genero==="F"?EC_F:EC_M).map(ec=><option key={ec}>{ec}</option>)}
                  </select>
                </Fg>
                <Fg label="Nacionalidad">
                  <input style={inp} value={p.nacionalidad}
                         onChange={e=>upd(p.id,"nacionalidad",e.target.value)}
                         placeholder="ej: argentino/a"/>
                </Fg>
                <Fg label="Tipo doc.">
                  <select style={inp} value={p.tipoDoc} onChange={e=>upd(p.id,"tipoDoc",e.target.value)}>
                    <option>DNI</option><option>LE</option><option>LC</option><option>Pasaporte</option>
                  </select>
                </Fg>
                <Fg label="N° documento">
                  <input style={inp} value={p.nroDoc}
                         onChange={e=>upd(p.id,"nroDoc",e.target.value)} placeholder="ingrese dni sin puntos"/>
                </Fg>
                <Fg label="CUIT/CUIL (opcional)">
                  <input style={inp} value={p.cuit}
                         onChange={e=>upd(p.id,"cuit",e.target.value)} placeholder="ingrese cuit/l sin puntos ni guiones"/>
                </Fg>
                <Fg label="Fecha de nacimiento">
                  <input style={inp} value={p.fechaNac}
                         onChange={e=>upd(p.id,"fechaNac",e.target.value)}
                         placeholder="ingrese fecha en formato dd/mm/aaaa"/>
                </Fg>
                <Fg label="Rol en el acto">
                  <input style={inp} value={p.rol}
                         onChange={e=>upd(p.id,"rol",e.target.value.toUpperCase())}
                         placeholder="ej: COMPRADORA"/>
                </Fg>
                <Fg label="Calle">
                  <input style={inp} value={p.calle}
                         onChange={e=>upd(p.id,"calle",e.target.value)} placeholder="ingrese calle"/>
                </Fg>
                <Fg label="Número">
                  <input style={inp} value={p.numero}
                         onChange={e=>upd(p.id,"numero",e.target.value)} placeholder="ingrese n°"/>
                </Fg>
                <Fg label="Piso (opcional)">
                  <input style={inp} value={p.piso} onChange={e=>upd(p.id,"piso",e.target.value)}/>
                </Fg>
                <Fg label="Depto. (opcional)">
                  <input style={inp} value={p.dpto} onChange={e=>upd(p.id,"dpto",e.target.value)}/>
                </Fg>
                <Fg label="Localidad / Barrio">
                  <input style={inp} value={p.localidad}
                         onChange={e=>upd(p.id,"localidad",e.target.value)} placeholder="ej: Dorrego"/>
                </Fg>
                <Fg label="Departamento Mendoza">
                  <select style={inp} value={p.departamento}
                          onChange={e=>upd(p.id,"departamento",e.target.value)}>
                    {DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </Fg>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:14,
                            paddingTop:12, borderTop:`1px solid rgba(26,35,50,.08)` }}>
                <Btn danger onClick={()=>quitar(p.id)}>Quitar parte</Btn>
              </div>
            </>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                          height:"100%", color:C.muted, fontSize:13 }}>
              Seleccioná una parte
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── MODAL ESCRIBANO ───────────────────────────────────────
const ESCRIBANOS = [
  { nombre:"FÁTIMA A. TAHA",    caracter:"Notaria Adscripta",  registro:"853", circunscripcion:"primera", genero:"F" },
  { nombre:"SERGIO MIRANDA",    caracter:"Notario Titular",    registro:"412", circunscripcion:"primera", genero:"M" },
];

function ModalEscribano({ escribano, onApply, onClose }) {
  const [sel, setSel] = useState(
    ESCRIBANOS.findIndex(e => e.nombre === escribano.nombre) ?? 0
  );
  return (
    <Modal title="Escribano / Notario" onClose={onClose}
           footer={<>
             <Btn onClick={onClose}>Cancelar</Btn>
             <Btn primary onClick={()=>{ onApply(ESCRIBANOS[sel]); onClose(); }}>Aplicar</Btn>
           </>}>
      {ESCRIBANOS.map((e, i) => (
        <div key={e.nombre} onClick={()=>setSel(i)}
             style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                      borderRadius:8, cursor:"pointer",
                      border:`1px solid ${sel===i ? C.cerulean : "rgba(26,35,50,.12)"}`,
                      background: sel===i ? C.ceruleanLight : "transparent" }}>
          <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0,
                        background: sel===i ? C.cerulean : C.ceruleanLight,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:11, fontWeight:700,
                        color: sel===i ? "#fff" : "#1f4862" }}>
            {e.nombre.split(" ").map(w=>w[0]).slice(0,2).join("")}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.dark }}>{e.nombre}</div>
            <div style={{ fontSize:11, color:C.muted }}>{e.caracter} · Registro {e.registro} · {e.circunscripcion} circ.</div>
          </div>
        </div>
      ))}
    </Modal>
  );
}

// ── MODAL INSTRUMENTO ─────────────────────────────────────
function ModalInstrumento({ instrumento, onApply, onClose }) {
  const [d, setD] = useState({...instrumento});
  const upd = (f,v) => setD(x=>({...x,[f]:v}));
  return (
    <Modal title="Instrumento certificado" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={()=>{ onApply(d); onClose(); }}>Aplicar</Btn></>}>
      <Fg label="Descripción (vacío = 'el instrumento adjunto a la presente Actuación Notarial')">
        <input style={inp} value={d.descripcion}
               onChange={e=>upd("descripcion",e.target.value)} placeholder="ej: CONTRATO DE LOCACIÓN"/>
      </Fg>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Fg label="Serie"><input style={inp} value={d.serie} onChange={e=>upd("serie",e.target.value)} placeholder="ej: Q"/></Fg>
        <Fg label="N° actuación"><input style={inp} value={d.nroActuacion} onChange={e=>upd("nroActuacion",e.target.value)} placeholder="ej: 61548"/></Fg>
      </div>
      <Fg label="Fojas (opcional)">
        <input style={inp} value={d.fojas} onChange={e=>upd("fojas",e.target.value)}
               placeholder="constante de dos (2) fojas útiles"/>
      </Fg>
      <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13,
                      fontWeight:500, color:C.dark, fontFamily:"'Montserrat',sans-serif", cursor:"pointer" }}>
        <input type="checkbox" checked={d.esF08} onChange={e=>upd("esF08",e.target.checked)}
               style={{ accentColor:C.cerulean }}/>
        Formulario 08 — automotor
      </label>
    </Modal>
  );
}

// ── MODAL PROTOCOLO ───────────────────────────────────────
function ModalProtocolo({ protocolo, onApply, onClose }) {
  const [d, setD] = useState({...protocolo});
  const upd = (f,v) => setD(x=>({...x,[f]:v}));
  return (
    <Modal title="Protocolo" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={()=>{ onApply(d); onClose(); }}>Aplicar</Btn></>}>
      <Fg label="Nombre del libro">
        <select style={inp} value={d.libro} onChange={e=>upd("libro",e.target.value)}>
          <option>Libro de Requerimientos para Certificaciones de Firmas</option>
          <option>Libro de Registros de firmas e impresiones digitales</option>
          <option>Libro de Protocolo de Actas de Requerimientos para Certificaciones de Firmas e Impresiones Digitales</option>
        </select>
      </Fg>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Fg label="N° de libro">
          <input style={inp} value={d.nroLibro} onChange={e=>upd("nroLibro",e.target.value)} placeholder="ej: IV"/>
        </Fg>
        <Fg label="N° de acta">
          <input style={inp} value={d.nroActa} onChange={e=>upd("nroActa",e.target.value)} placeholder="ej: 008"/>
        </Fg>
      </div>
      <Warn>El N° de acta es manual. El documento puede cerrarse sin completarlo.</Warn>
    </Modal>
  );
}

// ── MODAL FECHA ───────────────────────────────────────────
function ModalFecha({ fecha, onApply, onClose }) {
  const [d, setD] = useState({...fecha});
  const upd = (f,v) => setD(x=>({...x,[f]:v}));
  const hoy = () => { const h=new Date(); setD(x=>({...x,dia:h.getDate(),mes:h.getMonth(),anio:h.getFullYear()})); };
  const preview = `${diaLetras(d.dia)} días del mes de ${MESES_LABEL[d.mes]} de ${anioLetras(d.anio)}`;
  return (
    <Modal title="Lugar y fecha de otorgamiento" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={()=>{ onApply(d); onClose(); }}>Aplicar</Btn></>}>
      <Fg label="Ciudad">
        <select style={inp} value={d.ciudad} onChange={e=>upd("ciudad",e.target.value)}>
          {DEPARTAMENTOS.map(dep=><option key={dep}>{dep}</option>)}
        </select>
      </Fg>
      <Fg label="Fecha">
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input type="number" min={1} max={31} value={d.dia}
                 onChange={e=>upd("dia",Number(e.target.value))}
                 style={{ ...inp, width:64, textAlign:"center" }}/>
          <select style={{ ...inp, flex:1 }} value={d.mes}
                  onChange={e=>upd("mes",Number(e.target.value))}>
            {MESES_LABEL.map((m,i)=><option key={m} value={i}>{m}</option>)}
          </select>
          <input type="number" min={2024} max={2099} value={d.anio}
                 onChange={e=>upd("anio",Number(e.target.value))}
                 style={{ ...inp, width:84, textAlign:"center" }}/>
          <button onClick={hoy}
                  style={{ padding:"6px 10px", border:`1px solid rgba(26,35,50,.2)`, borderRadius:6,
                           fontSize:13, fontWeight:500, background:C.porcelain, color:C.dark,
                           fontFamily:"'Montserrat',sans-serif", whiteSpace:"nowrap", cursor:"pointer" }}>
            ↺ Hoy
          </button>
        </div>
        <div style={{ fontSize:11, color:C.faint, marginTop:5 }}>→ {preview}</div>
      </Fg>
    </Modal>
  );
}

// ── HOME ──────────────────────────────────────────────────
function HomeScreen({ onGo }) {
  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  background:C.warm, fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>
      <NavBar/>
      <div style={{ flex:1, overflowY:"auto", display:"flex", justifyContent:"center", padding:"40px 24px" }}>
        <div style={{ width:"100%", maxWidth:860 }}>
          <h1 style={{ fontSize:28, fontWeight:600, color:C.dark, marginBottom:32, letterSpacing:"-.02em" }}>
            ¿Qué querés hacer hoy?
          </h1>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
            <button onClick={()=>onGo("selector")}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(26,35,50,.1)"}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
                    style={{ padding:24, textAlign:"left", background:"#fff", borderRadius:12,
                             border:"1px solid rgba(26,35,50,.08)", cursor:"pointer", transition:"box-shadow .15s" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={C.dark}
                   strokeWidth="1.5" style={{ marginBottom:14, opacity:0.4 }}>
                <rect x="6" y="4" width="20" height="24" rx="3"/>
                <path d="M11 11h10M11 16h10M11 21h6" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize:15, fontWeight:700, color:C.dark, marginBottom:6 }}>Documento individual</div>
              <div style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>
                Crear un documento a partir de un modelo notarial.
              </div>
            </button>
            <div style={{ padding:24, background:C.cerulean, borderRadius:12, cursor:"not-allowed" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
                   stroke="rgba(255,255,255,.7)" strokeWidth="1.5" style={{ marginBottom:14 }}>
                <rect x="4" y="8" width="18" height="20" rx="3"/>
                <rect x="10" y="4" width="18" height="20" rx="3"/>
              </svg>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Carga masiva</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,.7)" }}>(Próximamente)</span>
              </div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.8)", lineHeight:1.5 }}>
                Generar múltiples documentos homogéneos a partir de una estructura común.
              </div>
            </div>
          </div>
          <div style={{ borderTop:"1px solid rgba(26,35,50,.08)", paddingTop:16, marginTop:8 }}>
            <p style={{ fontSize:13, color:C.faint, lineHeight:1.7 }}>
              Esta pantalla inicia flujos de trabajo.<br/>No presenta información histórica ni estados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SELECTOR ──────────────────────────────────────────────
function SelectorScreen({ onGo }) {
  const [selected, setSelected] = useState("Certificación de firma");
  const [familia,  setFamilia]  = useState("");
  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  background:C.warm, fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>
      <NavBar/>
      <div style={{ flex:1, overflowY:"auto", display:"flex", justifyContent:"center", padding:"40px 24px" }}>
        <div style={{ width:"100%", maxWidth:720 }}>
          <button onClick={()=>onGo("home")}
                  style={{ background:"none", border:"none", color:C.muted, fontSize:13,
                           fontFamily:"'Montserrat',sans-serif", marginBottom:24, padding:0, cursor:"pointer" }}>
            ← Volver
          </button>
          <h1 style={{ fontSize:24, fontWeight:600, color:C.dark, marginBottom:8 }}>Seleccioná el instrumento</h1>
          <p style={{ fontSize:13, color:C.muted, marginBottom:32 }}>Elegí el tipo de documento que querés generar.</p>
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid rgba(26,35,50,.08)",
                        padding:24, marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase",
                          color:C.faint, marginBottom:14 }}>Acceso rápido</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {FRECUENTES.map(f=>(
                <button key={f} onClick={()=>setSelected(f)}
                        style={{ padding:"7px 14px", borderRadius:20, cursor:"pointer",
                                 border:`1px solid ${selected===f?C.cerulean:"rgba(26,35,50,.18)"}`,
                                 background:selected===f?C.ceruleanLight:"transparent",
                                 color:selected===f?"#1f4862":C.dark, fontSize:13,
                                 fontWeight:selected===f?600:400, fontFamily:"'Montserrat',sans-serif" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid rgba(26,35,50,.08)",
                        padding:24, marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase",
                          color:C.faint, marginBottom:14 }}>O buscá por familia</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Fg label="Familia">
                <select style={inp} value={familia} onChange={e=>setFamilia(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="cert">Certificaciones</option>
                  <option value="acta">Actas notariales</option>
                  <option value="escritura">Escrituras públicas</option>
                  <option value="traslado">Traslados</option>
                </select>
              </Fg>
              <Fg label="Instrumento">
                <select style={inp} disabled={!familia} onChange={e=>setSelected(e.target.value)}>
                  <option>— elegí familia primero</option>
                  {familia && INSTRUMENTOS[familia]?.map(i=><option key={i}>{i}</option>)}
                </select>
              </Fg>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, color:C.muted }}>
              Seleccionado: <strong style={{ color:C.dark }}>{selected}</strong>
            </span>
            <Btn primary onClick={()=>onGo("editor")}>Abrir en editor →</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EDITOR ────────────────────────────────────────────────
function EditorScreen({ onGo }) {
  // UI
  const [modal,     setModal]     = useState(null);
  const [varsOn,    setVarsOn]    = useState(true);
  const [hojaOn,    setHojaOn]    = useState(true);
  const [estado,    setEstado]    = useState("borrador");
  const [zoomIdx,   setZoomIdx]   = useState(4);
  const [fuente,    setFuente]    = useState(FUENTES[0]);
  const [margenKey, setMargenKey] = useState("protocolar");
  const [ddOpen,    setDdOpen]    = useState(null);

  // Documento
  const [partes,      setPartes]      = useState([PARTE_VACIA()]);
  const [escribano,   setEscribano]   = useState(ESCRIBANO_INI);
  const [fecha,       setFecha]       = useState(FECHA_HOY());
  const [protocolo,   setProtocolo]   = useState(PROTOCOLO_INI);
  const [instrumento, setInstrumento] = useState(INSTRUMENTO_INI);
  const [fontSize, setFontSize] = useState(11);

  const docRef   = useRef(null);
  const fmtRef   = useRef(null);
  const mgnRef   = useRef(null);
  const savedSel = useRef(null);

  useClickOutside(fmtRef, ()=>ddOpen==="formato"  && setDdOpen(null));
  useClickOutside(mgnRef, ()=>ddOpen==="margenes" && setDdOpen(null));

  const zoom   = ZOOM_LEVELS[zoomIdx];
  const margen = margenKey==="protocolar" ? PROT : NOPROT;
  const boxL   = margen.left;
  const boxT   = margen.top;
  const boxW   = A4W - margen.right - boxL;
  const boxH   = A4H - margen.bottom - boxT;
  const lineH  = boxH / LINE_COUNT;

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount>0) savedSel.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedSel.current && sel) { sel.removeAllRanges(); sel.addRange(savedSel.current); }
  };
  const fmt = (cmd) => { restoreSelection(); document.execCommand(cmd,false,null); docRef.current?.focus(); };
  
  const convertCase = (mode) => {
  restoreSelection();
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const text  = range.toString();
  let result;
  if (mode === true)    result = text.toUpperCase();
  else if (mode === false) result = text.toLowerCase();
  else result = text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  range.deleteContents();
  range.insertNode(document.createTextNode(result));
  docRef.current?.focus();
  };
  
  const applyFuente = (f) => { setFuente(f); setDdOpen(null); };

const V = ({children, empty, label}) => <Var show={varsOn} empty={empty} label={label}>{children}</Var>;

  // Título dinámico en navbar
  const primerApellido = partes[0]?.apellido || null;
  const diaStr = String(fecha.dia).padStart(2,"0");
  const mesStr = String(fecha.mes+1).padStart(2,"0");
  const docTitle = primerApellido
    ? `Certificación de firma — ${primerApellido} — ${diaStr}/${mesStr}/${fecha.anio}`
    : "Certificación de firma — nuevo documento";

  // Texto del instrumento
  const instrTexto = instrumento.descripcion || "el instrumento adjunto a la presente Actuación Notarial";

  // Fecha en letras
  const fechaLetras = `${diaLetras(fecha.dia)} días del mes de ${MESES_LABEL[fecha.mes]} de ${anioLetras(fecha.anio)}`;

  // Bloque de partes encadenado
 const renderPartes = () => {
    if (partes.length===0) return <V empty label="PARTE">sin partes</V>;

    const fraseCapacidad = partes.length === 1
      ? `${gen(partes[0],"La compareciente","El compareciente")} manifiesta no tener su capacidad de ejercicio restringida por sentencia alguna.-`
      : "Los comparecientes manifiestan no tener su capacidad de ejercicio restringida por sentencia alguna.-";

    const fraseIdentidad = partes.length === 1
      ? ", y cuya identidad justifica conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhibe el documento anteriormente relacionado cuya copia archivo en esta escribanía.- "
      : ", y cuyas identidades justifican conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhiben los documentos anteriormente relacionados cuyas copias archivo en esta escribanía.- ";

    return (
      <>
        {partes.map((p, idx) => {
          const esUltima = idx === partes.length - 1;
          const domicilio = [
            p.calle, p.numero,
            p.piso     && `piso ${p.piso}`,
            p.dpto     && `departamento ${p.dpto}`,
            p.localidad,
          ].filter(Boolean).join(", ");

          return (
            <span key={p.id}>
              {idx === 0 && "por "}
              {idx > 0 && !esUltima && "; "}
              {idx > 0 && esUltima && "; y "}
              {`${gen(p,"la señora","el señor")} `}
              <V empty={!p.apellido && !p.nombre} label="APELLIDO Y NOMBRE">
                {p.apellido}{p.nombre ? `, ${p.nombre}` : ""}
              </V>
              {", "}
              <V empty={!p.nacionalidad} label="NACIONALIDAD">{p.nacionalidad}</V>
              {", con "}
              <V empty={!p.tipoDoc} label="TIPO DOC">{p.tipoDoc}</V>
              {" número "}
              <V empty={!p.nroDoc} label="N° DOCUMENTO">{p.nroDoc}</V>
              {p.cuit ? <span>, C.U.I.T./L. <V label="CUIT/CUIL">{p.cuit}</V></span> : ""}
              {p.fechaNac ? <span>, nacid{gen(p,"a","o")} el <V label="FECHA NAC">{p.fechaNac}</V></span> : ""}
              {", "}
              {gen(p,"quien","quien")} manifiesta ser de estado de familia{" "}
              <V empty={!p.estadoCivil} label="ESTADO CIVIL">{p.estadoCivil}</V>
              {domicilio
                ? <span>, con domicilio en <V label="DOMICILIO">{domicilio}</V>, departamento <V empty={!p.departamento} label="DEPARTAMENTO">{p.departamento}</V>, de ésta Provincia de Mendoza</span>
                : ""}
              {"; datos que surgen del Documento Nacional de Identidad que he tenido a la vista para este acto, "}
              {gen(p,"la que","el que")} firma en su carácter de{" "}
              <V empty={!p.rol} label="ROL">{p.rol}</V>
            </span>
          );
        })}
        {fraseIdentidad}
        {fraseCapacidad}
      </>
    );
  }; 

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>
      <NavBar docTitle={docTitle} estado={estado}
              onStatus={()=>setModal("estado")} onExport={()=>setModal("exportar")}/>

{/* ── TOOLBAR ── */}
      <div style={{ background:C.porcelain, borderBottom:`1px solid rgba(26,35,50,.12)`,
                    padding:"6px 16px", flexShrink:0, zIndex:10, display:"flex", flexDirection:"column", gap:4 }}>

        {/* Fila 1 — Configuración */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <TbBtn title="Negrita"    onClick={()=>fmt("bold")}><b>N</b></TbBtn>
          <TbBtn title="Cursiva"    onClick={()=>fmt("italic")}><i style={{fontStyle:"italic"}}>I</i></TbBtn>
          <TbBtn title="Subrayado"  onClick={()=>fmt("underline")}><span style={{textDecoration:"underline"}}>S</span></TbBtn>
          <TbBtn title="MAYÚSCULAS" onClick={()=>convertCase(true)}>AA</TbBtn>
          <TbBtn title="minúsculas" onClick={()=>convertCase(false)}>aa</TbBtn>
          <TbBtn title="Capitalizar" onClick={()=>convertCase("cap")}>Aa</TbBtn>
          <TbSep/>
          <div ref={fmtRef} style={{ position:"relative" }}>
            <TbBtn active={ddOpen==="formato"}
                   onClick={()=>{ saveSelection(); setDdOpen(ddOpen==="formato"?null:"formato"); }}>
              {fuente.label} <svg width="11" height="11" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 2.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>

            </TbBtn>
            <Dropdown open={ddOpen==="formato"}>
              <DdSection label="Fuente del documento">
                {FUENTES.map(f=>(
                  <DdItem key={f.key} active={fuente.key===f.key} onClick={()=>applyFuente(f)}>
                    <span style={{fontFamily:f.family,fontSize:14}}>{f.label}</span>
                  </DdItem>
                ))}
              </DdSection>
            </Dropdown>
          </div>


          <select
            
            style={{ padding:"5px 4px", border:`1px solid ${C.borderStrong}`, borderRadius:6,
                      fontSize:13, background:C.porcelain, color:C.dark,
                      fontFamily:"'Montserrat',sans-serif", width:52, boxSizing:"border-box" }}
            
            value={fontSize}
            onChange={e=>{ setFontSize(Number(e.target.value)); docRef.current.style.fontSize = e.target.value+"pt"; }}
          >
            {[8,9,10,11,12,13,14,16,18].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <TbSep/>
          <div ref={mgnRef} style={{ position:"relative" }}>
            <TbBtn active={ddOpen==="margenes"}
                   onClick={()=>{ saveSelection(); setDdOpen(ddOpen==="margenes"?null:"margenes"); }}>
              Márgenes <svg width="11" height="11" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 2.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </TbBtn>
            <Dropdown open={ddOpen==="margenes"}>
              <DdSection label="Formato de página">
                <DdItem active={margenKey==="protocolar"}   meta="34·70·12·16.5 mm"
                        onClick={()=>{ setMargenKey("protocolar");   setDdOpen(null); }}>Protocolar</DdItem>
                <DdItem active={margenKey==="noprotocolar"} meta="30·35·20·20 mm"
                        onClick={()=>{ setMargenKey("noprotocolar"); setDdOpen(null); }}>No protocolar</DdItem>
              </DdSection>
            </Dropdown>
          </div>
          <TbSep/>
          <TbBtn onClick={()=>setZoomIdx(Math.max(0,zoomIdx-1))}><span style={{fontSize:16}}>−</span></TbBtn>
          <span style={{ fontSize:13, fontWeight:500, color:C.dark, minWidth:38, textAlign:"center" }}>
            {Math.round(zoom*100)}%
          </span>
          <TbBtn onClick={()=>setZoomIdx(Math.min(ZOOM_LEVELS.length-1,zoomIdx+1))}><span style={{fontSize:16}}>+</span></TbBtn>
          <TbBtn onClick={()=>setZoomIdx(4)}><span style={{fontSize:16}}>↺</span></TbBtn>
          <TbBtn title="Deshacer" onClick={()=>{ restoreSelection(); document.execCommand("undo",false,null); docRef.current?.focus(); }}><span style={{fontSize:16}}>↩</span></TbBtn>
          <TbBtn title="Rehacer" onClick={()=>{ restoreSelection(); document.execCommand("redo",false,null); docRef.current?.focus(); }}><span style={{fontSize:16}}>↪</span></TbBtn>
        </div>


        {/* Fila 2 — Documento */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <TbBtn onClick={()=>setModal("partes")}>Partes</TbBtn>
          <TbBtn onClick={()=>setModal("escribano")}>Escribano</TbBtn>
          <TbBtn onClick={()=>setModal("instrumento")}>Instrumento</TbBtn>
          <TbBtn onClick={()=>setModal("protocolo")}>Protocolo</TbBtn>
          <TbBtn onClick={()=>setModal("fecha")}>Lugar y fecha</TbBtn>
          <TbSep/>
          <TbBtn active={varsOn} onClick={()=>setVarsOn(!varsOn)}>Variables</TbBtn>
          <TbBtn active={hojaOn} onClick={()=>setHojaOn(!hojaOn)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                 stroke="currentColor" strokeWidth="1.3" style={{flexShrink:0}}>
              <rect x="1" y="1" width="10" height="10" rx="1.5"/>
              <path d="M3 4h6M3 6h6M3 8h4" strokeLinecap="round"/>
            </svg>
            Fondo Impr
          </TbBtn>
        </div>

      </div>


      {/* ── DOCUMENTO ── */}
      <div style={{ flex:1, background:C.warm, overflowY:"auto", overflowX:"auto",
                    display:"flex", justifyContent:"center", alignItems:"flex-start", padding:"28px 20px" }}>
        <div style={{
          transform:`scale(${zoom})`, transformOrigin:"top center",
          width:A4W, minHeight:A4H, flexShrink:0,
          marginBottom: zoom<1 ? `${-(1-zoom)*A4H}px` : 0,
        }}>
          <div style={{ position:"relative", width:A4W, minHeight:A4H,
                        background:"#fff", boxShadow:"0 2px 16px rgba(26,35,50,.13)" }}>

            {hojaOn && <HojaProtocolarSVG margen={margen}/>}

            <div
              ref={docRef}
              contentEditable
              suppressContentEditableWarning
              onMouseUp={saveSelection}
              onKeyUp={saveSelection}
              style={{
                position:    "absolute",
                left:        boxL,
                top:         boxT,
                width:       boxW,
                minHeight:   boxH,
                fontFamily:  fuente.family,
                fontSize:    `${fontSize}pt`,
                lineHeight:  `${lineH}px`,
                paddingTop:  `${lineH * 0.72}px`,
                paddingLeft: `${mm(2)}px`,
                paddingRight:`${mm(2)}px`,
                textAlign:   "justify",
                color:       C.dark,
                outline:     "none",
                zIndex:      2,
                wordBreak:   "break-word",
                boxSizing:   "border-box",
              }}
            >
              
              {/* APERTURA */}
              <strong><V empty={!escribano.nombre} label="ESCRIBANO">{escribano.nombre}</V></strong>
              {", "}
              <V empty={!escribano.caracter} label="CARÁCTER">{escribano.caracter}</V>
              {" al Registro Notarial número "}
              <V empty={!escribano.registro} label="N° REGISTRO">{escribano.registro}</V>
              {" de la "}
              <V empty={!escribano.circunscripcion} label="CIRCUNSCRIPCIÓN">{escribano.circunscripcion} circunscripción</V>
              {", "}<strong>CERTIFICO:-</strong>
              {" Que la firma que se encuentra inserta en "}
              <V label="INSTRUMENTO">{instrTexto}</V>
              {instrumento.fojas ? <span>, {instrumento.fojas}</span> : ""}
              {", que lleva mi firma y sello; ha sido puesta en mi presencia "}

              {/* PARTES */}
              {renderPartes()}

              {/* PROTOCOLO */}
              {" El requerimiento respectivo ha sido formalizado en Acta número "}
              <V empty={!protocolo.nroActa} label="N° ACTA">{protocolo.nroActa}</V>
              {" "}
              <V empty={!protocolo.libro} label="LIBRO">{protocolo.libro}</V>
              {" número "}
              <V empty={!protocolo.nroLibro} label="N° LIBRO">{protocolo.nroLibro}</V>
              {".- En "}
              <V empty={!fecha.ciudad} label="CIUDAD">{fecha.ciudad?.toUpperCase()}</V>
              {", Provincia de Mendoza, República Argentina, a los "}
              <V label="FECHA">{fechaLetras}</V>
              {".-"}
              
              
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALES ── */}
      {modal==="partes"      && <ModalPartes      partes={partes}           onApply={setPartes}      onClose={()=>setModal(null)}/>}
      {modal==="escribano"   && <ModalEscribano   escribano={escribano}     onApply={setEscribano}   onClose={()=>setModal(null)}/>}
      {modal==="instrumento" && <ModalInstrumento instrumento={instrumento} onApply={setInstrumento} onClose={()=>setModal(null)}/>}
      {modal==="protocolo"   && <ModalProtocolo   protocolo={protocolo}     onApply={setProtocolo}   onClose={()=>setModal(null)}/>}
      {modal==="fecha"       && <ModalFecha       fecha={fecha}             onApply={setFecha}       onClose={()=>setModal(null)}/>}

      {modal==="estado" && (
        <Modal title="Estado del documento" onClose={()=>setModal(null)}
               footer={<><Btn onClick={()=>setModal(null)}>Cancelar</Btn>
                          <Btn primary onClick={()=>setModal(null)}>Guardar</Btn></>}>
          {[["borrador","Borrador"],["revision","En revisión"],["completo","Completo"]].map(([v,l])=>(
            <label key={v} onClick={()=>setEstado(v)}
                   style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                            border:`1px solid ${estado===v?C.cerulean:"rgba(26,35,50,.12)"}`,
                            borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:500,
                            color:C.dark, fontFamily:"'Montserrat',sans-serif",
                            background:estado===v?C.ceruleanLight:"transparent" }}>
              <input type="radio" name="est" checked={estado===v} onChange={()=>setEstado(v)}
                     style={{ accentColor:C.cerulean }}/>
              {l}
            </label>
          ))}
          <Warn>Ningún estado bloquea la edición del documento.</Warn>
        </Modal>
      )}

      {modal==="exportar" && (
        <Modal title="Exportar documento" onClose={()=>setModal(null)}
               footer={<Btn onClick={()=>setModal(null)}>Cerrar</Btn>}>
          <div style={{ display:"flex", gap:12 }}>
            {[["PDF","Para imprimir o archivar"],["DOCX","Para seguir editando"]].map(([ext,desc])=>(
              <div key={ext}
                   onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.cerulean; e.currentTarget.style.background=C.ceruleanLight; }}
                   onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(26,35,50,.12)"; e.currentTarget.style.background="transparent"; }}
                   style={{ flex:1, padding:20, border:"1px solid rgba(26,35,50,.12)", borderRadius:10,
                            textAlign:"center", cursor:"pointer", transition:"all .12s" }}>
                <div style={{ fontSize:20, fontWeight:700, color:C.dark, marginBottom:6 }}>{ext}</div>
                <div style={{ fontSize:11, color:C.muted }}>{desc}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }
        body { background: #f0ece3; font-family: 'Montserrat', sans-serif; }
        [contenteditable]:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(26,35,50,.2); border-radius: 3px; }::-webkit-scrollbar { width: 6px; }

      `}</style>
      {screen==="home"     && <HomeScreen     onGo={setScreen}/>}
      {screen==="selector" && <SelectorScreen onGo={setScreen}/>}
      {screen==="editor"   && <EditorScreen   onGo={setScreen}/>}
    </>
  );
}
