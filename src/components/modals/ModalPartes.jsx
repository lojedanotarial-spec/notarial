import { useState } from "react";
import { C, DEPARTAMENTOS, PARTE_VACIA, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn }  from "../ui/Btn";
import { Fg }   from "../ui/FormElements";

const fmtDni = (v) => {
  if (!v) return "";
  const n = Number(String(v).replace(/\D/g, ""));
  return isNaN(n) ? "" : n.toLocaleString("es-AR");
};

export function ModalPartes({ partes, onApply, onClose }) {
  const [draft,  setDraft]  = useState(partes.map(p => ({ ...p })));
  const [openId, setOpenId] = useState(draft[0]?.id ?? null);

  const upd     = (id, f, v) => setDraft(d => d.map(p => p.id === id ? { ...p, [f]: v } : p));
  const agregar = () => { const n = PARTE_VACIA(); setDraft(d => [...d, n]); setOpenId(n.id); };
  const quitar  = (id) => { setDraft(d => d.filter(p => p.id !== id)); setOpenId(draft.find(p => p.id !== id)?.id ?? null); };

  const EC_F = ["soltera","casada","divorciada","viuda","separada de hecho"];
  const EC_M = ["soltero","casado","divorciado","viudo","separado de hecho"];
  const p = draft.find(x => x.id === openId);

  return (
    <Modal title="Partes comparecientes" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={() => { onApply(draft); onClose(); }}>Aplicar al documento</Btn></>}>
      <div style={{ display:"flex", gap:12, minHeight:420 }}>
        <div style={{ width:175, flexShrink:0, display:"flex", flexDirection:"column", gap:7 }}>
          {draft.map((x, idx) => {
            const ini    = ((x.apellido?.[0] || "?") + (x.nombre?.[0] || "")).toUpperCase();
            const activo = openId === x.id;
            return (
              <div key={x.id} onClick={() => setOpenId(x.id)}
                   style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
                            borderRadius:8, cursor:"pointer",
                            background: activo ? C.ceruleanLight : C.porcelain,
                            border:"1px solid " + (activo ? C.cerulean : "rgba(26,35,50,.1)") }}>
                <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0,
                              background: activo ? C.cerulean : C.ceruleanLight,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:9, fontWeight:700, color: activo ? "#fff" : "#1f4862" }}>{ini}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.dark,
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {x.apellido || "Parte " + (idx + 1)}
                  </div>
                  <div style={{ fontSize:10, color:C.muted }}>{x.rol || "sin rol"}</div>
                </div>
              </div>
            );
          })}
          <button onClick={agregar}
                  style={{ padding:"7px 10px", border:"1px dashed rgba(26,35,50,.2)", borderRadius:8,
                           fontSize:13, color:C.muted, background:"transparent",
                           fontFamily:"'Montserrat',sans-serif", cursor:"pointer", textAlign:"center" }}>
            + Agregar
          </button>
        </div>
        <div style={{ flex:1, overflowY:"auto", paddingRight:4 }}>
          {p ? (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Fg label="Apellido"><input style={inp} value={p.apellido} onChange={e => upd(p.id,"apellido",e.target.value.toUpperCase())} placeholder="ingrese apellido/s"/></Fg>
                <Fg label="Nombre/s"><input style={inp} value={p.nombre}   onChange={e => upd(p.id,"nombre",e.target.value.toUpperCase())}   placeholder="ingrese nombre/s"/></Fg>
                <Fg label="Género">
                  <select style={inp} value={p.genero} onChange={e => {
                    upd(p.id, "genero", e.target.value);
                    upd(p.id, "estadoCivil", e.target.value === "F" ? "soltera" : "soltero");
                  }}>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                  </select>
                </Fg>
                <Fg label="Estado civil">
                  <select style={inp} value={p.estadoCivil} onChange={e => upd(p.id,"estadoCivil",e.target.value)}>
                    {(p.genero === "F" ? EC_F : EC_M).map(ec => <option key={ec}>{ec}</option>)}
                  </select>
                </Fg>
                <Fg label="Nacionalidad"><input style={inp} value={p.nacionalidad} onChange={e => upd(p.id,"nacionalidad",e.target.value)} placeholder="ej: argentina"/></Fg>
                <Fg label="Tipo doc.">
                  <select style={inp} value={p.tipoDoc} onChange={e => upd(p.id,"tipoDoc",e.target.value)}>
                    <option>DNI</option><option>LE</option><option>LC</option><option>Pasaporte</option>
                  </select>
                </Fg>
                <Fg label="N° documento">
                  <input style={inp}
                    value={fmtDni(p.nroDoc)}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                      upd(p.id, "nroDoc", v);
                      if (p.cuit) {
                        const partes = p.cuit.split("-");
                        if (partes.length === 3) upd(p.id, "cuit", partes[0] + "-" + v + "-" + partes[2]);
                      }
                    }}
                    placeholder="ej: 31.645.431"/>
                </Fg>
                <Fg label="CUIT / CUIL">
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input
                      style={{ ...inp, width:52, textAlign:"center" }}
                      value={p.cuit ? p.cuit.split("-")[0] || "" : ""}
                      maxLength={2}
                      placeholder="20"
                      onChange={e => {
                        const pre = e.target.value.replace(/\D/g, "").slice(0, 2);
                        const mid = String(p.nroDoc || "").replace(/\D/g, "");
                        const suf = p.cuit ? p.cuit.split("-")[2] || "" : "";
                        upd(p.id, "cuit", pre + "-" + mid + "-" + suf);
                      }}
                    />
                    <span style={{ color:C.muted, fontSize:13, flexShrink:0 }}>-</span>
                    <input
                      style={{ ...inp, flex:1, textAlign:"center" }}
                      value={fmtDni(p.nroDoc)}
                      readOnly
                      tabIndex={-1}
                      placeholder="se copia del DNI"
                    />
                    <span style={{ color:C.muted, fontSize:13, flexShrink:0 }}>-</span>
                    <input
                      style={{ ...inp, width:44, textAlign:"center" }}
                      value={p.cuit ? p.cuit.split("-")[2] || "" : ""}
                      maxLength={1}
                      placeholder="0"
                      onChange={e => {
                        const pre = p.cuit ? p.cuit.split("-")[0] || "" : "";
                        const mid = String(p.nroDoc || "").replace(/\D/g, "");
                        const suf = e.target.value.replace(/\D/g, "").slice(0, 1);
                        upd(p.id, "cuit", pre + "-" + mid + "-" + suf);
                      }}
                    />
                  </div>
                </Fg>
                <Fg label="Fecha de nacimiento">
                  <input
                    style={inp}
                    value={p.fechaNac}
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                      if (v.length >= 5) v = v.slice(0,2) + "/" + v.slice(2,4) + "/" + v.slice(4);
                      else if (v.length >= 3) v = v.slice(0,2) + "/" + v.slice(2);
                      upd(p.id, "fechaNac", v);
                    }}
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                  />
                </Fg>
                <Fg label="Rol en el acto"><input style={inp} value={p.rol} onChange={e => upd(p.id,"rol",e.target.value.toUpperCase())} placeholder="ej: COMPRADORA"/></Fg>
                <Fg label="Calle">  <input style={inp} value={p.calle}    onChange={e => upd(p.id,"calle",e.target.value)}    placeholder="ingrese calle"/></Fg>
                <Fg label="Número"> <input style={inp} value={p.numero}   onChange={e => upd(p.id,"numero",e.target.value)}   placeholder="nº"/></Fg>
                <Fg label="Piso">   <input style={inp} value={p.piso}     onChange={e => upd(p.id,"piso",e.target.value)}/></Fg>
                <Fg label="Depto."> <input style={inp} value={p.dpto}     onChange={e => upd(p.id,"dpto",e.target.value)}/></Fg>
                <Fg label="Localidad"><input style={inp} value={p.localidad} onChange={e => upd(p.id,"localidad",e.target.value)} placeholder="ej: Dorrego"/></Fg>
                <Fg label="Departamento Mendoza">
                  <select style={inp} value={p.departamento} onChange={e => upd(p.id,"departamento",e.target.value)}>
                    {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </Fg>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:14,
                            paddingTop:12, borderTop:"1px solid rgba(26,35,50,.08)" }}>
                <Btn danger onClick={() => quitar(p.id)}>Quitar parte</Btn>
              </div>
            </>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                          height:"100%", color:C.muted, fontSize:13 }}>
              Seleccioná una parte
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
