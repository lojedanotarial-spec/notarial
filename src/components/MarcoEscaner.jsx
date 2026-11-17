// Lo que se ve encima del visor cuando el escáner automático está prendido: el contorno del documento encontrado, el avance
// hasta la foto y una frase que dice qué está pasando (no solo color). Las coordenadas del marco son las del video, y el
// SVG usa la misma regla de ajuste que el <video> ("meet" = contain, "slice" = cover), así coinciden sin hacer cuentas.

// Colores propios de la pantalla de la cámara (fondo negro): no son parte de la paleta clara del producto.
const MARCO = { buscando: "rgba(255,255,255,.55)", apuntando: "#ffffff", enfocando: "#ffd54f", esperando: "#7bd88f", pista: "rgba(0,0,0,.55)" }; // design-lint-ignore

const FRASES = {
  buscando: "Apuntá al documento. Se saca sola cuando esté quieto.",
  apuntando: "Detecté un documento. Mantenelo quieto…",
  enfocando: "Esperá, estoy enfocando…",
  esperando: "Foto sacada. Cambiá de documento o dalo vuelta.",
};

function fraseDelEscaner(fase) { return FRASES[fase] || FRASES.buscando; }

export default function MarcoEscaner({ estado, ajuste = "meet" }) {
  const { rect, ancho, alto, fase, progreso } = estado;
  if (!rect || !ancho || !alto || fase === "buscando") return null;
  const x = rect.x * ancho, y = rect.y * alto, w = rect.w * ancho, h = rect.h * alto;
  const color = MARCO[fase] || MARCO.apuntando;
  const radio = Math.min(w, h) * 0.04;
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio={ajuste === "slice" ? "xMidYMid slice" : "xMidYMid meet"}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <rect x={x} y={y} width={w} height={h} rx={radio} fill="none" stroke={MARCO.pista} strokeWidth="7" vectorEffect="non-scaling-stroke" />
      <rect x={x} y={y} width={w} height={h} rx={radio} fill="none" stroke={color} strokeWidth="4" vectorEffect="non-scaling-stroke"
        strokeDasharray={fase === "apuntando" && progreso < 1 ? "14 8" : undefined} />
    </svg>
  );
}

// Barra de avance + frase, para poner en el pie del visor.
export function PistaEscaner({ fase, progreso }) {
  return (
    <div style={{ position: "absolute", left: 14, right: 14, bottom: 12, textAlign: "center", textShadow: "0 1px 3px #000" }}> {/* design-lint-ignore */}
      <div role="status" aria-live="polite" style={{ fontSize: 13, lineHeight: 1.4 }}>{fraseDelEscaner(fase)}</div>
      {fase === "apuntando" && (
        <div aria-hidden="true" style={{ margin: "6px auto 0", width: 120, height: 4, borderRadius: 4, background: "rgba(255,255,255,.3)", overflow: "hidden" }}>
          <div style={{ width: `${Math.round(progreso * 100)}%`, height: "100%", background: "#fff" }} />
        </div>
      )}
    </div>
  );
}
