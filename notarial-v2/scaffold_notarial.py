# -*- coding: utf-8 -*-
"""
scaffold_notarial.py
Ejecutar desde la RAIZ del proyecto notarial-v2 (donde esta package.json):
    python scaffold_notarial.py

Crea la estructura de carpetas y archivos base con encoding UTF-8 sin BOM.
Los archivos de pantallas/componentes son placeholders que compilaran sin errores.
"""
import pathlib, sys

ROOT = pathlib.Path("src")

def w(rel, content):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"  OK  {ROOT / rel}")

print("\n=== scaffold_notarial.py ===")
print(f"Destino: {ROOT.resolve()}\n")

# ─── constants.js ────────────────────────────────────────────────────────────
w("constants.js", """\
// ── PALETA ───────────────────────────────────────────────────────────────────
export const C = {
  dark:          "#1a2332",
  porcelain:     "#FDFCFA",
  warm:          "#f0ece3",
  cerulean:      "#3a7ca5",
  ceruleanLight: "#e8f2f8",
  ceruleanMid:   "#bdd9ec",
  gold:          "#c9a961",
  fawn50:        "#faf5e9",
  border:        "rgba(26,35,50,.14)",
  borderStrong:  "rgba(26,35,50,.22)",
  muted:         "rgba(26,35,50,.45)",
  faint:         "rgba(26,35,50,.3)",
};

// ── A4 ────────────────────────────────────────────────────────────────────────
export const A4W        = 794;
export const A4H        = 1123;
export const mm         = (v) => (v / 210) * A4W;
export const LINE_COUNT = 24;

export const PROT   = { left: mm(34), top: mm(70),  right: mm(12), bottom: mm(16.5) };
export const NOPROT = { left: mm(30), top: mm(35),  right: mm(20), bottom: mm(20)   };

// ── ZOOM / FUENTES ────────────────────────────────────────────────────────────
export const ZOOM_LEVELS = [0.5, 0.65, 0.75, 0.85, 1, 1.25, 1.5];

export const FUENTES = [
  { key: "sitka",      label: "Sitka",          family: "'Sitka Text','Sitka',Georgia,serif" },
  { key: "georgia",    label: "Georgia",         family: "Georgia,serif" },
  { key: "times",      label: "Times New Roman", family: "'Times New Roman',serif" },
  { key: "montserrat", label: "Montserrat",      family: "'Montserrat',sans-serif" },
];

// ── DATOS GEOGR\u00c1FICOS ──────────────────────────────────────────────────────────
export const DEPARTAMENTOS = [
  "Ciudad", "Godoy Cruz", "Guaymall\u00e9n", "Las Heras", "Lavalle",
  "Luj\u00e1n de Cuyo", "Maip\u00fa", "San Mart\u00edn", "Jun\u00edn", "Rivadavia",
  "Santa Rosa", "La Paz", "Tunuy\u00e1n", "Tupungato", "San Carlos",
  "San Rafael", "General Alvear", "Malarg\u00fce",
];

// ── FECHAS ────────────────────────────────────────────────────────────────────
export const MESES_LABEL = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];

export const MESES_ORD = [
  "primero","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez",
  "once","doce","trece","catorce","quince","diecis\u00e9is","diecisiete","dieciocho",
  "diecinueve","veinte","veintiuno","veintid\u00f3s","veintitr\u00e9s","veinticuatro",
  "veinticinco","veintis\u00e9is","veintisiete","veintiocho","veintinueve","treinta","treinta y uno",
];

export const ANIOS_LETRAS = {
  2024: "DOS MIL VEINTICUATRO",
  2025: "DOS MIL VEINTICINCO",
  2026: "DOS MIL VEINTIS\u00c9IS",
  2027: "DOS MIL VEINTISIETE",
  2028: "DOS MIL VEINTIOCHO",
  2029: "DOS MIL VEINTINUEVE",
  2030: "DOS MIL TREINTA",
};

// ── INSTRUMENTOS ──────────────────────────────────────────────────────────────
export const FRECUENTES = [
  "Certificaci\u00f3n de firma",
  "Certificaci\u00f3n de firma \u2013 Formulario 08",
  "Poder especial",
  "Acta de constataci\u00f3n",
  "Autorizaci\u00f3n de viaje",
];

export const INSTRUMENTOS = {
  cert:      ["Certificaci\u00f3n de firma", "Certificaci\u00f3n de firma \u2013 Formulario 08", "Certificaci\u00f3n de copia", "Fe de vida"],
  acta:      ["Acta de constataci\u00f3n", "Acta de notificaci\u00f3n", "Acta de manifestaci\u00f3n"],
  escritura: ["Compraventa", "Poder especial", "Poder general", "Donaci\u00f3n", "Hipoteca"],
  traslado:  ["Primer testimonio", "Testimonios posteriores", "Copia simple"],
};

// ── ESTADOS DE DOCUMENTO ──────────────────────────────────────────────────────
export const ELABELS = {
  borrador: "Borrador",
  revision: "En revisi\u00f3n",
  completo:  "Completo",
};

// ── ESCRIBANOS ────────────────────────────────────────────────────────────────
export const ESCRIBANOS = [
  { nombre: "F\u00c1TIMA A. TAHA",  caracter: "Notaria Adscripta", registro: "853", circunscripcion: "primera", genero: "F" },
  { nombre: "SERGIO MIRANDA", caracter: "Notario Titular",   registro: "412", circunscripcion: "primera", genero: "M" },
];

// ── ESTADO INICIAL DE DOCUMENTO ───────────────────────────────────────────────
export const PARTE_VACIA = () => ({
  id:          Date.now() + Math.random(),
  genero:      "F",
  apellido:    "", nombre:       "", nacionalidad: "argentina",
  tipoDoc:     "DNI", nroDoc:   "", cuit:         "", fechaNac: "",
  estadoCivil: "soltera",
  calle:       "", numero:       "", piso:         "", dpto:    "",
  localidad:   "", departamento: "Ciudad",           rol:      "",
});

export const ESCRIBANO_INI = {
  nombre: "F\u00c1TIMA A. TAHA", caracter: "Notaria Adscripta",
  registro: "853", circunscripcion: "primera",
};

export const FECHA_HOY = () => {
  const h = new Date();
  return { dia: h.getDate(), mes: h.getMonth(), anio: h.getFullYear(), ciudad: "Ciudad" };
};

export const PROTOCOLO_INI = {
  libro:    "Libro de Requerimientos para Certificaciones de Firmas",
  nroLibro: "IV",
  nroActa:  "",
};

export const INSTRUMENTO_INI = {
  descripcion: "", serie: "", nroActuacion: "", fojas: "", esF08: false,
};

// ── ESTILOS COMPARTIDOS ───────────────────────────────────────────────────────
export const inp = {
  padding:     "8px 11px",
  border:      "1px solid rgba(26,35,50,.14)",
  borderRadius: 7,
  fontSize:    13,
  background:  "#FDFCFA",
  color:       "#1a2332",
  fontFamily:  "'Montserrat',sans-serif",
  width:       "100%",
  boxSizing:   "border-box",
};
""")

