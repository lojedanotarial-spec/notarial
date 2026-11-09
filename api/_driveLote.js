// Identificación EN LOTE: todas las fotos de una tanda se mandan juntas en una sola consulta para que el modelo pueda emparejar
// las caras de un mismo documento entre sí (el dorso de una licencia no trae el nombre, pero su CUIL contiene el DNI del frente; el
// reverso del DNI repite el nombre en la línea de lectura). Lógica pura: sin red ni base. Spec: specs/documentacion-celular-expediente/.
// Lo que el modelo lee NO se guarda: del lote solo salen nombres de archivo y tipos; el agrupamiento vive solo en esta consulta.
import { normalizarIdentificacion, TIPOS_IDENTIFICABLES } from "./_driveIdentificar.js";

export const MAX_IMAGENES_LOTE = 10;   // más que esto se parte en tandas (se pierde el contexto entre tandas)

// ── Prompt ───────────────────────────────────────────────────────────────────

export function armarPromptLote(n) {
  return `Recibís ${n} ${n === 1 ? "imagen numerada" : "imágenes numeradas"} (Imagen 1 a Imagen ${n}) del mismo trámite: puede haber varios documentos, y de cada uno su cara y su dorso o varias hojas. Devolvé SOLO un JSON, sin texto extra.
Identificá cada imagen leyendo su contenido, no su aspecto.

Tipos (campo "tipo"):
- dni: DNI argentino (tarjeta, libreta o digital de Mi Argentina). Anverso = la cara con la foto grande y el nombre y apellido. Reverso = la cara con la dirección, la huella o el código QR y la línea de lectura automática (IDARG...), sin foto grande.
- tarjeta_verde: cédula del automotor. Anverso = DOMINIO, CHASIS, MOTOR, MARCA y MODELO. Reverso = TITULAR y AUTORIZADO.
- poder: poder general o especial, o la escritura del poder (hojas de escribano).
- formulario: Formulario 08 del Registro del Automotor.
- otro: cualquier otro documento (partida, licencia de conducir, pasaporte, título, constancia...). En "descripcion" poné su nombre corto, por ejemplo "Licencia de conducir". Una licencia: anverso = foto, nombre y datos del titular; reverso = clases habilitadas, CUIL y código de barras, sin foto ni nombre del titular.

AGRUPÁ las imágenes que son caras u hojas del MISMO documento físico (campo "grupo": un número entero; una imagen sola va sola en su grupo). Agrupá SOLO con evidencia clara escrita en las imágenes:
- "numero": el mismo número de documento o de licencia. Ojo: el CUIL contiene el DNI (CUIL 20-31645431-4 corresponde al DNI 31645431), y la línea de lectura del reverso del DNI (IDARG...) trae el número y el nombre.
- "nombre": el mismo nombre y apellido completos.
- "continuidad": hojas consecutivas del mismo poder (mismo número de escritura, folio o texto que sigue).
Un DNI y una licencia de la misma persona son documentos DISTINTOS: no van en el mismo grupo. Dos documentos del mismo tipo de personas distintas NO se agrupan. Si no podés confirmarlo con evidencia, no agrupes. En "evidencia" poné la que usaste ("numero", "nombre", "continuidad") o "ninguna" si la imagen va sola.

Formato exacto:
{"imagenes":[{"n":1,"grupo":1,"evidencia":"numero|nombre|continuidad|ninguna","tipo":"dni|tarjeta_verde|poder|formulario|otro","descripcion":"","apellido":"","nombre":"","lado":"anverso|reverso|null","pagina":null,"paginas_total":null,"legible":true,"confianza":"alta|media|baja"}]}

Reglas:
- "apellido" y "nombre": SOLO del TITULAR del documento y solo si lo leés con total claridad en esa imagen o en otra imagen del MISMO grupo (el dorso de una licencia, que no trae el nombre, usa el del frente de su grupo). NUNCA el de un funcionario, firmante, responsable ("Responsable / in charge"), director, escribano, autoridad, padre o madre. En poder, formulario y tarjeta_verde, vacíos. Si dudás, vacíos.
- "lado" para documentos de dos caras (dni, tarjeta_verde, licencia y similares): anverso = la cara con la foto y los datos del titular, reverso = la otra. Para el resto, null. "pagina" y "paginas_total" solo para poder, formulario y otro de varias hojas, y solo si el número está impreso.
- No inventes nada: si una imagen no se lee o no es un documento, "legible": false y "confianza": "baja".
- No devuelvas ningún otro dato de los documentos. Incluí exactamente una entrada por imagen.`;
}

// ── Respuesta ────────────────────────────────────────────────────────────────

