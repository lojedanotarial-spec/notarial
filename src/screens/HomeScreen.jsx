import { useState, useEffect, useCallback } from "react";
import { C, ELABELS } from "../constants";
import { T, R, S } from "../theme";
import { NavBar } from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const POR_PAG = 8;

const ESTADO_STYLE = {
  borrador: { bg:"rgba(26,35,50,.06)", color:"rgba(26,35,50,.8)",  border:"1px solid rgba(26,35,50,.12)" },
  revision: { bg:"rgba(58,124,165,.1)", color:"#3a7ca5",           border:"1px solid rgba(58,124,165,.3)" },
  completo: { bg:"rgba(201,169,97,.15)", color:"#1a2332",          border:"1px solid rgba(201,169,97,.35)" },
};

const TIPO_LABEL = {
  certFirma:    "Cert. de firma",
  certFirmaF08: "Cert. F08",
  poderEspecial:"Poder especial",
  poderGeneral: "Poder general",
  actaConst:    "Acta",
  autViaje:     "Aut. de viaje",
  compraventa:  "Compraventa",
};


// ── HELPERS ───────────────────────────────────────────────────────────────────
function saludo() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function fechaHoy() {
  const DIAS  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const d = new Date();
  return DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear();
}

function diasAtras(fechaStr) {
  const diff = Math.floor((Date.now() - new Date(fechaStr).getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return "Hace " + diff + " días";
}

function fmtFecha(str) {
  if (!str) return "-";
  const d = new Date(str);
  return String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0") + "/" + d.getFullYear();
}

// ── SUBCOMPONENTES ────────────────────────────────────────────────────────────
function Badge({ estado }) {
  const st = ESTADO_STYLE[estado] || ESTADO_STYLE.borrador;
  return (
    <span style={{ fontSize:11, borderRadius:20, padding:"2px 10px",
                   whiteSpace:"nowrap", fontWeight:600,
                   background:st.bg, color:st.color, border:st.border }}>
      {ELABELS[estado] || estado}
    </span>
  );
}

function TipoPill({ templateKey }) {
  const label = TIPO_LABEL[templateKey] || templateKey || "—";
  return (
    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:5, fontWeight:500,
                   background:"rgba(26,35,50,.05)", color:"rgba(26,35,50,.7)",
                   border:"1px solid rgba(26,35,50,.1)", whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function StatCard({ num, label, color }) {
  return (
    <div style={{ background:C.porcelain, borderRadius:R.md, border:"1px solid rgba(26,35,50,.08)",
                  padding:"10px 14px", flex:1 }}>
      <div style={{ fontSize:20, fontWeight:700, color: color || C.dark }}>{num}</div>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase",
                    color:"rgba(26,35,50,.45)", marginTop:2 }}>{label}</div>
    </div>
  );
}

function SideSection({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase",
                    color:"rgba(26,35,50,.5)", marginBottom:6 }}>{label}</div>
      <div style={{ background:C.porcelain, borderRadius:R.md, border:"1px solid rgba(26,35,50,.08)", overflow:"hidden" }}>
        {children}
      </div>
    </div>
  );
}

function FilterItem({ label, count, active, onClick }) {
  return (
    <div onClick={onClick}
         onMouseEnter={e => !active && (e.currentTarget.style.background = "rgba(26,35,50,.03)")}
         onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}
         style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", cursor:"pointer",
                  background: active ? "rgba(58,124,165,.1)" : "transparent", transition:"background .1s" }}>
      <span style={{ flex:1, fontSize:12, fontWeight: active ? 600 : 400,
                     color: active ? C.cerulean : C.dark }}>{label}</span>
      {count != null && (
        <span style={{ fontSize:11, color:"rgba(26,35,50,.4)", fontWeight:600 }}>{count}</span>
      )}
    </div>
  );
}

