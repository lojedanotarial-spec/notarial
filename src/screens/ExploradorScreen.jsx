// Explorador (spec archivo-legal-y-explorador, T5; diseño D26–D28; maqueta aprobada el 20/11/26).
// Reemplaza a la lista de Expedientes (D27). Documentos: búsqueda y contadores del servidor (explorador_buscar /
// explorador_conteos). Expedientes: lista liviana desde la tabla, filtrada en el cliente (son pocos).
import { useState, useEffect, useRef, useCallback } from "react";
import { C, ELABELS } from "../constants";
import { R } from "../theme";
import { NavBar } from "../components/NavBar";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { ETIQUETA_CLASE } from "../utils/protocolo";
import { ESTADOS_EXPEDIENTE } from "../utils/estadosExpediente";
import { InsigniaEstado } from "../components/ui/InsigniaEstado";
import { FilaEsqueleto } from "../components/personas/comunes";
import { ModalNuevoExpediente } from "./ExpedientesScreen";
import {
  POR_PAGINA, FILTROS_VACIOS, interpretarBusqueda, armarFiltros, hayFiltros, etiquetasFiltros, rutaVisible, fechaCorta, formatoCantidad,
} from "../utils/explorador";

// ── Estilos de estado y protocolo (contrastes ≥ 4.5:1, ver references/accesibilidad.md) ──────────────
const ESTILO_DOC = {
  borrador: { bg: "rgba(26,35,50,.07)", color: "rgba(26,35,50,.85)" },
  revision: { bg: C.ceruleanLight, color: C.ceruleanText },
  completo: { bg: "rgba(201,169,97,.18)", color: C.dark },
};
const ESTILO_CLASE = {
  P: { bg: C.ceruleanLight, color: C.ceruleanText },
  NP: { bg: "rgba(26,35,50,.07)", color: "rgba(26,35,50,.85)" },
  sin_definir: { bg: "rgba(201,169,97,.15)", color: C.warnText },
};
const COLUMNAS_DOC = "minmax(0,2fr) minmax(0,1.25fr) minmax(0,1.3fr) 88px 116px 104px";
const COLUMNAS_EXP = "minmax(0,2fr) minmax(0,1.4fr) 100px 128px";

function ChipClase({ clase }) {
  const st = ESTILO_CLASE[clase] || ESTILO_CLASE.sin_definir;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifySelf: "start", whiteSpace: "nowrap",
                   padding: "2px 8px", borderRadius: R.sm, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
      {clase === "sin_definir" && (
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="8" cy="8" r="6" /><path d="M8 4.8v3.6M8 11h.01" strokeLinecap="round" />
        </svg>
      )}
      {ETIQUETA_CLASE[clase] || ETIQUETA_CLASE.sin_definir}
    </span>
  );
}

function ChipEstadoDoc({ estado }) {
  const st = ESTILO_DOC[estado] || ESTILO_DOC.borrador;
  return (
    <span style={{ justifySelf: "start", whiteSpace: "nowrap", padding: "2px 9px", borderRadius: R.xl,
                   fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
      {ELABELS[estado] || "Borrador"}
    </span>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.faint, padding: "0 2px" }}>{titulo}</div>
      <div style={{ background: C.porcelain, borderRadius: R.md, border: "1px solid rgba(26,35,50,.08)", overflow: "hidden",
                    display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

function ItemFiltro({ label, detalle, count, activo, onClick, punto }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "none", textAlign: "left",
               cursor: "pointer", fontFamily: "'Inter', sans-serif", background: activo ? "rgba(58,124,165,.1)" : "transparent" }}>
      {punto && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: punto }} />}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 12, fontWeight: activo ? 600 : 400, color: activo ? C.ceruleanText : C.dark,
                       whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        {detalle && <span style={{ fontSize: 11, color: C.faint }}>{detalle}</span>}
      </span>
      {count != null && <span style={{ fontSize: 11, fontWeight: 600, color: C.faint, fontVariantNumeric: "tabular-nums" }}>{formatoCantidad(count)}</span>}
    </button>
  );
}

