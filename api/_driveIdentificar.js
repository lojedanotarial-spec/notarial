// Identificación y nombre automáticos de documentos subidos al expediente (lógica pura, sin red ni base).
// Una miniatura de la foto se manda a un modelo liviano, que devuelve un JSON mínimo; de esa respuesta solo se usan unos
// pocos campos, saneados, para armar el nombre del archivo. Lo que el modelo lea del documento NO se guarda (solo el nombre
// y el tipo resultantes). Spec: specs/documentacion-celular-expediente/ (UC-4).

export const TIPOS_IDENTIFICABLES = ["dni", "tarjeta_verde", "poder", "formulario", "otro"];
const ETIQUETA = { dni: "DNI", tarjeta_verde: "Tarjeta verde", poder: "Poder", formulario: "Formulario 08" };
const CON_LADO = new Set(["dni", "tarjeta_verde", "otro"]); // los documentos de dos caras (DNI, tarjeta verde, licencia…) se distinguen por anverso/reverso
const CON_PERSONA = new Set(["dni", "otro"]);          // y estos llevan el nombre de la persona (partidas, licencias…)
export const MAX_MINIATURA_BYTES = 400 * 1024;
const MAX_NOMBRE_ARCHIVO = 150;

// El prompt es lo que se paga en cada foto: corto, JSON mínimo, y sin pedir datos que después no se guardan.
export const PROMPT_IDENTIFICAR = `Mirá la imagen de un documento y devolvé SOLO un JSON, sin texto extra.
Identificá qué documento es leyendo su contenido, no su aspecto.

Tipos (campo "tipo"):
- dni: DNI argentino (tarjeta, libreta o digital de Mi Argentina). Anverso = el lado con la foto y el nombre. Reverso = el lado con la dirección y la línea de lectura automática (IDARG...).
- tarjeta_verde: cédula del automotor. Anverso = el lado con DOMINIO, CHASIS, MOTOR, MARCA y MODELO. Reverso = el lado con TITULAR y AUTORIZADO.
- poder: poder general o especial, o la escritura del poder (hojas de escribano).
- formulario: Formulario 08 del Registro del Automotor (solicitud tipo).
- otro: cualquier otro documento (partida, licencia, pasaporte, título, constancia...). En "descripcion" poné su nombre corto, por ejemplo "Partida de nacimiento".

Formato:
{"tipo":"dni|tarjeta_verde|poder|formulario|otro","descripcion":"","apellido":"","nombre":"","lado":"anverso|reverso|null","pagina":null,"paginas_total":null,"legible":true,"confianza":"alta|media|baja"}

Reglas:
- "apellido" y "nombre": SOLO el nombre del TITULAR del documento (la persona a quien pertenece: DNI, partida, licencia...), y solo si su nombre está impreso en ESTE lado y lo leés con total claridad. NO uses el nombre de un funcionario, firmante, responsable ("Responsable / in charge"), director, escribano, autoridad que emite, padre o madre, ni de ninguna otra persona nombrada. Si el titular no figura en este lado (por ejemplo el dorso de una licencia), dejalos vacíos. En poder, formulario y tarjeta_verde dejalos vacíos.
- "lado" para documentos de dos caras (dni, tarjeta_verde y otros como la licencia): anverso = la cara con la foto y los datos del titular, reverso = la otra. Para el resto, null. "pagina" y "paginas_total" solo para poder, formulario y otro de varias hojas, y solo si el número está impreso (folio u hoja "2 de 3"); si no, null.
- No inventes nada: si no se lee o no es un documento, "legible": false y "confianza": "baja".
- No devuelvas ningún otro dato del documento.`;

// ── Miniatura ────────────────────────────────────────────────────────────────

// La miniatura la arma el navegador (≤ 1000 px, JPEG): se verifica que sea de verdad un JPEG y de tamaño acotado.
export function validarMiniatura(entrada) {
  if (typeof entrada !== "string") return { ok: false, motivo: "formato" };
  const limpia = entrada.replace(/^data:image\/jpe?g;base64,/i, "").trim();
  if (!limpia || !/^[A-Za-z0-9+/]+={0,2}$/.test(limpia)) return { ok: false, motivo: "formato" };
  const buf = Buffer.from(limpia, "base64");
  if (buf.length > MAX_MINIATURA_BYTES) return { ok: false, motivo: "muy_grande" };
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return { ok: false, motivo: "no_jpeg" };
  return { ok: true, bytes: buf.length, base64: limpia };
}

// ── Respuesta del modelo ─────────────────────────────────────────────────────

function extraerObjeto(entrada) {
  if (entrada && typeof entrada === "object" && !Array.isArray(entrada)) return entrada;
  if (typeof entrada !== "string") return null;
  const ini = entrada.indexOf("{");
  const fin = entrada.lastIndexOf("}");
  if (ini < 0 || fin <= ini) return null;
  try {
    const o = JSON.parse(entrada.slice(ini, fin + 1));
    return o && typeof o === "object" && !Array.isArray(o) ? o : null;
  } catch {
    return null;
  }
}

