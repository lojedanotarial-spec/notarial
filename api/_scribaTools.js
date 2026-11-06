// Definiciones de las herramientas (tools) que Scriba puede usar. Son estáticas: se declaran una vez al
// cargar el módulo (antes se re-creaban dentro del handler en cada request).

export const TEMPLATES_MAP = {
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

export const DB_TOOLS = [
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
  {
    name: "leer_documento",
    description: "Recupera el CONTENIDO COMPLETO de un documento/acto ya redactado y guardado en el protocolo (no un archivo subido por el escribano). Usala DESPUÉS de llamar a buscar_documentos y de que el escribano confirme cuál documento específico quiere usar como referencia o comparación. No la llames especulativamente sobre un resultado sin confirmar, salvo que solo haya un resultado inequívoco o el escribano haya dado el id exacto.",
    input_schema: {
      type: "object",
      properties: {
        documento_id: { type: "string", description: "El id (uuid) exacto del documento, tal como viene en los resultados de buscar_documentos." },
      },
      required: ["documento_id"],
    },
  },
  {
    name: "leer_template_base",
    description: "Recupera el CONTENIDO EN BLANCO (con {{VARIABLES}} sin sustituir) de uno de los templates fijos del sistema, para comparar su estructura de cláusulas contra un documento de referencia o lo que pide el escribano — ANTES de decidir redactar algo desde cero. Distinta de 'leer_documento': esta lee una plantilla vacía del sistema, no un acto ya redactado.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug exacto del template, uno de los listados en 'abrir_editor'." },
      },
      required: ["slug"],
    },
  },
];

export const ABRIR_EDITOR_TOOL = [{
  name: "abrir_editor",
  description: "Abre el editor notarial con el template del instrumento indicado. Usá esta herramienta cuando el escribano pide crear, abrir o trabajar en un tipo específico de instrumento. Si mencionó personas, buscalas primero con buscar_personas para tener los datos completos y pasarlas en 'partes'.",
  input_schema: {
    type: "object",
    properties: {
      slug: {
        type: "string",
        description: "El slug exacto del template. Slugs disponibles: " + Object.keys(TEMPLATES_MAP).join(", "),
      },
      mensaje: {
        type: "string",
        description: "Mensaje breve y directo para mostrar al escribano antes de abrir el editor.",
      },
      partes: {
        type: "array",
        description: "Personas a pre-cargar como partes del acto. Usar los objetos devueltos por buscar_personas tal como vienen, agregando el campo 'rol' si se sabe (ej: 'requirente', 'vendedor', 'comprador', 'poderdante', 'apoderado', 'donante', 'donatario').",
        items: {
          type: "object",
          properties: {
            apellido:    { type: "string" },
            nombre:      { type: "string" },
            genero:      { type: "string", description: "M o F" },
            tipo_doc:    { type: "string", description: "DNI, LC, LE, PAS, etc." },
            nro_doc:     { type: "string" },
            cuit:        { type: "string" },
            fecha_nac:   { type: "string" },
            estado_civil:{ type: "string" },
            nacionalidad:{ type: "string" },
            calle:       { type: "string" },
            numero:      { type: "string" },
            piso:        { type: "string" },
            dpto:        { type: "string" },
            localidad:   { type: "string" },
            departamento:{ type: "string" },
            rol:         { type: "string", description: "Rol en el acto" },
          },
        },
      },
      fecha: {
        type: "object",
        description: "Fecha del acto. Si no se especificó, omitir (se usa la fecha de hoy).",
        properties: {
          dia:    { type: "number" },
          mes:    { type: "number", description: "0=enero, 11=diciembre" },
          anio:   { type: "number" },
          ciudad: { type: "string" },
        },
      },
    },
    required: ["slug", "mensaje"],
  },
}];

