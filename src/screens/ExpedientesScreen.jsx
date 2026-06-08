import { useState, useEffect } from "react";
import { C } from "../constants";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

function ConfirmDelete({ nombre, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#FDFCFA", borderRadius: 12, padding: "28px 28px 20px", width: 360, boxShadow: "0 8px 32px rgba(26,35,50,.18)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1A2332", marginBottom: 8 }}>Eliminar expediente</div>
        <div style={{ fontSize: 13, color: "rgba(26,35,50,.6)", marginBottom: 20, lineHeight: 1.5 }}>
          ¿Confirmás que querés eliminar <strong style={{ color: "#1A2332" }}>{nombre}</strong>? Esta acción no se puede deshacer.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid rgba(26,35,50,.14)", background: "transparent", fontSize: 13, fontWeight: 600, color: "#1A2332", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #e07070", background: "#fdf0f0", fontSize: 13, fontWeight: 700, color: "#c0392b", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);

const ESTADOS = [
  { key: "abierto",     label: "Abierto",     color: "#3a7ca5", bg: "rgba(58,124,165,.1)" },
  { key: "en_tramite",  label: "En trámite",  color: "#c9a961", bg: "rgba(201,169,97,.15)" },
  { key: "completado",  label: "Completado",  color: "#27ae60", bg: "rgba(39,174,96,.1)" },
  { key: "archivado",   label: "Archivado",   color: "rgba(26,35,50,.4)", bg: "rgba(26,35,50,.06)" },
];

function BadgeEstado({ estado }) {
  const st = ESTADOS.find(e => e.key === estado) || ESTADOS[0];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      color: st.color, background: st.bg, fontFamily: "'Montserrat',sans-serif",
      letterSpacing: ".04em", textTransform: "uppercase",
    }}>{st.label}</span>
  );
}

