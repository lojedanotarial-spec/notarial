import { C } from "../constants";

export function ConfirmRegenerar({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(26,35,50,.5)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: C.porcelain, borderRadius: 12, padding: "24px 24px 18px",
        width: 360, boxShadow: "0 8px 32px rgba(26,35,50,.18)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 8 }}>
          Tenés texto escrito a mano sin guardar
        </div>
        <div style={{ fontSize: 13, color: "rgba(26,35,50,.6)", marginBottom: 20, lineHeight: 1.5 }}>
          Cambiaste un dato que actualizaría el documento, pero hay texto que
          escribiste directamente en el editor que todavía no se guardó. Si
          continuás, ese texto se pierde y el documento se reemplaza por la
          versión con los datos nuevos.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel}
                  style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid rgba(26,35,50,.14)",
                           background: "transparent", fontSize: 13, fontWeight: 600, color: C.dark,
                           cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
                  style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #c9a961",
                           background: "#c9a961", fontSize: 13, fontWeight: 700, color: "#fff",
                           cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            Sí, reemplazar y perder lo escrito a mano
          </button>
        </div>
      </div>
    </div>
  );
}