# ─── utils.js ─────────────────────────────────────────────────────────────────
w("utils.js", """\
import { useEffect } from "react";
import { MESES_ORD, ANIOS_LETRAS } from "./constants";

/** Cierra un dropdown al hacer click fuera del ref */
export function useClickOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cb();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}

/** Convierte n\u00famero de d\u00eda a letras may\u00fasculas */
export const diaLetras  = (n) => (MESES_ORD[n - 1] || String(n)).toUpperCase();

/** Convierte a\u00f1o num\u00e9rico a letras may\u00fasculas */
export const anioLetras = (n) => ANIOS_LETRAS[n] || String(n);

/** Devuelve forma femenina o masculina seg\u00fan g\u00e9nero de la parte */
export const gen = (p, f, m) => (p.genero === "F" ? f : m);
""")

# ─── components/ui/Btn.jsx ───────────────────────────────────────────────────
w("components/ui/Btn.jsx", """\
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
""")

# ─── components/ui/FormElements.jsx ─────────────────────────────────────────
w("components/ui/FormElements.jsx", """\
import { C } from "../../constants";

/** Grupo de campo con label */
export function Fg({ label, children, full }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1/-1" : undefined }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: C.muted, fontFamily: "'Montserrat',sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** Advertencia en tono dorado */
export function Warn({ children }) {
  return (
    <div style={{
      display: "flex", gap: 8, padding: "10px 12px",
      background: C.fawn50, borderRadius: 7,
      border: "1px solid rgba(201,169,97,.3)",
      fontSize: 13, color: "#4e3d21", fontFamily: "'Montserrat',sans-serif",
    }}>
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <path d="M6.5 1.5L12 11H1L6.5 1.5z" stroke="#a6864a" strokeWidth="1.3" fill="none" />
        <path d="M6.5 5v2.5" stroke="#a6864a" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="6.5" cy="9.2" r=".7" fill="#a6864a" />
      </svg>
      {children}
    </div>
  );
}

/** Variable resaltada en el documento */
export function Var({ children, empty, show, label }) {
  if (!show) return <span style={{ color: C.dark }}>{children || ""}</span>;
  const isEmpty = empty || children === "" || children == null;
  return (
    <span style={{
      background:   isEmpty ? "#fdeaea" : C.fawn50,
      borderBottom: isEmpty ? "1.5px dashed rgba(180,40,40,.55)" : \`1.5px dashed \${C.gold}\`,
      color:        isEmpty ? "#7a1a1a" : "#4e3d21",
      borderRadius: 2,
      padding:      "0 2px",
    }}>
      {isEmpty ? \`\u26a0 \${label || "pendiente"}\` : children}
    </span>
  );
}
""")

