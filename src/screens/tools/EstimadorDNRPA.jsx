import { useState, useRef, useEffect, useCallback } from "react";
import { C, inp } from "../../constants";

const ARANCEL_DNRPA  = 0.01;
const ARANCEL_NRO1   = 1300;   // Res. 314/02 — siempre incluido
const SELLOS = { particulares: 0.0125, habitualista: 0.01 };

const OPCIONALES = [
  { id: "verificacion", label: "Verificación policial", valor: 37000, nota: "Vehículos 2–12 años. Varía por jurisdicción.", on: true  },
  { id: "gestoria",     label: "Gestoría / mandatario", valor: 75000, nota: "Opcional. Variable según gestor y zona.",        on: false },
];

const fmt = n => n == null ? "—" : "$ " + Math.round(n).toLocaleString("es-AR");
function parseMonto(s) {
  const n = parseFloat(String(s).replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Label({ children, sub }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, fontFamily: "'Montserrat',sans-serif" }}>
        {children}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", marginTop: 2 }}>
        {sub}
      </div>}
    </div>
  );
}

function SecTitle({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase",
      color: "rgba(26,35,50,.4)", fontFamily: "'Montserrat',sans-serif", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function ResultRow({ label, sub, valor, bold, muted }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "9px 0", borderBottom: "1px solid rgba(26,35,50,.05)" }}>
      <div>
        <div style={{ fontSize: 13, color: muted ? C.muted : C.dark,
          fontFamily: "'Inter',sans-serif", fontWeight: bold ? 700 : 400 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif",
          marginTop: 1 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: muted ? C.muted : C.dark,
        fontFamily: "'Montserrat',sans-serif", flexShrink: 0, marginLeft: 12 }}>{valor}</span>
    </div>
  );
}

// ── Upload / Scriba ────────────────────────────────────────────────────────────

function UploadZone({ onVehiculo, escaneando, setEscaneando }) {
  const ref = useRef();

  async function procesar(file) {
    if (!file?.type.startsWith("image/")) return;
    setEscaneando(true);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch("/api/vision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: { data: b64, mediaType: file.type } }),
      });
      const d = await resp.json();
      onVehiculo(d?.tipo_documento === "tarjeta_verde" && d.vehiculo ? d.vehiculo : null);
    } catch { onVehiculo(null); }
    finally { setEscaneando(false); }
  }

  return (
    <div
      onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) procesar(e.dataTransfer.files[0]); }}
      onDragOver={e => e.preventDefault()}
      onClick={() => !escaneando && ref.current.click()}
      style={{ border: "1.5px dashed rgba(26,35,50,.18)", borderRadius: 10, padding: "18px 16px",
        textAlign: "center", cursor: escaneando ? "wait" : "pointer",
        background: "#FDFCFA", transition: "border-color .15s" }}
      onMouseEnter={e => { if (!escaneando) e.currentTarget.style.borderColor = C.cerulean; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(26,35,50,.18)"; }}
    >
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => e.target.files[0] && procesar(e.target.files[0])} />
      {escaneando ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, border: `3px solid rgba(58,124,165,.2)`,
            borderTopColor: C.cerulean, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
          <span style={{ fontSize: 13, color: C.cerulean, fontFamily: "'Inter',sans-serif" }}>
            Leyendo documento...
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.cerulean}
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, fontFamily: "'Montserrat',sans-serif" }}>
            Escaneá la tarjeta verde o título
          </span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif" }}>
            Scriba lee los datos del vehículo automáticamente
          </span>
        </div>
      )}
    </div>
  );
}

