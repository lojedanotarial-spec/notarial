import { R } from "../../theme";
import { infoEstado } from "../../utils/estadosExpediente";

// Insignia de estado del expediente: siempre ícono + texto (nunca solo color).
const ICONOS = {
  abierto: <circle cx="8" cy="8" r="5.5" />,
  en_tramite: <><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2 1.3" strokeLinecap="round" /></>,
  completado: <><circle cx="8" cy="8" r="5.5" /><path d="M5.6 8.2l1.7 1.7 3.2-3.4" strokeLinecap="round" strokeLinejoin="round" /></>,
  cerrado: <><rect x="3.5" y="7" width="9" height="6.5" rx="1.2" /><path d="M5.5 7V5.3a2.5 2.5 0 015 0V7" /></>,
};

export function InsigniaEstado({ estado }) {
  const st = infoEstado(estado);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap",
      fontSize: 11, fontWeight: 600, lineHeight: "16px", padding: "2px 9px 2px 7px",
      borderRadius: R.xl, color: st.color, background: st.fondo,
    }}>
      {st.icono && (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          {ICONOS[st.icono]}
        </svg>
      )}
      {st.label}
    </span>
  );
}
