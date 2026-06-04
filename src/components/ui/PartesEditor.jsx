import { useState, useEffect, useRef } from "react";
import { C, DEPARTAMENTOS, PARTE_VACIA, inp } from "../../constants";

// Inferencia de provincia argentina a partir de localidad o departamento
const LOCALIDAD_PROVINCIA = {
  // Capitales provinciales
  "buenos aires":"Buenos Aires","la plata":"Buenos Aires",
  "córdoba":"Córdoba","catamarca":"Catamarca","corrientes":"Corrientes",
  "entre ríos":"Entre Ríos","paraná":"Entre Ríos",
  "formosa":"Formosa","jujuy":"Jujuy","san salvador de jujuy":"Jujuy",
  "la pampa":"La Pampa","santa rosa":"La Pampa",
  "la rioja":"La Rioja","mendoza":"Mendoza",
  "misiones":"Misiones","posadas":"Misiones",
  "neuquén":"Neuquén","río negro":"Río Negro","viedma":"Río Negro",
  "salta":"Salta","san juan":"San Juan","san luis":"San Luis",
  "santa cruz":"Santa Cruz","río gallegos":"Santa Cruz",
  "santa fe":"Santa Fe","rosario":"Santa Fe",
  "santiago del estero":"Santiago del Estero",
  "tierra del fuego":"Tierra del Fuego","ushuaia":"Tierra del Fuego",
  "tucumán":"Tucumán","san miguel de tucumán":"Tucumán",
  "chaco":"Chaco","resistencia":"Chaco",
  "chubut":"Chubut","rawson":"Chubut",
};
const DEPTO_MENDOZA = new Set([
  "capital","godoy cruz","maipú","las heras","guaymallén","luján de cuyo",
  "san martín","san rafael","general alvear","rivadavia","tunuyán",
  "tupungato","san carlos","la paz","santa rosa","malargüe","lavalle","junín"
]);

function inferirProvincia(localidad, departamento) {
  const loc = (localidad||"").toLowerCase().trim();
  const dep = (departamento||"").toLowerCase().trim();
  // Por departamento mendocino
  if (DEPTO_MENDOZA.has(dep)) return "Mendoza";
  // Por localidad conocida
  if (LOCALIDAD_PROVINCIA[loc]) return LOCALIDAD_PROVINCIA[loc];
  return "";
}

// Artículos y preposiciones que van en minúscula en el interior de un nombre
const MINUSCULAS_ES = new Set([
  'a','al','ante','bajo','con','contra','de','del','desde','en','entre',
  'hacia','hasta','mediante','para','por','según','sin','sobre','tras',
  'y','e','o','u','ni','que','el','la','los','las','un','una','unos','unas',
]);

function titleCaseDomicilio(str) {
  if (!str) return str;
  return str.toLowerCase().split(/\s+/).map((w, i) => {
    if (!w) return w;
    // Números al inicio: mantener (ej: "9 de Julio")
    if (/^[0-9]/.test(w)) return w;
    // Abreviaturas con ° (B°, N°): capitalizar primera letra
    if (w.includes('°')) return w.charAt(0).toUpperCase() + w.slice(1);
    // Primera palabra siempre con mayúscula
    if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1);
    // Artículos/preposiciones: minúscula
    if (MINUSCULAS_ES.has(w)) return w;
    // Resto: primera mayúscula
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}
import { aplicarTildesNombre } from "../../utils/tildesNombres";

async function escanearDocumento(archivo) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const base64 = canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
      fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: { data: base64, mediaType: "image/jpeg" } }),
      })
        .then(r => r.json())
        .then(resolve)
        .catch(reject);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Merge de dos resultados de visión: usa el primer valor no vacío de cada campo
