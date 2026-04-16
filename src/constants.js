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

export const PROT   = { left:mm(36), top:mm(76), right:mm(15), bottom:mm(20) };
export const NOPROT = { left:mm(30), top:mm(35), right:mm(20), bottom:mm(20) };

// ── ZOOM / FUENTES ────────────────────────────────────────────────────────────
export const ZOOM_LEVELS = [0.5, 0.65, 0.75, 0.85, 1, 1.25, 1.5];

export const FUENTES = [
  { key:"merriweather", label:"Merriweather", family:"'Merriweather',serif" },
  { key:"georgia",    label:"Georgia",         family:"Georgia,serif" },
  { key:"times",      label:"Times New Roman", family:"'Times New Roman',serif" },
  { key:"montserrat", label:"Montserrat",      family:"'Montserrat',sans-serif" },
];

// ── DATOS GEOGRÁFICOS ─────────────────────────────────────────────────────────
export const DEPARTAMENTOS = [
  "Ciudad", "Godoy Cruz", "Guaymallén", "Las Heras", "Lavalle",
  "Luján de Cuyo", "Maipú", "San Martín", "Junín", "Rivadavia",
  "Santa Rosa", "La Paz", "Tunuyán", "Tupungato", "San Carlos",
  "San Rafael", "General Alvear", "Malargüe",
];

// ── FECHAS ────────────────────────────────────────────────────────────────────
export const MESES_LABEL = [
  "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
  "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE",
];

export const MESES_ORD = [
  "primero","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez",
  "once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho",
  "diecinueve","veinte","veintiuno","veintidós","veintitrés","veinticuatro",
  "veinticinco","veintiséis","veintisiete","veintiocho","veintinueve","treinta","treinta y uno",
];

export const ANIOS_LETRAS = {
  2024: "DOS MIL VEINTICUATRO",
  2025: "DOS MIL VEINTICINCO",
  2026: "DOS MIL VEINTISÉIS",
  2027: "DOS MIL VEINTISIETE",
  2028: "DOS MIL VEINTIOCHO",
  2029: "DOS MIL VEINTINUEVE",
  2030: "DOS MIL TREINTA",
};

// ── INSTRUMENTOS ──────────────────────────────────────────────────────────────
export const FRECUENTES = [
  "Certificación de firma",
  "Certificación de firma - Formulario 08",
  "Poder especial",
  "Acta de constatación",
  "Autorización de viaje",
];

export const INSTRUMENTOS = {
  cert:      ["Certificación de firma", "Certificación de firma - Formulario 08", "Certificación de copia", "Fe de vida"],
  acta:      ["Acta de constatación", "Acta de notificación", "Acta de manifestación"],
  escritura: ["Compraventa", "Poder especial", "Poder general", "Donación", "Hipoteca"],
  traslado:  ["Primer testimonio", "Testimonios posteriores", "Copia simple"],
};

// ── ESTADOS DE DOCUMENTO ──────────────────────────────────────────────────────
export const ELABELS = {
  borrador: "Borrador",
  revision: "En revisión",
  completo: "Completo",
};

// ── ESCRIBANOS ────────────────────────────────────────────────────────────────
export const ESCRIBANOS = [
  { nombre:"FÁTIMA A. TAHA",  caracter:"Notaria Adscripta", registro:"853", circunscripcion:"primera", genero:"F" },
  { nombre:"SERGIO MIRANDA",  caracter:"Notario Titular",   registro:"853", circunscripcion:"primera", genero:"M" },
];

// ── ESTADO INICIAL DE DOCUMENTO ───────────────────────────────────────────────
export const PARTE_VACIA = () => ({
  id:          Date.now() + Math.random(),
  genero:      "F",
  apellido:    "", nombre:       "", nacionalidad: "argentina",
  tipoDoc:     "DNI", nroDoc:   "", cuit:         "", fechaNac: "",
  estadoCivil: "",
  calle:       "", numero:       "", piso:         "", dpto:    "",
  localidad:   "", departamento: "Ciudad",           rol:      "",
});

export const ESCRIBANO_INI = {
  nombre: "FÁTIMA A. TAHA", caracter: "Notaria Adscripta",
  registro: "853", circunscripcion: "primera",
};

export const FECHA_HOY = () => {
  const h = new Date();
  return { dia: h.getDate(), mes: h.getMonth(), anio: h.getFullYear(), ciudad: "Ciudad" };
};

export const PROTOCOLO_INI = {
  libro:    "Libro de Requerimientos para Certificaciones de Firmas",
  nroLibro: "",
  nroActa:  "",
};

export const INSTRUMENTO_INI = {
  descripcion: "", serie: "", nroActuacion: "", fojas: "", esF08: false,
};

// ── ESTILOS COMPARTIDOS ───────────────────────────────────────────────────────
export const inp = {
  padding:      "8px 11px",
  border:       "1px solid rgba(26,35,50,.14)",
  borderRadius: 7,
  fontSize:     13,
  background:   "#FDFCFA",
  color:        "#1a2332",
  fontFamily:   "'Montserrat',sans-serif",
  width:        "100%",
  boxSizing:    "border-box",
};
