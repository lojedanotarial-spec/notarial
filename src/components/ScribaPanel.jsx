import { useState, useRef, useEffect, useCallback } from "react";
import { C } from "../constants";
import { useScribaConversacion } from "../hooks/useScribaConversacion";
import { useAuth } from "../context/AuthContext";

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid rgba(26,35,50,.1)", margin: "8px 0" }} />);
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const content = line.replace(/^#{1,3}\s/, "");
      elements.push(<div key={key++} style={{ fontWeight: 700, fontSize: 13, marginTop: 8, marginBottom: 2 }}>{inlineFormat(content)}</div>);
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)/);
    if (listMatch) {
      const indent = listMatch[1].length;
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 6, paddingLeft: indent * 8, marginTop: 2 }}>
          <span style={{ flexShrink: 0, color: C.muted }}>•</span>
          <span>{inlineFormat(listMatch[3])}</span>
        </div>
      );
      continue;
    }

    if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 6 }} />);
      continue;
    }

    elements.push(<div key={key++}>{inlineFormat(line)}</div>);
  }

  return elements;
}

function inlineFormat(text) {
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0, match, key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    if (match[2]) parts.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

function SparkleIcon({ size = 10, color = "#7ec8e3" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill={color}>
      <path d="M5 0L5.7 4.3 10 5 5.7 5.7 5 10 4.3 5.7 0 5 4.3 4.3 5 0Z"/>
    </svg>
  );
}

function ScribaAvatar({ size = 26 }) {
  return (
    <img
      src="/Scriba-icon-1.png"
      alt="Scriba"
      style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "block" }}
    />
  );
}

function BtnCopiar({ texto }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <button onClick={copiar} style={{
      marginTop: 7, display: "flex", alignItems: "center", gap: 5,
      background: copiado ? "rgba(58,124,165,.12)" : "transparent",
      border: "1px solid " + (copiado ? "rgba(58,124,165,.3)" : "rgba(26,35,50,.15)"),
      borderRadius: 6, padding: "5px 10px",
      fontSize: 11, fontWeight: 600, fontFamily: "'Montserrat', sans-serif",
      color: copiado ? C.cerulean : "rgba(26,35,50,.45)",
      cursor: "pointer", transition: "all .15s",
    }}>
      {copiado
        ? <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg> Copiado</>
        : <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="1" width="7" height="8" rx="1.5"/><rect x="1" y="3" width="7" height="8" rx="1.5" fill="none"/></svg> Copiar contenido</>
      }
    </button>
  );
}

function BtnAplicar({ contenido }) {
  const [aplicado, setAplicado] = useState(false);

  function aplicar() {
    window.dispatchEvent(new CustomEvent("scriba:modificar", { detail: { contenido } }));
    setAplicado(true);
    setTimeout(() => setAplicado(false), 2500);
  }

  return (
    <button onClick={aplicar} style={{
      marginTop: 4, display: "flex", alignItems: "center", gap: 5,
      background: aplicado ? "rgba(58,124,165,.12)" : "#1a5276",
      border: "1px solid " + (aplicado ? "rgba(58,124,165,.4)" : "#1a5276"),
      borderRadius: 6, padding: "5px 10px",
      fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
      color: aplicado ? C.cerulean : "#fff",
      cursor: "pointer", transition: "all .15s",
    }}>
      {aplicado
        ? <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg> Aplicado</>
        : <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3L5 7l-2-2" strokeLinecap="round" strokeLinejoin="round"/></svg> Aplicar al documento</>
      }
    </button>
  );
}

