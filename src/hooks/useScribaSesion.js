import { useState, useRef, useEffect } from "react";
import { useScribaConversacion } from "./useScribaConversacion";
import { useAuth } from "../context/AuthContext";
import { logScriba } from "../utils/logger";
import { apiPost } from "../utils/apiFetch";
import { capturaCompu } from "../utils/capturaApi";
import { iniciarSesionCaptura, generarSvgQR, capturaCelularHabilitada } from "./useSesionCaptura";

import { DOCX_MIME } from "../utils/docxMime";

// Resultado de la captura del celular -> forma que espera el servidor de Scriba (datos_captura).
// Las personas "sobrantes" (de una captura de una sola parte) también cuentan: Scriba las ve numeradas.
function normalizarCaptura(resultado, modo) {
  return {
    modo,
    personas: [...(resultado.personas || []), ...(resultado.sobrantes || [])],
    vehiculos: (resultado.vehiculos || []).map((v) => ({ vehiculo: v.vehiculo, titular: v.titular || null })),
    dorsos: resultado.dorsos || [],
    otros: resultado.otros || [],
  };
}
// Dueño del estado de una sesión de Scriba (mensajes, borrador, adjuntos,
// pedido en curso, aviso de "hay algo nuevo"). Se instancia UNA vez en
// App.jsx, no dentro de ScribaPanel — así sobrevive a que el panel se
// cierre y se vuelva a abrir, que es justo lo que antes lo destruía.
// Ver specs/persistencia-chat-scriba/plan.md para el porqué.

const LIMITE_ADJUNTOS = 2.4 * 1024 * 1024; // ~2.4MB crudos — margen dentro del límite de body de Vercel (~4.5MB)

