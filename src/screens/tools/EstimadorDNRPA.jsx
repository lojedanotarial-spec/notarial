import { useState, useRef, useEffect, useCallback } from "react";
import { C, inp } from "../../constants";

const ARANCEL_DNRPA = 0.01;
const ARANCEL_NRO1  = 1300;
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

// ── Helpers UI ─────────────────────────────────────────────────────────────────

function SecTitle({ children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase",
        color: "rgba(26,35,50,.4)", fontFamily: "'Montserrat',sans-serif" }}>
        {children}
      </div>
      {action}
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
        {sub && <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", marginTop: 1 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: muted ? C.muted : C.dark,
        fontFamily: "'Montserrat',sans-serif", flexShrink: 0, marginLeft: 12 }}>{valor}</span>
    </div>
  );
}

// ── Botón escanear (cámara) ────────────────────────────────────────────────────

function ScanButton({ onScanned, escaneando, setEscaneando }) {
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
      onScanned(d?.tipo_documento === "tarjeta_verde" && d.vehiculo ? d.vehiculo : null);
    } catch { onScanned(null); }
    finally { setEscaneando(false); }
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => e.target.files[0] && procesar(e.target.files[0])} />
      <button
        onClick={() => !escaneando && ref.current.click()}
        title="Escanear tarjeta verde o título"
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
          background: escaneando ? "rgba(58,124,165,.08)" : "#FDFCFA",
          border: "1px solid rgba(58,124,165,.3)", borderRadius: 7, cursor: escaneando ? "wait" : "pointer" }}>
        {escaneando ? (
          <div style={{ width: 13, height: 13, border: "2px solid rgba(58,124,165,.2)",
            borderTopColor: C.cerulean, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.cerulean}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: C.cerulean,
          fontFamily: "'Montserrat',sans-serif" }}>
          {escaneando ? "Leyendo..." : "Escanear doc"}
        </span>
      </button>
    </>
  );
}

// ── Valor tabla DNRPA ─────────────────────────────────────────────────────────