function ModalNuevoExpediente({ onCrear, onClose, registroId, userId }) {
  const [nombre, setNombre] = useState("");
  const [tipoActo, setTipoActo] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleCrear() {
    if (!nombre.trim()) return;
    // Validar nombre duplicado
    const { data: existente } = await supabase
      .from("expedientes").select("id")
      .eq("nombre", nombre.trim()).eq("registro_id", registroId).maybeSingle();
    if (existente) {
      alert(`Ya existe un expediente llamado "${nombre.trim()}".`);
      return;
    }
    setGuardando(true);
    const { data, error } = await supabase.from("expedientes").insert({
      nombre: nombre.trim(),
      tipo_acto: tipoActo || null,
      registro_id: registroId || null,
      usuario_id: userId || null,
      estado: "abierto",
    }).select().single();
    setGuardando(false);
    if (!error) { onCrear(data); onClose(); }
    else alert("Error al crear expediente: " + error.message);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(26,35,50,.5)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#FDFCFA", borderRadius: 12, padding: "28px 28px 22px",
        width: 420, boxShadow: "0 8px 32px rgba(26,35,50,.18)",
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 18 }}>
          Nuevo expediente
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: "block", marginBottom: 4 }}>
              Nombre *
            </label>
            <input
              autoFocus
              style={{
                width: "100%", padding: "8px 11px", borderRadius: 7, boxSizing: "border-box",
                border: "1px solid rgba(26,35,50,.14)", fontFamily: "'Inter',sans-serif",
                fontSize: 13, color: C.dark,
              }}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCrear()}
              placeholder="ej: Transferencia VW Gol IOC385 — MORAN"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: "block", marginBottom: 4 }}>
              Tipo de acto
            </label>
            <input
              style={{
                width: "100%", padding: "8px 11px", borderRadius: 7, boxSizing: "border-box",
                border: "1px solid rgba(26,35,50,.14)", fontFamily: "'Inter',sans-serif",
                fontSize: 13, color: C.dark,
              }}
              value={tipoActo}
              onChange={e => setTipoActo(e.target.value)}
              placeholder="ej: Certificación F08, Autorización conducir..."
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 7, border: "1px solid rgba(26,35,50,.14)",
            background: "transparent", cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
            fontSize: 12, fontWeight: 600, color: C.dark,
          }}>Cancelar</button>
          <button onClick={handleCrear} disabled={!nombre.trim() || guardando} style={{
            padding: "8px 18px", borderRadius: 7, border: "none",
            background: guardando ? C.cerulean + "99" : C.cerulean,
            color: "#FDFCFA", cursor: nombre.trim() ? "pointer" : "not-allowed",
            fontFamily: "'Montserrat',sans-serif", fontSize: 12, fontWeight: 700,
          }}>
            {guardando ? "Creando..." : "Crear expediente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaExpediente({ exp, onOpen, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={() => onOpen(exp.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "#FDFCFA", borderRadius: 10, padding: "14px 18px",
        border: "1px solid rgba(26,35,50,.08)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: hover ? "0 2px 12px rgba(26,35,50,.08)" : "none",
        transition: "box-shadow .1s",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 3 }}>
          {exp.nombre}
        </div>
        <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)" }}>
          {exp.tipo_acto || "—"} · {new Date(exp.created_at).toLocaleDateString("es-AR")}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BadgeEstado estado={exp.estado} />
        <button
          onClick={e => { e.stopPropagation(); onDelete(exp); }}
          title="Eliminar expediente"
          style={{
            width: 26, height: 26, borderRadius: 5, border: "1px solid transparent",
            background: "transparent", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            opacity: hover ? 1 : 0, transition: "opacity .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fdf0f0"; e.currentTarget.style.borderColor = "#e07070"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

export function ExpedientesScreen({ onGo, registroActivo, miUsuario }) {
  const { session, usuario } = useAuth();
  const [expedientes, setExpedientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [query, setQuery] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    cargar();
  }, [registroActivo]);

  async function cargar() {
    setCargando(true);
    let q = supabase.from("expedientes").select("*").order("created_at", { ascending: false });
    if (registroActivo) q = q.eq("registro_id", registroActivo);
    const { data } = await q;
    setExpedientes(data || []);
    setCargando(false);
  }

  async function eliminar(exp) {
    await supabase.from("expediente_documentos").delete().eq("expediente_id", exp.id);
    await supabase.from("expediente_archivos").delete().eq("expediente_id", exp.id);
    await supabase.from("expedientes").delete().eq("id", exp.id);
    setExpedientes(prev => prev.filter(x => x.id !== exp.id));
    setConfirmDel(null);
  }

  const filtrados = expedientes.filter(e => {
    if (filtroEstado && e.estado !== filtroEstado) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!e.nombre?.toLowerCase().includes(q) && !e.tipo_acto?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ed" }}>
      {/* Header */}
      <div style={{
        background: C.dark, padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => onGo?.("home")} style={{
            background: "transparent", border: "none", color: "rgba(253,252,250,.6)",
            cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6,
          }}>
            ← Volver
          </button>
          <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 15 }}>
            Expedientes
          </span>
        </div>
        <button onClick={() => setModalNuevo(true)} style={{
          background: C.gold, border: "none", borderRadius: 8, color: C.dark,
          fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12,
          padding: "7px 16px", cursor: "pointer", letterSpacing: ".05em",
        }}>
          + Nuevo
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar filtros */}
        <div style={{
          width: 200, background: "#FDFCFA", borderRight: "1px solid rgba(26,35,50,.08)",
          padding: "18px 14px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,35,50,.45)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>
            Estado
          </div>
          {[{ key: "", label: "Todos", count: expedientes.length }, ...ESTADOS.map(e => ({ ...e, count: expedientes.filter(x => x.estado === e.key).length }))].map(e => (
            <div key={e.key} onClick={() => setFiltroEstado(e.key)}
              style={{
                padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 13,
                background: filtroEstado === e.key ? C.ceruleanLight : "transparent",
                color: filtroEstado === e.key ? C.cerulean : C.dark,
                fontWeight: filtroEstado === e.key ? 600 : 400,
                display: "flex", justifyContent: "space-between",
              }}>
              <span>{e.label}</span>
              <span style={{ fontSize: 11, color: "rgba(26,35,50,.45)" }}>{e.count}</span>
            </div>
          ))}
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar expediente..."
            style={{
              width: "100%", padding: "9px 14px", borderRadius: 8, boxSizing: "border-box",
              border: "1px solid rgba(26,35,50,.14)", fontSize: 13, marginBottom: 16,
              fontFamily: "'Inter',sans-serif", background: "#FDFCFA",
            }}
          />

          {cargando ? (
            <div style={{ color: "rgba(26,35,50,.4)", fontSize: 14, textAlign: "center", marginTop: 60 }}>Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 60, color: "rgba(26,35,50,.4)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Sin expedientes</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Creá uno con el botón + Nuevo</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtrados.map(exp => (
                <FilaExpediente
                  key={exp.id}
                  exp={exp}
                  onOpen={id => onGo?.("expediente", { expedienteId: id })}
                  onDelete={exp => setConfirmDel(exp)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {modalNuevo && (
        <ModalNuevoExpediente
          registroId={registroActivo || miUsuario?.registro}
          userId={usuario?.id}
          onCrear={exp => setExpedientes(prev => [exp, ...prev])}
          onClose={() => setModalNuevo(false)}
        />
      )}

      {confirmDel && (
        <ConfirmDelete
          nombre={confirmDel.nombre}
          onConfirm={() => eliminar(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
