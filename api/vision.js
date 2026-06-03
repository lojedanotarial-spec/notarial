import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imagen } = req.body;
  if (!imagen?.data || !imagen?.mediaType) return res.status(400).json({ error: "Imagen requerida" });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imagen.mediaType, data: imagen.data } },
          { type: "text", text: `Analizá este documento argentino y determiná su tipo. Puede ser:
- Documento de identidad (DNI, LE, LC, pasaporte)
- Tarjeta verde / título automotor / cédula del automotor (documentos de vehículo)
- Otro documento

INSTRUCCIONES GENERALES:
- El documento puede estar fotografiado en cualquier orientación. Rotalo mentalmente.
- Si un campo no está visible o legible, dejá el campo vacío — NO inventes datos.

Si es un DOCUMENTO DE IDENTIDAD, respondé:
{
  "tipo_documento": "DNI|licencia|partida_nacimiento|partida_matrimonio|otro",
  "personas": [{
    "apellido": "",
    "nombre": "",
    "nro_doc": "solo números sin puntos",
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
  }],
  "notas": ""
}

Si es una TARJETA VERDE, TÍTULO AUTOMOTOR o CÉDULA DEL AUTOMOTOR, respondé:
{
  "tipo_documento": "tarjeta_verde|titulo_automotor",
  "vehiculo": {
    "marca": "marca del vehículo en mayúsculas",
    "modelo": "modelo completo incluyendo versión",
    "tipo_desc": "tipo/carrocería (SEDAN, HATCHBACK, SUV, MOTOCICLETA, etc.)",
    "dominio": "patente sin espacios ni guiones",
    "chasis": "número de chasis/VIN completo",
    "motor": "número de motor",
    "anio": "año del modelo si figura",
    "color": ""
  },
  "titular": {
    "apellido": "",
    "nombre": "",
    "nro_doc": "solo números"
  },
  "notas": ""
}

Respondé SOLO con el JSON válido correspondiente, sin texto adicional.` }
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
