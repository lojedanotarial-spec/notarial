// Pestaña "Personas" del expediente: quiénes intervienen, con su estado civil y la fecha de su última actualización. Desde acá se agrega
// una persona (existente o nueva), se completa su perfil, se la quita del expediente y se aceptan (o no) las personas que el sistema
// detectó en los archivos. Nada se crea ni se completa solo: siempre pasa por una confirmación. Spec: specs/personas-expediente/.
import { useMemo, useState } from "react";
import { C } from "../../constants";
import {
  agregarPersonaAlExpediente, agruparArchivos, asignarArchivos, datosQueFaltan, guardarPersona, nombreCompleto, propuestasDeArchivos,
  quitarPersonaDelExpediente, resumenPersona, textoActualizada,
} from "../../utils/personasCliente";
import { Aviso, FilaEsqueleto } from "./comunes";
import { boton, botonTexto, fuente, iniciales } from "./estilos";
import AgregarPersona from "./AgregarPersona";
import ModalPersona from "./ModalPersona";

const cantidad = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const nombreNatural = (apellido, nombre) => [nombre, apellido].filter(Boolean).join(" ");

// Lo escrito en la búsqueda de "Agregar persona" sirve para adelantar el formulario de la persona nueva.
function inicialDeBusqueda(texto) {
  const t = String(texto ?? "").trim();
  if (!t) return null;
  if (/^[\d.\s]+$/.test(t)) return { nro_doc: t.replace(/\D/g, "") };
  return { apellido: t };
}

