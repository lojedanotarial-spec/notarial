// "Expediente del documento": ver a qué expediente pertenece el documento y vincularlo, cambiarlo o quitarlo SIN salir del editor.
// Apenas hay un expediente, el editor sabe dónde buscar la documentación (personas y archivos). Spec: specs/personas-expediente/ (UC-3).
import { useEffect, useMemo, useState } from "react";
import { C } from "../../constants";
import { supabase } from "../../supabase";
import { vincularDocumentoAExpediente } from "../../utils/expedienteVinculo";
import { normalizarTexto } from "../../utils/personasDatos";
import { Aviso, FilaEsqueleto, Modal } from "./comunes";
import { boton, botonTexto, campo } from "./estilos";

// actual: { id, nombre } | null · onCambiado(expediente | null) avisa al editor para que actualice la franja y el indicador
export default function ModalExpedienteDocumento({ docId, registroId, actual, onCambiado, onCrearNuevo, onIrAlExpediente, onClose }) {
  const [lista, setLista] = useState({ estado: "cargando", items: [], mensaje: "" });
  const [texto, setTexto] = useState("");
  const [trabajando, setTrabajando] = useState(null);   // id del expediente (o "quitar") con una acción en curso
  const [error, setError] = useState("");

  async function cargar() {
    let q = supabase.from("expedientes").select("id, nombre, tipo_acto, estado").order("created_at", { ascending: false }).limit(300);
    if (registroId) q = q.eq("registro_id", registroId);
    const { data, error: e } = await q;
    setLista(e ? { estado: "error", items: [], mensaje: "No pude cargar tus expedientes." } : { estado: "ok", items: data || [], mensaje: "" });
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibles = useMemo(() => {
    const q = normalizarTexto(texto);
    return lista.items.filter((e) => e.id !== actual?.id && (!q || normalizarTexto(`${e.nombre} ${e.tipo_acto ?? ""}`).includes(q)));
  }, [lista.items, texto, actual]);

  // Un documento queda en UN expediente: cambiar = quitar el vínculo anterior y crear el nuevo.
  async function elegir(exp) {
    setTrabajando(exp.id);
    setError("");
    try {
      const { error: e1 } = await supabase.from("expediente_documentos").delete().eq("documento_id", docId);
      if (e1) throw new Error(e1.message);
      const r = await vincularDocumentoAExpediente(supabase, exp.id, docId);
      if (!r.ok) throw new Error(r.error);
      onCambiado({ id: exp.id, nombre: exp.nombre });
      onClose();
    } catch {
      setError("No pude vincular el documento. Probá de nuevo en un momento.");
      setTrabajando(null);
    }
  }

  async function quitar() {
    setTrabajando("quitar");
    setError("");
    try {
      const { error: e } = await supabase.from("expediente_documentos").delete().eq("documento_id", docId);
      if (e) throw new Error(e.message);
      onCambiado(null);
      onClose();
    } catch {
      setError("No pude quitar el vínculo. Probá de nuevo en un momento.");
      setTrabajando(null);
    }
  }

  return (
    <Modal titulo="Expediente del documento" ancho={560} onCerrar={onClose} bloqueado={!!trabajando}>
      <div style={{ padding: "8px 22px 0", overflow: "auto", flex: 1 }}>
        {!docId && <Aviso tipo="aviso" estilo={{ marginBottom: 10 }}>El documento todavía no se guardó. Esperá un momento y volvé a abrir esta ventana.</Aviso>}
        {error && <Aviso tipo="error" estilo={{ marginBottom: 10 }}>{error}</Aviso>}

        {actual ? (
          <div style={{ border: `1px solid ${C.ceruleanMid}`, background: C.ceruleanLight, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.faint }}>Este documento está en el expediente</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, margin: "2px 0 8px", overflow: "hidden", textOverflow: "ellipsis" }}>{actual.nombre || "Expediente"}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={onIrAlExpediente} disabled={!!trabajando} style={boton(false, !!trabajando)}>Ir al expediente</button>
              <button onClick={quitar} disabled={!!trabajando} style={{ ...botonTexto, color: C.danger }}>{trabajando === "quitar" ? "Quitando…" : "Quitar del expediente"}</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5, marginBottom: 12 }}>
            Este documento no está en ningún expediente. Si lo vinculás, vas a ver arriba de las partes las personas del expediente y sus archivos, y podés usarlas sin volver a cargar nada.
          </div>
        )}

        <label htmlFor="buscar-exp" style={{ fontSize: 12, color: C.faint }}>{actual ? "Cambiar a otro expediente" : "Buscar un expediente"}</label>
        <input id="buscar-exp" data-autofocus type="search" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" placeholder="Por ejemplo: García" style={{ ...campo, margin: "4px 0 10px" }} />

        <div style={{ minHeight: 100, paddingBottom: 8 }}>
          {lista.estado === "cargando" && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><FilaEsqueleto /><FilaEsqueleto /></div>}
          {lista.estado === "error" && <Aviso tipo="error">{lista.mensaje} <button onClick={() => { setLista((l) => ({ ...l, estado: "cargando" })); cargar(); }} style={{ ...boton(false), padding: "4px 10px", marginLeft: 8 }}>Reintentar</button></Aviso>}
          {lista.estado === "ok" && visibles.length === 0 && (
            <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5 }}>
              {texto.trim() ? <>No encontré expedientes que coincidan con «{texto.trim()}».</> : lista.items.length === 0 ? "Todavía no tenés expedientes. Podés crear el primero ahora." : "No hay otros expedientes para elegir."}
            </div>
          )}
          {lista.estado === "ok" && visibles.length > 0 && (
            <ul aria-label="Expedientes" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {visibles.slice(0, 40).map((e) => (
                <li key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nombre}</div>
                    {e.tipo_acto && <div style={{ fontSize: 11, color: C.faint }}>{e.tipo_acto}</div>}
                  </div>
                  <button onClick={() => elegir(e)} disabled={!docId || !!trabajando} aria-label={`${actual ? "Cambiar" : "Vincular"} el documento a ${e.nombre}`} style={boton(false, !docId || !!trabajando)}>
                    {trabajando === e.id ? "Vinculando…" : actual ? "Cambiar a este" : "Vincular"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {visibles.length > 40 && <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>Hay más expedientes: escribí en el buscador para acotar.</div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 22px 18px", borderTop: `1px solid ${C.border}` }}>
        <button onClick={onCrearNuevo} disabled={!!trabajando} style={{ ...botonTexto, fontSize: 12 }}>Crear un expediente nuevo…</button>
        <button onClick={onClose} disabled={!!trabajando} style={boton(true, !!trabajando)}>Cerrar</button>
      </div>
    </Modal>
  );
}
