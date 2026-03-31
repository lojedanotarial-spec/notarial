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
const mm = (v) => (v / 210) * A4W;

const PROT = {
  left: mm(34), top: mm(70), right: mm(12), bottom: mm(16.5),
};
const NOPROT = {
  left: mm(30), top: mm(35), right: mm(20), bottom: mm(20),
};

const LINE_COUNT = 24;

// ── CONSTANTES UI ─────────────────────────────────────────
const ZOOM_LEVELS = [0.5, 0.65, 0.75, 0.85, 1, 1.25, 1.5];
const FUENTES = [
  { key: "sitka",      label: "Sitka",           family: "'Sitka Text','Sitka',Georgia,serif" },
  { key: "georgia",    label: "Georgia",          family: "Georgia,serif" },
  { key: "times",      label: "Times New Roman",  family: "'Times New Roman',serif" },
  { key: "montserrat", label: "Montserrat",       family: "'Montserrat',sans-serif" },
];
const DEPARTAMENTOS = [
  "Ciudad","Godoy Cruz","Guaymallén","Las Heras","Lavalle","Luján de Cuyo",
  "Maipú","San Martín","Junín","Rivadavia","Santa Rosa","La Paz",
  "Tunuyán","Tupungato","San Carlos","San Rafael","General Alvear","Malargüe",
];
const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
               "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
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

// ── UTILS ─────────────────────────────────────────────────
function useClickOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}

// ── ESTILOS BASE ──────────────────────────────────────────
const inp = {
  padding:"8px 11px", border:`1px solid ${C.border}`, borderRadius:7,
  fontSize:13, background:C.porcelain, color:C.dark,
  fontFamily:"'Montserrat',sans-serif", width:"100%", boxSizing:"border-box",
};

