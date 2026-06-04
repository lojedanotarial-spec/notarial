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

IDENTIFICAR TIPO — seguí este orden:

A) ¿Ves "DOMINIO", "CHASIS", "MOTOR", "MARCA", "MODELO" con valores técnicos? (frente de tarjeta verde/cédula de vehículo)
   → usá FORMATO A — VEHÍCULO FRENTE

B) ¿Ves "TITULAR:" seguido de un nombre, "AUTORIZADO:" seguido de otro nombre, y el logo DNRPA? (dorso de tarjeta verde)
   → usá FORMATO B — VEHÍCULO DORSO

C) ¿Es DNI, LE, LC, pasaporte, licencia, partida de nacimiento/matrimonio?
   → usá FORMATO C — PERSONA

Instrucciones: el documento puede estar en cualquier orientación — rotalo mentalmente. Si un dato no se lee con certeza, dejá el campo vacío.

═══ FORMATO A — VEHÍCULO FRENTE (dominio, chasis, motor) ═══
{
  "tipo_documento": "tarjeta_verde",
  "vehiculo": {
    "marca": "MARCA EN MAYÚSCULAS",
    "modelo": "modelo completo con versión",
    "tipo_desc": "SEDAN 5 PTAS | SEDAN 5 PUERTAS | HATCHBACK | SUV | MOTOCICLETA",
    "dominio": "patente sin espacios ni guiones",
    "chasis": "número de chasis o VIN completo",
    "motor": "número de motor completo",
    "anio": "",
    "color": ""
  },
  "titular": { "apellido": "", "nombre": "", "nro_doc": "solo números" },
  "notas": ""
}

═══ FORMATO B — VEHÍCULO DORSO (titular + autorizado) ═══
{
  "tipo_documento": "tarjeta_verde",
  "personas": [
    {
      "apellido": "apellido del TITULAR",
      "nombre": "nombre/s del TITULAR",
      "nro_doc": "DNI del titular solo números",
      "tipo_doc": "DNI",
      "genero": "M|F",
      "calle": "calle del domicilio si figura",
      "numero": "número si figura",
      "localidad": "localidad si figura",
      "departamento": "departamento si figura",
      "_rol_sugerido": "AUTORIZANTE"
    },
    {
      "apellido": "apellido del AUTORIZADO",
      "nombre": "nombre/s del AUTORIZADO",
      "nro_doc": "DNI del autorizado solo números",
      "tipo_doc": "DNI",
      "genero": "M|F",
      "_rol_sugerido": "AUTORIZADO"
    }
  ],
  "notas": ""
}

═══ FORMATO C — PERSONA (DNI, pasaporte, partidas, licencias) ═══
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
    "calle": "nombre de la calle o avenida",
    "numero": "número de puerta/lote",
    "barrio": "nombre del barrio si figura (ej: B° Di Rocco, B° Unión y Fuerza) — NO poner en localidad",
    "manzana": "manzana si figura",
    "casa": "casa o lote si figura",
    "localidad": "nombre del pueblo, ciudad o distrito — NO confundir con barrio",
    "departamento": "departamento o municipio (ej: Godoy Cruz, Maipú, Capital)",
    "provincia": "provincia si figura (ej: Mendoza, Buenos Aires)",
    "pais": "país si figura, omitir si es Argentina"
  }],
  "notas": ""
}

Respondé SOLO con el JSON válido del formato que corresponda, sin texto adicional.` }
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
