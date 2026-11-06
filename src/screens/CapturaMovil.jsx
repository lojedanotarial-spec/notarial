// Página del celular para la captura de documentos. Se abre desde el QR (/c/<codigo>), SIN login: el código
// de la URL es la única autorización y solo sirve para subir fotos a esa captura.
// Spec: specs/captura-documentos-celular/.
import { useEffect, useRef, useState } from "react";
import { C } from "../constants";
import { postCelular, camposFaltantes } from "../utils/capturaApi";
import { prepararArchivo } from "../utils/capturaImagen";

const MAX_FOTOS = 20;
const fuente = "'Montserrat', sans-serif";
const NOMBRE_CAMPO = { apellido: "apellido", nombre: "nombre", nro_doc: "número de documento", fecha_nac: "fecha de nacimiento" };

const boton = (primario, deshabilitado) => ({
  width: "100%", padding: "14px 16px", borderRadius: 12, fontFamily: fuente, fontSize: 15, fontWeight: 700,
  border: primario ? "none" : `1px solid ${C.cerulean}`,
  background: deshabilitado ? "rgba(26,35,50,.15)" : primario ? C.cerulean : "transparent",
  color: deshabilitado ? C.muted : primario ? "#fff" : C.cerulean,
  cursor: deshabilitado ? "default" : "pointer",
});

function Aviso({ tipo = "info", children }) {
  const colores = { info: [C.ceruleanLight, C.cerulean], aviso: [C.fawn50, "#8a6d1f"], error: ["#fdf0f0", "#c0392b"] }[tipo];
  return <div style={{ background: colores[0], color: colores[1], borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.45, margin: "10px 0" }}>{children}</div>;
}

function domicilio(p) {
  return [[p.calle, p.numero].filter(Boolean).join(" "), p.barrio, p.localidad, p.departamento].filter(Boolean).join(", ");
}

