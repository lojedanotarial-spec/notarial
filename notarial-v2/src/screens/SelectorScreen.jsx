import { useState } from "react";
import { C, FRECUENTES, INSTRUMENTOS, ELABELS, inp } from "../constants";
import { NavBar } from "../components/NavBar";
import { Fg } from "../components/ui/FormElements";

const RECIENTES = [
  { id:1, titulo:"Certificación de firma", parte:"GARCÍA",    fecha:"11/04/2026", diasAtras:2, estado:"revision" },
  { id:2, titulo:"Certificación de firma", parte:"RODRÍGUEZ", fecha:"10/04/2026", diasAtras:3, estado:"completo" },
  { id:3, titulo:"Poder especial",         parte:"LÓPEZ",     fecha:"08/04/2026", diasAtras:5, estado:"borrador" },
  { id:4, titulo:"Acta de constatación",   parte:"FERNÁNDEZ", fecha:"05/04/2026", diasAtras:8, estado:"completo" },
  { id:5, titulo:"Poder general",          parte:"DÍAZ",      fecha:"02/04/2026", diasAtras:11, estado:"borrador" },
];

const ESTADO_STYLE = {
  borrador: { bg:"rgba(26,35,50,.06)", color:"rgba(26,35,50,.55)", border:"1px solid rgba(26,35,50,.12)" },
  revision: { bg:"#e8f2f8",           color:"#1f4862",             border:"1px solid #bdd9ec" },
  completo: { bg:"#f5edcc",           color:"#4e3d21",             border:"1px solid rgba(201,169,97,.35)" },
};

