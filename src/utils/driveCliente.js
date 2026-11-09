// Drive de la escribanía, lado del navegador: lógica pura (sin red ni pantalla), para probarla sola.
// La parte que habla con el servidor está en driveApi.js. Spec: specs/drive-escribania/.

export const MAX_BYTES_ARCHIVO = 25 * 1024 * 1024;

export const TIPOS_ARCHIVO = [
  { key: "dni",           label: "DNI" },
  { key: "tarjeta_verde", label: "Tarjeta verde" },
  { key: "poder",         label: "Poder" },
  { key: "formulario",    label: "Formulario 08" },
  { key: "otro",          label: "Otro" },
];

export const etiquetaTipo = (key) => TIPOS_ARCHIVO.find((t) => t.key === key)?.label || "Otro";

export function formatearTamano(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  const mb = n / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace(".0", "")} MB`;
}

// Antes de pedirle nada al servidor: el límite de 25 MB se rechaza acá con un mensaje claro.
export function validarArchivoLocal(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, mensaje: `"${file?.name || "El archivo"}" está vacío o no se pudo leer.` };
  }
  if (file.size > MAX_BYTES_ARCHIVO) {
    return { ok: false, mensaje: `"${file.name}" pesa ${formatearTamano(file.size)} y el máximo es 25 MB.` };
  }
  return { ok: true };
}

// Solo imágenes y PDF se muestran dentro de Notarial; lo demás se descarga. (Misma regla que el servidor.)
const PREVISUALIZABLES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
export const esPrevisualizable = (mime) => PREVISUALIZABLES.has(String(mime || "").split(";")[0].trim().toLowerCase());

export function fechaHora(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

// ── Subir desde el celular ───────────────────────────────────────────────────

const dos = (n) => String(n).padStart(2, "0");

// Nombre de una foto sacada con la cámara de la página (que no trae nombre propio): fecha y hora locales.
// `n` > 1 para fotos en el mismo segundo (ráfaga), así no chocan. Sin caracteres que Drive o Windows rechacen.
export function nombreFotoCamara(fecha = new Date(), n = 1) {
  const f = `${dos(fecha.getDate())}-${dos(fecha.getMonth() + 1)}-${fecha.getFullYear()}`;
  const h = `${dos(fecha.getHours())}.${dos(fecha.getMinutes())}.${dos(fecha.getSeconds())}`;
  return `Foto ${f} ${h}${n > 1 ? ` (${n})` : ""}.jpg`;
}

// Cola de subida del celular (de a un archivo por vez: cuida la memoria del teléfono). Cada ítem tiene un `estado`:
// esperando | subiendo | ok | error. Estas funciones son puras: la pantalla las usa para decidir qué sigue.
export const siguientePendiente = (cola) => cola.find((x) => x.estado === "esperando") || null;

export function resumenCola(cola) {
  const cuenta = (e) => cola.filter((x) => x.estado === e).length;
  return { guardadas: cuenta("ok"), pendientes: cuenta("esperando") + cuenta("subiendo"), fallidas: cuenta("error") };
}

export const marcarItem = (cola, id, cambios) => cola.map((x) => (x.id === id ? { ...x, ...cambios } : x));

// Qué le dice la página del celular a quien está subiendo, en lenguaje claro y con UN solo mensaje a la vez (nada de textos chicos
// sueltos). `conNombre` = el sistema también les va a poner nombre (identificación automática prendida).
export function panelEstado(cola, { terminada = false, conNombre = false } = {}) {
  const total = cola.length;
  if (!total) return null;
  const r = resumenCola(cola);
  const porNombrar = cola.filter((x) => x.porIdentificar).length;
  const pasos = conNombre ? 2 : 1;
  const plural = (n, s, p) => (n === 1 ? s : p);
  if (terminada) return { fase: "terminada", paso: null, titulo: "La sesión terminó", detalle: "Mirá el aviso de arriba.", progreso: null, conBoton: false };
  if (r.pendientes > 0) {
    const hechas = r.guardadas + r.fallidas;
    const actual = cola.find((x) => x.estado === "subiendo");
    return {
      fase: "subiendo", paso: conNombre ? `Paso 1 de ${pasos}` : null, titulo: "Subiendo las fotos",
      detalle: `${Math.min(hechas + 1, total)} de ${total}`, progreso: Math.min(1, (hechas + (actual?.progreso ?? 0)) / total), conBoton: false,
    };
  }
  if (porNombrar > 0) {
    return {
      fase: "nombrando", paso: `Paso 2 de ${pasos}`, titulo: "Poniéndoles nombre",
      detalle: `${plural(porNombrar, "Falta", "Faltan")} ${porNombrar} ${plural(porNombrar, "foto", "fotos")}. Ya están guardadas.`, progreso: null, conBoton: false,
    };
  }
  if (r.guardadas > 0) {
    return {
      fase: r.fallidas > 0 ? "con_errores" : "listo", paso: null,
      titulo: `✓ ${r.guardadas} ${plural(r.guardadas, "foto guardada", "fotos guardadas")}`,
      detalle: r.fallidas > 0 ? `${r.fallidas} ${plural(r.fallidas, "no se pudo subir", "no se pudieron subir")}: tocá "Reintentar" en la lista.` : "Ya están en el expediente.",
      progreso: 1, conBoton: r.fallidas === 0,
    };
  }
  return { fase: "error", paso: null, titulo: "No se pudo subir", detalle: "Mirá el error en la lista y tocá \"Reintentar\".", progreso: null, conBoton: false };
}

// Tamaño de cada consulta de identificación (el servidor también parte de a 10): más fotos juntas = más contexto, pero más lenta.
export const FOTOS_POR_LOTE = 10;
export function partir(lista, n = FOTOS_POR_LOTE) {
  const tandas = [];
  for (let i = 0; i < lista.length; i += n) tandas.push(lista.slice(i, i + n));
  return tandas;
}

// El servidor contesta 410 (vencida / cerrada) o 404 (código inexistente) cuando la sesión ya no sirve.
export const esErrorDeSesion = (e) => (e?.status === 410 || e?.status === 404) && ["vencida", "cerrada", "inexistente"].includes(e?.codigo);

// Qué se le dice a quien está en el celular cuando la sesión termina en el medio: lo guardado se conserva, y se cuenta lo
// que quedó sin guardar. Nada se pierde en silencio.
export function textoSesionTerminada(motivo, { guardadas = 0, sinGuardar = 0 } = {}) {
  const causa = motivo === "cerrada" ? "Esta sesión se cerró desde la compu."
    : motivo === "inexistente" ? "Este código no es válido."
    : "El QR venció.";
  const partes = [];
  if (guardadas > 0) partes.push(`Se ${guardadas === 1 ? "guardó 1 archivo" : `guardaron ${guardadas} archivos`} en el expediente.`);
  if (sinGuardar > 0) partes.push(`${sinGuardar === 1 ? "1 foto quedó" : `${sinGuardar} fotos quedaron`} sin guardar: generá un QR nuevo desde la compu y volvé a subirla${sinGuardar === 1 ? "" : "s"}.`);
  return [causa, ...partes].join(" ");
}

// Cuenta regresiva "MM:SS" hasta que vence el QR.
export function cuentaRegresiva(expiraEn, ahora = Date.now()) {
  const ms = new Date(expiraEn).getTime() - ahora;
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ── Identificación automática: qué se muestra en cada archivo ────────────────

export const ESPERA_IDENTIFICACION_MS = 3 * 60 * 1000; // si pasó más de esto "identificando", algo falló: se trata como "sin identificar"

// Marca de un archivo en la lista (o null si no hay nada que mostrar). `ahora` se inyecta para probarlo.
export function marcaIdentificacion(archivo, ahora = Date.now()) {
  const estado = archivo?.identificacion;
  if (estado === "pendiente" || estado === "procesando") {
    const edad = ahora - new Date(archivo.created_at).getTime();
    return Number.isFinite(edad) && edad > ESPERA_IDENTIFICACION_MS
      ? { clave: "sin_identificar", texto: "Sin identificar", tono: "aviso" }
      : { clave: "identificando", texto: "Identificando…", tono: "info" };
  }
  if (estado === "sin_identificar") return { clave: "sin_identificar", texto: "Sin identificar", tono: "aviso" };
  if (estado === "ok") return { clave: "ok", texto: "Nombre automático", tono: "ok" };
  return null; // manual, o archivos de antes de la identificación
}

export const hayIdentificacionEnCurso = (archivos, ahora = Date.now()) => archivos.some((a) => marcaIdentificacion(a, ahora)?.clave === "identificando");

// ── Panel del administrador ──────────────────────────────────────────────────

// Cómo se muestra el Drive de un registro (lo que devuelve admin_estado). `accion` = el botón que corresponde.
export function estadoVisual(r) {
  if (!r?.conectado) return { clave: "no_conectado", etiqueta: "No conectado", color: "#7a8494", accion: "conectar", detalle: "Todavía no tiene Drive. Generá un enlace y mandáselo a quien tiene el mail de la escribanía." };
  if (r.estado === "rota") return { clave: "caida", etiqueta: "Conexión caída", color: "#c0392b", accion: "conectar", detalle: "Google dejó de aceptar la conexión (la escribanía quitó el permiso). Los usuarios ven un aviso. Generá un enlace nuevo para reconectar." };
  if (r.sin_espacio || r.cuota?.llena) return { clave: "sin_espacio", etiqueta: "Sin espacio", color: "#c0392b", accion: "desconectar", detalle: "El Drive de la escribanía se quedó sin espacio: no se pueden subir archivos hasta liberar espacio." };
  if (r.cuota?.advertencia) return { clave: "advertencia", etiqueta: "Conectado · poco espacio", color: "#b8860b", accion: "desconectar", detalle: `El Drive está al ${Math.round(r.cuota.porcentaje)} %. Conviene liberar espacio antes de que se llene.` };
  return { clave: "conectado", etiqueta: "Conectado", color: "#27ae60", accion: "desconectar", detalle: "" };
}

// ── Página que abre quien recibe el enlace ───────────────────────────────────

export function mensajeRetorno(error) {
  const reabrir = "Volvé a abrir el enlace que te mandaron. Si sigue sin funcionar, pedí uno nuevo a quien administra Notarial.";
  switch (error) {
    case "rechazado":
      return { titulo: "No se conectó nada", detalle: `No diste el permiso en Google. ${reabrir.replace("Si sigue sin funcionar", "Cuando Google te lo pida, tocá \"Permitir\". Si sigue sin funcionar")}` };
    case "vencido":
      return { titulo: "El enlace venció", detalle: "Pedile a quien administra Notarial que te mande uno nuevo." };
    case "usado":
      return { titulo: "Este enlace ya se usó", detalle: "Si el Drive ya quedó conectado, no tenés que hacer nada más. Si no, pedí un enlace nuevo a quien administra Notarial." };
    case "inexistente":
      return { titulo: "Este enlace no es válido", detalle: "Revisá que esté completo, o pedí uno nuevo a quien administra Notarial." };
    default:
      return { titulo: "No pudimos conectar el Drive", detalle: reabrir };
  }
}

// ── Cómo se manda el enlace: WhatsApp, mail (sin servicio de envío: lo manda la persona desde su cuenta) ──

export const textoInvitacion = (url) =>
  `Hola, para conectar el Drive de la escribanía a Notarial abrí este enlace desde tu computadora, con el mail de la escribanía, y tocá "Autorizar con Google":\n${url}\nEl enlace sirve una sola vez y vence en 24 horas.`;

export const urlWhatsApp = (url) => `https://wa.me/?text=${encodeURIComponent(textoInvitacion(url))}`;

