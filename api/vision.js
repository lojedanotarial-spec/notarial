import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { imagen } = req.body;
  if (!imagen?.data || !imagen?.mediaType) return res.status(400).json({ error: "Imagen requerida" });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imagen.mediaType, data: imagen.data } },
          { type: "text", text: `Leé este documento argentino con atención y extraé los datos de TODAS las personas que aparecen.

INSTRUCCIONES CRÍTICAS:
0. El documento puede estar fotografiado en cualquier orientación (rotado 90°, 180°, de costado). Rotá mentalmente la imagen hasta leerla correctamente antes de extraer datos.
1. El documento tiene etiquetas impresas bilingües (ej: "Apellido / Surname", "Nombre / Name", "Sexo / Sex", "Fecha de nacimiento / Date of birth"). LEÉ ESAS ETIQUETAS para identificar cada campo — no asumas el orden por posición.
2. En el DNI argentino: el campo "Apellido" contiene el apellido, el campo "Nombre" contiene el/los nombre/s. No los inviertas.
3. El campo "Sexo" o "Sex" en el DNI indica el género: "M" o "F". Es un campo crítico — extraelo siempre.
4. La foto, el fondo y los colores del documento indican el género cuando no hay texto explícito.
5. El nro_doc: solo números, sin puntos ni guiones.
6. Fecha de nacimiento en formato dd/mm/aaaa.
7. Si un texto no es legible con certeza, dejá el campo vacío. NO inventes ni completes apellidos o nombres que no podés leer claramente.
8. El campo "notas" solo si hay algo jurídicamente relevante (ej: "DNI vencido", "menor de edad"). NUNCA describas colores, fondos, fotos ni el aspecto visual del documento.

Respondé SOLO con un JSON válido, sin texto adicional:
{
  "tipo_documento": "DNI|licencia|partida_nacimiento|partida_matrimonio|partida_divorcio|defuncion|otro",
  "personas": [
    {
      "apellido": "extraído del campo Apellido del documento",
      "nombre": "extraído del campo Nombre del documento",
      "nro_doc": "solo números",
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
  "notas": "solo si hay algo jurídicamente relevante (ej: documento vencido, DNI de menor, restricción de capacidad). NO describir colores, fondos, fotos ni elementos visuales"
}
Solo incluí los campos que efectivamente aparecen en el documento.` }
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
