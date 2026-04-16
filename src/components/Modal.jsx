import { C } from "../constants";

export function Modal({ title, onClose, children, footer }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(26,35,50,.35)", zIndex: 300,
        display: "flex", alignItems: "flex-start",
        justifyContent: "center", paddingTop: 20,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 12,
        border: "1px solid " + C.border,
        width: 680, maxWidth: "94vw", maxHeight: "92vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(26,35,50,.12)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "1px solid " + C.border, flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{title}</span>
          <button onClick={onClose} style={{
            background: "none", border: "none",
            fontSize: 20, color: C.muted, cursor: "pointer",
          }}>
            ×
          </button>
        </div>
        <div style={{ padding: 18, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {children}
        </div>
        {footer && (
          <div style={{
            padding: "12px 18px", borderTop: "1px solid " + C.border,
            display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
