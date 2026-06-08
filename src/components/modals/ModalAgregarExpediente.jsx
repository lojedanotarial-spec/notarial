import { useState, useEffect } from "react";
import { C, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { supabase } from "../../supabase";

export function ModalAgregarExpediente({ docId, registroId, userId, nombreSugerido = "", onClose, onGo }) {
  const [expedientes, setExpedientes] = useState([]);
  const [vinculados, setVinculados]   = useState(new Set());
  const [query, setQuery]             = useState("");
  const [cargando, setCargando]       = useState(true);
  const [nombre, setNombre]           = useState(nombreSugerido);
  const [guardando, setGuardando]     = useState(false);
  const [mostrarOtro, setMostrarOtro] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    let q = supabase.from("expedientes").select("id, nombre, tipo_acto, estado")
      .order("created_at", { ascending: false }).limit(50);
    if (registroId) q = q.eq("registro_id", registroId);
    const [{ data }, { data: links }] = await Promise.all([
      q,
      docId
        ? supabase.from("expediente_documentos").select("expediente_id").eq("documento_id", docId)
        : Promise.resolve({ data: [] }),
    ]);
    setExpedientes(data || []);
    setVinculados(new Set((links || []).map(l => l.expediente_id)));
    setCargando(false);
  }

  function irAExpediente(expedienteId) {
    onClose();
    onGo?.("expediente", { expedienteId });
  }

  function vincular(expedienteId) {
    if (!docId) {
      alert("El documento todavía no fue guardado. Esperá un momento y volvé a intentarlo.");
      return;
    }
    onClose();
    onGo?.("expediente", { expedienteId, vincularDocId: docId });
  }

  async function crearYVincular() {
    if (!nombre.trim()) return;
    const { data: existente } = await supabase
      .from("expedientes")
      .select("id")
      .eq("nombre", nombre.trim())
      .eq("registro_id", registroId || null)
      .maybeSingle();
    if (existente) {
      alert(`Ya existe un expediente llamado "${nombre.trim()}". Usá un nombre diferente o vinculalo desde la lista.`);
      return;
    }
    setGuardando(true);
    const { data: exp, error } = await supabase.from("expedientes").insert({
      nombre: nombre.trim(),
      registro_id: registroId || null,
      usuario_id: userId || null,
      estado: "abierto",
    }).select("id").maybeSingle();

    if (error) { alert("Error al crear expediente: " + error.message); setGuardando(false); return; }

    let expedienteId = exp?.id;
    if (!expedienteId) {
      const { data: buscado } = await supabase.from("expedientes")
        .select("id").eq("nombre", nombre.trim())
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      expedienteId = buscado?.id;
    }

    setGuardando(false);
    if (!expedienteId) {
      alert("No se pudo obtener el expediente recién creado. Intentá de nuevo.");
      return;
    }
    onClose();
    onGo?.("expediente", { expedienteId, vincularDocId: docId });
  }

  const yaVinculados = expedientes.filter(e => vinculados.has(e.id));
  const tieneVinculo = !cargando && yaVinculados.length > 0;

  const filtrados = expedientes
    .filter(e => !vinculados.has(e.id))
    .filter(e => !query || e.nombre?.toLowerCase().includes(query.toLowerCase()));

  const BADGE = {
    abierto:     { bg: "#e8f5e9", color: "#2e7d32" },
    en_tramite:  { bg: "#fff8e1", color: "#f57f17" },
    completado:  { bg: "#e3f2fd", color: "#1565c0" },
    archivado:   { bg: "#f5f5f5", color: "#616161" },
  };

  return (
    <Modal title="Expediente del documento" onClose={onClose}
      footer={<Btn onClick={onClose}>Cerrar</Btn>}>

      {cargando ? (
        <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 30 }}>Cargando...</div>
      ) : tieneVinculo ? (
        <>
          {/* ── Expedientes vinculados ── */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.muted, marginBottom: 8 }}>
            Vinculado a
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {yaVinculados.map(exp => {
              const badge = BADGE[exp.estado] || BADGE.abierto;
              return (
                <div key={exp.id} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.ceruleanMid}`, background: C.ceruleanLight, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.nombre}</div>
                    {exp.tipo_acto && <div style={{ fontSize: 11, color: C.muted }}>{exp.tipo_acto}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: badge.bg, color: badge.color, textTransform: "capitalize" }}>
                      {exp.estado?.replace("_", " ")}
                    </span>
                    <button onClick={() => irAExpediente(exp.id)} style={{ fontSize: 11, fontWeight: 600, color: C.cerulean, background: "none", border: `1px solid ${C.ceruleanMid}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>Ver →</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Vincular a otro ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: mostrarOtro ? 16 : 0 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(26,35,50,.1)" }}/>
            <button
              onClick={() => setMostrarOtro(v => !v)}
              style={{ fontSize: 11, color: C.cerulean, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {mostrarOtro ? "Ocultar ▲" : "Vincular a otro expediente ▼"}
            </button>
            <div style={{ flex: 1, height: 1, background: "rgba(26,35,50,.1)" }}/>
          </div>

          {mostrarOtro && <FlujoCrearVincular
            nombre={nombre} setNombre={setNombre}
            guardando={guardando} docId={docId}
            query={query} setQuery={setQuery}
            filtrados={filtrados} BADGE={BADGE}
            crearYVincular={crearYVincular} vincular={vincular}
          />}
        </>
      ) : (
        /* ── Sin vínculo: flujo completo ── */
        <FlujoCrearVincular
          nombre={nombre} setNombre={setNombre}
          guardando={guardando} docId={docId}
          query={query} setQuery={setQuery}
          filtrados={filtrados} BADGE={BADGE}
          crearYVincular={crearYVincular} vincular={vincular}
        />
      )}
    </Modal>
  );
}

function FlujoCrearVincular({ nombre, setNombre, guardando, docId, query, setQuery, filtrados, BADGE, crearYVincular, vincular }) {
  return (
    <>
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

      {/* ── Lista ── */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.muted, marginBottom: 8 }}>
        Expedientes existentes
      </div>
      <input
        style={{ ...inp, marginBottom: 10 }}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar expediente..."
      />
      <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {filtrados.length === 0 ? (
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
    </>
  );
}
