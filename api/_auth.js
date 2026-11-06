// Autenticación compartida de los endpoints: exige un usuario logueado de Supabase.
// Sin esto, cualquiera con la URL podía gastar crédito de Anthropic (vision, scriba).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./_supabaseConfig.js";

// Saca el access_token del header "Authorization: Bearer <token>" ("" si no hay).
export function tokenDeRequest(req) {
  const auth = req.headers?.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export async function usuarioValido(accessToken) {
  if (!accessToken) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Igual que usuarioValido, pero devuelve el usuario de Supabase Auth ({ id, email, ... }) o null.
export async function usuarioDeToken(accessToken) {
  if (!accessToken) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Para usar al principio de un handler:  const token = await exigirUsuario(req, res); if (!token) return;
// Devuelve el access_token si es válido; si no, responde 401 y devuelve null.
export async function exigirUsuario(req, res) {
  const token = tokenDeRequest(req);
  if (!(await usuarioValido(token))) {
    res.status(401).json({ error: "No autenticado" });
    return null;
  }
  return token;
}
