import { useState, useEffect } from "react";
import { C } from "../constants";
import { NavBar } from "../components/NavBar";
import { supabase } from "../supabase";

export function AdminScreen({ onGo }) {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [query, setQuery]         = useState("");

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from("registros")
        .select("*")
        .order("registro");
      // Agrupar por número de registro
      const agrupados = {};
      for (const r of data || []) {
        if (!agrupados[r.registro]) agrupados[r.registro] = [];
        agrupados[r.registro].push(r);
      }
      setRegistros(Object.entries(agrupados).sort(([a], [b]) => Number(a) - Number(b)));
      setCargando(false);
    }
    cargar();
  }, []);

  const filtrados = registros.filter(([nro, miembros]) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return nro.includes(q) || miembros.some(m =>
      `${m.nombre} ${m.apellido}`.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  fontFamily:"'Inter', sans-serif", overflow:"hidden", background:C.warm }}>
      <NavBar onGo={onGo} screenTitle="Seleccionar registro" />

      <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>
        <div style={{ maxWidth:700, margin:"0 auto", display:"flex", flexDirection:"column", gap:16 }}>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:20, fontWeight:700, color:C.dark, letterSpacing:"-.02em" }}>
              ¿Qué registro querés ver?
            </div>
            <button
              onClick={() => onGo("logs")}
              style={{
                padding:"6px 14px", borderRadius:8,
                border:"1.5px solid rgba(26,35,50,.15)",
                background:"transparent", cursor:"pointer",
                fontFamily:"'Montserrat', sans-serif", fontSize:11,
                fontWeight:700, color:"rgba(26,35,50,.5)",
                transition:"all .12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(26,35,50,.4)"; e.currentTarget.style.color="rgba(26,35,50,.85)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(26,35,50,.15)"; e.currentTarget.style.color="rgba(26,35,50,.5)"; }}
            >
              Ver logs
            </button>
          </div>

          {/* BUSCADOR */}
          <div style={{ position:"relative" }}>
            <svg style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                 width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(26,35,50,.35)" strokeWidth="1.5">
              <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3" strokeLinecap="round"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && filtrados.length > 0) {
                  const [nro, miembros] = filtrados[0];
                  onGo("home", { registroActivo: nro, miembrosActivos: miembros });
                }
              }}
              placeholder="Buscar por número o nombre..."
              style={{ width:"100%", padding:"8px 12px 8px 30px", borderRadius:8,
                       border:"1px solid rgba(26,35,50,.12)", background:C.porcelain, fontSize:13,
                       color:C.dark, fontFamily:"'Inter', sans-serif",
                       boxSizing:"border-box", outline:"none" }}
            />
          </div>

          {/* LISTA */}
          {cargando ? (
            <div style={{ textAlign:"center", padding:"40px", color:"rgba(26,35,50,.4)", fontSize:13 }}>
              Cargando registros...
            </div>
          ) : (
            <div style={{ background:C.porcelain, borderRadius:12, border:"1px solid rgba(26,35,50,.08)", overflow:"hidden" }}>
              {filtrados.length === 0 ? (
                <div style={{ padding:"24px", textAlign:"center", fontSize:13, color:"rgba(26,35,50,.4)" }}>
                  No se encontraron registros.
                </div>
              ) : filtrados.map(([nro, miembros], idx) => {
                const titular = miembros.find(m => m.rol === "titular") || miembros[0];
                const resto   = miembros.filter(m => m.id !== titular.id);
                return (
                  <div
                    key={nro}
                    onClick={() => onGo("home", { registroActivo: nro, miembrosActivos: miembros })}
                    style={{
                      padding:"14px 20px", cursor:"pointer",
                      borderBottom: idx < filtrados.length-1 ? "1px solid rgba(26,35,50,.06)" : "none",
                      transition:"background .1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = C.ceruleanLight}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{
                        width:40, height:40, borderRadius:"50%", background:C.ceruleanLight,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:12, fontWeight:700, color:C.cerulean, flexShrink:0,
                      }}>
                        {nro}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:C.dark }}>
                          {titular.nombre} {titular.apellido}
                          <span style={{ fontSize:11, fontWeight:400, color:"rgba(26,35,50,.4)",
                                         marginLeft:8 }}>titular</span>
                        </div>
                        {resto.length > 0 && (
                          <div style={{ fontSize:12, color:"rgba(26,35,50,.5)", marginTop:2 }}>
                            {resto.map(m => `${m.nombre} ${m.apellido}`).join(" · ")}
                          </div>
                        )}
                        <div style={{ fontSize:11, color:"rgba(26,35,50,.35)", marginTop:2 }}>
                          Registro {nro} · {titular.circunscripcion}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                           stroke="rgba(26,35,50,.3)" strokeWidth="1.5">
                        <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}