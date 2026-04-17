import { useState } from "react";
import { C, ESCRIBANOS, PARTE_VACIA, DEPARTAMENTOS, inp } from "../constants";
import { NavBar } from "../components/NavBar";
import { Modal } from "../components/Modal";
import { Btn } from "../components/ui/Btn";
import { Fg } from "../components/ui/FormElements";
import { ModalPartes } from "../components/modals/ModalPartes";

const LOTE_VACIO = () => ({
  id:           Date.now() + Math.random(),
  // Escritura
  nroEscritura: "",
  fechaEscritura: "",
  escribano:    ESCRIBANOS[0]?.nombre || "",
  estado:       "pendiente",
  // Inmueble
  manzana:      "",
  lote:         "",
  // Superficie
  supMensura:   "",
  supTitulo1:   "",
  supTitulo2:   "",
  supTitulo3:   "",
  // Limites
  norte: "", norteM: "",
  sur:   "", surM:   "",
  este:  "", esteM:  "",
  oeste: "", oesteM: "",
  noreste:  "", noresteM:  "",
  noroeste: "", noroesteM: "",
  sureste:  "", suresteM:  "",
  suroeste: "", suroesteM: "",
  // Precio
  precio:       "",
  // Registro publico
  certRegistro: "",
  fechaRegistro: "",
  // Catastro
  certCatastro:  "",
  fechaCatastro: "",
  nomenclatura:  "",
  padronRentas:  "",
  avaluo:        "",
  // Municipalidad
  padronMuni:    "",
  // Partes
  partes:        [],
});

const BARRIO_VACIO = () => ({
  id:           Date.now() + Math.random(),
  nombre:       "",
  transmitente: "",
  cuit:         "",
  matricula:    "",
  plano:        "",
  abierto:      true,
  lotes:        [LOTE_VACIO()],
});

function estaCompleto(l) {
  return !!(
    l.manzana && l.lote && l.partes.length > 0 &&
    l.nroEscritura && l.supMensura &&
    l.norte && l.sur && l.este && l.oeste &&
    l.precio && l.nomenclatura && l.padronRentas && l.avaluo && l.padronMuni
  );
}

function BadgeEstado({ completo }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: completo ? "#e8f5e9" : "#fff3e0",
      color: completo ? "#2e7d32" : "#e65100",
      border: "1px solid " + (completo ? "#a5d6a7" : "#ffcc80"),
      whiteSpace: "nowrap",
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: completo ? "#43a047" : "#fb8c00",
        flexShrink: 0,
      }}/>
      {completo ? "Completo" : "Incompleto"}
    </div>
  );
}

