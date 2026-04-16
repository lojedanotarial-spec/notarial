import { C, ELABELS } from "../constants";

const ESTADO_COLORS = {
  borrador:  { bg: "rgba(255,255,255,.08)", color: "rgba(255, 138, 138, 0.6)",  border: "rgba(255,255,255,.15)" },
  revision:  { bg: "rgba(201,169,97,.15)",  color: "#c9a961",               border: "rgba(201,169,97,.4)"   },
  completo:  { bg: "rgba(58,124,165,.2)",   color: "#7ec8e3",               border: "rgba(58,124,165,.5)"   },
};

export function NavBar({ docTitle, estado, onStatus, onExport }) {
  const ec = ESTADO_COLORS[estado] || ESTADO_COLORS.borrador;

  return (
    <nav style={{
      background: C.dark, flexShrink: 0, zIndex: 10,
      display: "flex", flexDirection: "column",
    }}>

      {/* FILA 1 — identidad */}
      <div style={{
        height: 44, display: "flex", alignItems: "center",
        padding: "0 20px", gap: 10,
        borderBottom: "1px solid rgba(255,255,255,.06)",
      }}>
        <img src="/Logo Gold.png" alt="Notarial" style={{ height: 28, display: "block" }} />
        <div style={{ width: 1, height: 14, background: "rgba(253,252,250,.2)" }} />
        <span style={{ color: "#FDFCFA", fontSize: 13, fontWeight: 700, letterSpacing: "-.01em" }}>
          Notarial
        </span>
        <span style={{ color: "rgba(253,252,250,.3)", fontSize: 12 }}>|</span>
        <span style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>fe pública digital</span>

        <div style={{ marginLeft: "auto" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", background: C.gold,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#FDFCFA",
          }}>
            FT
          </div>
        </div>
      </div>

      {/* FILA 2 — documento */}
      {docTitle && (
        <div style={{
          height: 40, display: "flex", alignItems: "center",
          padding: "0 20px", gap: 12,
          background: "rgba(0,0,0,.2)",
        }}>
          <span style={{
            color: "#FDFCFA", fontSize: 14, fontWeight: 600,
            letterSpacing: "-.01em", flex: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {docTitle}
          </span>

          <button onClick={onStatus} style={{
            border: "1px solid " + ec.border,
            borderRadius: 20,
            background: ec.bg,
            color: ec.color,
            fontSize: 11, fontWeight: 600,
            padding: "2px 10px",
            fontFamily: "'Montserrat',sans-serif",
            cursor: "pointer",
            letterSpacing: ".04em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}>
            {ELABELS[estado]}
          </button>

          <button onClick={onExport} style={{
            border: "none",
            borderRadius: 7,
            background: C.cerulean,
            color: "#FDFCFA",
            fontSize: 13, fontWeight: 700,
            padding: "5px 16px",
            fontFamily: "'Montserrat',sans-serif",
            cursor: "pointer",
            letterSpacing: ".02em",
            flexShrink: 0,
          }}>
            Exportar
          </button>
        </div>
      )}
    </nav>
  );
}
