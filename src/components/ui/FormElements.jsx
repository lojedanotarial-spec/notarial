import { C } from "../../constants";

export function Fg({ label, children, full, alerta }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, gridColumn:full?"1/-1":undefined }}>
      <label style={{ fontSize:11, fontWeight:500, color: alerta ? "#c0392b" : C.dark, fontFamily:"'Inter', sans-serif", display:"flex", alignItems:"center", gap:4 }}>
        {label}
        {alerta && <span style={{ color:"#c0392b", fontWeight:700 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function Warn({ children }) {
  return (
    <div style={{ display:"flex", gap:8, padding:"10px 12px", background:C.fawn50,
                  borderRadius:7, border:"1px solid rgba(201,169,97,.3)",
                  fontSize:13, color:"#1a2332", fontFamily:"'Inter', sans-serif" }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink:0, marginTop:1 }}>
        <path d="M6.5 1.5L12 11H1L6.5 1.5z" stroke="#a6864a" strokeWidth="1.3" fill="none"/>
        <path d="M6.5 5v2.5" stroke="#a6864a" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="6.5" cy="9.2" r=".7" fill="#a6864a"/>
      </svg>
      {children}
    </div>
  );
}

export function Var({ children, empty, show, label }) {
  if (!show) return <span style={{ color:C.dark }}>{children || ""}</span>;
  const isEmpty = empty || children === "" || children == null;
  if (isEmpty) {
    return (
      <span style={{
        color: "#c0392b",
        fontWeight: 700,
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: "3px",
      }}>
        {"{{"}{label || "pendiente"}{"}}"}
      </span>
    );
  }
  return (
    <span style={{
      color: C.cerulean,
      fontWeight: 700,
      textDecoration: "underline",
      textDecorationStyle: "dotted",
      textUnderlineOffset: "3px",
    }}>
      {children}
    </span>
  );
}