function ModalLote({ lote, onSave, onClose }) {
  const [d, setD] = useState({ ...lote });
  const [tabPartes, setTabPartes] = useState(false);
  const upd = (f, v) => setD(prev => ({ ...prev, [f]: v }));

  const inputStyle = {
    width: "100%", padding: "7px 9px", borderRadius: 6,
    border: "1px solid rgba(26,35,50,.14)", background: "#FDFCFA",
    fontSize: 12, color: "#1a2332", fontFamily: "'Montserrat',sans-serif",
    outline: "none", boxSizing: "border-box",
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: ".07em",
        textTransform: "uppercase", color: "rgba(26,35,50,1)",
        marginBottom: 10, paddingBottom: 6,
        borderBottom: "1px solid rgba(26,35,50,.07)",
      }}>
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <Modal
      title={"Lote " + (d.manzana || "?") + " - " + (d.lote || "?")}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn primary onClick={() => { onSave(d); onClose(); }}>Guardar</Btn>
        </>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["datos", "partes"].map(tab => (
          <button key={tab} onClick={() => setTabPartes(tab === "partes")}
            style={{
              padding: "5px 14px", borderRadius: 6, cursor: "pointer",
              border: "1px solid " + ((tab === "partes") === tabPartes ? C.cerulean : "rgba(26,35,50,.15)"),
              background: (tab === "partes") === tabPartes ? C.ceruleanLight : "transparent",
              fontSize: 12, fontWeight: 600,
              color: (tab === "partes") === tabPartes ? "#1f4862" : "rgba(26,35,50,.5)",
              fontFamily: "'Montserrat',sans-serif",
            }}>
            {tab === "datos" ? "Datos del lote" : "Partes (" + d.partes.length + ")"}
          </button>
        ))}
      </div>

      {!tabPartes ? (
        <div style={{ maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>

          <Section title="Escritura">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <Fg label="N° Escritura">
                <input style={inputStyle} value={d.nroEscritura}
                  onChange={e => upd("nroEscritura", e.target.value)} placeholder="ej: 29"/>
              </Fg>
              <Fg label="Fecha de escritura">
                <input style={inputStyle} value={d.fechaEscritura}
                  onChange={e => upd("fechaEscritura", e.target.value)} placeholder="dd/mm/aaaa"/>
              </Fg>
              <Fg label="Escribano">
                <select style={inputStyle} value={d.escribano}
                  onChange={e => upd("escribano", e.target.value)}>
                  {ESCRIBANOS.map(e => <option key={e.nombre} value={e.nombre}>{e.nombre}</option>)}
                </select>
              </Fg>
            </div>
          </Section>

          <Section title="Inmueble">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Fg label="Manzana">
                <input style={inputStyle} value={d.manzana}
                  onChange={e => upd("manzana", e.target.value.toUpperCase())} placeholder="ej: U"/>
              </Fg>
              <Fg label="Lote">
                <input style={inputStyle} value={d.lote}
                  onChange={e => upd("lote", e.target.value)} placeholder="ej: 25"/>
              </Fg>
            </div>
          </Section>

          <Section title="Superficie">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
              <Fg label="Mensura">
                <input style={inputStyle} value={d.supMensura}
                  onChange={e => upd("supMensura", e.target.value)} placeholder="210,49 m2"/>
              </Fg>
              <Fg label="Titulo I">
                <input style={inputStyle} value={d.supTitulo1}
                  onChange={e => upd("supTitulo1", e.target.value)} placeholder="210,49 m2"/>
              </Fg>
              <Fg label="Titulo II">
                <input style={inputStyle} value={d.supTitulo2}
                  onChange={e => upd("supTitulo2", e.target.value)} placeholder="opcional"/>
              </Fg>
              <Fg label="Titulo III">
                <input style={inputStyle} value={d.supTitulo3}
                  onChange={e => upd("supTitulo3", e.target.value)} placeholder="opcional"/>
              </Fg>
            </div>
          </Section>

          <Section title="Limites">
            {["norte","sur","este","oeste","noreste","noroeste","sureste","suroeste"].map(k => (
              <div key={k} style={{ display:"grid", gridTemplateColumns:"100px 1fr 100px", gap:8, marginBottom:8, alignItems:"end" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"rgba(26,35,50,1)",
                              paddingBottom:8, textTransform:"capitalize" }}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </div>
                <Fg label="Colindante">
                  <input style={inputStyle} value={d[k] || ""}
                    onChange={e => upd(k, e.target.value)} placeholder="ej: Lote N° 24"/>
                </Fg>
                <Fg label="Metros">
                  <input style={inputStyle} value={d[k + "M"] || ""}
                    onChange={e => upd(k + "M", e.target.value)} placeholder="21,14"/>
                </Fg>
              </div>
            ))}
          </Section>

          
          <Section title="Precio">
            <Fg label="Precio total">
              <input style={inputStyle} value={d.precio}
                onChange={e => upd("precio", e.target.value)} placeholder="$607.680,00"/>
            </Fg>
          </Section>

          <Section title="Registro Publico">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Fg label="N° Certificado">
                <input style={inputStyle} value={d.certRegistro}
                  onChange={e => upd("certRegistro", e.target.value)} placeholder="ej: 3018489"/>
              </Fg>
              <Fg label="Fecha certificado">
                <input style={inputStyle} value={d.fechaRegistro}
                  onChange={e => upd("fechaRegistro", e.target.value)} placeholder="dd/mm/aaaa"/>
              </Fg>
            </div>
          </Section>

          <Section title="Catastro">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <Fg label="N° Certificado">
                <input style={inputStyle} value={d.certCatastro}
                  onChange={e => upd("certCatastro", e.target.value)} placeholder="ej: 2025000032590"/>
              </Fg>
              <Fg label="Fecha certificado">
                <input style={inputStyle} value={d.fechaCatastro}
                  onChange={e => upd("fechaCatastro", e.target.value)} placeholder="dd/mm/aaaa"/>
              </Fg>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <Fg label="Nomenclatura catastral">
                <input style={inputStyle} value={d.nomenclatura}
                  onChange={e => upd("nomenclatura", e.target.value)} placeholder="03-03-03-..."/>
              </Fg>
              <Fg label="Padron Rentas">
                <input style={inputStyle} value={d.padronRentas}
                  onChange={e => upd("padronRentas", e.target.value)} placeholder="03-76386-9"/>
              </Fg>
              <Fg label="Avaluo fiscal">
                <input style={inputStyle} value={d.avaluo}
                  onChange={e => upd("avaluo", e.target.value)} placeholder="$3.751.004"/>
              </Fg>
            </div>
          </Section>

          <Section title="Municipalidad">
            <Fg label="Padron municipal">
              <input style={inputStyle} value={d.padronMuni}
                onChange={e => upd("padronMuni", e.target.value)} placeholder="ej: 67201"/>
            </Fg>
          </Section>

        </div>
      ) : (
        <div style={{ maxHeight: 480, overflowY: "auto" }}>
          <ModalPartesInline
            partes={d.partes}
            onChange={partes => upd("partes", partes)}
          />
        </div>
      )}
    </Modal>
  );
}