export const CREAR_DOCUMENTO_LIBRE_TOOL = [{
  name: "crear_documento_libre",
  description: "Abre el editor con un documento redactado desde cero por vos (no un template fijo del sistema), cuando ya confirmaste con 'leer_template_base'/'buscar_documentos'/'leer_documento' que ningún template ni precedente cubre adecuadamente el caso. El cuerpo debe llevar {{VARIABLES}} (reutilizando los nombres estándar del sistema donde aplique) y marcadores de formato como el resto de los templates.",
  input_schema: {
    type: "object",
    properties: {
      contenido: {
        type: "string",
        description: "Cuerpo completo del documento, con {{VARIABLES}} y marcadores **negrita**/__subrayado__/~~dato ingresado por el usuario~~. Un salto de línea por párrafo.",
      },
      campos_libres: {
        type: "array",
        description: "Campos propios de este documento (no partes, no vars estándar) que deben aparecer editables en el panel de Propiedades del acto — ej: precio, seña, plazo. Mismo shape que 'variables_json' de los templates fijos.",
        items: {
          type: "object",
          properties: {
            name:        { type: "string", description: "Nombre EXACTO de la {{VARIABLE}} usada en el contenido, en MAYÚSCULAS_CON_GUION_BAJO. Nunca empezar con PARTE_, ESCRIBANO_, FECHA_, PROTOCOLO_, INSTRUMENTO o VEHICULO_." },
            label:       { type: "string", description: "Etiqueta legible para mostrar en el panel." },
            type:        { type: "string", description: "'texto' (default) o 'texto_largo' para textarea. No usar 'seleccion' todavía." },
            placeholder: { type: "string" },
            required:    { type: "boolean" },
          },
          required: ["name", "label"],
        },
      },
      mensaje: {
        type: "string",
        description: "Mensaje breve para mostrar al escribano antes de abrir el editor, aclarando que es un borrador libre (no un template del sistema).",
      },
      partes: {
        type: "array",
        description: "Personas a pre-cargar como partes del acto, mismo shape que en 'abrir_editor'.",
        items: {
          type: "object",
          properties: {
            apellido:    { type: "string" },
            nombre:      { type: "string" },
            genero:      { type: "string", description: "M o F" },
            tipo_doc:    { type: "string", description: "DNI, LC, LE, PAS, etc." },
            nro_doc:     { type: "string" },
            cuit:        { type: "string" },
            fecha_nac:   { type: "string" },
            estado_civil:{ type: "string" },
            nacionalidad:{ type: "string" },
            calle:       { type: "string" },
            numero:      { type: "string" },
            piso:        { type: "string" },
            dpto:        { type: "string" },
            localidad:   { type: "string" },
            departamento:{ type: "string" },
            rol:         { type: "string", description: "Rol en el acto" },
          },
        },
      },
      fecha: {
        type: "object",
        description: "Fecha del acto. Si no se especificó, omitir (se usa la fecha de hoy).",
        properties: {
          dia:    { type: "number" },
          mes:    { type: "number", description: "0=enero, 11=diciembre" },
          anio:   { type: "number" },
          ciudad: { type: "string" },
        },
      },
    },
    required: ["contenido", "mensaje"],
  },
}];


export const INSERTAR_TOOL = [{
  name: "insertar_en_documento",
  description: "Insertá texto en el documento notarial abierto en el editor. Usá esta herramienta cuando el escribano pide agregar, completar o insertar algo en el documento activo. El texto debe ser limpio, sin markdown, listo para aparecer en el documento.",
  input_schema: {
    type: "object",
    properties: {
      texto: {
        type: "string",
        description: "Texto exacto a insertar en el documento. Sin markdown, sin comillas, sin explicaciones. Solo el contenido notarial.",
      },
      mensaje: {
        type: "string",
        description: "Confirmación breve para mostrar al escribano (ej: 'Listo, insertá el cierre al final del documento.')",
      },
    },
    required: ["texto", "mensaje"],
  },
}];

export const MODIFICAR_TOOL = [{
  name: "modificar_documento",
  description: "Modifica el contenido del documento notarial activo en el editor. Usá esta herramienta cuando el escribano pide cambiar, agregar, reescribir o completar partes del documento. Devolvé el texto COMPLETO del documento con las modificaciones aplicadas. CRÍTICO: mantené todas las {{VARIABLES}} exactamente como estaban (ej: {{PARTE_1_IDENTIDAD}}, {{FECHA_DIA_LETRAS}}, etc.). No las reemplaces con valores reales.",
  input_schema: {
    type: "object",
    properties: {
      contenido: {
        type: "string",
        description: "Texto completo del documento modificado. Párrafos separados por salto de línea. Las {{VARIABLES}} deben quedar intactas.",
      },
      mensaje: {
        type: "string",
        description: "Explicación breve de qué modificaste.",
      },
    },
    required: ["contenido", "mensaje"],
  },
}];

