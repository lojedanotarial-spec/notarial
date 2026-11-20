// Lógica pura del Explorador (spec archivo-legal-y-explorador, T5): cómo se interpreta la búsqueda,
// qué filtros se mandan a explorador_buscar/explorador_conteos, las etiquetas de filtros y la ruta.
import { ETIQUETA_CLASE } from "./protocolo";
import { ELABELS } from "../constants";

export const POR_PAGINA = 50;

const soloDigitos = (s) => String(s ?? "").replace(/\D/g, "");
const esNumerico = (s) => /^[\d.\-\s]+$/.test(s);
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Dice cómo se entendió lo escrito (D25): CUIT, DNI, número parcial o texto.
export function interpretarBusqueda(q) {
  const t = String(q ?? "").trim();
  if (!t) return null;
  if (esNumerico(t)) {
    const d = soloDigitos(t);
    if (!d) return null;
    if (d.length === 11) return { tipo: "cuit", texto: `Buscando por CUIT ${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` };
    if (d.length === 7 || d.length === 8) return { tipo: "dni", texto: `Buscando por DNI ${miles(d)}` };
    return { tipo: "numero", texto: `Buscando DNI o CUIT que empiecen con ${d}` };
  }
  return { tipo: "texto", texto: `Buscando por nombre, apellido, título o acto: «${t}»` };
}

// Filtros que entiende la base. Nunca manda claves vacías.
export function armarFiltros(f, registro) {
  const out = {};
  if (registro) out.registro = String(registro);
  if (f.clase) out.clase = f.clase;
  if (f.anio) out.anio = Number(f.anio);
  if (f.acto) out.acto = f.acto;
  if (f.estado) out.estado = f.estado;
  if (f.persona) out.persona = f.persona;
  const q = String(f.q ?? "").trim();
  if (q) out.q = q;
  return out;
}

export const FILTROS_VACIOS = { clase: "", anio: 0, acto: "", estado: "", persona: "", q: "" };

export function hayFiltros(f) {
  return Boolean(f.clase || f.anio || f.acto || f.estado || f.persona || String(f.q ?? "").trim());
}

// Etiquetas quitables (D26). nombres: { actos: {codigo: nombre}, personas: {clave: nombre} }.
export function etiquetasFiltros(f, nombres = {}) {
  const e = [];
  if (f.anio) e.push({ clave: "anio", label: `Año ${f.anio}` });
  if (f.clase) e.push({ clave: "clase", label: ETIQUETA_CLASE[f.clase] || f.clase });
  if (f.acto) e.push({ clave: "acto", label: nombres.actos?.[f.acto] || f.acto });
  if (f.estado) e.push({ clave: "estado", label: ELABELS[f.estado] || f.estado });
  if (f.persona) e.push({ clave: "persona", label: nombres.personas?.[f.persona] || f.persona });
  const q = String(f.q ?? "").trim();
  if (q) e.push({ clave: "q", label: `«${q}»` });
  return e;
}

// Ruta visible: 2026 › Protocolar › Compraventa (D26). Sin filtros: todo el archivo.
export function rutaVisible(f, nombres = {}) {
  const tramos = [];
  if (f.anio) tramos.push(String(f.anio));
  if (f.clase) tramos.push(ETIQUETA_CLASE[f.clase] || f.clase);
  if (f.acto) tramos.push(nombres.actos?.[f.acto] || f.acto);
  return tramos.length ? tramos.join("  ›  ") : "Todo el archivo";
}

// "2026-11-14" o un timestamp → "14/11/2026".
export function fechaCorta(valor) {
  if (!valor) return "—";
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return "—";
}

export function formatoCantidad(n) {
  return miles(Number(n) || 0);
}
