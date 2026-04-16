import { useState } from "react";
import { C } from "../../constants";

export function Btn({ children, primary, danger, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding:     "8px 18px",
        borderRadius: 7,
        fontSize:    13,
        fontWeight:  500,
        fontFamily:  "'Montserrat',sans-serif",
        cursor:      "pointer",
        background:  primary
          ? (hover ? "#2e3f52" : C.dark)
          : danger
            ? "transparent"
            : (hover ? "#f5f2eb" : C.porcelain),
        color:  primary ? "#FDFCFA" : danger ? "rgba(160,30,30,.9)" : C.dark,
        border: primary
          ? "none"
          : danger
            ? "1px solid rgba(160,30,30,.25)"
            : "1px solid rgba(26,35,50,.2)",
      }}
    >
      {children}
    </button>
  );
}