// Mayúscula inicial en cada tramo ("o'brien-smith" → "O'Brien-Smith").
const capitalizar = (s) => s.toLowerCase().split(/([ '-])/).map((t) => (/^[^ '-]/.test(t) ? t.charAt(0).toUpperCase() + t.slice(1) : t)).join("");

function limpiarNombre(valor) {
  const s = String(valor ?? "").normalize("NFC").replace(/[^\p{L}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40).trim();
  return s ? capitalizar(s) : "";
}

function limpiarDescripcion(valor) {
  const s = String(valor ?? "").normalize("NFC").replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40).trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
}

const entero = (v, min, max) => {
  const n = typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : v;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

// Convierte lo que devolvió el modelo (texto u objeto) en { ok, ident } o { ok: false, motivo }. Solo se conserva un
// conjunto cerrado de campos y ante cualquier duda el archivo queda "sin identificar": nunca se inventa un nombre.
export function normalizarIdentificacion(entrada) {
  const o = extraerObjeto(entrada);
  if (!o) return { ok: false, motivo: "json_invalido" };
  if (o.legible === false || o.legible === "false") return { ok: false, motivo: "ilegible" };
  const confianza = String(o.confianza ?? "").toLowerCase();
  if (confianza === "baja") return { ok: false, motivo: "confianza_baja" };

  const pedido = String(o.tipo ?? "").toLowerCase().trim();
  const tipo = TIPOS_IDENTIFICABLES.includes(pedido) ? pedido : "otro";
  const descripcion = tipo === "otro" ? limpiarDescripcion(o.descripcion) : "";
  if (tipo === "otro" && !descripcion) return { ok: false, motivo: "sin_descripcion" };

  const lado = CON_LADO.has(tipo) && ["anverso", "reverso"].includes(String(o.lado ?? "").toLowerCase()) ? String(o.lado).toLowerCase() : null;
  // Los documentos de dos caras no llevan página; el resto sí (si está impresa). Un "otro" con lado tampoco lleva página.
  const pagina = tipo === "dni" || tipo === "tarjeta_verde" || lado ? null : entero(o.pagina, 1, 999);
  const total = pagina ? entero(o.paginas_total, pagina, 999) : null;

  return {
    ok: true,
    ident: {
      tipo, descripcion,
      // El nombre de una persona solo se usa si el modelo está SEGURO. Un nombre mal puesto en un expediente es peor que ninguno
      // (caso real del 09/11/26: el dorso de una licencia se renombró con el del funcionario que firma, con confianza "media").
      nombre: CON_PERSONA.has(tipo) && confianza === "alta" ? limpiarNombre(o.nombre) : "",
      apellido: CON_PERSONA.has(tipo) && confianza === "alta" ? limpiarNombre(o.apellido) : "",
      lado, pagina, paginas_total: total,
    },
  };
}

// ── Nombre del archivo ───────────────────────────────────────────────────────

// `{Tipo}[ {Apellido} {Nombre}][ - anverso|reverso | - pág N[ de M]]{extensión}`
export function armarNombreArchivo(ident, extension = "") {
  const etiqueta = ident.tipo === "otro" ? ident.descripcion : ETIQUETA[ident.tipo];
  const persona = [ident.apellido, ident.nombre].filter(Boolean).join(" ");
  const sufijo = ident.lado ? ` - ${ident.lado}` : ident.pagina ? ` - pág ${ident.pagina}${ident.paginas_total ? ` de ${ident.paginas_total}` : ""}` : "";
  const cuerpo = `${etiqueta}${persona ? ` ${persona}` : ""}${sufijo}`.slice(0, MAX_NOMBRE_ARCHIVO - extension.length).trim();
  return `${cuerpo}${extension}`;
}

const EXT_POR_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic", "image/heif": ".heif", "image/gif": ".gif", "application/pdf": ".pdf" };

// La extensión del archivo original (si la tiene) o, si no, la que corresponde a su tipo.
export function extensionDe(nombre, mime) {
  const m = /\.[A-Za-z0-9]{1,5}$/.exec(String(nombre ?? ""));
  if (m) return m[0].toLowerCase();
  return EXT_POR_MIME[String(mime ?? "").split(";")[0].trim().toLowerCase()] || "";
}

// Si ya hay un archivo con ese nombre en el expediente, agrega (2), (3)… antes de la extensión (sin distinguir mayúsculas,
// como Drive y Windows).
export function evitarDuplicado(nombre, existentes = []) {
  const usados = new Set(existentes.map((n) => String(n).toLowerCase()));
  if (!usados.has(nombre.toLowerCase())) return nombre;
  const m = /\.[A-Za-z0-9]{1,5}$/.exec(nombre);
  const ext = m ? m[0] : "";
  const base = ext ? nombre.slice(0, -ext.length) : nombre;
  for (let n = 2; ; n++) {
    const candidato = `${base} (${n})${ext}`;
    if (!usados.has(candidato.toLowerCase())) return candidato;
  }
}