function Segmentado({ opciones, valor, onCambiar, etiqueta }) {
  return (
    <div role="group" aria-label={etiqueta}
      style={{ display: "flex", border: "1px solid rgba(26,35,50,.5)", borderRadius: R.md, overflow: "hidden", background: C.porcelain }}>
      {opciones.map(([k, label]) => {
        const on = valor === k;
        return (
          <button key={k} type="button" onClick={() => onCambiar(k)} aria-pressed={on}
            style={{ padding: "8px 14px", border: "none", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                     fontWeight: on ? 600 : 500, background: on ? C.dark : "transparent", color: on ? C.porcelain : C.dark }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

const btnSecundario = {
  padding: "7px 14px", borderRadius: R.md, border: "1px solid rgba(26,35,50,.5)", background: C.porcelain,
  fontSize: 13, fontWeight: 600, color: C.dark, cursor: "pointer", fontFamily: "'Inter', sans-serif",
};
const btnPrimario = {
  padding: "9px 14px", borderRadius: R.md, border: "none", background: C.cerulean, color: C.porcelain,
  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
};

// ── Pantalla ────────────────────────────────────────────────────────────────────────────────────────
export function ExploradorScreen({ onGo }) {
  const { usuario, registroActivo } = useAuth();
  const [vista, setVista] = useState("documentos");
  const [f, setF] = useState(FILTROS_VACIOS);
  const [qInput, setQInput] = useState("");
  const [tab, setTab] = useState("actos");
  const [orden, setOrden] = useState("fecha_desc");
  const [res, setRes] = useState({ estado: "cargando", filas: [], total: 0, mensaje: "" });
  const [masCargando, setMasCargando] = useState(false);
  const [conteos, setConteos] = useState(null);
  const [exps, setExps] = useState({ estado: "cargando", lista: [] });
  const [sel, setSel] = useState(null); // { tipo: "doc" | "exp", id }
  const [modalNuevo, setModalNuevo] = useState(false);
  const pedido = useRef(0);

  // Búsqueda con pausa: espera a que se deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => setF(x => (x.q === qInput ? x : { ...x, q: qInput })), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const filtros = armarFiltros(f, registroActivo);
  const claveFiltros = JSON.stringify(filtros);

  const cargarDocs = useCallback(async () => {
    const id = ++pedido.current;
    setRes(r => ({ ...r, estado: "cargando" }));
    const p_filtros = JSON.parse(claveFiltros);
    const [b, c] = await Promise.all([
      supabase.rpc("explorador_buscar", { p_filtros, p_orden: orden, p_limite: POR_PAGINA, p_desde: 0 }),
      supabase.rpc("explorador_conteos", { p_filtros }),
    ]);
    if (id !== pedido.current) return;
    if (b.error) {
      console.error("[explorador] buscar:", b.error);
      const falta = b.error.code === "PGRST202" || /explorador_buscar/.test(b.error.message || "");
      setRes({ estado: "error", filas: [], total: 0,
               mensaje: falta ? "La búsqueda todavía no está activada en la base. Avisale a Lucas." : "No pudimos cargar el archivo. Revisá tu conexión y volvé a intentarlo." });
      return;
    }
    const filas = b.data || [];
    setRes({ estado: "ok", filas, total: filas[0]?.total ?? 0, mensaje: "" });
    if (!c.error) setConteos(c.data);
  }, [claveFiltros, orden]);

  useEffect(() => {
    if (!usuario || vista !== "documentos") return;
    cargarDocs(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [usuario, vista, cargarDocs]);

  async function verMas() {
    setMasCargando(true);
    const { data, error } = await supabase.rpc("explorador_buscar",
      { p_filtros: JSON.parse(claveFiltros), p_orden: orden, p_limite: POR_PAGINA, p_desde: res.filas.length });
    setMasCargando(false);
    if (error) { console.error("[explorador] ver más:", error); return; }
    setRes(r => ({ ...r, filas: [...r.filas, ...(data || [])] }));
  }

  const cargarExps = useCallback(async () => {
    setExps(e => ({ ...e, estado: "cargando" }));
    let q = supabase.from("expedientes").select("id, nombre, tipo_acto, estado, created_at").order("created_at", { ascending: false });
    if (registroActivo) q = q.eq("registro_id", registroActivo);
    const { data, error } = await q;
    setExps(error ? { estado: "error", lista: [] } : { estado: "ok", lista: data || [] });
  }, [registroActivo]);

  useEffect(() => {
    if (!usuario || vista !== "expedientes") return;
    cargarExps(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [usuario, vista, cargarExps]);

  // ── Derivados ──
  const nombres = {
    actos: Object.fromEntries((conteos?.actos || []).map(a => [a.acto, a.nombre])),
    personas: Object.fromEntries((conteos?.personas || []).map(p => [p.clave, p.nombre])),
  };
  const etiquetas = vista === "documentos" ? etiquetasFiltros(f, nombres) : (f.estado ? [{ clave: "estado", label: ESTADOS_EXPEDIENTE.find(e => e.key === f.estado)?.label || f.estado }] : []).concat(qInput.trim() ? [{ clave: "q", label: `«${qInput.trim()}»` }] : []);
  const interpretacion = vista === "documentos" ? interpretarBusqueda(qInput) : null;
  const poner = (clave, valor) => setF(x => ({ ...x, [clave]: x[clave] === valor ? FILTROS_VACIOS[clave] : valor }));
  const quitar = (clave) => { if (clave === "q") setQInput(""); setF(x => ({ ...x, [clave]: FILTROS_VACIOS[clave] })); };
  const borrarTodo = () => { setQInput(""); setF(FILTROS_VACIOS); };
  const cambiarVista = (v) => { setVista(v); setSel(null); setF(FILTROS_VACIOS); setQInput(""); };

  const expsFiltrados = exps.lista.filter(e => {
    if (f.estado && e.estado !== f.estado) return false;
    const t = qInput.trim().toLowerCase();
    return !t || e.nombre?.toLowerCase().includes(t) || e.tipo_acto?.toLowerCase().includes(t);
  });

  const conteoClase = conteos?.clase || {};
  const totalClase = (conteoClase.P || 0) + (conteoClase.NP || 0) + (conteoClase.sin_definir || 0);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.warm, fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      <NavBar onGo={onGo} screenTitle="Explorador" onVolver={() => onGo("home")} />

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* ── Filtros ── */}
        <aside aria-label="Filtros" style={{ width: 220, flexShrink: 0, overflowY: "auto", padding: "16px 12px", boxSizing: "border-box",
                                             borderRight: "1px solid rgba(26,35,50,.1)", display: "flex", flexDirection: "column", gap: 16 }}>
          {vista === "documentos" ? (
            <>
              <Seccion titulo="Protocolo">
                {[["", "Todos", totalClase, null], ["P", "Protocolar", conteoClase.P || 0, C.cerulean],
                  ["NP", "Extraprotocolar", conteoClase.NP || 0, "rgba(26,35,50,.45)"],
                  ["sin_definir", "Sin definir", conteoClase.sin_definir || 0, C.gold]].map(([k, label, n, punto]) => (
                  <ItemFiltro key={k || "todos"} label={label} count={conteos ? n : null} punto={punto || "transparent"}
                              activo={f.clase === k} onClick={() => setF(x => ({ ...x, clase: k }))} />
                ))}
              </Seccion>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.faint, padding: "0 2px" }}>Ver por</div>
                <div role="tablist" aria-label="Ver por" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4 }}>
                  {[["personas", "Personas"], ["actos", "Actos"], ["anios", "Años"], ["estado", "Estado"]].map(([k, label]) => {
                    const on = tab === k;
                    return (
                      <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setTab(k)}
                        style={{ padding: "6px 8px", borderRadius: R.sm, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                                 border: "1px solid " + (on ? C.dark : "rgba(26,35,50,.25)"), background: on ? C.dark : C.porcelain,
                                 color: on ? C.porcelain : C.dark, fontWeight: on ? 600 : 500 }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div role="tabpanel" style={{ background: C.porcelain, borderRadius: R.md, border: "1px solid rgba(26,35,50,.08)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  {!conteos && <div style={{ padding: 12, fontSize: 12, color: C.faint }}>Contando…</div>}
                  {conteos && tab === "personas" && (conteos.personas.length
                    ? conteos.personas.map(p => (
                        <ItemFiltro key={p.clave} label={p.nombre || p.clave} detalle={p.dni ? "DNI " + formatoCantidad(p.dni) : p.cuit ? "CUIT " + p.cuit : null}
                                    count={p.n} activo={f.persona === p.clave} onClick={() => poner("persona", p.clave)} />))
                    : <div style={{ padding: 12, fontSize: 12, color: C.faint }}>No hay personas con estos filtros.</div>)}
                  {conteos && tab === "actos" && conteos.actos.map(a => (
                    <ItemFiltro key={a.acto} label={a.nombre} count={a.n} activo={f.acto === a.acto} onClick={() => poner("acto", a.acto)} />))}
                  {conteos && tab === "anios" && conteos.anios.map(a => (
                    <ItemFiltro key={a.anio} label={String(a.anio)} count={a.n} activo={f.anio === a.anio} onClick={() => poner("anio", a.anio)} />))}
                  {conteos && tab === "estado" && ["borrador", "revision", "completo"].map(k => (
                    <ItemFiltro key={k} label={ELABELS[k]} count={conteos.estados?.[k] || 0} activo={f.estado === k} onClick={() => poner("estado", k)} />))}
                </div>
              </div>
            </>
          ) : (
            <Seccion titulo="Estado del expediente">
              <ItemFiltro label="Todos" count={exps.lista.length} activo={!f.estado} onClick={() => setF(x => ({ ...x, estado: "" }))} />
              {ESTADOS_EXPEDIENTE
                .map(e => ({ ...e, n: exps.lista.filter(x => x.estado === e.key).length }))
                .filter(e => !e.soloPorCierre || e.n > 0)
                .map(e => <ItemFiltro key={e.key} label={e.label} count={e.n} activo={f.estado === e.key} onClick={() => poner("estado", e.key)} />)}
            </Seccion>
          )}
        </aside>

        {/* ── Resultados ── */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, padding: "16px 20px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <label htmlFor="explorador-buscar" style={{ fontSize: 11, fontWeight: 600, color: C.faint }}>
                {vista === "documentos" ? "Buscar por nombre, apellido, DNI, CUIT o acto" : "Buscar expediente por nombre o acto"}
              </label>
              <div style={{ position: "relative" }}>
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(26,35,50,.55)" strokeWidth="1.5"
                     style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5l3 3" strokeLinecap="round" />
                </svg>
                <input id="explorador-buscar" value={qInput} onChange={e => setQInput(e.target.value)}
                       placeholder={vista === "documentos" ? "Ej.: Pérez · 31645431 · compraventa" : "Ej.: García c/ Pérez"}
                       style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 30px", borderRadius: R.md,
                                border: "1px solid rgba(26,35,50,.5)", background: C.porcelain, fontSize: 13, color: C.dark, fontFamily: "'Inter', sans-serif" }} />
              </div>
            </div>
            <Segmentado etiqueta="Mostrar" valor={vista} onCambiar={cambiarVista} opciones={[["documentos", "Documentos"], ["expedientes", "Expedientes"]]} />
            {vista === "expedientes" && (
              <button type="button" onClick={() => setModalNuevo(true)} style={btnPrimario}>Nuevo expediente</button>
            )}
          </div>
          {interpretacion && <div aria-live="polite" style={{ fontSize: 12, color: C.ceruleanText, marginTop: -6 }}>{interpretacion.texto}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minHeight: 28 }}>
            {vista === "documentos" && (
              <span aria-label="Ruta" style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginRight: 6 }}>{rutaVisible(f, nombres)}</span>
            )}
            {etiquetas.map(e => (
              <button key={e.clave} type="button" onClick={() => quitar(e.clave)} aria-label={"Quitar filtro " + e.label}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px 3px 10px", borderRadius: R.xl,
                         border: "1px solid rgba(58,124,165,.35)", background: C.ceruleanLight, color: C.ceruleanText,
                         fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                {e.label}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 2l6 6M8 2L2 8" strokeLinecap="round" /></svg>
              </button>
            ))}
            {etiquetas.length > 0 && (
              <button type="button" onClick={borrarTodo}
                style={{ background: "none", border: "none", color: C.ceruleanText, fontSize: 12, fontWeight: 600, cursor: "pointer",
                         textDecoration: "underline", textUnderlineOffset: 2, padding: 0, fontFamily: "'Inter', sans-serif" }}>
                Borrar todos
              </button>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 0, background: C.porcelain, borderRadius: R.lg, border: "1px solid rgba(26,35,50,.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {vista === "documentos" ? (
              <TablaDocumentos res={res} sel={sel} onSel={id => setSel({ tipo: "doc", id })} orden={orden}
                onOrden={() => setOrden(o => (o === "fecha_desc" ? "fecha_asc" : "fecha_desc"))}
                hayFiltros={hayFiltros(f)} resumen={etiquetas.map(e => e.label).join(" · ")} onBorrar={borrarTodo} onReintentar={cargarDocs} />
            ) : (
              <TablaExpedientes exps={exps} lista={expsFiltrados} sel={sel} onSel={id => setSel({ tipo: "exp", id })}
                hayFiltros={!!(f.estado || qInput.trim())} onBorrar={borrarTodo} onReintentar={cargarExps} />
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid rgba(26,35,50,.08)" }}>
              <span style={{ fontSize: 12, color: C.faint, fontVariantNumeric: "tabular-nums" }}>
                {vista === "documentos"
                  ? (res.estado === "ok" ? `Mostrando ${formatoCantidad(res.filas.length)} de ${formatoCantidad(res.total)}` : " ")
                  : (exps.estado === "ok" ? `Mostrando ${formatoCantidad(expsFiltrados.length)} de ${formatoCantidad(exps.lista.length)}` : " ")}
              </span>
              {vista === "documentos" && res.estado === "ok" && res.filas.length < res.total && (
                <button type="button" onClick={verMas} disabled={masCargando} style={btnSecundario}>{masCargando ? "Trayendo más…" : "Ver más"}</button>
              )}
            </div>
          </div>
        </main>

        {/* ── Detalle ── */}
        <aside aria-label="Detalle" style={{ width: 340, flexShrink: 0, background: C.porcelain, borderLeft: "1px solid rgba(26,35,50,.1)", overflowY: "auto", padding: 20, boxSizing: "border-box" }}>
          {!sel && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 13, color: C.faint, padding: "0 12px" }}>
              Elegí una fila para ver sus partes, sus datos y qué podés hacer con ella.
            </div>
          )}
          {sel?.tipo === "doc" && (
            <DetalleDocumento key={sel.id} fila={res.filas.find(x => x.documento_id === sel.id)} onGo={onGo}
              onClasificado={(id, clase) => {
                setRes(r => ({ ...r, filas: r.filas.map(x => x.documento_id === id ? { ...x, clase, clase_origen: "documento" } : x) }));
                supabase.rpc("explorador_conteos", { p_filtros: JSON.parse(claveFiltros) }).then(({ data, error }) => { if (!error) setConteos(data); });
              }} />
          )}
          {sel?.tipo === "exp" && (
            <DetalleExpediente key={sel.id} exp={exps.lista.find(x => x.id === sel.id)} registro={registroActivo} onGo={onGo} />
          )}
        </aside>
      </div>

      {modalNuevo && (
        <ModalNuevoExpediente registroId={registroActivo} userId={usuario?.id}
          onCrear={exp => { setExps(e => ({ ...e, lista: [exp, ...e.lista] })); setSel({ tipo: "exp", id: exp.id }); }}
          onClose={() => setModalNuevo(false)} />
      )}
    </div>
  );
}

// ── Tablas ─────────────────────────────────────────────────────────────────────────────────────────
function Encabezado({ columnas, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: columnas, gap: 12, padding: "8px 16px", background: C.warm,
                  borderBottom: "2px solid rgba(26,35,50,.07)", fontSize: 11, fontWeight: 600, color: C.faint, alignItems: "center" }}>
      {children}
    </div>
  );
}

function EstadoTabla({ titulo, texto, accion, onAccion }) {
  return (
    <div style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{titulo}</div>
      {texto && <div style={{ fontSize: 13, color: C.faint, maxWidth: 460 }}>{texto}</div>}
      {accion && <button type="button" onClick={onAccion} style={btnSecundario}>{accion}</button>}
    </div>
  );
}

function Cargando() {
  return (
    <div aria-label="Cargando el archivo" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <FilaEsqueleto /><FilaEsqueleto /><FilaEsqueleto /><FilaEsqueleto />
    </div>
  );
}

function filaEstilo(columnas, activa) {
  return {
    width: "100%", display: "grid", gridTemplateColumns: columnas, gap: 12, alignItems: "center", padding: "10px 16px",
    border: "none", borderBottom: "1px solid rgba(26,35,50,.06)", textAlign: "left", cursor: "pointer", fontFamily: "'Inter', sans-serif",
    background: activa ? "rgba(58,124,165,.08)" : "transparent", boxShadow: activa ? "inset 3px 0 0 " + C.cerulean : "none",
  };
}
const celda = { fontSize: 12, color: "rgba(26,35,50,.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const celdaTitulo = { fontSize: 13, fontWeight: 600, color: C.dark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function TablaDocumentos({ res, sel, onSel, orden, onOrden, hayFiltros, resumen, onBorrar, onReintentar }) {
  return (
    <>
      <Encabezado columnas={COLUMNAS_DOC}>
        <span>Nombre</span><span>Acto</span><span>Partes</span>
        <button type="button" onClick={onOrden}
          aria-label={"Ordenar por fecha, " + (orden === "fecha_desc" ? "ahora de la más nueva a la más vieja" : "ahora de la más vieja a la más nueva")}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, fontSize: 11, fontWeight: 700, color: C.dark, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          Fecha <span aria-hidden="true">{orden === "fecha_desc" ? "↓" : "↑"}</span>
        </button>
        <span>Protocolo</span><span>Estado</span>
      </Encabezado>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {res.estado === "cargando" && res.filas.length === 0 && <Cargando />}
        {res.estado === "error" && <EstadoTabla titulo="No se pudo cargar" texto={res.mensaje} accion="Reintentar" onAccion={onReintentar} />}
        {res.estado !== "error" && res.filas.length === 0 && res.estado === "ok" && (hayFiltros
          ? <EstadoTabla titulo="No hay nada con estos filtros" texto={resumen} accion="Borrar filtros" onAccion={onBorrar} />
          : <EstadoTabla titulo="Todavía no hay documentos" texto="Cuando redactes o subas un documento, aparece acá." />)}
        {res.estado !== "error" && res.filas.map(d => (
          <button key={d.documento_id} type="button" onClick={() => onSel(d.documento_id)} aria-pressed={sel?.id === d.documento_id}
                  style={{ ...filaEstilo(COLUMNAS_DOC, sel?.id === d.documento_id), opacity: res.estado === "cargando" ? 0.6 : 1 }}>
            <span style={celdaTitulo}>{d.titulo || "Sin título"}</span>
            <span style={celda}>{d.acto_nombre || d.acto}</span>
            <span style={celda}>{d.partes || "—"}</span>
            <span style={{ ...celda, fontVariantNumeric: "tabular-nums" }}>{fechaCorta(d.fecha_acto || d.creado)}</span>
            <ChipClase clase={d.clase} />
            <ChipEstadoDoc estado={d.estado} />
          </button>
        ))}
      </div>
    </>
  );
}

function TablaExpedientes({ exps, lista, sel, onSel, hayFiltros, onBorrar, onReintentar }) {
  return (
    <>
      <Encabezado columnas={COLUMNAS_EXP}><span>Nombre</span><span>Acto</span><span>Abierto el</span><span>Estado</span></Encabezado>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {exps.estado === "cargando" && <Cargando />}
        {exps.estado === "error" && <EstadoTabla titulo="No se pudo cargar" texto="No pudimos cargar los expedientes. Revisá tu conexión y volvé a intentarlo." accion="Reintentar" onAccion={onReintentar} />}
        {exps.estado === "ok" && lista.length === 0 && (hayFiltros
          ? <EstadoTabla titulo="No hay expedientes con estos filtros" accion="Borrar filtros" onAccion={onBorrar} />
          : <EstadoTabla titulo="Todavía no hay expedientes" texto="Creá uno con «Nuevo expediente»." />)}
        {exps.estado === "ok" && lista.map(e => (
          <button key={e.id} type="button" onClick={() => onSel(e.id)} aria-pressed={sel?.id === e.id} style={filaEstilo(COLUMNAS_EXP, sel?.id === e.id)}>
            <span style={celdaTitulo}>{e.nombre}</span>
            <span style={celda}>{e.tipo_acto || "—"}</span>
            <span style={{ ...celda, fontVariantNumeric: "tabular-nums" }}>{fechaCorta(e.created_at)}</span>
            <InsigniaEstado estado={e.estado} />
          </button>
        ))}
      </div>
    </>
  );
}

// ── Detalles ───────────────────────────────────────────────────────────────────────────────────────
function Titulo3({ children }) {
  return <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.dark }}>{children}</h3>;
}

function Dato({ k, v }) {
  return (
    <>
      <dt style={{ color: C.faint }}>{k}</dt>
      <dd style={{ margin: 0, color: C.dark, minWidth: 0, overflowWrap: "anywhere" }}>{v}</dd>
    </>
  );
}

function DetalleDocumento({ fila, onGo, onClasificado }) {
  const [extra, setExtra] = useState({ estado: "cargando", partes: [], expedientes: [], fundamento: null });
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!fila) return;
    let vigente = true;
    Promise.all([
      supabase.from("indice_partes").select("orden, apellido, nombre, nro_doc, cuit, rol").eq("documento_id", fila.documento_id).order("orden"),
      supabase.from("expediente_documentos").select("expediente_id, expedientes(id, nombre, estado)").eq("documento_id", fila.documento_id),
      supabase.from("actos_catalogo").select("fundamento").eq("codigo", fila.acto).maybeSingle(),
    ]).then(([p, e, c]) => {
      if (!vigente) return;
      setExtra({ estado: p.error ? "error" : "ok", partes: p.data || [],
                 expedientes: (e.data || []).map(x => x.expedientes).filter(Boolean), fundamento: c.data?.fundamento || null });
    });
    return () => { vigente = false; };
  }, [fila]);

  if (!fila) return null;

  async function definir(clase) {
    setGuardando(true); setAviso("");
    const { error } = await supabase.from("documentos").update({ clase }).eq("id", fila.documento_id);
    setGuardando(false);
    if (error) { console.error("[explorador] definir protocolo:", error); setAviso("No se pudo guardar. Volvé a intentarlo."); return; }
    onClasificado(fila.documento_id, clase);
  }

  const nombreActo = fila.acto_nombre || fila.acto;
  let explica;
  if (fila.clase_origen === "documento") explica = `${ETIQUETA_CLASE[fila.clase]}, elegido a mano para este documento. Se cambia desde el editor, en «Protocolo».`;
  else if (fila.clase_origen === "catalogo") explica = `${ETIQUETA_CLASE[fila.clase]}, según la plantilla ${nombreActo}${extra.fundamento ? " (" + extra.fundamento + ")" : ""}.`;
  else explica = `${nombreActo} admite las dos formas${extra.fundamento ? " (" + extra.fundamento + ")" : ""}. Elegí cómo se hizo este documento.`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.faint }}>Documento</span>
        <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.3, fontWeight: 700, color: C.dark, textWrap: "balance" }}>{fila.titulo || "Sin título"}</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><ChipClase clase={fila.clase} /><ChipEstadoDoc estado={fila.estado} /></div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Titulo3>Protocolo</Titulo3>
        {fila.clase === "sin_definir" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: R.md, background: "rgba(201,169,97,.15)" }}>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: C.dark }}><b style={{ color: C.warnText }}>Sin definir.</b> {explica}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" disabled={guardando} onClick={() => definir("P")} style={{ ...btnSecundario, flex: 1, fontSize: 12 }}>Protocolar</button>
              <button type="button" disabled={guardando} onClick={() => definir("NP")} style={{ ...btnSecundario, flex: 1, fontSize: 12 }}>Extraprotocolar</button>
            </div>
            {aviso && <div role="alert" style={{ fontSize: 12, color: C.danger }}>{aviso}</div>}
          </div>
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.45, color: C.dark }}>{explica}</div>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Titulo3>Partes</Titulo3>
        {extra.estado === "cargando" && <div style={{ fontSize: 12, color: C.faint }}>Trayendo las partes…</div>}
        {extra.estado === "error" && <div style={{ fontSize: 12, color: C.danger }}>No se pudieron cargar las partes.</div>}
        {extra.estado === "ok" && (extra.partes.length === 0
          ? <div style={{ fontSize: 12, color: C.faint }}>Este documento todavía no tiene partes cargadas.</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", border: "1px solid rgba(26,35,50,.1)", borderRadius: R.md, overflow: "hidden" }}>
              {extra.partes.map(p => (
                <div key={p.orden} style={{ display: "flex", flexDirection: "column", gap: 1, padding: "8px 12px", borderBottom: "1px solid rgba(26,35,50,.06)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{[p.apellido, p.nombre].filter(Boolean).join(", ") || "Sin nombre"}</span>
                  <span style={{ fontSize: 12, color: C.faint }}>
                    {[p.rol, p.nro_doc ? "DNI " + formatoCantidad(p.nro_doc) : null, !p.nro_doc && p.cuit ? "CUIT " + p.cuit : null].filter(Boolean).join(" · ") || "Sin DNI"}
                  </span>
                </div>
              ))}
            </div>
          ))}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Titulo3>Datos</Titulo3>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "110px minmax(0, 1fr)", gap: "6px 10px", fontSize: 12 }}>
          <Dato k="Acto" v={nombreActo} />
          <Dato k="Fecha del acto" v={fechaCorta(fila.fecha_acto || fila.creado)} />
          <Dato k="Expediente" v={extra.expedientes.length ? extra.expedientes.map(x => x.nombre).join(", ") : "Sin expediente"} />
          <Dato k="Modificado" v={fechaCorta(fila.actualizado)} />
        </dl>
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button type="button" onClick={() => onGo("editor", { docId: fila.documento_id })} style={btnPrimario}>Abrir documento</button>
        {extra.expedientes[0] && (
          <button type="button" onClick={() => onGo("expediente", { expedienteId: extra.expedientes[0].id })} style={btnSecundario}>Ir al expediente</button>
        )}
      </div>
    </div>
  );
}