export const COMPLETAR_PARTE_TOOL = [{
  name: "completar_parte",
  description: "Usá esta herramienta cuando leés un documento de identidad, civil o cualquier documento que contenga datos de una persona. Devolvé los datos extraídos para que el escribano pueda agregarlos como parte en el editor.",
  input_schema: {
    type: "object",
    properties: {
      datos: {
        type: "object",
        description: "Datos extraídos del documento",
        properties: {
          apellido:     { type: "string" },
          nombre:       { type: "string" },
          nro_doc:      { type: "string", description: "Solo números, sin puntos ni guiones" },
          tipo_doc:     { type: "string", description: "DNI, LE, LC, Pasaporte" },
          genero:       { type: "string", description: "M o F" },
          fecha_nac:    { type: "string", description: "dd/mm/aaaa" },
          estado_civil: { type: "string" },
          nacionalidad: { type: "string" },
          cuit:         { type: "string" },
          calle:        { type: "string" },
          numero:       { type: "string" },
          piso:         { type: "string" },
          dpto:         { type: "string" },
          localidad:    { type: "string" },
          departamento: { type: "string", description: "Departamento de Mendoza si aplica" },
        },
      },
      parte_index: {
        type: "integer",
        description: "Posición 0-based donde insertar esta parte. 0 = PARTE_1 (autorizante, vendedor, poderdante...), 1 = PARTE_2 (autorizado, comprador, apoderado...). Usá este campo cuando el usuario especifica explícitamente el rol o posición de la persona (ej: 'es el autorizado', 'va como PARTE_2', 'es la compradora'). Omitir si no se especifica posición."
      },
      mensaje: { type: "string", description: "Resumen breve de lo que encontraste o hiciste" },
    },
    required: ["datos", "mensaje"],
  },
}];

export const COMPLETAR_VEHICULO_TOOL = [{
  name: "completar_vehiculo",
  description: "Usá esta herramienta con los datos que te devolvió 'extraer_documento' cuando identificó una tarjeta verde o título automotor (frente, dorso, o ambos ya fusionados). No la llames más de una vez para el mismo vehículo.",
  input_schema: {
    type: "object",
    properties: {
      vehiculo: {
        type: "object",
        description: "Datos del vehículo extraídos del documento",
        properties: {
          marca:     { type: "string" },
          modelo:    { type: "string" },
          tipo_desc: { type: "string", description: "Tipo de vehículo, ej: AUTOMOVIL, MOTOVEHICULO" },
          dominio:   { type: "string" },
          chasis:    { type: "string" },
          motor:     { type: "string" },
        },
      },
      titular: {
        type: "object",
        description: "Datos del titular si figuran en el documento (normalmente en el dorso)",
        properties: {
          apellido:     { type: "string" },
          nombre:       { type: "string" },
          nro_doc:      { type: "string" },
          tipo_doc:     { type: "string" },
          genero:       { type: "string" },
          fecha_nac:    { type: "string" },
        },
      },
      mensaje: { type: "string", description: "Resumen breve de lo que encontraste" },
    },
    required: ["vehiculo", "mensaje"],
  },
}];

export const EXTRAER_DOCUMENTO_TOOL = [{
  name: "extraer_documento",
  description: "Analiza uno o más archivos adjuntos de este mensaje con un extractor especializado (más preciso que tu propia lectura) para documentos de identidad (DNI en cualquier formato — libreta vieja, tarjeta, o digital de la app Mi Argentina — pasaporte, licencia, partidas) y de vehículos (tarjeta verde o título automotor, física o digital). Usala SIEMPRE que un archivo adjunto parezca ser uno de estos tipos, en vez de leerlo vos mismo. Si el escribano adjuntó frente y dorso del MISMO documento en 2 fotos, pasá ambos índices juntos en una sola llamada para que se analicen juntos y no se dupliquen como personas distintas. NO la uses para PDFs o fotos que sean claramente otra cosa (boletos, contratos, planos, tickets, recibos) — esos podés leerlos vos directamente.",
  input_schema: {
    type: "object",
    properties: {
      indices: {
        type: "array",
        items: { type: "integer" },
        description: "Índices (0-based) de los archivos adjuntos a analizar, según el orden [Adjunto N] indicado en el mensaje. Incluí varios índices juntos si son caras del mismo documento.",
      },
    },
    required: ["indices"],
  },
}];