export const urlGmail = (url) =>
  `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent("Conectar el Drive de la escribanía a Notarial")}&body=${encodeURIComponent(textoInvitacion(url))}`;

// ── Subida directa a Google ──────────────────────────────────────────────────

export const MENSAJE_CORTE = "Se cortó la subida. Revisá tu conexión y probá de nuevo.";

// PUT del archivo a la sesión que abrió el servidor. XMLHttpRequest para tener el progreso. `XHR` se inyecta en las pruebas.
export function subirASesion(sesionUrl, file, mime, onProgreso, XHR = globalThis.XMLHttpRequest) {
  return new Promise((resolve, reject) => {
    const x = new XHR();
    x.open("PUT", sesionUrl);
    x.setRequestHeader("Content-Type", mime || "application/octet-stream");
    if (x.upload) x.upload.onprogress = (e) => { if (e.lengthComputable) onProgreso?.(e.loaded / e.total); };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) {
        try {
          const id = JSON.parse(x.responseText)?.id;
          if (id) return resolve({ id });
        } catch { /* cae al rechazo de abajo */ }
      }
      reject(new Error(MENSAJE_CORTE));
    };
    x.onerror = x.ontimeout = x.onabort = () => reject(new Error(MENSAJE_CORTE));
    x.send(file);
  });
}
