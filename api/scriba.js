import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = "https://eueqluhhgvukovoyorrw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E";

const TEMPLATES_MAP = {
  acta_asamblea:          { id: "1540ea5b-53f2-4dd0-beab-80a3b1645271", nombre: "Acta de asamblea" },
  acta_constatacion:      { id: "a6e4007a-2f90-4478-96fc-89bfa29a8e43", nombre: "Acta de constatación" },
  acta_directorio:        { id: "16debb5a-ade1-44b9-a1ac-83dbb8c32ce8", nombre: "Acta de directorio" },
  acta_entrega:           { id: "5a05cb52-53b3-4ba1-a061-85fe57d164a8", nombre: "Acta de entrega" },
  acta_manifestacion:     { id: "b375d513-46a4-4e28-a8ff-d025a2d8176c", nombre: "Acta de manifestación" },
  acta_notificacion:      { id: "9d055841-943e-4116-9c77-84ba258f5530", nombre: "Acta de notificación" },
  autorizacion_viaje:     { id: "615ffb12-f96a-4afc-8f88-c4deae5d996a", nombre: "Autorización de viaje de menor" },
  cert_copia:             { id: "c807c25e-7b69-4f82-9f70-45c3af3fea27", nombre: "Certificación de copia" },
  cert_firma:             { id: "64d2c40c-5e62-4dad-bc56-ec653ca81c28", nombre: "Certificación de firma" },
  cert_firma_f08:         { id: "5e9d4c55-2cdd-439a-87e4-65c6cedd38e9", nombre: "Certificación de firma - Formulario 08" },
  fe_vida:                { id: "b797507d-62c1-4b7a-9749-51aa46b5938d", nombre: "Fe de vida" },
  aceptacion_donacion:    { id: "eee80320-cfef-430b-aab7-5f95ad52d9ef", nombre: "Aceptación de donación" },
  boleto_compraventa:     { id: "70cc60b5-e77e-4867-b151-4e75ee68ef08", nombre: "Boleto de compraventa" },
  hipoteca_cancelacion:   { id: "5ce9c3d4-b4df-4a98-9b3e-06a0146c238c", nombre: "Cancelación de hipoteca" },
  cesion_cuotas:          { id: "088e8c5b-d522-4aa7-b11a-8ccca415c917", nombre: "Cesión de cuotas sociales" },
  compraventa_lote:       { id: "f5a9e19d-7e13-4c43-8933-9196a839ceac", nombre: "Compraventa de lote" },
  compraventa_rural:      { id: "fda809dd-cbb8-485d-84a9-8d79ea76c5f8", nombre: "Compraventa inmueble rural" },
  compraventa_urbana:     { id: "449e5acf-5484-4891-8b77-07ddddd90a2e", nombre: "Compraventa inmueble urbano" },
  compraventa_ph:         { id: "44be6a84-4f37-495a-9e95-180298069c3c", nombre: "Compraventa propiedad horizontal" },
  hipoteca_constitucion:  { id: "ee6a082c-ee20-4c54-9bd6-2d2b605f1737", nombre: "Constitución de hipoteca" },
  servidumbre:            { id: "6331e40e-74e5-4c79-84c6-7ff19e19dbab", nombre: "Constitución de servidumbre" },
  usufructo_constitucion: { id: "b492d973-2dfe-4e2f-a9f9-68ed73313a44", nombre: "Constitución de usufructo" },
  locacion_comercial:     { id: "fa2f8dc2-5f1d-4589-acaa-5fb3a8956c8f", nombre: "Contrato de locación comercial" },
  locacion_inmueble:      { id: "11dfbf54-1337-47cb-9664-fb5b926a818a", nombre: "Contrato de locación de inmueble" },
  contrato_srl:           { id: "8e4f6649-1428-4df4-8e89-388d4bc85ad5", nombre: "Contrato de S.R.L." },
  convenio_division:      { id: "6e8588fb-d3f5-4a85-9985-9c49d268f1a4", nombre: "Convenio de división de condominio" },
  superficie:             { id: "269a4939-a6d1-4649-9c78-539fca6bf8d0", nombre: "Derecho de superficie" },
  donacion_hijo:          { id: "8a21fc6a-8aff-4912-ab04-88de17ef30b6", nombre: "Donación a hijo con imputación" },
  donacion_reserva_uso:   { id: "11693a0a-c479-4ebc-a1c6-d33559cdcef0", nombre: "Donación con reserva de usufructo" },
  donacion_inmueble:      { id: "aa4ac498-344d-4235-8a03-12ce0230e4bc", nombre: "Donación de inmueble" },
  estatuto_sa:            { id: "6db53aa4-2f49-4fd2-86cb-44cd22374699", nombre: "Estatuto de S.A." },
  estatuto_sas:           { id: "e52441d9-ae22-446a-a5bf-4537a6bce8b4", nombre: "Estatuto de S.A.S." },
  mutuo_hipotecario:      { id: "91cb7771-43f3-4b81-ac1b-83bf3ba9c915", nombre: "Mutuo hipotecario" },
  mutuo_simple:           { id: "e2ceb656-67bf-4892-9fb8-ab4d7e5000c6", nombre: "Mutuo simple" },
  particion_herencia:     { id: "83268587-7b51-4b6a-935c-2b634dee7513", nombre: "Partición de herencia" },
  prenda_con_registro:    { id: "c14a5ae0-f4c0-44d4-88d9-5c46d762983c", nombre: "Prenda con registro" },
  reconocimiento_deuda:   { id: "1a3ad6e3-ecb9-4776-961d-f560f8fe481f", nombre: "Reconocimiento de deuda" },
  aumento_capital:        { id: "d7039c33-eab8-4adb-8b5e-acc8bf0affa4", nombre: "Reforma de estatuto — aumento de capital" },
  poder_administracion:   { id: "f2daee86-3342-4e33-ab78-6fed407dabd4", nombre: "Poder de administración" },
  poder_especial:         { id: "3620a796-69e8-4d67-b1d1-465b1bb3e130", nombre: "Poder especial" },
  poder_general:          { id: "478a6523-32e9-40a0-bb31-eeba9bc1a9b6", nombre: "Poder general" },
  poder_irrevocable:      { id: "9c884bc7-392c-41c9-aae5-f60229385f6e", nombre: "Poder irrevocable" },
  revocacion_poder:       { id: "0fd875a8-3c3a-4f05-9ac3-d0b39325f96c", nombre: "Revocación de poder" },
  cesion_herencia:        { id: "b77f1dd3-8f05-49e9-a0aa-14f873c5a107", nombre: "Cesión de derechos hereditarios" },
  declaratoria_herederos: { id: "fccd0b8a-921c-46cd-877b-859b86038350", nombre: "Declaratoria de herederos" },
  aprobacion_testamento:  { id: "abb1bf1c-9c5c-4f25-94d7-9e9df432292c", nombre: "Protocolización de testamento" },
  renuncia_herencia:      { id: "3b6cc58c-ec22-456f-af65-dccd41be465e", nombre: "Renuncia a la herencia" },
  copia_simple:           { id: "8d76cff8-e5db-4963-8806-17b873cd6c05", nombre: "Copia simple" },
  primer_testimonio:      { id: "8395a96d-1995-426e-8080-40a4f64eaafd", nombre: "Primer testimonio" },
  testimonio_posterior:   { id: "4e786137-9cf9-42cd-b1c0-736d8c917ecd", nombre: "Testimonios posteriores" },
};

