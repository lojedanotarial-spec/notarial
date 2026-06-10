import { useState } from "react";
import { C, inp } from "../../constants";

// Vigente: Res. MJ 273/2024 (1% desde sept 2024) + Ley Mendoza 9597/2024 (sellos 1.25%)
const ARANCEL_DNRPA = 0.01;
const SELLOS = { particulares: 0.0125, habitualista: 0.01 };
const GASTOS_DEF = [
  { id: "verificacion", label: "Verificación policial", valor: 37000, nota: "Vehículos de 2 a 12 años. Varía por jurisdicción.", on: true },
  { id: "gestoria",     label: "Gestoría / mandatario", valor: 75000, nota: "Opcional. Variable según gestor y zona.",           on: false },
];

const fmt = n => n == null ? "—" : "$ " + Math.round(n).toLocaleString("es-AR");

function parseMonto(str) {
  const n = parseFloat(String(str).replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase",
      color: "rgba(26,35,50,.45)", fontFamily: "'Montserrat',sans-serif", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.dark, fontFamily: "'Montserrat',sans-serif" }}>
        {label}
      </label>
      {hint && <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", lineHeight: 1.4, display: "block" }}>{hint}</span>}
      {children}
    </div>
  );
}

function ResultRow({ label, base, valor, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
      padding: "9px 0", borderBottom: "1px solid rgba(26,35,50,.05)" }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, color: C.dark, fontFamily: "'Inter',sans-serif",
          fontWeight: bold ? 700 : 400 }}>{label}</span>
        {base && (
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", marginLeft: 8 }}>
            {base}
          </span>
        )}
      </div>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: C.dark,
        fontFamily: "'Montserrat',sans-serif", flexShrink: 0 }}>
        {valor}
      </span>
    </div>
  );
}

