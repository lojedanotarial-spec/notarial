import { useState, useRef, useEffect } from "react";
import { C } from "../constants";

function IconScriba() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 12L5 7l3 3 3-5 2 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8" cy="2.5" r="1.5" fill="currentColor" opacity=".7"/>
    </svg>
  );
}

function Mensaje({ msg }) {
  const esUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: esUser ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      {!esUser && (
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "linear-gradient(135deg, #3a7ca5, #1a2332)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginRight: 8, marginTop: 2,
          color: "#fff",
        }}>
          <IconScriba />
        </div>
      )}
      <div style={{
        maxWidth: "80%",
        background: esUser ? C.cerulean : "#f8f6f2",
        color: esUser ? "#fff" : C.dark,
        borderRadius: esUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
        padding: "10px 13px",
        fontSize: 13,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%",
        background: "linear-gradient(135deg, #3a7ca5, #1a2332)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginRight: 8, marginTop: 2, color: "#fff",
      }}>
        <IconScriba />
      </div>
      <div style={{
        background: "#f8f6f2", borderRadius: "14px 14px 14px 4px",
        padding: "12px 16px", display: "flex", gap: 4, alignItems: "center",
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "rgba(26,35,50,.3)",
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}/>
        ))}
      </div>
    </div>
  );
}

const SUGERENCIAS = [
  "¿Qué pasa con el ITI en una compraventa hoy?",
  "¿Cómo funciona la zona de frontera en Mendoza?",
  "¿Cuándo va el agua con el inmueble en Mendoza?",
  "¿Qué exige la UIF para una compraventa?",
  "¿Cuál es el impuesto de sellos en Mendoza en 2025?",
];

export function ScribaPanel({ onClose }) {
  const [mensajes,  setMensajes]  = useState([]);
  const [input,     setInput]     = useState("");
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function enviar(texto) {
    const pregunta = (texto || input).trim();
    if (!pregunta || cargando) return;

    const nuevosMensajes = [...mensajes, { role: "user", content: pregunta }];
    setMensajes(nuevosMensajes);
    setInput("");
    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/scriba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: pregunta,
          mensajes_anteriores: mensajes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error del servidor");

      setMensajes(prev => [...prev, { role: "assistant", content: data.respuesta }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: .3; transform: scale(.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,.35)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 420, maxWidth: "100vw",
        background: "#fff",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,.18)",
      }}>

        {/* Header */}
        <div style={{
          background: C.dark,
          padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #3a7ca5, #1a2332)",
            border: "2px solid rgba(255,255,255,.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", flexShrink: 0,
          }}>
            <IconScriba />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#FDFCFA", fontSize: 14, fontWeight: 700 }}>Scriba</div>
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11 }}>
              Asistente notarial · Mendoza, Argentina
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,.08)", border: "none",
              borderRadius: 6, width: 28, height: 28,
              color: "rgba(255,255,255,.6)", fontSize: 16,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Montserrat',sans-serif",
            }}
          >×</button>
        </div>

        {/* Mensajes */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "16px 16px 8px",
        }}>
          {mensajes.length === 0 && (
            <div style={{ paddingBottom: 12 }}>
              <div style={{
                fontSize: 13, color: "rgba(26,35,50,.5)",
                marginBottom: 14, lineHeight: 1.5,
              }}>
                Consultame sobre normativa notarial, requisitos de actos, impuestos o cualquier duda del ejercicio profesional.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {SUGERENCIAS.map((s, i) => (
                  <button key={i} onClick={() => enviar(s)}
                    style={{
                      background: "#f8f6f2", border: "1px solid rgba(26,35,50,.1)",
                      borderRadius: 8, padding: "9px 12px",
                      textAlign: "left", fontSize: 12, color: C.dark,
                      fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
                      transition: "background .1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0ece3"}
                    onMouseLeave={e => e.currentTarget.style.background = "#f8f6f2"}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((m, i) => <Mensaje key={i} msg={m} />)}
          {cargando && <LoadingDots />}

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 13px",
              fontSize: 12, color: "#b91c1c", marginBottom: 12,
            }}>
              Error: {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 14px",
          borderTop: "1px solid rgba(26,35,50,.08)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
            background: "#f8f6f2",
            border: "1px solid rgba(26,35,50,.14)",
            borderRadius: 10, padding: "8px 10px",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Consultá sobre normativa, requisitos, impuestos..."
              disabled={cargando}
              rows={1}
              style={{
                flex: 1, border: "none", background: "transparent",
                resize: "none", outline: "none",
                fontSize: 13, color: C.dark, lineHeight: 1.5,
                fontFamily: "'Montserrat',sans-serif",
                minHeight: 22, maxHeight: 120,
                overflowY: "auto",
              }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
            />
            <button
              onClick={() => enviar()}
              disabled={!input.trim() || cargando}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: input.trim() && !cargando ? C.cerulean : "rgba(26,35,50,.12)",
                color: "#fff", cursor: input.trim() && !cargando ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background .15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={{ fontSize: 10, color: "rgba(26,35,50,.3)", marginTop: 6, textAlign: "center" }}>
            Enter para enviar · Shift+Enter para nueva línea
          </div>
        </div>

      </div>
    </>
  );
}
