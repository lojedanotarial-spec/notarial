import { useState } from "react";
import { C, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { Fg } from "../ui/FormElements";

export function ModalFormulario({ formulario, onApply, onClose }) {
  const [d, setD] = useState({ tipo: "08", numero: "", dominio: "", ...formulario });
  const upd = (f, v) => setD(prev => ({ ...prev, [f]: v }));

  return (
    <Modal title="Formulario" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn primary onClick={() => { onApply(d); onClose(); }}>Guardar</Btn></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Fg label="Tipo de formulario">
          <div style={{ display: "flex", gap: 10 }}>
            {["08", "04"].map(t => (
              <button key={t} type="button" onClick={() => upd("tipo", t)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: "2px solid",
                  borderColor: d.tipo === t ? C.cerulean : "rgba(26,35,50,.15)",
                  background: d.tipo === t ? C.ceruleanLight : "transparent",
                  color: d.tipo === t ? C.cerulean : C.dark,
                  fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
                  fontSize: 18, cursor: "pointer",
                }}>
                F-{t}
              </button>
            ))}
          </div>
        </Fg>
        <Fg label="N° de formulario">
          <input style={inp} value={d.numero}
            onChange={e => upd("numero", e.target.value.replace(/\D/g, ""))}
            placeholder="Ej: 53583936" maxLength={12}/>
        </Fg>
        <Fg label="Dominio (patente)">
          <input style={inp} value={d.dominio}
            onChange={e => upd("dominio", e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="Ej: LIX414" maxLength={8}/>
        </Fg>
      </div>
    </Modal>
  );
}
