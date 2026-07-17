import { useState } from "react";
import { C, inp, DEPARTAMENTOS, MESES_LABEL } from "../../constants";
import { numeroALetras } from "../../utils.js";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { Fg } from "../ui/FormElements";
import { InputDecimal } from "../ui/Masked";

const RUMBOS = ["Norte", "Sur", "Este", "Oeste", "Noreste", "Noroeste", "Sureste", "Suroeste"];
const TITULOS_ROMANOS = ["I", "II", "III", "IV"];

function nuevaMedida() { return { id: Date.now() + Math.random(), rumbo: "", metros: "", lindero: "" }; }

// Convierte a letras en minúscula para superficie (ej: "doscientos ochenta") — numeroALetras está
// pensada para pesos y agrega "con XX/100", que no corresponde para metros cuadrados
const letras = (n) => numeroALetras(n).toLowerCase().replace(/ con \d{2}\/100$/, "");

export function generarDescripcionInmueble(d) {
  const partes = [];

  if (d.calle) {
    let ubic = `inmueble ubicado con frente a calle ${d.calle}${d.numero ? ` ${d.numero}` : ""}`;
    if (d.distrito) ubic += `, Distrito ${d.distrito}`;
    if (d.departamento) ubic += `, Departamento ${d.departamento.toUpperCase()}`;
    if (d.provincia) ubic += `, Provincia de ${d.provincia.toUpperCase()}`;
    partes.push(ubic);
  }

  if (d.lote || d.manzana) {
    let ident = "individualizado como";
    if (d.lote) ident += ` LOTE "${d.lote}"`;
    if (d.manzana) ident += `${d.lote ? " de la" : ""} MANZANA "${d.manzana}"`;
    partes.push(ident);
  }

  if (d.tituloNumero && d.tituloSuperficie) {
    partes.push(`constante de una superficie según Título ${d.tituloNumero} de ${letras(d.tituloSuperficie)} metros cuadrados (${d.tituloSuperficie} m²)`);
  }

  if (d.planoNumero) {
    let plano = `según Plano de mensura N° ${d.planoNumero}`;
    if (d.planoMes && d.planoAnio) plano += `, confeccionado en el mes de ${d.planoMes.toLowerCase()} de ${d.planoAnio}`;
    if (d.agrimensor) plano += ` por el agrimensor ${d.agrimensor}`;
    partes.push(plano);
  }

  if (d.matriculaNumero) {
    let mat = `matrícula ${d.matriculaNumero}`;
    if (d.matriculaSuperficie) mat += `, de ${letras(d.matriculaSuperficie)} metros cuadrados (${d.matriculaSuperficie} m²)`;
    partes.push(mat);
  }

  const medidas = (d.medidas || []).filter(m => m.rumbo && m.metros);
  const ochavas = (d.ochavas || []).filter(o => o.metros);
  if (medidas.length || ochavas.length) {
    const items = [
      ...medidas.map(m => `${m.rumbo}: con ${m.lindero || "..."} en ${m.metros} metros`),
      ...ochavas.map(o => `ochava de ${o.metros} metros${o.lindero ? ` que linda con ${o.lindero}` : ""}`),
    ];
    const texto = items.length > 1
      ? items.slice(0, -1).join("; ") + "; y " + items[items.length - 1]
      : items[0];
    partes.push(`con los siguientes límites y medidas perimetrales: ${texto}`);
  }

  if (!partes.length) return "";

  // Conectores fijos entre segmentos, tal como se redacta en la escritura real:
  // ubicación; identificación, título y plano. matrícula, medidas.
  const [ubicacion, identificacion, titulo, plano, matricula, medidasTxt] = [
    d.calle ? partes.shift() : null,
    (d.lote || d.manzana) ? partes.shift() : null,
    (d.tituloNumero && d.tituloSuperficie) ? partes.shift() : null,
    d.planoNumero ? partes.shift() : null,
    d.matriculaNumero ? partes.shift() : null,
    (medidas.length || ochavas.length) ? partes.shift() : null,
  ];

  let texto = "";
  if (ubicacion) texto += ubicacion;
  if (identificacion) texto += (texto ? "; " : "") + identificacion;
  if (titulo) texto += (texto ? ", " : "") + titulo;
  if (plano) texto += (titulo ? " y " : (texto ? ", " : "")) + plano;
  if (matricula) texto += (texto ? (plano ? ". " : ", ") : "") + matricula;
  if (medidasTxt) texto += (texto ? ", " : "") + medidasTxt;

  return texto ? texto + "." : "";
}