// ── HOJA PROTOCOLAR (imagen real + renglones SVG) ─────────
function HojaProtocolarSVG({ margen }) {
  const boxL  = margen.left;
  const boxT  = margen.top;
  const boxR  = A4W - margen.right;
  const boxB  = A4H - margen.bottom;
  const lineH = (boxB - boxT) / LINE_COUNT;

  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:1 }}>

      {/* Imagen real de la hoja protocolar — copiá CAPA_PROTOCOLO_1.svg a /public */}
      <img
        src="/CAPA_PROTOCOLO_1.svg"
        alt=""
        style={{
          position: "absolute",
          inset:    0,
          width:    A4W,
          height:   A4H,
          display:  "block",
        }}
      />

      {/* Renglones numerados encima */}
      <svg
        width={A4W} height={A4H}
        viewBox={`0 0 ${A4W} ${A4H}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position:"absolute", inset:0 }}
      >
        <line
          x1={boxL - 22} y1={boxT}
          x2={boxL - 22} y2={boxB}
          stroke="rgba(90,90,90,0.08)" strokeWidth="0.4"
        />
        {Array.from({ length: LINE_COUNT }, (_, i) => {
          const y = boxT + (i + 1) * lineH;
          return (
            <g key={i}>
              <line
                x1={boxL} y1={y} x2={boxR} y2={y}
                stroke="rgba(90,90,90,0.13)" strokeWidth="0.4"
              />
              <text
                fontFamily="'Courier New',monospace"
                fontSize="9"
                fill="rgba(90,90,90,0.30)"
                x={boxL - 5} y={y - 3}
                textAnchor="end"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>

    </div>
  );
}

// ── COMPONENTES UI ────────────────────────────────────────
function NavBar({ docTitle, onStatus, onExport }) {
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
            fontSize:12, fontWeight:500, padding:"3px 12px", fontFamily:"'Montserrat',sans-serif",
          }}>Borrador</button>
          <button onClick={onExport} style={{
            border:"1px solid rgba(255,255,255,.2)", borderRadius:7,
            background:"transparent", color:"rgba(255,255,255,.8)",
            fontSize:12, fontWeight:500, padding:"5px 12px", fontFamily:"'Montserrat',sans-serif",
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
                     color:on?"#1f4862":C.dark, fontSize:12, fontWeight:500,
                     fontFamily:"'Montserrat',sans-serif", display:"flex",
                     alignItems:"center", gap:4, whiteSpace:"nowrap", transition:"all .12s" }}>
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
                  border:`1px solid ${C.border}`, borderRadius:9, minWidth:220,
                  zIndex:200, overflow:"hidden", boxShadow:"0 4px 20px rgba(26,35,50,.1)" }}>
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

function Var({ children, empty, show }) {
  if (!show) return <span>{children}</span>;
  return (
    <span style={{ background:empty?"#fdeaea":C.fawn50,
                   borderBottom:empty?"1.5px dashed rgba(180,40,40,.55)":`1.5px dashed ${C.gold}`,
                   color:empty?"#7a1a1a":"#4e3d21", borderRadius:2, padding:"0 4px" }}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div onClick={(e)=>e.target===e.currentTarget&&onClose()}
         style={{ position:"fixed", inset:0, background:"rgba(26,35,50,.35)", zIndex:300,
                  display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:52 }}>
      <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${C.border}`,
                    width:500, maxWidth:"94vw", maxHeight:"82vh", display:"flex",
                    flexDirection:"column", boxShadow:"0 8px 32px rgba(26,35,50,.12)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"14px 18px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <span style={{ fontSize:14, fontWeight:600, color:C.dark }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, color:C.muted }}>×</button>
        </div>
        <div style={{ padding:18, overflowY:"auto", display:"flex", flexDirection:"column", gap:12 }}>
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
                     fontFamily:"'Montserrat',sans-serif",
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
                  fontSize:12, color:"#4e3d21", fontFamily:"'Montserrat',sans-serif" }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink:0, marginTop:1 }}>
        <path d="M6.5 1.5L12 11H1L6.5 1.5z" stroke="#a6864a" strokeWidth="1.3" fill="none"/>
        <path d="M6.5 5v2.5" stroke="#a6864a" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="6.5" cy="9.2" r=".7" fill="#a6864a"/>
      </svg>
      {children}
    </div>
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
            <p style={{ fontSize:12, color:C.faint, lineHeight:1.7 }}>
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
  const [familia, setFamilia] = useState("");
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
  const [modal, setModal]         = useState(null);
  const [varsOn, setVarsOn]       = useState(true);
  const [hojaOn, setHojaOn]       = useState(true);
  const [acta, setActa]           = useState("");
  const [actaOk, setActaOk]       = useState(false);
  const [estado, setEstado]       = useState("borrador");
  const [parteOpen, setParteOpen] = useState(false);
  const [zoomIdx, setZoomIdx]     = useState(4);
  const [fuente, setFuente]       = useState(FUENTES[0]);
  const [margenKey, setMargenKey] = useState("protocolar");
  const [ddOpen, setDdOpen]       = useState(null);

  const docRef   = useRef(null);
  const fmtRef   = useRef(null);
  const mgnRef   = useRef(null);
  const savedSel = useRef(null);

  useClickOutside(fmtRef, ()=>ddOpen==="formato"  && setDdOpen(null));
  useClickOutside(mgnRef, ()=>ddOpen==="margenes" && setDdOpen(null));

  const zoom   = ZOOM_LEVELS[zoomIdx];
  const margen = margenKey === "protocolar" ? PROT : NOPROT;
  const boxL   = margen.left;
  const boxT   = margen.top;
  const boxW   = A4W - margen.right - boxL;
  const boxH   = A4H - margen.bottom - boxT;
  const lineH  = boxH / LINE_COUNT;

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedSel.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedSel.current && sel) { sel.removeAllRanges(); sel.addRange(savedSel.current); }
  };
  const fmt = (cmd) => { restoreSelection(); document.execCommand(cmd, false, null); docRef.current?.focus(); };
  const convertCase = (upper) => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const text  = range.toString();
    range.deleteContents();
    range.insertNode(document.createTextNode(upper ? text.toUpperCase() : text.toLowerCase()));
    docRef.current?.focus();
  };
  const applyFuente = (f) => { setFuente(f); setDdOpen(null); };

  const V = ({ children, empty }) => <Var show={varsOn} empty={empty}>{children}</Var>;

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>
      <NavBar docTitle="Certificación de firma — Villegas — 14/11/2025"
              onStatus={()=>setModal("estado")} onExport={()=>setModal("exportar")}/>

      {/* ── TOOLBAR ── */}
      <div style={{ background:C.porcelain, borderBottom:`1px solid rgba(26,35,50,.12)`,
                    padding:"6px 16px", flexShrink:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:3, flexWrap:"wrap", rowGap:4 }}>
          <TbBtn title="Negrita"    onClick={()=>fmt("bold")}><b>N</b></TbBtn>
          <TbBtn title="Cursiva"    onClick={()=>fmt("italic")}><i style={{fontStyle:"italic"}}>I</i></TbBtn>
          <TbBtn title="Subrayado"  onClick={()=>fmt("underline")}>
            <span style={{textDecoration:"underline"}}>S</span>
          </TbBtn>
          <TbSep/>
          <TbBtn title="Mayúsculas" onClick={()=>convertCase(true)}>MAYÚSC</TbBtn>
          <TbBtn title="Minúsculas" onClick={()=>convertCase(false)}>minúsc</TbBtn>
          <TbSep/>
          <TbBtn onClick={()=>setModal("partes")}>Partes</TbBtn>
          <TbBtn onClick={()=>setModal("instrumento")}>Instrumento</TbBtn>
          <TbBtn onClick={()=>setModal("protocolo")}>Protocolo</TbBtn>
          <TbBtn onClick={()=>setModal("fecha")}>Fecha</TbBtn>
          <TbSep/>
          <TbBtn active={varsOn} onClick={()=>setVarsOn(!varsOn)} title="Mostrar variables">
            Variables
          </TbBtn>
          <TbBtn active={hojaOn} onClick={()=>setHojaOn(!hojaOn)} title="Mostrar hoja protocolar (borrador)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                 stroke="currentColor" strokeWidth="1.3" style={{flexShrink:0}}>
              <rect x="1" y="1" width="10" height="10" rx="1.5"/>
              <path d="M3 4h6M3 6h6M3 8h4" strokeLinecap="round"/>
            </svg>
            Hoja
          </TbBtn>
          <TbSep/>

          {/* Márgenes */}
          <div ref={mgnRef} style={{ position:"relative" }}>
            <TbBtn active={ddOpen==="margenes"}
                   onClick={()=>{ saveSelection(); setDdOpen(ddOpen==="margenes"?null:"margenes"); }}>
              Márgenes ▾
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

          {/* Fuente */}
          <div ref={fmtRef} style={{ position:"relative" }}>
            <TbBtn active={ddOpen==="formato"}
                   onClick={()=>{ saveSelection(); setDdOpen(ddOpen==="formato"?null:"formato"); }}>
              {fuente.label} ▾
            </TbBtn>
            <Dropdown open={ddOpen==="formato"}>
              <DdSection label="Fuente del documento">
                {FUENTES.map(f=>(
                  <DdItem key={f.key} active={fuente.key===f.key} onClick={()=>applyFuente(f)}>
                    <span style={{fontFamily:f.family, fontSize:14}}>{f.label}</span>
                  </DdItem>
                ))}
              </DdSection>
            </Dropdown>
          </div>
          <TbSep/>

          {/* Zoom */}
          <TbBtn onClick={()=>setZoomIdx(Math.max(0, zoomIdx-1))}>−</TbBtn>
          <span style={{ fontSize:12, fontWeight:500, color:C.dark, minWidth:38, textAlign:"center" }}>
            {Math.round(zoom*100)}%
          </span>
          <TbBtn onClick={()=>setZoomIdx(Math.min(ZOOM_LEVELS.length-1, zoomIdx+1))}>+</TbBtn>
          <TbBtn onClick={()=>setZoomIdx(4)} title="100%">↺</TbBtn>

          <div style={{ marginLeft:"auto" }}>
            <span onClick={()=>setModal("estado")}
                  style={{ ...BADGE[estado], fontSize:11, fontWeight:500,
                           padding:"3px 10px", borderRadius:10, cursor:"pointer" }}>
              {ELABELS[estado]}
            </span>
          </div>
        </div>
      </div>

      {/* ── ÁREA DE DOCUMENTO ── */}
      <div style={{ flex:1, background:C.warm, overflowY:"auto", overflowX:"auto",
                    display:"flex", justifyContent:"center", alignItems:"flex-start", padding:"28px 20px" }}>
        <div style={{
          transform:`scale(${zoom})`, transformOrigin:"top center",
          width:A4W, minHeight:A4H, flexShrink:0,
          marginBottom: zoom < 1 ? `${-(1-zoom)*A4H}px` : 0,
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
                fontSize:    "12pt",
                lineHeight:  `${lineH}px`,
                // Alinea la primera línea de texto con la primera guía SVG.
                // lineH incluye el renglón completo; desplazamos el texto
                // para que la baseline quede sobre la línea, no debajo.
                paddingTop:   `${lineH * 0.72}px`,
                // 2 mm de aire en ambos laterales para no tocar el borde
                paddingLeft:  `${mm(2)}px`,
                paddingRight: `${mm(2)}px`,
                textAlign:   "justify",
                color:       C.dark,
                outline:     "none",
                zIndex:      2,
                wordBreak:   "break-word",
                boxSizing:   "border-box",
              }}
            >
              <strong>FÁTIMA A. TAHA</strong>, Notaria Adscripta al Registro Notarial número
              853 de la primera circunscripción, <strong>CERTIFICO:-</strong> Que la firma
              que se encuentra inserta en <V>el instrumento adjunto a la presente Actuación
              Notarial</V>, que lleva mi firma y sello; ha sido puesta en mi presencia por
              la señora <V>VILLEGAS, CAROLINA ELIZABETH</V>, argentina, con Documento
              Nacional de Identidad número <V>38.475.547</V>, C.U.I.T./L.{" "}
              <V>27-38475547-5</V>, nacida el 15 de enero de 1.995, quien manifiesta ser de
              estado de familia soltera, con domicilio en calle Almagro 878, departamento 1,
              Dorrego, departamento Guaymallén, de ésta Provincia de Mendoza; datos que
              surgen del Documento Nacional de Identidad que he tenido a la vista para este
              acto, la que firma en su carácter de <V>COMPRADORA</V>, y cuya identidad
              justifica conforme al artículo 306, incisos a) del Código Civil y Comercial de
              la Nación, me exhibe el documento anteriormente relacionado cuya copia archivo
              en esta escribanía.- La compareciente manifiesta no tener su capacidad de
              ejercicio restringida por sentencia alguna.- El requerimiento respectivo ha
              sido formalizado en Acta número{" "}
              <V empty={!actaOk}>{actaOk ? acta : "⚠ N° acta"}</V> Libro de Requerimientos
              para Certificaciones de Firmas número <V>IV</V>.- En <V>MENDOZA</V>, Provincia
              de Mendoza, República Argentina, a los{" "}
              <V>CATORCE días del mes de NOVIEMBRE de DOS MIL VEINTICINCO</V>.-
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALES ── */}
      {modal==="partes" && (
        <Modal title="Partes comparecientes" onClose={()=>setModal(null)}
               footer={<><Btn onClick={()=>setModal(null)}>Cerrar</Btn>
                          <Btn primary onClick={()=>setModal(null)}>Aplicar al documento</Btn></>}>
          <div style={{ border:`1px solid rgba(26,35,50,.1)`, borderRadius:8,
                        overflow:"hidden", background:C.porcelain }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", cursor:"pointer" }}
                 onClick={()=>setParteOpen(!parteOpen)}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:C.ceruleanLight,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:10, fontWeight:700, color:"#1f4862" }}>CV</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.dark }}>Villegas, Carolina Elizabeth</div>
                <div style={{ fontSize:11, color:C.muted }}>DNI 38.475.547 · Soltera · Guaymallén · Compradora</div>
              </div>
              <span style={{ fontSize:11, color:C.faint, transition:"transform .15s",
                             transform:parteOpen?"rotate(180deg)":"none" }}>▾</span>
            </div>
            {parteOpen && (
              <div style={{ padding:14, borderTop:`1px solid rgba(26,35,50,.08)`, background:"#fff" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[
                    ["Género",      <select style={inp}><option>Femenino</option><option>Masculino</option></select>],
                    ["Apellido",    <input  style={inp} defaultValue="Villegas"/>],
                    ["Nombre/s",    <input  style={inp} defaultValue="Carolina Elizabeth"/>],
                    ["Nacionalidad",<input  style={inp} defaultValue="argentina"/>],
                    ["Tipo doc.",   <select style={inp}><option>DNI</option><option>LE</option><option>Pasaporte</option></select>],
                    ["N° documento",<input  style={inp} defaultValue="38.475.547"/>],
                    ["CUIT/CUIL",   <input  style={inp} defaultValue="27-38475547-5"/>],
                    ["Estado civil",<select style={inp}><option>soltera</option><option>soltero</option><option>casada</option><option>casado</option></select>],
                  ].map(([l,el])=><Fg key={l} label={l}>{el}</Fg>)}
                  <Fg label="Departamento" full>
                    <select style={inp}>{DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}</select>
                  </Fg>
                  <Fg label="Rol"><input style={inp} defaultValue="COMPRADORA"/></Fg>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:14,
                              paddingTop:12, borderTop:`1px solid rgba(26,35,50,.08)` }}>
                  <Btn danger>Quitar parte</Btn>
                  <Btn primary onClick={()=>setParteOpen(false)}>Guardar cambios</Btn>
                </div>
              </div>
            )}
          </div>
          <button style={{ padding:9, border:"1px dashed rgba(26,35,50,.2)", borderRadius:8,
                           fontSize:13, fontWeight:500, color:C.dark, background:"transparent",
                           width:"100%", fontFamily:"'Montserrat',sans-serif", cursor:"pointer" }}>
            + Agregar compareciente
          </button>
        </Modal>
      )}

      {modal==="instrumento" && (
        <Modal title="Instrumento certificado" onClose={()=>setModal(null)}
               footer={<><Btn onClick={()=>setModal(null)}>Cancelar</Btn>
                          <Btn primary onClick={()=>setModal(null)}>Aplicar</Btn></>}>
          <Fg label="Descripción">
            <input style={inp} placeholder="ej: CONTRATO DE LOCACIÓN — vacío para 'el instrumento adjunto'"/>
          </Fg>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Fg label="Serie"><input style={inp} placeholder="Q"/></Fg>
            <Fg label="N° actuación"><input style={inp} placeholder="61548"/></Fg>
          </div>
          <Fg label="Fojas (opcional)">
            <input style={inp} placeholder="ej: constante de dos (2) fojas útiles"/>
          </Fg>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input type="checkbox" id="f08" style={{ accentColor:C.cerulean }}/>
            <label htmlFor="f08" style={{ fontSize:13, fontWeight:500, color:C.dark,
                                          fontFamily:"'Montserrat',sans-serif" }}>
              Formulario 08 — automotor
            </label>
          </div>
        </Modal>
      )}

      {modal==="protocolo" && (
        <Modal title="Protocolo" onClose={()=>setModal(null)}
               footer={<><Btn onClick={()=>setModal(null)}>Cancelar</Btn>
                          <Btn primary onClick={()=>{ setActaOk(!!acta); setModal(null); }}>Aplicar</Btn></>}>
          <Fg label="Nombre del libro">
            <select style={inp}>
              <option>Libro de Requerimientos para Certificaciones de Firmas</option>
              <option>Libro de Registros de firmas e impresiones digitales</option>
              <option>Libro de Protocolo de Actas de Requerimientos para Certificaciones de Firmas e Impresiones Digitales</option>
            </select>
          </Fg>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Fg label="N° de libro"><input style={inp} defaultValue="IV"/></Fg>
            <Fg label="N° de acta">
              <input style={inp} placeholder="ej: 008" value={acta} onChange={e=>setActa(e.target.value)}/>
            </Fg>
          </div>
          <Warn>El N° de acta es manual. El documento puede cerrarse sin completarlo.</Warn>
        </Modal>
      )}

      {modal==="fecha" && (
        <Modal title="Fecha y lugar de otorgamiento" onClose={()=>setModal(null)}
               footer={<><Btn onClick={()=>setModal(null)}>Cancelar</Btn>
                          <Btn primary onClick={()=>setModal(null)}>Aplicar</Btn></>}>
          <Fg label="Ciudad">
            <select style={inp}>{DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}</select>
          </Fg>
          <Fg label="Fecha">
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="number" defaultValue={14} style={{ ...inp, width:60, textAlign:"center" }}/>
              <select style={{ ...inp, flex:1 }}>{MESES.map(m=><option key={m}>{m}</option>)}</select>
              <input type="number" defaultValue={2025} style={{ ...inp, width:80, textAlign:"center" }}/>
              <button style={{ padding:"6px 10px", border:`1px solid rgba(26,35,50,.2)`, borderRadius:6,
                               fontSize:11, fontWeight:500, background:C.porcelain, color:C.dark,
                               fontFamily:"'Montserrat',sans-serif", whiteSpace:"nowrap", cursor:"pointer" }}>
                ↺ Hoy
              </button>
            </div>
            <div style={{ fontSize:11, color:C.faint, marginTop:5 }}>
              → CATORCE días del mes de NOVIEMBRE de DOS MIL VEINTICINCO
            </div>
          </Fg>
        </Modal>
      )}

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
      `}</style>
      {screen==="home"     && <HomeScreen     onGo={setScreen}/>}
      {screen==="selector" && <SelectorScreen onGo={setScreen}/>}
      {screen==="editor"   && <EditorScreen   onGo={setScreen}/>}
    </>
  );
}
