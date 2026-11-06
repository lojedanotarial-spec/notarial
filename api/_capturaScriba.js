// Captura desde el celular — lado de Scriba (lógica pura, se prueba sola).
// Los datos leídos de las fotos llegan al servidor en `datos_captura` (desde el navegador, no se guardan acá). Scriba
// los ve numerados y, cuando sabe quién es quién, los referencia por número: el servidor arma lo que se aplica, así el
// modelo nunca copia datos a mano. Spec: specs/captura-documentos-celular/.
import { MODOS, CAMPOS_PERSONA, vacio, camposNoLeidos } from "./_captura.js";

const MAX_BYTES_DATOS_CAPTURA = 60_000;
const CAMPOS_VEHICULO = ["marca", "modelo", "tipo_desc", "dominio", "chasis", "motor"];
const recortar = (v) => (typeof v === "string" ? v.slice(0, 200) : v);

// Lo que el navegador manda en `datos_captura` no es de fiar: se deja solo lo esperado, recortado y con tope de tamaño.
export function limpiarDatosCaptura(datos) {
  if (!datos || typeof datos !== "object") return null;
  const limpiarPersona = (p) => Object.fromEntries(CAMPOS_PERSONA.filter((c) => !vacio(p?.[c])).map((c) => [c, recortar(p[c])]));
  const out = {
    modo: MODOS.includes(datos.modo) ? datos.modo : "libre",
    personas: (Array.isArray(datos.personas) ? datos.personas : []).slice(0, 20).map((p) => ({
      ...limpiarPersona(p),
      ...(Array.isArray(p?._discrepancias)
        ? { _discrepancias: p._discrepancias.slice(0, 5).map((d) => ({ campo: recortar(String(d?.campo)), valores: (d?.valores || []).slice(0, 3).map((v) => recortar(String(v))) })) }
        : {}),
    })),
    vehiculos: (Array.isArray(datos.vehiculos) ? datos.vehiculos : []).slice(0, 20).map((v) => ({
      vehiculo: Object.fromEntries(CAMPOS_VEHICULO.filter((c) => !vacio(v?.vehiculo?.[c])).map((c) => [c, recortar(v.vehiculo[c])])),
      titular: v?.titular ? limpiarPersona(v.titular) : null,
    })),
    dorsos: Array.isArray(datos.dorsos) ? datos.dorsos.slice(0, 20).map((d) => ({ personas: (d?.personas || []).slice(0, 5).map(limpiarPersona) })) : [],
    otros: Array.isArray(datos.otros) ? datos.otros.length : 0,
  };
  return JSON.stringify(out).length > MAX_BYTES_DATOS_CAPTURA ? null : out;
}

const nombreDe = (p) => [p.apellido, p.nombre].filter(Boolean).join(", ") || "sin nombre legible";
const domicilioDe = (p) => [[p.calle, p.numero].filter(Boolean).join(" "), p.barrio, p.localidad, p.departamento].filter(Boolean).join(", ");

