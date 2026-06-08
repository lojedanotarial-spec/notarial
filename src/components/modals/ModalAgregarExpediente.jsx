import { useState, useEffect } from "react";
import { C, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { supabase } from "../../supabase";

export function ModalAgregarExpediente({ docId, registroId, userId, nombreSugerido = "", onClose, onGo }) {
  const [expedientes, setExpedientes] = useState([]);
  const [query, setQuery]             = useState("");
  const [cargando, setCargando]       = useState(true);
  const [nombre, setNombre]           = useState(nombreSugerido);
  const [guardando, setGuardando]     = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    let q = supabase.from("expedientes").select("id, nombre, tipo_acto, estado")
      .order("created_at", { ascending: false }).limit(50);
    if (registroId) q = q.eq("registro_id", registroId);
    const { data } = await q;
    setExpedientes(data || []);
    setCargando(false);
  }

  async function vincular(expedienteId) {
    if (!docId) return;
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
      nombre: nombre.trim(),
      registro_id: registroId || null,
      usuario_id: userId || null,
      estado: "abierto",
    }).select().single();
    if (exp) await vincular(exp.id);
    setGuardando(false);
  }

  const filtrados = expedientes.filter(e =>
    !query || e.nombre?.toLowerCase().includes(query.toLowerCase())
  );

  const BADGE = {
    abierto:     { bg: "#e8f5e9", color: "#2e7d32" },
    en_tramite:  { bg: "#fff8e1", color: "#f57f17" },
    completado:  { bg: "#e3f2fd", color: "#1565c0" },
    archivado:   { bg: "#f5f5f5", color: "#616161" },
  };

  return (
    <Modal title="Agregar a expediente" onClose={onClose}
      footer={<Btn onClick={onClose}>Cerrar</Btn>}>

      {/* ── Crear nuevo ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.muted, marginBottom: 8 }}>
          Crear nuevo expediente
        </div>
        <input
          autoFocus
          style={{ ...inp, marginBottom: 8 }}
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === "Enter" && crearYVincular()}
          placeholder="Nombre del expediente"
        />
        <Btn primary onClick={crearYVincular} disabled={!nombre.trim() || guardando || !docId} style={{ width: "100%" }}>
          {guardando ? "Creando..." : "Crear y vincular"}
        </Btn>
        {!docId && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textAlign: "center" }}>
            Guardando documento...
          </div>
        )}
      </div>

      {/* ── Divisor ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(26,35,50,.1)" }}/>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>O vincular a uno existente</span>
        <div style={{ flex: 1, height: 1, background: "rgba(26,35,50,.1)" }}/>
      </div>

      {/* ── Lista de expedientes ── */}
      <input
        style={{ ...inp, marginBottom: 10 }}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar expediente..."
      />
      <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {cargando ? (
          <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>
            {query ? "Sin resultados" : "No hay expedientes"}
          </div>
        ) : filtrados.map(exp => {
          const badge = BADGE[exp.estado] || BADGE.abierto;
          return (
            <div key={exp.id} onClick={() => vincular(exp.id)}
              style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(26,35,50,.1)", cursor: "pointer", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              onMouseEnter={e => e.currentTarget.style.background = C.ceruleanLight}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.nombre}</div>
                {exp.tipo_acto && <div style={{ fontSize: 11, color: C.muted }}>{exp.tipo_acto}</div>}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: badge.bg, color: badge.color, flexShrink: 0, marginLeft: 8, textTransform: "capitalize" }}>
                {exp.estado?.replace("_", " ")}
              </span>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
