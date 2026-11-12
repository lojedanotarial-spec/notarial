// Panel lateral "Archivos del expediente" para consultar la documentación mientras se edita el documento: la lista agrupada por persona
// (y "Sin asignar"), con abrir y descargar. No modifica el documento ni el expediente. Spec: specs/personas-expediente/ (UC-4).
import { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../../constants";
import { guardarBlob, listarArchivos, traerArchivo } from "../../utils/driveApi";
import { etiquetaTipo } from "../../utils/driveCliente";
import { agruparArchivos, nombreCompleto } from "../../utils/personasCliente";
import { Aviso, FilaEsqueleto } from "./comunes";
import { boton, botonTexto, fuente } from "./estilos";
import VisorArchivo from "./VisorArchivo";

export default function PanelArchivosExpediente({ expedienteId, nombreExpediente, personas, onCerrar }) {
  const [estado, setEstado] = useState({ fase: "cargando", archivos: [], mensaje: "" });
  const [visor, setVisor] = useState(null);
  const [errorDescarga, setErrorDescarga] = useState("");
  const panel = useRef(null);

  async function cargar() {
    try { setEstado({ fase: "ok", archivos: await listarArchivos(expedienteId), mensaje: "" }); }
    catch (e) { setEstado({ fase: "error", archivos: [], mensaje: e.message }); }
  }
  // Carga inicial: `cargar` actualiza el estado recién al terminar de pedir los datos.
  useEffect(() => { cargar(); }, [expedienteId]); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  // Esc cierra el panel (salvo que haya un archivo abierto: ese Esc cierra primero el visor).
  useEffect(() => {
    const previo = document.activeElement;
    panel.current?.focus({ preventScroll: true });
    return () => { if (previo && document.contains(previo)) previo.focus?.({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === "Escape" && !visor) onCerrar(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [visor, onCerrar]);

  const grupos = useMemo(() => {
    const { porPersona, sinAsignar } = agruparArchivos(estado.archivos, personas);
    return [...personas.map((p) => ({ clave: p.id, titulo: nombreCompleto(p), archivos: porPersona.get(p.id) || [] })), { clave: "sin", titulo: "Sin asignar", archivos: sinAsignar }]
      .filter((g) => g.archivos.length > 0);
  }, [estado.archivos, personas]);

  async function descargar(a) {
    setErrorDescarga("");
    try { guardarBlob(await traerArchivo(a.id, true), a.nombre); } catch (e) { setErrorDescarga(e.message); }
  }

  return (
    <>
      <aside ref={panel} tabIndex={-1} role="complementary" aria-label="Archivos del expediente"
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 400, maxWidth: "100vw", zIndex: 900, background: "#FDFCFA", borderLeft: `1px solid ${C.border}`, boxShadow: "-8px 0 28px rgba(26,35,50,.16)", display: "flex", flexDirection: "column", outline: "none" /* design-lint-ignore: contenedor del panel, el foco se mueve por código */ }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "16px 18px 10px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.dark, fontFamily: fuente }}>Archivos del expediente</h2>
            {nombreExpediente && <div style={{ fontSize: 12, color: C.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombreExpediente}</div>}
          </div>
          <button onClick={onCerrar} style={boton(true)}>Cerrar</button>
        </div>
        <div style={{ padding: "12px 18px", overflowY: "auto", flex: 1 }}>
          {errorDescarga && <Aviso tipo="error" estilo={{ marginBottom: 10 }}>{errorDescarga}</Aviso>}
          {estado.fase === "cargando" && <div role="status" aria-label="Cargando los archivos" style={{ display: "flex", flexDirection: "column", gap: 8 }}><FilaEsqueleto /><FilaEsqueleto /></div>}
          {estado.fase === "error" && <Aviso tipo="error">{estado.mensaje} <button onClick={() => { setEstado((s) => ({ ...s, fase: "cargando" })); cargar(); }} style={{ ...boton(false), padding: "4px 10px", marginLeft: 8 }}>Reintentar</button></Aviso>}
          {estado.fase === "ok" && grupos.length === 0 && <div style={{ fontSize: 13, color: C.faint, lineHeight: 1.5 }}>Este expediente todavía no tiene archivos. Subilos desde la pestaña Archivos del expediente.</div>}
          {estado.fase === "ok" && grupos.map((g) => (
            <section key={g.clave} aria-label={g.titulo} style={{ marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.faint, fontFamily: fuente }}>{g.titulo} · {g.archivos.length}</h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {g.archivos.map((a) => (
                  <li key={a.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre}</div>
                    <div style={{ fontSize: 11, color: C.faint, marginBottom: 6 }}>{etiquetaTipo(a.tipo)}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setVisor(a)} aria-label={`Ver ${a.nombre}`} style={botonTexto}>Ver</button>
                      <button onClick={() => descargar(a)} aria-label={`Descargar ${a.nombre}`} style={botonTexto}>Descargar</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>
      {visor && <VisorArchivo archivo={visor} onCerrar={() => setVisor(null)} />}
    </>
  );
}
