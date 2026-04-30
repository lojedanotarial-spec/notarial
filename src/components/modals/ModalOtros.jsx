import { useState } from "react";
import { C, DEPARTAMENTOS, MESES_LABEL, inp } from "../../constants";
import { diaLetras, anioLetras } from "../../utils";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "../Modal";
import { Btn }   from "../ui/Btn";
import { Fg, Warn } from "../ui/FormElements";

export function ModalEscribano({ escribano, onApply, onClose }) {
  const { miembros } = useAuth();
  const [sel, setSel] = useState(
    miembros.findIndex(e => e.nombre === escribano.nombre) ?? 0
  );

  function aplicar() {
    const m = miembros[sel];
    const ROL_CARACTER = {
      titular:   m.genero === "f" ? "Notaria Titular"   : "Notario Titular",
      adscripta: "Notaria Adscripta",
      adscripto: "Notario Adscripto",
    };
    onApply({
      nombre:          m.nombre_preferido || `${m.nombre} ${m.apellido}`,
      caracter:        ROL_CARACTER[m.rol] || m.rol,
      registro:        m.registro,
      circunscripcion: m.circunscripcion,
      genero:          m.genero,
    });
    onClose();
  }

  return (
    <Modal title="Escribano / Notario" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={aplicar}>Aplicar</Btn></>}>
      {miembros.map((m, i) => {
        const nombre = m.nombre_preferido || `${m.nombre} ${m.apellido}`;
        const iniciales = [m.nombre?.[0], m.apellido?.[0]].filter(Boolean).join("").toUpperCase();
        const ROL_LABEL = { titular: "Titular", adscripta: "Adscripta", adscripto: "Adscripto" };
        return (
          <div key={m.id} onClick={() => setSel(i)}
               style={{
                 display: "flex", alignItems: "center", gap: 12,
                 padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                 border: "1px solid " + (sel === i ? C.cerulean : "rgba(26,35,50,.12)"),
                 background: sel === i ? C.ceruleanLight : "transparent",
               }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: sel === i ? C.cerulean : C.ceruleanLight,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              color: sel === i ? "#fff" : "#1f4862",
            }}>
              {iniciales}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{nombre}</div>
              <div style={{ fontSize: 11, color: C.muted }}>
                {ROL_LABEL[m.rol]} · Registro {m.registro} · {m.circunscripcion} circ.
              </div>
            </div>
          </div>
        );
      })}
    </Modal>
  );
}

export function ModalInstrumento({ instrumento, onApply, onClose }) {
  const [d, setD] = useState({ ...instrumento });
  const upd = (f, v) => setD(x => ({ ...x, [f]: v }));
  return (
    <Modal title="Instrumento certificado" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={() => { onApply(d); onClose(); }}>Aplicar</Btn></>}>
      <Fg label="Descripción (vacío = 'el instrumento adjunto a la presente Actuación Notarial')">
        <input style={inp} value={d.descripcion} onChange={e => upd("descripcion", e.target.value)}
               placeholder="ej: CONTRATO DE LOCACIÓN"/>
      </Fg>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Fg label="Serie">
          <input style={inp} value={d.serie} onChange={e => upd("serie", e.target.value)} placeholder="ej: Q"/>
        </Fg>
        <Fg label="N° actuación">
          <input style={inp} value={d.nroActuacion} onChange={e => upd("nroActuacion", e.target.value)} placeholder="ej: 61548"/>
        </Fg>
      </div>
      <Fg label="Fojas (opcional)">
        <input style={inp} value={d.fojas} onChange={e => upd("fojas", e.target.value)}
               placeholder="constante de dos (2) fojas útiles"/>
      </Fg>
      <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:500,
                      color:C.dark, fontFamily:"'Montserrat',sans-serif", cursor:"pointer" }}>
        <input type="checkbox" checked={d.esF08} onChange={e => upd("esF08", e.target.checked)}
               style={{ accentColor:C.cerulean }}/>
        Formulario 08 — automotor
      </label>
    </Modal>
  );
}

export function ModalProtocolo({ protocolo, onApply, onClose }) {
  const [d, setD] = useState({ ...protocolo });
  const upd = (f, v) => setD(x => ({ ...x, [f]: v }));
  return (
    <Modal title="Protocolo" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={() => { onApply(d); onClose(); }}>Aplicar</Btn></>}>
      <Fg label="Nombre del libro">
        <select style={inp} value={d.libro} onChange={e => upd("libro", e.target.value)}>
          <option>Libro de Protocolo de Actas de Requerimientos para Certificaciones de Firmas e Impresiones Digitales</option>
          <option>Libro de Requerimientos para Certificaciones de Firmas</option>
          <option>Libro de Registros de firmas e impresiones digitales</option>
          
        </select>
      </Fg>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Fg label="N° de libro">
          <input style={inp} value={d.nroLibro} onChange={e => upd("nroLibro", e.target.value)} placeholder="ej: IV"/>
        </Fg>
        <Fg label="N° de acta">
          <input style={inp} value={d.nroActa} onChange={e => upd("nroActa", e.target.value)} placeholder="ej: 008"/>
        </Fg>
      </div>
      <Warn>El N° de acta es manual. El documento puede cerrarse sin completarlo.</Warn>
    </Modal>
  );
}

export function ModalFecha({ fecha, onApply, onClose }) {
  const [d, setD] = useState({ ...fecha });
  const upd = (f, v) => setD(x => ({ ...x, [f]: v }));
  const hoy = () => {
    const h = new Date();
    setD(x => ({ ...x, dia: h.getDate(), mes: h.getMonth(), anio: h.getFullYear() }));
  };
  const preview = diaLetras(d.dia) + " días del mes de " + MESES_LABEL[d.mes] + " de " + anioLetras(d.anio);
  return (
    <Modal title="Lugar y fecha de otorgamiento" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={() => { onApply(d); onClose(); }}>Aplicar</Btn></>}>
      <Fg label="Ciudad">
        <select style={inp} value={d.ciudad} onChange={e => upd("ciudad", e.target.value)}>
          {DEPARTAMENTOS.map(dep => <option key={dep}>{dep}</option>)}
        </select>
      </Fg>
      <Fg label="Fecha">
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input type="number" min={1} max={31} value={d.dia}
                 onChange={e => upd("dia", Number(e.target.value))}
                 style={{ ...inp, width:64, textAlign:"center" }}/>
          <select style={{ ...inp, flex:1 }} value={d.mes} onChange={e => upd("mes", Number(e.target.value))}>
            {MESES_LABEL.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <input type="number" min={2024} max={2099} value={d.anio}
                 onChange={e => upd("anio", Number(e.target.value))}
                 style={{ ...inp, width:84, textAlign:"center" }}/>
          <button onClick={hoy} style={{
            padding:"6px 10px", border:"1px solid rgba(26,35,50,.2)", borderRadius:6,
            fontSize:13, fontWeight:500, background:"#FDFCFA", color:"#1a2332",
            fontFamily:"'Montserrat',sans-serif", whiteSpace:"nowrap", cursor:"pointer",
          }}>
            ↺ Hoy
          </button>
        </div>
        <div style={{ fontSize:11, color:C.faint, marginTop:5 }}>→ {preview}</div>
      </Fg>
    </Modal>
  );
}