function ModalPartesInline({ partes, onChange }) {
  const lista = partes.length > 0 ? partes : [PARTE_VACIA()];
  const [openId, setOpenId] = useState(lista[0]?.id ?? null);

  const upd = (id, f, v) => {
    const next = lista.map(p => p.id === id ? { ...p, [f]: v } : p);
    onChange(next);
  };
  const agregar = () => {
    const n = PARTE_VACIA();
    onChange([...lista, n]);
    setOpenId(n.id);
  };
  const quitar = (id) => {
    const next = lista.filter(p => p.id !== id);
    onChange(next.length > 0 ? next : []);
    setOpenId(next[0]?.id ?? null);
  };

  const EC_F = ["soltera","casada","divorciada","viuda","separada de hecho"];
  const EC_M = ["soltero","casado","divorciado","viudo","separado de hecho"];
  const p = lista.find(x => x.id === openId);

  const inputStyle = {
    width: "100%", padding: "7px 9px", borderRadius: 6,
    border: "1px solid rgba(26,35,50,.14)", background: "#FDFCFA",
    fontSize: 12, color: "#1a2332", fontFamily: "'Montserrat',sans-serif",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ width: 160, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {lista.map((x, idx) => {
          const ini = ((x.apellido?.[0] || "?") + (x.nombre?.[0] || "")).toUpperCase();
          const activo = openId === x.id;
          return (
            <div key={x.id} onClick={() => setOpenId(x.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                background: activo ? C.ceruleanLight : C.porcelain,
                border: "1px solid " + (activo ? C.cerulean : "rgba(26,35,50,.1)"),
              }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: activo ? C.cerulean : C.ceruleanLight,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: activo ? "#fff" : "#1f4862",
              }}>{ini}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a2332",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {x.apellido || "Parte " + (idx + 1)}
                </div>
              </div>
            </div>
          );
        })}
        <button onClick={agregar}
          style={{
            padding: "7px 10px", border: "1px dashed rgba(26,35,50,.2)",
            borderRadius: 8, fontSize: 12, color: "rgba(26,35,50,1)",
            background: "transparent", fontFamily: "'Montserrat',sans-serif",
            cursor: "pointer", textAlign: "center",
          }}>
          + Agregar
        </button>
      </div>

      {p && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Fg label="Apellido">
              <input style={inputStyle} value={p.apellido}
                onChange={e => upd(p.id, "apellido", e.target.value.toUpperCase())}
                placeholder="apellido/s"/>
            </Fg>
            <Fg label="Nombre/s">
              <input style={inputStyle} value={p.nombre}
                onChange={e => upd(p.id, "nombre", e.target.value.toUpperCase())}
                placeholder="nombre/s"/>
            </Fg>
            <Fg label="Genero">
              <select style={inputStyle} value={p.genero}
                onChange={e => upd(p.id, "genero", e.target.value)}>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
              </select>
            </Fg>
            <Fg label="Estado civil">
              <select style={inputStyle} value={p.estadoCivil}
                onChange={e => upd(p.id, "estadoCivil", e.target.value)}>
                {(p.genero === "F" ? EC_F : EC_M).map(ec => <option key={ec}>{ec}</option>)}
              </select>
            </Fg>
            <Fg label="Nacionalidad">
              <input style={inputStyle} value={p.nacionalidad}
                onChange={e => upd(p.id, "nacionalidad", e.target.value)}
                placeholder="ej: argentina"/>
            </Fg>
            <Fg label="Tipo doc.">
              <select style={inputStyle} value={p.tipoDoc}
                onChange={e => upd(p.id, "tipoDoc", e.target.value)}>
                <option>DNI</option><option>LE</option><option>LC</option><option>Pasaporte</option>
              </select>
            </Fg>
            <Fg label="N° documento">
              <input style={inputStyle} value={p.nroDoc}
                onChange={e => upd(p.id, "nroDoc", e.target.value.replace(/\D/g,"").slice(0,8))}
                placeholder="ej: 31645431"/>
            </Fg>
            <Fg label="CUIT / CUIL">
              <input style={inputStyle} value={p.cuit}
                onChange={e => upd(p.id, "cuit", e.target.value)}
                placeholder="xx-xxxxxxxx-x"/>
            </Fg>
            <Fg label="Fecha de nacimiento">
              <input style={inputStyle} value={p.fechaNac}
                onChange={e => upd(p.id, "fechaNac", e.target.value)}
                placeholder="dd/mm/aaaa"/>
            </Fg>
            <Fg label="Rol en el acto">
              <input style={inputStyle} value={p.rol}
                onChange={e => upd(p.id, "rol", e.target.value.toUpperCase())}
                placeholder="ej: COMPRADOR"/>
            </Fg>
            <Fg label="Domicilio (calle y numero)">
              <input style={inputStyle} value={p.calle}
                onChange={e => upd(p.id, "calle", e.target.value)}
                placeholder="calle y numero"/>
            </Fg>
            <Fg label="Departamento Mendoza">
              <select style={inputStyle} value={p.departamento}
                onChange={e => upd(p.id, "departamento", e.target.value)}>
                {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Fg>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <Btn danger onClick={() => quitar(p.id)}>Quitar parte</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function FilaLote({ lote, idx, onEditar, onEliminar }) {
  const completo = estaCompleto(lote);
  const partesLabel = lote.partes.length === 0
    ? "Sin partes"
    : lote.partes.map(p => p.apellido || "?").join(" + ");

  return (
    <tr
      onMouseEnter={e => e.currentTarget.style.background = "rgba(26,35,50,.018)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(26,35,50,.06)",
                   fontSize: 11, color: "rgba(26,35,50,1)", fontWeight: 600, textAlign: "center" }}>
        {idx + 1}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(26,35,50,.06)" }}>
        <BadgeEstado completo={completo} />
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(26,35,50,.06)",
                   fontSize: 13, fontWeight: 600, color: "#1a2332" }}>
        {lote.manzana || <span style={{ color: "rgba(26,35,50,1)", fontStyle: "italic" }}>-</span>}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(26,35,50,.06)",
                   fontSize: 13, fontWeight: 600, color: "#1a2332" }}>
        {lote.lote || <span style={{ color: "rgba(26,35,50,1)", fontStyle: "italic" }}>-</span>}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(26,35,50,.06)",
                   fontSize: 12, color: lote.partes.length > 0 ? "#1a2332" : "rgba(26,35,50,.3)",
                   fontStyle: lote.partes.length === 0 ? "italic" : "normal" }}>
        {partesLabel}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(26,35,50,.06)",
                   fontSize: 12, color: "rgba(26,35,50,1)" }}>
        {lote.nroEscritura
          ? "Esc. " + lote.nroEscritura
          : <span style={{ color: "rgba(26,35,50,1)", fontStyle: "italic" }}>sin numero</span>}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(26,35,50,.06)",
                   fontSize: 12, color: "rgba(26,35,50,1)" }}>
        {lote.precio || <span style={{ color: "rgba(26,35,50,1)", fontStyle: "italic" }}>-</span>}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid rgba(26,35,50,.06)" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onEditar(lote.id)}
            style={{
              padding: "4px 12px", borderRadius: 6, cursor: "pointer",
              border: "1px solid " + C.cerulean, background: C.ceruleanLight,
              fontSize: 11, fontWeight: 600, color: "#1f4862",
              fontFamily: "'Montserrat',sans-serif",
            }}>
            Editar
          </button>
          <button onClick={() => onEliminar(lote.id)}
            style={{
              padding: "4px 8px", borderRadius: 6, cursor: "pointer",
              border: "1px solid rgba(26,35,50,.15)", background: "transparent",
              fontSize: 13, color: "rgba(26,35,50,1)",
              fontFamily: "'Montserrat',sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#c0392b"; e.currentTarget.style.borderColor = "#c0392b"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(26,35,50,.3)"; e.currentTarget.style.borderColor = "rgba(26,35,50,.15)"; }}
          >
            x
          </button>
        </div>
      </td>
    </tr>
  );
}