function mergePersonas(base, nuevo) {
  if (!base) return nuevo;
  const p1 = base?.personas?.[0] || {};
  const p2 = nuevo?.personas?.[0] || {};
  const m = (a, b) => a || b;
  return {
    ...base,
    personas: [{
      apellido:     m(p1.apellido,     p2.apellido),
      nombre:       m(p1.nombre,       p2.nombre),
      nro_doc:      m(p1.nro_doc,      p2.nro_doc),
      tipo_doc:     m(p1.tipo_doc,     p2.tipo_doc),
      genero:       m(p1.genero,       p2.genero),
      fecha_nac:    m(p1.fecha_nac,    p2.fecha_nac),
      estado_civil: m(p1.estado_civil, p2.estado_civil),
      nacionalidad: m(p1.nacionalidad, p2.nacionalidad),
      calle:        m(p1.calle,        p2.calle),
      numero:       m(p1.numero,       p2.numero),
      localidad:    m(p1.localidad,    p2.localidad),
      departamento: m(p1.departamento, p2.departamento),
      barrio:       m(p1.barrio,       p2.barrio),
      manzana:      m(p1.manzana,      p2.manzana),
      casa:         m(p1.casa,         p2.casa),
    }],
  };
}

function ScanBtn({ onDatos, tipo = "documento", style }) {
  const [progreso, setProgreso] = useState("");
  const ref = useRef(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*,application/pdf"
        multiple style={{ display:"none" }}
        onChange={async e => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          setProgreso(files.length > 1 ? `0/${files.length}` : "…");
          try {
            let acumulado = null;
            for (let i = 0; i < files.length; i++) {
              if (files.length > 1) setProgreso(`${i+1}/${files.length}`);
              const res = await escanearDocumento(files[i]);
              acumulado = mergePersonas(acumulado, res);
            }
            onDatos(acumulado);
          } catch { alert("No se pudo leer alguno de los documentos."); }
          finally { setProgreso(""); e.target.value = ""; }
        }}
      />
      <button type="button" onClick={() => !progreso && ref.current?.click()}
        style={{
          display:"flex", flexDirection:"column", alignItems:"stretch", gap:0,
          padding:0, border:"1px solid " + (progreso ? C.cerulean : C.cerulean),
          borderRadius:6, background: progreso ? C.ceruleanLight : "transparent",
          color:C.cerulean, fontSize:11, fontWeight:700,
          cursor: progreso ? "default" : "pointer",
          fontFamily:"'Montserrat',sans-serif", overflow:"hidden", ...style,
        }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
          {progreso ? `Escaneando ${progreso}` : `Escanear ${tipo}`}
        </div>
        {progreso && (
          <div style={{ height:3, background:"rgba(58,124,165,.15)", position:"relative", overflow:"hidden" }}>
            <div style={{
              position:"absolute", height:"100%", width:"40%",
              background:C.cerulean, borderRadius:2,
              animation:"scanProgress 1.2s ease-in-out infinite",
            }}/>
          </div>
        )}
      </button>
    </>
  );
}
import { Fg } from "./FormElements";
import { Btn } from "./Btn";
import { supabase } from "../../supabase";
import { useAuth } from "../../context/AuthContext";

const fmtDni = (v) => {
  if (!v) return "";
  const n = Number(String(v).replace(/\D/g, ""));
  return isNaN(n) ? "" : n.toLocaleString("es-AR");
};

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

const REPR_TIPOS = [
  { key: "pj_representante", label: "Representante de persona jurídica" },
  { key: "pj_apoderado",     label: "Apoderado de persona jurídica" },
  { key: "pf_apoderado",     label: "Apoderado de persona física" },
];

const REPR_VACIA = () => ({
  id: Date.now() + Math.random(),
  tipo: "pj_representante",
  razon_social: "", cuit_sociedad: "", caracter: "", documentacion: "",
  repr_nombre: "", repr_apellido: "", repr_dni: "", repr_genero: "M",
  domicilio_social: "",
});

