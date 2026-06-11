// Callback de OnlyOffice Document Server.
// Status 2/6 → OO tiene el DOCX actualizado listo; lo descargamos y re-subimos a Supabase Storage.

const SUPABASE_URL = "https://eueqluhhgvukovoyorrw.supabase.co";
const BUCKET       = "oo-docs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { key } = req.query;
  const body     = req.body || {};

  // status 2 = listo para guardar, status 6 = force save
  if ((body.status === 2 || body.status === 6) && body.url && key) {
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