function PanelBarrio({ b, onUpd, onUpdLote, onAgregarLote, onEliminarLote, onEliminarBarrio }) {
  const [editandoLote, setEditandoLote] = useState(null);
  const loteEditar = editandoLote ? b.lotes.find(l => l.id === editandoLote) : null;
  const completosCount = b.lotes.filter(estaCompleto).length;

  return (
    <div style={{
      background: "#fff", borderRadius: 10,
      border: "1px solid rgba(26,35,50,.08)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        borderBottom: b.abierto ? "1px solid rgba(26,35,50,.07)" : "none",
        background: b.abierto ? "#faf8f4" : "#fff",
      }}>
        <button onClick={() => onUpd(b.id, "abierto", !b.abierto)}
          style={{ background: "none", border: "none", cursor: "pointer",
                   color: "rgba(26,35,50,1)", padding: 0, display: "flex" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5"
            style={{ transform: b.abierto ? "rotate(90deg)" : "rotate(0)", transition: "transform .15s" }}>
            <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <input value={b.nombre} onChange={e => onUpd(b.id, "nombre", e.target.value)}
          placeholder="Nombre del barrio o loteo..."
          style={{
            flex: 1, border: "none", background: "transparent",
            fontSize: 14, fontWeight: 600, color: "#1a2332",
            fontFamily: "'Montserrat',sans-serif", outline: "none",
          }}/>

        <span style={{
          fontSize: 11, color: "rgba(26,35,50,1)",
          background: "rgba(26,35,50,.06)", borderRadius: 20, padding: "2px 10px",
        }}>
          {completosCount}/{b.lotes.length} completos
        </span>

        <button style={{
          padding: "4px 12px", borderRadius: 6, border: "none",
          background: C.cerulean, color: "#fff", fontSize: 11, fontWeight: 700,
          fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
        }}>
          Exportar barrio
        </button>

        <button onClick={() => onEliminarBarrio(b.id)}
          style={{ background: "none", border: "none", cursor: "pointer",
                   color: "rgba(26,35,50,1)", fontSize: 18, lineHeight: 1, padding: 2 }}
          onMouseEnter={e => e.currentTarget.style.color = "#c0392b"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(26,35,50,.2)"}>
          x
        </button>
      </div>

      {b.abierto && (
        <>
          {/* Datos fijos del barrio */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 10, padding: "10px 16px",
            borderBottom: "1px solid rgba(26,35,50,.06)",
            background: "rgba(26,35,50,.012)",
          }}>
            {[
              ["Transmitente", "transmitente", "Cooperativa / union vecinal"],
              ["CUIT transmitente", "cuit", "ej: 33-54516418-9"],
              ["Matricula SIRC", "matricula", "ej: 700062588"],
              ["Plano de mensura", "plano", "ej: 03-51952"],
            ].map(([label, campo, ph]) => (
              <div key={campo}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
                              textTransform: "uppercase", color: "rgba(26,35,50,1)", marginBottom: 4 }}>
                  {label}
                </div>
                <input value={b[campo]} onChange={e => onUpd(b.id, campo, e.target.value)}
                  placeholder={ph}
                  style={{
                    width: "100%", padding: "6px 8px", borderRadius: 6,
                    border: "1px solid rgba(26,35,50,.12)", background: "#fff",
                    fontSize: 12, color: "#1a2332",
                    fontFamily: "'Montserrat',sans-serif", outline: "none", boxSizing: "border-box",
                  }}/>
              </div>
            ))}
          </div>

          {/* Tabla de lotes */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr style={{ background: "#faf8f4" }}>
                  {["#","Estado","Manzana","Lote","Partes","N° Escritura","Precio",""].map(h => (
                    <th key={h} style={{
                      padding: "7px 10px", textAlign: "left", fontSize: 10,
                      fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                      color: "rgba(26,35,50,1)", borderBottom: "2px solid rgba(26,35,50,.08)",
                      whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.lotes.map((l, idx) => (
                  <FilaLote key={l.id} lote={l} idx={idx}
                    onEditar={(id) => setEditandoLote(id)}
                    onEliminar={(id) => onEliminarLote(b.id, id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(26,35,50,.06)",
                        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => onAgregarLote(b.id)}
              style={{
                background: "none", border: "1px dashed rgba(26,35,50,.2)",
                borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600,
                color: "rgba(26,35,50,1)", fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
              }}>
              + Agregar lote
            </button>
            <span style={{ fontSize: 11, color: "rgba(26,35,50,1)" }}>
              {b.lotes.length} {b.lotes.length === 1 ? "lote" : "lotes"}
            </span>
          </div>
        </>
      )}

      {editandoLote && loteEditar && (
        <ModalLote
          lote={loteEditar}
          onSave={(data) => onUpdLote(b.id, data.id, data)}
          onClose={() => setEditandoLote(null)}
        />
      )}
    </div>
  );
}

export function BulkScreen({ onGo }) {
  const [barrios, setBarrios] = useState([BARRIO_VACIO()]);

  const updBarrio = (bid, campo, valor) =>
    setBarrios(prev => prev.map(b => b.id === bid ? { ...b, [campo]: valor } : b));

  const updLote = (bid, lid, data) =>
    setBarrios(prev => prev.map(b => b.id === bid
      ? { ...b, lotes: b.lotes.map(l => l.id === lid ? data : l) }
      : b
    ));

  const agregarBarrio = () =>
    setBarrios(prev => [...prev, BARRIO_VACIO()]);

  const eliminarBarrio = (bid) =>
    setBarrios(prev => prev.length > 1 ? prev.filter(b => b.id !== bid) : prev);

  const agregarLote = (bid) =>
    setBarrios(prev => prev.map(b => b.id === bid
      ? { ...b, lotes: [...b.lotes, LOTE_VACIO()] } : b));

  const eliminarLote = (bid, lid) =>
    setBarrios(prev => prev.map(b => b.id === bid
      ? { ...b, lotes: b.lotes.length > 1 ? b.lotes.filter(l => l.id !== lid) : b.lotes }
      : b
    ));

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'Montserrat',sans-serif", overflow: "hidden", background: C.warm,
    }}>
      <NavBar />

      <div style={{
        background: C.warm, borderBottom: "1px solid rgba(26,35,50,.08)",
        padding: "10px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
      }}>
        <button onClick={() => onGo("home")}
          style={{
            background: "none", border: "none", color: "rgba(26,35,50,1)",
            fontSize: 13, fontFamily: "'Montserrat',sans-serif",
            padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>
        <div style={{ width: 1, height: 14, background: "rgba(26,35,50,.15)" }}/>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a2332" }}>Carga masiva</span>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={agregarBarrio}
            style={{
              padding: "6px 16px", borderRadius: 7, border: "1px solid rgba(26,35,50,.18)",
              background: "#fff", fontSize: 12, fontWeight: 600, color: "#1a2332",
              fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
            }}>
            + Agregar barrio
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px",
                    display: "flex", flexDirection: "column", gap: 12 }}>
        {barrios.map(b => (
          <PanelBarrio
            key={b.id}
            b={b}
            onUpd={updBarrio}
            onUpdLote={updLote}
            onAgregarLote={agregarLote}
            onEliminarLote={eliminarLote}
            onEliminarBarrio={eliminarBarrio}
          />
        ))}
      </div>
    </div>
  );
}
