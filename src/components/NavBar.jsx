import { useState, useRef, useEffect } from "react";
import { C, ELABELS } from "../constants";
import { useAuth } from "../context/AuthContext";
import { Modal } from "./Modal";

const ESTADO_COLORS = {
  borrador: { bg: "rgba(255,255,255,.08)", color: "rgba(255, 138, 138, 0.6)",  border: "rgba(255,255,255,.15)" },
  revision: { bg: "rgba(201,169,97,.15)",  color: "#c9a961",                   border: "rgba(201,169,97,.4)"   },
  completo: { bg: "rgba(58,124,165,.2)",   color: "#7ec8e3",                   border: "rgba(58,124,165,.5)"   },
};

const ROL_LABEL = { titular: "Titular", adscripta: "Adscripta", adscripto: "Adscripto" };

function ModalPreferencias({ onClose }) {
  const { miUsuario, actualizarMiembro } = useAuth();
  const [form, setForm] = useState({
    nombre:           miUsuario?.nombre           || "",
    apellido:         miUsuario?.apellido         || "",
    nombre_preferido: miUsuario?.nombre_preferido ||
      `${miUsuario?.nombre || ""} ${miUsuario?.apellido || ""}`.trim(),
  });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }));
    setGuardado(false);
  }

  async function guardar() {
    setGuardando(true);
    await actualizarMiembro(miUsuario.id, form);
    setGuardando(false);
    setGuardado(true);
  }

  const inp = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid " + C.border,
    borderRadius: 7, padding: "9px 12px",
    fontSize: 13, fontFamily: "'Montserrat', sans-serif",
    color: C.dark, outline: "none",
    background: "#fafafa",
  };

  const lbl = {
    fontSize: 11, fontWeight: 600, color: C.muted,
    letterSpacing: ".05em", textTransform: "uppercase",
    marginBottom: 5, display: "block",
  };

  return (
    <Modal
      title="Preferencias"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid " + C.border,
            borderRadius: 7, padding: "8px 18px",
            fontSize: 13, fontWeight: 600, color: C.muted,
            fontFamily: "'Montserrat', sans-serif", cursor: "pointer",
          }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} style={{
            background: guardado ? "rgba(58,124,165,.15)" : C.cerulean,
            border: "none", borderRadius: 7, padding: "8px 18px",
            fontSize: 13, fontWeight: 600,
            color: guardado ? C.cerulean : "#fff",
            fontFamily: "'Montserrat', sans-serif", cursor: "pointer",
          }}>
            {guardando ? "Guardando..." : guardado ? "✓ Guardado" : "Guardar"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{
          background: "rgba(58,124,165,.06)",
          border: "1px solid rgba(58,124,165,.15)",
          borderRadius: 8, padding: "10px 14px",
          fontSize: 12, color: C.muted,
        }}>
          Registro Nº {miUsuario?.registro} · {miUsuario?.circunscripcion} · {ROL_LABEL[miUsuario?.rol]}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <label style={lbl}>Nombre</label>
            <input value={form.nombre} onChange={e => set("nombre", e.target.value)} style={inp} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <label style={lbl}>Apellido</label>
            <input value={form.apellido} onChange={e => set("apellido", e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={lbl}>Nombre preferido</label>
          <input
            value={form.nombre_preferido}
            onChange={e => set("nombre_preferido", e.target.value)}
            placeholder={`${form.nombre} ${form.apellido}`}
            style={inp}
          />
          <span style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            Como aparecerás en los documentos. Si lo dejás vacío se usa nombre + apellido.
          </span>
        </div>
      </div>
    </Modal>
  );
}