export default function PersonasExpediente({ expediente, personas, estado, libreta, archivos, onRecargar, onReintentar, onReintentarLibreta, onIrAArchivos }) {
  const [agregarAbierto, setAgregarAbierto] = useState(false);
  const [perfil, setPerfil] = useState(null);   // { personaId } | { inicial }  (persona nueva)
  const [aviso, setAviso] = useState(null);     // { tipo, texto, deshacer? }
  const [descartadas, setDescartadas] = useState(() => new Set());
  const [ocupada, setOcupada] = useState(null); // clave de la propuesta o id de la persona con una acción en curso
  const [errorAccion, setErrorAccion] = useState("");

  const yaEstan = useMemo(() => new Set(personas.map((p) => p.id)), [personas]);
  const { porPersona } = useMemo(() => agruparArchivos(archivos, personas), [archivos, personas]);
  const propuestas = useMemo(
    () => (libreta.estado === "ok" ? propuestasDeArchivos(archivos, personas, libreta.lista, descartadas) : []),
    [archivos, personas, libreta, descartadas],
  );
  const personaAbierta = perfil?.personaId ? personas.find((p) => p.id === perfil.personaId) || null : null;

  // ── Acciones ───────────────────────────────────────────────────────────────
  async function agregarExistente(p) {
    await agregarPersonaAlExpediente(expediente.id, p.id);
    await onRecargar();
    setAgregarAbierto(false);
    setAviso({ tipo: "ok", texto: `Agregaste a ${nombreCompleto(p)} al expediente.`, completar: p.id });
  }

  async function quitar(p) {
    setOcupada(p.id);
    setErrorAccion("");
    try {
      await quitarPersonaDelExpediente(expediente.id, p.id);
      await onRecargar();
      setAviso({ tipo: "ok", texto: `Quitaste a ${nombreCompleto(p)} del expediente. Sus archivos quedaron sin asignar; la ficha sigue en tu libreta.`, deshacer: p });
    } catch (e) { setErrorAccion(e.message); } finally { setOcupada(null); }
  }

  async function deshacerQuitar(p) {
    setAviso(null);
    try { await agregarPersonaAlExpediente(expediente.id, p.id); await onRecargar(); } catch (e) { setErrorAccion(e.message); }
  }

  async function aceptar(pr) {
    setOcupada(pr.clave);
    setErrorAccion("");
    try {
      let persona = pr.persona;
      if (pr.tipo === "agregar") await agregarPersonaAlExpediente(expediente.id, persona.id);
      if (pr.tipo === "crear") {
        const r = await guardarPersona({ expedienteId: expediente.id, datos: { apellido: pr.apellido, nombre: pr.nombre } });
        persona = r.duplicada ? r.duplicada.persona : r.persona;
        if (r.duplicada) await agregarPersonaAlExpediente(expediente.id, persona.id);
      }
      await asignarArchivos(pr.archivos.map((a) => a.id), persona.id);
      await onRecargar();
      if (pr.tipo === "asignar") setAviso({ tipo: "ok", texto: `Listo: ${cantidad(pr.archivos.length, "archivo asignado", "archivos asignados")} a ${nombreCompleto(persona)}.` });
      else setPerfil({ personaId: persona.id });   // se abre su perfil para completarlo
    } catch (e) { setErrorAccion(e.message); } finally { setOcupada(null); }
  }

  const descartar = (pr) => setDescartadas((s) => new Set(s).add(pr.clave));

  // ── Pantalla ───────────────────────────────────────────────────────────────
  return (
    <section aria-label="Personas del expediente">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.dark, fontFamily: fuente }}>Personas que intervienen</h2>
        <button onClick={() => setAgregarAbierto(true)} style={boton(true)}>Agregar persona</button>
      </div>
      <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.5, marginBottom: 14 }}>
        Cada persona se carga una sola vez y queda en la libreta de tu registro. Al armar un documento de este expediente vas a poder usarla como parte con un toque.
      </div>

      {errorAccion && <div style={{ marginBottom: 10 }}><Aviso tipo="error">{errorAccion} <button onClick={() => setErrorAccion("")} style={botonTexto}>Entendido</button></Aviso></div>}
      {aviso && (
        <div style={{ marginBottom: 10 }}>
          <Aviso tipo={aviso.tipo}>
            {aviso.texto}{" "}
            {aviso.deshacer && <button onClick={() => deshacerQuitar(aviso.deshacer)} style={botonTexto}>Deshacer</button>}
            {aviso.completar && <button onClick={() => { setPerfil({ personaId: aviso.completar }); setAviso(null); }} style={botonTexto}>Completar perfil</button>}
            {" "}<button onClick={() => setAviso(null)} style={{ ...botonTexto, color: C.faint, fontWeight: 600 }}>Cerrar</button>
          </Aviso>
        </div>
      )}

      {propuestas.length > 0 && (
        <section aria-label="Personas detectadas en los archivos" style={{ margin: "0 0 14px", background: C.ceruleanLight, border: "1px solid rgba(58,124,165,.3)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ceruleanText, fontFamily: fuente }}>
            Detecté {cantidad(propuestas.length, "persona", "personas")} en los archivos
          </div>
          <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>No agrego ni completo nada sin que lo confirmes.</div>
          <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column" }}>
            {propuestas.map((pr, i) => {
              const quien = nombreNatural(pr.apellido, pr.nombre);
              const trabajando = ocupada === pr.clave;
              return (
                <li key={pr.clave} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid rgba(58,124,165,.2)" }}>
                  <div style={{ fontSize: 12.5, color: C.dark, lineHeight: 1.5, flex: 1, minWidth: 240 }}>
                    <strong>{quien}</strong> · {cantidad(pr.archivos.length, "archivo", "archivos")}
                    <div style={{ fontSize: 12, color: C.faint }}>
                      {pr.tipo === "asignar" && "Ya está en este expediente: se le asignan sus archivos."}
                      {pr.tipo === "agregar" && "Ya está en tu libreta: se agrega al expediente y se le asignan sus archivos."}
                      {pr.tipo === "crear" && "No está en tu libreta: se crea su ficha con este nombre y se abre su perfil para completarlo."}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => aceptar(pr)} disabled={!!ocupada} aria-label={pr.tipo === "asignar" ? `Asignar los archivos a ${quien}` : `Agregar a ${quien}`} style={boton(false, !!ocupada)}>
                      {trabajando ? "Un momento…" : pr.tipo === "asignar" ? "Asignar archivos" : "Agregar"}
                    </button>
                    <button onClick={() => descartar(pr)} disabled={!!ocupada} aria-label={`No agregar a ${quien} por ahora`} style={{ ...botonTexto, color: C.faint }}>Ahora no</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {estado.fase === "cargando" && <div role="status" aria-label="Cargando las personas" style={{ display: "flex", flexDirection: "column", gap: 8 }}><FilaEsqueleto /><FilaEsqueleto /></div>}

      {estado.fase === "error" && (
        <Aviso tipo="error">{estado.mensaje || "No pude cargar las personas del expediente."} <button onClick={onReintentar} style={{ ...boton(false), padding: "4px 10px", marginLeft: 8 }}>Reintentar</button></Aviso>
      )}

      {estado.fase === "ok" && personas.length === 0 && (
        <div style={{ textAlign: "center", padding: "36px 12px", color: C.faint }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Todavía no cargaste a nadie en este expediente</div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6, maxWidth: 460, marginInline: "auto" }}>
            Agregá a las personas que intervienen (compradores, vendedores, apoderados…) para anotar su estado civil y tener sus datos listos al armar el documento.
            Si subís fotos de DNI en la pestaña <button onClick={onIrAArchivos} style={botonTexto}>Archivos</button> con el tipo «Automático», te propongo agregar a cada persona.
          </div>
        </div>
      )}

      {estado.fase === "ok" && personas.length > 0 && (
        <ul aria-label="Personas del expediente" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {personas.map((p) => {
            const faltan = datosQueFaltan(p);
            const nArch = porPersona.get(p.id)?.length || 0;
            return (
              <li key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "#FDFCFA", border: "1px solid rgba(26,35,50,.08)", borderRadius: 12, padding: "12px 16px" }}>
                <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: "50%", background: C.ceruleanLight, color: C.ceruleanText, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, fontFamily: fuente, flexShrink: 0 }}>{iniciales(p)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <button onClick={() => setPerfil({ personaId: p.id })} style={{ ...botonTexto, fontSize: 14, color: C.dark, textAlign: "left", padding: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombreCompleto(p)}</button>
                  <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{resumenPersona(p)}</div>
                  <div style={{ fontSize: 11, color: C.faint, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span>{[textoActualizada(p.updated_at), nArch > 0 ? cantidad(nArch, "archivo", "archivos") : ""].filter(Boolean).join(" · ")}</span>
                    {faltan.length > 0 && <span style={{ color: C.warnText, background: "rgba(201,169,97,.18)", borderRadius: 6, padding: "1px 8px", fontWeight: 700 }}>Falta {faltan.join(", ").replace(/, ([^,]*)$/, " y $1")}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => setPerfil({ personaId: p.id })} style={boton(false)}>Completar perfil</button>
                  <button onClick={() => quitar(p)} disabled={ocupada === p.id} aria-label={`Quitar a ${nombreCompleto(p)} del expediente`} style={{ ...botonTexto, color: C.faint }}>{ocupada === p.id ? "Quitando…" : "Quitar"}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {agregarAbierto && (
        <AgregarPersona libreta={libreta} yaEstan={yaEstan} onAgregar={agregarExistente} onReintentar={onReintentarLibreta}
          onCrear={(texto) => { setAgregarAbierto(false); setPerfil({ inicial: inicialDeBusqueda(texto) || {} }); }}
          onCerrar={() => setAgregarAbierto(false)} />
      )}

      {perfil && (perfil.inicial || personaAbierta) && (
        <ModalPersona key={perfil.personaId || "nueva"} persona={personaAbierta} inicial={perfil.inicial} expedienteId={expediente.id}
          archivos={personaAbierta ? porPersona.get(personaAbierta.id) || [] : []}
          onCerrar={() => setPerfil(null)}
          onGuardada={async (guardada, { agregada, existente, fotos = 0, fallaAsignar = false }) => {
            await onRecargar();
            if (fallaAsignar) { setAviso({ tipo: "aviso", texto: `Guardé a ${nombreCompleto(guardada)}, pero no pude asignarle ${fotos === 1 ? "la foto" : "las fotos"}. Asignalas desde la pestaña Archivos.` }); return; }
            setAviso({ tipo: "ok", texto: existente ? `Actualicé la ficha de ${nombreCompleto(guardada)}.` : agregada ? `Guardé a ${nombreCompleto(guardada)} y la agregué al expediente.` : `Guardé los cambios de ${nombreCompleto(guardada)}.` });
          }}
          onBorrada={async () => { await onRecargar(); setAviso({ tipo: "ok", texto: "Borraste la ficha. Sus archivos quedaron sin asignar." }); }} />
      )}
    </section>
  );
}
