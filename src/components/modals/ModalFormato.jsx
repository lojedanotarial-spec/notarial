import { useState } from "react";
import { C, FUENTES, INTERLINEADOS, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn }   from "../ui/Btn";
import { Fg }    from "../ui/FormElements";

export const ESTILOS_DEFAULT = {
  // Tipografía y layout
  fuente:        FUENTES[0],
  fontSize:      11,
  margenKey:     "protocolar",
  interlineado:  INTERLINEADOS[0],

  // Nombres de partes
  nombresFormato:      "titlecase_upper", // "titlecase_both" | "titlecase_upper" | "uppercase"
  // Énfasis (negrita automática)
  nombresNegrita:      true,
  fechaNegrita:        true,
  vehiculoNegrita:     true,
  escribanoNegrita:    true,
  // Subrayado automático en nombres
  nombresSubrayado:    true,
  // Escribano
  escribanoUppercase:  true,
  // Registro
  registroFormato:     "letras", // "letras" | "numero"
  // Visualización
  showVarHighlight:    false,
};

function Toggle({ label, checked, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(26,35,50,.06)" }}>
      <span style={{ fontSize:13, color:C.dark }}>{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        style={{
          width:38, height:20, borderRadius:10, border:"none", cursor:"pointer",
          background: checked ? C.cerulean : "rgba(26,35,50,.2)",
          position:"relative", transition:"background .15s", flexShrink:0,
        }}>
        <span style={{
          position:"absolute", top:2, left: checked ? 20 : 2, width:16, height:16,
          background:"#fff", borderRadius:"50%", transition:"left .15s",
          boxShadow:"0 1px 3px rgba(0,0,0,.2)",
        }}/>
      </button>
    </div>
  );
}

function SecTitle({ children }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, letterSpacing:".07em", textTransform:"uppercase", color:"rgba(26,35,50,.45)", marginTop:18, marginBottom:4 }}>
      {children}
    </div>
  );
}

export function ModalFormato({ estilos: inicial, onApply, onClose }) {
  const [e, setE] = useState({ ...ESTILOS_DEFAULT, ...inicial });
  const upd = (k, v) => setE(prev => ({ ...prev, [k]: v }));

  const sel = { ...inp, padding: "6px 9px" };

  function aplicar() { onApply(e); onClose(); }

  return (
    <Modal title="Formato del documento" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn primary onClick={aplicar}>Aplicar</Btn></>}>
      <div style={{ maxHeight:"65vh", overflowY:"auto", paddingRight:4 }}>

        <SecTitle>Tipografía y márgenes</SecTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Fg label="Fuente">
            <select value={e.fuente.key} onChange={ev => upd("fuente", FUENTES.find(x => x.key === ev.target.value))} style={sel}>
              {FUENTES.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
          </Fg>
          <Fg label="Tamaño (pt)">
            <select value={e.fontSize} onChange={ev => upd("fontSize", Number(ev.target.value))} style={sel}>
              {[8,9,10,11,12,13,14].map(s => <option key={s}>{s}</option>)}
            </select>
          </Fg>
          <Fg label="Márgenes">
            <select value={e.margenKey} onChange={ev => upd("margenKey", ev.target.value)} style={sel}>
              <option value="protocolar">Protocolar</option>
              <option value="noprotocolar">No protocolar</option>
            </select>
          </Fg>
          <Fg label="Interlineado">
            <select value={e.interlineado.key} onChange={ev => upd("interlineado", INTERLINEADOS.find(x => x.key === ev.target.value))} style={sel}>
              {INTERLINEADOS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
            </select>
          </Fg>
        </div>

        <SecTitle>Nombres de partes</SecTitle>
        <div style={{ display:"flex", gap:6, marginBottom:4 }}>
          {[
            ["titlecase_both",  "Nombre Apellido"],
            ["titlecase_upper", "Nombre APELLIDO"],
            ["uppercase",       "NOMBRE APELLIDO"],
          ].map(([k,l]) => (
            <button key={k} type="button" onClick={() => upd("nombresFormato", k)}
              style={{
                flex:1, padding:"8px 4px", borderRadius:7, border:"1px solid",
                borderColor: e.nombresFormato === k ? C.cerulean : "rgba(26,35,50,.15)",
                background: e.nombresFormato === k ? C.ceruleanLight : "transparent",
                color: e.nombresFormato === k ? C.cerulean : C.dark,
                fontFamily:"'Montserrat',sans-serif", fontWeight:700, fontSize:11, cursor:"pointer",
              }}>{l}</button>
          ))}
        </div>
        <Toggle label="Nombres en negrita" checked={e.nombresNegrita} onChange={v => upd("nombresNegrita", v)}/>
        <Toggle label="Nombres subrayados" checked={e.nombresSubrayado} onChange={v => upd("nombresSubrayado", v)}/>

        <SecTitle>Escribano</SecTitle>
        <Toggle label="Nombre en mayúsculas" checked={e.escribanoUppercase} onChange={v => upd("escribanoUppercase", v)}/>
        <Toggle label="Nombre en negrita" checked={e.escribanoNegrita} onChange={v => upd("escribanoNegrita", v)}/>
        <div style={{ marginTop:10 }}>
          <Fg label="Número de registro">
            <div style={{ display:"flex", gap:8 }}>
              {[["letras","En letras (ochocientos...)"],["numero","En número (853)"]].map(([k,l]) => (
                <button key={k} type="button" onClick={() => upd("registroFormato", k)}
                  style={{
                    flex:1, padding:"6px 8px", borderRadius:7, border:"1px solid",
                    borderColor: e.registroFormato === k ? C.cerulean : "rgba(26,35,50,.15)",
                    background: e.registroFormato === k ? C.ceruleanLight : "transparent",
                    color: e.registroFormato === k ? C.cerulean : C.dark,
                    fontFamily:"'Montserrat',sans-serif", fontWeight:600, fontSize:11, cursor:"pointer",
                  }}>{l}</button>
              ))}
            </div>
          </Fg>
        </div>

        <SecTitle>Énfasis automático</SecTitle>
        <Toggle label="Fecha en negrita (TRES días de JUNIO...)" checked={e.fechaNegrita} onChange={v => upd("fechaNegrita", v)}/>
        <Toggle label="Datos del vehículo en negrita" checked={e.vehiculoNegrita} onChange={v => upd("vehiculoNegrita", v)}/>

        <SecTitle>Visualización</SecTitle>
        <Toggle label="Marcar variables faltantes en rojo" checked={e.showVarHighlight} onChange={v => upd("showVarHighlight", v)}/>

      </div>
    </Modal>
  );
}