function TarjetaPersona({ p, seleccionable, elegida, onElegir }) {
  const faltan = camposFaltantes(p);
  return (
    <div onClick={seleccionable ? onElegir : undefined}
      style={{ border: `2px solid ${elegida ? C.cerulean : C.border}`, background: elegida ? C.ceruleanLight : "#fff", borderRadius: 12, padding: 12, margin: "8px 0", cursor: seleccionable ? "pointer" : "default" }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{[p.apellido, p.nombre].filter(Boolean).join(", ") || "Sin nombre legible"}</div>
      <div style={{ fontSize: 13, color: C.faint, marginTop: 4, lineHeight: 1.6 }}>
        {p.nro_doc && <div>{p.tipo_doc || "Documento"}: <strong>{p.nro_doc}</strong></div>}
        {p.fecha_nac && <div>Nacimiento: <strong>{p.fecha_nac}</strong></div>}
        {domicilio(p) && <div>Domicilio: {domicilio(p)}</div>}
      </div>
      {faltan.length > 0 && <Aviso tipo="aviso">No pude leer: <strong>{faltan.join(", ")}</strong>. Si lo ves en el documento, sacá otra foto más nítida (sin reflejos y bien encuadrada).</Aviso>}
      {p._discrepancias?.length > 0 && <Aviso tipo="aviso">Los documentos no coinciden en: {p._discrepancias.map((d) => `${NOMBRE_CAMPO[d.campo] || d.campo} (${d.valores.join(" / ")})`).join("; ")}. Se tomó el dato del DNI.</Aviso>}
    </div>
  );
}

function TarjetaVehiculo({ v, titulo }) {
  const x = v.vehiculo || {};
  return (
    <div style={{ border: `1px solid ${C.border}`, background: "#fff", borderRadius: 12, padding: 12, margin: "8px 0" }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{titulo || [x.marca, x.modelo].filter(Boolean).join(" ") || "Vehículo"}</div>
      <div style={{ fontSize: 13, color: C.faint, marginTop: 4, lineHeight: 1.6 }}>
        {(x.marca || x.modelo) && titulo && <div>{[x.marca, x.modelo].filter(Boolean).join(" ")}</div>}
        {x.dominio ? <div>Dominio: <strong>{x.dominio}</strong></div> : <div style={{ color: "#8a6d1f" }}>No pude leer el dominio</div>}
        {x.chasis && <div>Chasis: {x.chasis}</div>}
        {v.titular?.apellido && <div>Titular: {[v.titular.apellido, v.titular.nombre].filter(Boolean).join(", ")}</div>}
      </div>
    </div>
  );
}

export default function CapturaMovil({ codigo }) {
  const [info, setInfo] = useState(null);
  const [errorFatal, setErrorFatal] = useState("");
  const [items, setItems] = useState([]);              // fotos de esta sesión del celular
  const [grupo, setGrupo] = useState(0);                // vehículo activo (modo vehiculos)
  const [fase, setFase] = useState("fotos");            // fotos | leyendo | resultado | listo
  const [resultado, setResultado] = useState(null);
  const [eleccion, setEleccion] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const contador = useRef(0);

  // Que el código de la URL no se filtre a buscadores ni a otros sitios
  useEffect(() => {
    const metas = [["robots", "noindex, nofollow"], ["referrer", "no-referrer"]].map(([name, content]) => {
      const m = document.createElement("meta"); m.name = name; m.content = content; document.head.appendChild(m); return m;
    });
    return () => metas.forEach((m) => m.remove());
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const i = await postCelular("info", { c: codigo });
        if (cancelado) return;
        setInfo(i);
        // Si se recarga la página, las fotos ya subidas siguen en el servidor: se muestran sin miniatura
        setItems((prev) => prev.length ? prev : i.fotos.map((f) => ({ key: f.id, fotoId: f.id, estado: "ok", grupo: f.grupo, vista: null, nombre: "Foto" })));
        if (i.estado === "confirmada") setFase("listo");
        else if (i.estado === "leida" && i.resultado) { setResultado(i.resultado); setFase("resultado"); }
      } catch (e) { if (!cancelado) setErrorFatal(e.message); }
    })();
    return () => { cancelado = true; };
  }, [codigo]);

  async function subirArchivo(archivo, grupoDestino) {
    const key = `l${++contador.current}`;
    setItems((prev) => [...prev, { key, nombre: archivo.name, estado: "subiendo", grupo: grupoDestino, vista: null }]);
    const marcar = (cambios) => setItems((prev) => prev.map((it) => it.key === key ? { ...it, ...cambios } : it));
    try {
      const p = await prepararArchivo(archivo);
      marcar({ vista: p.vista });
      const r = await postCelular("subir", { c: codigo, mediaType: p.mediaType, data: p.base64, grupo: grupoDestino });
      marcar({ estado: "ok", fotoId: r.id });
    } catch (e) {
      if (e.status === 410 || e.status === 404) setErrorFatal(e.message);
      marcar({ estado: "error", error: e.message });
    }
  }

  function alElegir(e) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length) return;
    setError(""); setFase("fotos"); setResultado(null);
    const lugar = MAX_FOTOS - items.filter((i) => i.estado !== "error").length;
    if (archivos.length > lugar) setError(`Máximo ${MAX_FOTOS} fotos por lote: se subieron las primeras ${Math.max(lugar, 0)}.`);
    archivos.slice(0, Math.max(lugar, 0)).forEach((a) => subirArchivo(a, grupo));
  }

  async function quitar(it) {
    setItems((prev) => prev.filter((x) => x.key !== it.key));
    if (it.fotoId) { try { await postCelular("quitar", { c: codigo, fotoId: it.fotoId }); } catch { /* si falla, se reintenta al leer */ } }
    setFase("fotos"); setResultado(null);
  }

  async function reintentar(it) {
    setItems((prev) => prev.filter((x) => x.key !== it.key));
    setError("Elegí de nuevo esa foto para volver a subirla.");
  }

  const subiendo = items.some((i) => i.estado === "subiendo");
  const listas = items.filter((i) => i.estado === "ok");
  const esperadas = info?.esperadas?.minimo || 0;

  async function leer() {
    if (esperadas && listas.length < esperadas &&
        !window.confirm(`Subiste ${listas.length} de ${esperadas} fotos (${info.esperadas.texto}). ¿Seguir igual?`)) return;
    setError(""); setFase("leyendo");
    try {
      const r = await postCelular("leer", { c: codigo });
      setResultado(r.resultado); setEleccion(null); setFase("resultado");
    } catch (e) {
      setFase("fotos"); setError(e.message);
      if (e.status === 410 || e.status === 404) setErrorFatal(e.message);
    }
  }

  async function confirmar() {
    setError("");
    try {
      await postCelular("confirmar", { c: codigo, ...(resultado?.hay_varias ? { eleccion } : {}) });
      setFase("listo");
    } catch (e) { setError(e.message); }
  }

  // ── Pantallas ──────────────────────────────────────────────────────────────

  const marco = (hijos) => (
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: "#f0ece3", fontFamily: fuente, color: C.dark, WebkitOverflowScrolling: "touch" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontFamily: "'Merriweather', serif", fontSize: 18, fontWeight: 700 }}>Notarial</span>
        </div>
        {hijos}
      </div>
    </div>
  );

  if (errorFatal) return marco(<><h2 style={{ fontSize: 18, marginBottom: 8 }}>No se pudo abrir la captura</h2><Aviso tipo="error">{errorFatal}</Aviso><p style={{ fontSize: 13, color: C.faint }}>Volvé a la compu y generá un código nuevo.</p></>);
  if (!info) return marco(<p style={{ fontSize: 14, color: C.faint }}>Abriendo…</p>);

  if (fase === "listo") return marco(
    <div style={{ textAlign: "center", paddingTop: 30 }}>
      <div style={{ fontSize: 56 }}>✅</div>
      <h2 style={{ fontSize: 20, margin: "12px 0 6px" }}>Listo</h2>
      <p style={{ fontSize: 14, color: C.faint, lineHeight: 1.5 }}>Los datos ya están yendo a la compu. Podés cerrar esta página.</p>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 16 }}>Las fotos se borran de nuestros servidores apenas la compu recibe los datos.</p>
    </div>,
  );

  if (fase === "leyendo") return marco(
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div style={{ fontSize: 40 }}>🔎</div>
      <h2 style={{ fontSize: 18, margin: "12px 0 6px" }}>Leyendo las fotos…</h2>
      <p style={{ fontSize: 13, color: C.faint }}>Puede tardar unos segundos si son varias.</p>
    </div>,
  );

  if (fase === "resultado" && resultado) {
    const modo = info.modo;
    const hayVarias = !!resultado.hay_varias;
    const puedeConfirmar = modo === "parte" ? (hayVarias ? eleccion !== null : (resultado.personas?.length || 0) > 0)
      : modo === "vehiculos" ? (resultado.vehiculos?.length || 0) > 0
      : true;
    return marco(
      <>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>Esto es lo que leí</h2>
        <p style={{ fontSize: 13, color: C.faint }}>{resultado.resumen}</p>
        {resultado.notas && <Aviso tipo="aviso">{resultado.notas}</Aviso>}
        {modo === "parte" && hayVarias && <Aviso tipo="aviso">Encontré más de una persona. <strong>¿Cuál es la de esta parte?</strong> Las otras quedan disponibles en la compu.</Aviso>}
        {modo === "parte" && (resultado.personas || []).map((p, i) => <TarjetaPersona key={i} p={p} seleccionable={hayVarias} elegida={eleccion === i} onElegir={() => setEleccion(i)} />)}
        {modo === "vehiculos" && (resultado.vehiculos || []).map((v) => <TarjetaVehiculo key={v.grupo} v={v} titulo={`Vehículo ${v.grupo + 1}`} />)}
        {modo === "libre" && (
          <>
            {(resultado.personas || []).map((p, i) => <TarjetaPersona key={`p${i}`} p={p} />)}
            {(resultado.vehiculos || []).map((v, i) => <TarjetaVehiculo key={`v${i}`} v={v} />)}
            {resultado.dorsos?.length > 0 && <Aviso tipo="info">{resultado.dorsos.length} dorso(s) de tarjeta sin emparejar: Scriba te va a preguntar a qué vehículo van.</Aviso>}
            {resultado.otros?.length > 0 && <Aviso tipo="aviso">{resultado.otros.length} foto(s) que no pude reconocer como documento.</Aviso>}
            <p style={{ fontSize: 12, color: C.muted }}>Scriba te va a preguntar lo que no pueda deducir (quién es quién).</p>
          </>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <button style={boton(true, !puedeConfirmar)} disabled={!puedeConfirmar} onClick={confirmar}>Está bien, enviar a la compu</button>
          <button style={boton(false)} onClick={() => { setFase("fotos"); setResultado(null); }}>Agregar o cambiar fotos</button>
        </div>
      </>,
    );
  }

  // fase "fotos"
  const grupos = info.modo === "vehiculos" ? [...new Set([...items.map((i) => i.grupo), grupo])].sort((a, b) => a - b) : [0];
  const fotosDelGrupoActivo = items.filter((i) => i.grupo === grupo && i.estado !== "error").length;
  return marco(
    <>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>{info.etiqueta}</h2>
      {esperadas > 0 && <p style={{ fontSize: 13, color: C.faint }}>Fotos: <strong>{listas.length}</strong> de {esperadas} ({info.esperadas.texto})</p>}
      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple style={{ display: "none" }} onChange={alElegir} />
      <button style={{ ...boton(true), margin: "12px 0 6px" }} onClick={() => inputRef.current?.click()}>
        {items.length ? "＋ Agregar más fotos" : "📷 Sacar o elegir fotos"}
      </button>
      <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Podés sacar una foto ahora o elegir las que ya tenés guardadas en el teléfono, y mezclarlas.</p>
      {error && <Aviso tipo="error">{error}</Aviso>}

      {grupos.map((g) => (
        <div key={g} style={{ margin: "10px 0" }}>
          {info.modo === "vehiculos" && <div style={{ fontSize: 13, fontWeight: 700, color: g === grupo ? C.cerulean : C.muted, margin: "10px 0 6px" }}>Vehículo {g + 1}{g === grupo ? " (sacando fotos de este)" : ""}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {items.filter((i) => i.grupo === g).map((it) => (
              <div key={it.key} style={{ position: "relative", aspectRatio: "3 / 4", borderRadius: 10, overflow: "hidden", background: "#fff", border: `1px solid ${it.estado === "error" ? "#c0392b" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, textAlign: "center", padding: 4 }}>
                {it.vista ? <img src={it.vista} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: C.muted }}>{it.nombre?.toLowerCase().endsWith(".pdf") ? "PDF" : "Foto"}</span>}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: it.estado === "error" ? "#c0392b" : it.estado === "subiendo" ? "rgba(26,35,50,.7)" : "rgba(58,124,165,.85)", color: "#fff", fontSize: 10, padding: "2px 0" }}>
                  {it.estado === "subiendo" ? "Subiendo…" : it.estado === "error" ? "No subió" : "✓"}
                </div>
                <button onClick={() => quitar(it)} aria-label="Quitar foto" style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, border: "none", background: "rgba(26,35,50,.75)", color: "#fff", fontSize: 14, lineHeight: "24px", padding: 0 }}>×</button>
                {it.estado === "error" && <button onClick={() => reintentar(it)} style={{ position: "absolute", inset: 0, background: "transparent", border: "none" }} aria-label={it.error} title={it.error} />}
              </div>
            ))}
          </div>
          {items.filter((i) => i.grupo === g && i.estado === "error").map((it) => <Aviso key={it.key} tipo="error">{it.error}</Aviso>)}
        </div>
      ))}

      {info.modo === "vehiculos" && (
        <button style={{ ...boton(false, fotosDelGrupoActivo === 0), margin: "6px 0 10px" }} disabled={fotosDelGrupoActivo === 0} onClick={() => setGrupo((g) => g + 1)}>＋ Otro vehículo</button>
      )}

      <button style={{ ...boton(true, subiendo || listas.length === 0), marginTop: 10 }} disabled={subiendo || listas.length === 0} onClick={leer}>
        {subiendo ? "Subiendo fotos…" : "Listo, leer las fotos"}
      </button>
    </>,
  );
}
