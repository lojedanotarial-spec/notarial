// Página del celular para subir documentación a un expediente. Se abre desde el QR (/s/<codigo>), SIN login: el código
// de la URL es la única autorización y solo sirve para agregar archivos a ESE expediente y quitar lo subido en esa sesión.
// Las fotos se suben en calidad original, de a una, directo al almacenamiento privado de Notarial.
// Spec: specs/documentacion-celular-expediente/.
import { useEffect, useRef, useState } from "react";
import { C } from "../constants";
import { celular, subirDesdeCelular } from "../utils/driveApi";
import {
  MAX_BYTES_ARCHIVO, validarArchivoLocal, formatearTamano, nombreFotoCamara, siguientePendiente, resumenCola, marcarItem,
  esErrorDeSesion, textoSesionTerminada, cuentaRegresiva, panelEstado, FOTOS_POR_LOTE, progresoPorPasos,
} from "../utils/driveCliente";
import { miniaturaDe, miniaturaParaIdentificar } from "../utils/capturaArchivo";
import CamaraArchivo from "../components/CamaraArchivo";

const fuente = "'Montserrat', sans-serif";
const MENSAJE_ALMACEN_CAIDO = "El guardado de archivos no está disponible en este momento. Avisale a quien administra Notarial.";

const boton = (primario, deshabilitado) => ({
  width: "100%", padding: "15px 16px", borderRadius: 12, fontFamily: fuente, fontSize: 15, fontWeight: 700, textAlign: "center",
  border: primario ? "none" : `1px solid ${C.cerulean}`,
  background: deshabilitado ? "rgba(26,35,50,.15)" : primario ? C.cerulean : "transparent",
  color: deshabilitado ? C.muted : primario ? "#fff" : C.cerulean,
  cursor: deshabilitado ? "default" : "pointer", boxSizing: "border-box", display: "block",
});

function Aviso({ tipo = "info", children }) {
  const colores = { info: [C.ceruleanLight, C.cerulean], aviso: [C.fawn50, "#8a6d1f"], error: ["#fdf0f0", "#c0392b"] }[tipo];
  return <div style={{ background: colores[0], color: colores[1], borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.45, margin: "10px 0" }}>{children}</div>;
}

// OJO: la hoja de estilos global de la app fija html/body/#root en alto 100% con overflow oculto (es una app de paneles fijos), así
// que esta página tiene que ser SU PROPIO contenedor con scroll. Con "minHeight" lo que pasaba del alto de la pantalla quedaba
// inalcanzable (le pasó a Lucas al subir 4 fotos). `pie` = barra fija de abajo, siempre visible.
function Marco({ children, pie }) {
  return (
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", background: C.warm, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", padding: `20px 14px ${pie ? 190 : 40}px`, boxSizing: "border-box" }}>
        <div style={{ fontFamily: fuente, fontWeight: 800, fontSize: 17, color: C.dark, letterSpacing: "-.02em", marginBottom: 12 }}>Notarial</div>
        {children}
      </div>
      {pie}
    </div>
  );
}

// Barra fija de abajo: el paso actual en grande, una barra de avance y, cuando terminó todo, el botón "Listo".
function PanelEstado({ panel, onListo }) {
  const color = panel.fase === "listo" ? "#27ae60" : ["con_errores", "error", "terminada"].includes(panel.fase) ? "#c0392b" : C.cerulean;
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: `1px solid ${C.border}`, boxShadow: "0 -4px 18px rgba(26,35,50,.12)", padding: "12px 14px calc(12px + env(safe-area-inset-bottom))", zIndex: 50 }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {panel.paso && <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: ".04em", textTransform: "uppercase" }}>{panel.paso}</div>}
        <div style={{ fontFamily: fuente, fontSize: 17, fontWeight: 800, color, marginTop: 2 }}>{panel.titulo}</div>
        <div style={{ fontSize: 14, color: C.faint, marginTop: 2, lineHeight: 1.4 }}>{panel.detalle}</div>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(26,35,50,.1)", marginTop: 10, overflow: "hidden", position: "relative" }}>
          {panel.progreso == null
            ? <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "40%", background: color, borderRadius: 3, animation: "subirmovil-ir 1.2s ease-in-out infinite" }} />
            : <div style={{ width: `${Math.round(panel.progreso * 100)}%`, height: "100%", background: color, borderRadius: 3, transition: "width .25s" }} />}
        </div>
        {panel.conBoton && <button onClick={onListo} style={{ ...boton(true), marginTop: 12 }}>Listo</button>}
      </div>
      <style>{"@keyframes subirmovil-ir { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }"}</style>
    </div>
  );
}