function FilaReciente({ doc, onOpen, last }) {
  const st    = ESTADO_STYLE[doc.estado];
  const label = ELABELS[doc.estado];
  const rel   = doc.diasAtras === 1 ? "Ayer" : "Hace " + doc.diasAtras + " días";
  return (
    <div
      onClick={() => onOpen(doc)}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(26,35,50,.025)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      style={{ display:"flex", alignItems:"center", padding:"10px 16px", gap:14,
               borderBottom: last ? "none" : "1px solid rgba(26,35,50,.06)",
               cursor:"pointer", transition:"background .1s" }}
    >
      <div style={{ width:28, height:28, borderRadius:7, background:"#e8f2f8", flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#3a7ca5" strokeWidth="1.4">
          <rect x="2" y="1" width="12" height="14" rx="2"/>
          <path d="M5 6h6M5 9h6M5 12h4" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"#1a2332",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {doc.titulo} — {doc.parte} — {doc.fecha}
        </div>
        <div style={{ fontSize:11, color:"rgba(26,35,50,.3)", marginTop:1 }}>{rel}</div>
      </div>
      <span style={{ fontSize:11, borderRadius:20, padding:"2px 10px", flexShrink:0,
                     whiteSpace:"nowrap", background:st.bg, color:st.color, border:st.border }}>
        {label}
      </span>
    </div>
  );
}

export function SelectorScreen({ onGo }) {
  const [selected, setSelected] = useState("Certificación de firma");
  const [familia,  setFamilia]  = useState("");
  const [query,    setQuery]    = useState("");
  const [abierto,  setAbierto]  = useState(false);

  const filtrados = query.trim() === ""
    ? RECIENTES.slice(0, 3)
    : RECIENTES.filter(d =>
        (d.titulo + " " + d.parte + " " + d.fecha)
          .toLowerCase().includes(query.toLowerCase())
      );

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  background:"#f0ece3", fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>

      <NavBar />

      {/* Subheader */}
      <div style={{ background:"#f0ece3", borderBottom:"1px solid rgba(26,35,50,.08)",
                    padding:"10px 24px", display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
        <button onClick={() => onGo("home")}
                style={{ background:"none", border:"none", color:C.muted, fontSize:13,
                         fontFamily:"'Montserrat',sans-serif", padding:0, cursor:"pointer",
                         display:"flex", alignItems:"center", gap:6 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>
        <div style={{ width:1, height:14, background:"rgba(26,35,50,.15)" }}/>
        <span style={{ fontSize:13, fontWeight:600, color:C.dark }}>Seleccioná el instrumento</span>
      </div>

      {/* Contenido scrolleable */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 100px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", flexDirection:"column", gap:14 }}>

          {/* Favoritos */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid rgba(26,35,50,.08)", padding:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="#c9a961">
                <path d="M8 1l1.8 3.6L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.2-.6z"/>
              </svg>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:".07em",
                            textTransform:"uppercase", color:"rgba(26,35,50,.3)" }}>
                Favoritos
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {FRECUENTES.map(f => (
                <button key={f} onClick={() => setSelected(f)} style={{
                  padding:"7px 14px", borderRadius:20, cursor:"pointer",
                  border: "1px solid " + (selected === f ? C.cerulean : "rgba(26,35,50,.18)"),
                  background: selected === f ? C.ceruleanLight : "transparent",
                  color: selected === f ? "#1f4862" : "#1a2332",
                  fontSize:13, fontWeight: selected === f ? 600 : 400,
                  fontFamily:"'Montserrat',sans-serif", transition:"all .12s",
                }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Por familia */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid rgba(26,35,50,.08)", padding:18 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase",
                          color:"rgba(26,35,50,.3)", marginBottom:12 }}>
              O buscá por familia
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Fg label="Familia">
                <select style={inp} value={familia} onChange={e => setFamilia(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="cert">Certificaciones</option>
                  <option value="acta">Actas notariales</option>
                  <option value="escritura">Escrituras públicas</option>
                  <option value="traslado">Traslados</option>
                </select>
              </Fg>
              <Fg label="Instrumento">
                <select style={inp} disabled={!familia} onChange={e => setSelected(e.target.value)}>
                  <option>— elegí familia primero</option>
                  {familia && INSTRUMENTOS[familia]?.map(i => <option key={i}>{i}</option>)}
                </select>
              </Fg>
            </div>
          </div>

          {/* Documentos recientes colapsable */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid rgba(26,35,50,.08)", overflow:"hidden" }}>
            <button
              onClick={() => setAbierto(!abierto)}
              style={{ width:"100%", padding:"13px 16px", display:"flex", alignItems:"center",
                       justifyContent:"space-between", background:"none", border:"none",
                       cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#3a7ca5" strokeWidth="1.4">
                  <rect x="2" y="1" width="12" height="14" rx="2"/>
                  <path d="M5 6h6M5 9h6M5 12h4" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize:13, fontWeight:600, color:"#1a2332" }}>Abrir documento existente</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                   stroke="rgba(26,35,50,.4)" strokeWidth="1.5"
                   style={{ transform: abierto ? "rotate(180deg)" : "rotate(0deg)", transition:"transform .2s" }}>
                <path d="M3 6l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {abierto && (
              <div style={{ borderTop:"1px solid rgba(26,35,50,.07)", padding:"12px 16px 14px" }}>
                <div style={{ position:"relative", marginBottom:10 }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
                       stroke="rgba(26,35,50,.35)" strokeWidth="1.5"
                       style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                    <circle cx="7" cy="7" r="4.5"/>
                    <path d="M10.5 10.5l3 3" strokeLinecap="round"/>
                  </svg>
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar por nombre, parte o fecha..."
                    style={{ width:"100%", padding:"8px 12px 8px 30px", borderRadius:8,
                             border:"1px solid rgba(26,35,50,.14)", background:"#FDFCFA",
                             fontSize:13, color:"#1a2332", fontFamily:"'Montserrat',sans-serif",
                             boxSizing:"border-box", outline:"none" }}/>
                  {query && (
                    <button onClick={() => setQuery("")}
                            style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)",
                                     background:"none", border:"none", cursor:"pointer",
                                     color:"rgba(26,35,50,.4)", fontSize:16, lineHeight:1, padding:0 }}>
                      ×
                    </button>
                  )}
                </div>
                <div style={{ borderRadius:8, border:"1px solid rgba(26,35,50,.08)", overflow:"hidden" }}>
                  {filtrados.length > 0 ? (
                    filtrados.map((doc, idx) => (
                      <FilaReciente key={doc.id} doc={doc}
                                    last={idx === filtrados.length - 1}
                                    onOpen={() => onGo("editor")} />
                    ))
                  ) : (
                    <div style={{ padding:"20px 16px", textAlign:"center",
                                  color:"rgba(26,35,50,.35)", fontSize:13 }}>
                      No se encontraron documentos para "{query}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* FAB flotante */}
      <div style={{ position:"fixed", bottom:24, left:1130, transform:"translateX(-50%)" }}>


        
        <button
          onClick={() => onGo("editor")}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 24px",
                   background:C.cerulean, color:"#fff", border:"none", borderRadius:28,
                   fontSize:14, fontWeight:700, fontFamily:"'Montserrat',sans-serif",
                   cursor:"pointer", boxShadow:"0 4px 20px rgba(58,124,165,.45)",
                   transition:"transform .1s" }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Abrir en editor
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

    </div>
  );
}