export function EstimadorDNRPA({ onBack }) {
  const [tipo, setTipo] = useState("particulares");
  const [precioVenta, setPrecioVenta] = useState("");
  const [tablaDNRPA, setTablaDNRPA] = useState("");
  const [tablaATM, setTablaATM] = useState("");
  const [gastos, setGastos] = useState(
    Object.fromEntries(GASTOS_DEF.map(g => [g.id, { on: g.on, valor: g.valor }]))
  );
  const [resultado, setResultado] = useState(null);

  const toggleGasto = id => setGastos(p => ({ ...p, [id]: { ...p[id], on: !p[id].on } }));
  const setGastoValor = (id, val) => {
    const n = parseInt(val.replace(/\D/g, "")) || 0;
    setGastos(p => ({ ...p, [id]: { ...p[id], valor: n } }));
  };

  function calcular() {
    const precio = parseMonto(precioVenta);
    if (!precio) return;

    const baseD = tablaDNRPA ? Math.max(precio, parseMonto(tablaDNRPA)) : precio;
    const baseA = tablaATM   ? Math.max(precio, parseMonto(tablaATM))   : precio;

    const arancelDNRPA = baseD * ARANCEL_DNRPA;
    const sellosMza    = baseA * SELLOS[tipo];

    const gastosLineas = GASTOS_DEF
      .filter(g => gastos[g.id].on)
      .map(g => ({ label: g.label, valor: gastos[g.id].valor }));

    const totalGastos = gastosLineas.reduce((s, g) => s + g.valor, 0);

    setResultado({
      precio, baseD, baseA,
      arancelDNRPA, sellosMza, gastosLineas,
      total: arancelDNRPA + sellosMza + totalGastos,
      tasaSellos: SELLOS[tipo] * 100,
      tipo,
    });
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ed" }}>

      {/* Header */}
      <div style={{ background: C.dark, padding: "0 24px", height: 52, display: "flex",
        alignItems: "center", gap: 16, flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ background: "transparent", border: "none", color: "rgba(253,252,250,.6)",
            cursor: "pointer", fontSize: 13, fontFamily: "'Inter',sans-serif" }}>
          ← Utilidades
        </button>
        <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14 }}>
          Estimador DNRPA
        </span>
        <span style={{ fontSize: 10, background: "rgba(58,124,165,.25)", color: "#7bbde0",
          padding: "2px 9px", borderRadius: 10, fontFamily: "'Montserrat',sans-serif", fontWeight: 700,
          letterSpacing: ".04em", textTransform: "uppercase" }}>
          Mendoza
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Tipo de transferencia */}
          <section>
            <SectionTitle>Tipo de transferencia</SectionTitle>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                ["particulares", "Entre particulares", "Sellos: 1,25%"],
                ["habitualista",  "Desde habitualista inscripto", "Sellos: 1%"],
              ].map(([k, label, sub]) => (
                <button key={k} onClick={() => setTipo(k)}
                  style={{
                    flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid",
                    borderColor: tipo === k ? C.cerulean : "rgba(26,35,50,.12)",
                    background: tipo === k ? "rgba(58,124,165,.06)" : "#FDFCFA",
                    cursor: "pointer", textAlign: "left",
                  }}>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12,
                    color: tipo === k ? C.cerulean : C.dark }}>{label}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {sub}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Valores */}
          <section>
            <SectionTitle>Valores del vehículo</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Precio de venta declarado *"
                hint="Valor que figura en el formulario 08">
                <input value={precioVenta} onChange={e => setPrecioVenta(e.target.value)}
                  placeholder="Ej: 10000000"
                  style={{ ...inp }}
                />
              </Field>
              <Field label="Valor de tabla DNRPA (opcional)"
                hint={<>Si no lo ingresás, se usa el precio de venta como base. <a href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador" target="_blank" rel="noopener noreferrer" style={{ color: C.cerulean, textDecoration: "none", fontWeight: 600 }}>Consultar estimador oficial →</a></>}>
                <input value={tablaDNRPA} onChange={e => setTablaDNRPA(e.target.value)}
                  placeholder="Ej: 12000000"
                  style={{ ...inp }}
                />
              </Field>
              <Field label="Valor de tabla ATM Mendoza (opcional)"
                hint="Base para el impuesto de sellos. Si no lo ingresás, se usa el precio de venta.">
                <input value={tablaATM} onChange={e => setTablaATM(e.target.value)}
                  placeholder="Ej: 11500000"
                  style={{ ...inp }}
                />
              </Field>
            </div>
          </section>

          {/* Gastos adicionales */}
          <section>
            <SectionTitle>Gastos adicionales</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GASTOS_DEF.map(g => (
                <div key={g.id}
                  style={{ background: "#FDFCFA", border: "1px solid rgba(26,35,50,.08)",
                    borderRadius: 8, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="checkbox" checked={gastos[g.id].on}
                    onChange={() => toggleGasto(g.id)}
                    style={{ width: 16, height: 16, accentColor: C.cerulean, cursor: "pointer", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, fontFamily: "'Montserrat',sans-serif" }}>
                      {g.label}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", marginTop: 2 }}>
                      {g.nota}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter',sans-serif" }}>$</span>
                    <input
                      value={gastos[g.id].valor.toLocaleString("es-AR")}
                      onChange={e => setGastoValor(g.id, e.target.value)}
                      style={{ ...inp, width: 100, textAlign: "right", padding: "6px 10px" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Botón */}
          <button onClick={calcular} disabled={!precioVenta.trim()}
            style={{
              padding: "13px 0", borderRadius: 10, border: "none",
              background: precioVenta.trim() ? C.dark : "rgba(26,35,50,.2)",
              color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14,
              cursor: precioVenta.trim() ? "pointer" : "default", letterSpacing: ".02em",
              transition: "background .15s",
            }}>
            Calcular
          </button>

          {/* Resultado */}
          {resultado && (
            <div style={{ background: "#FDFCFA", border: "1px solid rgba(26,35,50,.12)",
              borderRadius: 12, overflow: "hidden" }}>

              {/* Cabecera resultado */}
              <div style={{ background: C.dark, padding: "14px 20px" }}>
                <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13, color: "#FDFCFA" }}>
                  Estimación de costos
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "rgba(253,252,250,.55)", marginTop: 2 }}>
                  Transferencia {resultado.tipo === "particulares" ? "entre particulares" : "desde habitualista"} · Mendoza · 2025
                </div>
              </div>

              {/* Líneas */}
              <div style={{ padding: "4px 20px 8px" }}>
                <ResultRow
                  label="Arancel DNRPA (1%)"
                  base={resultado.baseD !== resultado.precio ? `base: ${fmt(resultado.baseD)}` : undefined}
                  valor={fmt(resultado.arancelDNRPA)}
                />
                <ResultRow
                  label={`Impuesto de sellos Mendoza (${resultado.tasaSellos}%)`}
                  base={resultado.baseA !== resultado.precio ? `base: ${fmt(resultado.baseA)}` : undefined}
                  valor={fmt(resultado.sellosMza)}
                />
                {resultado.gastosLineas.map(g => (
                  <ResultRow key={g.label} label={g.label} valor={fmt(g.valor)} />
                ))}

                <div style={{ height: 1, background: "rgba(26,35,50,.1)", margin: "10px 0 4px" }} />

                <ResultRow label="Total estimado" valor={fmt(resultado.total)} bold />
              </div>

              {/* Disclaimer */}
              <div style={{ padding: "10px 20px 14px", background: "rgba(26,35,50,.02)",
                borderTop: "1px solid rgba(26,35,50,.06)" }}>
                <p style={{ fontSize: 10, color: C.muted, fontFamily: "'Inter',sans-serif",
                  lineHeight: 1.6, margin: 0 }}>
                  Normativa aplicada: Res. MJ 273/2024 — arancel DNRPA 1% unificado (vigente desde sept. 2024) · Ley Mendoza 9597/2024 — sellos {resultado.tasaSellos}%.
                  Los gastos adicionales son valores aproximados que pueden variar. Este estimador no reemplaza el cálculo oficial del registro seccional.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