# ─── components/ui/Toolbar.jsx ──────────────────────────────────────────────
w("components/ui/Toolbar.jsx", """\
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
        padding:    "5px 10px",
        border:     \`1px solid \${on ? C.cerulean : C.borderStrong}\`,
        borderRadius: 6,
        background: on ? C.ceruleanLight : "transparent",
        color:      on ? "#1f4862" : C.dark,
        fontSize:   13, fontWeight: 500,
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
  return <div style={{ width: 1, height: 18, background: "rgba(26,35,50,.18)", margin: "0 4px", flexShrink: 0 }} />;
}

export function Dropdown({ open, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 5px)", left: 0,
      background: "#fff", border: \`1px solid \${C.border}\`,
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
        <div style={{
          padding: "6px 13px 3px", fontSize: 9, fontWeight: 600,
          letterSpacing: ".08em", textTransform: "uppercase",
          color: C.faint, fontFamily: "'Montserrat',sans-serif",
        }}>
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
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}
""")

# ─── components/NavBar.jsx ───────────────────────────────────────────────────
w("components/NavBar.jsx", """\
import { C, ELABELS } from "../constants";

export function NavBar({ docTitle, estado, onStatus, onExport }) {
  return (
    <nav style={{
      background: C.dark, height: 50,
      display: "flex", alignItems: "center",
      padding: "0 24px", flexShrink: 0, gap: 12, zIndex: 10,
    }}>
      {/* Logo */}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 1.5C7 1.5 9 4 12 4C12 8 9.5 11 7 12.5C4.5 11 2 8 2 4C5 4 7 1.5 7 1.5Z"
          stroke="#FDFCFA" strokeWidth="1.2" strokeLinejoin="round"
        />
      </svg>
      <div style={{ width: 1, height: 16, background: "rgba(253,252,250,.2)" }} />
      <span style={{ color: "#FDFCFA", fontSize: 13, fontWeight: 700 }}>Notarial</span>

      {/* Titulo del documento */}
      {docTitle && (
        <span style={{
          color: "rgba(253,252,250,.5)", fontSize: 13,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          / {docTitle}
        </span>
      )}

      {/* Acciones */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {docTitle && (
          <>
            <button onClick={onStatus} style={{
              border: "1px solid rgba(255,255,255,.2)", borderRadius: 20,
              background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.75)",
              fontSize: 13, fontWeight: 500, padding: "3px 12px",
              fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
            }}>
              {ELABELS[estado]}
            </button>
            <button onClick={onExport} style={{
              border: "1px solid rgba(255,255,255,.2)", borderRadius: 7,
              background: "transparent", color: "rgba(255,255,255,.8)",
              fontSize: 13, fontWeight: 500, padding: "5px 12px",
              fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
            }}>
              Exportar
            </button>
          </>
        )}
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%", background: C.gold,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: "#FDFCFA",
        }}>
          FT
        </div>
      </div>
    </nav>
  );
}
""")

