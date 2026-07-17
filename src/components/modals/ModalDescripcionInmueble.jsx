import { useState } from "react";
import { C, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { Fg } from "../ui/FormElements";
import { InputDecimal } from "../ui/Masked";

const RUMBOS = ["Norte", "Sur", "Este", "Oeste", "Noreste", "Noroeste", "Sureste", "Suroeste"];

function nuevaMedida() { return { id: Date.now() + Math.random(), rumbo: "", metros: "", lindero: "" }; }

export function generarDescripcionInmueble(d) {
  const partes = [];
  if (d.ubicacion) partes.push(d.ubicacion.trim());
  if (d.superficie) partes.push(`con una superficie total de ${d.superficie} m²`);

  const medidas = (d.medidas || []).filter(m => m.rumbo && m.metros);
  if (medidas.length) {
    const texto = medidas.map(m => `al ${m.rumbo}, ${m.metros} metros${m.lindero ? `, lindando con ${m.lindero}` : ""}`).join("; ");
    partes.push(`que mide y linda: ${texto}`);
  }

  const ochavas = (d.ochavas || []).filter(o => o.metros);
  if (ochavas.length) {
    const texto = ochavas.map(o => `${o.metros} metros${o.lindero ? `, lindando con ${o.lindero}` : ""}`).join("; ");
    partes.push(`con ${ochavas.length > 1 ? "ochavas" : "una ochava"} de ${texto}`);
  }

  return partes.length ? partes.join(", ") + ".-" : "";
}

export function ModalDescripcionInmueble({ datos, onApply, onClose }) {
  const [d, setD] = useState(() => ({
    ubicacion: datos?.ubicacion || "",
    superficie: datos?.superficie || "",
    medidas: datos?.medidas?.length ? datos.medidas : [nuevaMedida()],
    ochavas: datos?.ochavas || [],
  }));

  const upd = (campo, valor) => setD(x => ({ ...x, [campo]: valor }));
  const updMedida = (idx, campo, valor) => setD(x => ({
    ...x, medidas: x.medidas.map((m, i) => i === idx ? { ...m, [campo]: valor } : m),
  }));
  const updOchava = (idx, campo, valor) => setD(x => ({
    ...x, ochavas: x.ochavas.map((o, i) => i === idx ? { ...o, [campo]: valor } : o),
  }));

  const preview = generarDescripcionInmueble(d);

  function aplicar() {
    onApply(preview, d);
    onClose();
  }

  const sInp = { ...inp, fontSize: 12, padding: "6px 9px" };

  return (
    <Modal title="Descripción del inmueble" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={aplicar}>Aplicar</Btn></>}>

      <Fg label="Ubicación (calle, número, departamento, etc.)">
        <textarea style={{ ...sInp, resize: "vertical", minHeight: 44 }}
          value={d.ubicacion} onChange={e => upd("ubicacion", e.target.value)}
          placeholder="Ej: un inmueble urbano ubicado en calle Falsa N° 123, Departamento Godoy Cruz, Provincia de Mendoza" />
      </Fg>

      <Fg label="Superficie total (m²)">
        <InputDecimal style={{ ...sInp, width: 160 }} value={d.superficie} onChange={v => upd("superficie", v)} placeholder="Ej: 300,00" />
      </Fg>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(26,35,50,.45)", marginBottom: 6 }}>
          Medidas y linderos
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {d.medidas.map((m, idx) => (
            <div key={m.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select style={{ ...sInp, width: 110, flexShrink: 0 }} value={m.rumbo} onChange={e => updMedida(idx, "rumbo", e.target.value)}>
                <option value="">Rumbo</option>
                {RUMBOS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input style={{ ...sInp, width: 90, flexShrink: 0 }} value={m.metros} onChange={e => updMedida(idx, "metros", e.target.value)} placeholder="metros" />
              <input style={{ ...sInp, flex: 1 }} value={m.lindero} onChange={e => updMedida(idx, "lindero", e.target.value)} placeholder="con quién linda" />
              <button onClick={() => setD(x => ({ ...x, medidas: x.medidas.filter((_, i) => i !== idx) }))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(26,35,50,.4)", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
        {d.medidas.length < 8 && (
          <button onClick={() => setD(x => ({ ...x, medidas: [...x.medidas, nuevaMedida()] }))}
            style={{ marginTop: 6, background: "none", border: "none", color: C.cerulean, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
            + Agregar rumbo
          </button>
        )}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(26,35,50,.45)", marginBottom: 6 }}>
          Ochavas (opcional)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {d.ochavas.map((o, idx) => (
            <div key={o.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input style={{ ...sInp, width: 90, flexShrink: 0 }} value={o.metros} onChange={e => updOchava(idx, "metros", e.target.value)} placeholder="metros" />
              <input style={{ ...sInp, flex: 1 }} value={o.lindero} onChange={e => updOchava(idx, "lindero", e.target.value)} placeholder="con quién linda" />
              <button onClick={() => setD(x => ({ ...x, ochavas: x.ochavas.filter((_, i) => i !== idx) }))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(26,35,50,.4)", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
        <button onClick={() => setD(x => ({ ...x, ochavas: [...x.ochavas, { id: Date.now() + Math.random(), metros: "", lindero: "" }] }))}
          style={{ marginTop: 6, background: "none", border: "none", color: C.cerulean, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
          + Agregar ochava
        </button>
      </div>

      {preview && (
        <Fg label="Vista previa del texto">
          <div style={{ fontSize: 12, color: C.dark, background: "#f8f6f2", borderRadius: 6, padding: "8px 10px", lineHeight: 1.5 }}>
            {preview}
          </div>
        </Fg>
      )}
    </Modal>
  );
}
