import { useState } from "react";
import { C, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { Fg } from "../ui/FormElements";

const VEHICULO_VACIO = () => ({
  id: Date.now() + Math.random(),
  tipo_vehiculo: "VEHÍCULO",
  marca: "",
  modelo: "",
  tipo_desc: "",
  dominio: "",
  chasis: "",
  motor: "",
});

function ConfirmQuitar({ nombre, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(26,35,50,.5)", zIndex:1000,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.porcelain, borderRadius:12, padding:"24px 24px 18px",
                    width:300, boxShadow:"0 8px 32px rgba(26,35,50,.18)" }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.dark, marginBottom:8 }}>Quitar vehículo</div>
        <div style={{ fontSize:13, color:"rgba(26,35,50,.6)", marginBottom:20, lineHeight:1.5 }}>
          ¿Confirmás que querés quitar <strong>{nombre || "este vehículo"}</strong>?
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid rgba(26,35,50,.14)",
                   background:"transparent", fontSize:13, fontWeight:600, color:C.dark, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={{ padding:"7px 16px", borderRadius:7, border:"1px solid #e07070",
                   background:"#fdf0f0", fontSize:13, fontWeight:700, color:"#c0392b", cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
            Quitar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalVehiculos({ vehiculos, onApply, onClose }) {
  const [draft, setDraft] = useState(vehiculos.length ? vehiculos.map(v => ({ ...v })) : [VEHICULO_VACIO()]);
  const [openId, setOpenId] = useState(draft[0]?.id ?? null);
  const [confirmQuitar, setConfirmQuitar] = useState(null);
  const [hoverQuitar, setHoverQuitar] = useState(null);

  const upd = (id, fields) => setDraft(prev => prev.map(v => v.id === id ? { ...v, ...fields } : v));
  const agregar = () => { const n = VEHICULO_VACIO(); setDraft(prev => [...prev, n]); setOpenId(n.id); };
  const quitar = (id) => {
    const next = draft.filter(v => v.id !== id);
    setDraft(next.length ? next : [VEHICULO_VACIO()]);
    setOpenId(next[0]?.id ?? null);
    setConfirmQuitar(null);
  };

  const v = draft.find(x => x.id === openId);

  return (
    <Modal title="Vehículos" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn primary onClick={() => { onApply(draft); onClose(); }}>Guardar</Btn></>}>
      <div style={{ display:"flex", gap:12, minHeight:340 }}>

        {/* LISTA IZQUIERDA */}
        <div style={{ width:165, flexShrink:0, display:"flex", flexDirection:"column", gap:7 }}>
          {draft.map((x, idx) => {
            const activo = openId === x.id;
            const label = x.dominio || x.marca || `Vehículo ${idx + 1}`;
            const sub = x.marca && x.modelo ? `${x.marca} ${x.modelo}` : x.tipo_vehiculo || "—";
            return (
              <div key={x.id} style={{ position:"relative" }}
                   onMouseEnter={() => setHoverQuitar(x.id)}
                   onMouseLeave={() => setHoverQuitar(null)}>
                <div onClick={() => setOpenId(x.id)} style={{
                  display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
                  paddingRight:32, borderRadius:8, cursor:"pointer",
                  background: activo ? C.ceruleanLight : C.porcelain,
                  border:"1px solid " + (activo ? C.cerulean : "rgba(26,35,50,.1)"),
                }}>
                  <div style={{
                    width:26, height:26, borderRadius:"50%", flexShrink:0,
                    background: activo ? C.cerulean : C.ceruleanLight,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:9, fontWeight:700, color: activo ? "#FDFCFA" : C.cerulean,
                  }}>🚗</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.dark,
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</div>
                    <div style={{ fontSize:10, color:C.muted,
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub}</div>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); setConfirmQuitar(x); }}
                  style={{
                    position:"absolute", right:6, top:"50%", transform:"translateY(-50%)",
                    width:20, height:20, borderRadius:4,
                    background: hoverQuitar === x.id ? "#fdf0f0" : "transparent",
                    border: hoverQuitar === x.id ? "1px solid #e07070" : "1px solid transparent",
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                    opacity: hoverQuitar === x.id ? 1 : 0, transition:"opacity .15s", padding:0,
                  }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </button>
              </div>
            );
          })}
          <button onClick={agregar} style={{
            padding:"7px 10px", border:"1px dashed rgba(26,35,50,.2)", borderRadius:8,
            fontSize:13, color:C.dark, background:"transparent",
            fontFamily:"'Inter',sans-serif", cursor:"pointer", textAlign:"center",
          }}>+ Agregar</button>
        </div>

        {/* FORMULARIO DERECHA */}
        <div style={{ flex:1, overflowY:"auto", paddingRight:4 }}>
          {v && (
            <>
              <Fg label="Tipo">
                <select style={inp} value={v.tipo_vehiculo}
                  onChange={e => upd(v.id, { tipo_vehiculo: e.target.value })}>
                  <option value="VEHÍCULO">Vehículo</option>
                  <option value="MOTOVEHÍCULO">Motovehículo</option>
                </select>
              </Fg>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <Fg label="Marca">
                  <input style={inp} value={v.marca}
                    onChange={e => upd(v.id, { marca: e.target.value.toUpperCase() })}
                    placeholder="VOLKSWAGEN"/>
                </Fg>
                <Fg label="Modelo">
                  <input style={inp} value={v.modelo}
                    onChange={e => upd(v.id, { modelo: e.target.value.toUpperCase() })}
                    placeholder="GOL TREND 1.6"/>
                </Fg>
                <Fg label="Tipo / carrocería">
                  <input style={inp} value={v.tipo_desc}
                    onChange={e => upd(v.id, { tipo_desc: e.target.value.toUpperCase() })}
                    placeholder="SEDAN 5 PUERTAS"/>
                </Fg>
                <Fg label="Dominio (patente)">
                  <input style={inp} value={v.dominio}
                    onChange={e => upd(v.id, { dominio: e.target.value.toUpperCase().replace(/\s/g,"") })}
                    placeholder="ABC123"/>
                </Fg>
                <Fg label="N° de chasis">
                  <input style={inp} value={v.chasis}
                    onChange={e => upd(v.id, { chasis: e.target.value.toUpperCase() })}
                    placeholder="9BWAB45U6AT166062"/>
                </Fg>
                <Fg label="N° de motor">
                  <input style={inp} value={v.motor}
                    onChange={e => upd(v.id, { motor: e.target.value.toUpperCase() })}
                    placeholder="CFZ732571"/>
                </Fg>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmQuitar && (
        <ConfirmQuitar
          nombre={confirmQuitar.dominio || confirmQuitar.marca}
          onConfirm={() => quitar(confirmQuitar.id)}
          onCancel={() => setConfirmQuitar(null)}
        />
      )}
    </Modal>
  );
}
