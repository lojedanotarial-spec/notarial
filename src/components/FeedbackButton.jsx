import { useState } from "react";
import { logFeedback } from "../utils/logger";

const CATEGORIAS = [
  { id: "error",      label: "Error / fallo" },
  { id: "sugerencia", label: "Sugerencia" },
  { id: "consulta",   label: "Consulta" },
];

export function FeedbackButton({ screen }) {
  const [open, setOpen]         = useState(false);
  const [categoria, setCategoria] = useState("error");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado]   = useState(false);
  const [err, setErr]           = useState(null);

  function abrir() { setOpen(true); setEnviado(false); setErr(null); }
  function cerrar() { setOpen(false); setDescripcion(""); setCategoria("error"); setErr(null); }

  async function enviar() {
    if (!descripcion.trim()) return;
    setEnviando(true);
    setErr(null);
    try {
      await logFeedback({
        description: descripcion.trim(),
        category: categoria,
        screen,
        context: { userAgent: navigator.userAgent },
      });
      setEnviado(true);
      setTimeout(cerrar, 2000);
    } catch (e) {
      setErr("No se pudo enviar. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {/* Trigger — bottom-left, pequeño */}
      <button
        onClick={abrir}
        title="Reportar un problema"
        className="no-print"
        style={{
          position: "fixed", bottom: 24, left: 24, zIndex: 198,
          width: 36, height: 36, borderRadius: "50%",
          border: "1.5px solid rgba(26,35,50,.18)",
          background: "rgba(253,252,250,.92)",
          backdropFilter: "blur(4px)",
          cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,.12)",
          color: "rgba(26,35,50,.45)",
          fontSize: 16, fontWeight: 700,
          transition: "opacity .15s, border-color .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(26,35,50,.4)"; e.currentTarget.style.color = "rgba(26,35,50,.8)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(26,35,50,.18)"; e.currentTarget.style.color = "rgba(26,35,50,.45)"; }}
      >
        !
      </button>

      {/* Modal */}
      {open && (
        <>
          <div
            onClick={cerrar}
            style={{
              position: "fixed", inset: 0, zIndex: 300,
              background: "rgba(0,0,0,.25)",
            }}
          />
          <div style={{
            position: "fixed", bottom: 70, left: 24, zIndex: 301,
            width: 320, borderRadius: 12,
            background: "#FDFCFA",
            boxShadow: "0 8px 40px rgba(0,0,0,.22)",
            padding: "20px 20px 18px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 14, fontWeight: 700, color: "#1a2332",
            }}>
              Reportar problema
            </div>

            {!enviado ? (
              <>
                {/* Categoría */}
                <div style={{ display: "flex", gap: 6 }}>
                  {CATEGORIAS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategoria(c.id)}
                      style={{
                        flex: 1, padding: "5px 4px", borderRadius: 6,
                        border: `1.5px solid ${categoria === c.id ? "#1a2332" : "rgba(26,35,50,.15)"}`,
                        background: categoria === c.id ? "#1a2332" : "transparent",
                        color: categoria === c.id ? "#fdfcfa" : "rgba(26,35,50,.6)",
                        fontFamily: "'Montserrat', sans-serif", fontSize: 10,
                        fontWeight: 600, cursor: "pointer",
                        transition: "all .1s",
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Descripción */}
                <textarea
                  autoFocus
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Describí qué pasó o qué querés sugerir..."
                  rows={4}
                  style={{
                    fontFamily: "'Montserrat', sans-serif", fontSize: 13,
                    color: "#1a2332", resize: "none",
                    border: "1.5px solid rgba(26,35,50,.15)",
                    borderRadius: 8, padding: "9px 10px",
                    outline: "none", lineHeight: 1.5,
                    background: "rgba(26,35,50,.03)",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(26,35,50,.4)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(26,35,50,.15)"; }}
                />

                {err && (
                  <div style={{
                    fontSize: 12, color: "#c0392b",
                    fontFamily: "'Montserrat', sans-serif",
                  }}>{err}</div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={cerrar}
                    style={{
                      padding: "7px 14px", borderRadius: 7,
                      border: "1.5px solid rgba(26,35,50,.15)",
                      background: "transparent", cursor: "pointer",
                      fontFamily: "'Montserrat', sans-serif", fontSize: 12,
                      fontWeight: 600, color: "rgba(26,35,50,.6)",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviar}
                    disabled={!descripcion.trim() || enviando}
                    style={{
                      padding: "7px 16px", borderRadius: 7,
                      border: "none",
                      background: descripcion.trim() && !enviando ? "#1a2332" : "rgba(26,35,50,.15)",
                      color: descripcion.trim() && !enviando ? "#fdfcfa" : "rgba(26,35,50,.35)",
                      fontFamily: "'Montserrat', sans-serif", fontSize: 12,
                      fontWeight: 600, cursor: descripcion.trim() && !enviando ? "pointer" : "default",
                      transition: "all .15s",
                    }}
                  >
                    {enviando ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{
                textAlign: "center", padding: "12px 0",
                fontFamily: "'Montserrat', sans-serif", fontSize: 13,
                color: "#2e7d32", fontWeight: 600,
              }}>
                ✓ Reporte enviado. Gracias.
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