export function ModalDescripcionInmueble({ datos, onApply, onClose }) {
  const [d, setD] = useState(() => ({
    calle: datos?.calle || "",
    numero: datos?.numero || "",
    distrito: datos?.distrito || "",
    departamento: datos?.departamento || "",
    provincia: datos?.provincia || "Mendoza",
    lote: datos?.lote || "",
    manzana: datos?.manzana || "",
    tituloNumero: datos?.tituloNumero || "",
    tituloSuperficie: datos?.tituloSuperficie || "",
    planoNumero: datos?.planoNumero || "",
    planoMes: datos?.planoMes || "",
    planoAnio: datos?.planoAnio || "",
    agrimensor: datos?.agrimensor || "",
    matriculaNumero: datos?.matriculaNumero || "",
    matriculaSuperficie: datos?.matriculaSuperficie || "",
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

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(26,35,50,.45)", marginBottom: 6 }}>
          Ubicación
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, marginBottom: 6 }}>
          <Fg label="Calle"><input style={sInp} value={d.calle} onChange={e => upd("calle", e.target.value.toUpperCase())} placeholder="Ej: LAS CUEVAS" /></Fg>
          <Fg label="Número"><input style={sInp} value={d.numero} onChange={e => upd("numero", e.target.value)} placeholder="S/N" /></Fg>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <Fg label="Distrito"><input style={sInp} value={d.distrito} onChange={e => upd("distrito", e.target.value.toUpperCase())} placeholder="Ej: EL CHALLAO" /></Fg>
          <Fg label="Departamento">
            <select style={sInp} value={d.departamento} onChange={e => upd("departamento", e.target.value)}>
              <option value="">—</option>
              {DEPARTAMENTOS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
            </select>
          </Fg>
          <Fg label="Provincia"><input style={sInp} value={d.provincia} onChange={e => upd("provincia", e.target.value)} /></Fg>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(26,35,50,.45)", marginBottom: 6 }}>
          Identificación catastral
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <Fg label="Lote"><input style={sInp} value={d.lote} onChange={e => upd("lote", e.target.value)} placeholder='Ej: 5' /></Fg>
          <Fg label="Manzana"><input style={sInp} value={d.manzana} onChange={e => upd("manzana", e.target.value)} placeholder='Ej: I' /></Fg>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(26,35,50,.45)", marginBottom: 6 }}>
          Título y superficie
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <Fg label="N° de Título">
            <select style={sInp} value={d.tituloNumero} onChange={e => upd("tituloNumero", e.target.value)}>
              <option value="">—</option>
              {TITULOS_ROMANOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Fg>
          <Fg label="Superficie según Título (m²)">
            <InputDecimal style={sInp} value={d.tituloSuperficie} onChange={v => upd("tituloSuperficie", v)} placeholder="Ej: 280" />
          </Fg>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(26,35,50,.45)", marginBottom: 6 }}>
          Plano de mensura (opcional)
        </div>
        <Fg label="N° de plano">
          <input style={sInp} value={d.planoNumero} onChange={e => upd("planoNumero", e.target.value)} placeholder="Ej: 03-51952" />
        </Fg>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
          <Fg label="Mes">
            <select style={sInp} value={d.planoMes} onChange={e => upd("planoMes", e.target.value)}>
              <option value="">—</option>
              {MESES_LABEL.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Fg>
          <Fg label="Año"><input style={sInp} value={d.planoAnio} onChange={e => upd("planoAnio", e.target.value)} placeholder="Ej: 2021" /></Fg>
        </div>
        <Fg label="Agrimensor">
          <input style={{ ...sInp, marginTop: 6 }} value={d.agrimensor} onChange={e => upd("agrimensor", e.target.value)} placeholder="Ej: Carlos Soto" />
        </Fg>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(26,35,50,.45)", marginBottom: 6 }}>
          Matrícula
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <Fg label="N° de matrícula"><input style={sInp} value={d.matriculaNumero} onChange={e => upd("matriculaNumero", e.target.value)} placeholder="Ej: 1.308" /></Fg>
          <Fg label="Superficie según mensura (m²)">
            <InputDecimal style={sInp} value={d.matriculaSuperficie} onChange={v => upd("matriculaSuperficie", v)} placeholder="Ej: 280" />
          </Fg>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(26,35,50,.45)", marginBottom: 6 }}>
          Límites y medidas perimetrales
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {d.medidas.map((m, idx) => (
            <div key={m.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select style={{ ...sInp, width: 110, flexShrink: 0 }} value={m.rumbo} onChange={e => updMedida(idx, "rumbo", e.target.value)}>
                <option value="">Rumbo</option>
                {RUMBOS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input style={{ ...sInp, flex: 1 }} value={m.lindero} onChange={e => updMedida(idx, "lindero", e.target.value)} placeholder="con quién linda (ej: Pasaje Público)" />
              <input style={{ ...sInp, width: 90, flexShrink: 0 }} value={m.metros} onChange={e => updMedida(idx, "metros", e.target.value)} placeholder="metros" />
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
              <input style={{ ...sInp, flex: 1 }} value={o.lindero} onChange={e => updOchava(idx, "lindero", e.target.value)} placeholder="con quién linda" />
              <input style={{ ...sInp, width: 90, flexShrink: 0 }} value={o.metros} onChange={e => updOchava(idx, "metros", e.target.value)} placeholder="metros" />
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
