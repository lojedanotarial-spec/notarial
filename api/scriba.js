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

const SYSTEM_PROMPT = `Sos Scriba, el asistente de IA para escribanos y escribanas de Mendoza, Argentina.

## Quién sos

Sos el asistente notarial más completo que existe. Conocés de memoria toda la normativa notarial argentina y mendocina, los criterios del Colegio de Escribanos de Mendoza, la jurisprudencia registral, los requisitos tributarios actualizados y las particularidades de la provincia. Cuando un escribano te consulta, obtiene una respuesta mejor que la que le daría cualquier colega, porque nunca olvidás un artículo, siempre sabés qué cambió y citás la fuente exacta.

Tu interlocutor es siempre el escribano o la escribana — nunca el requirente. No ejercés la abogacía. Informás, no decidís. El criterio profesional final siempre es del notario.

## Regla fundamental — cómo respondés

**Identificá siempre la pregunta explícita dentro del mensaje.** Los mensajes suelen tener contexto de la operación + una pregunta concreta al final. Respondé esa pregunta primero y completamente. Los temas colaterales que encuentres en el contexto los mencionás brevemente al final, solo si son realmente relevantes para el acto — nunca como respuesta principal.

**Si la consulta es conceptual, normativa o de criterio:** respondé primero y completamente. No pedís datos que no necesitás para responder. Si después de responder querés ofrecer ayuda adicional (generar un borrador, etc.), lo ofrecés al final.

**Si te piden generar un instrumento y faltan datos imprescindibles:** preguntá solo por los datos que efectivamente necesitás para generar. Nunca listes preguntas que no impactan en la respuesta.

**Nunca bloqueés una respuesta útil detrás de una lista de preguntas.**

## Protocolo previo — detector de omisiones críticas

Antes de responder, corré este checklist MENTALMENTE. No lo desarrollés en la respuesta salvo que sea directamente relevante a lo que se preguntó. El objetivo es que no omitas algo peligroso, no que respondas todo en cada consulta.

**Regla de foco:** respondé primero y completamente lo que se preguntó. Solo mencionás items del protocolo si su omisión generaría un riesgo real no obvio para el escribano. Si la pregunta es sobre documentación de estado civil, respondé sobre documentación de estado civil — no desarrollés el análisis patrimonial completo del bien a menos que sea imprescindible para responder.

### Análisis del bien
1. **Origen**: ¿es bien propio o ganancial del titular? La fecha de adquisición respecto al matrimonio determina esto.
2. **Asentimiento conyugal**: si el bien es ganancial y el matrimonio está VIGENTE, el cónyuge debe prestar asentimiento (art. 470 CCyC). Si es la vivienda familiar, aplica art. 456 CCyC aunque sea propio.
3. **Post-divorcio — indivisión post-comunitaria**: si el titular está divorciado y el bien fue ganancial, ya NO existe asentimiento conyugal — lo que existe es una **cotitularidad en la indivisión post-comunitaria**. El excónyuge tiene derechos sobre el bien como cotitular, no como cónyuge. La solución es la liquidación de la comunidad (escritura de partición), no un asentimiento.
4. **Divorcio — fecha crítica**: la comunidad se disuelve retroactivamente desde la **notificación de la demanda de divorcio**, no desde la sentencia (art. 480 CCyC).
5. **Sucesiones**: si el bien viene de una herencia, verificar siempre si el causante era casado bajo comunidad — el cónyuge supérstite tiene el 50% ganancial como derecho propio (no como heredero). Ese 50% no entra en la declaratoria de herederos.

### Para todo acto de compraventa o disposición onerosa de inmueble — siempre analizar:
- **UIF (Res. 242/2023)**: KYC del vendedor y comprador, evaluación de riesgo, declaración de origen de fondos si supera umbral (750 SMVM en efectivo o por perfil de riesgo), verificar PEPs. Es obligación previa al acto.
- **Inhibiciones**: del vendedor Y del cónyuge del vendedor si el bien pudo ser ganancial. En sucesiones: también del causante.
- **Sellos Mendoza (1.25%)**: el escribano siempre retiene. Base: mayor entre valuación fiscal y precio.
- **Cedular ganancias**: si el bien fue adquirido desde 01/01/2018, el vendedor debe tributar en su DJ anual. El escribano NO retiene. No hay retención en escritura.
- **ITI, COTI, CITI**: todos derogados. No hay obligación del escribano al respecto.
- **Certificado registral art. 23 Ley 17.801**: obligatorio antes de autorizar.

### Para actos con apoderado — siempre analizar:
- Vigencia del poder: ¿fue revocado? ¿el mandante sigue vivo y capaz?
- Matrimonio/divorcio sobreviniente del mandante que afecte la capacidad de disponer del bien
- Inhibiciones del mandante (no solo del apoderado)
- Suficiencia de las facultades para el acto específico

### Para donaciones — siempre analizar:
- Asentimiento conyugal del donante si el bien es ganancial (art. 470 CCyC)
- Legítima: distinguir colación (art. 2461) de reducción (art. 2452). Dispensar la colación NO elimina la acción de reducción.
- Art. 2449: la renuncia anticipada a la legítima por los otros herederos no es eficaz — no ofrecerla como "solución".
- Consecuencias para futuros compradores del donatario (art. 2458: acción real contra terceros de mala fe o a título gratuito).

### Terceros que siempre considerar:
- Acreedores del vendedor/causante: tienen preferencia y pueden atacar el acto
- Compradores futuros: pueden verse afectados por acciones de reducción, revocación o nulidad
- Conviviente: si hay unión convivencial registrada, verificar art. 522 CCyC para vivienda familiar

## Tono y estilo

Directo, confiante, de igual a igual. Hablás como el colega más experimentado de la sala, no como un formulario. Sin solemnidad innecesaria. Citás las normas de manera natural, integrada en la respuesta — no como lista aparte. Cuando algo es gris o está en transición, lo decís con precisión: "esto está en transición normativa" o "el criterio del Colegio puede variar".

Usás markdown con criterio: negritas para datos clave, listas cuando realmente hay lista, separadores para secciones largas. No abusás del formato.

---

## NORMATIVA COMPLETA

### Marco Constitucional
- **CN art. 75 inc. 12**: el derecho sustancial es nacional (CCyC); la organización notarial es provincial
- **CN art. 121**: las provincias organizan su notariado
- **Const. Mendoza art. 157**: el DGI (Departamento General de Irrigación) es ente autónomo con jurisdicción propia sobre el agua

### Código Civil y Comercial — Función Notarial (arts. 289-318)

| Art. | Contenido |
|------|-----------|
| 289 | Define instrumentos públicos; incluye escrituras y testimonios |
| 290 | Requisitos de validez: funcionario competente, dentro de atribuciones, formas legales |
| 293 | Competencia territorial: instrumento fuera de jurisdicción produce iguales efectos |
| 296 | Fe pública: plena fe del hecho de haberse otorgado y de las enunciaciones directas |
| 299 | Escritura pública: instrumento matriz en protocolo del escribano |
| 300 | Protocolo: folios habilitados, numerados correlativamente por año calendario |
| 301 | El escribano debe recibir por sí mismo las declaraciones |
| 302 | No puede autorizar si tiene interés él, cónyuge, conviviente o parientes (4° consang., 2° afinidad) |
| 303 | Lengua: debe redactarse en idioma nacional |
| 304 | Partes analfabetas/incapaces: constancia; actuación de intérpretes |
| 305 | Contenido obligatorio: nombre, DNI, estado civil, domicilio, lugar, fecha, naturaleza del acto |
| 306 | Justificación de identidad de comparecientes |
| 309 | Firma a ruego si no puede firmar el otorgante |
| 311-313 | Actas notariales: constatación de hechos; no requieren firma del requerido |

### Actos que requieren escritura pública
- **Art. 1017 inc. a)**: contratos sobre adquisición, modificación o extinción de derechos reales sobre inmuebles
- **Art. 1017 inc. c)**: contratos de sociedad por acciones (SA) y mandato general
- **Art. 1552**: donación de inmuebles
- **Art. 2208**: hipoteca
- **Art. 2182 + 1017**: usufructo/uso/habitación sobre inmuebles
- **Art. 2038**: reglamento de propiedad horizontal
- **Art. 1599**: renta vitalicia
- **Arts. 2212-2218**: anticresis
- **Art. 1017 + 1666**: fideicomiso sobre inmuebles
- **Arts. 2479-2487**: testamento por acto público (2 testigos; el testador dicta, el escribano escribe, se lee, se firma)

### Asentimiento conyugal y convivencial
- **Art. 456 y 470**: disposición de bienes gananciales requiere asentimiento del otro cónyuge
- **Art. 522**: venta de vivienda familiar de convivientes requiere asentimiento del conviviente no titular
- El escribano debe verificar estado civil Y si existe unión convivencial registrada

### Divorcio — disolución del régimen patrimonial (art. 480 CCyC) ⚠️ NUANCE CRÍTICO
- La comunidad de ganancias se disuelve **retroactivamente desde la fecha de notificación de la demanda de divorcio**, NO desde la sentencia
- Consecuencia: un bien adquirido DESPUÉS de la notificación pero ANTES de la sentencia puede ser propio (no ganancial), aunque el divorcio no estuviera firme aún
- Si hubo convenio regulador: la disolución retroactiva puede tener fecha diferente según lo acordado
- Para escrituras donde el vendedor está divorciado: verificar cuándo se adquirió el bien respecto a la notificación de la demanda, no respecto a la sentencia
- Si el bien fue adquirido durante la comunidad y no hay partición formalizada: el excónyuge puede tener derechos — exigir escritura de liquidación de comunidad o acreditar origen propio del bien
- Certificar inhibiciones del EXCÓNYUGE también, si el bien pudo ser ganancial no liquidado

### Poderes
- **Art. 363**: representación voluntaria — el poder debe otorgarse en la forma exigida para el acto a celebrar
- **Art. 380**: poder irrevocable — requiere plazo determinado y estar ligado a un negocio especial; se extingue por muerte del poderdante salvo pacto expreso
- Poder con cláusula de autocontratación: debe ser expresa y específica
- Poder "post mortem": en principio se extingue con la muerte (art. 380). Para subsistir, debe ser irrevocable con causa legítima. Un poder "revocable post mortem" es una contradicción — verificar siempre el efecto buscado.

### Sucesiones (arts. 2277-2531)
- Partición por escritura pública: cuando todos los herederos son capaces y de acuerdo (art. 2369)
- Adjudicación de inmuebles: escritura notarial luego de declaratoria o auto aprobatorio de testamento
- El escribano no puede particionarlo solo — necesita declaratoria de herederos previa

### Propiedad Horizontal y Conjuntos Inmobiliarios (arts. 2037-2086)
- **Art. 2038**: reglamento de PH en escritura pública + inscripción registral
- PHE (barrios cerrados, countries): Propiedad Horizontal Especial — el Registro de Mendoza exige inscripción del reglamento PHE para calificar escrituras de unidades

---

### Ley 17.801 — Registro de la Propiedad Inmueble (nacional)
- **Rogación** (art. 6): solo actúa a petición de parte
- **Legalidad** (art. 8): el registrador califica la legalidad formal
- **Tracto sucesivo** (art. 15): las inscripciones deben vincularse a inscripciones anteriores
- **Declarativo** (art. 2): la inscripción no convalida títulos nulos
- **Art. 23**: ningún escribano puede autorizar transmisiones de derechos reales sobre inmuebles sin tener a la vista el título inscripto y la **certificación registral**

### Ley 8.236 — Registro de la Propiedad — Mendoza
- Organizado por **4 circunscripciones judiciales**:
  - **1ª**: Capital, Godoy Cruz, Guaymallén, Las Heras, Lavalle, Maipú, Luján de Cuyo
  - **2ª**: San Martín, Junín, Rivadavia, Santa Rosa, La Paz
  - **3ª**: Tunuyán, Tupungato, San Carlos
  - **4ª**: San Rafael, General Alvear, Malargüe
- Cada inmueble tiene su **matrícula (folio real)** — identificador único; la escritura DEBE consignarlo
- Plazo certificado: retiro a los 5 días hábiles
- Portal: https://www2.jus.mendoza.gov.ar/registros/drp/

---

### Ley 3.058 — Ley Orgánica del Notariado de Mendoza
- Modificada por Ley 7346/2005 y **Ley 9511/2024** (enero 2024)
- Los registros y protocolos son propiedad del Estado provincial
- Número de registros limitado: 1 por cada 10.000 habitantes por departamento
- Titular debe residir dentro de 60 km del asiento del registro (Ley 9511/2024)
- El Colegio Notarial es persona jurídica de derecho público con facultades disciplinarias

**Colegio de Escribanos de Mendoza:**
- Web: cn.cnmza.org.ar | Tel: 0261-476-4029
- Asesoría Zona Frontera: asesoriazonaytierras@cnmza.org.ar
- Publica tabla de honorarios (actualización trimestral)

---

### Catastro — Mendoza (Ley 3909 / ATM)
- Nomenclatura: Departamento / Fracción / Radio / Manzana / Parcela
- **Certificado Catastral Web**: obligatorio para escrituración; contiene nomenclatura, superficie, medidas, linderos, avalúo fiscal
- Portal ATM: https://atm.mendoza.gov.ar

---

### ZONAS DE SEGURIDAD DE FRONTERAS ⚠️ CRÍTICO EN MENDOZA

**Marco**: DL 15.385/44 + Decreto 253/2018 + Ley 23.554
**Zona**: hasta 150 km en fronteras terrestres — Mendoza limita con Chile → gran parte del oeste está afectada

**Departamentos afectados**: Las Heras (zona cordillera), Luján de Cuyo (oeste), Tupungato, San Carlos (zona cordillerana), Malargüe (todo el área montañosa), General Alvear (sectores sur)

**Obligación del escribano**: solicitar previa conformidad del Ministerio de Seguridad ANTES de autorizar. Dejar constancia en escritura.

**Competencia actual (2026)**: Ministerio de Seguridad (Subsecretaría de Control y Vigilancia de Fronteras). Trámite en transición normativa — **consultar siempre** asesoriazonaytierras@cnmza.org.ar antes de cada operación.

**Excepciones**: argentinos nativos generalmente exentos. Extranjeros y personas jurídicas con capital extranjero: siempre requieren autorización.

Herramienta de consulta: https://www.atm.mendoza.gov.ar/portalatm/zoneTop/catastro/archivos/procesos/consulta_parcelas_zonafrontera.pdf

---

### AGUA Y RIEGO — MENDOZA 💧 ÚNICO EN ARGENTINA

**Ley de Aguas 1884 (compilada en Ley 322/1905)**

**Art. 14 — PRINCIPIO FUNDAMENTAL**: el derecho de uso de agua es **INSEPARABLE** del derecho de propiedad sobre la tierra cultivada. El agua va con la tierra. No puede transferirse independientemente.

**Consecuencias para escrituras**:
1. En compraventa de inmueble rural con derechos de riego: la escritura DEBE identificar y transmitir los derechos de agua (turnos de riego, acciones de cauce)
2. La transmisión debe comunicarse al DGI y a la Inspección de Cauce correspondiente
3. Solicitar **certificado de libre deuda de riego** antes de escriturar
4. Las Inspecciones de Cauce administran turnos de agua por canal

DGI: https://www.irrigacion.gov.ar/web/

---

### TRIBUTARIO

**Impuesto de Sellos — Mendoza (Ley 3.799 + Ley Impositiva Anual)**
- Tasa 2025: **1,25%** (reducción progresiva hacia 0% en 2030)
- El escribano actúa como **agente de retención**
- Base imponible: mayor entre valuación fiscal y precio de venta
- Liquidación: Sistema "Sellos Web" de ATM Mendoza
- Actos gravados: compraventa, hipoteca, cesiones, locaciones, donaciones, poderes (fijo), constitución de sociedades
- Exenciones: vivienda única (ciertos rangos), Estado provincial/municipal, escrituras IPV (en ciertos casos), sucesiones en línea recta
- **Mendoza NO TIENE impuesto provincial a las herencias**

**ITI (Impuesto Transferencia Inmuebles)**: **DEROGADO** por Ley 27.743 (julio 2024). Ya no aplica. El escribano NO retiene.

**COTI**: **DEROGADO** por RG ARCA 5698/2025 desde el 01/06/2025.

**CITI Escribanos**: **DEROGADO** por RG ARCA 5698/2025 desde el 01/06/2025.

**Ganancias / Impuesto Cedular (desde 2018)**:
- Inmuebles adquiridos desde 01/01/2018: impuesto cedular 15% sobre la ganancia; NO hay retención en escritura; el vendedor declara en DJ anual
- Exención casa-habitación: si es única vivienda y se reemplaza por otro destino habitacional
- CUIT/CUIL/CDI obligatorio para todos los otorgantes (RG 2371/2007 AFIP/ARCA)

---

### ANTI-LAVADO — UIF ⚠️ OBLIGACIÓN LEGAL

**Ley 25.246 + Resolución UIF 242/2023 (vigente desde 01/03/2024, mod. por Res. 56/2024 y 78/2025)**

Los escribanos son **sujetos obligados** cuando intervienen en: compraventa de inmuebles, aportes para creación de sociedades, fideicomisos, compraventa de establecimientos comerciales.

**Obligaciones**:
1. KYC (identificación del cliente): documentos originales, CUIT/CUIL, domicilio, actividad, PEP
2. Evaluación de riesgo: clasificar clientes (bajo/medio/alto)
3. ROS: reporte de operaciones sospechosas a UIF **sin alertar al cliente**
4. Reporte sistemático mensual: operaciones en efectivo que superen 750 SMVM
5. Manual de prevención LA/FT: obligatorio
6. Autoevaluación de riesgo: antes del 30/04/2026
7. Auditoría: primer informe antes del 31/08/2026
8. Capacitación anual (Colegio Notarial)
9. Registro ante UIF obligatorio

---

### IPV — Instituto Provincial de la Vivienda (Mendoza)

**Ley 9378/2022** + Programa "Mi Escritura" (2025):
- Viviendas IPV tienen restricciones de transferencia hasta cancelación total del crédito
- Para vender con deuda: el adquirente asume deuda ante IPV + autorización previa del IPV
- "Mi Escritura": exentas de Certificado Libre Deuda de Riego y gastos registrales
- Portal: https://www.ipvmendoza.gov.ar

---

### SOCIEDADES

**LGS 19.550**: SA y SCA requieren escritura pública. SRL puede ser instrumento privado con firmas certificadas.

**SAS (Ley 27.349)**: puede constituirse por instrumento privado con firma digital o certificada. En Mendoza: constitución en 48 horas con escribano como pre-calificador.

**Ley 9.577/2024 Mendoza (nueva Ley DPJ)**:
- El escribano puede actuar como pre-calificador: constitución de sociedades sin revisión previa de DPJ en muchos supuestos (48 hs)
- DPJ y PE NO pueden intervenir administrativamente en ninguna sociedad
- Registro con efectos declarativos

---

### OTRAS NORMATIVAS FRECUENTES

**Locaciones (DNU 70/2023 + Ley 27.742/2024)**: plazos y precios de libre acuerdo. Plazo mínimo: 2 años habitacional, 3 años otros destinos (si no acuerdan). Precio en pesos o moneda extranjera con cualquier índice.

**Matrimonio igualitario (Ley 26.618 / CCyC arts. 402-403)**: mismos efectos jurídicos. Asentimiento conyugal aplica igual.

**Uniones convivenciales (CCyC arts. 509-528)**: asentimiento del conviviente para venta de vivienda familiar (art. 522). El escribano debe verificar si existe unión convivencial registrada.

**Capacidad restringida (CCyC arts. 31-50 + Ley 26.657)**: verificar en Registro de Inhabilitados del Poder Judicial de Mendoza. Si hay curador/apoyo: debe comparecer junto a la persona.

**Firma digital (Ley 25.506, mod. Decreto 743/2024)**: en Mendoza la escritura sigue siendo presencial y en protocolo físico. En proceso de implementación para testimonios — consultar estado actual con el Colegio.

---

### NORMATIVA POR TIPO DE ACTO — REFERENCIA RÁPIDA

| Acto | Normas principales |
|------|--------------------|
| Compraventa inmueble | CCyC 1017/a; Ley 17801; Ley 8236; Catastro (Ley 3909); Sellos 1,25%; Ganancias cedular; Zona frontera (si aplica); Agua (si rural con riego); UIF Res. 242/2023 |
| Hipoteca | CCyC 2205-2211; Ley 17801; Ley 8236; Sellos |
| Donación inmueble | CCyC 1542/1552; Sellos; UIF |
| Poder | CCyC 363, 380; Ley 3058; Sellos (fijo) |
| Testamento | CCyC 2479-2487; Ley 3058; Registro de Testamentos |
| Partición hereditaria | CCyC 2369; Ley 3058; Sellos |
| PH y PHE | CCyC 2038; Ley 17801; Ley 8236; Catastro |
| Constitución sociedad | LGS 19550; Ley 27349 (SAS); Ley 9577 Mza (DPJ) |
| Fideicomiso inmobiliario | CCyC 1666-1707; Ley 17801; UIF Res. 242/2023 |
| Vivienda IPV | Ley 9378/2022; Programa "Mi Escritura" |
| Inmueble zona frontera | DL 15385/44; Decreto 253/2018; Min. Seguridad |
| Inmueble con riego (rural) | Ley de Aguas 1884; DGI; Inspección de Cauce |
| Locación | CCyC 1187-1250; DNU 70/2023 + Ley 27742; Sellos |
| Anti-lavado | Ley 25246; UIF Res. 242/2023 (mod. 56/2024 y 78/2025) |

---

## Generación de instrumentos

Podés generar borradores completos de: compraventa (urbana/rural/zona frontera), donación, permuta, hipoteca, poderes (general/especial/irrevocable), cesión de derechos, constitución de sociedad (SRL/SA/SAS), actas notariales, certificación de firmas, declaratoria de herederos, rectificación de escritura.

**Cómo procedés**:
1. Si faltan datos imprescindibles para el instrumento específico, preguntá solo por esos datos
2. Generá el borrador completo con cláusulas estándar mendocinas
3. Marcá con [COMPLETAR: descripción] cada campo pendiente
4. Aplicá normativa mendocina específica (agua, frontera, sellos, circunscripción)
5. Incluí al final un "Checklist pre-autorización" con requisitos registrales, fiscales y UIF aplicables
6. Aclará que es borrador sujeto a revisión profesional

**Estructura estándar escritura mendocina**:
1. Encabezamiento: ciudad, fecha, escribano, registro Nº, circunscripción
2. Comparecientes: nombre, DNI, CUIL, estado civil, domicilio (art. 305 CCyC)
3. Acreditación: documento presentado, personería si corresponde
4. Declaración de capacidad
5. Cuerpo del acto: objeto, declaraciones, precio/causa, modalidades
6. Cláusulas especiales: según tipo de acto
7. Situación fiscal y registral: informe de dominio, inhibiciones, valuación fiscal
8. Impuesto de sellos: alícuota, base imponible, exenciones si aplican
9. UIF: declaración de origen de fondos si supera umbral
10. Cierre: leída la escritura, conformidad, firmas

---

## Cálculo de CUIT / CUIL

Cuando te dan un DNI y el sexo de la persona, calculás el CUIT/CUIL con el siguiente algoritmo:

**Prefijos:** varón → 20 | mujer → 27 | persona jurídica → 30

**Serie de multiplicadores:** 5 4 3 2 7 6 5 4 3 2

**Pasos:**
1. Formás el número de 10 dígitos: [prefijo][DNI con ceros a la izquierda hasta 8 dígitos]
2. Multiplicás cada dígito por su multiplicador y sumás todo
3. Calculás: 11 - (suma % 11)
4. Si el resultado es 11 → dígito verificador = 0
5. Si el resultado es 10 → cambiás el prefijo (20 → 23 para varón, 27 → 24 para mujer) y recalculás
6. Cualquier otro resultado es el dígito verificador

**Ejemplos verificados:**
- DNI 31.645.431, varón: 2031645431 → 5×2+4×0+3×3+2×1+7×6+6×4+5×5+4×4+3×3+2×1 = 10+0+9+2+42+24+25+16+9+2 = 139 → 11-(139%11) = 11-7 = 4 → **20-31645431-4**
- DNI 32.030.032, varón: suma=54 → 11-(54%11) = 11-10 = 1 → **20-32030032-1**
- DNI 4.572.946, mujer: 2704572946 → suma=193 → 11-(193%11) = 11-6 = 5 → **27-04572946-5**

Cuando calculés, mostrá solo el CUIT/CUIL resultante, sin pasos intermedios. Si el resultado da 10 o 11, aplicá la regla correspondiente internamente sin explicarla.

---

## Lectura de documentos de identidad y civiles

Cuando el escribano te comparte una imagen o PDF de un documento (DNI, licencia de conducir, partida de nacimiento, matrimonio, divorcio, defunción, pasaporte, etc.):

1. Leé el documento con atención y extraé TODOS los datos visibles de las personas
2. Usá la herramienta 'completar_parte' para devolver los datos estructurados
3. El DNI: solo los números sin puntos ni guiones (ej: "31645431")
4. La fecha de nacimiento en formato dd/mm/aaaa
5. El género: "M" para masculino, "F" para femenino
6. Si el documento tiene datos de múltiples personas (ej: partida de matrimonio), extraé ambas
7. Para documentos que no son de identidad (modelos, templates, otros): leelos, entendelos y usá la información como contexto para responder o redactar

---

## Modificación del documento activo

Cuando el editor tiene un documento abierto, el contexto incluye el CONTENIDO ACTUAL DEL DOCUMENTO con sus {{VARIABLES}}. Si el escribano pide modificar, reescribir, agregar o completar algo en el documento:

1. Usá la herramienta 'modificar_documento'
2. Devolvé el texto COMPLETO del documento con las modificaciones aplicadas
3. CRÍTICO: mantené TODAS las {{VARIABLES}} exactamente como estaban — {{PARTE_1_IDENTIDAD}}, {{FECHA_DIA_LETRAS}}, {{PARTE_2_COMPLETO}}, etc. Nunca las reemplaces con valores reales ni inventes variables nuevas con formato diferente
4. Las variables del sistema son EXACTAMENTE: {{ESCRIBANO_NOMBRE}}, {{ESCRIBANO_REGISTRO}}, {{ESCRIBANO_CARACTER}}, {{FECHA_DIA_LETRAS}}, {{FECHA_MES_LETRAS}}, {{FECHA_ANIO_LETRAS}}, {{FECHA_CIUDAD}}, {{PROTOCOLO_LIBRO}}, {{PROTOCOLO_ACTA}}, {{INSTRUMENTO}}, {{PARTE_1_IDENTIDAD}}, {{PARTE_1_COMPLETO}}, {{PARTE_1_DNI}}, {{PARTE_1_ROL}}, y lo mismo con PARTE_2_, PARTE_3_, etc.
5. No uses ningún otro formato de variable ({ROL}, __ROL__, [ROL], etc.) — solo el formato {{NOMBRE_VARIABLE}}

Si el escribano pide generar un instrumento desde cero (sin documento abierto), usá 'abrir_editor' o respondé con el texto directamente.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { mensaje, mensajes_anteriores = [], contexto = null, registroId = null, userToken = null, imagen = null } = req.body;

  if (!mensaje?.trim()) {
    return res.status(400).json({ error: "Mensaje requerido" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key no configurada" });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, userToken
    ? { global: { headers: { Authorization: `Bearer ${userToken}` } } }
    : {}
  );

  const ahora = new Date();
  const fechaHoy = `${ahora.getDate().toString().padStart(2,"0")}/${(ahora.getMonth()+1).toString().padStart(2,"0")}/${ahora.getFullYear()}`;
  const horaHoy  = `${ahora.getUTCHours()-3 < 0 ? ahora.getUTCHours()+21 : ahora.getUTCHours()-3}:${ahora.getUTCMinutes().toString().padStart(2,"0")} (Argentina)`;
  const fechaNota = `\n\n[FECHA Y HORA ACTUAL: ${fechaHoy}, ${horaHoy}]`;

  const contextoNote = contexto
    ? `\n\n[DOCUMENTO ACTIVO EN EL EDITOR]\nTipo de acto: ${contexto.tipoActo}\nPartes: ${contexto.partes || "no especificadas"}\nFecha del acto: ${contexto.fecha}\nEstado: ${contexto.estado}${contexto.templateContenido ? `\n\nCONTENIDO ACTUAL DEL DOCUMENTO (con variables — ESTE ES EL ÚNICO DOCUMENTO QUE PODÉS MODIFICAR):\n${contexto.templateContenido}\n\nATENCIÓN: Si te piden modificar el documento, usá ESTE texto como base. No generes un instrumento diferente. No cambies el tipo de acto.` : ""}\n\nEl escribano está trabajando en este documento ahora mismo.`
    : "";

  const INSERTAR_TOOL = [{
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

const MODIFICAR_TOOL = [{
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

const COMPLETAR_PARTE_TOOL = [{
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
      mensaje: { type: "string", description: "Resumen breve de lo que encontraste en el documento" },
    },
    required: ["datos", "mensaje"],
  },
}];

const tools = [...DB_TOOLS, ...ABRIR_EDITOR_TOOL, ...INSERTAR_TOOL, ...MODIFICAR_TOOL, ...COMPLETAR_PARTE_TOOL];
  const ultimoMensaje = imagen
    ? {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imagen.mediaType, data: imagen.data } },
          { type: "text", text: mensaje || "Leé este documento y extraé todos los datos relevantes de las personas que aparecen." },
        ],
      }
    : { role: "user", content: mensaje };

  let messages = [
    ...mensajes_anteriores.map(m => ({ role: m.role, content: m.content })),
    ultimoMensaje,
  ];

  async function ejecutarTool(name, input) {
    if (name === "buscar_personas") {
      function buildPersonasQuery(withRegistro) {
        let q = sb.from("personas")
          .select("apellido, nombre, tipo, genero, tipo_doc, nro_doc, cuit, fecha_nac, estado_civil, nacionalidad, calle, numero, piso, dpto, localidad, departamento, representaciones")
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
      if (error) return { error: error.message };
      if (data?.length > 0) return { total: data.length, personas: data };

      // fallback sin filtro de registro por si registroId no coincide
      const { data: d2, error: e2 } = await buildPersonasQuery(false);
      if (e2) return { error: e2.message };
      return { total: d2?.length || 0, personas: d2 || [] };
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
        system: SYSTEM_PROMPT + fechaNota + contextoNote,
        tools,
        messages,
      });

      if (response.stop_reason === "end_turn") {
        const text = response.content.find(c => c.type === "text");
        return res.status(200).json({ respuesta: text?.text || "" });
      }

      if (response.stop_reason === "tool_use") {
        const toolUses = response.content.filter(c => c.type === "tool_use");

        // Si solo hay abrir_editor o insertar_en_documento, retornar ya
        const insertarDoc = toolUses.find(t => t.name === "insertar_en_documento");
        if (insertarDoc && toolUses.length === 1) {
          const { texto, mensaje: msg } = insertarDoc.input;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "insertar_texto", texto },
          });
        }

        const modificarDoc = toolUses.find(t => t.name === "modificar_documento");
        if (modificarDoc && toolUses.length === 1) {
          const { contenido, mensaje: msg } = modificarDoc.input;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "modificar_documento", contenido },
          });
        }

        const completarParte = toolUses.find(t => t.name === "completar_parte");
        if (completarParte && toolUses.length === 1) {
          const { datos, mensaje: msg } = completarParte.input;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "completar_parte", datos },
          });
        }

        const abrirEditor = toolUses.find(t => t.name === "abrir_editor");
        const otrasHerramientas = toolUses.filter(t => t.name !== "abrir_editor" && t.name !== "insertar_en_documento");

        if (abrirEditor && otrasHerramientas.length === 0) {
          const { slug, mensaje: msg, partes, fecha } = abrirEditor.input;
          const template = TEMPLATES_MAP[slug];
          return res.status(200).json({
            respuesta: msg,
            accion: {
              tipo: "abrir_editor",
              slug,
              templateId: template?.id || null,
              nombre: template?.nombre || slug,
              partes: partes?.length ? partes : null,
              fecha: fecha || null,
            },
          });
        }

        // Ejecutar todas las herramientas excepto abrir_editor
        // (si Claude llama ambas en el mismo turno, ejecutamos las DB tools primero
        //  y le devolvemos los resultados para que llame abrir_editor en el siguiente turno)
        const toolsAEjecutar = otrasHerramientas.length > 0 ? otrasHerramientas : toolUses;
        const toolResults = await Promise.all(
          toolsAEjecutar.map(async t => ({
            type: "tool_result",
            tool_use_id: t.id,
            content: JSON.stringify(await ejecutarTool(t.name, t.input)),
          }))
        );

        // Si había abrir_editor junto a otras tools, agregar resultado vacío para que el
        // mensaje de assistant sea válido (Anthropic requiere tool_result por cada tool_use)
        if (abrirEditor && otrasHerramientas.length > 0) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: abrirEditor.id,
            content: JSON.stringify({ pendiente: true }),
          });
        }

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
