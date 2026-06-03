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
          { type: "text", text: `Analizá este documento argentino.

PASO 1 — IDENTIFICAR EL TIPO:
¿El documento contiene datos de un VEHÍCULO (dominio/patente, chasis, motor, marca, modelo)?
Documentos de vehículo incluyen: tarjeta verde, cédula verde, cédula azul, título automotor, Cédula de Identificación del Automotor, Cédula de Identificación de Vehículos (DNRPA), cualquier documento con dominio/patente y datos técnicos del rodado.

Si SÍ → usá el formato VEHÍCULO.
Si NO → usá el formato PERSONA.

INSTRUCCIONES GENERALES:
- El documento puede estar fotografiado en cualquier orientación. Rotalo mentalmente hasta leerlo.
- Si un campo no está visible o legible, dejá el campo vacío — NUNCA inventes datos.

FORMATO VEHÍCULO (cuando el documento tiene dominio, chasis, motor, marca):
{
  "tipo_documento": "tarjeta_verde",
  "vehiculo": {
    "marca": "MARCA EN MAYÚSCULAS",
    "modelo": "modelo completo con versión",
    "tipo_desc": "SEDAN 5 PTAS | HATCHBACK | SUV | MOTOCICLETA | etc.",
    "dominio": "patente sin espacios ni guiones",
    "chasis": "número de chasis o VIN completo",
    "motor": "número de motor completo",
    "anio": "año si figura",
    "color": "color si figura"
  },
  "titular": {
    "apellido": "",
    "nombre": "",
    "nro_doc": "solo números"
  },
  "notas": ""
}

FORMATO PERSONA (DNI, LE, LC, pasaporte, partidas, licencias):
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

Respondé SOLO con el JSON válido, sin texto adicional.` }
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
