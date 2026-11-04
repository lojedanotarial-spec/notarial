// Llamadas a los endpoints /api/* del backend, siempre con la sesión del usuario.
// Los endpoints que gastan crédito (vision, scriba) rechazan con 401 si falta el token.
import { supabase } from "../supabase";

export async function apiPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Tu sesión venció. Volvé a iniciar sesión.");
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* respuesta sin JSON */ }
  if (!res.ok) throw new Error(json?.error || `Error del servidor: ${res.status}`);
  return json;
}

// Manda una imagen/PDF (base64) a /api/vision y devuelve los datos extraídos.
export function enviarAVision(data, mediaType) {
  return apiPost("/api/vision", { imagen: { data, mediaType } });
}

// File -> base64 (sin el prefijo data:...;base64,)
export function archivoABase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(String(e.target.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
