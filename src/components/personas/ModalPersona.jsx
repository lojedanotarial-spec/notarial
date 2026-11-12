// "Completar perfil": la ficha de una persona del registro. Reúne los mismos datos que una parte del editor (nombre, documento, CUIT,
// nacimiento, domicilio), el estado civil (desplegable, misma lista que el editor) y notas libres. Los datos se guardan en la tabla
// `personas` de Supabase (a través del servidor, que avisa los duplicados y deja el historial).
// "Leer del DNI" solo ocurre cuando se toca el botón y NADA se guarda hasta tocar Guardar. Spec: specs/personas-expediente/.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { C } from "../../constants";
import { fmtDni } from "../../utils/formato";
import { estadosCivilesPara, concordarEstadoCivil } from "../../utils/personasDatos";
import { listarArchivos, subirArchivoEscribania, traerArchivo } from "../../utils/driveApi";
import { esPrevisualizable, etiquetaTipo } from "../../utils/driveCliente";
import { escanearDocumento, mergePersonas } from "../../utils/escanearDocumento";
import {
  ETIQUETAS_CAMPO, asignarArchivos, borrarPersona, comparacionLectura, cuitCalculado, datosDeFicha, guardarPersona, nombreCompleto, resumenPersona,
  textoActualizada, vacioFicha, validarFicha,
} from "../../utils/personasCliente";
import { Aviso, Modal } from "./comunes";
import { boton, botonPeligro, botonTexto, campo, fuente } from "./estilos";
import VisorArchivo from "./VisorArchivo";
import SubidaCelular from "../SubidaCelular";

const MAX_FOTOS_LECTURA = 4;

function Campo({ id, etiqueta, error, origen, ayuda, children, ancho }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: ancho === "completo" ? "1 / -1" : undefined, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 12, color: C.faint, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {etiqueta}
        {origen && <span style={{ fontSize: 11, fontWeight: 700, color: C.ceruleanText, background: C.ceruleanLight, borderRadius: 6, padding: "1px 6px" }}>leído del DNI</span>}
      </label>
      {children}
      {ayuda && !error && <div id={`${id}-ayuda`} style={{ fontSize: 11, color: C.faint, lineHeight: 1.4 }}>{ayuda}</div>}
      {error && <div id={`${id}-error`} role="alert" style={{ fontSize: 11, color: C.danger, lineHeight: 1.4 }}>{error}</div>}
    </div>
  );
}

const Seccion = ({ titulo, children }) => (
  <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
    <legend style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.faint, fontFamily: fuente, padding: 0, marginBottom: 10 }}>{titulo}</legend>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>{children}</div>
  </fieldset>
);

const valoresDe = (persona, inicial) => {
  const base = vacioFicha();
  const origen = persona || inicial || {};
  for (const k of Object.keys(base)) if (origen[k] != null) base[k] = String(origen[k]);
  return base;
};

