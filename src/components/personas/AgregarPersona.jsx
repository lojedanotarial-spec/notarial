// "Agregar persona": buscar en la libreta del registro (por apellido, nombre o documento) o crear una nueva. Una persona existe una sola vez
// en el registro: si ya está, se la agrega al expediente en vez de cargarla de nuevo. Spec: specs/personas-expediente/ (UC-1).
import { useMemo, useState } from "react";
import { C } from "../../constants";
import { filtrarLibreta, nombreCompleto, resumenPersona, textoActualizada } from "../../utils/personasCliente";
import { Aviso, FilaEsqueleto, Modal } from "./comunes";
import { boton, campo, fuente, iniciales } from "./estilos";

// libreta: { estado: "cargando" | "error" | "ok", lista, mensaje } · yaEstan: Set de ids que ya están en el expediente
export default function AgregarPersona({ libreta, yaEstan, onAgregar, onCrear, onReintentar, onCerrar }) {
  const [texto, setTexto] = useState("");
  const [agregando, setAgregando] = useState(null);   // id de la persona que se está agregando
  const [error, setError] = useState("");
  const resultados = useMemo(() => filtrarLibreta(libreta.lista, texto, yaEstan), [libreta.lista, texto, yaEstan]);
  const buscando = texto.trim().length > 0;
  const yaAgregadas = useMemo(() => (buscando ? filtrarLibreta(libreta.lista, texto, new Set(), 5).filter((p) => yaEstan.has(p.id)) : []), [libreta.lista, texto, yaEstan, buscando]);
  const todasEstan = !buscando && libreta.estado === "ok" && libreta.lista.length > 0 && resultados.length === 0;

  async function agregar(p) {
    setAgregando(p.id);
    setError("");
    try { await onAgregar(p); } catch (e) { setError(e.message); setAgregando(null); }
  }

  return (
    <Modal titulo="Agregar persona" ancho={560} onCerrar={onCerrar} bloqueado={!!agregando}>
      <div style={{ padding: "6px 22px 0", fontSize: 12, color: C.faint, lineHeight: 1.5 }}>
        Buscá a la persona en tu libreta: si ya la cargaste en otro trámite, no hace falta escribir todo de nuevo.
      </div>
      <div style={{ padding: "12px 22px 0" }}>
        <label htmlFor="buscar-persona" style={{ fontSize: 12, color: C.faint }}>Buscar por apellido, nombre o DNI</label>
        <input id="buscar-persona" data-autofocus type="search" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off"
          placeholder="Por ejemplo: Pérez o 31645431" style={{ ...campo, marginTop: 4 }} />
      </div>

      <div style={{ padding: "12px 22px", overflow: "auto", flex: 1, minHeight: 120 }}>
        {error && <Aviso tipo="error" estilo={{ marginBottom: 10 }}>{error}</Aviso>}
        {libreta.estado === "cargando" && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><FilaEsqueleto /><FilaEsqueleto /></div>}
        {libreta.estado === "error" && (
          <Aviso tipo="error">{libreta.mensaje || "No pude cargar tu libreta de personas."} <button onClick={onReintentar} style={{ ...boton(false), padding: "4px 10px", marginLeft: 8 }}>Reintentar</button></Aviso>
        )}
        {libreta.estado === "ok" && (
          <>
            {libreta.lista.length === 0 && <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5 }}>Todavía no tenés personas en la libreta. Creá la primera y quedará guardada para los próximos trámites.</div>}
            {todasEstan && <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5 }}>Ya agregaste a todas las personas de tu libreta a este expediente.</div>}
            {buscando && resultados.length === 0 && yaAgregadas.length > 0 && (
              <Aviso tipo="info">{yaAgregadas.map((p) => nombreCompleto(p)).join(" y ")} {yaAgregadas.length === 1 ? "ya está" : "ya están"} en este expediente.</Aviso>
            )}
            {buscando && resultados.length === 0 && yaAgregadas.length === 0 && <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5 }}>No encontré a nadie que coincida con «{texto.trim()}». Probá con otro dato o creala como persona nueva.</div>}
            {resultados.length > 0 && (
              <ul aria-label="Resultados de la búsqueda" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {resultados.map((p) => (
                  <li key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 14px" }}>
                    <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: C.ceruleanLight, color: C.ceruleanText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, fontFamily: fuente, flexShrink: 0 }}>{iniciales(p)}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombreCompleto(p)}</div>
                      <div style={{ fontSize: 11, color: C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[resumenPersona(p), textoActualizada(p.updated_at)].filter(Boolean).join(" · ")}</div>
                    </div>
                    <button onClick={() => agregar(p)} disabled={!!agregando} aria-label={`Agregar a ${nombreCompleto(p)}`} style={boton(false, !!agregando)}>{agregando === p.id ? "Agregando…" : "Agregar"}</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", padding: "12px 22px 18px", borderTop: `1px solid ${C.border}` }}>
        <button onClick={() => onCrear(texto.trim())} disabled={!!agregando} style={boton(true, !!agregando)}>Crear persona nueva</button>
        <button onClick={onCerrar} disabled={!!agregando} style={boton(false, !!agregando)}>Cancelar</button>
      </div>
    </Modal>
  );
}
