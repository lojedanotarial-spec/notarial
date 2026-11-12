// Visor de un archivo del expediente (foto o PDF) en un modal. Lo usan la ficha de la persona y el panel de archivos del editor.
import { useEffect, useState } from "react";
import { C } from "../../constants";
import { guardarBlob, traerArchivo } from "../../utils/driveApi";
import { esPrevisualizable } from "../../utils/driveCliente";
import { Aviso, Modal } from "./comunes";
import { boton } from "./estilos";

export default function VisorArchivo({ archivo, onCerrar }) {
  const [estado, setEstado] = useState({ cargando: true, url: null, error: "" });

  useEffect(() => {
    let vivo = true;
    let url = null;
    if (!esPrevisualizable(archivo.mime_type)) { setEstado({ cargando: false, url: null, error: "" }); return undefined; }  
    traerArchivo(archivo.id, false).then((blob) => {
      if (!vivo) return;
      url = URL.createObjectURL(blob);
      setEstado({ cargando: false, url, error: "" });
    }).catch((e) => { if (vivo) setEstado({ cargando: false, url: null, error: e.message }); });
    return () => { vivo = false; if (url) URL.revokeObjectURL(url); };
  }, [archivo.id, archivo.mime_type]);

  async function descargar() {
    try { guardarBlob(await traerArchivo(archivo.id, true), archivo.nombre); } catch (e) { setEstado((s) => ({ ...s, error: e.message })); }
  }

  return (
    <Modal titulo={archivo.nombre} ancho={820} onCerrar={onCerrar} cierraAlTocarFondo>
      <div style={{ padding: "12px 22px 18px", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 10 }}>
          <button onClick={descargar} style={boton(false)}>Descargar</button>
          <button data-autofocus onClick={onCerrar} style={boton(true)}>Cerrar</button>
        </div>
        {estado.cargando && <div role="status" style={{ padding: 40, textAlign: "center", color: C.faint, fontSize: 13 }}>Abriendo el archivo…</div>}
        {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
        {!estado.cargando && !estado.url && !estado.error && <Aviso tipo="info">Este tipo de archivo no se puede mostrar acá. Descargalo para abrirlo.</Aviso>}
        {estado.url && (archivo.mime_type === "application/pdf"
          ? <iframe title={archivo.nombre} src={estado.url} style={{ width: "100%", height: "70vh", border: "none", borderRadius: 8, background: "#fff" }} />
          : <img alt={archivo.nombre} src={estado.url} style={{ maxWidth: "100%", maxHeight: "70vh", display: "block", margin: "0 auto", borderRadius: 8 }} />)}
      </div>
    </Modal>
  );
}