function VehiculoCard({ v, onClear, onAnio }) {
  const titulo = [v.marca, v.modelo].filter(Boolean).join(" ") || "Vehículo detectado";
  const chips = [
    v.anio     && { label: "Año",     valor: v.anio,                warn: !v.anio },
    v.dominio  && { label: "Dominio", valor: v.dominio },
    v.tipo_desc && { label: "Tipo",   valor: v.tipo_desc },
    v.color    && { label: "Color",   valor: v.color },
  ].filter(Boolean);
  const extras = [
    v.chasis && { label: "Chasis", valor: v.chasis },
    v.motor  && { label: "Motor",  valor: v.motor  },
  ].filter(Boolean);

  return (
    <div style={{ background: "rgba(58,124,165,.06)", border: "1px solid rgba(58,124,165,.2)",
      borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(58,124,165,.12)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.cerulean}
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="2"/>
            <path d="M16 8h4l3 3v5h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark,
            fontFamily: "'Montserrat',sans-serif" }}>{titulo}</div>

          {/* chips principales */}
          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {chips.map(({ label, valor }) => (
                <div key={label} style={{ background: "#FDFCFA", border: "1px solid rgba(58,124,165,.2)",
                  borderRadius: 6, padding: "3px 9px", display: "flex", gap: 5, alignItems: "baseline" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: ".05em", color: C.muted, fontFamily: "'Montserrat',sans-serif" }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.dark,
                    fontFamily: "'Montserrat',sans-serif" }}>{valor}</span>
                </div>
              ))}
            </div>
          )}

          {/* chasis / motor */}
          {extras.length > 0 && (
            <div style={{ marginTop: 7, display: "flex", flexDirection: "column", gap: 2 }}>
              {extras.map(({ label, valor }) => (
                <div key={label} style={{ fontSize: 10, color: C.muted,
                  fontFamily: "'Inter',sans-serif" }}>
                  <span style={{ fontWeight: 700 }}>{label}:</span> {valor}
                </div>
              ))}
            </div>
          )}

          {!v.anio && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#c0392b", fontFamily: "'Inter',sans-serif",
                flexShrink: 0 }}>⚠ Año no detectado:</span>
              <input
                type="number" min="1990" max="2026" placeholder="ej: 2010"
                onChange={e => onAnio && onAnio(e.target.value)}
                style={{ ...inp, width: 90, padding: "5px 10px",
                  borderColor: "rgba(192,57,43,.35)", fontSize: 13 }}
              />
            </div>
          )}
        </div>
        <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer",
          color: "rgba(26,35,50,.3)", fontSize: 20, lineHeight: 1, padding: 4, flexShrink: 0 }}>×</button>
      </div>
    </div>
  );
}

// ── Valor tabla DNRPA: búsqueda o manual ──────────────────────────────────────