# ─── components/Modal.jsx ────────────────────────────────────────────────────
w("components/Modal.jsx", """\
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
        border: \`1px solid \${C.border}\`,
        width: 680, maxWidth: "94vw", maxHeight: "92vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 8px 32px rgba(26,35,50,.12)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: \`1px solid \${C.border}\`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{title}</span>
          <button onClick={onClose} style={{
            background: "none", border: "none",
            fontSize: 20, color: C.muted, cursor: "pointer",
          }}>
            \u00d7
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: "12px 18px", borderTop: \`1px solid \${C.border}\`,
            display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
""")

# ─── components/modals/ (placeholders) ──────────────────────────────────────
w("components/modals/ModalPartes.jsx", """\
// TODO: implementar en el paso del Editor
export function ModalPartes() { return null; }
""")

w("components/modals/ModalOtros.jsx", """\
// TODO: implementar en el paso del Editor
export function ModalEscribano()  { return null; }
export function ModalInstrumento(){ return null; }
export function ModalProtocolo()  { return null; }
export function ModalFecha()      { return null; }
""")

# ─── screens/HomeScreen.jsx ──────────────────────────────────────────────────
w("screens/HomeScreen.jsx", """\
// TODO: implementar en el siguiente paso
import { C } from "../constants";
import { NavBar } from "../components/NavBar";

export function HomeScreen({ onGo }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.warm, fontFamily: "'Montserrat',sans-serif" }}>
      <NavBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: C.muted, fontSize: 14 }}>HomeScreen \u2014 en construcci\u00f3n</p>
      </div>
    </div>
  );
}
""")

# ─── screens/SelectorScreen.jsx ─────────────────────────────────────────────
w("screens/SelectorScreen.jsx", """\
// TODO: implementar
import { C } from "../constants";
import { NavBar } from "../components/NavBar";

export function SelectorScreen({ onGo }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.warm, fontFamily: "'Montserrat',sans-serif" }}>
      <NavBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: C.muted, fontSize: 14 }}>SelectorScreen \u2014 en construcci\u00f3n</p>
      </div>
    </div>
  );
}
""")

# ─── screens/EditorScreen.jsx ────────────────────────────────────────────────
w("screens/EditorScreen.jsx", """\
// TODO: implementar
import { C } from "../constants";
import { NavBar } from "../components/NavBar";

export function EditorScreen({ onGo }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.warm, fontFamily: "'Montserrat',sans-serif" }}>
      <NavBar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: C.muted, fontSize: 14 }}>EditorScreen \u2014 en construcci\u00f3n</p>
      </div>
    </div>
  );
}
""")

# ─── App.jsx ──────────────────────────────────────────────────────────────────
w("App.jsx", """\
import { useState } from "react";
import { HomeScreen }     from "./screens/HomeScreen";
import { SelectorScreen } from "./screens/SelectorScreen";
import { EditorScreen }   from "./screens/EditorScreen";

export default function App() {
  const [screen, setScreen] = useState("home");
  return (
    <>
      <style>{\`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; }
        body { background: #f0ece3; font-family: 'Montserrat', sans-serif; }
        [contenteditable]:focus { outline: none; }
        ::-webkit-scrollbar       { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(26,35,50,.2); border-radius: 3px; }
      \`}</style>

      {screen === "home"     && <HomeScreen     onGo={setScreen} />}
      {screen === "selector" && <SelectorScreen onGo={setScreen} />}
      {screen === "editor"   && <EditorScreen   onGo={setScreen} />}
    </>
  );
}
""")

# ─── index.css (vaciar el default de Vite) ──────────────────────────────────
w("index.css", "/* estilos globales — agregar aqui si es necesario */\n")

print("\n\u2713 Scaffolding completo.")
print("  Estructura creada:")
for f in sorted(ROOT.rglob("*")):
    if f.is_file():
        print(f"    {f}")
print("\nCorrer en el proyecto:")
print("  npm run dev")
