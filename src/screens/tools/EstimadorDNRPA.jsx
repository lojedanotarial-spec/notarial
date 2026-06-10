import { useState, useRef, useEffect, useCallback } from "react";
import { C, inp } from "../../constants";

const ARANCEL_DNRPA = 0.01;
const SELLOS = { particulares: 0.0125, habitualista: 0.01 };
const GASTOS_DEF = [
  { id: "arancel1",     label: "Arancel Nro. 1 (Res. 314/02)", valor: 1300,  nota: "Cargo fijo del registro seccional.", on: true },
  { id: "verificacion", label: "Verificación policial",         valor: 37000, nota: "Vehículos de 2 a 12 años. Varía por jurisdicción.", on: true },
  { id: "gestoria",     label: "Gestoría / mandatario",         valor: 75000, nota: "Opcional. Variable según gestor y zona.", on: false },
];

const fmt = n => n == null ? "—" : "$ " + Math.round(n).toLocaleString("es-AR");
function parseMonto(str) {
  const n = parseFloat(String(str).replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

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
      {hint && <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif",
        lineHeight: 1.4, display: "block" }}>{hint}</span>}
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
        {base && <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif",
          marginLeft: 8 }}>{base}</span>}
      </div>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: C.dark,
        fontFamily: "'Montserrat',sans-serif", flexShrink: 0 }}>{valor}</span>
    </div>
  );
}

// ── Upload / Scriba ────────────────────────────────────────────────────────────

function UploadZone({ onVehiculo, escaneando, setEscaneando }) {
  const inputRef = useRef();

  async function procesar(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setEscaneando(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: { data: base64, mediaType: file.type } }),
      });
      const datos = await resp.json();
      onVehiculo(datos?.tipo_documento === "tarjeta_verde" && datos.vehiculo ? datos.vehiculo : null);
    } catch {
      onVehiculo(null);
    } finally {
      setEscaneando(false);
    }
  }

  return (
    <div
      onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) procesar(e.dataTransfer.files[0]); }}
      onDragOver={e => e.preventDefault()}
      onClick={() => !escaneando && inputRef.current.click()}
      style={{ border: "1.5px dashed rgba(26,35,50,.2)", borderRadius: 10, padding: "20px 16px",
        textAlign: "center", cursor: escaneando ? "wait" : "pointer",
        background: escaneando ? "rgba(58,124,165,.03)" : "#FDFCFA", transition: "border-color .15s" }}
      onMouseEnter={e => { if (!escaneando) e.currentTarget.style.borderColor = C.cerulean; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(26,35,50,.2)"; }}
    >
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { if (e.target.files[0]) procesar(e.target.files[0]); }} />
      {escaneando ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, border: `3px solid rgba(58,124,165,.2)`,
            borderTopColor: C.cerulean, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
          <span style={{ fontSize: 13, color: C.cerulean, fontFamily: "'Inter',sans-serif" }}>
            Leyendo documento...
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.cerulean}
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, fontFamily: "'Montserrat',sans-serif" }}>
            Cargá la tarjeta verde o título
          </span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif" }}>
            Scriba lee el documento y completa los datos del vehículo
          </span>
        </div>
      )}
    </div>
  );
}

