import { useState, useRef, useEffect, useCallback } from "react";
import { C } from "../constants";
import { aplicarTildesNombre } from "../utils/tildesNombres";
import { useScribaConversacion } from "../hooks/useScribaConversacion";
import { useAuth } from "../context/AuthContext";
import { logScriba } from "../utils/logger";

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

function SparkleIcon({ size = 10, color = "#3a7ca5" }) {
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
      color: copiado ? C.cerulean : "rgba(26,35,50,.5)",
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
      background: aplicado ? "rgba(58,124,165,.12)" : C.cerulean,
      border: "1px solid " + (aplicado ? "rgba(58,124,165,.4)" : C.cerulean),
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

function BtnAplicarExtravars({ valores }) {
  const [aplicado, setAplicado] = useState(false);

  function aplicar() {
    window.dispatchEvent(new CustomEvent("scriba:completar_extravars", { detail: valores }));
    setAplicado(true);
    setTimeout(() => setAplicado(false), 2500);
  }

  return (
    <button onClick={aplicar} style={{
      marginTop: 4, display: "flex", alignItems: "center", gap: 5,
      background: aplicado ? "rgba(58,124,165,.12)" : C.cerulean,
      border: "1px solid " + (aplicado ? "rgba(58,124,165,.4)" : C.cerulean),
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

function BtnAplicarVehiculo({ vehiculo }) {
  const [aplicado, setAplicado] = useState(false);

  function aplicar() {
    const v = vehiculo || {};
    const vehiculoData = {
      marca:         (v.marca     || "").toUpperCase(),
      modelo:        (v.modelo    || "").toUpperCase(),
      tipo_desc:     (v.tipo_desc || "").toUpperCase(),
      dominio:       (v.dominio   || "").toUpperCase(),
      chasis:        (v.chasis    || "").toUpperCase(),
      motor:         (v.motor     || "").toUpperCase(),
      tipo_vehiculo: "VEHÍCULO",
    };
    window.dispatchEvent(new CustomEvent("scriba:completar_vehiculo", { detail: vehiculoData }));
    setAplicado(true);
    setTimeout(() => setAplicado(false), 2500);
  }

  return (
    <button onClick={aplicar} style={{
      marginTop: 4, display: "flex", alignItems: "center", gap: 5,
      background: aplicado ? "rgba(58,124,165,.12)" : C.cerulean,
      border: "1px solid " + (aplicado ? "rgba(58,124,165,.4)" : C.cerulean),
      borderRadius: 6, padding: "5px 10px",
      fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
      color: aplicado ? C.cerulean : "#fff",
      cursor: "pointer", transition: "all .15s",
    }}>
      {aplicado
        ? <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg> Aplicado</>
        : <><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3L5 7l-2-2" strokeLinecap="round" strokeLinejoin="round"/></svg> Cargar datos del vehículo</>
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
      color: insertado ? "#c9a961" : "rgba(26,35,50,.5)",
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

function mapearPartesParaEditor(partesAccion) {
  return partesAccion?.map(p => ({
    id:          Date.now() + Math.random(),
    apellido:    (p.apellido || "").toUpperCase(),
    nombre:      aplicarTildesNombre((p.nombre || "").toUpperCase()),
    genero:      p.genero      || "",
    nacionalidad:p.nacionalidad|| "",
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
}

function Mensaje({ msg, onGo, hayEditor, onConfirmarAccion, yaEsParte, rolesPartes }) {
  const esUser = msg.role === "user";
  const accion = msg.accion;
  const lineas = (msg.content || "").split("\n").length;
  const esLargo = !esUser && lineas > LINEAS_MAX;
  const [rolesSeleccionados, setRolesSeleccionados] = useState({});
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
            cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: "2px 0",
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
          <div style={{ marginTop: 8, background: "rgba(58,124,165,.06)", border: "1px solid rgba(58,124,165,.2)", borderRadius: 8, padding: "10px 12px" }}>
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
                {rolesPartes?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "rgba(26,35,50,.5)", fontWeight: 600, marginBottom: 4 }}>
                      Función en el acto *
                    </div>
                    <select
                      value={rolesSeleccionados[idx] ?? (persona.rol || "")}
                      onChange={e => setRolesSeleccionados(prev => ({ ...prev, [idx]: e.target.value }))}
                      style={{
                        width: "100%", padding: "5px 8px", borderRadius: 6, fontSize: 12,
                        border: "1px solid rgba(26,35,50,.2)", background: "#fff",
                        fontFamily: "'Montserrat', sans-serif", color: "#1a2332",
                      }}>
                      <option value="">— seleccioná el rol —</option>
                      {rolesPartes.filter(Boolean).map(r => (
                        <option key={r} value={r.toUpperCase().split("/")[0].trim()}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button onClick={() => {
                    const rolFinal = rolesSeleccionados[idx] ?? (persona.rol || "");
                    if (rolesPartes?.length > 0 && !rolFinal) {
                      alert("Seleccioná la función de esta persona en el acto antes de agregarla.");
                      return;
                    }
                    const detalle = { ...persona, rol: rolFinal || persona.rol || "" };
                    window.dispatchEvent(new CustomEvent("scriba:completar_parte", { detail: detalle }));
                    const nombre = [persona.apellido, persona.nombre].filter(Boolean).join(", ");
                    onConfirmarAccion?.(`Listo, agregué a **${nombre || "la persona"}** como parte al documento.`);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                    background: C.cerulean, border: "none", borderRadius: 6,
                    fontSize: 11, fontWeight: 700, color: "#FDFCFA", cursor: "pointer",
                    fontFamily: "'Montserrat', sans-serif",
                  }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {yaEsParte ? "Actualizar datos" : "Agregar como parte"}
                </button>
              </div>
            ))}
          </div>
        )}
        {!esUser && accion?.tipo === "modificar_documento" && (
          <div style={{
            marginTop: 8,
            background: "rgba(58,124,165,.06)",
            border: "1px solid rgba(58,124,165,.2)",
            borderRadius: 8, padding: "10px 12px",
          }}>
            <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginBottom: 6, fontWeight: 600 }}>
              Documento modificado — listo para aplicar
            </div>
            <BtnAplicar contenido={accion.contenido} />
          </div>
        )}
        {!esUser && accion?.tipo === "completar_extravars" && (
          <div style={{
            marginTop: 8,
            background: "rgba(58,124,165,.06)",
            border: "1px solid rgba(58,124,165,.2)",
            borderRadius: 8, padding: "10px 12px",
          }}>
            <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginBottom: 6, fontWeight: 600 }}>
              Campos a completar en el documento
            </div>
            <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.7, marginBottom: 6 }}>
              {Object.entries(accion.valores || {}).map(([nombre, valor]) => (
                <div key={nombre}><strong>{nombre}:</strong> {String(valor)}</div>
              ))}
            </div>
            <BtnAplicarExtravars valores={accion.valores} />
          </div>
        )}
        {!esUser && accion?.tipo === "completar_vehiculo" && (
          <div style={{
            marginTop: 8,
            background: "rgba(58,124,165,.06)",
            border: "1px solid rgba(58,124,165,.2)",
            borderRadius: 8, padding: "10px 12px",
          }}>
            <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginBottom: 8, fontWeight: 600 }}>
              Vehículo leído
            </div>
            <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.7, marginBottom: 6 }}>
              {accion.vehiculo?.marca   && <div><strong>Marca:</strong> {accion.vehiculo.marca}</div>}
              {accion.vehiculo?.modelo  && <div><strong>Modelo:</strong> {accion.vehiculo.modelo}</div>}
              {accion.vehiculo?.dominio && <div><strong>Dominio:</strong> {accion.vehiculo.dominio}</div>}
            </div>
            <BtnAplicarVehiculo vehiculo={accion.vehiculo} />
            {accion.titular?.nro_doc && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(26,35,50,.1)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.cerulean, marginBottom: 4 }}>Titular</div>
                <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.7, marginBottom: 6 }}>
                  {accion.titular.apellido && <div><strong>Apellido:</strong> {accion.titular.apellido}</div>}
                  {accion.titular.nombre   && <div><strong>Nombre:</strong> {accion.titular.nombre}</div>}
                  {accion.titular.nro_doc  && <div><strong>DNI:</strong> {accion.titular.nro_doc}</div>}
                </div>
                <button onClick={() => {
                    window.dispatchEvent(new CustomEvent("scriba:completar_parte", { detail: accion.titular }));
                    const nombre = [accion.titular.apellido, accion.titular.nombre].filter(Boolean).join(", ");
                    onConfirmarAccion?.(`Listo, agregué a **${nombre || "el titular"}** como parte al documento.`);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                    background: C.cerulean, border: "none", borderRadius: 6,
                    fontSize: 11, fontWeight: 700, color: "#FDFCFA", cursor: "pointer",
                    fontFamily: "'Montserrat', sans-serif",
                  }}>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Agregar como parte
                </button>
              </div>
            )}
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
              const partes = mapearPartesParaEditor(accion.partes);
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
        {!esUser && accion?.tipo === "crear_documento_libre" && (
          <button
            onClick={() => {
              const partes = mapearPartesParaEditor(accion.partes);
              onGo?.("editor", {
                templateSlug: "documento_libre",
                templateId:   null,
                templateContenidoLibre: accion.contenido,
                variablesLibres: accion.campos_libres || [],
                partes:       partes?.length ? partes : undefined,
                fecha:        accion.fecha  || undefined,
              });
            }}
            style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 6,
              background: "#c9a961", border: "none",
              borderRadius: 8, padding: "8px 14px",
              fontSize: 12, fontWeight: 700, fontFamily: "'Montserrat', sans-serif",
              color: "#fff", cursor: "pointer",
              alignSelf: "flex-start",
              boxShadow: "0 2px 8px rgba(201,169,97,.35)",
              transition: "opacity .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="12" height="10" rx="1.5"/>
              <path d="M5 3V2M11 3V2M2 7h12" strokeLinecap="round"/>
            </svg>
            Abrir borrador libre
          </button>
        )}
        {!esUser && <BtnCopiar texto={accion?.tipo === "insertar_texto" ? accion.texto : msg.content} />}
      </div>
    </div>
  );
}

