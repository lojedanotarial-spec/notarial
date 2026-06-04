import { useState } from "react";
import { C, inp } from "../../constants";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { Fg } from "../ui/FormElements";

const TIPOS = [
  { key: "08",  label: "F-08",      prefix: null, hint: "Automotor" },
  { key: "08M", label: "F-08 Moto", prefix: "M",  hint: "Motovehículo" },
  { key: "04",  label: "F-04",      prefix: null, hint: "Cambio datos" },
];

export function ModalFormulario({ formulario, onApply, onClose }) {
  const [d, setD] = useState({ tipo: "08", numero: "", dominio: "", ...formulario });
  const upd = (f, v) => setD(prev => ({ ...prev, [f]: v }));

  const tipoActual = TIPOS.find(t => t.key === d.tipo) || TIPOS[0];

  return (
    <Modal title="Formulario" onClose={onClose}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn primary onClick={() => { onApply(d); onClose(); }}>Guardar</Btn></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <Fg label="Tipo de formulario">
          <div style={{ display: "flex", gap: 8 }}>
            {TIPOS.map(t => (
              <button key={t.key} type="button" onClick={() => upd("tipo", t.key)}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 8, border: "2px solid",
                  borderColor: d.tipo === t.key ? C.cerulean : "rgba(26,35,50,.15)",
                  background: d.tipo === t.key ? C.ceruleanLight : "transparent",
                  color: d.tipo === t.key ? C.cerulean : C.dark,
                  fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
                  fontSize: 13, cursor: "pointer", lineHeight: 1.3,
                }}>
                <div style={{ fontSize: 16 }}>{t.label}</div>
                <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.7 }}>{t.hint}</div>
              </button>
            ))}
          </div>
        </Fg>

        <Fg label="N° de formulario">
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {tipoActual.prefix && (
              <div style={{
                padding: "0 10px", height: 38, display: "flex", alignItems: "center",
                background: "rgba(26,35,50,.07)", border: "1px solid rgba(26,35,50,.18)",
                borderRight: "none", borderRadius: "6px 0 0 6px",
                fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
                fontSize: 14, color: C.dark, letterSpacing: "0.05em",
              }}>
                {tipoActual.prefix}
              </div>
            )}
            <input
              style={{
                ...inp,
                borderRadius: tipoActual.prefix ? "0 6px 6px 0" : 6,
                flex: 1,
              }}
              value={d.numero}
              onChange={e => upd("numero", e.target.value.replace(/\D/g, ""))}
              placeholder={tipoActual.prefix ? "Ej: 06500179" : "Ej: 53583936"}
              maxLength={12}
            />
          </div>
          {tipoActual.prefix && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              Se guardará como N.° M{d.numero || "XXXXXXXX"}
            </div>
          )}
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

// Helper para formatear el número de formulario con prefijo
export function fmtNumFormulario(formulario) {
  if (!formulario?.numero) return "";
  const prefix = TIPOS.find(t => t.key === formulario.tipo)?.prefix || "";
  return prefix + formulario.numero;
}
