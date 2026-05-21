import { useState } from "react";
import { C, FUENTES, INTERLINEADOS, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn }   from "../ui/Btn";
import { Fg }    from "../ui/FormElements";

export function ModalFormato({ fuente, fontSize, margenKey, interlineado, onApply, onClose }) {
  const [f,  setF]  = useState(fuente);
  const [fs, setFs] = useState(fontSize);
  const [mk, setMk] = useState(margenKey);
  const [il, setIl] = useState(interlineado);

  function aplicar() {
    onApply({ fuente: f, fontSize: fs, margenKey: mk, interlineado: il });
    onClose();
  }

  const sel = { ...inp, padding: "6px 9px" };

  return (
    <Modal title="Formato del documento" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={aplicar}>Aplicar</Btn></>}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Fg label="Fuente" full>
          <select value={f.key} onChange={e => setF(FUENTES.find(x => x.key === e.target.value))} style={sel}>
            {FUENTES.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </Fg>
        <Fg label="Tamaño (pt)">
          <select value={fs} onChange={e => setFs(Number(e.target.value))} style={sel}>
            {[8,9,10,11,12,13,14,16,18].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Fg>
        <Fg label="Márgenes">
          <select value={mk} onChange={e => setMk(e.target.value)} style={sel}>
            <option value="protocolar">Protocolar</option>
            <option value="noprotocolar">No protocolar</option>
          </select>
        </Fg>
        <Fg label="Interlineado">
          <select value={il.key} onChange={e => setIl(INTERLINEADOS.find(x => x.key === e.target.value))} style={sel}>
            {INTERLINEADOS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </Fg>
      </div>
    </Modal>
  );
}