export default function ModalPersona({ persona, inicial, expedienteId, archivos = [], onCerrar, onGuardada, onBorrada }) {
  const uid = useId();
  const id = (c) => `${uid}-${c}`;
  const [original] = useState(() => valoresDe(persona, inicial));
  const [form, setForm] = useState(original);
  const [errores, setErrores] = useState({});
  const [leidoDe, setLeidoDe] = useState(() => new Set());
  const [lectura, setLectura] = useState({ fase: "reposo" });   // reposo | leyendo | listo | vacia | error
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [duplicada, setDuplicada] = useState(null);
  const [confirmarCerrar, setConfirmarCerrar] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [visor, setVisor] = useState(null);
  const cancelarLectura = useRef(false);
  const inputFotos = useRef(null);

  // Fotos que se suben desde esta ventana (compu o celular): quedan en el expediente "sin asignar" y se le asignan a la persona al
  // guardar. `baseline` = lo que ya había en el expediente al abrir, para reconocer lo nuevo (también lo que llega del celular).
  const [lista, setLista] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [cola, setCola] = useState([]);          // subidas de la compu en curso: { id, nombre, estado, progreso, mensaje }
  const [qrAbierto, setQrAbierto] = useState(false);
  const refrescar = useCallback(async () => {
    try { setLista(await listarArchivos(expedienteId)); } catch { /* se reintenta en el próximo ciclo */ }
  }, [expedienteId]);
  useEffect(() => {
    let vivo = true;
    listarArchivos(expedienteId)
      .then((a) => { if (vivo) { setBaseline(new Set(a.map((x) => x.id))); setLista(a); } })
      .catch(() => { if (vivo) { setBaseline(new Set()); setLista([]); } });
    return () => { vivo = false; };
  }, [expedienteId]);
  const pendientes = baseline && lista ? lista.filter((a) => !baseline.has(a.id) && !a.persona_id) : [];
  const subiendo = cola.some((x) => x.estado === "subiendo" || x.estado === "esperando");

  const cambiado = JSON.stringify(datosDeFicha(form)) !== JSON.stringify(datosDeFicha(original)) || pendientes.length > 0;
  const ocupado = guardando || borrando || lectura.fase === "leyendo" || subiendo;
  const estadosCiviles = estadosCivilesPara(form.genero);

  function cambiar(c, valor) {
    setForm((f) => {
      let n = { ...f, [c]: valor };
      if (c === "genero") {
        n.estado_civil = concordarEstadoCivil(n.estado_civil, valor);
        if (/^argentin[oa]$/i.test(n.nacionalidad)) n.nacionalidad = valor === "F" ? "argentina" : "argentino";
      }
      // El CUIT se calcula solo mientras no lo hayas escrito vos: si estaba vacío o era el calculado, se recalcula.
      if (["genero", "nro_doc", "tipo_doc"].includes(c) && (!f.cuit || f.cuit === cuitCalculado(f))) n = { ...n, cuit: cuitCalculado(n) };
      return n;
    });
    setLeidoDe((s) => { if (!s.has(c)) return s; const n = new Set(s); n.delete(c); return n; });
    setErrores((e) => { if (!e[c]) return e; const n = { ...e }; delete n[c]; return n; });
    setDuplicada(null);
  }

  const texto = (c, props = {}) => (
    <input id={id(c)} value={form[c]} onChange={(e) => cambiar(c, e.target.value)} style={campo}
      aria-invalid={errores[c] ? true : undefined} aria-describedby={errores[c] ? `${id(c)}-error` : undefined} {...props} />
  );

  // ── Cerrar, guardar, borrar ────────────────────────────────────────────────
  function pedirCerrar() {
    if (ocupado) return;
    if (cambiado) setConfirmarCerrar(true); else onCerrar();
  }

  async function guardar(actualizarExistente = false) {
    const e = validarFicha(form);
    if (Object.keys(e).length) {
      setErrores(e);
      setErrorGeneral(`Revisá ${Object.keys(e).length === 1 ? "este dato" : "estos datos"} antes de guardar.`);
      document.getElementById(id(Object.keys(e)[0]))?.focus();
      return;
    }
    setGuardando(true);
    setErrorGeneral("");
    try {
      const r = await guardarPersona({ personaId: persona?.id, expedienteId, datos: datosDeFicha(form), actualizarExistente });
      if (r.duplicada) { setDuplicada(r.duplicada); return; }
      let fallaAsignar = false;
      if (pendientes.length) {
        try { await asignarArchivos(pendientes.map((a) => a.id), r.persona.id); } catch { fallaAsignar = true; }
      }
      onGuardada(r.persona, { agregada: !!r.agregada, existente: actualizarExistente, fotos: pendientes.length, fallaAsignar });
      onCerrar();
    } catch (err) {
      setErrorGeneral(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    setBorrando(true);
    setErrorGeneral("");
    try {
      await borrarPersona(persona.id);
      onBorrada(persona.id);
      onCerrar();
    } catch (err) {
      setErrorGeneral(err.message);
      setConfirmarBorrar(false);
    } finally {
      setBorrando(false);
    }
  }

  // ── Fotos del documento ────────────────────────────────────────────────────
  async function subirDeLaCompu(files) {
    if (!files.length) return;
    setErrorGeneral("");
    const nuevos = files.map((f, i) => ({ id: `${Date.now()}-${i}`, archivo: f, nombre: f.name, estado: "esperando", progreso: 0, mensaje: "" }));
    setCola((c) => [...c, ...nuevos]);
    for (const item of nuevos) {
      const marcar = (cambios) => setCola((c) => c.map((x) => (x.id === item.id ? { ...x, ...cambios } : x)));
      marcar({ estado: "subiendo" });
      try {
        const fila = await subirArchivoEscribania(item.archivo, { expedienteId, tipo: "dni", onProgreso: (p) => marcar({ progreso: p }) });
        setLista((l) => [fila, ...(l || []).filter((a) => a.id !== fila.id)]);
        marcar({ estado: "ok", progreso: 1 });
        setTimeout(() => setCola((c) => c.filter((x) => x.id !== item.id)), 3000);
      } catch (e) {
        marcar({ estado: "error", mensaje: e.message });
      }
    }
  }

  // ── Leer del DNI ───────────────────────────────────────────────────────────
  const fotos = [...archivos, ...pendientes.filter((p) => !archivos.some((a) => a.id === p.id))].filter((a) => esPrevisualizable(a.mime_type)).sort((a, b) => (b.tipo === "dni") - (a.tipo === "dni")).slice(0, MAX_FOTOS_LECTURA);

  async function leerDelDni() {
    cancelarLectura.current = false;
    setErrorGeneral("");
    let acumulado = null;
    let fallidas = 0;
    for (const [i, a] of fotos.entries()) {
      if (cancelarLectura.current) { setLectura({ fase: "reposo" }); return; }
      setLectura({ fase: "leyendo", paso: i + 1, total: fotos.length, nombre: a.nombre });
      try {
        const blob = await traerArchivo(a.id, false);
        acumulado = mergePersonas(acumulado, await escanearDocumento(new File([blob], a.nombre, { type: a.mime_type })));
      } catch { fallidas += 1; }
    }
    if (cancelarLectura.current) { setLectura({ fase: "reposo" }); return; }
    if (acumulado === null) { setLectura({ fase: "error" }); return; }
    const r = comparacionLectura(form, acumulado);
    if (!r.leidos) { setLectura({ fase: "vacia", fallidas }); return; }
    setForm((f) => ({ ...f, ...r.rellenar }));
    setLeidoDe(new Set(Object.keys(r.rellenar)));
    setLectura({ fase: "listo", leidos: r.leidos, rellenados: Object.keys(r.rellenar), discrepancias: r.discrepancias, fallidas, fotos: fotos.length });
  }

  function usarDelDni(d) {
    cambiar(d.campo, d.dni);
    setLeidoDe((s) => new Set(s).add(d.campo));
    setLectura((l) => ({ ...l, discrepancias: l.discrepancias.filter((x) => x.campo !== d.campo) }));
  }

  const titulo = persona ? "Completar perfil" : "Persona nueva";
  const cuando = persona ? textoActualizada(persona.updated_at) : "";

  return (
    <>
      <Modal titulo={titulo} ancho={780} onCerrar={pedirCerrar} bloqueado={ocupado || !!visor || qrAbierto}>
        <div style={{ padding: "2px 22px 0", fontSize: 12, color: C.faint, lineHeight: 1.5 }}>
          {persona ? <><strong style={{ color: C.dark }}>{nombreCompleto(persona)}</strong>{cuando ? ` · ${cuando}` : ""}</> : "Se guarda en tu libreta y queda disponible para los próximos trámites."}
        </div>

        <div style={{ padding: "14px 22px", overflow: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Leer del DNI */}
          {(
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "#fff" }}>
              {lectura.fase === "leyendo" ? (
                <div aria-live="polite">
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Leyendo el documento ({lectura.paso} de {lectura.total})…</div>
                  <div style={{ fontSize: 12, color: C.faint, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lectura.nombre}</div>
                  <div role="progressbar" aria-label="Avance de la lectura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((lectura.paso - 1) / lectura.total) * 100)}
                    style={{ height: 6, borderRadius: 3, background: "rgba(26,35,50,.1)", margin: "10px 0", overflow: "hidden" }}>
                    <div style={{ width: `${Math.round(((lectura.paso - 0.5) / lectura.total) * 100)}%`, height: "100%", background: C.cerulean, transition: "width .25s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: C.faint }}>Si no se puede leer, completás los datos a mano. No se guarda nada hasta que toques Guardar.</span>
                    <button onClick={() => { cancelarLectura.current = true; }} style={boton(false)}>Cancelar lectura</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, fontFamily: fuente }}>Fotos del documento</div>
                  <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.5, margin: "2px 0 10px" }}>
                    {fotos.length > 0
                      ? <>Podés completar los datos leyendo {fotos.length === 1 ? "la foto" : `las ${fotos.length} fotos`} de esta persona. Solo se llenan los campos vacíos y vos revisás todo antes de guardar.</>
                      : <>Subí la foto del DNI (frente y dorso) desde la computadora o el celular y después leé los datos. Si preferís, completalos a mano.</>}
                  </div>
                  <input ref={inputFotos} type="file" multiple accept="image/*,application/pdf" style={{ display: "none" }} aria-label="Elegir fotos del documento"
                    onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; subirDeLaCompu(files); }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => inputFotos.current?.click()} disabled={ocupado || !baseline} style={boton(false, ocupado || !baseline)}>{subiendo ? "Subiendo…" : "Subir desde la compu"}</button>
                    <button onClick={() => setQrAbierto(true)} disabled={ocupado || !baseline} style={boton(false, ocupado || !baseline)}>Subir desde el celular</button>
                    {fotos.length > 0 && <button onClick={leerDelDni} disabled={ocupado} style={boton(true, ocupado)}>{lectura.fase === "reposo" ? "Leer del DNI" : "Leer de nuevo"}</button>}
                  </div>
                  {cola.length > 0 && (
                    <ul aria-live="polite" style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      {cola.map((x) => (
                        <li key={x.id} style={{ fontSize: 12, color: x.estado === "error" ? C.danger : C.faint, display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</span>
                          <span style={{ flexShrink: 0 }}>
                            {x.estado === "esperando" && "En espera"}
                            {x.estado === "subiendo" && `Subiendo ${Math.round(x.progreso * 100)} %`}
                            {x.estado === "ok" && "Subida"}
                            {x.estado === "error" && <>{x.mensaje} <button onClick={() => setCola((c) => c.filter((y) => y.id !== x.id))} style={botonTexto}>Quitar</button></>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pendientes.length > 0 && <div style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>{pendientes.length === 1 ? "1 foto subida" : `${pendientes.length} fotos subidas`}: se {pendientes.length === 1 ? "le asigna" : "le asignan"} a la persona al guardar.</div>}
                </div>
              )}
              {lectura.fase === "listo" && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <Aviso tipo={lectura.fallidas ? "aviso" : "ok"}>
                    {lectura.rellenados.length > 0
                      ? <>Leí {lectura.leidos} {lectura.leidos === 1 ? "dato" : "datos"} y completé {lectura.rellenados.length === 1 ? "este campo" : "estos campos"}: <strong>{lectura.rellenados.map((c) => ETIQUETAS_CAMPO[c]).join(", ")}</strong>. Revisalos y tocá Guardar: todavía no se guardó nada.</>
                      : <>Leí {lectura.leidos} {lectura.leidos === 1 ? "dato" : "datos"}, pero esta ficha ya los tenía cargados. No cambié nada.</>}
                    {lectura.fallidas > 0 && <> No pude leer {lectura.fallidas === 1 ? "una de las fotos" : `${lectura.fallidas} de las fotos`}.</>}
                  </Aviso>
                  {lectura.discrepancias.map((d) => (
                    <Aviso key={d.campo} tipo="aviso">
                      <strong>{ETIQUETAS_CAMPO[d.campo]}:</strong> el DNI dice «{d.dni}» · tenés «{d.actual}».{" "}
                      <button onClick={() => usarDelDni(d)} style={botonTexto}>Usar el del DNI</button>
                    </Aviso>
                  ))}
                </div>
              )}
              {lectura.fase === "vacia" && <div style={{ marginTop: 10 }}><Aviso tipo="aviso">No pude leer datos de {fotos.length === 1 ? "esa foto" : "esas fotos"}. Probá con una foto más nítida, sin reflejos, o completá los datos a mano.</Aviso></div>}
              {lectura.fase === "error" && <div style={{ marginTop: 10 }}><Aviso tipo="error">No se pudo leer el documento (puede ser la conexión). Probá de nuevo en un momento o completá los datos a mano.</Aviso></div>}
            </div>
          )}

          <Seccion titulo="Datos personales">
            <Campo id={id("apellido")} etiqueta="Apellido" error={errores.apellido} origen={leidoDe.has("apellido")}>{texto("apellido", { autoComplete: "off", ...(persona ? {} : { "data-autofocus": true }) })}</Campo>
            <Campo id={id("nombre")} etiqueta="Nombre" origen={leidoDe.has("nombre")}>{texto("nombre", { autoComplete: "off" })}</Campo>
            <Campo id={id("genero")} etiqueta="Género" origen={leidoDe.has("genero")}>
              <select id={id("genero")} value={form.genero} onChange={(e) => cambiar("genero", e.target.value)} style={campo}>
                <option value="">—</option><option value="F">Femenino</option><option value="M">Masculino</option>
              </select>
            </Campo>
            <Campo id={id("fecha_nac")} etiqueta="Fecha de nacimiento" error={errores.fecha_nac} origen={leidoDe.has("fecha_nac")}>
              <input id={id("fecha_nac")} value={form.fecha_nac} inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} style={campo}
                aria-invalid={errores.fecha_nac ? true : undefined} aria-describedby={errores.fecha_nac ? `${id("fecha_nac")}-error` : undefined}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                  if (v.length >= 5) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`; else if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                  cambiar("fecha_nac", v);
                }} />
            </Campo>
            <Campo id={id("nacionalidad")} etiqueta="Nacionalidad" origen={leidoDe.has("nacionalidad")}>{texto("nacionalidad", { placeholder: "Por ejemplo: argentina" })}</Campo>
            <Campo id={id("tipo_doc")} etiqueta="Tipo de documento" origen={leidoDe.has("tipo_doc")}>
              <select id={id("tipo_doc")} value={form.tipo_doc || "DNI"} onChange={(e) => cambiar("tipo_doc", e.target.value)} style={campo}>
                <option>DNI</option><option>LE</option><option>LC</option><option>Pasaporte</option>
              </select>
            </Campo>
            <Campo id={id("nro_doc")} etiqueta="N° de documento" error={errores.nro_doc} origen={leidoDe.has("nro_doc")}>
              <input id={id("nro_doc")} style={campo} autoComplete="off" placeholder="Por ejemplo: 31.645.431"
                inputMode={["DNI", "LE", "LC"].includes(form.tipo_doc || "DNI") ? "numeric" : "text"}
                value={["DNI", "LE", "LC"].includes(form.tipo_doc || "DNI") ? fmtDni(form.nro_doc) : form.nro_doc}
                aria-invalid={errores.nro_doc ? true : undefined} aria-describedby={errores.nro_doc ? `${id("nro_doc")}-error` : undefined}
                onChange={(e) => cambiar("nro_doc", ["DNI", "LE", "LC"].includes(form.tipo_doc || "DNI") ? e.target.value.replace(/\D/g, "").slice(0, 8) : e.target.value.trim())} />
            </Campo>
            <Campo id={id("cuit")} etiqueta="CUIT / CUIL" ayuda="Se calcula con el DNI y el género; podés corregirlo." origen={leidoDe.has("cuit")}>{texto("cuit", { placeholder: "Se calcula con el DNI", inputMode: "numeric" })}</Campo>
          </Seccion>

          <Seccion titulo="Estado civil y notas">
            <Campo id={id("estado_civil")} etiqueta="Estado civil" origen={leidoDe.has("estado_civil")}
              ayuda={form.genero ? undefined : "Elegí el género para que el estado civil quede bien escrito (soltero o soltera)."}>
              <select id={id("estado_civil")} value={form.estado_civil} onChange={(e) => cambiar("estado_civil", e.target.value)} style={campo}>
                <option value="">—</option>
                {estadosCiviles.map((ec) => <option key={ec} value={ec}>{ec}</option>)}
              </select>
            </Campo>
            <Campo id={id("notas")} etiqueta="Notas" ancho="completo" ayuda="Para lo que no entra en el estado civil: con quién está casada, régimen, en qué nupcias, etc. No aparece en los documentos.">
              <textarea id={id("notas")} value={form.notas} onChange={(e) => cambiar("notas", e.target.value)} rows={3} maxLength={2000} style={{ ...campo, resize: "vertical", lineHeight: 1.5 }} />
            </Campo>
          </Seccion>

          <Seccion titulo="Domicilio">
            <Campo id={id("calle")} etiqueta="Calle" origen={leidoDe.has("calle")}>{texto("calle")}</Campo>
            <Campo id={id("numero")} etiqueta="Número" origen={leidoDe.has("numero")}>{texto("numero")}</Campo>
            <Campo id={id("piso")} etiqueta="Piso">{texto("piso")}</Campo>
            <Campo id={id("dpto")} etiqueta="Depto.">{texto("dpto")}</Campo>
            <Campo id={id("barrio")} etiqueta="Barrio" origen={leidoDe.has("barrio")}>{texto("barrio")}</Campo>
            <Campo id={id("manzana")} etiqueta="Manzana" origen={leidoDe.has("manzana")}>{texto("manzana")}</Campo>
            <Campo id={id("casa")} etiqueta="Casa / Lote" origen={leidoDe.has("casa")}>{texto("casa")}</Campo>
            <Campo id={id("localidad")} etiqueta="Localidad" origen={leidoDe.has("localidad")}>{texto("localidad")}</Campo>
            <Campo id={id("departamento")} etiqueta="Departamento" origen={leidoDe.has("departamento")}>{texto("departamento")}</Campo>
            <Campo id={id("provincia")} etiqueta="Provincia">{texto("provincia")}</Campo>
            <Campo id={id("pais")} etiqueta="País">{texto("pais")}</Campo>
          </Seccion>

          {(persona || pendientes.length > 0) && (
            <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
              <legend style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.faint, fontFamily: fuente, padding: 0, marginBottom: 8 }}>Archivos de esta persona</legend>
              {archivos.length + pendientes.length === 0 ? (
                <div style={{ fontSize: 12, color: C.faint, lineHeight: 1.5 }}>Todavía no tiene archivos. Subí fotos acá arriba o asignalas desde la pestaña Archivos del expediente.</div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...archivos, ...pendientes.filter((p) => !archivos.some((a) => a.id === p.id))].map((a) => (
                    <li key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre}</div>
                        <div style={{ fontSize: 11, color: C.faint }}>{etiquetaTipo(a.tipo)}{pendientes.some((p) => p.id === a.id) ? " · se asigna al guardar" : ""}</div>
                      </div>
                      <button onClick={() => setVisor(a)} aria-label={`Ver ${a.nombre}`} style={boton(false)}>Ver</button>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 22px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

          {duplicada && (
            <Aviso tipo="aviso">
              Ya existe una persona {duplicada.por === "dni" ? "con ese mismo documento" : "con el mismo apellido y nombre"} en tu libreta:{" "}
              <strong>{nombreCompleto(duplicada.persona)}</strong> · {resumenPersona(duplicada.persona)}{textoActualizada(duplicada.persona.updated_at) ? ` · ${textoActualizada(duplicada.persona.updated_at).toLowerCase()}` : ""}.
              {" "}Si es la misma persona, actualizá su ficha con lo que escribiste: no se borra nada de lo que ya tenía cargado.
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button data-autofocus onClick={() => guardar(true)} disabled={guardando} style={boton(true, guardando)}>{guardando ? "Actualizando…" : "Actualizar la ficha existente"}</button>
                <button onClick={() => setDuplicada(null)} disabled={guardando} style={boton(false, guardando)}>Volver y corregir</button>
              </div>
            </Aviso>
          )}

          {confirmarCerrar && (
            <Aviso tipo="aviso">
              Tenés cambios sin guardar. Si cerrás ahora se pierden{pendientes.length > 0 ? "; las fotos que subiste quedan en la pestaña Archivos, sin asignar" : ""}.
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button autoFocus onClick={() => setConfirmarCerrar(false)} style={boton(true)}>Seguir editando</button>
                <button onClick={onCerrar} style={{ ...boton(false), borderColor: "rgba(192,57,43,.45)", color: C.danger }}>Descartar cambios</button>
              </div>
            </Aviso>
          )}

          {confirmarBorrar && (
            <Aviso tipo="error">
              ¿Borrar la ficha de <strong>{nombreCompleto(persona)}</strong>? Se saca de todos los expedientes donde figura y sus archivos quedan sin asignar (los archivos no se borran). No se puede deshacer.
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button autoFocus onClick={() => setConfirmarBorrar(false)} disabled={borrando} style={boton(false, borrando)}>Cancelar</button>
                <button onClick={borrar} disabled={borrando} style={botonPeligro(borrando)}>{borrando ? "Borrando…" : "Borrar ficha"}</button>
              </div>
            </Aviso>
          )}

          {!duplicada && !confirmarCerrar && !confirmarBorrar && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {persona ? <button onClick={() => setConfirmarBorrar(true)} disabled={ocupado} style={{ ...botonTexto, color: C.danger }}>Borrar ficha</button> : <span />}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={pedirCerrar} disabled={ocupado} style={boton(false, ocupado)}>Cancelar</button>
                <button onClick={() => guardar(false)} disabled={ocupado || (!!persona && !cambiado)} style={boton(true, ocupado || (!!persona && !cambiado))}>
                  {guardando ? "Guardando…" : persona ? "Guardar cambios" : "Guardar persona"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
      {visor && <VisorArchivo archivo={visor} onCerrar={() => setVisor(null)} />}
      {qrAbierto && <SubidaCelular expedienteId={expedienteId} archivos={lista || []} alActualizar={refrescar} onCerrar={() => { setQrAbierto(false); refrescar(); }} />}
    </>
  );
}