function TablaField({ vehiculo, anio, tablaDNRPA, setTablaDNRPA, tablaOrigen, setTablaOrigen }) {
  const [buscando, setBuscando] = useState(false);
  const [busquedaQ, setBusquedaQ] = useState("");
  const [opciones, setOpciones] = useState([]);
  const [dropAbierto, setDropAbierto] = useState(false);
  const wrapRef = useRef();

  // Auto-lookup cuando llega vehiculo desde Scriba o cuando se ingresa el año manualmente
  useEffect(() => {
    if (!vehiculo) return;
    const q = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ");
    const a = vehiculo.anio ? String(vehiculo.anio) : anio;
    if (q && a) autoLookup(q, a);
  }, [vehiculo?.marca, vehiculo?.modelo, vehiculo?.anio]);

  async function autoLookup(q, a) {
    setBuscando(true);
    try {
      const r    = await fetch(`/api/dnrpa-valuacion?q=${encodeURIComponent(q)}&anio=${a}`);
      const data = await r.json();
      const best = Array.isArray(data) ? data.find(d => d.valor) : null;
      if (best?.valor) {
        setTablaDNRPA(String(best.valor));
        setTablaOrigen({ tipo: "auto", label: `${best.marca} ${best.modelo}` });
      } else {
        setTablaOrigen({ tipo: "notfound" });
      }
    } catch {
      setTablaOrigen({ tipo: "notfound" });
    } finally {
      setBuscando(false);
    }
  }

  // Búsqueda manual con autocomplete
  const buscarOpciones = useCallback(debounce(async (q) => {
    if (!q || q.length < 2) { setOpciones([]); return; }
    try {
      const a   = anio || (vehiculo?.anio ? String(vehiculo.anio) : "");
      const url = `/api/dnrpa-valuacion?q=${encodeURIComponent(q)}${a ? `&anio=${a}` : ""}`;
      const r   = await fetch(url);
      const d   = await r.json();
      setOpciones(Array.isArray(d) ? d : []);
      setDropAbierto(true);
    } catch { setOpciones([]); }
  }, 350), [anio, vehiculo]);

  useEffect(() => { buscarOpciones(busquedaQ); }, [busquedaQ, buscarOpciones]);

  useEffect(() => {
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setDropAbierto(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  function seleccionar(op) {
    setDropAbierto(false);
    setBusquedaQ("");
    if (op.valor) {
      setTablaDNRPA(String(op.valor));
      setTablaOrigen({ tipo: "auto", label: `${op.marca} ${op.modelo}` });
    }
  }

  // ── Render según estado ──────────────────────────────────────────────────────

  if (buscando) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        background: "rgba(58,124,165,.04)", border: "1px solid rgba(58,124,165,.15)", borderRadius: 8 }}>
        <div style={{ width: 16, height: 16, border: "2px solid rgba(58,124,165,.2)",
          borderTopColor: C.cerulean, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: C.cerulean, fontFamily: "'Inter',sans-serif" }}>
          Buscando valor de tabla DNRPA...
        </span>
      </div>
    );
  }

  if (tablaOrigen?.tipo === "auto" && tablaDNRPA) {
    return (
      <div style={{ background: "rgba(39,174,96,.05)", border: "1px solid rgba(39,174,96,.25)",
        borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#27ae60", fontWeight: 700,
              fontFamily: "'Montserrat',sans-serif", marginBottom: 2 }}>
              ✓ Valor de tabla encontrado
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.dark,
              fontFamily: "'Montserrat',sans-serif" }}>{fmt(parseMonto(tablaDNRPA))}</div>
          </div>
          <button onClick={() => { setTablaDNRPA(""); setTablaOrigen(null); }}
            style={{ fontSize: 11, color: C.muted, background: "none", border: "1px solid rgba(26,35,50,.12)",
              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  // Not found o vacío
  return (
    <div ref={wrapRef}>
      {tablaOrigen?.tipo === "notfound" && (
        <div style={{ background: "rgba(201,169,97,.08)", border: "1px solid rgba(201,169,97,.3)",
          borderRadius: "8px 8px 0 0", padding: "10px 14px", borderBottom: "none" }}>
          <div style={{ fontSize: 12, color: "#a07c30", fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
            ⚠ No encontramos este vehículo en nuestra tabla.{" "}
            <a href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador" target="_blank" rel="noopener noreferrer"
              style={{ color: C.cerulean, fontWeight: 600, textDecoration: "none" }}>
              Consultá el estimador oficial →
            </a>{" "}y pegá el valor de tabla acá.
          </div>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          value={tablaDNRPA || busquedaQ}
          onChange={e => {
            const val = e.target.value;
            // Si parece un número → es el valor manual
            if (/^[\d.,\s]*$/.test(val)) {
              setTablaDNRPA(val);
              setBusquedaQ("");
              setTablaOrigen(null);
            } else {
              // Es texto → búsqueda autocomplete
              setBusquedaQ(val);
              setTablaDNRPA("");
              setTablaOrigen(null);
            }
          }}
          placeholder={tablaOrigen?.tipo === "notfound"
            ? "Ingresá el valor de tabla o buscá el modelo..."
            : "Ingresá el valor o buscá el modelo (ej: volkswagen gol)"}
          style={{
            ...inp,
            borderRadius: tablaOrigen?.tipo === "notfound" ? "0 0 8px 8px" : 8,
            borderColor: tablaOrigen?.tipo === "notfound" ? "rgba(201,169,97,.4)" : "rgba(26,35,50,.14)",
          }}
        />

        {dropAbierto && opciones.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
            background: "#FDFCFA", border: "1px solid rgba(26,35,50,.12)", borderRadius: 8,
            boxShadow: "0 4px 16px rgba(26,35,50,.1)", overflow: "hidden" }}>
            {opciones.map(op => (
              <button key={op.mtm} onClick={() => seleccionar(op)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", padding: "10px 14px", background: "transparent", border: "none",
                  borderBottom: "1px solid rgba(26,35,50,.05)", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(58,124,165,.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.dark,
                    fontFamily: "'Montserrat',sans-serif" }}>{op.marca} {op.modelo}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif",
                    marginTop: 1 }}>{op.tipo_desc}</div>
                </div>
                {op.valor && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.dark,
                    fontFamily: "'Montserrat',sans-serif", flexShrink: 0, marginLeft: 12 }}>
                    {fmt(op.valor)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function EstimadorDNRPA({ onBack }) {
  const [tipo, setTipo]           = useState("particulares");
  const [precioVenta, setPrecio]  = useState("");
  const [tablaDNRPA, setTabla]    = useState("");
  const [tablaOrigen, setOrigen]  = useState(null);
  const [tablaATM, setTablaATM]   = useState("");
  const [opcionales, setOpc]      = useState(
    Object.fromEntries(OPCIONALES.map(o => [o.id, { on: o.on, valor: o.valor }]))
  );
  const [vehiculo, setVehiculo]   = useState(null);
  const [escaneando, setEsc]      = useState(false);
  const [scanError, setScanErr]   = useState(false);
  const [resultado, setResultado] = useState(null);

  const anioVehiculo = vehiculo?.anio ? String(vehiculo.anio) : "";

  function handleVehiculo(v) {
    setVehiculo(v);
    setScanErr(!v);
    if (!v) { setTabla(""); setOrigen(null); }
  }

  const toggleOpc = id => setOpc(p => ({ ...p, [id]: { ...p[id], on: !p[id].on } }));
  const setOpcValor = (id, val) => {
    const n = parseInt(val.replace(/\D/g, "")) || 0;
    setOpc(p => ({ ...p, [id]: { ...p[id], valor: n } }));
  };

  function calcular() {
    const precio = parseMonto(precioVenta);
    if (!precio) return;

    const tablaD  = tablaDNRPA ? parseMonto(tablaDNRPA) : 0;
    const baseD   = tablaD ? Math.max(precio, tablaD) : precio;
    const baseA   = tablaATM ? Math.max(precio, parseMonto(tablaATM)) : baseD;

    const arancelDNRPA = baseD * ARANCEL_DNRPA;
    const sellosMza    = baseA * SELLOS[tipo];

    const extras = OPCIONALES
      .filter(o => opcionales[o.id].on)
      .map(o => ({ label: o.label, valor: opcionales[o.id].valor }));

    setResultado({
      precio, baseD, baseA, tablaD,
      arancelDNRPA, sellosMza, extras,
      total: arancelDNRPA + sellosMza + ARANCEL_NRO1 + extras.reduce((s, x) => s + x.valor, 0),
      tasaSellos: SELLOS[tipo] * 100, tipo,
    });
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ed" }}>

        {/* Header */}
        <div style={{ background: C.dark, padding: "0 24px", height: 52, display: "flex",
          alignItems: "center", gap: 16, flexShrink: 0 }}>
          <button onClick={onBack} style={{ background: "transparent", border: "none",
            color: "rgba(253,252,250,.6)", cursor: "pointer", fontSize: 13, fontFamily: "'Inter',sans-serif" }}>
            ← Utilidades
          </button>
          <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14 }}>
            Estimador DNRPA
          </span>
          <span style={{ fontSize: 10, background: "rgba(58,124,165,.25)", color: "#7bbde0",
            padding: "2px 9px", borderRadius: 10, fontFamily: "'Montserrat',sans-serif",
            fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>
            Mendoza
          </span>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* 1. Documento */}
            <section>
              <SecTitle>Vehículo</SecTitle>
              {vehiculo ? (
                <VehiculoCard
                  v={vehiculo}
                  onClear={() => handleVehiculo(null)}
                  onAnio={a => setVehiculo(prev => ({ ...prev, anio: a }))}
                />
              ) : (
                <>
                  <UploadZone onVehiculo={handleVehiculo} escaneando={escaneando} setEscaneando={setEsc} />
                  {scanError && (
                    <p style={{ fontSize: 11, color: "#c0392b", fontFamily: "'Inter',sans-serif",
                      marginTop: 6, textAlign: "center" }}>
                      No se pudo leer el documento. Intentá con otra foto.
                    </p>
                  )}
                </>
              )}
            </section>

            {/* 2. Tipo */}
            <section>
              <SecTitle>Tipo de transferencia</SecTitle>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  ["particulares", "Entre particulares",        "Sellos: 1,25%"],
                  ["habitualista", "Desde habitualista inscripto", "Sellos: 1%"],
                ].map(([k, lbl, sub]) => (
                  <button key={k} onClick={() => setTipo(k)}
                    style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid",
                      borderColor: tipo === k ? C.cerulean : "rgba(26,35,50,.12)",
                      background: tipo === k ? "rgba(58,124,165,.06)" : "#FDFCFA", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12,
                      color: tipo === k ? C.cerulean : C.dark }}>{lbl}</div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Precio */}
            <section>
              <Label sub="El valor que figura en el formulario 08">
                Precio de venta declarado *
              </Label>
              <input value={precioVenta} onChange={e => setPrecio(e.target.value)}
                placeholder="Ej: 4000000" style={{ ...inp }} />
            </section>

            {/* 4. Valor tabla DNRPA */}
            <section>
              <Label sub={
                !tablaDNRPA
                  ? "El DNRPA usa el mayor entre el precio declarado y el valor fiscal del vehículo"
                  : "Base del arancel DNRPA"
              }>
                Valor de tabla DNRPA
              </Label>
              <TablaField
                vehiculo={vehiculo}
                anio={anioVehiculo}
                tablaDNRPA={tablaDNRPA}
                setTablaDNRPA={setTabla}
                tablaOrigen={tablaOrigen}
                setTablaOrigen={setOrigen}
              />
            </section>

            {/* 5. Opcionales */}
            <section>
              <SecTitle>Gastos adicionales</SecTitle>
              {OPCIONALES.map(o => (
                <div key={o.id} style={{ background: "#FDFCFA", border: "1px solid rgba(26,35,50,.08)",
                  borderRadius: 8, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12,
                  marginBottom: 8 }}>
                  <input type="checkbox" checked={opcionales[o.id].on} onChange={() => toggleOpc(o.id)}
                    style={{ width: 16, height: 16, accentColor: C.cerulean, cursor: "pointer", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark,
                      fontFamily: "'Montserrat',sans-serif" }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif",
                      marginTop: 2 }}>{o.nota}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>$</span>
                    <input value={opcionales[o.id].valor.toLocaleString("es-AR")}
                      onChange={e => setOpcValor(o.id, e.target.value)}
                      style={{ ...inp, width: 100, textAlign: "right", padding: "6px 10px" }} />
                  </div>
                </div>
              ))}
            </section>

            {/* Botón */}
            <button onClick={calcular} disabled={!precioVenta.trim()}
              style={{ padding: "13px 0", borderRadius: 10, border: "none",
                background: precioVenta.trim() ? C.dark : "rgba(26,35,50,.2)",
                color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14,
                cursor: precioVenta.trim() ? "pointer" : "default", letterSpacing: ".02em" }}>
              Calcular
            </button>

            {/* Resultado */}
            {resultado && (
              <div style={{ background: "#FDFCFA", border: "1px solid rgba(26,35,50,.12)",
                borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>

                <div style={{ background: C.dark, padding: "14px 20px" }}>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13,
                    color: "#FDFCFA" }}>Estimación de costos</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                    color: "rgba(253,252,250,.5)", marginTop: 2 }}>
                    {vehiculo ? `${[vehiculo.marca,vehiculo.modelo].filter(Boolean).join(" ")}${vehiculo.anio ? ` (${vehiculo.anio})` : ""} · ` : ""}
                    {resultado.tipo === "particulares" ? "Entre particulares" : "Habitualista"} · Mendoza · 2025
                  </div>
                </div>

                <div style={{ padding: "4px 20px 8px" }}>
                  <ResultRow
                    label="Arancel DNRPA (1%)"
                    sub={resultado.tablaD && resultado.tablaD > resultado.precio
                      ? `base: ${fmt(resultado.baseD)} (tabla DNRPA)`
                      : `base: ${fmt(resultado.precio)} (precio declarado)`}
                    valor={fmt(resultado.arancelDNRPA)}
                  />
                  <ResultRow
                    label={`Impuesto de sellos Mendoza (${resultado.tasaSellos}%)`}
                    sub={`base: ${fmt(resultado.baseA)}`}
                    valor={fmt(resultado.sellosMza)}
                  />
                  <ResultRow
                    label="Arancel Nro. 1 (Res. 314/02)"
                    sub="Cargo fijo del registro seccional"
                    valor={fmt(ARANCEL_NRO1)}
                  />
                  {resultado.extras.map(x => (
                    <ResultRow key={x.label} label={x.label} valor={fmt(x.valor)} />
                  ))}

                  <div style={{ height: 1, background: "rgba(26,35,50,.1)", margin: "10px 0 4px" }} />
                  <ResultRow label="Total estimado" valor={fmt(resultado.total)} bold />
                </div>

                {!resultado.tablaD && (
                  <div style={{ margin: "0 20px 12px", padding: "10px 12px",
                    background: "rgba(201,169,97,.08)", border: "1px solid rgba(201,169,97,.25)",
                    borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: "#a07c30", fontFamily: "'Inter',sans-serif",
                      margin: 0, lineHeight: 1.5 }}>
                      ⚠ El arancel se calculó sobre el precio declarado porque no se ingresó el valor de tabla DNRPA.{" "}
                      <a href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador" target="_blank"
                        rel="noopener noreferrer" style={{ color: C.cerulean, fontWeight: 600, textDecoration: "none" }}>
                        Verificar en el estimador oficial →
                      </a>
                    </p>
                  </div>
                )}

                <div style={{ padding: "8px 20px 14px", background: "rgba(26,35,50,.02)",
                  borderTop: "1px solid rgba(26,35,50,.06)" }}>
                  <p style={{ fontSize: 10, color: C.muted, fontFamily: "'Inter',sans-serif",
                    lineHeight: 1.6, margin: 0 }}>
                    Estimación no oficial basada en tabla DNRPA 2026. Res. MJ 273/2024 — arancel 1% · Ley Mendoza 9597/2024 — sellos {resultado.tasaSellos}%.{" "}
                    <a href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador" target="_blank" rel="noopener noreferrer"
                      style={{ color: C.cerulean, textDecoration: "none", fontWeight: 600 }}>
                      Consultá valores oficiales en el DNRPA →
                    </a>
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
