import { useState } from "react";
import { C } from "../../constants";

export function TbBtn({ children, active, onClick, title }) {
  const [hover, setHover] = useState(false);
  const on = active || hover;
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "4px 8px",
        border: "1px solid " + (on ? C.cerulean : C.borderStrong),
        borderRadius: 5,
        background: on ? C.ceruleanLight : "transparent",
        color: on ? "#1f4862" : C.dark,
        fontSize: 13, fontWeight: 500,
        fontFamily: "'Montserrat',sans-serif",
        display: "flex", alignItems: "center", gap: 4,
        whiteSpace: "nowrap", transition: "all .12s", cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function TbSep() {
  return <div style={{ width:1, height:18, background:"rgba(26,35,50,.18)", margin:"0 4px", flexShrink:0 }}/>;
}

export function Dropdown({ open, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 5px)", left: 0,
      background: "#fff", border: "1px solid " + C.border,
      borderRadius: 9, minWidth: 220, zIndex: 200,
      overflow: "hidden", boxShadow: "0 4px 20px rgba(26,35,50,.1)",
    }}>
      {children}
    </div>
  );
}

export function DdSection({ label, children }) {
  return (
    <div style={{ padding: "4px 0", borderBottom: "1px solid rgba(26,35,50,.07)" }}>
      {label && (
        <div style={{ padding: "6px 13px 3px", fontSize: 9, fontWeight: 600,
                      letterSpacing: ".08em", textTransform: "uppercase",
                      color: C.faint, fontFamily: "'Montserrat',sans-serif" }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export function DdItem({ children, active, onClick, meta }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 13px", fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: "pointer", color: C.dark,
        background: hover ? "rgba(26,35,50,.04)" : "transparent",
        fontFamily: "'Montserrat',sans-serif", gap: 8,
      }}
    >
      <span>{children}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {meta && <span style={{ fontSize: 10, color: C.faint, fontFamily: "monospace" }}>{meta}</span>}
        {active && (
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke={C.cerulean} strokeWidth="2">
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  );
}
