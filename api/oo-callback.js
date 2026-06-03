// Callback de OnlyOffice Document Server.
// OO llama a este endpoint cuando intenta guardar el documento.
// Respondemos con error:0 (éxito) para que OO no muestre el dialog de "cambios sin guardar".
// El docx real se regenera desde los datos del formulario, no desde OO.
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  res.status(200).json({ error: 0 });
}