export const VALIDAR_CUIT_TOOL = [{
  name: "validar_cuit",
  description: "Verifica matemáticamente si un CUIT/CUIL es válido (dígito verificador correcto según el algoritmo oficial de ARCA). Usala SIEMPRE que necesites confirmar un CUIT/CUIL leído de un documento o dictado por el escribano — nunca calcules ni juzgues un CUIT 'a ojo' o por el prefijo, el cálculo mental de este algoritmo es propenso a error. No confirma que el CUIT le pertenezca a esa persona ni que esté activo, solo que el número es matemáticamente consistente.",
  input_schema: {
    type: "object",
    properties: {
      cuit: { type: "string", description: "El CUIT/CUIL a verificar, con o sin guiones (ej: '23-10907305-9' o '23109073059')." },
    },
    required: ["cuit"],
  },
}];

export const VALIDAR_LIMITES_INMUEBLE_TOOL = [{
  name: "validar_limites_inmueble",
  description: "Verifica que la descripción de límites y medidas perimetrales de un inmueble esté completa y sea internamente coherente (mínimo 3 lados, todos los campos completos, distancias numéricas válidas). NO valida cierre geométrico/trigonométrico exacto — esta descripción es de referencia legible con rumbos cardinales, la precisión de mensura real la da el plano del agrimensor citado aparte. Usala antes de confirmar la descripción de límites de un inmueble con varios lados.",
  input_schema: {
    type: "object",
    properties: {
      lados: {
        type: "array",
        description: "Cada lado del perímetro (medidas + ochavas), en el orden en que fueron descriptos.",
        items: {
          type: "object",
          properties: {
            rumbo:   { type: "string", description: "Orientación o descripción del lado (ej: Norte, Sur, ochava)." },
            metros:  { type: "number", description: "Longitud del lado en metros." },
            lindero: { type: "string", description: "Con quién/qué linda ese lado." },
          },
          required: ["metros"],
        },
      },
    },
    required: ["lados"],
  },
}];

export const CALCULAR_EDAD_TOOL = [{
  name: "calcular_edad",
  description: "Calcula la edad exacta de una persona a una fecha de referencia (por defecto, hoy), y valida que las fechas dadas sean fechas de calendario reales (ej: rechaza 31/02). Usala siempre que la edad o minoridad de una parte sea relevante para el acto — nunca calcules edad a mano ni asumas mayoría de edad sin verificar.",
  input_schema: {
    type: "object",
    properties: {
      fecha_nacimiento: { type: "string", description: "Fecha de nacimiento, formato dd/mm/aaaa." },
      fecha_referencia: { type: "string", description: "Fecha contra la que calcular la edad, formato dd/mm/aaaa. Si se omite, se usa la fecha actual del sistema." },
    },
    required: ["fecha_nacimiento"],
  },
}];

export const COMPLETAR_EXTRAVARS_TOOL = [{
  name: "completar_extravars",
  description: "Completa campos específicos del template activo que NO son datos de partes ni texto libre del cuerpo — cosas como precio, seña, saldo, plazo de escritura, cláusulas especiales, quién designa al escribano, etc. Usá SOLO los nombres de variable listados en '[CAMPOS DEL TEMPLATE]' del contexto activo — si un campo que el escribano menciona no está en esa lista, no existe para este template, no lo inventes. NUNCA uses modificar_documento para esto.",
  input_schema: {
    type: "object",
    properties: {
      valores: {
        type: "object",
        description: "Mapa variable -> valor. Las claves deben ser EXACTAMENTE los nombres listados en '[CAMPOS DEL TEMPLATE]' (ej: PRECIO_NUMEROS, PLAZO_ESCRITURACION). El valor va como texto ya formateado para aparecer en el documento.",
      },
      mensaje: { type: "string", description: "Resumen breve de qué campos completaste" },
    },
    required: ["valores", "mensaje"],
  },
}];

export const GESTIONAR_CLAUSULAS_TOOL = [{
  name: "gestionar_clausulas",
  description: "Activa o desactiva cláusulas opcionales predefinidas del template activo (ej: asentimiento conyugal, declaración UIF reforzada). Usá SOLO los slugs listados en '[CLÁUSULAS DISPONIBLES]' del contexto activo — si el escribano pide una cláusula que no está en esa lista, no existe para este template, no la inventes ni la redactes vos. Las cláusulas activadas se agregan al final del cuerpo del documento, numeradas a continuación de las existentes.",
  input_schema: {
    type: "object",
    properties: {
      activar: { type: "array", items: { type: "string" }, description: "Slugs de cláusulas a activar (ej: ['asentimiento_conyugal'])." },
      desactivar: { type: "array", items: { type: "string" }, description: "Slugs de cláusulas a desactivar." },
      mensaje: { type: "string", description: "Resumen breve de qué cláusulas activaste/desactivaste" },
    },
    required: ["mensaje"],
  },
}];