// Texto que ve el modelo: los datos numerados (por esos números los referencia, nunca los copia).
export function notaDatosCaptura(datos) {
  if (!datos) return "";
  const l = [];
  l.push("\n\n[FOTOS RECIBIDAS DEL CELULAR]");
  l.push("El escribano subió fotos desde el celular y ya se leyeron. Los datos están numerados; referite a ellos por su número.");
  l.push(`Personas (${datos.personas.length}):`);
  datos.personas.forEach((p, i) => {
    const faltan = camposNoLeidos(p);
    l.push(`  [${i}] ${nombreDe(p)}${p.nro_doc ? ` · ${p.tipo_doc || "doc."} ${p.nro_doc}` : ""}${p.fecha_nac ? ` · nac. ${p.fecha_nac}` : ""}${domicilioDe(p) ? ` · ${domicilioDe(p)}` : ""}`
      + (faltan.length ? ` · NO SE PUDO LEER: ${faltan.join(", ")}` : "")
      + (p._discrepancias?.length ? ` · DISCREPANCIAS entre documentos: ${p._discrepancias.map((d) => `${d.campo} (${d.valores.join(" / ")})`).join("; ")}` : ""));
  });
  l.push(`Vehículos (${datos.vehiculos.length}):`);
  datos.vehiculos.forEach((v, i) => {
    const x = v.vehiculo;
    l.push(`  [${i}] ${[x.marca, x.modelo].filter(Boolean).join(" ") || "vehículo"} · dominio ${x.dominio || "(no legible)"}${v.titular ? ` · titular ${nombreDe(v.titular)}${v.titular.nro_doc ? ` DNI ${v.titular.nro_doc}` : ""}` : ""}`);
  });
  if (datos.dorsos.length) {
    l.push(`Dorsos de tarjeta SIN emparejar (${datos.dorsos.length}): no traen la patente, así que no sabés de qué vehículo son; si hace falta, preguntá. Titulares/autorizados que traen: ${datos.dorsos.map((d) => d.personas.map(nombreDe).join(" y ")).join(" | ")}`);
  }
  if (datos.otros) l.push(`Fotos que no se reconocieron como documento: ${datos.otros}`);
  l.push("INSTRUCCIONES: 1) Contale al escribano en pocas líneas qué encontraste. 2) Preguntá SOLO lo que no puedas deducir con certeza (quién es comprador y quién vendedor, de qué vehículo es un dorso); lo inequívoco no lo preguntes. 3) Cuando lo sepas, llamá a 'distribuir_captura' con los números y los roles del documento abierto, sin copiar los datos. NO uses completar_parte ni completar_vehiculo con estos datos. 4) Si un dato figura como NO SE PUDO LEER o hay DISCREPANCIAS, decíselo; nunca lo completes por tu cuenta.");
  return l.join("\n");
}

// Convierte la decisión del modelo (índices + roles) en lo que aplica la pantalla. Valida todo: un índice
// inexistente es un error que se le devuelve al modelo para que lo corrija.
export function resolverDistribucion(datos, input = {}) {
  if (!datos) return { error: "No hay fotos recibidas del celular para distribuir." };
  const pedidasP = Array.isArray(input.personas) ? input.personas : [];
  const pedidosV = Array.isArray(input.vehiculos) ? input.vehiculos : [];
  if (!pedidasP.length && !pedidosV.length) return { error: "Indicá al menos una persona o un vehículo." };
  const vistas = new Set(), vistosV = new Set();
  const personas = [];
  for (const it of pedidasP) {
    const i = it?.indice;
    if (!Number.isInteger(i) || i < 0 || i >= datos.personas.length) return { error: `La persona [${i}] no existe (hay ${datos.personas.length}).` };
    if (vistas.has(i)) return { error: `La persona [${i}] está repetida.` };
    vistas.add(i);
    const { _discrepancias, ...persona } = datos.personas[i];
    personas.push({ ...persona, rol: String(it.rol || "").trim().toUpperCase() });
  }
  const vehiculos = [];
  for (const it of pedidosV) {
    const i = it?.indice;
    if (!Number.isInteger(i) || i < 0 || i >= datos.vehiculos.length) return { error: `El vehículo [${i}] no existe (hay ${datos.vehiculos.length}).` };
    if (vistosV.has(i)) return { error: `El vehículo [${i}] está repetido.` };
    vistosV.add(i);
    vehiculos.push({ ...datos.vehiculos[i].vehiculo, tipo_vehiculo: "VEHÍCULO" });
  }
  const resumen = [
    ...personas.map((p) => `${p.rol || "SIN ROL"}: ${nombreDe(p)}${p.nro_doc ? ` (DNI ${p.nro_doc})` : ""}`),
    ...vehiculos.map((v) => `Vehículo: ${[v.marca, v.modelo].filter(Boolean).join(" ")} ${v.dominio || ""}`.trim()),
  ];
  return { accion: { tipo: "aplicar_captura", personas, vehiculos, resumen } };
}
