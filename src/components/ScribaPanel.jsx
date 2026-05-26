import { useState, useRef, useEffect, useCallback } from "react";
import { C } from "../constants";
import { useScribaConversacion } from "../hooks/useScribaConversacion";
import { useAuth } from "../context/AuthContext";

function SparkleIcon({ size = 10, color = "#7ec8e3" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill={color}>
      <path d="M5 0L5.7 4.3 10 5 5.7 5.7 5 10 4.3 5.7 0 5 4.3 4.3 5 0Z"/>
    </svg>
  );
}

function ScribaAvatar({ size = 26 }) {
  return (
    <img
      src="/Scriba-icon-1.png"
      alt="Scriba"
      style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "block" }}
    />
  );
}

function BtnCopiar({ texto }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <button onClick={copiar} style={{
      marginTop: 7, display: "flex", alignItems: "center", gap: 5,
      background: copiado ? "rgba(58,124,165,.12)" : "transparent",
      border: "1px solid " + (copiado ? "rgba(58,124,165,.3)" : "rgba(26,35,50,.15)"),
      borderRadius: 6, padding: "5px 10px",
      fontSize: 11, fontWeight: 600, fontFamily: "'Montserrat', sans-serif",
      color: copiado ? C.cerulean : "rgba(26,35,50,.45)",
      cursor: "pointer", transition: "all .15s",
    }}>
      {copiado
        ? <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg> Copiado</>
        : <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="1" width="7" height="8" rx="1.5"/><rect x="1" y="3" width="7" height="8" rx="1.5" fill="none"/></svg> Copiar contenido</>
      }
    </button>
  );
}

