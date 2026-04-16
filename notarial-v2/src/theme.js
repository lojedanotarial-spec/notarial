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
  danger:        "#c0392b",
};

// ── TIPOGRAFÍA — 3 niveles ────────────────────────────────────────────────────
export const T = {
  // Nivel 1 — Principal: nombres, valores, títulos
  l1: { fontSize: 14, color: "#1a2332", fontWeight: 600 },
  // Nivel 2 — Secundario: subtítulos, metadata, descripciones
  l2: { fontSize: 12, color: "rgba(26,35,50,.6)", fontWeight: 400 },
  // Nivel 3 — Label: etiquetas en mayúsculas, texto de apoyo
  l3: { fontSize: 11, color: "rgba(26,35,50,.4)", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: ".07em" },
};

// ── BORDES Y RADIOS ───────────────────────────────────────────────────────────
export const R = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   20,
  full: 9999,
};

// ── ESPACIADO ─────────────────────────────────────────────────────────────────
export const S = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

// ── ESTILOS COMPARTIDOS ───────────────────────────────────────────────────────
export const inp = {
  padding:      "8px 11px",
  border:       "1px solid rgba(26,35,50,.14)",
  borderRadius: R.md,
  fontSize:     T.l2.fontSize,
  background:   "#FDFCFA",
  color:        "#1a2332",
  fontFamily:   "'Montserrat',sans-serif",
  width:        "100%",
  boxSizing:    "border-box",
};

// ── SOMBRAS ───────────────────────────────────────────────────────────────────
export const shadow = {
  page:  "0 2px 16px rgba(26,35,50,.13)",
  modal: "0 8px 32px rgba(26,35,50,.12)",
  fab:   "0 4px 20px rgba(58,124,165,.45)",
};
