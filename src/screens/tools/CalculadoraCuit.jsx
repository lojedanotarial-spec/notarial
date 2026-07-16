import { useState } from "react";
import { C } from "../../constants";

function calcularCUIT(dni, genero) {
  const dniStr = String(dni || "").replace(/\D/g, "").padStart(8, "0");
  if (dniStr.length !== 8) return null;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const calcVer = (pre) => {
    const num = String(pre) + dniStr;
    const suma = num.split("").reduce((acc, d, i) => acc + parseInt(d) * mult[i], 0);
    return 11 - (suma % 11);
  };
  const preBase = genero === "M" ? 20 : 27;
  let ver = calcVer(preBase);
  let pre = preBase;
  if (ver === 11) { ver = 0; }
  else if (ver === 10) {
    pre = genero === "M" ? 23 : 24;
    ver = calcVer(pre);
    if (ver === 11) ver = 0;
  }
  return { prefijo: String(pre), verificador: String(ver) };
}

export function CalculadoraCuit({ onBack }) {
  const [dni, setDni] = useState("");
  const [genero, setGenero] = useState("M");
  const [copiado, setCopiado] = useState(false);

  const dniLimpio = dni.replace(/\D/g, "").slice(0, 8);
  const resultado = dniLimpio.length >= 7 ? calcularCUIT(dniLimpio, genero) : null;
  const cuitFormateado = resultado
    ? `${resultado.prefijo}-${dniLimpio.padStart(8, "0")}-${resultado.verificador}`
    : null;

  const copiar = () => {
    if (!cuitFormateado) return;
    navigator.clipboard.writeText(cuitFormateado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const INP = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid rgba(26,35,50,.18)", background: "#fff",
    fontSize: 16, color: "#1a2332", fontFamily: "'Montserrat',sans-serif",
    fontWeight: 600, outline: "none", boxSizing: "border-box", letterSpacing: ".04em",
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ed" }}>

      {/* Header */}
      <div style={{ background: C.dark, padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: "rgba(253,252,250,.6)", cursor: "pointer", fontSize: 13, fontFamily: "'Inter',sans-serif" }}>
          ← Utilidades
        </button>
        <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14 }}>
          Calculadora CUIT / CUIL
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "40px 28px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          <div style={{ background: "#FDFCFA", borderRadius: 12, border: "1px solid rgba(26,35,50,.1)", padding: "24px" }}>

            {/* DNI */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter',sans-serif", display: "block", marginBottom: 6 }}>
                Número de DNI
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={dniLimpio}
                onChange={e => setDni(e.target.value)}
                placeholder="ej: 31645431"
                style={INP}
                autoFocus
              />
            </div>

            {/* Género */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter',sans-serif", display: "block", marginBottom: 8 }}>
                Género
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ v: "M", label: "Masculino" }, { v: "F", label: "Femenino" }].map(({ v, label }) => (
                  <button key={v} onClick={() => setGenero(v)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 8, border: "none",
                    background: genero === v ? C.dark : "rgba(26,35,50,.07)",
                    color: genero === v ? "#FDFCFA" : C.dark,
                    fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultado */}
            {cuitFormateado ? (
              <div style={{ background: "rgba(58,124,165,.07)", borderRadius: 10, padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: C.muted, fontFamily: "'Montserrat',sans-serif", marginBottom: 8 }}>
                  CUIT / CUIL
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, color: C.dark, fontFamily: "'Montserrat',sans-serif", letterSpacing: ".05em", marginBottom: 16 }}>
                  {cuitFormateado}
                </div>
                <button onClick={copiar} style={{
                  padding: "8px 24px", borderRadius: 8, border: "none",
                  background: copiado ? "#27ae60" : C.dark,
                  color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background .2s",
                }}>
                  {copiado ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            ) : (
              <div style={{ background: "rgba(26,35,50,.04)", borderRadius: 10, padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: C.muted, fontFamily: "'Inter',sans-serif" }}>
                  Ingresá el DNI para calcular
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "rgba(26,35,50,.04)" }}>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", lineHeight: 1.7 }}>
              • Prefijo 20/23 para masculino · 27/24 para femenino<br />
              • Para empresas (SA, SRL, etc.) el prefijo es 30 o 33 y no se calcula por DNI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