const DB_TOOLS = [
  {
    name: "buscar_personas",
    description: "Busca personas en el directorio del registro notarial. Usá esta herramienta para obtener datos completos de un requirente (nombre, DNI, CUIT, domicilio, estado civil, representaciones) antes de generar un instrumento o cuando el escribano pregunta por alguien.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre o apellido a buscar (búsqueda parcial, case-insensitive)" },
        nro_doc: { type: "string", description: "Número de DNI o documento exacto" },
      },
    },
  },
  {
    name: "buscar_documentos",
    description: "Busca documentos en el protocolo del registro. Usá esta herramienta para responder preguntas sobre actos anteriores, estadísticas, o verificar si existe un documento específico.",
    input_schema: {
      type: "object",
      properties: {
        tipo_acto: { type: "string", description: "Slug del tipo de acto (ej: compraventa_urbana, poder_especial)" },
        estado:    { type: "string", description: "Estado del documento: borrador, revision, o completo" },
        titulo:    { type: "string", description: "Texto a buscar en el título del documento" },
      },
    },
  },
];

const ABRIR_EDITOR_TOOL = [{
  name: "abrir_editor",
  description: "Abre el editor notarial con el template del instrumento indicado. Usá esta herramienta cuando el escribano pide crear, abrir o trabajar en un tipo específico de instrumento — por ejemplo 'quiero hacer una compraventa', 'abrí una certificación de firma', 'necesito un poder especial'.",
  input_schema: {
    type: "object",
    properties: {
      slug: {
        type: "string",
        description: "El slug exacto del template. Slugs disponibles: " + Object.keys(TEMPLATES_MAP).join(", "),
      },
      mensaje: {
        type: "string",
        description: "Mensaje breve y directo para mostrar al escribano antes de abrir el editor (ej: 'Perfecto, te abro la certificación de firma.')",
      },
    },
    required: ["slug", "mensaje"],
  },
}];

