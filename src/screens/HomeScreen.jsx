import { useState } from "react";
import { C, ELABELS } from "../constants";
import { T, R, S } from "../theme";
import { NavBar } from "../components/NavBar";

const RECIENTES = [
  { id:1, titulo:"Certificación de firma", parte:"GARCÍA",    fecha:"11/04/2026", diasAtras:2,  estado:"revision" },
  { id:2, titulo:"Certificación de firma", parte:"RODRÍGUEZ", fecha:"10/04/2026", diasAtras:3,  estado:"completo" },
  { id:3, titulo:"Poder especial",         parte:"LÓPEZ",     fecha:"08/04/2026", diasAtras:5,  estado:"borrador" },
  { id:4, titulo:"Acta de constatación",   parte:"FERNÁNDEZ", fecha:"05/04/2026", diasAtras:8,  estado:"completo" },
  { id:5, titulo:"Poder general",          parte:"DÍAZ",      fecha:"02/04/2026", diasAtras:11, estado:"borrador" },
];

const ESTADO_STYLE = {
  borrador: { bg:"rgba(26,35,50,.06)", color:"rgba(26,35,50,.55)", border:"1px solid rgba(26,35,50,.12)" },
  revision: { bg:"#e8f2f8",           color:"#1f4862",             border:"1px solid #bdd9ec" },
  completo: { bg:"#f5edcc",           color:"#4e3d21",             border:"1px solid rgba(201,169,97,.35)" },
};

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function fechaHoy() {
  const DIAS  = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const d = new Date();
  const dia = DIAS[d.getDay()];
  return dia.charAt(0).toUpperCase() + dia.slice(1) + " " + d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear();
}

