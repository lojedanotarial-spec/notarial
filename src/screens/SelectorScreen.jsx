import { useState, useEffect } from "react";
import { C, INSTRUMENTOS, ELABELS, inp } from "../constants";
import { NavBar } from "../components/NavBar";
import { Fg } from "../components/ui/FormElements";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";

const TEMPLATES = [
  { key: "certFirma",    label: "Certificacion de Firma",       disponible: true  },
  { key: "certFirmaF08", label: "Certificacion de Firma - F08", disponible: true  },
  { key: "poderEspecial",  label: "Poder especial",             disponible: false },
  { key: "actaConst",      label: "Acta de constatacion",       disponible: false },
  { key: "autViaje",       label: "Autorizacion de viaje",      disponible: false },
];

const ESTADO_STYLE = {
  borrador: { bg:"rgba(26,35,50,.06)", color:"rgba(26,35,50,.8)",  border:"1px solid rgba(26,35,50,.12)" },
  revision: { bg:"#e8f2f8",           color:"#1f4862",             border:"1px solid #bdd9ec" },
  completo: { bg:"#f5edcc",           color:"#4e3d21",             border:"1px solid rgba(201,169,97,.35)" },
};

function diasAtras(fechaStr) {
  const diff = Math.floor((Date.now() - new Date(fechaStr).getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return "Hace " + diff + " dias";
}

function FilaDoc({ doc, onOpen, last }) {
  const st = ESTADO_STYLE[doc.estado] || ESTADO_STYLE.borrador;
  return (
    <div onClick={() => onOpen(doc.id)}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(26,35,50,.025)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      style={{ display:"flex", alignItems:"center", padding:"10px 16px", gap:14,
               borderBottom: last ? "none" : "1px solid rgba(26,35,50,.06)",
               cursor:"pointer", transition:"background .1s" }}>
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
          {doc.titulo}
        </div>
        <div style={{ fontSize:11, color:"rgba(26,35,50,.5)", marginTop:1 }}>
          {diasAtras(doc.updated_at || doc.created_at)}
        </div>
      </div>
      <span style={{ fontSize:11, borderRadius:20, padding:"2px 10px", flexShrink:0,
                     whiteSpace:"nowrap", background:st.bg, color:st.color, border:st.border }}>
        {ELABELS[doc.estado] || doc.estado}
      </span>
    </div>
  );
}

export function SelectorScreen({ onGo }) {
  const { usuario } = useAuth();
  const [selected, setSelected] = useState("certFirmaF08");
  const [familia,  setFamilia]  = useState("");
  const [query,    setQuery]    = useState("");
  const [abierto,  setAbierto]  = useState(false);
  const [docs,     setDocs]     = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!usuario || !abierto) return;
    async function cargar() {
      setCargando(true);
      const { data } = await supabase
        .from("documentos")
        .select("id, titulo, estado, updated_at, created_at")
        .eq("usuario_id", usuario.id)
        .order("updated_at", { ascending: false })
        .limit(20);
      setDocs(data || []);
      setCargando(false);
    }
    cargar();
  }, [usuario, abierto]);

  const filtrados = query.trim() === ""
    ? docs.slice(0, 5)
    : docs.filter(d => d.titulo?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  background:"#f0ece3", fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>

      <NavBar onGo={onGo} screenTitle="Seleccionar instrumento" />

      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 100px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", flexDirection:"column", gap:14 }}>

          <div style={{ background:"#fff", borderRadius:12, border:"1px solid rgba(26,35,50,.08)", padding:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="#c9a961">
                <path d="M8 1l1.8 3.6L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.2-.6z"/>
              </svg>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:".07em",
                            textTransform:"uppercase", color:"rgba(26,35,50,1)" }}>
                Favoritos
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {TEMPLATES.map(t => (
                <button key={t.key} disabled={!t.disponible}
                  onClick={() => t.disponible && setSelected(t.key)}
                  style={{
                    padding:"7px 14px", borderRadius:20,
                    cursor: t.disponible ? "pointer" : "not-allowed",
                    border: "1px solid " + (!t.disponible ? "rgba(26,35,50,.08)" : selected === t.key ? C.cerulean : "rgba(26,35,50,.18)"),
                    background: !t.disponible ? "rgba(26,35,50,.03)" : selected === t.key ? C.ceruleanLight : "transparent",
                    color: !t.disponible ? "rgba(26,35,50,.3)" : selected === t.key ? "#1f4862" : "#1a2332",
                    fontSize:13, fontWeight: selected === t.key ? 600 : 400,
                    fontFamily:"'Montserrat',sans-serif", transition:"all .12s",
                    display:"flex", alignItems:"center", gap:6,
                  }}>
                  {t.label}
                  {!t.disponible && (
                    <span style={{ fontSize:9, fontWeight:600, letterSpacing:".05em",
                                   color:"rgba(26,35,50,1)", textTransform:"uppercase" }}>pronto</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background:"#fff", borderRadius:12, border:"1px solid rgba(26,35,50,.08)", padding:18 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase",
                          color:"rgba(26,35,50,1)", marginBottom:12 }}>
              O busca por familia
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Fg label="Familia">
                <select style={inp} value={familia} onChange={e => setFamilia(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="cert">Certificaciones</option>
                  <option value="acta">Actas notariales</option>
                  <option value="escritura">Escrituras publicas</option>
                  <option value="traslado">Traslados</option>
                </select>
              </Fg>
              <Fg label="Instrumento">
                <select style={inp} disabled={!familia} onChange={e => setSelected(e.target.value)}>
                  <option>- elegi familia primero</option>
                  {familia && INSTRUMENTOS[familia]?.map(i => <option key={i}>{i}</option>)}
                </select>
              </Fg>
            </div>
          </div>

          <div style={{ background:"#fff", borderRadius:12, border:"1px solid rgba(26,35,50,.08)", overflow:"hidden" }}>
            <button onClick={() => setAbierto(!abierto)}
              style={{ width:"100%", padding:"13px 16px", display:"flex", alignItems:"center",
                       justifyContent:"space-between", background:"none", border:"none",
                       cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
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
                    placeholder="Buscar por nombre..."
                    style={{ width:"100%", padding:"8px 12px 8px 30px", borderRadius:8,
                             border:"1px solid rgba(26,35,50,.14)", background:"#FDFCFA",
                             fontSize:13, color:"#1a2332", fontFamily:"'Montserrat',sans-serif",
                             boxSizing:"border-box", outline:"none" }}/>
                  {query && (
                    <button onClick={() => setQuery("")}
                            style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)",
                                     background:"none", border:"none", cursor:"pointer",
                                     color:"rgba(26,35,50,1)", fontSize:16, lineHeight:1, padding:0 }}>×</button>
                  )}
                </div>
                <div style={{ borderRadius:8, border:"1px solid rgba(26,35,50,.08)", overflow:"hidden" }}>
                  {cargando ? (
                    <div style={{ padding:"20px 16px", textAlign:"center", color:"rgba(26,35,50,.5)", fontSize:13 }}>
                      Cargando...
                    </div>
                  ) : filtrados.length > 0 ? (
                    filtrados.map((doc, idx) => (
                      <FilaDoc key={doc.id} doc={doc}
                               last={idx === filtrados.length - 1}
                               onOpen={id => onGo("editor", { docId: id })} />
                    ))
                  ) : (
                    <div style={{ padding:"20px 16px", textAlign:"center", color:"rgba(26,35,50,.5)", fontSize:13 }}>
                      {query ? "No se encontraron documentos para \"" + query + "\"" : "No hay documentos todavía."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)" }}>
        <button
          onClick={() => onGo("editor", { templateKey: selected })}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 24px",
                   background:C.cerulean, color:"#fff", border:"none", borderRadius:28,
                   fontSize:14, fontWeight:700, fontFamily:"'Montserrat',sans-serif",
                   cursor:"pointer", boxShadow:"0 4px 20px rgba(58,124,165,.45)",
                   transition:"transform .1s" }}>
          Abrir en editor
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

    </div>
  );
}