function BtnInsertar({ texto }) {
  const [insertado, setInsertado] = useState(false);

  function insertar() {
    console.log("[scriba] BtnInsertar click — texto:", texto?.slice(0, 60));
    window.dispatchEvent(new CustomEvent("scriba:insertar", { detail: { texto } }));
    navigator.clipboard.writeText(texto).catch(() => {});
    setInsertado(true);
    setTimeout(() => setInsertado(false), 2500);
  }

  return (
    <button onClick={insertar} style={{
      marginTop: 4, display: "flex", alignItems: "center", gap: 5,
      background: insertado ? "rgba(201,169,97,.12)" : "transparent",
      border: "1px solid " + (insertado ? "rgba(201,169,97,.4)" : "rgba(26,35,50,.15)"),
      borderRadius: 6, padding: "5px 10px",
      fontSize: 11, fontWeight: 600, fontFamily: "'Montserrat', sans-serif",
      color: insertado ? "#c9a961" : "rgba(26,35,50,.45)",
      cursor: "pointer", transition: "all .15s",
    }}>
      {insertado
        ? <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg> Insertado</>
        : <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2v8M2 6h8" strokeLinecap="round"/></svg> Insertar en documento</>
      }
    </button>
  );
}

const LINEAS_MAX = 25;

function Mensaje({ msg, onGo, hayEditor, onConfirmarAccion }) {
  const esUser = msg.role === "user";
  const accion = msg.accion;
  const lineas = (msg.content || "").split("\n").length;
  const esLargo = !esUser && lineas > LINEAS_MAX;
  const [expandidoMsg, setExpandidoMsg] = useState(false);

  return (
    <div style={{
      display: "flex",
      justifyContent: esUser ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      {!esUser && (
        <div style={{ flexShrink: 0, marginRight: 8, marginTop: 2 }}>
          <ScribaAvatar size={26} />
        </div>
      )}
      <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column" }}>
        <div style={{
          background: esUser ? C.cerulean : "#f8f6f2",
          color: esUser ? "#fff" : C.dark,
          borderRadius: esUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          padding: "11px 14px",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          position: "relative",
          overflow: "hidden",
          maxHeight: esLargo && !expandidoMsg ? 380 : "none",
        }}>
          {esUser ? msg.content : renderMarkdown(msg.content)}
          {esLargo && !expandidoMsg && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              height: 60, background: "linear-gradient(transparent, #f8f6f2)",
              pointerEvents: "none",
            }}/>
          )}
        </div>
        {esLargo && (
          <button onClick={() => setExpandidoMsg(e => !e)} style={{
            alignSelf: "flex-start", marginTop: 4,
            background: "transparent", border: "none",
            fontSize: 11, fontWeight: 600, color: C.cerulean,
            cursor: "pointer", fontFamily: "'Montserrat',sans-serif", padding: "2px 0",
          }}>
            {expandidoMsg ? "▲ Ver menos" : "▼ Ver más"}
          </button>
        )}
        {msg.imagen && (
          <div style={{ marginTop: 4, fontSize: 11, color: "rgba(26,35,50,.4)", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="1" width="12" height="14" rx="1.5"/>
            </svg>
            {msg.imagen.nombre}
          </div>
        )}
        {!esUser && accion?.tipo === "completar_parte" && (
          <div style={{ marginTop: 8, background: "rgba(26,82,118,.05)", border: "1px solid rgba(26,82,118,.2)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginBottom: 8, fontWeight: 600 }}>
              Datos extraídos del documento
            </div>
            {[accion.datos, ...(accion.personas_adicionales || [])].filter(Boolean).map((persona, idx) => (
              <div key={idx} style={{ marginBottom: idx < (accion.personas_adicionales?.length || 0) ? 12 : 0 }}>
                {(accion.personas_adicionales?.length > 0) && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.cerulean, marginBottom: 4 }}>
                    Persona {idx + 1}
                  </div>
                )}
                <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.7, marginBottom: 6 }}>
                  {persona.apellido && <div><strong>Apellido:</strong> {persona.apellido}</div>}
                  {persona.nombre && <div><strong>Nombre:</strong> {persona.nombre}</div>}
                  {persona.nro_doc && <div><strong>DNI:</strong> {persona.nro_doc}</div>}
                  {persona.fecha_nac && <div><strong>Fecha nac.:</strong> {persona.fecha_nac}</div>}
                  {persona.genero && <div><strong>Género:</strong> {persona.genero === "M" ? "Masculino" : "Femenino"}</div>}
                  {persona.estado_civil && <div><strong>Estado civil:</strong> {persona.estado_civil}</div>}
                  {persona.nacionalidad && <div><strong>Nacionalidad:</strong> {persona.nacionalidad}</div>}
                  {persona.calle && <div><strong>Domicilio:</strong> {[persona.calle, persona.numero, persona.localidad].filter(Boolean).join(", ")}</div>}
                </div>
                <button onClick={() => {
                    window.dispatchEvent(new CustomEvent("scriba:completar_parte", { detail: persona }));
                    const nombre = [persona.apellido, persona.nombre].filter(Boolean).join(", ");
                    onConfirmarAccion?.(`Listo, agregué a **${nombre || "la persona"}** como parte al documento.`);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                    background: "#1a5276", border: "none", borderRadius: 6,
                    fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
                    fontFamily: "'Montserrat', sans-serif",
                  }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Agregar como parte
                </button>
              </div>
            ))}
          </div>
        )}
        {!esUser && accion?.tipo === "modificar_documento" && (
          <div style={{
            marginTop: 8,
            background: "rgba(26,82,118,.05)",
            border: "1px solid rgba(26,82,118,.2)",
            borderRadius: 8, padding: "10px 12px",
          }}>
            <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginBottom: 6, fontWeight: 600 }}>
              Documento modificado — listo para aplicar
            </div>
            <BtnAplicar contenido={accion.contenido} />
          </div>
        )}
        {!esUser && accion?.tipo === "insertar_texto" && (
          <div style={{
            marginTop: 8,
            background: "rgba(201,169,97,.07)",
            border: "1px solid rgba(201,169,97,.3)",
            borderRadius: 8, padding: "10px 12px",
          }}>
            <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginBottom: 6, fontWeight: 600 }}>
              Texto a insertar
            </div>
            <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {accion.texto}
            </div>
            <BtnInsertar texto={accion.texto} />
          </div>
        )}
        {!esUser && accion?.tipo === "abrir_editor" && (
          <button
            onClick={() => {
              const partes = accion.partes?.map(p => ({
                id:          Date.now() + Math.random(),
                apellido:    p.apellido    || "",
                nombre:      p.nombre      || "",
                genero:      p.genero      || "F",
                nacionalidad:p.nacionalidad|| "argentina",
                tipoDoc:     p.tipo_doc    || "DNI",
                nroDoc:      p.nro_doc     || "",
                cuit:        p.cuit        || "",
                fechaNac:    p.fecha_nac   || "",
                estadoCivil: p.estado_civil|| "",
                calle:       p.calle       || "",
                numero:      p.numero      || "",
                piso:        p.piso        || "",
                dpto:        p.dpto        || "",
                localidad:   p.localidad   || "",
                departamento:p.departamento|| "Ciudad",
                rol:         p.rol         || "",
              }));
              onGo?.("editor", {
                templateSlug: accion.slug,
                templateId:   accion.templateId,
                partes:       partes?.length ? partes : undefined,
                fecha:        accion.fecha  || undefined,
              });
            }}
            style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 6,
              background: C.cerulean, border: "none",
              borderRadius: 8, padding: "8px 14px",
              fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
              color: "#fff", cursor: "pointer",
              alignSelf: "flex-start",
              boxShadow: "0 2px 8px rgba(58,124,165,.3)",
              transition: "opacity .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="12" height="10" rx="1.5"/>
              <path d="M5 3V2M11 3V2M2 7h12" strokeLinecap="round"/>
            </svg>
            Abrir en editor — {accion.nombre}
          </button>
        )}
        {!esUser && <BtnCopiar texto={accion?.tipo === "insertar_texto" ? accion.texto : msg.content} />}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div style={{ flexShrink: 0, marginRight: 8, marginTop: 2 }}>
        <ScribaAvatar size={26} />
      </div>
      <div style={{
        background: "#f8f6f2", borderRadius: "14px 14px 14px 4px",
        padding: "12px 16px", display: "flex", gap: 4, alignItems: "center",
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "rgba(26,35,50,.3)",
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}/>
        ))}
      </div>
    </div>
  );
}

