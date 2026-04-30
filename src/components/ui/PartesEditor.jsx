import { useState, useEffect, useRef } from "react";
import { C, DEPARTAMENTOS, PARTE_VACIA, inp } from "../../constants";
import { Fg } from "./FormElements";
import { Btn } from "./Btn";
import { supabase } from "../../supabase";
import { useAuth } from "../../context/AuthContext";

const fmtDni = (v) => {
  if (!v) return "";
  const n = Number(String(v).replace(/\D/g, ""));
  return isNaN(n) ? "" : n.toLocaleString("es-AR");
};

const REPR_TIPOS = [
  { key: "pj_representante", label: "Representante de persona jurídica" },
  { key: "pj_apoderado",     label: "Apoderado de persona jurídica" },
  { key: "pf_apoderado",     label: "Apoderado de persona física" },
];

const REPR_VACIA = () => ({
  id: Date.now() + Math.random(),
  tipo: "pj_representante",
  razon_social: "", cuit_sociedad: "", caracter: "", documentacion: "",
  repr_nombre: "", repr_apellido: "", repr_dni: "",
  poder_escritura: "", poder_fecha: "", poder_escribano: "", poder_registro: "",
});

function ConfirmQuitarParte({ nombre, onConfirm, onCancel }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(26,35,50,.5)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{
        background:"#fff", borderRadius:12, padding:"24px 24px 18px",
        width:320, boxShadow:"0 8px 32px rgba(26,35,50,.18)",
      }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.dark, marginBottom:8 }}>
          Quitar parte
        </div>
        <div style={{ fontSize:13, color:"rgba(26,35,50,.6)", marginBottom:20, lineHeight:1.5 }}>
          ¿Confirmás que querés quitar a <strong style={{ color:C.dark }}>{nombre || "esta parte"}</strong> del documento?
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel}
                  style={{ padding:"7px 16px", borderRadius:7, border:"1px solid rgba(26,35,50,.14)",
                           background:"transparent", fontSize:13, fontWeight:600, color:C.dark,
                           cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
                  style={{ padding:"7px 16px", borderRadius:7, border:"1px solid #e07070",
                           background:"#fdf0f0", fontSize:13, fontWeight:700, color:"#c0392b",
                           cursor:"pointer", fontFamily:"'Montserrat',sans-serif" }}>
            Quitar
          </button>
        </div>
      </div>
    </div>
  );
}