function DetalleExpediente({ exp, registro, onGo }) {
  const [docs, setDocs] = useState({ estado: "cargando", lista: [] });

  useEffect(() => {
    if (!exp) return;
    let vigente = true;
    const p_filtros = { expediente_id: exp.id, ...(registro ? { registro: String(registro) } : {}) };
    supabase.rpc("explorador_buscar", { p_filtros, p_orden: "fecha_desc", p_limite: 200, p_desde: 0 })
      .then(({ data, error }) => { if (vigente) setDocs(error ? { estado: "error", lista: [] } : { estado: "ok", lista: data || [] }); });
    return () => { vigente = false; };
  }, [exp, registro]);

  if (!exp) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: C.faint }}>Expediente</span>
        <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.3, fontWeight: 700, color: C.dark, textWrap: "balance" }}>{exp.nombre}</h2>
        <div><InsigniaEstado estado={exp.estado} /></div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Titulo3>{docs.estado === "ok" ? `Documentos (${docs.lista.length})` : "Documentos"}</Titulo3>
        {docs.estado === "cargando" && <div style={{ fontSize: 12, color: C.faint }}>Trayendo los documentos…</div>}
        {docs.estado === "error" && <div style={{ fontSize: 12, color: C.danger }}>No se pudieron cargar los documentos.</div>}
        {docs.estado === "ok" && (docs.lista.length === 0
          ? <div style={{ fontSize: 12, color: C.faint }}>Todavía no tiene documentos vinculados.</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", border: "1px solid rgba(26,35,50,.1)", borderRadius: R.md, overflow: "hidden" }}>
              {docs.lista.map(d => (
                <div key={d.documento_id} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "8px 12px", borderBottom: "1px solid rgba(26,35,50,.06)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{d.titulo || "Sin título"}</span>
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><ChipClase clase={d.clase} /><ChipEstadoDoc estado={d.estado} /></span>
                </div>
              ))}
            </div>
          ))}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Titulo3>Datos</Titulo3>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "110px minmax(0, 1fr)", gap: "6px 10px", fontSize: 12 }}>
          <Dato k="Acto" v={exp.tipo_acto || "—"} />
          <Dato k="Abierto el" v={fechaCorta(exp.created_at)} />
        </dl>
      </section>

      <button type="button" onClick={() => onGo("expediente", { expedienteId: exp.id })} style={btnPrimario}>Abrir expediente</button>
    </div>
  );
}
