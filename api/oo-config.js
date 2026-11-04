// Firma la configuración del editor de OnlyOffice (JWT) para usuarios logueados.
// El secreto OO_JWT_SECRET vive solo acá (Vercel); el navegador nunca lo ve.
// Con JWT activo en el Document Server, una config sin token válido no abre documentos.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./_supabaseConfig.js";
import { signOoJwt, OO_KEY_RE } from "./_ooJwt.js";

const DOC_URL_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/oo-docs/`;
const CALLBACK_HOSTS = ["notarial.lat", "www.notarial.lat"];

async function usuarioValido(accessToken) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  return r.ok;
}

// Devuelve un string con el motivo si la config no es aceptable, o null si está bien.
export function validarConfig(config, hostActual) {
  const doc = config?.document;
  const ed  = config?.editorConfig;
  if (!doc || !ed) return "config incompleta";
  if (!OO_KEY_RE.test(doc.key || "")) return "key inválida";
  if (typeof doc.url !== "string" || !doc.url.startsWith(DOC_URL_PREFIX)) return "url de documento no permitida";
  let cb;
  try { cb = new URL(ed.callbackUrl); } catch { return "callbackUrl inválida"; }
  if (cb.pathname !== "/api/oo-callback") return "callbackUrl no permitida";
  if (cb.searchParams.get("key") !== doc.key) return "callbackUrl no coincide con la key";
  if (![...CALLBACK_HOSTS, hostActual].filter(Boolean).includes(cb.host)) return "host de callback no permitido";
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const secret = process.env.OO_JWT_SECRET;
  if (!secret) return res.status(500).json({ error: "OO_JWT_SECRET no configurado" });

  const auth = req.headers.authorization || "";
  const accessToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!accessToken || !(await usuarioValido(accessToken))) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const { config } = req.body || {};
  const motivo = validarConfig(config, req.headers.host);
  if (motivo) return res.status(400).json({ error: motivo });

  // Se firma solo lo que OO necesita validar (sin events/width/height).
  const payload = { document: config.document, documentType: config.documentType, editorConfig: config.editorConfig };
  return res.status(200).json({ token: signOoJwt(payload, secret) });
}
