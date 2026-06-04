import { useState, useEffect } from "react";
import { C, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { supabase } from "../../supabase";

export function ModalAgregarExpediente({ docId, registroId, onClose, onGo }) {
  const [expedientes, setExpedientes] = useState([]);
  const [query, setQuery]             = useState("");
  const [cargando, setCargando]       = useState(true);
  const [modoNuevo, setModoNuevo]     = useState(false);
  const [nombre, setNombre]           = useState("");
  const [guardando, setGuardando]     = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    let q = supabase.from("expedientes").select("id, nombre, tipo_acto, estado")
      .order("created_at", { ascending: false }).limit(30);
    if (registroId) q = q.eq("registro_id", registroId);
    const { data } = await q;
    setExpedientes(data || []);
    setCargando(false);
  }

  async function vincular(expedienteId) {
    await supabase.from("expediente_documentos").upsert({
      expediente_id: expedienteId,
      documento_id: docId,
    }, { onConflict: "expediente_id,documento_id" });
    onClose();
    onGo?.("expediente", { expedienteId });
  }

  async function crearYVincular() {
    if (!nombre.trim()) return;
    setGuardando(true);
    const { data: exp } = await supabase.from("expedientes").insert({
      nombre: nombre.trim(), registro_id: registroId || null, estado: "abierto",
    }).select().single();
    if (exp) await vincular(exp.id);
    setGuardando(false);
  }

  const filtrados = expedientes.filter(e =>
    !query || e.nombre?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal title="Agregar a expediente" onClose={onClose}
      footer={<Btn onClick={onClose}>Cancelar</Btn>}>
      {modoNuevo ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, color: C.muted }}>Nombre del nuevo expediente:</div>
          <input autoFocus style={inp} value={nombre} onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && crearYVincular()}
            placeholder="ej: Transferencia VW Gol IOC385"/>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn onClick={() => setModoNuevo(false)}>Volver</Btn>
            <Btn primary onClick={crearYVincular} disabled={!nombre.trim() || guardando}>
              {guardando ? "Creando..." : "Crear y vincular"}
            </Btn>
          </div>
        </div>
      ) : (
        <>
          <input style={{ ...inp, marginBottom: 12 }} value={query}
            onChange={e => setQuery(e.target.value)} placeholder="Buscar expediente..."/>
          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {cargando ? (
              <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Cargando...</div>
            ) : filtrados.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Sin expedientes</div>
            ) : filtrados.map(exp => (
              <div key={exp.id} onClick={() => vincular(exp.id)}
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(26,35,50,.1)", cursor: "pointer", background: "#fff" }}
                onMouseEnter={e => e.currentTarget.style.background = C.ceruleanLight}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{exp.nombre}</div>
                {exp.tipo_acto && <div style={{ fontSize: 11, color: C.muted }}>{exp.tipo_acto}</div>}
              </div>
            ))}
          </div>
          <button onClick={() => setModoNuevo(true)}
            style={{ marginTop: 12, width: "100%", padding: "8px 0", borderRadius: 7, border: "1px dashed rgba(58,124,165,.4)", background: "transparent", color: C.cerulean, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
            + Crear nuevo expediente
          </button>
        </>
      )}
    </Modal>
  );
}