function FilaReciente({ doc, onOpen, last }) {
  const st    = ESTADO_STYLE[doc.estado];
  const label = ELABELS[doc.estado];
  const rel   = doc.diasAtras === 1 ? "Ayer" : "Hace " + doc.diasAtras + " días";
  return (
    <div
      onClick={() => onOpen(doc)}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(26,35,50,.025)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      style={{ display:"flex", alignItems:"center", padding:"11px 16px", gap:S.md,
               borderBottom: last ? "none" : "1px solid rgba(26,35,50,.06)",
               cursor:"pointer", transition:"background .1s" }}
    >
      <div style={{ width:30, height:30, borderRadius:R.md, background:C.ceruleanLight, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={C.cerulean} strokeWidth="1.4">
          <rect x="2" y="1" width="12" height="14" rx="2"/>
          <path d="M5 6h6M5 9h6M5 12h4" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ ...T.l1, fontSize:13, fontWeight:500,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {doc.titulo} — {doc.parte} — {doc.fecha}
        </div>
        <div style={{ ...T.l2, marginTop:2 }}>{rel}</div>
      </div>
      <span style={{ ...T.l2, borderRadius:R.xl, padding:"2px 10px", flexShrink:0,
                     whiteSpace:"nowrap", background:st.bg, color:st.color, border:st.border }}>
        {label}
      </span>
    </div>
  );
}

export function HomeScreen({ onGo }) {
  const [query, setQuery] = useState("");

  const filtrados = query.trim() === ""
    ? RECIENTES.slice(0, 3)
    : RECIENTES.filter(d =>
        (d.titulo + " " + d.parte + " " + d.fecha)
          .toLowerCase().includes(query.toLowerCase())
      );

  const buscando = query.trim() !== "";

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  background:C.warm, fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>
      <NavBar />

      <div style={{ flex:1, overflowY:"auto", display:"flex", justifyContent:"center", padding:"28px 24px" }}>
        <div style={{ width:"100%", maxWidth:900, display:"flex", flexDirection:"column", gap:S.xl }}>

          {/* Saludo */}
          <div>
            <h1 style={{ fontSize:22, fontWeight:600, color:C.dark, margin:"0 0 3px", letterSpacing:"-.02em" }}>
              {saludo()}, Fátima
            </h1>
            <p style={{ ...T.l2, margin:0 }}>{fechaHoy()}</p>
          </div>

          {/* Cards de acción */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:S.md }}>
            <button
              onClick={() => onGo("selector")}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(26,35,50,.1)"; e.currentTarget.style.borderColor = "rgba(26,35,50,.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(26,35,50,.08)"; }}
              style={{ padding:"18px 20px", textAlign:"left", background:"#fff", borderRadius:R.lg,
                       border:"1px solid rgba(26,35,50,.08)", cursor:"pointer",
                       transition:"box-shadow .15s, border-color .15s",
                       fontFamily:"'Montserrat',sans-serif", display:"flex", alignItems:"center", gap:S.md }}
            >
              <div style={{ width:40, height:40, borderRadius:R.md, background:C.warm, flexShrink:0,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke={C.dark} strokeWidth="1.5" style={{ opacity:0.5 }}>
                  <rect x="6" y="4" width="20" height="24" rx="3"/>
                  <path d="M11 11h10M11 16h10M11 21h6" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div style={{ ...T.l1, marginBottom:3 }}>Documento individual</div>
                <div style={{ ...T.l2, lineHeight:1.5 }}>
                  Crear un documento a partir de un modelo notarial.
                </div>
              </div>
            </button>

            <div style={{ padding:"18px 20px", background:C.cerulean, borderRadius:R.lg,
                          cursor:"not-allowed", display:"flex", alignItems:"center", gap:S.md, opacity:0.85 }}>
              <div style={{ width:40, height:40, borderRadius:R.md, background:"rgba(255,255,255,.15)", flexShrink:0,
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="1.5">
                  <rect x="4" y="8" width="18" height="20" rx="3"/>
                  <rect x="10" y="4" width="18" height="20" rx="3"/>
                </svg>
              </div>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:S.sm, marginBottom:3 }}>
                  <span style={{ ...T.l1, color:"#fff" }}>Carga masiva</span>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,.65)",
                                 background:"rgba(0,0,0,.15)", padding:"2px 8px", borderRadius:R.xl }}>
                    Próximamente
                  </span>
                </div>
                <div style={{ ...T.l2, color:"rgba(255,255,255,.75)", lineHeight:1.5 }}>
                  Generar múltiples documentos homogéneos.
                </div>
              </div>
            </div>
          </div>

          {/* Buscador + Recientes */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:S.sm }}>
              <div style={{ ...T.l3 }}>
                {buscando ? "Resultados" : "Recientes"}
              </div>
              {!buscando && (
                <button style={{ background:"none", border:"none", ...T.l2, color:C.cerulean,
                                 fontFamily:"'Montserrat',sans-serif", cursor:"pointer", padding:0, fontWeight:500 }}>
                  Ver todos
                </button>
              )}
            </div>

            <div style={{ position:"relative", marginBottom:S.sm }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(26,35,50,.35)" strokeWidth="1.5"
                   style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                <circle cx="7" cy="7" r="4.5"/>
                <path d="M10.5 10.5l3 3" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nombre, parte o fecha..."
                style={{ width:"100%", padding:"9px 12px 9px 34px", borderRadius:R.md,
                         border:"1px solid " + C.border, background:"#fff",
                         fontSize:T.l1.fontSize - 1, color:C.dark,
                         fontFamily:"'Montserrat',sans-serif",
                         boxSizing:"border-box", outline:"none" }}
              />
              {buscando && (
                <button onClick={() => setQuery("")}
                        style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                                 background:"none", border:"none", cursor:"pointer", color:C.faint,
                                 fontSize:16, lineHeight:1, padding:0 }}>
                  ×
                </button>
              )}
            </div>

            <div style={{ background:"#fff", borderRadius:R.lg, border:"1px solid rgba(26,35,50,.08)", overflow:"hidden" }}>
              {filtrados.length > 0 ? (
                filtrados.map((doc, idx) => (
                  <FilaReciente key={doc.id} doc={doc} last={idx === filtrados.length - 1} onOpen={() => {}} />
                ))
              ) : (
                <div style={{ padding:"28px 16px", textAlign:"center", ...T.l2 }}>
                  No se encontraron documentos para "{query}"
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
