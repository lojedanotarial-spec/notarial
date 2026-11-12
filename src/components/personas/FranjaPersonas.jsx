// Franja "Personas del expediente" arriba del editor de partes: las personas ya cargadas en el expediente del documento, siempre a la vista.
// Tocar una completa la parte abierta con los datos de su ficha (sin volver a leer ningún archivo). El documento guarda SU PROPIA copia:
// cambiar la ficha después no altera un documento ya armado. Spec: specs/personas-expediente/ (UC-3).
import { C } from "../../constants";
import { nombreCompleto, resumenPersona, textoActualizada } from "../../utils/personasCliente";
import { boton, fuente } from "./estilos";

// partes: las del documento (para marcar cuáles ya se usaron) · personas: las del expediente
export default function FranjaPersonas({ nombreExpediente, personas, partes, estado = "ok", onUsar, onVerArchivos }) {
  const numeroDeParte = (p) => { const i = partes.findIndex((x) => x._personaId === p.id); return i >= 0 ? i + 1 : null; };
  return (
    <section aria-label="Personas del expediente" style={{ background: C.ceruleanLight, border: "1px solid rgba(58,124,165,.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ceruleanText, fontFamily: fuente }}>
          Personas del expediente{nombreExpediente ? ` «${nombreExpediente}»` : ""}
        </div>
        {onVerArchivos && <button type="button" onClick={onVerArchivos} style={{ ...boton(false), padding: "4px 12px" }}>Ver archivos del expediente</button>}
      </div>

      {estado === "cargando" && <div role="status" style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>Cargando las personas…</div>}
      {estado === "error" && <div role="alert" style={{ fontSize: 12, color: C.danger, marginTop: 6 }}>No pude cargar las personas del expediente. Podés seguir cargando las partes a mano.</div>}
      {estado === "ok" && personas.length === 0 && (
        <div style={{ fontSize: 12, color: C.faint, marginTop: 6, lineHeight: 1.5 }}>
          Este expediente todavía no tiene personas. Cargalas en la pestaña <strong>Personas</strong> del expediente y van a aparecer acá para usarlas con un toque.
        </div>
      )}
      {estado === "ok" && personas.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: C.faint, marginTop: 2, marginBottom: 8 }}>Tocá una persona para completar la parte que tenés abierta.</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {personas.map((p) => {
              const n = numeroDeParte(p);
              return (
                <li key={p.id} style={{ minWidth: 0 }}>
                  <button type="button" onClick={() => onUsar(p)} aria-label={`Usar a ${nombreCompleto(p)} en la parte abierta${n ? ` (ya es la parte ${n})` : ""}`}
                    style={{ textAlign: "left", background: "#fff", border: `1px solid ${n ? C.ceruleanMid : C.borderStrong}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif", maxWidth: 300 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nombreCompleto(p)}{n && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: C.ceruleanText, background: C.ceruleanLight, borderRadius: 6, padding: "1px 6px" }}>Parte {n}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[resumenPersona(p), textoActualizada(p.updated_at).toLowerCase()].filter(Boolean).join(" · ")}</div>
                    {p.notas && <div title={p.notas} style={{ fontSize: 11, color: C.warnText, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Nota: {p.notas}</div>}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
