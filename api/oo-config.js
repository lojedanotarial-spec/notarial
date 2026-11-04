// Firma la configuración del editor de OnlyOffice (JWT) para usuarios logueados y le entrega la
// URL del documento: una URL firmada de Supabase Storage de corta vida (el bucket oo-docs es privado).
// El secreto OO_JWT_SECRET y la service key viven solo acá (Vercel); el navegador nunca los ve.
// Con JWT activo en el Document Server, una config sin token válido no abre documentos.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./_supabaseConfig.js";
import { signOoJwt, OO_KEY_RE } from "./_ooJwt.js";

const BUCKET = "oo-docs";
const URL_TTL_SEGUNDOS = 15 * 60; // OO descarga el documento al abrir (segundos); sobra margen. Se re-firma en cada apertura.
const CALLBACK_HOSTS = ["notarial.lat", "www.notarial.lat"];

async function usuarioValido(accessToken) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  return r.ok;
}

// Devuelve un string con el motivo si la config no es aceptable, o null si está bien.
// La URL del documento NO viene del cliente: la arma el servidor a partir de la key.
export function validarConfig(config, hostActual) {
  const doc = config?.document;
  const ed  = config?.editorConfig;
  if (!doc || !ed) return "config incompleta";
  if (!OO_KEY_RE.test(doc.key || "")) return "key inválida";
  let cb;
  try { cb = new URL(ed.callbackUrl); } catch { return "callbackUrl inválida"; }
  if (cb.pathname !== "/api/oo-callback") return "callbackUrl no permitida";
  if (cb.searchParams.get("key") !== doc.key) return "callbackUrl no coincide con la key";
  if (![...CALLBACK_HOSTS, hostActual].filter(Boolean).includes(cb.host)) return "host de callback no permitido";
  return null;
}

async function urlFirmadaDelDocumento(key, serviceKey) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${key}.docx`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: URL_TTL_SEGUNDOS }),
  });
  if (!r.ok) return null; // el documento no existe en el bucket
  const { signedURL } = await r.json();
  return signedURL ? `${SUPABASE_URL}/storage/v1${signedURL}` : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const secret     = process.env.OO_JWT_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!secret || !serviceKey) return res.status(500).json({ error: "Servidor sin configurar" });

  const auth = req.headers.authorization || "";
  const accessToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!accessToken || !(await usuarioValido(accessToken))) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const { config } = req.body || {};
  const motivo = validarConfig(config, req.headers.host);
  if (motivo) return res.status(400).json({ error: motivo });

  const url = await urlFirmadaDelDocumento(config.document.key, serviceKey);
  if (!url) return res.status(404).json({ error: "Documento no encontrado" });

  // Se firma solo lo que OO necesita validar (sin events/width/height).
  const document = { ...config.document, url };
  const payload  = { document, documentType: config.documentType, editorConfig: config.editorConfig };
  return res.status(200).json({ token: signOoJwt(payload, secret), url });
}