const Tarjeta = ({ children }) => <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px" }}>{children}</div>;

function FilaArchivo({ x, onReintentar, onQuitar }) {
  const porcentaje = Math.round((x.progreso || 0) * 100);
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 44, height: 56, borderRadius: 6, overflow: "hidden", background: C.ceruleanLight, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        {x.vista ? <img src={x.vista} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📄"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.nombre}</div>
        {x.estado === "esperando" && <div style={{ fontSize: 13, color: C.muted }}>En espera{x.tamano ? ` · ${formatearTamano(x.tamano)}` : ""}</div>}
        {x.estado === "subiendo" && (
          <>
            <div style={{ fontSize: 13, color: C.cerulean, fontWeight: 600 }}>Subiendo {porcentaje} %</div>
            <div style={{ height: 4, borderRadius: 3, background: "rgba(26,35,50,.1)", marginTop: 4 }}><div style={{ width: `${porcentaje}%`, height: "100%", background: C.cerulean, borderRadius: 3 }} /></div>
          </>
        )}
        {x.estado === "ok" && <div style={{ fontSize: 13, color: x.identificando ? C.cerulean : "#27ae60", fontWeight: 600 }}>{x.identificando ? "Poniéndole nombre…" : x.porIdentificar ? "✓ Guardada · espera su nombre" : "✓ Guardada"}</div>}
        {x.estado === "error" && <div style={{ fontSize: 13, color: "#c0392b", lineHeight: 1.4 }}>{x.mensaje}</div>}
      </div>
      {x.estado === "error" && !x.sinReintento && <button onClick={() => onReintentar(x.id)} style={{ border: `1px solid ${C.cerulean}`, background: "transparent", color: C.cerulean, borderRadius: 8, padding: "7px 10px", fontFamily: fuente, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reintentar</button>}
      {x.estado === "ok" && x.archivoId && <button onClick={() => onQuitar(x)} aria-label={`Quitar ${x.nombre}`} style={{ border: `1px solid ${C.border}`, background: "transparent", color: C.muted, borderRadius: 8, padding: "7px 10px", fontFamily: fuente, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Quitar</button>}
    </div>
  );
}

export default function SubirMovil({ codigo }) {
  const [info, setInfo] = useState(null);          // lo que devuelve celular_info
  const [errorRed, setErrorRed] = useState("");
  const [cola, setCola] = useState([]);
  const [terminada, setTerminada] = useState(null); // motivo si la sesión terminó en el medio
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [porQuitar, setPorQuitar] = useState(null);
  const [quitando, setQuitando] = useState(false);
  const [errorQuitar, setErrorQuitar] = useState("");
  const [ahora, setAhora] = useState(() => Date.now());
  const colaRef = useRef([]);
  const corriendo = useRef(false);
  const terminadaRef = useRef(null);
  const desfase = useRef(0);        // hora del servidor menos hora del celular
  const ultimoSegundo = useRef({ clave: 0, n: 0 });
  const camaraRef = useRef(false);        // espejo de camaraAbierta: el bucle de identificación lo lee sin depender del render
  const identificandoRef = useRef(false);
  const inputCamara = useRef(null);
  const inputGaleria = useRef(null);

  function aplicar(fn) { colaRef.current = fn(colaRef.current); setCola(colaRef.current); }

  // Carga inicial: nombre del expediente, vigencia y lo que ya se subió en esta sesión (si se recargó la página).
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const r = await celular.info(codigo);
        if (cancelado) return;
        if (r.ahora) desfase.current = new Date(r.ahora).getTime() - Date.now();
        aplicar(() => (r.archivos || []).map((a) => ({ id: a.id, archivoId: a.id, nombre: a.nombre, tamano: a.tamano, estado: "ok", progreso: 1, vista: null })));
        setInfo(r);
      } catch (e) {
        if (!cancelado) setErrorRed(e.message);
      }
    })();
    return () => { cancelado = true; };
  }, [codigo]);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const resumen = resumenCola(cola);
  const ahoraServidor = ahora + desfase.current;
  const vencidaLocal = !!info?.expira_en && new Date(info.expira_en).getTime() <= ahoraServidor;
  const motivoFin = terminada || (vencidaLocal ? "vencida" : null);
  const driveCaido = !!info && !info.propio && info.drive_disponible === false;   // con el almacén propio no hay nada que conectar
  const puedeAgregar = !!info?.vigente && !motivoFin && !driveCaido;

  // PRIMERO se sube TODO; recién después, con la última subida terminada y la cámara cerrada, el sistema reconoce cada documento
  // y le pone nombre (por ejemplo "DNI García Juan - anverso"), de a uno. Nunca corre en el medio de las subidas (decisión de
  // Lucas, 09/11/26) y si falla la foto igual queda guardada ("Sin identificar" en la compu).
  async function identificarPendientes() {
    if (identificandoRef.current) return;
    identificandoRef.current = true;
    try {
      for (;;) {
        if (terminadaRef.current || corriendo.current || camaraRef.current) break;   // todavía hay subidas o la cámara está abierta
        // Se mandan TODAS las fotos juntas (hasta 10 por consulta): así el sistema puede emparejar las caras de un mismo documento
        // (el dorso de una licencia toma el nombre del frente).
        const tanda = colaRef.current.filter((x) => x.estado === "ok" && x.porIdentificar && x.file).slice(0, FOTOS_POR_LOTE);
        if (!tanda.length) break;
        const ids = new Set(tanda.map((x) => x.id));
        aplicar((c) => c.map((x) => (ids.has(x.id) ? { ...x, identificando: true } : x)));
        const nombres = new Map();
        try {
          const items = [];
          for (const x of tanda) items.push({ archivo_id: x.archivoId, miniatura: await miniaturaParaIdentificar(x.file) });   // de a una: cuida la memoria
          const r = await celular.identificarLote(codigo, items);
          for (const a of r?.archivos || []) nombres.set(a.id, a.nombre);
        } catch { /* las fotos ya están guardadas: quedan sin identificar y se pueden renombrar a mano */ }
        aplicar((c) => c.map((x) => (ids.has(x.id) ? { ...x, porIdentificar: false, identificando: false, file: null, ...(nombres.get(x.archivoId) ? { nombre: nombres.get(x.archivoId) } : {}) } : x)));
      }
    } finally {
      identificandoRef.current = false;
    }
  }

  // Sube de a un archivo (cuida la memoria del teléfono). Un archivo que falla no frena a los demás; si la sesión termina,
  // lo que queda se conserva en pantalla y se cuenta como "sin guardar".
  async function correr() {
    if (corriendo.current) return;
    corriendo.current = true;
    try {
      for (;;) {
        if (terminadaRef.current) break;
        const item = siguientePendiente(colaRef.current);
        if (!item) break;
        aplicar((c) => marcarItem(c, item.id, { estado: "subiendo", progreso: 0, mensaje: "" }));
        try {
          const archivo = await subirDesdeCelular(codigo, item.file, { onProgreso: progresoPorPasos((p) => aplicar((c) => marcarItem(c, item.id, { progreso: p }))) });
          const porIdentificar = archivo.identificacion === "pendiente";
          // El archivo se conserva en memoria solo hasta identificarlo (después se suelta).
          aplicar((c) => marcarItem(c, item.id, { estado: "ok", progreso: 1, archivoId: archivo.id, file: porIdentificar ? item.file : null, porIdentificar }));
        } catch (e) {
          if (esErrorDeSesion(e)) {
            terminadaRef.current = e.codigo;
            setTerminada(e.codigo);
            aplicar((c) => marcarItem(c, item.id, { estado: "esperando" }));
            break;
          }
          aplicar((c) => marcarItem(c, item.id, { estado: "error", mensaje: e.message }));
        }
      }
    } finally {
      corriendo.current = false;
      identificarPendientes();   // si ya no hay nada por subir y la cámara está cerrada, empieza la identificación
    }
  }

  function encolar(files) {
    const nuevos = files.map((file, i) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`;
      const v = validarArchivoLocal(file);
      return v.ok
        ? { id, file, nombre: file.name, tamano: file.size, estado: "esperando", progreso: 0, vista: null }
        : { id, file: null, nombre: file?.name || "Archivo", tamano: file?.size, estado: "error", progreso: 0, mensaje: v.mensaje, sinReintento: true, vista: null };
    });
    aplicar((c) => [...c, ...nuevos]);
    nuevos.forEach((x) => { if (x.file) miniaturaDe(x.file).then((vista) => { if (vista) aplicar((c) => marcarItem(c, x.id, { vista })); }); });
    correr();
  }

  function nombrarFoto() {
    const f = new Date();
    const clave = Math.floor(f.getTime() / 1000);
    ultimoSegundo.current = ultimoSegundo.current.clave === clave ? { clave, n: ultimoSegundo.current.n + 1 } : { clave, n: 1 };
    return nombreFotoCamara(f, ultimoSegundo.current.n);
  }

  function alElegir(e, { deCamara = false } = {}) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    // La cámara nativa entrega nombres genéricos ("image.jpg"): se les pone fecha y hora (solo a los JPEG, para no mentir con la extensión).
    encolar(deCamara ? files.map((f) => (f.type === "image/jpeg" ? new File([f], nombrarFoto(), { type: f.type }) : f)) : files);
  }

  function reintentar(id) {
    aplicar((c) => marcarItem(c, id, { estado: "esperando", mensaje: "" }));
    correr();
  }

  async function quitar() {
    setQuitando(true);
    setErrorQuitar("");
    try {
      await celular.quitar(codigo, porQuitar.archivoId);
      aplicar((c) => c.filter((x) => x.id !== porQuitar.id));
      setPorQuitar(null);
    } catch (e) {
      setErrorQuitar(e.message);
    } finally {
      setQuitando(false);
    }
  }

  // ── Estados de la página ──────────────────────────────────────────────────
  if (errorRed) {
    return <Marco><Tarjeta><div style={{ fontFamily: fuente, fontSize: 17, fontWeight: 800, color: C.dark, marginBottom: 8 }}>No pudimos abrir la página</div><div style={{ fontSize: 14, color: C.faint, lineHeight: 1.5 }}>{errorRed}</div><button onClick={() => window.location.reload()} style={{ ...boton(true), marginTop: 14 }}>Reintentar</button></Tarjeta></Marco>;
  }
  if (!info) return <Marco><Tarjeta><div style={{ fontSize: 14, color: C.faint }}>Cargando…</div></Tarjeta></Marco>;
  if (!info.vigente && cola.length === 0) {
    return <Marco><Tarjeta><div style={{ fontFamily: fuente, fontSize: 17, fontWeight: 800, color: C.dark, marginBottom: 8 }}>{info.motivo === "cerrada" ? "La sesión terminó" : info.motivo === "vencida" ? "El QR venció" : "Este código no es válido"}</div><div style={{ fontSize: 14, color: C.faint, lineHeight: 1.5 }}>{info.motivo === "inexistente" ? "Pedí un QR nuevo desde la compu." : `${textoSesionTerminada(info.motivo)} Generá un QR nuevo desde la compu.`}</div></Tarjeta></Marco>;
  }

  if (finalizado && resumen.pendientes === 0) {
    return (
      <Marco>
        <Tarjeta>
          <div style={{ fontSize: 34, color: "#27ae60" }} aria-hidden="true">✓</div>
          <div style={{ fontFamily: fuente, fontSize: 18, fontWeight: 800, color: C.dark, margin: "4px 0 8px" }}>Listo</div>
          <div style={{ fontSize: 14, color: C.faint, lineHeight: 1.5 }}>Se {resumen.guardadas === 1 ? "guardó 1 archivo" : `guardaron ${resumen.guardadas} archivos`} en el expediente <strong>{info.expediente_nombre}</strong>. Ya los podés ver desde la compu.</div>
          {puedeAgregar && <button onClick={() => setFinalizado(false)} style={{ ...boton(false), marginTop: 16 }}>Subir más</button>}
        </Tarjeta>
      </Marco>
    );
  }

  const fotosCamara = cola.filter((x) => x.vista || x.estado !== "ok").slice(-12);
  const panel = camaraAbierta ? null : panelEstado(cola, { terminada: !!terminada, conNombre: !!info.identificar });
  return (
    <Marco pie={panel ? <PanelEstado panel={panel} onListo={() => setFinalizado(true)} /> : null}>
      <Tarjeta>
        <div style={{ fontFamily: fuente, fontSize: 18, fontWeight: 800, color: C.dark, lineHeight: 1.3 }}>Subir documentación</div>
        <div style={{ fontSize: 14, color: C.faint, marginTop: 4 }}>Expediente: <strong style={{ color: C.dark }}>{info.expediente_nombre}</strong></div>
        {!motivoFin && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>El QR vence en {cuentaRegresiva(info.expira_en, ahoraServidor)}</div>}

        {driveCaido && <Aviso tipo="error">{MENSAJE_ALMACEN_CAIDO}</Aviso>}
        {motivoFin && <Aviso tipo="aviso">{textoSesionTerminada(motivoFin, { guardadas: resumen.guardadas, sinGuardar: resumen.pendientes + resumen.fallidas })}</Aviso>}
        {!motivoFin && !driveCaido && <Aviso>Sacá o elegí <strong>todas</strong> las fotos de una, de cualquier documento y en cualquier orden. No hace falta decir qué es cada una. Se guardan en calidad original (hasta {formatearTamano(MAX_BYTES_ARCHIVO)} cada una).</Aviso>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          <button onClick={() => { camaraRef.current = true; setCamaraAbierta(true); }} disabled={!puedeAgregar} style={boton(true, !puedeAgregar)}>Abrir la cámara</button>
          <button onClick={() => inputCamara.current?.click()} disabled={!puedeAgregar} style={boton(false, !puedeAgregar)}>Usar la cámara del teléfono</button>
          <button onClick={() => inputGaleria.current?.click()} disabled={!puedeAgregar} style={boton(false, !puedeAgregar)}>Elegir de la galería o archivos</button>
        </div>
        <input ref={inputCamara} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => alElegir(e, { deCamara: true })} />
        <input ref={inputGaleria} type="file" accept="image/*,application/pdf" multiple style={{ display: "none" }} onChange={(e) => alElegir(e)} />
      </Tarjeta>

      {cola.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <Tarjeta>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div style={{ fontFamily: fuente, fontSize: 14, fontWeight: 800, color: C.dark }}>Subidas en esta sesión</div>
              <div style={{ fontSize: 13, color: C.muted }}>{cola.length} {cola.length === 1 ? "foto" : "fotos"}</div>
            </div>
            {cola.map((x) => <FilaArchivo key={x.id} x={x} onReintentar={reintentar} onQuitar={(i) => { setErrorQuitar(""); setPorQuitar(i); }} />)}
          </Tarjeta>
        </div>
      )}

      {camaraAbierta && (
        <CamaraArchivo cantidad={cola.length} recientes={fotosCamara} nombrarFoto={nombrarFoto}
          onFoto={(file) => encolar([file])} onCerrar={() => { camaraRef.current = false; setCamaraAbierta(false); identificarPendientes(); }} />
      )}

      {porQuitar && (
        <div onClick={() => !quitando && setPorQuitar(null)} style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "20px 18px", width: "100%", maxWidth: 380 }}>
            <div style={{ fontFamily: fuente, fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 6 }}>¿Quitar esta foto?</div>
            <div style={{ fontSize: 13.5, color: C.faint, lineHeight: 1.5, marginBottom: 14 }}>Se saca del expediente. Queda 30 días en la papelera y después se elimina para siempre.</div>
            {errorQuitar && <Aviso tipo="error">{errorQuitar}</Aviso>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPorQuitar(null)} disabled={quitando} style={{ ...boton(false, quitando), flex: 1 }}>Cancelar</button>
              <button onClick={quitar} disabled={quitando} style={{ ...boton(true, quitando), flex: 1, background: quitando ? "rgba(26,35,50,.15)" : "#c0392b" }}>{quitando ? "Quitando…" : "Quitar"}</button>
            </div>
          </div>
        </div>
      )}
    </Marco>
  );
}