const SYSTEM_PROMPT = `Sos Scriba, el asistente de IA especializado en derecho notarial argentino, con conocimiento profundo de la normativa de la provincia de Mendoza.

## Tu rol
Asistís a escribanos y escribanas en su trabajo diario: redacción de instrumentos, consultas normativas, revisión de documentos y resolución de dudas jurídicas. Sos preciso, conciso y siempre citás la fuente legal exacta (artículo, ley, decreto).

## Principios fundamentales
- El escribano/la escribana SIEMPRE decide. Vos informás, no decidís.
- Ante la menor duda, remití al Colegio de Escribanos de Mendoza o al criterio profesional del notario.
- No ejercés la abogacía ni dás asesoramiento legal a los requirentes. Tu interlocutor es el escribano.
- Citá siempre el artículo y la norma específica.

## Normativa que manejás

### Nacional — Código Civil y Comercial (CCyC)
- Arts. 289-312: instrumentos públicos y escrituras públicas
- Art. 299: requisitos de la escritura pública
- Art. 305: contenido obligatorio
- Art. 310: protocolo notarial
- Arts. 1017-1018: actos que requieren escritura pública
- Art. 2277 y ss.: sucesiones
- Art. 380: poder irrevocable
- Arts. 2114-2153: derecho de superficie
- Arts. 2129-2153: usufructo, uso, habitación
- Arts. 2162-2172: servidumbres

### Nacional — Registral y Societaria
- Ley 17.801: Registro de la Propiedad Inmueble (inscripción, tracto sucesivo, prioridad)
- Ley 19.550: Sociedades Comerciales
- Ley 27.349: Sociedad por Acciones Simplificada (SAS)

### Nacional — Tributaria y Fiscal
- ITI (Impuesto a la Transferencia de Inmuebles): DEROGADO por Ley 27.743, julio 2024. El escribano ya NO retiene.
- COTI: DEROGADO desde 01/06/2025 (RG AFIP 5698/2025)
- CITI Escribanos: DEROGADO desde 01/06/2025 (RG AFIP 5698/2025)
- Impuesto de sellos nacional: Ley 24.977 y modificatorias

### Nacional — Prevención lavado de dinero
- UIF Resolución 242/2023 (vigente desde marzo 2024): escribanos como sujetos obligados
  - Debida diligencia de clientes (DDC)
  - Reporte de operaciones sospechosas (ROS)
  - Umbral de identificación: USD 15.000 o equivalente
  - Personas Expuestas Políticamente (PEP): umbral menor
  - Conservación de documentación: 10 años

### Mendoza — Notarial
- Ley 3058 (Ley Notarial Mendoza), modificada por Ley 9511/2024
  - Arts. 1-30: organización del Colegio
  - Arts. 31-60: habilitación y ejercicio profesional
  - Arts. 61-100: protocolo, foliatura, índices
  - Libro de requerimientos para certificaciones de firmas
- Ley 8236: Registro de la Propiedad de Mendoza (por circunscripciones judiciales: 1ª a 4ª)

### Mendoza — Registro de la Propiedad
- 4 circunscripciones judiciales:
  - 1ª: Capital, Godoy Cruz, Guaymallén, Las Heras, Lavalle, Maipú, Luján de Cuyo
  - 2ª: San Martín, Junín, Rivadavia, Santa Rosa, La Paz
  - 3ª: Tunuyán, Tupungato, San Carlos
  - 4ª: San Rafael, General Alvear, Malargüe

### Mendoza — Agua y Zonas Especiales
- Ley de Aguas 1884/322: los derechos de riego son INSEPARABLES de la tierra. En toda compraventa de inmueble rural con agua, los derechos de riego se transfieren con el fundo salvo pacto en contrario EXPLÍCITO. Es normativa única en Argentina.
- DL 15385/44 + Decreto 253/2018: Zonas de Seguridad de Fronteras. Mendoza limita con Chile → restricciones para adquisición de inmuebles por extranjeros no residentes y personas jurídicas extranjeras. SIEMPRE verificar si el inmueble está en zona de frontera y consultar al Colegio ante cualquier duda.

### Mendoza — Viviendas IPV y DPJ
- Ley 9378/2022: viviendas IPV (Instituto Provincial de Vivienda) — restricciones de transferencia: plazo de inhabilitación de 10 años desde la escritura original. Verificar en cada caso.
- Ley 9577/2024: nueva Ley DPJ Mendoza. Los escribanos tienen función de pre-calificación de personas jurídicas antes de la inscripción.

### Mendoza — Impuesto de Sellos
- Ley 3799 (texto ordenado) y modificatorias
- Alícuota 2025: 1,25% sobre el valor del acto (plan de reducción gradual a 0% en 2030)
- Exenciones: vivienda única, actos entre cónyuges, donaciones a ascendientes/descendientes (verificar vigencia)
- Base imponible: mayor entre valuación fiscal y precio de venta

## Cómo respondés
1. Respondé directamente la pregunta
2. Citá las normas aplicables (art. X, Ley Y)
3. Si hay particularidades mendocinas, destacalas
4. Si algo está en transición normativa o es discutible, decilo
5. Terminá con una nota práctica si corresponde
6. Si la consulta requiere verificación en el Colegio o con un abogado especialista, decilo claramente

## Generación de instrumentos notariales

Además de responder consultas, podés generar borradores completos de instrumentos notariales mendocinos cuando el escribano lo pida.

### Actos que podés redactar
- Escritura de compraventa de inmueble (urbano / rural con agua / zona de frontera)
- Escritura de donación (entre particulares, a ascendientes/descendientes)
- Escritura de permuta
- Escritura de constitución de hipoteca
- Poder general / poder especial / poder irrevocable (art. 380 CCyC)
- Cesión de derechos (créditos, cuotas societarias, derechos hereditarios)
- Constitución de sociedad (SRL, SA, SAS — Ley 27.349)
- Acta notarial de constatación de estado
- Acta de requerimiento para certificación de firmas
- Declaratoria de herederos (trámite protocolar)
- Rectificación de escritura

### Cómo procedés cuando te piden generar un instrumento
1. Si el escribano NO te dio los datos necesarios, preguntá puntualmente por cada dato faltante antes de generar. No inventes datos.
2. Con todos los datos, generá el borrador completo con cláusulas estándar mendocinas.
3. Marcá con **[COMPLETAR: descripción]** cada campo que el escribano deba completar o verificar.
4. Aplicá siempre la normativa mendocina específica (agua, zona de frontera, sellos, circunscripción registral).
5. Al final de cada borrador, incluí una sección **"Checklist pre-autorización"** con los requisitos registrales, fiscales y de prevención de lavado aplicables al acto.
6. Aclará siempre que es un borrador de trabajo sujeto a revisión profesional.

### Estructura de una escritura mendocina (orden estándar)
1. **Encabezamiento**: ciudad, fecha completa, escribano, registro Nº, circunscripción
2. **Comparecientes**: nombre completo, DNI, CUIL, estado civil, domicilio (art. 305 CCyC)
3. **Acreditación**: documento presentado, personería si corresponde
4. **Declaración de capacidad**: que los comparecientes tienen capacidad para el acto
5. **Cuerpo del acto**: objeto, declaraciones, precio/causa, modalidades
6. **Cláusulas especiales**: según el tipo de acto (garantías, condiciones, cargas)
7. **Situación fiscal y registral**: informe de dominio, inhibiciones, valuación fiscal, CUIT vendedor/comprador
8. **Impuesto de sellos**: mención de alícuota, base imponible, exenciones si aplican
9. **UIF**: declaración de origen de fondos si supera umbral USD 15.000
10. **Cierre**: leída la escritura, conformidad, firma de comparecientes y autorizante

### Datos mínimos por tipo de acto
**Compraventa**: partes (completas), inmueble (matrícula, partida, superficie, ubicación), precio, forma de pago, estado de ocupación, gravámenes, valuación fiscal, circunscripción registral.
**Poder**: poderdante, apoderado, objeto del poder (actos autorizados), si es irrevocable indicar causa y plazo.
**Hipoteca**: deudor, acreedor, monto, tasa, plazo, cuotas, inmueble garantizado, rango hipotecario.
**Donación**: donante, donatario, objeto, si hay cargo o condición, relación de parentesco (para exención de sellos).
**SAS**: socios, denominación, objeto, capital, domicilio, órgano de administración, plazo.

## Tono
Profesional, directo, colega. No solemne. Hablás de igual a igual con el escribano.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { mensaje, mensajes_anteriores = [], contexto = null, registroId = null } = req.body;

  if (!mensaje?.trim()) {
    return res.status(400).json({ error: "Mensaje requerido" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key no configurada" });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const contextoNote = contexto
    ? `\n\n[DOCUMENTO ACTIVO EN EL EDITOR]\nTipo de acto: ${contexto.tipoActo}\nPartes: ${contexto.partes || "no especificadas"}\nFecha del acto: ${contexto.fecha}\nEstado: ${contexto.estado}\nEl escribano está trabajando en este documento ahora mismo. Podés referenciarlo en tus respuestas cuando sea relevante.`
    : "";

  const tools = [...DB_TOOLS, ...ABRIR_EDITOR_TOOL];
  let messages = [
    ...mensajes_anteriores.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: mensaje },
  ];

  async function ejecutarTool(name, input) {
    if (name === "buscar_personas") {
      function buildPersonasQuery(withRegistro) {
        let q = sb.from("personas")
          .select("apellido, nombre, tipo_doc, nro_doc, cuit, fecha_nac, estado_civil, nacionalidad, calle, numero, piso, dpto, localidad, departamento, representaciones")
          .limit(8);
        if (withRegistro && registroId) q = q.eq("registro_id", String(registroId));
        if (input.nro_doc) {
          const digits = input.nro_doc.replace(/\D/g, "");
          q = q.ilike("nro_doc", `%${digits}%`);
        } else if (input.nombre) {
          const partes = input.nombre.trim().split(/\s+/);
          const conds = partes.flatMap(p => [`apellido.ilike.%${p}%`, `nombre.ilike.%${p}%`]).join(",");
          q = q.or(conds);
        }
        return q;
      }

      const { data, error } = await buildPersonasQuery(true);
      if (error) return { error: error.message, _debug: { registroId, input } };
      if (data?.length > 0) return { total: data.length, personas: data };

      // fallback sin filtro de registro (para debug y robustez)
      const { data: d2, error: e2 } = await buildPersonasQuery(false);
      if (e2) return { error: e2.message, _debug: { registroId, input } };
      return {
        total: d2?.length || 0,
        personas: d2 || [],
        _debug: { nota: registroId ? `sin resultados con registro_id=${registroId}, reintentado sin filtro` : "sin filtro de registro", registroId, input },
      };
    }
    if (name === "buscar_documentos") {
      let q = sb.from("documentos")
        .select("titulo, tipo_acto, estado, created_at, partes")
        .order("updated_at", { ascending: false })
        .limit(10);
      if (registroId) q = q.eq("registro_id", registroId);
      if (input.tipo_acto) q = q.eq("tipo_acto", input.tipo_acto);
      if (input.estado)    q = q.eq("estado", input.estado);
      if (input.titulo)    q = q.ilike("titulo", `%${input.titulo}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { total: data?.length || 0, documentos: data || [] };
    }
    return { error: "Herramienta desconocida" };
  }

  try {
    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT + contextoNote,
        tools,
        messages,
      });

      if (response.stop_reason === "end_turn") {
        const text = response.content.find(c => c.type === "text");
        return res.status(200).json({ respuesta: text?.text || "" });
      }

      if (response.stop_reason === "tool_use") {
        const toolUses = response.content.filter(c => c.type === "tool_use");

        const abrirEditor = toolUses.find(t => t.name === "abrir_editor");
        if (abrirEditor) {
          const { slug, mensaje: msg } = abrirEditor.input;
          const template = TEMPLATES_MAP[slug];
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "abrir_editor", slug, templateId: template?.id || null, nombre: template?.nombre || slug },
          });
        }

        const toolResults = await Promise.all(
          toolUses.map(async t => ({
            type: "tool_result",
            tool_use_id: t.id,
            content: JSON.stringify(await ejecutarTool(t.name, t.input)),
          }))
        );

        messages = [
          ...messages,
          { role: "assistant", content: response.content },
          { role: "user",      content: toolResults },
        ];
        continue;
      }

      const text = response.content.find(c => c.type === "text");
      return res.status(200).json({ respuesta: text?.text || "" });
    }

    return res.status(200).json({ respuesta: "No pude completar la consulta. Intentá de nuevo." });
  } catch (e) {
    console.error("Scriba error:", e);
    return res.status(500).json({ error: e.message });
  }
}
