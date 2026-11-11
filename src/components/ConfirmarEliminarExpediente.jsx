// Confirmación para eliminar un expediente. Nombra el expediente y, si tiene archivos, dice cuántos son y qué pasa con ellos:
// dejan de verse ya y se eliminan del almacenamiento a los 30 días. Spec: specs/almacenamiento-propio/ (UC-2).
// `cantidadArchivos`: undefined = todavía se está contando · null = no se pudo contar · número = cuántos tiene.
import { useEffect } from "react";
import { C } from "../constants";
import { textoArchivos } from "../utils/driveCliente";

const boton = { padding: "7px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" };

export default function ConfirmarEliminarExpediente({ nombre, cantidadArchivos, onConfirm, onCancel }) {
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCancel]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label="Eliminar expediente" style={{ background: "#FDFCFA", borderRadius: 12, padding: "28px 28px 20px", width: "100%", maxWidth: 380, boxShadow: "0 8px 32px rgba(26,35,50,.18)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Eliminar expediente</div>
        <div style={{ fontSize: 13, color: C.faint, marginBottom: 20, lineHeight: 1.5 }}>
          ¿Eliminar <strong style={{ color: C.dark }}>{nombre}</strong>? Esta acción no se puede deshacer. {textoArchivos(cantidadArchivos)}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button autoFocus onClick={onCancel} style={{ ...boton, border: `1px solid ${C.borderStrong}`, background: "transparent", fontWeight: 600, color: C.dark }}>Cancelar</button>
          <button onClick={onConfirm} disabled={cantidadArchivos === undefined}
            style={{ ...boton, border: "1px solid #c0392b", background: "#fdf0f0", fontWeight: 700, color: "#c0392b", opacity: cantidadArchivos === undefined ? 0.5 : 1, cursor: cantidadArchivos === undefined ? "default" : "pointer" }}>
            Eliminar expediente
          </button>
        </div>
      </div>
    </div>
  );
}