function ConfirmQuitarParte({ nombre, onConfirm, onCancel }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(26,35,50,.5)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{
        background:C.porcelain, borderRadius:12, padding:"24px 24px 18px",
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
                           cursor:"pointer", fontFamily:"'Inter', sans-serif" }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
                  style={{ padding:"7px 16px", borderRadius:7, border:"1px solid #e07070",
                           background:"#fdf0f0", fontSize:13, fontWeight:700, color:"#c0392b",
                           cursor:"pointer", fontFamily:"'Inter', sans-serif" }}>
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
    <div style={{ position:"relative", flex:1 }}>
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
          background:C.porcelain, border:"1px solid " + C.border,
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
        <>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8, alignItems:"start", marginBottom:8 }}>
          <Fg label="Razón social">
            <input style={inp} value={repr.razon_social}
                   onChange={e => upd("razon_social", e.target.value)} placeholder="ej: VEXTER S.A."/>
          </Fg>
          <Fg label="CUIT">
            <input style={inp} value={repr.cuit_sociedad}
                   onChange={e => upd("cuit_sociedad", e.target.value)} placeholder="xx-xxxxxxxx-x"/>
          </Fg>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8, alignItems:"start", marginBottom:8 }}>
          <Fg label="Domicilio social">
            <input style={inp} value={repr.domicilio_social||""}
                   onChange={e => upd("domicilio_social", e.target.value)}
                   placeholder="ej: Belgrano 1553, Ciudad, Mendoza"/>
          </Fg>
          <Fg label="Carácter">
            <input style={inp} value={repr.caracter}
                   onChange={e => upd("caracter", e.target.value.toUpperCase())}
                   placeholder="ej: PRESIDENTE"/>
          </Fg>
        </div>
        <Fg label="Documentación (a), b), c)...)">
          <textarea style={{ ...inp, resize:"vertical", minHeight:72, lineHeight:1.5 }}
                    value={repr.documentacion}
                    onChange={e => upd("documentacion", e.target.value)}
                    placeholder={"a) Estatuto, escritura N° 29 de fecha 12/06/2017...\nb) Poder General Amplio, escritura N° 30..."}/>
        </Fg>
        </>
      )}

      {esPF && (
        <>
          {/* Género del representado */}
          <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
            <span style={{ fontSize:11, fontWeight:600, color:C.dark, minWidth:60 }}>Género</span>
            {[["M","Masculino"],["F","Femenino"]].map(([val,lbl]) => (
              <button key={val} type="button" onClick={() => upd("repr_genero", val)}
                style={{
                  padding:"4px 14px", borderRadius:6, border:"1px solid",
                  borderColor: repr.repr_genero === val ? C.cerulean : "rgba(26,35,50,.15)",
                  background: repr.repr_genero === val ? C.ceruleanLight : "transparent",
                  color: repr.repr_genero === val ? C.cerulean : C.dark,
                  fontFamily:"'Montserrat',sans-serif", fontWeight:600, fontSize:11, cursor:"pointer",
                }}>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr", gap:8, alignItems:"start", marginBottom:8 }}>
            <Fg label="Apellido">
              <input style={inp} value={repr.repr_apellido}
                     onChange={e => upd("repr_apellido", e.target.value.toUpperCase())}/>
            </Fg>
            <Fg label="Nombre/s">
              <input style={inp} value={repr.repr_nombre}
                     onChange={e => upd("repr_nombre", e.target.value.toUpperCase())}/>
            </Fg>
            <Fg label="DNI">
              <input style={inp} value={repr.repr_dni}
                     onChange={e => upd("repr_dni", e.target.value.replace(/\D/g,""))}/>
            </Fg>
          </div>
          <Fg label="Documentación (a), b), c)...)">
            <textarea style={{ ...inp, resize:"vertical", minHeight:72, lineHeight:1.5 }}
                      value={repr.documentacion}
                      onChange={e => upd("documentacion", e.target.value)}
                      placeholder={"a) Poder General Amplio, escritura N° 71 de fecha 25/06/2010, pasada ante mí...\nb) Inscripto bajo N° 14023, fojas 155/156, Tomo 135M..."}/>
          </Fg>
        </>
      )}
    </div>
  );
}

export function PartesEditor({ partes, onChange, showRol = true, rolesContextuales }) {
  const { usuario, registroActivo } = useAuth();
  const registroNumero = usuario?.registro_numero || registroActivo;
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
    const parteActual = partes.find(x => x.id === openId) || {};
    const genero    = persona.genero   || parteActual.genero || "";
    const nroDocRaw = String(persona.nro_doc || "").replace(/\D/g, "");

    // Concordancia de nacionalidad según género
    const NAC_MASC = { argentina:"argentino", uruguaya:"uruguayo", chilena:"chileno",
      boliviana:"boliviano", peruana:"peruano", paraguaya:"paraguayo",
      "brasileña":"brasileño", venezolana:"venezolano", colombiana:"colombiano" };
    const nacRaw = (persona.nacionalidad || "").toLowerCase().trim();
    const nac = genero === "M" ? (NAC_MASC[nacRaw] || persona.nacionalidad || "") : (persona.nacionalidad || "");

    // Calcular CUIT si hay DNI y género
    let cuit = persona.cuit || "";
    if (!cuit && nroDocRaw.length >= 7) {
      const c = calcularCUIT(nroDocRaw, genero);
      if (c) cuit = `${c.prefijo}-${nroDocRaw}-${c.verificador}`;
    }

    upd(openId, {
      apellido:         (persona.apellido || "").toUpperCase(),
      nombre:           aplicarTildesNombre((persona.nombre || "").toUpperCase()),
      genero,
      nacionalidad:     nac,
      tipoDoc:          persona.tipo_doc      || "DNI",
      nroDoc:           nroDocRaw,
      cuit,
      fechaNac:         persona.fecha_nac     || "",
      estadoCivil:      persona.estado_civil  || "",
      calle:            titleCaseDomicilio(persona.calle)     || "",
      numero:           persona.numero                        || "",
      piso:             persona.piso                          || "",
      dpto:             persona.dpto                          || "",
      barrio:           titleCaseDomicilio(persona.barrio)    || "",
      manzana:          persona.manzana                       || "",
      casa:             persona.casa                          || "",
      localidad:        titleCaseDomicilio(persona.localidad) || "",
      provincia:        titleCaseDomicilio(persona.provincia) || inferirProvincia(persona.localidad, persona.departamento),
      pais:             titleCaseDomicilio(persona.pais)      || "",
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
                    fontSize:9, fontWeight:700, color: activo ? "#FDFCFA" : C.cerulean,
                  }}>{ini}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.dark,
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {x.apellido || "Parte " + (idx + 1)}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: x.rol ? "rgba(26,35,50,.6)" : "rgba(26,35,50,.35)",
                      fontStyle: x.rol ? "normal" : "italic",
                    }}>
                      {x.rol || "sin rol asignado"}
                    </div>
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
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
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
              fontFamily:"'Inter', sans-serif", cursor:"pointer", textAlign:"center",
            }}>
            + Agregar
          </button>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ flex:1, overflowY:"auto", paddingRight:4 }}>
          {p ? (
            <>
              <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:14 }}>
                <BuscadorDNI registroNumero={registroNumero} onSelect={cargarDesdeCRM} />
                <ScanBtn onDatos={datos => {
                  const persona = datos?.personas?.[0];
                  if (!persona) return alert("No se encontraron datos de persona en el documento.");
                  // Merge: solo completa campos vacíos, no sobreescribe los que ya tienen datos
                  const actual = partes.find(x => x.id === openId) || {};
                  // El escaneo gana si tiene valor; el formulario es solo fallback
                  const merge = (nuevo, actual) => nuevo || actual;
                  cargarDesdeCRM({
                    apellido:     (merge(persona.apellido,     actual.apellido) || "").toUpperCase(),
                    nombre:       (merge(persona.nombre,       actual.nombre)   || "").toUpperCase(),
                    nro_doc:      merge(persona.nro_doc,      actual.nroDoc),
                    tipo_doc:     merge(persona.tipo_doc,     actual.tipoDoc) || "DNI",
                    genero:       merge(persona.genero,       actual.genero)  || "",
                    fecha_nac:    merge(persona.fecha_nac,    actual.fechaNac),
                    estado_civil: merge(persona.estado_civil, actual.estadoCivil),
                    nacionalidad: merge(persona.nacionalidad, actual.nacionalidad),
                    calle:        titleCaseDomicilio(merge(persona.calle,     actual.calle))     || "",
                    numero:       merge(persona.numero,      actual.numero)                      || "",
                    barrio:       titleCaseDomicilio(merge(persona.barrio,   actual.barrio))     || "",
                    manzana:      merge(persona.manzana,     actual.manzana)                     || "",
                    casa:         merge(persona.casa,        actual.casa)                        || "",
                    localidad:    titleCaseDomicilio(merge(persona.localidad, actual.localidad)) || "",
                    departamento: titleCaseDomicilio(merge(persona.departamento, actual.departamento)) || "",
                    cuit:         actual.cuit || undefined,
                  });
                }} style={{ flexShrink:0, alignSelf:"flex-start" }}/>
              </div>

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
                    const fields = { genero: g };
                    if (p.nacionalidad === "argentina" || p.nacionalidad === "argentino") {
                      fields.nacionalidad = g === "F" ? "argentina" : "argentino";
                    }
                    if (p.tipoDoc === "DNI" && String(p.nroDoc || "").replace(/\D/g,"").length >= 7) {
                      const c = calcularCUIT(p.nroDoc, g);
                      if (c) fields.cuit = c.prefijo + "-" + String(p.nroDoc).replace(/\D/g,"") + "-" + c.verificador;
                    }
                    upd(p.id, fields);
                  }}>
                    <option value="">—</option>
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                  </select>
                </Fg>
                <Fg label="Estado civil">
                  <select style={inp} value={p.estadoCivil}
                    onChange={e => upd(p.id, { estadoCivil: e.target.value })}>
                    <option value="">—</option>
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
                      if (p.tipoDoc === "DNI" && v.length >= 7) {
                        const c = calcularCUIT(v, p.genero);
                        if (c) fields.cuit = c.prefijo + "-" + v + "-" + c.verificador;
                      } else if (p.cuit) {
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
                <Fg label="Función en el acto">
                  {rolesContextuales?.length ? (
                    <select style={inp} value={p.rol}
                      onChange={e => upd(p.id, { rol: e.target.value })}>
                      <option value="">— sin especificar —</option>
                      {rolesContextuales.filter(Boolean).map(r => (
                        <option key={r} value={r.toUpperCase()}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <input style={inp} value={p.rol}
                      onChange={e => upd(p.id, { rol: e.target.value.toUpperCase() })}
                      placeholder="ej: VENDEDOR, COMPRADOR, AUTORIZADO..."/>
                  )}
                </Fg>
                <Fg label="Calle">
                  <input style={inp} value={p.calle}
                    onChange={e => upd(p.id, { calle: e.target.value })} placeholder="ingrese calle"/>
                </Fg>
                <Fg label="Número">
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
                <Fg label="Barrio">
                  <input style={inp} value={p.barrio || ""}
                    onChange={e => upd(p.id, { barrio: e.target.value })} placeholder="ej: Unión y Fuerza"/>
                </Fg>
                <Fg label="Manzana">
                  <input style={inp} value={p.manzana || ""}
                    onChange={e => upd(p.id, { manzana: e.target.value })} placeholder="ej: B"/>
                </Fg>
                <Fg label="Casa / Lote">
                  <input style={inp} value={p.casa || ""}
                    onChange={e => upd(p.id, { casa: e.target.value })} placeholder="ej: 42"/>
                </Fg>
                <Fg label="Localidad">
                  <input style={inp} value={p.localidad}
                    onChange={e => upd(p.id, { localidad: e.target.value })} placeholder="ej: Dorrego"/>
                </Fg>
                <Fg label="Departamento">
                  <input style={inp} value={p.departamento}
                    onChange={e => upd(p.id, { departamento: e.target.value })} placeholder="ej: Godoy Cruz"/>
                </Fg>
                <Fg label="Provincia">
                  <input style={inp} value={p.provincia || ""}
                    onChange={e => upd(p.id, { provincia: e.target.value })} placeholder="ej: Mendoza"/>
                </Fg>
                <Fg label="País">
                  <input style={inp} value={p.pais || ""}
                    onChange={e => upd(p.id, { pais: e.target.value })} placeholder="ej: Argentina"/>
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
                      fontFamily:"'Inter', sans-serif",
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
      genero:           p.genero        || "",
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