export function useScribaSesion(contexto) {
  const { mensajesIniciales, cargandoInicio, historial, guardar, nueva, cargarConversacion: cargarConversacionBase, eliminarConversacion } = useScribaConversacion();
  const { registroActivo, usuario, miUsuario } = useAuth();
  const capturaHabilitada = capturaCelularHabilitada({ miUsuario, usuario });
  const registroId = usuario?.registro_numero || registroActivo;

  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [archivos, setArchivos] = useState([]); // [{ data, mediaType, nombre, sizeBytes }]
  const [avisoPendiente, setAvisoPendiente] = useState(false);

  const iniciadoRef = useRef(false);
  const ultimoFalloRef = useRef(null);
  const panelAbiertoRef = useRef(false);

  // Captura de documentos desde el celular. La sesión del QR vive ACÁ (no en la tarjeta del chat) para que sobreviva
  // a cerrar y reabrir el panel. Los datos leídos quedan en memoria hasta que el usuario los aplica: viajan a Scriba
  // en cada pedido (datos_captura) y nunca se guardan en el historial de la conversación.
  const [capturaActiva, setCapturaActiva] = useState(null); // { estado, svg, fotos, etiqueta, error }
  const capturaCtrlRef = useRef(null);
  const capturaDatosRef = useRef(null);
  const enviarRef = useRef(null);

  function cancelarCaptura() {
    capturaCtrlRef.current?.detener();
    capturaCtrlRef.current = null;
    setCapturaActiva(null);
  }

  function iniciarCaptura({ modo, rol }) {
    cancelarCaptura();
    setCapturaActiva({ estado: "creando", fotos: 0 });
    capturaCtrlRef.current = iniciarSesionCaptura(capturaCompu, {
      modo,
      contexto: rol ? { rol } : {},
      generarSvg: generarSvgQR,
      onCambio: (c) => setCapturaActiva((prev) => (prev ? { ...prev, ...(c.sesion ? { etiqueta: c.sesion.etiqueta } : {}), ...c } : prev)),
      onResultado: async (resultado) => {
        capturaDatosRef.current = normalizarCaptura(resultado, modo);
        // Scriba responde con lo que encontró y pregunta lo que falte (ver la nota [FOTOS RECIBIDAS DEL CELULAR])
        await enviarRef.current?.(`📱 Subí fotos desde el celular: ${resultado.resumen || "listo"}.`);
      },
    });
  }

  function limpiarCapturaDatos() { capturaDatosRef.current = null; }

  // El escribano tocó "Subir desde el celular" en una oferta de Scriba: se agrega un mensaje nuevo (abajo, bien a la
  // vista) que muestra el QR, y arranca la sesión.
  function aceptarOfertaCaptura({ modo, rol }) {
    const mensajeQR = { role: "assistant", content: "Escaneá este código con el celular y subí las fotos.", accion: { tipo: "captura_celular", modo, rol: rol || null } };
    setMensajes(prev => {
      const nuevos = [...prev, mensajeQR];
      guardar(nuevos.map(({ role, content }) => ({ role, content })));
      return nuevos;
    });
    iniciarCaptura({ modo, rol });
  }

  // Al desmontar la app, una captura a medias se cancela (el servidor borra todo)
  useEffect(() => () => capturaCtrlRef.current?.detener(), []);

  useEffect(() => {
    if (cargandoInicio || iniciadoRef.current) return;
    iniciadoRef.current = true;
    if (mensajesIniciales.length > 0) setMensajes(mensajesIniciales);
  }, [cargandoInicio, mensajesIniciales]);

  function marcarPanelAbierto(abierto) {
    panelAbiertoRef.current = abierto;
    if (abierto) setAvisoPendiente(false);
  }

  function handleFiles(files) {
    if (!files?.length) return;
    files.forEach(agregarArchivo);
  }

  // El límite se aplica sobre el peso REAL que se va a transmitir -- para
  // una imagen eso es DESPUÉS de comprimir (una foto de celular sin editar
  // pesa crudo 3-8MB, pero termina pesando una fracción de eso una vez
  // reducida a 1200px; juzgarla por el tamaño crudo la rechazaba de entrada
  // sin necesidad). Para PDF/docx, que se mandan sin comprimir, el tamaño
  // real es el crudo.
  function agregarConLimite(nuevoArchivo) {
    setArchivos(prev => {
      const actual = prev.reduce((s, a) => s + (a.sizeBytes || 0), 0);
      if (actual + nuevoArchivo.sizeBytes > LIMITE_ADJUNTOS) {
        alert("Los archivos adjuntados son demasiado pesados en conjunto. Adjuntá menos archivos o archivos más livianos (límite ~2.4MB en total).");
        return prev;
      }
      return [...prev, nuevoArchivo];
    });
  }

  function agregarArchivo(file) {
    // PDFs y Word (.docx): enviar directo sin comprimir
    const esDocx = file.type === DOCX_MIME || file.name?.toLowerCase().endsWith(".docx");
    if (file.type === "application/pdf" || esDocx) {
      const mediaType = file.type === "application/pdf" ? "application/pdf" : DOCX_MIME;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(",")[1];
        agregarConLimite({ data: base64, mediaType, nombre: file.name, sizeBytes: file.size });
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
      agregarConLimite({ data: base64, mediaType: "image/jpeg", nombre: file.name, sizeBytes: Math.round(base64.length * 0.75) });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert(`No pude leer "${file.name}" — el formato no es un PDF, un .docx ni una imagen reconocible.`);
    };
    img.src = url;
  }

  function quitarArchivo(idx) {
    setArchivos(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleNueva() {
    iniciadoRef.current = false;
    setMensajes([]);
    setInput("");
    setArchivos([]);
    ultimoFalloRef.current = null;
    cancelarCaptura();
    limpiarCapturaDatos();
    await nueva();
  }

  // Manejar localmente actualizaciones simples de datos de partes sin llamar a la API
  function manejarActualizacionLocal(pregunta) {
    const ultimoConAccion = [...mensajes].reverse().find(m => m.accion?.tipo === "completar_parte");
    if (!ultimoConAccion) return false;

    const datos = { ...ultimoConAccion.accion.datos };
    let actualizado = false;
    const confirmaciones = [];

    const VERBOS = "añad[ae]?(?:mos)?|sumar?|sum[aé]le?|agrega[r]?|pon[e]?(?:mos)?|ponle|coloca[r]?";

    const matchEC = pregunta.match(
      new RegExp(
        `(?:(?:${VERBOS})\\s+(?:el\\s+|la\\s+)?(?:estado\\s+civil\\s+)?(?:de\\s+)?|estado\\s+civil\\s+)(soltero|casad[ao]|divorciad[ao]|viud[ao]|separad[ao]|conviviente)`,
        "i"
      )
    );
    if (matchEC) {
      datos.estado_civil = matchEC[1].toLowerCase().replace(/a$/, "o");
      if (datos.estado_civil === "conviviente") datos.estado_civil = "unión convivencial"; // el valor de la lista de estados civiles
      actualizado = true;
      confirmaciones.push(`estado civil **${datos.estado_civil}**`);
    }

    const ROLES = "vendedor|comprador|donante|donatario|fiduciante|fiduciario|mandante|mandatario|cedente|cesionario|locador|locatario|deudor|acreedor|garante|hipotecante";
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

  function confirmarAccion(texto) {
    const confirmacion = { role: "assistant", content: texto };
    setMensajes(prev => {
      const nuevos = [...prev, confirmacion];
      guardar(nuevos.map(({ role, content }) => ({ role, content })));
      return nuevos;
    });
  }

  async function procesarEnvio(textoUsuario, archivosActuales, mensajesBase) {
    setCargando(true);

    const nombres = archivosActuales.map(a => a.nombre).join(", ");
    const nuevosMensajes = [...mensajesBase, {
      role: "user", content: textoUsuario,
      ...(archivosActuales.length ? { imagen: { nombre: archivosActuales.length > 1 ? `${archivosActuales.length} archivos` : nombres } } : {}),
    }];
    setMensajes(nuevosMensajes);
    const t0 = Date.now();
    try {
      const data = await apiPost("/api/scriba", {
        mensaje: textoUsuario,
        mensajes_anteriores: mensajesBase,
        contexto: contexto || null,
        registroId: registroId || null,
        documentos_adjuntos: archivosActuales.map(a => ({ data: a.data, mediaType: a.mediaType, nombre: a.nombre })),
        ...(capturaHabilitada ? { captura_celular: true } : {}),   // abierta a todos desde el 06/11/26
        ...(capturaDatosRef.current ? { datos_captura: capturaDatosRef.current } : {}),
      });
      const mensajesFinales = [...nuevosMensajes, { role: "assistant", content: data.respuesta, accion: data.accion || null }];
      setMensajes(mensajesFinales);
      guardar(mensajesFinales.map(({ role, content }) => ({ role, content })));
      if (data.accion?.tipo === "captura_celular") iniciarCaptura(data.accion);
      logScriba({ slug: contexto?.slug, screen: contexto?.screen, input: textoUsuario, response: data.respuesta, duration_ms: Date.now() - t0 })
        .then(logRow => {
          if (!logRow?.id) return;
          setMensajes(prev => {
            const idx = prev.length - 1;
            if (idx < 0 || prev[idx].role !== "assistant" || prev[idx].content !== data.respuesta) return prev;
            const actualizados = [...prev];
            actualizados[idx] = { ...actualizados[idx], logId: logRow.id };
            return actualizados;
          });
        });
      ultimoFalloRef.current = null;
      if (!panelAbiertoRef.current) setAvisoPendiente(true);
    } catch (e) {
      // El fallo se persiste igual que el éxito — antes desaparecía sin
      // dejar rastro si el panel estaba cerrado (UC-2 del spec).
      ultimoFalloRef.current = { textoUsuario, archivosActuales, mensajesBase };
      const mensajesConFallo = [...nuevosMensajes, { role: "assistant", content: "", error: true }];
      setMensajes(mensajesConFallo);
      guardar(mensajesConFallo.map(({ role, content, error }) => (error ? { role, content, error } : { role, content })));
      logScriba({ slug: contexto?.slug, screen: contexto?.screen, input: textoUsuario, error: e.message, duration_ms: Date.now() - t0 });
      if (!panelAbiertoRef.current) setAvisoPendiente(true);
    } finally {
      setCargando(false);
    }
  }

  async function enviar(texto) {
    const pregunta = (texto || input).trim();
    if ((!pregunta && !archivos.length) || cargando) return;

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
      ? (archivosActuales.length > 1 ? `Mirá estos archivos: ${nombres}` : `Mirá este archivo: ${nombres}`)
      : "");

    await procesarEnvio(textoUsuario, archivosActuales, mensajesBase);
  }

  // Reintentar un mensaje fallido. Camino rápido: si es el último fallo de
  // esta sesión (el ref todavía lo tiene, con los adjuntos originales en
  // memoria), lo reenvía tal cual. Si viene de historial recargado desde
  // Supabase (no hay ref, ej. tras F5 — fuera de alcance intentar
  // reconstruir adjuntos ahí), precarga el input con el texto del mensaje
  // de usuario anterior para que el usuario reenvíe a mano.
  // Elegir una conversación del historial. cargarConversacionBase() solo
  // actualiza mensajesIniciales/conversacionId — actualizar `mensajes`
  // (lo que realmente se ve) dependía de un efecto que corre una única
  // vez al cargar la app y nunca se vuelve a disparar. Antes esto se
  // "arreglaba" solo porque cerrar/reabrir el panel remontaba todo desde
  // cero; ahora que el hook vive durante toda la sesión, hay que
  // actualizar `mensajes` acá directamente.
  async function seleccionarConversacion(conv) {
    await cargarConversacionBase(conv);
    setMensajes(conv.mensajes || []);
    setInput("");
    setArchivos([]);
    ultimoFalloRef.current = null;
  }

  function reintentarMensaje(idx) {
    if (cargando) return;
    if (idx === mensajes.length - 1 && ultimoFalloRef.current) {
      const { textoUsuario, archivosActuales, mensajesBase } = ultimoFalloRef.current;
      procesarEnvio(textoUsuario, archivosActuales, mensajesBase);
      return;
    }
    const anterior = mensajes[idx - 1];
    if (anterior?.role === "user") setInput(anterior.content || "");
  }

  enviarRef.current = enviar; // siempre la versión más nueva (la captura la llama desde fuera del render)

  return {
    capturaActiva, cancelarCaptura, limpiarCapturaDatos, aceptarOfertaCaptura,
    mensajes,
    input, setInput,
    cargando,
    archivos,
    avisoPendiente,
    historial,
    cargandoInicio,
    handleFiles,
    quitarArchivo,
    handleNueva,
    enviar,
    reintentarMensaje,
    confirmarAccion,
    cargarConversacion: seleccionarConversacion,
    eliminarConversacion,
    marcarPanelAbierto,
  };
}
