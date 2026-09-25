import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { C } from "../constants";
import { NavBar } from "../components/NavBar";

const TABS = [
  { id: "errores",     label: "Errores JS"  },
  { id: "scriba",      label: "Scriba"       },
  { id: "feedback",    label: "Feedback"     },
  { id: "aprendizaje", label: "Aprendizaje"  },
];

const TAG_COLORS = {
  js_error:            { bg: "#fdecea", color: "#c0392b" },
  unhandled_rejection: { bg: "#fdecea", color: "#c0392b" },
  react_boundary:      { bg: "#fff3e0", color: "#e65100" },
  fetch_error:         { bg: "#fdecea", color: "#b71c1c" },
  error:               { bg: "#fdecea", color: "#c0392b" },
  sugerencia:          { bg: "#e8f5e9", color: "#2e7d32" },
  consulta:            { bg: "#e3f2fd", color: "#1565c0" },
};

function Tag({ text }) {
  const style = TAG_COLORS[text] || { bg: "#f3f3f3", color: "#555" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: ".03em",
      background: style.bg, color: style.color,
      textTransform: "uppercase",
    }}>
      {text}
    </span>
  );
}

function FechaRelativa({ ts }) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  let label;
  if (diffMin < 1)      label = "ahora";
  else if (diffMin < 60) label = `hace ${diffMin}m`;
  else if (diffHr < 24)  label = `hace ${diffHr}h`;
  else                   label = `hace ${diffDay}d`;
  return (
    <span title={d.toLocaleString("es-AR")} style={{ fontSize: 11, color: "rgba(26,35,50,.4)" }}>
      {label}
    </span>
  );
}

function RowCard({ children }) {
  return (
    <div style={{
      background: "#FDFCFA",
      border: "1px solid rgba(26,35,50,.08)",
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 6,
      fontSize: 13, color: "#1a2332",
      fontFamily: "'Montserrat', sans-serif",
    }}>
      {children}
    </div>
  );
}

function TabErrores() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 24, color: "rgba(26,35,50,.4)", fontSize: 13 }}>Cargando...</div>;
  if (!rows.length) return <div style={{ padding: 24, color: "rgba(26,35,50,.4)", fontSize: 13 }}>Sin errores registrados.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(r => (
        <RowCard key={r.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Tag text={r.type} />
            {r.screen && <span style={{ fontSize: 11, color: "rgba(26,35,50,.5)", fontWeight: 600 }}>/{r.screen}</span>}
            <div style={{ marginLeft: "auto" }}><FechaRelativa ts={r.created_at} /></div>
          </div>
          <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{r.message || "(sin mensaje)"}</div>
          {r.stack && (
            <pre style={{
              margin: 0, fontSize: 10, color: "rgba(26,35,50,.5)",
              whiteSpace: "pre-wrap", wordBreak: "break-all",
              maxHeight: 80, overflow: "auto",
              background: "rgba(26,35,50,.04)", borderRadius: 6, padding: "6px 8px",
            }}>
              {r.stack}
            </pre>
          )}
        </RowCard>
      ))}
    </div>
  );
}

function TabScriba() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("scriba_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 24, color: "rgba(26,35,50,.4)", fontSize: 13 }}>Cargando...</div>;
  if (!rows.length) return <div style={{ padding: 24, color: "rgba(26,35,50,.4)", fontSize: 13 }}>Sin conversaciones registradas.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(r => (
        <RowCard key={r.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {r.error
              ? <Tag text="error" />
              : <span style={{ fontSize: 10, fontWeight: 700, color: "#2e7d32", background: "#e8f5e9", padding: "2px 8px", borderRadius: 99 }}>OK</span>
            }
            {r.slug && <span style={{ fontSize: 11, color: "rgba(26,35,50,.5)", fontWeight: 600 }}>{r.slug}</span>}
            {r.duration_ms != null && (
              <span style={{ fontSize: 11, color: "rgba(26,35,50,.4)" }}>{(r.duration_ms / 1000).toFixed(1)}s</span>
            )}
            <div style={{ marginLeft: "auto" }}><FechaRelativa ts={r.created_at} /></div>
          </div>
          <div style={{ color: "rgba(26,35,50,.7)", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700, color: "#1a2332" }}>Q: </span>
            {r.user_input}
          </div>
          {r.error ? (
            <div style={{ color: "#c0392b", fontSize: 12 }}>{r.error}</div>
          ) : r.response && (
            <div style={{
              color: "rgba(26,35,50,.6)", lineHeight: 1.4, fontSize: 12,
              maxHeight: 72, overflow: "hidden",
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
            }}>
              <span style={{ fontWeight: 700, color: "rgba(26,35,50,.7)" }}>R: </span>
              {r.response}
            </div>
          )}
        </RowCard>
      ))}
    </div>
  );
}