function BuscadorDNI({ registroNumero, onSelect }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const q = query.replace(/\D/g, "");
    if (q.length < 3) { setResultados([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      const { data } = await supabase
        .from("personas")
        .select("*")
        .eq("registro_id", registroNumero)
        .ilike("nro_doc", "%" + q + "%")
        .limit(5);
      setResultados(data || []);
      setBuscando(false);
    }, 300);
  }, [query, registroNumero]);

  return (
    <div style={{ position:"relative", marginBottom:14 }}>
      <div style={{ position:"relative" }}>
        <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
             width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="rgba(26,35,50,.4)" strokeWidth="1.5">
          <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3" strokeLinecap="round"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por DNI en el directorio..."
          style={{ ...inp, paddingLeft:30 }}
        />
        {buscando && (
          <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                         fontSize:11, color:C.muted }}>buscando...</span>
        )}
      </div>
      {resultados.length > 0 && (
        <div style={{
          position:"absolute", top:"100%", left:0, right:0, zIndex:50,
          background:"#fff", border:"1px solid " + C.border,
          borderRadius:8, boxShadow:"0 4px 16px rgba(26,35,50,.12)",
          overflow:"hidden", marginTop:4,
        }}>
          {resultados.map(p => (
            <div key={p.id}
              onClick={() => { onSelect(p); setQuery(""); setResultados([]); }}
              onMouseEnter={e => e.currentTarget.style.background = C.ceruleanLight}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              style={{ padding:"9px 12px", cursor:"pointer", transition:"background .1s" }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.dark }}>
                {p.apellido}, {p.nombre}
              </div>
              <div style={{ fontSize:11, color:C.muted }}>
                DNI {fmtDni(p.nro_doc)} · {p.nacionalidad}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormRepresentacion({ repr, onChange, onQuitar }) {
  const upd = (f, v) => onChange({ ...repr, [f]: v });
  const esPJ = repr.tipo === "pj_representante" || repr.tipo === "pj_apoderado";
  const esPF = repr.tipo === "pf_apoderado";

  return (
    <div style={{
      border:"1px solid rgba(58,124,165,.2)", borderRadius:8,
      padding:12, marginBottom:10, background:"rgba(58,124,165,.03)",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <select value={repr.tipo} onChange={e => upd("tipo", e.target.value)}
                style={{ ...inp, width:"auto", fontSize:12, fontWeight:600, color:C.cerulean }}>
          {REPR_TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <button onClick={onQuitar}
                style={{ background:"none", border:"none", cursor:"pointer",
                         color:"rgba(26,35,50,.35)", fontSize:18, lineHeight:1, padding:"0 4px" }}
                onMouseEnter={e => e.currentTarget.style.color = "#c0392b"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(26,35,50,.35)"}>×</button>
      </div>

      {esPJ && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <Fg label="Razón social">
            <input style={inp} value={repr.razon_social}
                   onChange={e => upd("razon_social", e.target.value)} placeholder="ej: VEXTER S.A."/>
          </Fg>
          <Fg label="CUIT sociedad">
            <input style={inp} value={repr.cuit_sociedad}
                   onChange={e => upd("cuit_sociedad", e.target.value)} placeholder="xx-xxxxxxxx-x"/>
          </Fg>
          <Fg label="Carácter">
            <input style={inp} value={repr.caracter}
                   onChange={e => upd("caracter", e.target.value.toUpperCase())}
                   placeholder="ej: PRESIDENTE"/>
          </Fg>
          <Fg label="Documentación">
            <input style={inp} value={repr.documentacion}
                   onChange={e => upd("documentacion", e.target.value)}
                   placeholder="actas, escrituras que acreditan"/>
          </Fg>
        </div>
      )}

      {esPF && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 }}>
            <Fg label="Apellido del representado">
              <input style={inp} value={repr.repr_apellido}
                     onChange={e => upd("repr_apellido", e.target.value.toUpperCase())}/>
            </Fg>
            <Fg label="Nombre del representado">
              <input style={inp} value={repr.repr_nombre}
                     onChange={e => upd("repr_nombre", e.target.value.toUpperCase())}/>
            </Fg>
            <Fg label="DNI del representado">
              <input style={inp} value={repr.repr_dni}
                     onChange={e => upd("repr_dni", e.target.value.replace(/\D/g,""))}/>
            </Fg>
          </div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:".05em",
                        textTransform:"uppercase", color:C.muted, marginBottom:6 }}>
            Poder notarial
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
            <Fg label="N° escritura">
              <input style={inp} value={repr.poder_escritura}
                     onChange={e => upd("poder_escritura", e.target.value)}/>
            </Fg>
            <Fg label="Fecha">
              <input style={inp} value={repr.poder_fecha}
                     onChange={e => upd("poder_fecha", e.target.value)} placeholder="dd/mm/aaaa"/>
            </Fg>
            <Fg label="Escribano">
              <input style={inp} value={repr.poder_escribano}
                     onChange={e => upd("poder_escribano", e.target.value)}/>
            </Fg>
            <Fg label="Registro">
              <input style={inp} value={repr.poder_registro}
                     onChange={e => upd("poder_registro", e.target.value)}/>
            </Fg>
          </div>
        </>
      )}
    </div>
  );
}

export function PartesEditor({ partes, onChange, showRol = true }) {
  const { usuario } = useAuth();
  const registroNumero = usuario?.registro_numero;
  const [openId, setOpenId] = useState(partes[0]?.id ?? null);
  const [confirmQuitar, setConfirmQuitar] = useState(null);
  const [hoverQuitar, setHoverQuitar] = useState(null);

  const upd = (id, fields) => onChange(partes.map(p => p.id === id ? { ...p, ...fields } : p));

  const agregar = () => {
    const n = PARTE_VACIA();
    onChange([...partes, n]);
    setOpenId(n.id);
  };

  const quitar = (id) => {
    const next = partes.filter(p => p.id !== id);
    onChange(next.length > 0 ? next : [PARTE_VACIA()]);
    setOpenId(next[0]?.id ?? null);
    setConfirmQuitar(null);
  };

  function cargarDesdeCRM(persona) {
    if (!openId) return;
    upd(openId, {
      apellido:         persona.apellido      || "",
      nombre:           persona.nombre        || "",
      genero:           persona.genero        || "F",
      nacionalidad:     persona.nacionalidad  || "",
      tipoDoc:          persona.tipo_doc      || "DNI",
      nroDoc:           persona.nro_doc       || "",
      cuit:             persona.cuit          || "",
      fechaNac:         persona.fecha_nac     || "",
      estadoCivil:      persona.estado_civil  || "",
      calle:            persona.calle         || "",
      numero:           persona.numero        || "",
      piso:             persona.piso          || "",
      dpto:             persona.dpto          || "",
      localidad:        persona.localidad     || "",
      departamento:     persona.departamento  || "Ciudad",
      representaciones: persona.representaciones || [],
      _personaId:       persona.id,
    });
  }

  const EC_F = ["soltera","casada","divorciada","viuda","separada de hecho"];
  const EC_M = ["soltero","casado","divorciado","viudo","separado de hecho"];
  const p = partes.find(x => x.id === openId);

  return (
    <>
      <div style={{ display:"flex", gap:12, minHeight:420 }}>
        {/* COLUMNA IZQUIERDA */}
        <div style={{ width:175, flexShrink:0, display:"flex", flexDirection:"column", gap:7 }}>
          {partes.map((x, idx) => {
            const ini = ((x.apellido?.[0] || "?") + (x.nombre?.[0] || "")).toUpperCase();
            const activo = openId === x.id;
            const hovering = hoverQuitar === x.id;
            return (
              <div key={x.id}
                style={{ position:"relative" }}
                onMouseEnter={() => setHoverQuitar(x.id)}
                onMouseLeave={() => setHoverQuitar(null)}
              >
                <div onClick={() => setOpenId(x.id)}
                  style={{
                    display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
                    paddingRight: 32, borderRadius:8, cursor:"pointer",
                    background: activo ? C.ceruleanLight : C.porcelain,
                    border:"1px solid " + (activo ? C.cerulean : "rgba(26,35,50,.1)"),
                  }}>
                  <div style={{
                    width:26, height:26, borderRadius:"50%", flexShrink:0,
                    background: activo ? C.cerulean : C.ceruleanLight,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:9, fontWeight:700, color: activo ? "#fff" : "#1f4862",
                  }}>{ini}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.dark,
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {x.apellido || "Parte " + (idx + 1)}
                    </div>
                    {showRol && (
                      <div style={{ fontSize:10, color:"rgba(26,35,50,.6)" }}>{x.rol || "sin rol"}</div>
                    )}
                  </div>
                </div>
                {(
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmQuitar(x); }}
                    title="Quitar parte"
                    style={{
                      position:"absolute", right:6, top:"50%", transform:"translateY(-50%)",
                      width:20, height:20, borderRadius:4,
                      background: hovering ? "#fdf0f0" : "transparent",
                      border: hovering ? "1px solid #e07070" : "1px solid transparent",
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                      opacity: hovering ? 1 : 0, transition:"opacity .15s",
                      padding:0,
                    }}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#c0392b" strokeWidth="1.6">
                      <path d="M3 5h10M6 5V3h4v2M6 8v5M10 8v5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          <button onClick={agregar}
            style={{
              padding:"7px 10px", border:"1px dashed rgba(26,35,50,.2)", borderRadius:8,
              fontSize:13, color:C.dark, background:"transparent",
              fontFamily:"'Montserrat',sans-serif", cursor:"pointer", textAlign:"center",
            }}>
            + Agregar
          </button>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ flex:1, overflowY:"auto", paddingRight:4 }}>
          {p ? (
            <>
              <BuscadorDNI registroNumero={registroNumero} onSelect={cargarDesdeCRM} />

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <Fg label="Apellido">
                  <input style={inp} value={p.apellido}
                    onChange={e => upd(p.id, { apellido: e.target.value.toUpperCase() })}
                    placeholder="ingrese apellido/s"/>
                </Fg>
                <Fg label="Nombre/s">
                  <input style={inp} value={p.nombre}
                    onChange={e => upd(p.id, { nombre: e.target.value.toUpperCase() })}
                    placeholder="ingrese nombre/s"/>
                </Fg>
                <Fg label="Genero">
                  <select style={inp} value={p.genero} onChange={e => {
                    const g = e.target.value;
                    const fields = { genero: g, estadoCivil: g === "F" ? "soltera" : "soltero" };
                    if (p.nacionalidad === "argentina" || p.nacionalidad === "argentino") {
                      fields.nacionalidad = g === "F" ? "argentina" : "argentino";
                    }
                    upd(p.id, fields);
                  }}>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                  </select>
                </Fg>
                <Fg label="Estado civil">
                  <select style={inp} value={p.estadoCivil}
                    onChange={e => upd(p.id, { estadoCivil: e.target.value })}>
                    {(p.genero === "F" ? EC_F : EC_M).map(ec => <option key={ec}>{ec}</option>)}
                  </select>
                </Fg>
                <Fg label="Nacionalidad">
                  <input style={inp} value={p.nacionalidad}
                    onChange={e => upd(p.id, { nacionalidad: e.target.value })}
                    placeholder="ej: argentina"/>
                </Fg>
                <Fg label="Tipo doc.">
                  <select style={inp} value={p.tipoDoc}
                    onChange={e => upd(p.id, { tipoDoc: e.target.value })}>
                    <option>DNI</option><option>LE</option><option>LC</option><option>Pasaporte</option>
                  </select>
                </Fg>
                <Fg label="N° documento">
                  <input style={inp}
                    value={fmtDni(p.nroDoc)}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                      const fields = { nroDoc: v };
                      if (p.cuit) {
                        const parts = p.cuit.split("-");
                        if (parts.length === 3) fields.cuit = parts[0] + "-" + v + "-" + parts[2];
                      }
                      upd(p.id, fields);
                    }}
                    placeholder="ej: 31.645.431"/>
                </Fg>
                <Fg label="CUIT / CUIL">
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input style={{ ...inp, width:52, textAlign:"center" }}
                      value={p.cuit ? p.cuit.split("-")[0] || "" : ""}
                      maxLength={2} placeholder="20"
                      onChange={e => {
                        const pre = e.target.value.replace(/\D/g,"").slice(0,2);
                        const mid = String(p.nroDoc || "").replace(/\D/g,"");
                        const suf = p.cuit ? p.cuit.split("-")[2] || "" : "";
                        upd(p.id, { cuit: pre + "-" + mid + "-" + suf });
                      }}/>
                    <span style={{ color:C.dark, fontSize:13, flexShrink:0 }}>-</span>
                    <input style={{ ...inp, flex:1, textAlign:"center" }}
                      value={fmtDni(p.nroDoc)} readOnly tabIndex={-1} placeholder="se copia del DNI"/>
                    <span style={{ color:C.dark, fontSize:13, flexShrink:0 }}>-</span>
                    <input style={{ ...inp, width:44, textAlign:"center" }}
                      value={p.cuit ? p.cuit.split("-")[2] || "" : ""}
                      maxLength={1} placeholder="0"
                      onChange={e => {
                        const pre = p.cuit ? p.cuit.split("-")[0] || "" : "";
                        const mid = String(p.nroDoc || "").replace(/\D/g,"");
                        const suf = e.target.value.replace(/\D/g,"").slice(0,1);
                        upd(p.id, { cuit: pre + "-" + mid + "-" + suf });
                      }}/>
                  </div>
                </Fg>
                <Fg label="Fecha de nacimiento">
                  <input style={inp} value={p.fechaNac}
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g,"").slice(0,8);
                      if (v.length >= 5) v = v.slice(0,2) + "/" + v.slice(2,4) + "/" + v.slice(4);
                      else if (v.length >= 3) v = v.slice(0,2) + "/" + v.slice(2);
                      upd(p.id, { fechaNac: v });
                    }}
                    placeholder="dd/mm/aaaa" maxLength={10}/>
                </Fg>
                {showRol && (
                  <Fg label="Rol en el acto">
                    <input style={inp} value={p.rol}
                      onChange={e => upd(p.id, { rol: e.target.value.toUpperCase() })}
                      placeholder="ej: COMPRADORA"/>
                  </Fg>
                )}
                <Fg label="Calle">
                  <input style={inp} value={p.calle}
                    onChange={e => upd(p.id, { calle: e.target.value })} placeholder="ingrese calle"/>
                </Fg>
                <Fg label="Numero">
                  <input style={inp} value={p.numero}
                    onChange={e => upd(p.id, { numero: e.target.value })} placeholder="nro"/>
                </Fg>
                <Fg label="Piso">
                  <input style={inp} value={p.piso}
                    onChange={e => upd(p.id, { piso: e.target.value })}/>
                </Fg>
                <Fg label="Depto.">
                  <input style={inp} value={p.dpto}
                    onChange={e => upd(p.id, { dpto: e.target.value })}/>
                </Fg>
                <Fg label="Localidad">
                  <input style={inp} value={p.localidad}
                    onChange={e => upd(p.id, { localidad: e.target.value })} placeholder="ej: Dorrego"/>
                </Fg>
                <Fg label="Departamento Mendoza">
                  <select style={inp} value={p.departamento}
                    onChange={e => upd(p.id, { departamento: e.target.value })}>
                    {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </Fg>
              </div>

              <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid rgba(26,35,50,.08)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:11, fontWeight:700, letterSpacing:".06em",
                                 textTransform:"uppercase", color:C.muted }}>
                    Representaciones
                  </span>
                  <button
                    onClick={() => upd(p.id, { representaciones: [...(p.representaciones || []), REPR_VACIA()] })}
                    style={{
                      fontSize:11, fontWeight:600, color:C.cerulean,
                      background:"none", border:"1px solid rgba(58,124,165,.3)",
                      borderRadius:6, padding:"3px 10px", cursor:"pointer",
                      fontFamily:"'Montserrat',sans-serif",
                    }}>
                    + Agregar
                  </button>
                </div>

                {(p.representaciones || []).length === 0 ? (
                  <div style={{ fontSize:12, color:C.muted, fontStyle:"italic" }}>
                    Firma por sí — sin representaciones
                  </div>
                ) : (
                  (p.representaciones || []).map(r => (
                    <FormRepresentacion
                      key={r.id}
                      repr={r}
                      onChange={updated => upd(p.id, {
                        representaciones: p.representaciones.map(x => x.id === r.id ? updated : x)
                      })}
                      onQuitar={() => upd(p.id, {
                        representaciones: p.representaciones.filter(x => x.id !== r.id)
                      })}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                          height:"100%", color:C.dark, fontSize:13 }}>
              Selecciona una parte
            </div>
          )}
        </div>
      </div>

      {confirmQuitar && (
        <ConfirmQuitarParte
          nombre={confirmQuitar.apellido || confirmQuitar.nombre}
          onConfirm={() => quitar(confirmQuitar.id)}
          onCancel={() => setConfirmQuitar(null)}
        />
      )}
    </>
  );
}

export async function guardarPartesEnCRM(partes, registroNumero) {
  for (const p of partes) {
    if (!p.apellido && !p.nroDoc) continue;
    const payload = {
      registro_id:      registroNumero,
      apellido:         p.apellido      || "",
      nombre:           p.nombre        || "",
      genero:           p.genero        || "F",
      nacionalidad:     p.nacionalidad  || "",
      tipo_doc:         p.tipoDoc       || "DNI",
      nro_doc:          p.nroDoc        || "",
      cuit:             p.cuit          || "",
      fecha_nac:        p.fechaNac      || "",
      estado_civil:     p.estadoCivil   || "",
      calle:            p.calle         || "",
      numero:           p.numero        || "",
      piso:             p.piso          || "",
      dpto:             p.dpto          || "",
      localidad:        p.localidad     || "",
      departamento:     p.departamento  || "",
      representaciones: p.representaciones || [],
      updated_at:       new Date().toISOString(),
    };
    if (p._personaId) {
      await supabase.from("personas").update(payload).eq("id", p._personaId);
    } else {
      await supabase.from("personas").insert({ ...payload, created_at: new Date().toISOString() });
    }
  }
}