function LoadingDots({ label }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div style={{ flexShrink: 0, marginRight: 8, marginTop: 2 }}>
        <ScribaAvatar size={26} />
      </div>
      <div style={{
        background: "#f8f6f2", borderRadius: "14px 14px 14px 4px",
        padding: "12px 16px", display: "flex", gap: 8, alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "rgba(26,35,50,.3)",
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}/>
          ))}
        </div>
        {label && <span style={{ fontSize: 11, color: "rgba(26,35,50,.45)" }}>{label}</span>}
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
  const [archivos,  setArchivos]  = useState([]); // [{ data, mediaType, nombre, sizeBytes }]
  const [expandido, setExpandido] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const fileRef    = useRef(null);
  const iniciadoRef = useRef(false);
  const ultimoFalloRef = useRef(null);

  const LIMITE_ADJUNTOS = 2.4 * 1024 * 1024; // ~2.4MB crudos → deja margen dentro del límite de body de Vercel (~4.5MB)

  function handleFile(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const actual = archivos.reduce((s, a) => s + (a.sizeBytes || 0), 0);
    const nuevo = files.reduce((s, f) => s + f.size, 0);
    if (actual + nuevo > LIMITE_ADJUNTOS) {
      alert("Los archivos adjuntados son demasiado pesados en conjunto. Adjuntá menos archivos o archivos más livianos (límite ~2.4MB en total).");
      return;
    }

    files.forEach(agregarArchivo);
  }

  const DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  function agregarArchivo(file) {
    // PDFs y Word (.docx): enviar directo sin comprimir
    const esDocx = file.type === DOCX_MEDIA_TYPE || file.name?.toLowerCase().endsWith(".docx");
    if (file.type === "application/pdf" || esDocx) {
      const mediaType = file.type === "application/pdf" ? "application/pdf" : DOCX_MEDIA_TYPE;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(",")[1];
        setArchivos(prev => [...prev, { data: base64, mediaType, nombre: file.name, sizeBytes: file.size }]);
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
      setArchivos(prev => [...prev, { data: base64, mediaType: "image/jpeg", nombre: file.name, sizeBytes: Math.round(base64.length * 0.75) }]);
    };
    img.src = url;
  }

  function quitarArchivo(idx) {
    setArchivos(prev => prev.filter((_, i) => i !== idx));
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

  // Recuperar foco cuando OO termina de cargar (evita que OO robe el cursor)
  useEffect(() => {
    const handler = () => inputRef.current?.focus();
    window.addEventListener("oo:document-ready", handler);
    return () => window.removeEventListener("oo:document-ready", handler);
  }, []);

  async function handleNueva() {
    iniciadoRef.current = false;
    setMensajes([]);
    setError(null);
    ultimoFalloRef.current = null;
    await nueva();
    inputRef.current?.focus();
  }

  // Manejar localmente actualizaciones simples de datos de partes sin llamar a la API
  function manejarActualizacionLocal(pregunta) {
    // Buscar la última acción de completar_parte en el historial
    const ultimoConAccion = [...mensajes].reverse().find(m => m.accion?.tipo === "completar_parte");
    if (!ultimoConAccion) return false;

    const datos = { ...ultimoConAccion.accion.datos };
    let actualizado = false;
    const confirmaciones = [];

    const VERBOS = "añad[ae]?(?:mos)?|sumar?|sum[aé]le?|agrega[r]?|pon[e]?(?:mos)?|ponle|coloca[r]?";

    // "añadí/sumá/ponele (el) estado civil soltero" O bare "estado civil soltero"
    const matchEC = pregunta.match(
      new RegExp(
        `(?:(?:${VERBOS})\\s+(?:el\\s+|la\\s+)?(?:estado\\s+civil\\s+)?(?:de\\s+)?|estado\\s+civil\\s+)(soltero|casad[ao]|divorciad[ao]|viud[ao]|separad[ao]|conviviente)`,
        "i"
      )
    );
    if (matchEC) {
      datos.estado_civil = matchEC[1].toLowerCase().replace(/a$/, "o");
      actualizado = true;
      confirmaciones.push(`estado civil **${datos.estado_civil}**`);
    }

    const ROLES = "vendedor|comprador|donante|donatario|fiduciante|fiduciario|mandante|mandatario|cedente|cesionario|locador|locatario|deudor|acreedor|garante|hipotecante";
    // "su rol es / el rol es / rol es X" O verbo + (el/de) + (rol de/es) + X
    const matchRol = pregunta.match(
      new RegExp(
        `(?:(?:${VERBOS})\\s+(?:el\\s+|de\\s+)?(?:rol\\s+(?:de\\s+|es\\s+)?)?|(?:su|el)\\s+rol\\s+(?:es|de)\\s+|rol\\s+(?:es|de)\\s+)(${ROLES})`,
        "i"
      )
    );
    if (matchRol) {
      datos.rol = matchRol[1].toUpperCase();
      actualizado = true;
      confirmaciones.push(`rol **${datos.rol}**`);
    }

    if (!actualizado) return false;

    window.dispatchEvent(new CustomEvent("scriba:completar_parte", { detail: datos }));
    const nombre = [datos.apellido, datos.nombre].filter(Boolean).join(", ");
    const confirm = confirmaciones.length === 1
      ? `Listo, actualicé ${confirmaciones[0]} para ${nombre}.`
      : `Listo, actualicé ${confirmaciones.join(" y ")} para ${nombre}.`;

    const nuevos = [...mensajes,
      { role: "user", content: pregunta },
      { role: "assistant", content: confirm, accion: { tipo: "completar_parte", datos } }
    ];
    setMensajes(nuevos);
    guardar(nuevos.map(({ role, content }) => ({ role, content })));
    return true;
  }

  async function procesarEnvio(textoUsuario, archivosActuales, mensajesBase) {
    setCargando(true);
    setError(null);

    const nombres = archivosActuales.map(a => a.nombre).join(", ");
    const nuevosMensajes = [...mensajesBase, {
      role: "user", content: textoUsuario,
      ...(archivosActuales.length ? { imagen: { nombre: archivosActuales.length > 1 ? `${archivosActuales.length} archivos` : nombres } } : {}),
    }];
    setMensajes(nuevosMensajes);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/scriba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: textoUsuario,
          mensajes_anteriores: mensajesBase,
          contexto: contexto || null,
          registroId: registroId || null,
          userToken: session?.access_token || null,
          documentos_adjuntos: archivosActuales.map(a => ({ data: a.data, mediaType: a.mediaType, nombre: a.nombre })),
        }),
      });
      let data;
      try { data = await res.json(); } catch { throw new Error(`Error del servidor (${res.status})`); }
      if (!res.ok) throw new Error(data.error || "Error del servidor");
      const mensajesFinales = [...nuevosMensajes, { role: "assistant", content: data.respuesta, accion: data.accion || null }];
      setMensajes(mensajesFinales);
      guardar(mensajesFinales.map(({ role, content }) => ({ role, content })));
      logScriba({ slug: contexto?.slug, screen: contexto?.screen, input: textoUsuario, response: data.respuesta, duration_ms: Date.now() - t0 });
      ultimoFalloRef.current = null;
    } catch (e) {
      setError(e.message);
      ultimoFalloRef.current = { textoUsuario, archivosActuales, mensajesBase };
      logScriba({ slug: contexto?.slug, screen: contexto?.screen, input: textoUsuario, error: e.message, duration_ms: Date.now() - t0 });
    } finally {
      setCargando(false);
    }
  }

  async function enviar(texto) {
    const pregunta = (texto || input).trim();
    if ((!pregunta && !archivos.length) || cargando) return;

    // Intentar manejar localmente antes de llamar a la API
    if (!archivos.length && manejarActualizacionLocal(pregunta)) {
      setInput("");
      return;
    }

    const archivosActuales = archivos;
    const mensajesBase = mensajes;
    setInput("");
    setArchivos([]);

    const nombres = archivosActuales.map(a => a.nombre).join(", ");
    const textoUsuario = pregunta || (archivosActuales.length
      ? (archivosActuales.length > 1 ? `Miral estos archivos: ${nombres}` : `Miral este archivo: ${nombres}`)
      : "");

    await procesarEnvio(textoUsuario, archivosActuales, mensajesBase);
  }

  function reintentar() {
    if (!ultimoFalloRef.current || cargando) return;
    const { textoUsuario, archivosActuales, mensajesBase } = ultimoFalloRef.current;
    procesarEnvio(textoUsuario, archivosActuales, mensajesBase);
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
          position: "fixed", top: 0, left: 0, bottom: 0, right: contexto?.panelPropiedadesAncho || 0, zIndex: 200,
          background: "rgba(0,0,0,.35)",
          transition: "right .2s ease",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: contexto?.panelPropiedadesAncho || 0, bottom: 0, zIndex: 201,
        width: expandido ? "75vw" : 480, maxWidth: "100vw",
        transition: "width .2s ease, right .2s ease",
        background: "#FDFCFA",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,.18)",
      }}>

        {/* Header */}
        <div style={{
          background: C.dark,
          padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 10,
          flexShrink: 0,
          borderBottom: "1px solid rgba(201,169,97,.12)",
          minHeight: 60,
        }}>
          {/* Avatar */}
          <ScribaAvatar size={32} />

          {/* Título — flex:1 con minWidth:0 para que trunque correctamente */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: "#FDFCFA", fontSize: 18, fontFamily: "'Carattere', cursive", fontWeight: 400, lineHeight: 1 }}>Scriba</span>
              <SparkleIcon size={8} color="#3a7ca5" />
            </div>
            <div style={{ color: "rgba(255,255,255,.65)", fontSize: 11, marginTop: 1 }}>
              Asistente notarial · Mendoza, Argentina
            </div>
            {contexto && (
              <div style={{ marginTop: 3, fontSize: 10, color: "#c9a961", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                ✦ {contexto.tipoActo}{contexto.partes ? " · " + contexto.partes : ""}
              </div>
            )}
          </div>

          {/* Botonera — siempre en un contenedor de ancho fijo, sin layout shifts */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {mensajes.length > 0 && (
              <button onClick={handleNueva} title="Volver"
                style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 6, width: 28, height: 28, color: "rgba(255,255,255,.85)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
              </button>
            )}
            {mensajes.length > 0 && (
              <button onClick={handleNueva}
                style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 6, padding: "4px 9px", color: "rgba(255,255,255,.85)", fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, height: 28 }}>
                + Nueva
              </button>
            )}
            <button onClick={() => setExpandido(e => !e)} title={expandido ? "Reducir" : "Expandir"}
              style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 6, width: 28, height: 28, color: "rgba(255,255,255,.85)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {expandido
                ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 6l-4 4M6 2v4H2M10 14v-4h4"/></svg>
                : <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 10l-4 4M2 10v4h4M10 6l4-4M14 6V2h-4"/></svg>
              }
            </button>
            <button onClick={onClose}
              style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 6, width: 28, height: 28, color: "rgba(255,255,255,.85)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
              ×
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "16px 16px 8px",
        }}>
          {mensajes.length === 0 && (
            <div style={{ paddingBottom: 12 }}>
              <div style={{ fontSize: 13, color: "rgba(26,35,50,.65)", marginBottom: 16, lineHeight: 1.6 }}>
                Consultame normativa, pedime un borrador o adjuntá un documento para leerlo.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {SUGERENCIAS.map((s, i) => (
                  <button key={i} onClick={() => enviar(s)} style={{
                    background: "#f0ece3", border: "1px solid rgba(26,35,50,.1)",
                    borderRadius: 20, padding: "6px 12px",
                    fontSize: 12, color: "rgba(26,35,50,.7)",
                    fontFamily: "'Inter', sans-serif", cursor: "pointer",
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

          {mensajes.map((m, i) => {
            const yaEsParte = m.accion?.tipo === "completar_parte" &&
              mensajes.slice(0, i).some(prev =>
                prev.accion?.tipo === "completar_parte" &&
                prev.accion.datos?.nro_doc && prev.accion.datos.nro_doc === m.accion.datos?.nro_doc
              );
            return (
            <Mensaje key={i} msg={m} onGo={onGo} hayEditor={!!contexto} yaEsParte={yaEsParte} rolesPartes={contexto?.rolesPartes}
              onConfirmarAccion={(texto) => {
                const confirmacion = { role: "assistant", content: texto };
                setMensajes(prev => {
                  const nuevos = [...prev, confirmacion];
                  guardar(nuevos.map(({ role, content }) => ({ role, content })));
                  return nuevos;
                });
              }}
            />
            );
          })}
          {cargando && <LoadingDots />}

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 13px",
              fontSize: 12, color: "#b91c1c", marginBottom: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}>
              <span>Error: {error}</span>
              <button
                onClick={reintentar}
                disabled={cargando}
                style={{
                  flexShrink: 0, background: "#b91c1c", color: "#fff", border: "none",
                  borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600,
                  cursor: cargando ? "default" : "pointer", opacity: cargando ? 0.6 : 1,
                }}
              >
                Reintentar
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(26,35,50,.08)", flexShrink: 0 }}>
          {archivos.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              {archivos.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(58,124,165,.06)", border: "1px solid rgba(58,124,165,.2)",
                  borderRadius: 8, padding: "6px 10px",
                }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={C.cerulean} strokeWidth="1.5">
                    <rect x="2" y="1" width="12" height="14" rx="1.5"/>
                    <path d="M5 5h6M5 8h6M5 11h4" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: 11, color: C.cerulean, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.nombre}
                  </span>
                  <button onClick={() => quitarArchivo(i)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(26,35,50,.4)", fontSize: 16, lineHeight: 1, padding: "0 2px",
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
            background: "#fff", border: "1.5px solid rgba(26,35,50,.22)",
            borderRadius: 10, padding: "8px 10px",
          }}>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.docx" multiple style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} title="Adjuntar documento (Scriba identifica de qué se trata)"
              style={{
                width: 28, height: 28, borderRadius: 6, border: "none",
                background: archivos.length ? "rgba(58,124,165,.15)" : "transparent",
                color: archivos.length ? C.cerulean : "rgba(26,35,50,.35)",
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
              placeholder={archivos.length ? "Agregá instrucciones (opcional)..." : "Consultá sobre normativa, requisitos, impuestos..."}
              disabled={cargando}
              rows={1}
              style={{
                flex: 1, border: "none", background: "transparent",
                resize: "none", outline: "none",
                fontSize: 13, color: C.dark, lineHeight: "20px",
                fontFamily: "'Inter', sans-serif",
                height: 20, minHeight: 20, maxHeight: 120,
                overflowY: "auto", display: "block",
                verticalAlign: "middle", padding: 0, margin: 0,
                caretColor: C.cerulean,
              }}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            />
            <button
              onClick={() => enviar()}
              disabled={(!input.trim() && !archivos.length) || cargando}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: (input.trim() || archivos.length) && !cargando ? C.cerulean : "rgba(26,35,50,.12)",
                color: "#fff", cursor: (input.trim() || archivos.length) && !cargando ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background .15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div style={{ fontSize: 10, color: "rgba(26,35,50,.55)", marginTop: 6, textAlign: "center" }}>
            Enter para enviar · Shift+Enter para nueva línea · 📎 adjuntar (DNI, vehículo, boleto, contrato, cualquier documento)
          </div>
          <div style={{
            fontSize: 10, color: C.cerulean,
            marginTop: 8, textAlign: "center", lineHeight: 1.4,
            borderTop: "1px solid rgba(58,124,165,.15)", paddingTop: 7,
          }}>
            Scriba es un asistente de IA y puede cometer errores. Verificá la información antes de aplicarla.
          </div>
        </div>

      </div>
    </>
  );
}