function Mensaje({ msg, onGo }) {
  const esUser = msg.role === "user";
  const accion = msg.accion;

  return (
    <div style={{
      display: "flex",
      justifyContent: esUser ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      {!esUser && (
        <div style={{ flexShrink: 0, marginRight: 8, marginTop: 2 }}>
          <ScribaAvatar size={26} />
        </div>
      )}
      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column" }}>
        <div style={{
          background: esUser ? C.cerulean : "#f8f6f2",
          color: esUser ? "#fff" : C.dark,
          borderRadius: esUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          padding: "11px 14px",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
        {!esUser && accion?.tipo === "abrir_editor" && (
          <button
            onClick={() => onGo?.("editor", { templateSlug: accion.slug, templateId: accion.templateId })}
            style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 6,
              background: C.cerulean, border: "none",
              borderRadius: 8, padding: "8px 14px",
              fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
              color: "#fff", cursor: "pointer",
              alignSelf: "flex-start",
              boxShadow: "0 2px 8px rgba(58,124,165,.3)",
              transition: "opacity .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="12" height="10" rx="1.5"/>
              <path d="M5 3V2M11 3V2M2 7h12" strokeLinecap="round"/>
            </svg>
            Abrir en editor — {accion.nombre}
          </button>
        )}
        {!esUser && !accion && <BtnCopiar texto={msg.content} />}
        {!esUser && accion && <BtnCopiar texto={msg.content} />}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div style={{ flexShrink: 0, marginRight: 8, marginTop: 2 }}>
        <ScribaAvatar size={26} />
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

const SUGERENCIAS_CONSULTA = [
  "¿Qué pasa con el ITI en una compraventa hoy?",
  "¿Cómo funciona la zona de frontera en Mendoza?",
  "¿Cuándo va el agua con el inmueble en Mendoza?",
  "¿Qué exige la UIF para una compraventa?",
  "¿Cuál es el impuesto de sellos en Mendoza en 2025?",
];

const SUGERENCIAS_GENERAR = [
  "Generame un borrador de escritura de compraventa",
  "Necesito un poder especial para venta de inmueble",
  "Generame una escritura de donación entre padre e hijo",
  "Borrador de constitución de hipoteca en primer grado",
  "Generame el acta de requerimiento para certificación de firmas",
];

export function ScribaPanel({ onClose, contexto, onGo }) {
  const { mensajesIniciales, cargandoInicio, historial, guardar, nueva, cargarConversacion } = useScribaConversacion();
  const { registroActivo } = useAuth();
  const [mensajes,  setMensajes]  = useState([]);
  const [input,     setInput]     = useState("");
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const iniciadoRef = useRef(false);

  useEffect(() => {
    if (cargandoInicio || iniciadoRef.current) return;
    iniciadoRef.current = true;
    if (mensajesIniciales.length > 0) setMensajes(mensajesIniciales);
  }, [cargandoInicio, mensajesIniciales]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  useEffect(() => {
    if (!cargandoInicio) inputRef.current?.focus();
  }, [cargandoInicio]);

  async function handleNueva() {
    iniciadoRef.current = false;
    setMensajes([]);
    setError(null);
    await nueva();
    inputRef.current?.focus();
  }

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
          contexto: contexto || null,
          registroId: registroActivo || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error del servidor");

      const mensajesFinales = [...nuevosMensajes, { role: "assistant", content: data.respuesta, accion: data.accion || null }];
      setMensajes(mensajesFinales);
      guardar(mensajesFinales.map(({ role, content }) => ({ role, content })));
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
        background: "#FDFCFA",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,.18)",
      }}>

        {/* Header */}
        <div style={{
          background: C.dark,
          padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0,
          borderBottom: "1px solid rgba(201,169,97,.12)",
        }}>
          <ScribaAvatar size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                color: "#FDFCFA", fontSize: 20,
                fontFamily: "'Carattere', cursive", fontWeight: 400,
              }}>Scriba</span>
              <SparkleIcon size={9} color="#7ec8e3" />
            </div>
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, marginTop: 1 }}>
              Asistente notarial · Mendoza, Argentina
            </div>
            {contexto && (
              <div style={{
                marginTop: 5, fontSize: 11,
                color: "#c9a961",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 260,
              }}>
                ✦ {contexto.tipoActo}{contexto.partes ? " · " + contexto.partes : ""}
              </div>
            )}
          </div>
          {mensajes.length > 0 && (
            <button onClick={handleNueva} style={{
              background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 6, padding: "5px 10px",
              color: "rgba(255,255,255,.55)", fontSize: 11, fontWeight: 600,
              fontFamily: "'Montserrat',sans-serif", cursor: "pointer", whiteSpace: "nowrap",
            }}>
              + Nueva
            </button>
          )}
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
              <div style={{ fontSize: 14, color: "rgba(26,35,50,.5)", marginBottom: 18, lineHeight: 1.6 }}>
                Consultame sobre normativa o pedime que genere un borrador de instrumento.
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
                  textTransform: "uppercase", color: "rgba(26,35,50,.35)",
                  marginBottom: 8,
                }}>Consultas</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {SUGERENCIAS_CONSULTA.map((s, i) => (
                    <button key={i} onClick={() => enviar(s)} style={{
                      background: "#f8f6f2", border: "1px solid rgba(26,35,50,.1)",
                      borderRadius: 8, padding: "10px 14px",
                      textAlign: "left", fontSize: 13, color: C.dark,
                      fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
                      transition: "background .1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0ece3"}
                    onMouseLeave={e => e.currentTarget.style.background = "#f8f6f2"}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
                  textTransform: "uppercase", color: "rgba(201,169,97,.7)",
                  marginBottom: 8,
                }}>Generar borrador</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {SUGERENCIAS_GENERAR.map((s, i) => (
                    <button key={i} onClick={() => enviar(s)} style={{
                      background: "rgba(201,169,97,.06)",
                      border: "1px solid rgba(201,169,97,.25)",
                      borderRadius: 8, padding: "10px 14px",
                      textAlign: "left", fontSize: 13, color: C.dark,
                      fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
                      transition: "background .1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(201,169,97,.12)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(201,169,97,.06)"}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {historial.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
                    textTransform: "uppercase", color: "rgba(26,35,50,.35)",
                    marginBottom: 8,
                  }}>Retomar consulta</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {historial.slice(0, 5).map(c => (
                      <button key={c.id} onClick={() => cargarConversacion(c)} style={{
                        background: "transparent", border: "1px solid rgba(26,35,50,.1)",
                        borderRadius: 8, padding: "8px 12px",
                        textAlign: "left", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                        transition: "background .1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8f6f2"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontSize: 12, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.titulo || "Consulta anterior"}
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(26,35,50,.35)", flexShrink: 0 }}>
                          {new Date(c.updated_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mensajes.map((m, i) => <Mensaje key={i} msg={m} onGo={onGo} />)}
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