function TablaField({ q, anio, tablaDNRPA, setTablaDNRPA, tablaOrigen, setTablaOrigen }) {
  const [buscando, setBuscando]     = useState(false);
  const [busquedaQ, setBusquedaQ]   = useState("");
  const [opciones, setOpciones]     = useState([]);
  const [dropAbierto, setDropAbierto] = useState(false);
  const wrapRef = useRef();

  // Auto-lookup cuando q (marca+modelo) y anio (4 dígitos) están completos
  useEffect(() => {
    if (q && /^\d{4}$/.test(anio)) autoLookup(q, anio);
  }, [q, anio]);

  async function autoLookup(query, year) {
    setBuscando(true);
    setTablaOrigen(null);
    try {
      const r    = await fetch(`/api/dnrpa-valuacion?q=${encodeURIComponent(query)}&anio=${year}`);
      const data = await r.json();
      if (!Array.isArray(data) || data.length === 0) {
        // modelo no existe en la tabla
        setTablaDNRPA("");
        setTablaOrigen({ tipo: "notfound" });
        return;
      }
      const best = data.find(d => d.valor);
      if (best?.valor) {
        setTablaDNRPA(String(best.valor));
        setTablaOrigen({
          tipo: "auto",
          label: `${best.marca} ${best.modelo}`,
          anioUsado: best.anioUsado,
          esFallback: best.esFallback,
          anio: year,
        });
      } else {
        const found = data[0];
        setTablaDNRPA("");
        setTablaOrigen({ tipo: "sinvalor", label: `${found.marca} ${found.modelo}`, anio: year });
      }
    } catch {
      setTablaOrigen({ tipo: "notfound" });
    } finally {
      setBuscando(false);
    }
  }

  const buscarOpciones = useCallback(debounce(async (text) => {
    if (!text || text.length < 2) { setOpciones([]); return; }
    try {
      const url = `/api/dnrpa-valuacion?q=${encodeURIComponent(text)}${anio ? `&anio=${anio}` : ""}`;
      const r   = await fetch(url);
      const d   = await r.json();
      setOpciones(Array.isArray(d) ? d : []);
      setDropAbierto(true);
    } catch { setOpciones([]); }
  }, 350), [anio]);

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

  if (buscando) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
        background: "rgba(58,124,165,.04)", border: "1px solid rgba(58,124,165,.15)", borderRadius: 8 }}>
        <div style={{ width: 14, height: 14, border: "2px solid rgba(58,124,165,.2)",
          borderTopColor: C.cerulean, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: C.cerulean, fontFamily: "'Inter',sans-serif" }}>
          Buscando en tabla DNRPA...
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
            <div style={{ fontSize: 11, color: "#27ae60", fontWeight: 700,
              fontFamily: "'Montserrat',sans-serif", marginBottom: 3 }}>
              ✓ Encontrado en tabla DNRPA
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.dark,
              fontFamily: "'Montserrat',sans-serif" }}>{fmt(parseMonto(tablaDNRPA))}</div>
            {tablaOrigen.esFallback && (
              <div style={{ fontSize: 10, color: "#a07c30", fontFamily: "'Inter',sans-serif", marginTop: 3 }}>
                ⚠ El PDF no tiene valor para {tablaOrigen.anio} — se usó el año más cercano disponible ({tablaOrigen.anioUsado}).{" "}
                <a href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador" target="_blank"
                  rel="noopener noreferrer" style={{ color: C.cerulean, textDecoration: "none", fontWeight: 600 }}>
                  Verificar →
                </a>
              </div>
            )}
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

  return (
    <div ref={wrapRef}>
      {tablaOrigen?.tipo === "sinvalor" && (
        <div style={{ background: "rgba(201,169,97,.08)", border: "1px solid rgba(201,169,97,.3)",
          borderRadius: "8px 8px 0 0", padding: "9px 14px", borderBottom: "none" }}>
          <div style={{ fontSize: 11, color: "#a07c30", fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
            ⚠ <strong>{tablaOrigen.label}</strong> está en nuestra tabla pero sin valor para {tablaOrigen.anio}.{" "}
            <a href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador" target="_blank" rel="noopener noreferrer"
              style={{ color: C.cerulean, fontWeight: 600, textDecoration: "none" }}>
              Consultá el estimador oficial →
            </a>{" "}e ingresá el valor acá.
          </div>
        </div>
      )}
      {tablaOrigen?.tipo === "notfound" && (
        <div style={{ background: "rgba(201,169,97,.08)", border: "1px solid rgba(201,169,97,.3)",
          borderRadius: "8px 8px 0 0", padding: "9px 14px", borderBottom: "none" }}>
          <div style={{ fontSize: 11, color: "#a07c30", fontFamily: "'Inter',sans-serif", lineHeight: 1.5 }}>
            ⚠ Modelo no encontrado en nuestra tabla.{" "}
            <a href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador" target="_blank" rel="noopener noreferrer"
              style={{ color: C.cerulean, fontWeight: 600, textDecoration: "none" }}>
              Consultá el estimador oficial →
            </a>{" "}e ingresá el valor acá.
          </div>
        </div>
      )}
      <div style={{ position: "relative" }}>
        <input
          value={tablaDNRPA || busquedaQ}
          onChange={e => {
            const val = e.target.value;
            if (/^[\d.,\s]*$/.test(val)) {
              setTablaDNRPA(val);
              setBusquedaQ("");
              setTablaOrigen(null);
            } else {
              setBusquedaQ(val);
              setTablaDNRPA("");
              setTablaOrigen(null);
            }
          }}
          placeholder={tablaOrigen?.tipo === "notfound"
            ? "Pegá el valor de tabla o buscá el modelo..."
            : "Se completa automático — o buscá el modelo manualmente"}
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
  // Datos del vehículo — siempre editables
  const [marca, setMarca]         = useState("");
  const [modelo, setModelo]       = useState("");
  const [anio, setAnio]           = useState("");
  const [tipo_desc, setTipoDesc]  = useState("");
  // Datos extra leídos por Scriba (solo informativos)
  const [escaneado, setEscaneado] = useState(null); // { dominio, chasis, motor, color }
  const [escaneando, setEscaneando] = useState(false);
  const [scanError, setScanError]   = useState(false);

  // Operación
  const [tipo, setTipo]         = useState("particulares");
  const [precioVenta, setPrecio] = useState("");

  // Tabla DNRPA
  const [tablaDNRPA, setTabla]   = useState("");
  const [tablaOrigen, setOrigen] = useState(null);

  // Opcionales
  const [opcionales, setOpc] = useState(
    Object.fromEntries(OPCIONALES.map(o => [o.id, { on: o.on, valor: o.valor }]))
  );

  const [resultado, setResultado] = useState(null);

  // q para el auto-lookup: se arma con marca + modelo
  const qLookup = [marca, modelo].filter(Boolean).join(" ");

  function handleScanned(v) {
    if (!v) { setScanError(true); return; }
    setScanError(false);
    if (v.marca)     setMarca(v.marca);
    if (v.modelo)    setModelo(v.modelo);
    if (v.anio)      setAnio(String(v.anio));
    if (v.tipo_desc) setTipoDesc(v.tipo_desc);
    // guardar datos extra para mostrar como referencia
    setEscaneado({
      dominio:   v.dominio   || "",
      tipo_desc: v.tipo_desc || "",
      chasis:    v.chasis    || "",
      motor:     v.motor     || "",
      color:     v.color     || "",
    });
  }

  const toggleOpc   = id  => setOpc(p => ({ ...p, [id]: { ...p[id], on: !p[id].on } }));
  const setOpcValor = (id, val) => {
    const n = parseInt(val.replace(/\D/g, "")) || 0;
    setOpc(p => ({ ...p, [id]: { ...p[id], valor: n } }));
  };

  function calcular() {
    const precio = parseMonto(precioVenta);
    if (!precio) return;
    const tablaD = tablaDNRPA ? parseMonto(tablaDNRPA) : 0;
    const baseD  = tablaD ? Math.max(precio, tablaD) : precio;
    const arancelDNRPA = baseD * ARANCEL_DNRPA;
    const sellosMza    = baseD * SELLOS[tipo];
    const extras = OPCIONALES
      .filter(o => opcionales[o.id].on)
      .map(o => ({ label: o.label, valor: opcionales[o.id].valor }));
    setResultado({
      precio, baseD, tablaD, arancelDNRPA, sellosMza, extras,
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
            color: "rgba(253,252,250,.6)", cursor: "pointer", fontSize: 13,
            fontFamily: "'Inter',sans-serif" }}>
            ← Utilidades
          </button>
          <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif",
            fontWeight: 700, fontSize: 14 }}>Estimador DNRPA</span>
          <span style={{ fontSize: 10, background: "rgba(58,124,165,.25)", color: "#7bbde0",
            padding: "2px 9px", borderRadius: 10, fontFamily: "'Montserrat',sans-serif",
            fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>Mendoza</span>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>

            {/* 1. Vehículo */}
            <section>
              <SecTitle action={
                <ScanButton
                  onScanned={handleScanned}
                  escaneando={escaneando}
                  setEscaneando={setEscaneando}
                />
              }>
                Vehículo
              </SecTitle>

              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.dark, textTransform: "uppercase",
                    letterSpacing: ".05em", fontFamily: "'Montserrat',sans-serif", marginBottom: 5 }}>Marca</div>
                  <input value={marca} onChange={e => { setMarca(e.target.value.toUpperCase()); setTabla(""); setOrigen(null); }}
                    placeholder="Ej: VOLKSWAGEN"
                    style={{ ...inp, border: "1.5px solid rgba(26,35,50,.25)", background: "#fff" }} />
                </div>
                <div style={{ flex: 3 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.dark, textTransform: "uppercase",
                    letterSpacing: ".05em", fontFamily: "'Montserrat',sans-serif", marginBottom: 5 }}>Modelo</div>
                  <input value={modelo} onChange={e => { setModelo(e.target.value.toUpperCase()); setTabla(""); setOrigen(null); }}
                    placeholder="Ej: GOL TREND 1.6"
                    style={{ ...inp, border: "1.5px solid rgba(26,35,50,.25)", background: "#fff" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.dark, textTransform: "uppercase",
                    letterSpacing: ".05em", fontFamily: "'Montserrat',sans-serif", marginBottom: 5 }}>Año</div>
                  <input
                    value={anio}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setAnio(val);
                      if (val.length < 4) { setTabla(""); setOrigen(null); }
                    }}
                    placeholder="2010"
                    maxLength={4}
                    style={{ ...inp, textAlign: "center", border: "1.5px solid rgba(26,35,50,.25)", background: "#fff" }}
                  />
                </div>
              </div>

              {/* Tipo de carrocería */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dark, textTransform: "uppercase",
                  letterSpacing: ".05em", fontFamily: "'Montserrat',sans-serif", marginBottom: 5 }}>Tipo</div>
                <input
                  value={tipo_desc}
                  onChange={e => setTipoDesc(e.target.value.toUpperCase())}
                  placeholder="Ej: SEDAN 5 PUERTAS, HATCHBACK, SUV, PICKUP"
                  style={{ ...inp, border: "1.5px solid rgba(26,35,50,.25)", background: "#fff" }}
                />
              </div>

              {/* Datos extra de Scriba */}
              {escaneado && (escaneado.dominio || escaneado.tipo_desc || escaneado.chasis || escaneado.motor || escaneado.color) && (
                <div style={{ background: "rgba(58,124,165,.05)", border: "1px solid rgba(58,124,165,.15)",
                  borderRadius: 8, padding: "9px 12px", display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
                  {[
                    escaneado.dominio   && ["Dominio", escaneado.dominio],
                    escaneado.tipo_desc && ["Tipo",    escaneado.tipo_desc],
                    escaneado.color     && ["Color",   escaneado.color],
                    escaneado.chasis    && ["Chasis",  escaneado.chasis],
                    escaneado.motor     && ["Motor",   escaneado.motor],
                  ].filter(Boolean).map(([label, valor]) => (
                    <div key={label} style={{ display: "flex", gap: 5, alignItems: "baseline" }}>
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

              {scanError && (
                <p style={{ fontSize: 11, color: "#c0392b", fontFamily: "'Inter',sans-serif",
                  marginTop: 6, textAlign: "center" }}>
                  No se pudo leer el documento. Intentá con otra foto.
                </p>
              )}
            </section>

            {/* 2. Tipo */}
            <section>
              <SecTitle>Tipo de transferencia</SecTitle>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  ["particulares", "Entre particulares",           "Sellos: 1,25%"],
                  ["habitualista", "Desde habitualista inscripto", "Sellos: 1%"],
                ].map(([k, lbl, sub]) => (
                  <button key={k} onClick={() => setTipo(k)}
                    style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid",
                      borderColor: tipo === k ? C.cerulean : "rgba(26,35,50,.12)",
                      background: tipo === k ? "rgba(58,124,165,.06)" : "#FDFCFA",
                      cursor: "pointer", textAlign: "left" }}>
                    <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 12,
                      color: tipo === k ? C.cerulean : C.dark }}>{lbl}</div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.muted,
                      marginTop: 2 }}>{sub}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Precio */}
            <section>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted,
                fontFamily: "'Montserrat',sans-serif", marginBottom: 5 }}>
                Precio de venta declarado *
              </div>
              <input value={precioVenta} onChange={e => setPrecio(e.target.value)}
                placeholder="Ej: 4000000" style={{ ...inp }} />
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", marginTop: 4 }}>
                El valor que figura en el formulario 08
              </div>
            </section>

            {/* 4. Valor tabla DNRPA */}
            <section>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted,
                fontFamily: "'Montserrat',sans-serif", marginBottom: 5 }}>
                Valor de tabla DNRPA
              </div>
              <TablaField
                q={qLookup}
                anio={anio}
                tablaDNRPA={tablaDNRPA}
                setTablaDNRPA={setTabla}
                tablaOrigen={tablaOrigen}
                setTablaOrigen={setOrigen}
              />
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", marginTop: 4 }}>
                Base del arancel DNRPA — se busca automático al ingresar marca, modelo y año
              </div>
            </section>

            {/* 5. Opcionales */}
            <section>
              <SecTitle>Gastos adicionales</SecTitle>
              {OPCIONALES.map(o => (
                <div key={o.id} style={{ background: "#FDFCFA", border: "1px solid rgba(26,35,50,.08)",
                  borderRadius: 8, padding: "11px 14px", display: "flex", alignItems: "center",
                  gap: 12, marginBottom: 8 }}>
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

            {/* Botón calcular */}
            <button onClick={calcular} disabled={!precioVenta.trim()}
              style={{ padding: "13px 0", borderRadius: 10, border: "none",
                background: precioVenta.trim() ? C.dark : "rgba(26,35,50,.2)",
                color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700,
                fontSize: 14, cursor: precioVenta.trim() ? "pointer" : "default",
                letterSpacing: ".02em" }}>
              Calcular
            </button>

            {/* Resultado */}
            {resultado && (
              <div style={{ background: "#FDFCFA", border: "1px solid rgba(26,35,50,.12)",
                borderRadius: 12, overflow: "hidden", marginBottom: 32 }}>

                <div style={{ background: C.dark, padding: "14px 20px" }}>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700,
                    fontSize: 13, color: "#FDFCFA" }}>Estimación de costos</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                    color: "rgba(253,252,250,.5)", marginTop: 2 }}>
                    {[marca, modelo].filter(Boolean).join(" ")}
                    {anio ? ` (${anio})` : ""}{" · "}
                    {resultado.tipo === "particulares" ? "Entre particulares" : "Habitualista"}{" · "}
                    Mendoza · 2026
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
                    sub={`base: ${fmt(resultado.baseD)}`}
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
                      ⚠ No se ingresó el valor de tabla DNRPA — el arancel se calculó sobre el precio
                      declarado y puede ser menor al real.{" "}
                      <a href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador" target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: C.cerulean, fontWeight: 600, textDecoration: "none" }}>
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
                    <a href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador" target="_blank"
                      rel="noopener noreferrer"
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
