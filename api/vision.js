import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imagen } = req.body;
  if (!imagen?.data || !imagen?.mediaType) return res.status(400).json({ error: "Imagen requerida" });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imagen.mediaType, data: imagen.data } },
          { type: "text", text: `Leé este documento argentino y extraé los datos de TODAS las personas que aparecen.
Respondé SOLO con un JSON válido, sin texto adicional, con este formato:
{
  "tipo_documento": "DNI|licencia|partida_nacimiento|partida_matrimonio|partida_divorcio|defuncion|otro",
  "personas": [
    {
      "apellido": "",
      "nombre": "",
      "nro_doc": "",
      "tipo_doc": "DNI|LE|LC|Pasaporte",
      "genero": "M|F",
      "fecha_nac": "dd/mm/aaaa",
      "estado_civil": "",
      "nacionalidad": "argentina",
      "cuit": "",
      "calle": "",
      "numero": "",
      "piso": "",
      "dpto": "",
      "localidad": "",
      "departamento": ""
    }
  ],
  "notas": "info adicional relevante del documento"
}
Solo incluí los campos que efectivamente aparecen en el documento. El nro_doc solo números sin puntos ni guiones.` }
        ]
      }],
    });

    const texto = response.content.find(c => c.type === "text")?.text || "{}";
    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    const datos = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return res.status(200).json(datos);
  } catch (e) {
    console.error("Vision error:", e);
    return res.status(500).json({ error: e.message });
  }
}
