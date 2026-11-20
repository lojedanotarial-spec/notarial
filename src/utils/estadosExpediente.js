import { C } from "../constants";

// Estados del expediente (decisión D33, specs/archivo-legal-y-explorador/diseno-ux.md).
// Única fuente: pantallas, filtros y el Explorador leen de acá.
// Contrastes medidos con .claude/skills/notarial-design/scripts/contraste.mjs (todos ≥ 4.5:1).
//
// «Cerrado» no se elige a mano: lo pone el cierre del expediente (D31: PDF + guardado + Drive),
// que todavía no está construido. Por eso no figura entre los que se pueden elegir.
// «Archivado» se retiró: no hacía nada distinto. Un valor viejo o desconocido se muestra tal cual, en gris.

export const ESTADOS_EXPEDIENTE = [
  { key: "abierto",    label: "Abierto",    icono: "abierto",    color: C.ceruleanText, fondo: C.ceruleanLight },
  { key: "en_tramite", label: "En trámite", icono: "en_tramite", color: C.warnText,     fondo: "rgba(201,169,97,.15)" },
  { key: "completado", label: "Completado", icono: "completado", color: C.success,      fondo: C.successBg },
  { key: "cerrado",    label: "Cerrado",    icono: "cerrado",    color: C.dark,         fondo: "rgba(26,35,50,.07)", soloPorCierre: true },
];

// Los que se pueden elegir en el selector del expediente.
export const ESTADOS_ELEGIBLES = ESTADOS_EXPEDIENTE.filter(e => !e.soloPorCierre);

export const ESTADO_INICIAL = "abierto";

export function infoEstado(key) {
  const conocido = ESTADOS_EXPEDIENTE.find(e => e.key === key);
  if (conocido) return conocido;
  const texto = String(key || "Sin estado").replace(/_/g, " ");
  return { key, label: texto.charAt(0).toUpperCase() + texto.slice(1), icono: null, color: "rgba(26,35,50,.75)", fondo: "rgba(26,35,50,.07)" };
}
