// Llamadas a /api/captura. Dos formas de autorizarse:
//   desde la compu: con la sesión del usuario (apiPost);
//   desde el celular: solo con el código del QR, sin login (postCelular).
import { apiPost } from "./apiFetch";

export const capturaCompu = (accion, datos = {}) => apiPost("/api/captura", { accion, ...datos });

export async function postCelular(accion, datos = {}) {
  let res;
  try {
    res = await fetch("/api/captura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, ...datos }),
    });
  } catch {
    const e = new Error("Sin conexión. Revisá tu internet y probá de nuevo.");
    e.sinConexion = true;
    throw e;
  }
  let json = null;
  try { json = await res.json(); } catch { /* sin JSON */ }
  if (!res.ok) {
    const e = new Error(json?.error || `Error del servidor (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return json;
}

// Qué campos clave no se pudieron leer de una persona (para avisarle al usuario qué repetir).
export function camposFaltantes(persona) {
  const etiquetas = { apellido: "apellido", nombre: "nombre", nro_doc: "número de documento", fecha_nac: "fecha de nacimiento" };
  return Object.keys(etiquetas)
    .filter((c) => !String(persona?.[c] ?? "").trim())
    .map((c) => etiquetas[c]);
}
