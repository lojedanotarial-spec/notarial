// Callback de OnlyOffice Document Server.
// Status 2/6 → OO tiene el DOCX actualizado listo; lo descargamos y re-subimos a Supabase Storage.
//
// Seguridad: OO firma cada callback con JWT (secreto compartido OO_JWT_SECRET). Sin firma válida
// no se toca el Storage: antes este endpoint era público y cualquiera podía sobrescribir documentos.

import { SUPABASE_URL } from "./_supabaseConfig.js";
import { verifyOoJwt, OO_KEY_RE } from "./_ooJwt.js";

const BUCKET = "oo-docs";

// OO manda el token en el header Authorization (payload = { payload: <body> }) y, según la
// config, también en body.token (payload = <body>). Devuelve el body verificado o null.
export function bodyVerificado(req, secret) {
  const h = req.headers?.authorization || "";
  if (h.startsWith("Bearer ")) {
    const p = verifyOoJwt(h.slice(7), secret);
    if (p) return p.payload && typeof p.payload === "object" ? p.payload : p;
  }
  const t = req.body?.token;
  if (t) {
    const p = verifyOoJwt(t, secret);
    if (p) return p;
  }
  return null;
}

export default async function handler(req, res) {
  // Sin CORS abierto: el que llama es el servidor de OnlyOffice, no un navegador.
  if (req.method !== "POST") return res.status(405).json({ error: 1 });

  const secret = process.env.OO_JWT_SECRET;
  if (!secret) {
    console.error("[oo-callback] OO_JWT_SECRET no configurado");
    return res.status(500).json({ error: 1 });
  }

  const body = bodyVerificado(req, secret);
  if (!body) return res.status(403).json({ error: 1 });

  const { key } = req.query;

  // status 2 = listo para guardar, status 6 = force save
  if ((body.status === 2 || body.status === 6) && body.url && key) {
    if (!OO_KEY_RE.test(key)) return res.status(400).json({ error: 1 });
    try {
      const docResp = await fetch(body.url);
      if (!docResp.ok) throw new Error(`OO download ${docResp.status}`);
      const buf = await docResp.arrayBuffer();

      const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
      const uploadResp = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${key}.docx`,
        {
          method:  "PUT",
          headers: {
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "apikey":        SERVICE_KEY,
            "Content-Type":  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "x-upsert":      "true",
          },
          body: buf,
        }
      );
      if (!uploadResp.ok) {
        const txt = await uploadResp.text();
        console.error("[oo-callback] upload error:", txt);
      }
    } catch (e) {
      console.error("[oo-callback] error:", e.message);
    }
  }

  return res.status(200).json({ error: 0 });
}