function ConfirmDelete({ titulo, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(26,35,50,.45)", zIndex:1000,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.porcelain, borderRadius:R.lg, padding:"28px 28px 20px",
                    width:360, boxShadow:"0 8px 32px rgba(26,35,50,.18)" }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.dark, marginBottom:8 }}>
          Eliminar documento
        </div>
        <div style={{ fontSize:13, color:"rgba(26,35,50,.6)", marginBottom:20, lineHeight:1.5 }}>
          ¿Confirmás que querés eliminar <strong style={{ color:C.dark }}>{titulo}</strong>?
          Esta acción no se puede deshacer.
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel}
                  style={{ padding:"7px 16px", borderRadius:7, border:"1px solid rgba(26,35,50,.14)",
                           background:"transparent", fontSize:13, fontWeight:600, color:C.dark,
                           cursor:"pointer", fontFamily:"'Inter', sans-serif" }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
                  style={{ padding:"7px 16px", borderRadius:7, border:"1px solid #e07070",
                           background:"#fdf0f0", fontSize:13, fontWeight:700, color:"#c0392b",
                           cursor:"pointer", fontFamily:"'Inter', sans-serif" }}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaDoc({ doc, onOpen, onDelete, last }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display:"grid", gridTemplateColumns:"2fr 100px 110px 80px 90px 32px",
               gap:0, padding:"10px 16px", alignItems:"center",
               borderBottom: last ? "none" : "1px solid rgba(26,35,50,.05)",
               background: hover ? "rgba(26,35,50,.02)" : "transparent",
               transition:"background .1s", cursor:"pointer" }}
      onClick={() => onOpen(doc.id)}
    >
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.dark,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {doc.titulo}
        </div>
        <div style={{ fontSize:11, color:"rgba(26,35,50,.5)", marginTop:2 }}>
          {diasAtras(doc.updated_at || doc.created_at)}
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center" }}><TipoPill templateKey={doc.template_key} /></div>
      <div style={{ display:"flex", alignItems:"center", fontSize:11, color:"rgba(26,35,50,.65)" }}>
        {doc.contenido?.escribano?.nombre || "—"}
      </div>
      <div style={{ display:"flex", alignItems:"center", fontSize:11, color:"rgba(26,35,50,.65)" }}>{fmtFecha(doc.updated_at)}</div>
      <div style={{ display:"flex", alignItems:"center" }}><Badge estado={doc.estado} /></div>
      <div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(doc); }}
          title="Eliminar"
          style={{ width:26, height:26, borderRadius:5, border:"1px solid transparent",
                   background:"transparent", cursor:"pointer", display:"flex",
                   alignItems:"center", justifyContent:"center",
                   opacity: 1 }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fdf0f0"; e.currentTarget.style.borderColor = "#e07070"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── SCREEN PRINCIPAL ──────────────────────────────────────────────────────────
export function HomeScreen({ onGo }) {
  const { miUsuario, usuario, registroActivo } = useAuth();
  const esAdmin = usuario?.is_admin;

  // datos
  const [docs, setDocs]         = useState([]);
  const [cargando, setCargando] = useState(true);

  // filtros
  const [query,      setQuery]      = useState("");
  const [queryDni,   setQueryDni]   = useState("");
  const [fEstado,    setFEstado]    = useState("");
  const [fTipo,      setFTipo]      = useState("");
  const [fEscribano, setFEscribano] = useState("");
  const [fDesde,     setFDesde]     = useState("");
  const [fHasta,     setFHasta]     = useState("");

  // ui
  const [pagina,      setPagina]      = useState(1);
  const [confirmDel,  setConfirmDel]  = useState(null); // doc a eliminar

  // ── CARGA ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!usuario) return;
    async function cargar() {
      console.log("cargar() — registroActivo:", registroActivo, "usuario:", usuario?.id);
      setCargando(true);
      const query = supabase
        .from("documentos")
        .select("id, titulo, estado, template_key, contenido, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);

      if (registroActivo) {
        query.eq("registro_id", registroActivo);
      } else {
        query.eq("usuario_id", usuario.id);
      }

      const { data } = await query;
      setDocs((data || []).filter(d => d.template_key !== "escrituraBarrio"));
      setCargando(false);
    }
    cargar();
  }, [usuario, registroActivo]);

  // ── FILTRADO ───────────────────────────────────────────────────────────────
  const filtrados = useCallback(() => {
    const q   = query.trim().toLowerCase();
    const dni = queryDni.replace(/\D/g, "");
    return docs.filter(d => {
      if (fEstado && d.estado !== fEstado) return false;
      if (fTipo   && d.template_key !== fTipo) return false;
      if (fEscribano) {
        const esc = d.contenido?.escribano?.nombre?.toUpperCase() || "";
        if (!esc.includes(fEscribano)) return false;
      }
      if (fDesde && (d.updated_at || "").slice(0,10) < fDesde) return false;
      if (fHasta && (d.updated_at || "").slice(0,10) > fHasta) return false;
      if (q && !d.titulo?.toLowerCase().includes(q)) return false;
      if (dni) {
        const partes = d.contenido?.partes || [];
        if (!partes.some(p => (p.nroDoc || "").replace(/\D/g, "").includes(dni))) return false;
      }
      return true;
    });
  }, [docs, query, queryDni, fEstado, fTipo, fEscribano, fDesde, fHasta]);

  const lista = filtrados();
  const totalPags = Math.max(1, Math.ceil(lista.length / POR_PAG));
  const paginaReal = Math.min(pagina, totalPags);
  const visibles = lista.slice((paginaReal - 1) * POR_PAG, paginaReal * POR_PAG);

  const resetPag = () => setPagina(1);

  // contadores para sidebar
  const cnt = (key, val) => docs.filter(d => d[key] === val).length;

  // ── BORRADO ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDel) return;
    await supabase.from("documentos").delete().eq("id", confirmDel.id);
    setDocs(prev => prev.filter(d => d.id !== confirmDel.id));
    setConfirmDel(null);
  }

  const nombre = miUsuario?.nombre_preferido || miUsuario?.nombre || "";
  const hayFiltros = fEstado || fTipo || fEscribano || fDesde || fHasta || query || queryDni;

  const escribanosFiltro = [...new Set(
    docs.map(d => d.contenido?.escribano?.nombre).filter(Boolean)
  )].map(nombre => {
    const apellido = nombre.trim().split(" ").pop().toUpperCase();
    return { val: apellido, label: nombre.trim() };
  });

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  background:C.warm, fontFamily:"'Inter', sans-serif", overflow:"hidden" }}>
      <NavBar onGo={onGo} />

      <div style={{ flex:1, overflow:"hidden", display:"flex" }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <div style={{ width:210, flexShrink:0, overflowY:"auto", padding:"20px 14px",
                      borderRight:"1px solid rgba(26,35,50,.08)", background:"#faf8f4",
                      display:"flex", flexDirection:"column", gap:14 }}>

          <SideSection label="Estado">
            {[["", "Todos", docs.length], ["borrador","Borrador", cnt("estado","borrador")],
              ["revision","En revisión", cnt("estado","revision")], ["completo","Completo", cnt("estado","completo")]
            ].map(([val, label, count]) => (
              <FilterItem key={val} label={label} count={count}
                          active={fEstado === val}
                          onClick={() => { setFEstado(val); resetPag(); }} />
            ))}
          </SideSection>

          <SideSection label="Tipo">
            <FilterItem label="Todos" count={docs.length} active={fTipo === ""}
                        onClick={() => { setFTipo(""); resetPag(); }} />
            {[...new Set(docs.map(d => d.template_key).filter(Boolean))].map(key => (
              <FilterItem key={key}
                          label={TIPO_LABEL[key] || key}
                          count={docs.filter(d => d.template_key === key).length}
                          active={fTipo === key}
                          onClick={() => { setFTipo(key); resetPag(); }} />
            ))}
          </SideSection>

          <SideSection label="Escribano">
            {[{ val: "", label: "Todos" }, ...escribanosFiltro].map(({ val, label }) => (
              <FilterItem key={val} label={label} active={fEscribano === val}
                          onClick={() => { setFEscribano(val); resetPag(); }} />
            ))}
          </SideSection>

          <SideSection label="Rango de fechas">
            <div style={{ padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 }}>
              {[["Desde", fDesde, setFDesde], ["Hasta", fHasta, setFHasta]].map(([label, val, setter]) => (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, color:"rgba(26,35,50,.5)", width:34 }}>{label}</span>
                  <input type="date" value={val}
                         onChange={e => { setter(e.target.value); resetPag(); }}
                         style={{ flex:1, padding:"4px 6px", border:"1px solid rgba(26,35,50,.14)",
                                  borderRadius:5, fontSize:11, color:C.dark,
                                  fontFamily:"'Inter', sans-serif", background:"#FDFCFA", outline:"none" }} />
                </div>
              ))}
              {(fDesde || fHasta) && (
                <button onClick={() => { setFDesde(""); setFHasta(""); resetPag(); }}
                        style={{ fontSize:11, color:"rgba(26,35,50,.4)", background:"none",
                                 border:"none", cursor:"pointer", textAlign:"left",
                                 fontFamily:"'Inter', sans-serif", padding:0 }}>
                  Limpiar fechas
                </button>
              )}
            </div>
          </SideSection>
        </div>

        {/* ── CONTENIDO PRINCIPAL ─────────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:"auto", padding:"24px 24px" }}>
          <div style={{ maxWidth:860, margin:"0 auto", display:"flex", flexDirection:"column", gap:S.lg }}>

            {/* Saludo */}
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:20, fontWeight:700, color:C.dark, margin:"0 0 3px", letterSpacing:"-.02em" }}>
                  {saludo()}, {nombre}
                </h1>
                <p style={{ ...T.l2, margin:0 }}>{fechaHoy()}</p>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {esAdmin && (
                  <button onClick={() => onGo("admin")}
                          style={{ padding:"8px 14px", borderRadius:8, border:"1px solid rgba(26,35,50,.12)",
                                   background:C.porcelain, fontSize:13, fontWeight:600, color:C.dark,
                                   cursor:"pointer", fontFamily:"'Inter', sans-serif",
                                   display:"flex", alignItems:"center", gap:6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    Admin
                  </button>
                )}
                <button onClick={() => onGo("bulk")}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(26,35,50,.05)"}
                        onMouseLeave={e => e.currentTarget.style.background = C.porcelain}
                        style={{ padding:"8px 16px", borderRadius:8, border:"1px solid rgba(26,35,50,.12)",
                                 background:C.porcelain, fontSize:13, fontWeight:600, color:C.dark,
                                 cursor:"pointer", fontFamily:"'Inter', sans-serif", transition:"background .12s" }}>
                  Carga masiva
                </button>
                <button onClick={() => onGo("selector")}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = ".88"}
                        style={{ padding:"8px 16px", borderRadius:8, border:"none",
                                 background:C.cerulean, fontSize:13, fontWeight:600, color:"#fff",
                                 cursor:"pointer", fontFamily:"'Inter', sans-serif",
                                 opacity:.88, transition:"opacity .12s" }}>
                  + Documento
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display:"flex", gap:8 }}>
              <StatCard num={docs.length} label="Total" />
              <StatCard num={cnt("estado","revision")} label="En revisión" color={cnt("estado","revision") > 0 ? C.cerulean : undefined} />
              <StatCard num={cnt("estado","completo")} label="Completos"   color={cnt("estado","completo") > 0 ? "#c9a961" : undefined} />
              <StatCard num={cnt("estado","borrador")} label="Borradores"  color={cnt("estado","borrador") > 0 ? "rgba(26,35,50,.6)" : undefined} />
            </div>

            {/* Buscadores */}
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1, position:"relative" }}>
                <svg style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                     width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(26,35,50,.35)" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3" strokeLinecap="round"/>
                </svg>
                <input value={query} onChange={e => { setQuery(e.target.value); resetPag(); }}
                       placeholder="Buscar por nombre del documento..."
                       style={{ width:"100%", padding:"8px 12px 8px 30px", borderRadius:R.md,
                                border:"1px solid " + C.border, background:C.porcelain, fontSize:13,
                                color:C.dark, fontFamily:"'Inter', sans-serif",
                                boxSizing:"border-box", outline:"none" }} />
                {query && (
                  <button onClick={() => { setQuery(""); resetPag(); }}
                          style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)",
                                   background:"none", border:"none", cursor:"pointer",
                                   color:"rgba(26,35,50,.4)", fontSize:16, lineHeight:1, padding:0 }}>×</button>
                )}
              </div>
              <div style={{ position:"relative" }}>
                <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                     width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(26,35,50,.35)" strokeWidth="1.5">
                  <rect x="2" y="4" width="12" height="9" rx="2"/>
                  <path d="M5 8h6M5 11h4" strokeLinecap="round"/>
                </svg>
                <input value={queryDni} onChange={e => { setQueryDni(e.target.value.replace(/\D/g,"")); resetPag(); }}
                       placeholder="DNI de parte..."
                       style={{ width:150, padding:"8px 10px 8px 30px", borderRadius:R.md,
                                border:"1px solid " + C.border, background:C.porcelain, fontSize:13,
                                color:C.dark, fontFamily:"'Inter', sans-serif", outline:"none" }} />
              </div>
              {hayFiltros && (
                <button onClick={() => { setQuery(""); setQueryDni(""); setFEstado(""); setFTipo(""); setFEscribano(""); setFDesde(""); setFHasta(""); resetPag(); }}
                        style={{ padding:"8px 12px", borderRadius:R.md, border:"1px solid rgba(26,35,50,.12)",
                                 background:"transparent", fontSize:12, fontWeight:600, color:"rgba(26,35,50,.5)",
                                 cursor:"pointer", fontFamily:"'Inter', sans-serif", whiteSpace:"nowrap" }}>
                  Limpiar todo
                </button>
              )}
            </div>

            {/* Tabla */}
            <div style={{ background:C.porcelain, borderRadius:R.lg, border:"1px solid rgba(26,35,50,.08)", overflow:"hidden" }}>

              {/* Header tabla */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 100px 110px 80px 90px 32px",
                            padding:"8px 16px", borderBottom:"2px solid rgba(26,35,50,.07)", background:C.warm }}>
                {["Documento","Tipo","Escribano","Fecha","Estado",""].map(h => (
                  <div key={h} style={{ fontSize:10, fontWeight:700, letterSpacing:".06em",
                                        textTransform:"uppercase", color:"rgba(26,35,50,.4)" }}>{h}</div>
                ))}
              </div>

              {cargando ? (
                <div style={{ padding:"36px 16px", textAlign:"center", ...T.l2 }}>Cargando...</div>
              ) : visibles.length > 0 ? (
                visibles.map((doc, idx) => (
                  <FilaDoc key={doc.id} doc={doc} last={idx === visibles.length - 1}
                           onOpen={id => onGo("editor", { docId: id })}
                           onDelete={doc => setConfirmDel(doc)} />
                ))
              ) : (
                <div style={{ padding:"36px 16px", textAlign:"center", ...T.l2 }}>
                  {hayFiltros ? "No se encontraron documentos con esos filtros." : "No hay documentos todavía."}
                </div>
              )}

              {/* Paginación */}
              {lista.length > POR_PAG && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                              padding:"10px 16px", borderTop:"1px solid rgba(26,35,50,.07)", background:C.warm }}>
                  <span style={{ fontSize:12, color:"rgba(26,35,50,.5)" }}>
                    {(paginaReal-1)*POR_PAG+1}–{Math.min(paginaReal*POR_PAG, lista.length)} de {lista.length}
                  </span>
                  <div style={{ display:"flex", gap:4 }}>
                    <button disabled={paginaReal === 1} onClick={() => setPagina(p => p - 1)}
                            style={{ padding:"4px 10px", borderRadius:5, border:"1px solid rgba(26,35,50,.14)",
                                     background:"transparent", fontSize:12, color:C.dark, cursor:"pointer",
                                     fontFamily:"'Inter', sans-serif", opacity: paginaReal===1 ? .35 : 1 }}>←</button>
                    {Array.from({length: totalPags}, (_,i) => i+1).map(n => (
                      <button key={n} onClick={() => setPagina(n)}
                              style={{ padding:"4px 10px", borderRadius:5, fontSize:12, cursor:"pointer",
                                       fontFamily:"'Inter', sans-serif",
                                       border: n === paginaReal ? "none" : "1px solid rgba(26,35,50,.14)",
                                       background: n === paginaReal ? C.cerulean : "transparent",
                                       color: n === paginaReal ? "#fff" : C.dark }}>
                        {n}
                      </button>
                    ))}
                    <button disabled={paginaReal === totalPags} onClick={() => setPagina(p => p + 1)}
                            style={{ padding:"4px 10px", borderRadius:5, border:"1px solid rgba(26,35,50,.14)",
                                     background:"transparent", fontSize:12, color:C.dark, cursor:"pointer",
                                     fontFamily:"'Inter', sans-serif", opacity: paginaReal===totalPags ? .35 : 1 }}>→</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal confirmación borrado */}
      {confirmDel && (
        <ConfirmDelete titulo={confirmDel.titulo}
                       onConfirm={handleDelete}
                       onCancel={() => setConfirmDel(null)} />
      )}
    </div>
  );
}