// Saca el JSON de la respuesta del modelo: tal cual, o dentro de texto/bloques de código, sea un objeto { imagenes: [...] } o un arreglo suelto.
function extraerObjeto(entrada) {
  if (entrada && typeof entrada === "object") return entrada;
  if (typeof entrada !== "string") return null;
  const intentar = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const entero = intentar(entrada.trim());
  if (entero && typeof entero === "object") return entero;
  const llave = entrada.indexOf("{"), corchete = entrada.indexOf("[");
  // Si el arreglo empieza antes que el primer objeto, el JSON es el arreglo completo; si no, el objeto completo.
  const [abre, cierra] = corchete >= 0 && (llave < 0 || corchete < llave) ? ["[", "]"] : ["{", "}"];
  const ini = entrada.indexOf(abre), fin = entrada.lastIndexOf(cierra);
  if (ini < 0 || fin <= ini) return null;
  const r = intentar(entrada.slice(ini, fin + 1));
  return r && typeof r === "object" ? r : null;
}

const EVIDENCIAS = new Set(["numero", "nombre", "continuidad"]);

// Convierte la respuesta del modelo (texto u objeto) en un resultado por imagen, en orden. Cada uno es { n, ok: true, ident, grupo,
// evidencia } o { n, ok: false, motivo }. Nunca lanza: lo que no se pueda leer queda "sin identificar".
export function normalizarLote(entrada, n) {
  const o = extraerObjeto(entrada);
  const lista = Array.isArray(o) ? o : Array.isArray(o?.imagenes) ? o.imagenes : null;
  if (!lista) return Array.from({ length: n }, (_, i) => ({ n: i + 1, ok: false, motivo: "json_invalido" }));
  const porN = new Map();
  for (const e of lista) {
    const k = Number(e?.n);
    if (Number.isInteger(k) && k >= 1 && k <= n && !porN.has(k)) porN.set(k, e);
  }
  return Array.from({ length: n }, (_, i) => {
    const e = porN.get(i + 1);
    if (!e) return { n: i + 1, ok: false, motivo: "faltante" };
    const r = normalizarIdentificacion(e);
    if (!r.ok) return { n: i + 1, ok: false, motivo: r.motivo };
    const grupo = Number.isInteger(Number(e.grupo)) && Number(e.grupo) >= 1 && Number(e.grupo) <= 999 ? Number(e.grupo) : i + 1000; // sin grupo = solo
    const evidencia = EVIDENCIAS.has(String(e.evidencia ?? "").toLowerCase()) ? String(e.evidencia).toLowerCase() : "ninguna";
    return { n: i + 1, ok: true, ident: r.ident, grupo, evidencia };
  });
}

// ── Reglas de agrupación (la última palabra la tiene el servidor, no el modelo) ──

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const personaDe = (i) => norm(`${i.apellido} ${i.nombre}`);
const mismaPersona = (a, b) => personaDe(a) === personaDe(b);

// Aplica el agrupamiento: dentro de cada grupo confirmado, quien no tiene nombre hereda el del titular. Un grupo solo se acepta si
// cumple TODAS estas condiciones (si no, cada imagen queda como si estuviera sola, con su propio nombre o sin nombre):
//  - tiene al menos 2 imágenes legibles y todas informan evidencia ("numero", "nombre" o "continuidad");
//  - todas son del mismo tipo (y, en "otro", la misma descripción);
//  - las que informan persona coinciden entre sí (si hay dos personas distintas, el agrupamiento es dudoso).
// Devuelve un arreglo igual al recibido, con `agrupado: true/false` y `ident` posiblemente completado.
export function aplicarGrupos(items) {
  const salida = items.map((it) => (it.ok ? { ...it, ident: { ...it.ident }, agrupado: false } : { ...it }));
  const porGrupo = new Map();
  for (const it of salida) if (it.ok) (porGrupo.get(it.grupo) ?? porGrupo.set(it.grupo, []).get(it.grupo)).push(it);

  for (const miembros of porGrupo.values()) {
    if (miembros.length < 2) continue;
    if (miembros.some((m) => m.evidencia === "ninguna")) continue;
    const t = miembros[0].ident;
    if (miembros.some((m) => m.ident.tipo !== t.tipo)) continue;
    if (t.tipo === "otro" && miembros.some((m) => norm(m.ident.descripcion) !== norm(t.descripcion))) continue;
    const conPersona = miembros.filter((m) => m.ident.apellido || m.ident.nombre);
    if (conPersona.some((m) => !mismaPersona(m.ident, conPersona[0].ident))) continue;
    for (const m of miembros) m.agrupado = true;
    if (!conPersona.length || t.tipo === "poder" || t.tipo === "formulario" || t.tipo === "tarjeta_verde") continue;
    // Hereda el nombre del titular: se toma el más completo (el del frente suele tener nombre y apellido bien escritos).
    const titular = conPersona.slice().sort((a, b) => personaDe(b.ident).length - personaDe(a.ident).length)[0].ident;
    for (const m of miembros) {
      if (!m.ident.apellido && !m.ident.nombre) { m.ident.apellido = titular.apellido; m.ident.nombre = titular.nombre; }
    }
  }
  return salida;
}

export { TIPOS_IDENTIFICABLES };