function TabFeedback() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("feedback_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 24, color: "rgba(26,35,50,.4)", fontSize: 13 }}>Cargando...</div>;
  if (!rows.length) return <div style={{ padding: 24, color: "rgba(26,35,50,.4)", fontSize: 13 }}>Sin reportes del usuario.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(r => (
        <RowCard key={r.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Tag text={r.category} />
            {r.screen && <span style={{ fontSize: 11, color: "rgba(26,35,50,.5)", fontWeight: 600 }}>/{r.screen}</span>}
            <div style={{ marginLeft: "auto" }}><FechaRelativa ts={r.created_at} /></div>
          </div>
          <div style={{ lineHeight: 1.5 }}>{r.description}</div>
        </RowCard>
      ))}
    </div>
  );
}

const CATEGORIA_LABEL = {
  alucinacion_dato:       "Dato inventado",
  instruccion_ambigua:    "Instrucción ambigua",
  herramienta_no_usada:   "Validación no usada",
  alcance_mal_aplicado:   "Alcance mal aplicado",
  tono_o_claridad:        "Tono / claridad",
  formato_o_dato_tecnico: "Formato / dato técnico",
  otro:                   "Otro",
};

function TabAprendizaje() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    supabase
      .from("scriba_reportes_aprendizaje")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(60)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 24, color: "rgba(26,35,50,.4)", fontSize: 13 }}>Cargando...</div>;
  if (!rows.length) return <div style={{ padding: 24, color: "rgba(26,35,50,.4)", fontSize: 13 }}>Todavía no corrió el módulo de aprendizaje.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map(r => {
        const expandido = abierto === r.id;
        return (
          <RowCard key={r.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: "pointer" }}
                 onClick={() => setAbierto(expandido ? null : r.id)}>
              <span style={{ fontWeight: 700 }}>{new Date(r.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</span>
              <span style={{ fontSize: 11, color: "rgba(26,35,50,.5)" }}>{r.conversaciones_analizadas} conversaciones</span>
              {r.feedback_positivo > 0 && <span style={{ fontSize: 11, color: "#2e7d32" }}>👍 {r.feedback_positivo}</span>}
              {r.feedback_negativo > 0 && <span style={{ fontSize: 11, color: "#c0392b" }}>👎 {r.feedback_negativo}</span>}
              <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(26,35,50,.4)" }}>{expandido ? "▲" : "▼"}</div>
            </div>
            <div style={{ lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{r.resumen_md}</div>
            {expandido && r.patrones?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, borderTop: "1px solid rgba(26,35,50,.08)", paddingTop: 10 }}>
                {r.patrones.map((p, i) => (
                  <div key={i} style={{ background: "rgba(26,35,50,.03)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Tag text={CATEGORIA_LABEL[p.categoria] || p.categoria} />
                      {p.frecuencia > 0 && <span style={{ fontSize: 11, color: "rgba(26,35,50,.5)" }}>×{p.frecuencia}</span>}
                    </div>
                    {p.ejemplos?.length > 0 && (
                      <ul style={{ margin: "0 0 6px", paddingLeft: 18, fontSize: 12, color: "rgba(26,35,50,.65)" }}>
                        {p.ejemplos.map((ej, j) => <li key={j}>{ej}</li>)}
                      </ul>
                    )}
                    {p.sugerencia && (
                      <div style={{ fontSize: 12, color: C.cerulean }}><strong>Sugerencia:</strong> {p.sugerencia}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </RowCard>
        );
      })}
    </div>
  );
}

export function LogsScreen({ onBack }) {
  const [tab, setTab] = useState("errores");

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'Montserrat', sans-serif", overflow: "hidden",
      background: C.warm,
    }}>
      <NavBar onVolver={onBack} onGo={screen => screen === "home" ? onBack() : null} screenTitle="Logs internos" />

      {/* Sub-tabs */}
      <div style={{
        display: "flex", gap: 2,
        padding: "10px 20px 0",
        background: C.warm,
        borderBottom: "1.5px solid rgba(26,35,50,.1)",
        flexShrink: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px 8px 0 0",
              border: "none",
              background: tab === t.id ? "#1a2332" : "transparent",
              color: tab === t.id ? "#fdfcfa" : "rgba(26,35,50,.5)",
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 12, fontWeight: 700,
              cursor: "pointer",
              transition: "all .12s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {tab === "errores"     && <TabErrores />}
          {tab === "scriba"      && <TabScriba />}
          {tab === "feedback"    && <TabFeedback />}
          {tab === "aprendizaje" && <TabAprendizaje />}
        </div>
      </div>
    </div>
  );
}
