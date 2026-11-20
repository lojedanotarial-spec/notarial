import { useState, useEffect } from "react";
import { C, DEPARTAMENTOS, MESES_LABEL, inp } from "../../constants";
import { diaLetras, anioLetras } from "../../utils";
import { useAuth, ordenarMiembros } from "../../context/AuthContext";
import { supabase } from "../../supabase";
import { Modal } from "../Modal";
import { Btn }   from "../ui/Btn";
import { Fg, Warn } from "../ui/FormElements";

import { nombreDeMiembro, escribanoDesdeMiembro } from "../../utils/escribano";
import { ETIQUETA_CLASE, plantillaDefine } from "../../utils/protocolo";
export function ModalEscribano({ escribano, onApply, onClose }) {
  const { miembros: ctxMiembros, registroActivo } = useAuth();
  const [miembros, setMiembros] = useState(ctxMiembros);
  const [sel, setSel] = useState(() => {
    const idx = ctxMiembros.findIndex(e => e.nombre === escribano.nombre);
    return idx >= 0 ? idx : 0;
  });

  // Si el contexto no tiene miembros cargados (admin que abrió el editor
  // sin pasar por AdminScreen), hacer el fetch directamente.
  useEffect(() => {
    if (ctxMiembros.length > 0) { setMiembros(ctxMiembros); return; }
    if (!registroActivo) return;
    supabase
      .from("registros")
      .select("*")
      .eq("registro", registroActivo)
      .then(({ data }) => {
        if (data?.length) {
          const ordenados = ordenarMiembros(data);
          setMiembros(ordenados);
          const idx = ordenados.findIndex(e => e.nombre === escribano.nombre);
          setSel(idx >= 0 ? idx : 0);
        }
      });
  }, [ctxMiembros, registroActivo]);

  function aplicar() {
    const m = miembros[sel];
    if (!m) return;
    onApply(escribanoDesdeMiembro(m));
    onClose();
  }

  return (
    <Modal title="Escribano / Notario" onClose={onClose}
           footer={<><Btn onClick={onClose}>Cancelar</Btn>
                      <Btn primary onClick={aplicar}>Aplicar</Btn></>}>
      {miembros.map((m, i) => {
        const nombre = nombreDeMiembro(m);
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
              color: sel === i ? "#FDFCFA" : C.cerulean,
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
    </Modal>
  );
}

// Opción de Protocolo con radio real (teclado y lector de pantalla funcionan solos).
function OpcionProtocolo({ name, value, elegido, onElegir, titulo, detalle }) {
  const on = elegido === value;
  return (
    <label style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", borderRadius:8, cursor:"pointer",
                    border:"1px solid " + (on ? C.cerulean : C.borderStrong), background: on ? C.ceruleanLight : C.porcelain }}>
      <input type="radio" name={name} value={value} checked={on} onChange={() => onElegir(value)}
             style={{ marginTop:2, accentColor: C.cerulean }} />
      <span style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <span style={{ fontSize:13, fontWeight:600, color:C.dark }}>{titulo}</span>
        <span style={{ fontSize:12, color:C.faint }}>{detalle}</span>
      </span>
    </label>
  );
}

// clase: "P" | "NP" | null (según la plantilla). catalogo: { nombre, clase_defecto, fundamento } | null.
export function ModalProtocolo({ protocolo, onApply, onClose, clase = null, catalogo = null, onClase }) {
  const [d, setD] = useState({ ...protocolo });
  const upd = (f, v) => setD(x => ({ ...x, [f]: v }));
  const define = plantillaDefine(catalogo?.clase_defecto);
  // "" = según la plantilla; null = sin elegir (solo cuando la plantilla admite las dos formas).
  const [eleccion, setEleccion] = useState(clase === "P" || clase === "NP" ? clase : (define ? "" : null));
  const resultado = eleccion === "" ? catalogo?.clase_defecto : eleccion;
  const textoResultado = ETIQUETA_CLASE[resultado] || ETIQUETA_CLASE.sin_definir;

  function aplicar() {
    onApply(d);
    onClase?.(eleccion === "P" || eleccion === "NP" ? eleccion : null);
    onClose();
  }

  return (
    <Modal title="Protocolo" onClose={onClose}
           footer={<>
             <span aria-live="polite" style={{ marginRight:"auto", alignSelf:"center", fontSize:12, color:C.faint }}>
               En el Explorador va a figurar como: <b style={{ color:C.dark }}>{textoResultado}</b>
             </span>
             <Btn onClick={onClose}>Cancelar</Btn>
             <Btn primary onClick={aplicar}>Aplicar</Btn></>}>
      <fieldset style={{ margin:0, padding:"12px 14px 14px", border:"1px solid " + C.ceruleanMid, borderRadius:12,
                         display:"flex", flexDirection:"column", gap:8 }}>
        <legend style={{ padding:"0 6px", fontSize:12, fontWeight:600, color:C.dark }}>¿Protocolar o extraprotocolar?</legend>
        {define ? (
          <OpcionProtocolo name="clase" value="" elegido={eleccion} onElegir={setEleccion}
            titulo={"Según la plantilla: " + ETIQUETA_CLASE[catalogo.clase_defecto]}
            detalle={[catalogo.nombre, catalogo.fundamento].filter(Boolean).join(" · ") + ". Es lo que corresponde casi siempre."} />
        ) : (
          <Warn>
            {catalogo
              ? "Esta plantilla admite las dos formas" + (catalogo.fundamento ? " (" + catalogo.fundamento + ")" : "") + ". Elegí cómo vas a hacer este documento."
              : "Elegí cómo vas a hacer este documento."}{" "}
            Si no elegís, en el Explorador queda «Sin definir».
          </Warn>
        )}
        <OpcionProtocolo name="clase" value="P" elegido={eleccion} onElegir={setEleccion}
          titulo="Protocolar" detalle={define ? "Solo si este documento en particular se hace en el protocolo." : "Se extiende en el protocolo y queda como matriz."} />
        <OpcionProtocolo name="clase" value="NP" elegido={eleccion} onElegir={setEleccion}
          titulo="Extraprotocolar" detalle={define ? "Lo mismo que la plantilla, pero elegido a mano." : "Se entrega en original; en la escribanía queda la copia de trabajo."} />
      </fieldset>
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
            fontFamily:"'Inter', sans-serif", whiteSpace:"nowrap", cursor:"pointer",
          }}>
            ↺ Hoy
          </button>
        </div>
        <div style={{ fontSize:11, color:C.faint, marginTop:5 }}>→ {preview}</div>
      </Fg>
    </Modal>
  );
}