export const PEDIR_CAPTURA_TOOL = [{
  name: "pedir_captura_celular",
  description: "Muestra un código QR para que el escribano suba fotos de documentos (DNI, licencia, tarjeta verde, etc.) desde su celular, sacándolas en el momento o eligiéndolas de la galería. Usala cuando diga que quiere pasar, subir o mandar fotos o documentos desde el celular. ANTES de llamarla preguntá SOLO lo que falte para saber qué va a subir (de quién es, de qué tipo); si ya lo dijo, no lo repitas. Si dice que va a pasar 'todo junto', o no queda claro después de preguntar, usá modo 'libre' sin insistir. Después del código no hagas nada más: cuando lleguen las fotos recibís los datos leídos en [FOTOS RECIBIDAS DEL CELULAR].",
  input_schema: {
    type: "object",
    properties: {
      modo: { type: "string", enum: ["libre", "parte", "vehiculos"], description: "'parte' = documentos de UNA persona (frente y dorso); 'vehiculos' = tarjetas/títulos de uno o varios vehículos; 'libre' = mezcla de lo que sea (varias personas, vehículos...)." },
      rol: { type: "string", description: "Solo para modo 'parte': función de esa persona en el acto (ej: COMPRADOR), si ya se sabe." },
      mensaje: { type: "string", description: "Texto breve que se muestra junto al código QR (ej: 'Escaneá este código con tu celular y subí las fotos')." },
    },
    required: ["modo", "mensaje"],
  },
}];

export const DISTRIBUIR_CAPTURA_TOOL = [{
  name: "distribuir_captura",
  description: "Prepara la carga de los datos leídos de las fotos del celular en el documento abierto (partes y vehículos), en UN solo paso que el escribano confirma con el botón 'Aplicar todo'. Usala cuando ya sepas quién es quién (los roles) y qué vehículos van. Los datos vienen numerados en [FOTOS RECIBIDAS DEL CELULAR]: indicá cada uno por su número (indice); NUNCA copies los datos. Si algo es ambiguo (quién es comprador y quién vendedor, de qué vehículo es un dorso) PREGUNTÁ antes; lo inequívoco no lo preguntes. Si devuelve un error, corregí los números y volvé a llamarla.",
  input_schema: {
    type: "object",
    properties: {
      personas: {
        type: "array",
        description: "Personas a cargar como partes del documento.",
        items: {
          type: "object",
          properties: {
            indice: { type: "integer", description: "Número de la persona en [FOTOS RECIBIDAS DEL CELULAR]" },
            rol: { type: "string", description: "Función en el acto, usando los roles del documento abierto (ej: COMPRADOR, VENDEDOR)" },
          },
          required: ["indice", "rol"],
        },
      },
      vehiculos: {
        type: "array",
        description: "Vehículos a cargar.",
        items: { type: "object", properties: { indice: { type: "integer", description: "Número del vehículo en [FOTOS RECIBIDAS DEL CELULAR]" } }, required: ["indice"] },
      },
      mensaje: { type: "string", description: "Resumen breve de cómo distribuiste todo (quién es quién)" },
    },
    required: ["mensaje"],
  },
}];

export const tools = [...DB_TOOLS, ...ABRIR_EDITOR_TOOL, ...CREAR_DOCUMENTO_LIBRE_TOOL, ...INSERTAR_TOOL, ...MODIFICAR_TOOL, ...COMPLETAR_PARTE_TOOL, ...COMPLETAR_VEHICULO_TOOL, ...EXTRAER_DOCUMENTO_TOOL, ...COMPLETAR_EXTRAVARS_TOOL, ...GESTIONAR_CLAUSULAS_TOOL, ...VALIDAR_CUIT_TOOL, ...VALIDAR_LIMITES_INMUEBLE_TOOL, ...CALCULAR_EDAD_TOOL, ...PEDIR_CAPTURA_TOOL, ...DISTRIBUIR_CAPTURA_TOOL];