const SUGERENCIAS = [
  "¿Cuánto es el impuesto de sellos en Mendoza?",
  "Generame un poder especial",
  "¿Qué exige la UIF para una compraventa?",
];

export function ScribaPanel({ onClose, contexto, onGo }) {
  const { mensajesIniciales, cargandoInicio, historial, guardar, nueva, cargarConversacion, eliminarConversacion } = useScribaConversacion();
  const { registroActivo, usuario, session } = useAuth();
  const registroId = usuario?.registro_numero || registroActivo;
  const [mensajes,  setMensajes]  = useState([]);
  const [input,     setInput]     = useState("");
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState(null);
  const [imagen,    setImagen]    = useState(null); // { data, mediaType, nombre }
  const [expandido, setExpandido] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const fileRef    = useRef(null);
  const iniciadoRef = useRef(false);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // PDFs: enviar directo sin comprimir
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(",")[1];
        setImagen({ data: base64, mediaType: "application/pdf", nombre: file.name });
      };
      reader.readAsDataURL(file);
      return;
    }

    // Imágenes: comprimir a máximo 1200px y calidad 0.8
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const base64 = canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
      setImagen({ data: base64, mediaType: "image/jpeg", nombre: file.name });
    };
    img.src = url;
  }

  useEffect(() => {
    if (cargandoInicio || iniciadoRef.current) return;
    iniciadoRef.current = true;
    if (mensajesIniciales.length > 0) setMensajes(mensajesIniciales);
  }, [cargandoInicio, mensajesIniciales]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  useEffect(() => {
    if (!cargandoInicio) inputRef.current?.focus();
  }, [cargandoInicio]);

  async function handleNueva() {
    iniciadoRef.current = false;
    setMensajes([]);
    setError(null);
    await nueva();
    inputRef.current?.focus();
  }

  async function procesarImagen(imgActual) {
    const res = await fetch("/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagen: imgActual }),
    });
    let data;
    try { data = await res.json(); } catch { throw new Error(`Error del servidor (${res.status})`); }
    if (!res.ok) throw new Error(data.error || "Error procesando documento");
    return data;
  }

  async function enviar(texto) {
    const pregunta = (texto || input).trim();
    if ((!pregunta && !imagen) || cargando) return;

    const imgActual = imagen;
    setInput("");
    setImagen(null);
    setCargando(true);
    setError(null);

    // Si hay imagen, procesarla con el endpoint de visión dedicado
    if (imgActual) {
      const textoUsuario = pregunta || `Leé este documento: ${imgActual.nombre}`;
      const nuevosMensajes = [...mensajes, { role: "user", content: textoUsuario, imagen: { nombre: imgActual.nombre } }];
      setMensajes(nuevosMensajes);
      try {
        const datos = await procesarImagen(imgActual);
        const personas = datos.personas || [];
        const resumen = personas.length
          ? personas.map(p => `**${p.apellido || ""} ${p.nombre || ""}** — DNI ${p.nro_doc || ""}${p.fecha_nac ? `, nacido/a ${p.fecha_nac}` : ""}${p.estado_civil ? `, ${p.estado_civil}` : ""}`).join("\n")
          : "No encontré datos de personas en el documento.";
        const respuesta = `Documento leído: ${datos.tipo_documento || "documento"}.\n\n${resumen}${datos.notas ? `\n\n${datos.notas}` : ""}`;
        const accion = personas.length === 1
          ? { tipo: "completar_parte", datos: personas[0] }
          : personas.length > 1
          ? { tipo: "completar_parte", datos: personas[0], personas_adicionales: personas.slice(1) }
          : null;
        const mensajesFinales = [...nuevosMensajes, { role: "assistant", content: respuesta, accion }];
        setMensajes(mensajesFinales);
        guardar(mensajesFinales.map(({ role, content }) => ({ role, content })));
      } catch (e) {
        setError(e.message);
      } finally {
        setCargando(false);
      }
      return;
    }

    // Sin imagen: flujo normal de Scriba
    const nuevosMensajes = [...mensajes, { role: "user", content: pregunta }];
    setMensajes(nuevosMensajes);
    try {
      const res = await fetch("/api/scriba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: pregunta,
          mensajes_anteriores: mensajes,
          contexto: contexto || null,
          registroId: registroId || null,
          userToken: session?.access_token || null,
        }),
      });
      let data;
      try { data = await res.json(); } catch { throw new Error(`Error del servidor (${res.status})`); }
      if (!res.ok) throw new Error(data.error || "Error del servidor");
      const mensajesFinales = [...nuevosMensajes, { role: "assistant", content: data.respuesta, accion: data.accion || null }];
      setMensajes(mensajesFinales);
      guardar(mensajesFinales.map(({ role, content }) => ({ role, content })));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: .3; transform: scale(.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,.35)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: expandido ? "75vw" : 420, maxWidth: "100vw",
        transition: "width .2s ease",
        background: "#FDFCFA",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,.18)",
      }}>

        {/* Header */}
        <div style={{
          background: C.dark,
          padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0,
          borderBottom: "1px solid rgba(201,169,97,.12)",
        }}>
          <ScribaAvatar size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                color: "#FDFCFA", fontSize: 20,
                fontFamily: "'Carattere', cursive", fontWeight: 400,
              }}>Scriba</span>
              <SparkleIcon size={9} color="#7ec8e3" />
            </div>
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, marginTop: 1 }}>
              Asistente notarial · Mendoza, Argentina
            </div>
            {contexto && (
              <div style={{
                marginTop: 5, fontSize: 11,
                color: "#c9a961",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 260,
              }}>
                ✦ {contexto.tipoActo}{contexto.partes ? " · " + contexto.partes : ""}
              </div>
            )}
          </div>
          {mensajes.length > 0 && (
            <>
              <button onClick={() => { setMensajes([]); cargarHistorial?.(); }} title="Volver" style={{
                background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 6, width: 28, height: 28,
                color: "rgba(255,255,255,.55)", fontSize: 11, fontWeight: 600,
                fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M10 3L5 8l5 5"/>
                </svg>
              </button>
              <button onClick={handleNueva} style={{
                background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 6, padding: "5px 10px",
                color: "rgba(255,255,255,.55)", fontSize: 11, fontWeight: 600,
                fontFamily: "'Montserrat',sans-serif", cursor: "pointer", whiteSpace: "nowrap",
              }}>
                + Nueva
              </button>
            </>
          )}
          <button onClick={() => setExpandido(e => !e)} title={expandido ? "Reducir" : "Expandir"} style={{
            background: "rgba(255,255,255,.07)", border: "none",
            borderRadius: 6, width: 28, height: 28,
            color: "rgba(255,255,255,.5)", fontSize: 14,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {expandido
              ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 6l-4 4M6 2v4H2M10 14v-4h4"/></svg>
              : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 10l-4 4M2 10v4h4M10 6l4-4M14 6V2h-4"/></svg>
            }
          </button>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,.08)", border: "none",
            borderRadius: 6, width: 28, height: 28,
            color: "rgba(255,255,255,.6)", fontSize: 16,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Montserrat',sans-serif",
          }}>×</button>
        </div>

        {/* Mensajes */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "16px 16px 8px",
        }}>
          {mensajes.length === 0 && (
            <div style={{ paddingBottom: 12 }}>
              <div style={{ fontSize: 13, color: "rgba(26,35,50,.45)", marginBottom: 16, lineHeight: 1.6 }}>
                Consultame normativa, pedime un borrador o adjuntá un documento para leerlo.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SUGERENCIAS.map((s, i) => (
                  <button key={i} onClick={() => enviar(s)} style={{
                    background: "#f0ece3", border: "1px solid rgba(26,35,50,.1)",
                    borderRadius: 20, padding: "6px 12px",
                    fontSize: 12, color: "rgba(26,35,50,.7)",
                    fontFamily: "'Montserrat',sans-serif", cursor: "pointer",
                    transition: "background .1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#e8e2d8"}
                  onMouseLeave={e => e.currentTarget.style.background = "#f0ece3"}
                  >{s}</button>
                ))}
              </div>

              {historial.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
                    textTransform: "uppercase", color: "rgba(26,35,50,.35)",
                    marginBottom: 8,
                  }}>Retomar consulta</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {historial.slice(0, 5).map(c => (
                      <div key={c.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => cargarConversacion(c)} style={{
                          flex: 1, background: "transparent", border: "1px solid rgba(26,35,50,.1)",
                          borderRadius: 8, padding: "8px 12px",
                          textAlign: "left", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                          transition: "background .1s", minWidth: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8f6f2"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <span style={{ fontSize: 12, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.titulo || "Consulta anterior"}
                          </span>
                          <span style={{ fontSize: 10, color: "rgba(26,35,50,.35)", flexShrink: 0 }}>
                            {new Date(c.updated_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                          </span>
                        </button>
                        <button onClick={() => eliminarConversacion(c.id)}
                          title="Borrar"
                          style={{
                            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                            background: "transparent", border: "1px solid transparent",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "rgba(26,35,50,.3)", fontSize: 14, transition: "all .15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#fdf0f0"; e.currentTarget.style.borderColor = "#e07070"; e.currentTarget.style.color = "#c0392b"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "rgba(26,35,50,.3)"; }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mensajes.map((m, i) => (
            <Mensaje key={i} msg={m} onGo={onGo} hayEditor={!!contexto}
              onConfirmarAccion={(texto) => {
                const confirmacion = { role: "assistant", content: texto };
                setMensajes(prev => {
                  const nuevos = [...prev, confirmacion];
                  guardar(nuevos.map(({ role, content }) => ({ role, content })));
                  return nuevos;
                });
              }}
            />
          ))}
          {cargando && <LoadingDots />}

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 13px",
              fontSize: 12, color: "#b91c1c", marginBottom: 12,
            }}>
              Error: {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(26,35,50,.08)", flexShrink: 0 }}>
          {imagen && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
              background: "rgba(58,124,165,.06)", border: "1px solid rgba(58,124,165,.2)",
              borderRadius: 8, padding: "6px 10px",
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={C.cerulean} strokeWidth="1.5">
                <rect x="2" y="1" width="12" height="14" rx="1.5"/>
                <path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 11, color: C.cerulean, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {imagen.nombre}
              </span>
              <button onClick={() => setImagen(null)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(26,35,50,.4)", fontSize: 16, lineHeight: 1, padding: "0 2px",
              }}>×</button>
            </div>
          )}
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
            background: "#f8f6f2", border: "1px solid rgba(26,35,50,.14)",
            borderRadius: 10, padding: "8px 10px",
          }}>
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} title="Adjuntar documento"
              style={{
                width: 28, height: 28, borderRadius: 6, border: "none",
                background: imagen ? "rgba(58,124,165,.15)" : "transparent",
                color: imagen ? C.cerulean : "rgba(26,35,50,.35)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all .15s",
              }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 9l-5 5a4 4 0 01-5.66-5.66l6-6a2.5 2.5 0 013.54 3.54l-6.01 6a1 1 0 01-1.41-1.41l5-5" strokeLinecap="round"/>
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={imagen ? "Agregá instrucciones (opcional)..." : "Consultá sobre normativa, requisitos, impuestos..."}
              disabled={cargando}
              rows={1}
              style={{
                flex: 1, border: "none", background: "transparent",
                resize: "none", outline: "none",
                fontSize: 13, color: C.dark, lineHeight: 1.5,
                fontFamily: "'Montserrat',sans-serif",
                minHeight: 22, maxHeight: 120, overflowY: "auto",
              }}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            />
            <button
              onClick={() => enviar()}
              disabled={(!input.trim() && !imagen) || cargando}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: (input.trim() || imagen) && !cargando ? C.cerulean : "rgba(26,35,50,.12)",
                color: "#fff", cursor: (input.trim() || imagen) && !cargando ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background .15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={{ fontSize: 10, color: "rgba(26,35,50,.3)", marginTop: 6, textAlign: "center" }}>
            Enter para enviar · Shift+Enter para nueva línea · 📎 para adjuntar documento
          </div>
        </div>

      </div>
    </>
  );
}
