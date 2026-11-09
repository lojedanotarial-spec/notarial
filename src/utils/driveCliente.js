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
