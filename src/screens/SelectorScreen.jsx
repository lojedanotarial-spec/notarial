import { useState, useEffect } from "react";
import { C, ELABELS, inp } from "../constants";
import { NavBar } from "../components/NavBar";
import { Fg } from "../components/ui/FormElements";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";

const FAMILIAS = [
  { key: "cert",           label: "Certificaciones" },
  { key: "autorizaciones", label: "Autorizaciones" },
  { key: "poder",          label: "Poderes" },
  { key: "acta",           label: "Actas notariales" },
  { key: "escritura",      label: "Escrituras públicas" },
  { key: "traslado",       label: "Traslados" },
  { key: "sucesion",       label: "Sucesiones" },
];

const ESTADO_STYLE = {
  borrador: { bg:"rgba(26,35,50,.06)", color:"rgba(26,35,50,.8)",  border:"1px solid rgba(26,35,50,.12)" },
  revision: { bg:"rgba(58,124,165,.1)", color:"#3a7ca5",           border:"1px solid rgba(58,124,165,.3)" },
  completo: { bg:"rgba(201,169,97,.15)", color:"#1a2332",          border:"1px solid rgba(201,169,97,.35)" },
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
  const { usuario, registroActivo } = useAuth();
  const [selected,   setSelected]   = useState(null);       // template row completo
  const [familia,    setFamilia]    = useState("");
  const [query,      setQuery]      = useState("");
  const [abierto,    setAbierto]    = useState(false);
  const [docs,       setDocs]       = useState([]);
  const [templates,  setTemplates]  = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [cargandoTpl,setCargandoTpl]= useState(true);

  // Cargar templates globales — espera a que haya sesión
  useEffect(() => {
    if (!usuario) return;
    async function cargarTemplates() {
      const { data, error } = await supabase
        .from("templates")
        .select("id, nombre, slug, familia, frecuencia, visible")
        .is("registro_id", null)
        .eq("visible", true)
        .order("frecuencia", { ascending: true });
      const lista = data || [];
      setTemplates(lista);
      if (lista.length) setSelected(lista[0]);
      setCargandoTpl(false);
    }
    cargarTemplates();
  }, [usuario]);

  // Cargar documentos recientes
  useEffect(() => {
    if (!usuario || !abierto) return;
    async function cargar() {
      setCargando(true);
      const q = supabase
        .from("documentos")
        .select("id, titulo, estado, updated_at, created_at")
        .order("updated_at", { ascending: false })
        .limit(20);
      if (registroActivo) q.eq("registro_id", registroActivo);
      else q.eq("usuario_id", usuario.id);
      const { data } = await q;
      setDocs(data || []);
      setCargando(false);
    }
    cargar();
  }, [usuario, abierto]);

  const frecuentes = templates.filter(t => t.frecuencia != null && t.frecuencia <= 5);
  const top5       = frecuentes.length ? frecuentes : templates.slice(0, 5);
  const porFamilia = familia ? templates.filter(t => t.familia === familia) : [];
  const filtrados  = query.trim() === ""
    ? docs.slice(0, 5)
    : docs.filter(d => d.titulo?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  background:C.warm, fontFamily:"'Inter', sans-serif", overflow:"hidden" }}>

      <NavBar onGo={onGo} screenTitle="Seleccionar instrumento" />

      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 100px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", flexDirection:"column", gap:14 }}>

          {/* Frecuentes */}
          <div style={{ background:C.porcelain, borderRadius:12, border:"1px solid rgba(26,35,50,.08)", padding:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="#c9a961">
                <path d="M8 1l1.8 3.6L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.2-.6z"/>
              </svg>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:".07em",
                            textTransform:"uppercase", color:"rgba(26,35,50,1)" }}>
                Frecuentes
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {cargandoTpl ? (
                <span style={{ fontSize:13, color:"rgba(26,35,50,.4)" }}>Cargando...</span>
              ) : top5.map(t => (
                <button key={t.id}
                  onClick={() => setSelected(t)}
                  style={{
                    padding:"7px 14px", borderRadius:20, cursor:"pointer",
                    border: "1px solid " + (selected?.id === t.id ? C.cerulean : "rgba(26,35,50,.18)"),
                    background: selected?.id === t.id ? C.ceruleanLight : "transparent",
                    color: selected?.id === t.id ? C.cerulean : "#1a2332",
                    fontSize:13, fontWeight: selected?.id === t.id ? 600 : 400,
                    fontFamily:"'Inter', sans-serif", transition:"all .12s",
                  }}>
                  {t.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Buscar por familia */}
          <div style={{ background:C.porcelain, borderRadius:12, border:"1px solid rgba(26,35,50,.08)", padding:18 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:".07em", textTransform:"uppercase",
                          color:"rgba(26,35,50,1)", marginBottom:12 }}>
              O busca por familia
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Fg label="Familia">
                <select style={inp} value={familia} onChange={e => {
                  const f = e.target.value;
                  setFamilia(f);
                  const primero = templates.find(t => t.familia === f);
                  if (primero) setSelected(primero);
                }}>
                  <option value="">Seleccionar...</option>
                  {FAMILIAS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </Fg>
              <Fg label="Instrumento">
                <select style={inp} disabled={!familia}
                  value={selected?.id || ""}
                  onChange={e => setSelected(porFamilia.find(t => t.id === e.target.value) || null)}>
                  <option value="">— elegí familia primero</option>
                  {porFamilia.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </Fg>
            </div>
          </div>

          {/* Documentos recientes */}
          <div style={{ background:C.porcelain, borderRadius:12, border:"1px solid rgba(26,35,50,.08)", overflow:"hidden" }}>
            <button onClick={() => setAbierto(!abierto)}
              style={{ width:"100%", padding:"13px 16px", display:"flex", alignItems:"center",
                       justifyContent:"space-between", background:"none", border:"none",
                       cursor:"pointer", fontFamily:"'Inter', sans-serif" }}>
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
                             fontSize:13, color:"#1a2332", fontFamily:"'Inter', sans-serif",
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
                      {query ? `No se encontraron documentos para "${query}"` : "No hay documentos todavía."}
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
          disabled={!selected}
          onClick={() => selected && onGo("editor", { templateId: selected.id, templateSlug: selected.slug || selected.nombre })}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 24px",
                   background: selected ? C.cerulean : "rgba(26,35,50,.2)",
                   color:"#fff", border:"none", borderRadius:28,
                   fontSize:14, fontWeight:700, fontFamily:"'Inter', sans-serif",
                   cursor: selected ? "pointer" : "not-allowed",
                   boxShadow: selected ? "0 4px 20px rgba(58,124,165,.45)" : "none",
                   transition:"transform .1s" }}>
          {selected ? `Crear: ${selected.nombre}` : "Seleccioná un instrumento"}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

    </div>
  );
}