function VehiculoCard({ vehiculo, onClear }) {
  const fields = [
    vehiculo.anio && `${vehiculo.anio}`,
    vehiculo.dominio && `Patente ${vehiculo.dominio}`,
    vehiculo.tipo_desc,
  ].filter(Boolean);

  return (
    <div style={{ background: "rgba(58,124,165,.06)", border: "1px solid rgba(58,124,165,.2)",
      borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(58,124,165,.12)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.cerulean}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2"/>
          <path d="M16 8h4l3 3v5h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, fontFamily: "'Montserrat',sans-serif",
          marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {[vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ") || "Vehículo detectado"}
        </div>
        <div style={{ fontSize: 11, color: C.cerulean, fontFamily: "'Inter',sans-serif" }}>
          {fields.join(" · ")}
        </div>
      </div>
      <button onClick={onClear}
        style={{ background: "none", border: "none", cursor: "pointer",
          color: "rgba(26,35,50,.35)", fontSize: 18, lineHeight: 1, padding: 4 }}
        title="Limpiar">×</button>
    </div>
  );
}

// ── Autocomplete búsqueda DNRPA ────────────────────────────────────────────────

function BusquedaDNRPA({ anio, onSelect }) {
  const [texto, setTexto]       = useState("");
  const [opciones, setOpciones] = useState([]);
  const [abierto, setAbierto]   = useState(false);
  const [buscando, setBuscando] = useState(false);
  const wrapRef = useRef();

  const buscar = useCallback(debounce(async (q) => {
    if (!q || q.length < 2) { setOpciones([]); return; }
    setBuscando(true);
    try {
      const params = new URLSearchParams({ q });
      if (anio) params.set("anio", anio);
      const r = await fetch(`/api/dnrpa-valuacion?${params}`);
      const data = await r.json();
      setOpciones(Array.isArray(data) ? data : []);
      setAbierto(true);
    } catch {
      setOpciones([]);
    } finally {
      setBuscando(false);
    }
  }, 350), [anio]);

  useEffect(() => {
    buscar(texto);
  }, [texto, buscar]);

  // Cerrar al click fuera
  useEffect(() => {
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  function seleccionar(op) {
    setTexto(`${op.marca} ${op.modelo}`);
    setAbierto(false);
    onSelect(op);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          value={texto}
          onChange={e => { setTexto(e.target.value); setAbierto(true); }}
          onFocus={() => opciones.length && setAbierto(true)}
          placeholder="Ej: Volkswagen Gol Trend"
          style={{ ...inp, paddingRight: buscando ? 36 : undefined }}
        />
        {buscando && (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            width: 16, height: 16, border: "2px solid rgba(58,124,165,.2)",
            borderTopColor: C.cerulean, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
        )}
      </div>

      {abierto && opciones.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "#FDFCFA", border: "1px solid rgba(26,35,50,.12)", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(26,35,50,.12)", overflow: "hidden" }}>
          {opciones.map(op => (
            <button key={op.mtm} onClick={() => seleccionar(op)}
              style={{ display: "flex", flexDirection: "column", width: "100%",
                padding: "10px 14px", background: "transparent", border: "none",
                borderBottom: "1px solid rgba(26,35,50,.05)", cursor: "pointer",
                textAlign: "left", transition: "background .1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(58,124,165,.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.dark,
                fontFamily: "'Montserrat',sans-serif" }}>
                {op.marca} {op.modelo}
              </span>
              <span style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif", marginTop: 2 }}>
                {op.tipo_desc}
                {op.valor ? ` · ${fmt(op.valor)}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {abierto && !buscando && texto.length >= 2 && opciones.length === 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
          background: "#FDFCFA", border: "1px solid rgba(26,35,50,.12)", borderRadius: 8,
          padding: "12px 14px", boxShadow: "0 4px 16px rgba(26,35,50,.12)" }}>
          <span style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter',sans-serif" }}>
            Sin resultados — la tabla se actualiza mensualmente.
          </span>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function EstimadorDNRPA({ onBack }) {
  const [tipo, setTipo]             = useState("particulares");
  const [precioVenta, setPrecioVenta] = useState("");
  const [tablaDNRPA, setTablaDNRPA]   = useState("");
  const [tablaATM, setTablaATM]       = useState("");
  const [tablaOrigen, setTablaOrigen] = useState(null); // "auto" | null
  const [anioVehiculo, setAnioVehiculo] = useState("");
  const [gastos, setGastos]           = useState(
    Object.fromEntries(GASTOS_DEF.map(g => [g.id, { on: g.on, valor: g.valor }]))
  );
  const [vehiculo, setVehiculo]       = useState(null);
  const [escaneando, setEscaneando]   = useState(false);
  const [scanError, setScanError]     = useState(false);
  const [buscandoTabla, setBuscandoTabla] = useState(false);
  const [resultado, setResultado]     = useState(null);

  // Cuando Scriba escanea un vehículo → auto-buscar valor de tabla
  useEffect(() => {
    if (!vehiculo) return;
    if (vehiculo.anio) setAnioVehiculo(String(vehiculo.anio));

    const marca  = vehiculo.marca  || "";
    const modelo = vehiculo.modelo || "";
    const anio   = vehiculo.anio   || "";

    if (marca && modelo && anio) {
      autoLookup(`${marca} ${modelo}`, String(anio));
    }
  }, [vehiculo]);

  async function autoLookup(q, anio) {
    setBuscandoTabla(true);
    try {
      const params = new URLSearchParams({ q, anio });
      const r    = await fetch(`/api/dnrpa-valuacion?${params}`);
      const data = await r.json();
      const best = Array.isArray(data) ? data.find(d => d.valor) : null;
      if (best?.valor) {
        setTablaDNRPA(String(best.valor));
        setTablaOrigen("auto");
      }
    } catch {
      // silencioso — el usuario puede ingresar manualmente
    } finally {
      setBuscandoTabla(false);
    }
  }

  function handleVehiculo(v) {
    setVehiculo(v);
    setScanError(!v);
    if (!v) { setTablaDNRPA(""); setTablaOrigen(null); setAnioVehiculo(""); }
  }

  const toggleGasto = id => setGastos(p => ({ ...p, [id]: { ...p[id], on: !p[id].on } }));
  const setGastoValor = (id, val) => {
    const n = parseInt(val.replace(/\D/g, "")) || 0;
    setGastos(p => ({ ...p, [id]: { ...p[id], valor: n } }));
  };

  function calcular() {
    const precio = parseMonto(precioVenta);
    if (!precio) return;
    const baseD = tablaDNRPA ? Math.max(precio, parseMonto(tablaDNRPA)) : precio;
    const baseA = tablaATM   ? Math.max(precio, parseMonto(tablaATM))   : baseD;
    const arancelDNRPA = baseD * ARANCEL_DNRPA;
    const sellosMza    = baseA * SELLOS[tipo];
    const gastosLineas = GASTOS_DEF
      .filter(g => gastos[g.id].on)
      .map(g => ({ label: g.label, valor: gastos[g.id].valor }));
    const totalGastos = gastosLineas.reduce((s, g) => s + g.valor, 0);
    setResultado({
      precio, baseD, baseA, arancelDNRPA, sellosMza, gastosLineas,
      total: arancelDNRPA + sellosMza + totalGastos,
      tasaSellos: SELLOS[tipo] * 100, tipo,
    });
  }

  const puedeCalcular = precioVenta.trim() && !escaneando && !buscandoTabla;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
            padding: "2px 9px", borderRadius: 10, fontFamily: "'Montserrat',sans-serif",
            fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>
            Mendoza
          </span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Upload */}
            <section>
              <SectionTitle>Documento del vehículo</SectionTitle>
              {vehiculo ? (
                <VehiculoCard vehiculo={vehiculo} onClear={() => handleVehiculo(null)} />
              ) : (
                <>
                  <UploadZone onVehiculo={handleVehiculo} escaneando={escaneando} setEscaneando={setEscaneando} />
                  {scanError && (
                    <p style={{ fontSize: 11, color: "#c0392b", fontFamily: "'Inter',sans-serif",
                      marginTop: 6, textAlign: "center" }}>
                      No se pudo leer el documento. Intentá con otra foto o completá los datos manualmente.
                    </p>
                  )}
                </>
              )}
            </section>

            {/* Tipo de transferencia */}
            <section>
              <SectionTitle>Tipo de transferencia</SectionTitle>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  ["particulares", "Entre particulares",       "Sellos: 1,25%"],
                  ["habitualista", "Desde habitualista inscripto", "Sellos: 1%"],
                ].map(([k, label, sub]) => (
                  <button key={k} onClick={() => setTipo(k)}
                    style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px solid",
                      borderColor: tipo === k ? C.cerulean : "rgba(26,35,50,.12)",
                      background: tipo === k ? "rgba(58,124,165,.06)" : "#FDFCFA",
                      cursor: "pointer", textAlign: "left" }}>
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

                {/* Valor tabla DNRPA — campo prominente */}
                <div style={{ background: "rgba(201,169,97,.07)", border: "1px solid rgba(201,169,97,.3)",
                  borderRadius: 10, padding: "14px 14px 12px" }}>

                  {/* Búsqueda de tabla si no hay Scriba */}
                  {!vehiculo && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                          <Field label="Buscar vehículo en tabla DNRPA"
                            hint="Tipea marca y modelo para buscar el valor fiscal oficial">
                            <BusquedaDNRPA anio={anioVehiculo} onSelect={op => {
                              if (op.valor) { setTablaDNRPA(String(op.valor)); setTablaOrigen("auto"); }
                            }} />
                          </Field>
                        </div>
                        <div style={{ width: 88 }}>
                          <Field label="Año">
                            <input value={anioVehiculo} onChange={e => setAnioVehiculo(e.target.value)}
                              placeholder="2010" style={{ ...inp }} />
                          </Field>
                        </div>
                      </div>
                    </div>
                  )}

                  <Field label="Valor de tabla DNRPA"
                    hint={<>El DNRPA usa el <strong>mayor</strong> entre precio declarado y este valor fiscal. <a
                      href="https://www2.jus.gov.ar/dnrpa-site/#!/estimador"
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: C.cerulean, textDecoration: "none", fontWeight: 600 }}>
                      Consultar oficial →
                    </a></>}>
                    <div style={{ position: "relative" }}>
                      <input value={tablaDNRPA}
                        onChange={e => { setTablaDNRPA(e.target.value); setTablaOrigen(null); }}
                        placeholder="Ej: 5368000"
                        style={{ ...inp,
                          borderColor: tablaDNRPA ? "rgba(26,35,50,.14)" : "rgba(201,169,97,.5)",
                          paddingRight: buscandoTabla ? 40 : undefined,
                        }}
                      />
                      {buscandoTabla && (
                        <div style={{ position: "absolute", right: 10, top: "50%",
                          transform: "translateY(-50%)", width: 16, height: 16,
                          border: "2px solid rgba(58,124,165,.2)", borderTopColor: C.cerulean,
                          borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                      )}
                    </div>
                  </Field>

                  {tablaOrigen === "auto" && tablaDNRPA ? (
                    <p style={{ fontSize: 11, color: "#27ae60", fontFamily: "'Inter',sans-serif",
                      margin: "6px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                      ✓ Encontrado en tabla DNRPA — podés editarlo si es necesario
                    </p>
                  ) : !tablaDNRPA && !buscandoTabla ? (
                    <p style={{ fontSize: 10, color: "#a07c30", fontFamily: "'Inter',sans-serif",
                      margin: "6px 0 0", lineHeight: 1.4 }}>
                      ⚠ Sin este valor el arancel se calcula sobre el precio declarado y puede subestimarse.
                    </p>
                  ) : null}
                </div>

                <Field label="Precio de venta declarado *"
                  hint="Valor que figura en el formulario 08">
                  <input value={precioVenta} onChange={e => setPrecioVenta(e.target.value)}
                    placeholder="Ej: 4000000" style={{ ...inp }} />
                </Field>

                <Field label="Valor de tabla ATM Mendoza (opcional)"
                  hint="Base para el impuesto de sellos. Si no lo ingresás, se usa el mayor entre precio y tabla DNRPA.">
                  <input value={tablaATM} onChange={e => setTablaATM(e.target.value)}
                    placeholder="Ej: 5368000" style={{ ...inp }} />
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
                    <input type="checkbox" checked={gastos[g.id].on} onChange={() => toggleGasto(g.id)}
                      style={{ width: 16, height: 16, accentColor: C.cerulean, cursor: "pointer", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.dark,
                        fontFamily: "'Montserrat',sans-serif" }}>{g.label}</div>
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter',sans-serif",
                        marginTop: 2 }}>{g.nota}</div>
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
            <button onClick={calcular} disabled={!puedeCalcular}
              style={{ padding: "13px 0", borderRadius: 10, border: "none",
                background: puedeCalcular ? C.dark : "rgba(26,35,50,.2)",
                color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14,
                cursor: puedeCalcular ? "pointer" : "default", letterSpacing: ".02em",
                transition: "background .15s" }}>
              Calcular
            </button>

            {/* Resultado */}
            {resultado && (
              <div style={{ background: "#FDFCFA", border: "1px solid rgba(26,35,50,.12)",
                borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: C.dark, padding: "14px 20px" }}>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 13,
                    color: "#FDFCFA" }}>Estimación de costos</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                    color: "rgba(253,252,250,.55)", marginTop: 2 }}>
                    {vehiculo && (vehiculo.marca || vehiculo.modelo)
                      ? `${vehiculo.marca || ""} ${vehiculo.modelo || ""}${vehiculo.anio ? ` (${vehiculo.anio})` : ""} · `
                      : ""}
                    Transferencia {resultado.tipo === "particulares" ? "entre particulares" : "desde habitualista"} · Mendoza · 2025
                  </div>
                </div>
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
                <div style={{ padding: "10px 20px 14px", background: "rgba(26,35,50,.02)",
                  borderTop: "1px solid rgba(26,35,50,.06)" }}>
                  <p style={{ fontSize: 10, color: C.muted, fontFamily: "'Inter',sans-serif",
                    lineHeight: 1.6, margin: 0 }}>
                    Res. MJ 273/2024 — arancel DNRPA 1% · Ley Mendoza 9597/2024 — sellos {resultado.tasaSellos}%.
                    Gastos adicionales son valores aproximados. Este estimador no reemplaza el cálculo oficial del registro seccional.
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