function UserDropdown({ onClose, onPreferencias }) {
  const { miUsuario, logout } = useAuth();
  const ref = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "absolute", top: 46, right: 0, zIndex: 100,
      width: 220,
      background: C.dark,
      border: "1px solid rgba(255,255,255,.1)",
      borderRadius: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,.4)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,.07)",
      }}>
        <div style={{ color: "#FDFCFA", fontSize: 13, fontWeight: 600 }}>
          {miUsuario?.nombre} {miUsuario?.apellido}
        </div>
        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, marginTop: 2 }}>
          {ROL_LABEL[miUsuario?.rol]} · Registro {miUsuario?.registro}
        </div>
      </div>

      <button
        onClick={onPreferencias}
        style={{
          width: "100%", padding: "11px 16px",
          background: "transparent", border: "none",
          color: "rgba(255,255,255,.7)", fontSize: 13,
          fontFamily: "'Montserrat', sans-serif",
          cursor: "pointer", textAlign: "left",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        Preferencias
      </button>

      <button
        onClick={logout}
        style={{
          width: "100%", padding: "11px 16px",
          background: "transparent",
          borderTop: "1px solid rgba(255,255,255,.07)",
          color: "rgba(255,120,120,.7)", fontSize: 13,
          fontFamily: "'Montserrat', sans-serif",
          cursor: "pointer", textAlign: "left",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,100,100,.06)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export function NavBar({
  docTitle, screenTitle,
  estado, onStatus, onExport, onModelo,
  indicadorGuardado, onGuardar,
  onGo, onVolver,
}) {
  const { iniciales } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [prefOpen, setPrefOpen] = useState(false);
  const ec = ESTADO_COLORS[estado] || ESTADO_COLORS.borrador;
  const tieneSegundaFila = docTitle || screenTitle;

  function abrirPreferencias() {
    setMenuOpen(false);
    setPrefOpen(true);
  }

  return (
    <>
      <nav style={{
        background: C.dark, flexShrink: 0, zIndex: 10,
        display: "flex", flexDirection: "column",
        position: "relative",
      }}>

        {/* FILA 1 — identidad */}
        <div style={{
          height: 44, display: "flex", alignItems: "center",
          padding: "0 20px", gap: 10,
          borderBottom: tieneSegundaFila ? "1px solid rgba(255,255,255,.06)" : "none",
        }}>
          <button
            onClick={() => onGo && onGo("home")}
            style={{ display:"flex", alignItems:"center", gap:10, background:"none", border:"none", cursor:"pointer", padding:0 }}
          >
            <img src="/Logo Gold.png" alt="Notarial" style={{ height: 28, display: "block" }} />
            <div style={{ width: 1, height: 14, background: "rgba(253,252,250,.2)" }} />
            <span style={{ color: "#FDFCFA", fontSize: 13, fontWeight: 700, letterSpacing: "-.01em" }}>
              Notarial
            </span>
          </button>
          <span style={{ color: "rgba(253,252,250,.3)", fontSize: 12 }}>|</span>
          <span style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>fe pública digital</span>

          <div style={{ marginLeft: "auto", position: "relative" }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: menuOpen ? C.cerulean : C.gold,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#FDFCFA",
                border: "none", cursor: "pointer",
                transition: "background .2s",
              }}
            >
              {iniciales}
            </button>

            {menuOpen && (
              <UserDropdown
                onClose={() => setMenuOpen(false)}
                onPreferencias={abrirPreferencias}
              />
            )}
          </div>
        </div>

        {/* FILA 2 — pantalla secundaria */}
        {tieneSegundaFila && (
          <div style={{
            height: 40, display: "flex", alignItems: "center",
            padding: "0 20px", gap: 12,
            background: "rgba(0,0,0,.2)",
          }}>
            {onGo && (
              
              <button
                onClick={() => onVolver ? onVolver() : onGo("home")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,.5)", fontSize: 13,
                  fontFamily: "'Montserrat',sans-serif", padding: 0, flexShrink: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.8)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.5)"}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Volver
              </button>
            )}

            {onGo && tieneSegundaFila && (
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,.15)", flexShrink: 0 }}/>
            )}

            <span style={{
              color: "#FDFCFA", fontSize: 14, fontWeight: 600,
              letterSpacing: "-.01em", flex: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {docTitle || screenTitle}
            </span>

            {indicadorGuardado && (
              <span style={{
                fontSize: 11, color: "rgba(255,255,255,.35)",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {indicadorGuardado}
              </span>
            )}

            {onGuardar && (
              <button onClick={onGuardar} style={{
                border: "1px solid rgba(255,255,255,.15)", borderRadius: 6,
                background: "transparent", color: "rgba(255,255,255,.6)",
                fontSize: 11, fontWeight: 600, padding: "3px 10px",
                fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
                flexShrink: 0,
              }}>
                Guardar
              </button>
            )}

            {onStatus && (
              <button onClick={onStatus} style={{
                border: "1px solid " + ec.border, borderRadius: 20,
                background: ec.bg, color: ec.color,
                fontSize: 11, fontWeight: 600, padding: "2px 10px",
                fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
                letterSpacing: ".04em", textTransform: "uppercase", flexShrink: 0,
              }}>
                {ELABELS[estado]}
              </button>
            )}

            {onModelo && (
              <button onClick={onModelo} style={{
                border: "1px solid rgba(255,255,255,.25)", borderRadius: 7,
                background: "transparent", color: "rgba(255,255,255,.8)",
                fontSize: 13, fontWeight: 600, padding: "5px 16px",
                fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
                letterSpacing: ".02em", flexShrink: 0,
              }}>
                Modelo
              </button>
            )}


            {onExport && (
              <button onClick={onExport} style={{
                border: "none", borderRadius: 7, background: C.cerulean,
                color: "#FDFCFA", fontSize: 13, fontWeight: 700,
                padding: "5px 16px", fontFamily: "'Montserrat',sans-serif",
                cursor: "pointer", letterSpacing: ".02em", flexShrink: 0,
              }}>
                Exportar
              </button>
            )}
          </div>
        )}
      </nav>

      {prefOpen && <ModalPreferencias onClose={() => setPrefOpen(false)} />}
    </>
  );
}
