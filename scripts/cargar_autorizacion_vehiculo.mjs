import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eueqluhhgvukovoyorrw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Un solo {{TIPO_VEHICULO}} con opciones VEHÍCULO / MOTOVEHÍCULO.
// En el cuerpo se usa {{TIPO_VEHICULO_MIN}} que el builder deriva automáticamente.
// Marcadores: __texto__ = subrayado, **texto** = negrita
const contenido = `__AUTORIZACIÓN PARA CONDUCIR Y EXPORTAR E IMPORTAR {{TIPO_VEHICULO}}. INSTRUMENTO NOTARIAL EXTRAPROTOCOLAR. - SOLICITADA {{PARTE_1_COMPLETO}} a favor de {{PARTE_2_COMPLETO}}.__ En el departamento {{FECHA_CIUDAD}}, Provincia de Mendoza, República Argentina, a {{FECHA_DIA_LETRAS}} días del mes de {{FECHA_MES_LETRAS}} del año {{FECHA_ANIO_LETRAS}}, ante mí, {{ESCRIBANO_NOMBRE}}, {{ESCRIBANO_CARACTER_TEXTO}} del Registro Notarial número {{ESCRIBANO_REGISTRO_LETRAS}} de la Primera Circunscripción Notarial de la Provincia de Mendoza; COMPARECE: {{PARTE_1_ARTICULO}} __{{PARTE_1_COMPLETO}}__, {{PARTE_1_NACIONALIDAD}}, Documento Nacional de Identidad número {{PARTE_1_DNI}}, {{PARTE_1_ESTADO_CIVIL}}, domicilio en {{PARTE_1_DOMICILIO}}, mayor de edad, quien justifica su identidad conforme a los términos del artículo 306 inciso a del Código Civil y Comercial de la Nación; y DICE: Que confiere la más amplia autorización a favor de: __{{PARTE_2_COMPLETO}}__, {{PARTE_2_NACIONALIDAD}}, Documento Nacional de Identidad número {{PARTE_2_DNI}}, para que conduzca, exporte e importe, libremente en todo el territorio de la REPÚBLICA ARGENTINA y/o PAISES DEL MUNDO, el {{TIPO_VEHICULO_MIN}} de titularidad {{PARTE_1_DEL_DE_LA}} compareciente lo cual acredita con el título respectivo que para este acto tengo a la vista doy fe: Marca {{VEHICULO_MARCA}}, Modelo {{VEHICULO_MODELO}}, Tipo: {{VEHICULO_TIPO_DESC}}, Dominio: {{VEHICULO_DOMINIO}} CHASIS {{VEHICULO_CHASIS}}, MOTOR: {{VEHICULO_MOTOR}}; A TAL EFECTO queda facultado para conducir, exportar e importar el mencionado vehículo, sin límite de tiempo y presentar y firmar toda la documentación pública o privada que fuera menester, y que se le exija a esos efectos, ante las Autoridades Internacionales, Nacionales, Provinciales, Municipales, Registro del automotor, Gendarmería, Autoridades de Aduanas Nacionales o Extranjeras, Migración o de cualquier otro carácter que permitan o controlen el tráfico de circulación, realizando todos los actos concernientes a ellos, pudiendo suscribir las solicitudes, reclamos, permisos, formularios, contraten seguros, abonen multas, impuestos y contravenciones, como asimismo suscribir toda la documentación a tal efecto y quedando facultados para exigir y tramitar todo lo relativo a la entrega del vehículo en caso de detención y/o retención ejercida por Policía Provincial y Federal.- El autorizado asume a su exclusivo cargo toda responsabilidad civil, administrativa y/o penal por cualquier siniestro, accidente, y/o multa que les cupiesen por la conducción o utilización del vehículo mencionado precedentemente.- EN SU TESTIMONIO, previa lectura y aceptación, así lo otorga y firma el compareciente, ante mí, {{ESCRIBANO_TITULO}} autorizante, doy fe-`;

const variables_json = [
  {
    name: "TIPO_VEHICULO",
    label: "Tipo de vehículo",
    type: "seleccion",
    opciones: ["VEHÍCULO", "MOTOVEHÍCULO"],
    required: true,
  },
  { name: "VEHICULO_MARCA",    label: "Marca",              type: "texto", placeholder: "Ej: VOLKSWAGEN",       required: true },
  { name: "VEHICULO_MODELO",   label: "Modelo",             type: "texto", placeholder: "Ej: CROSSFOX 1.6",     required: true },
  { name: "VEHICULO_TIPO_DESC",label: "Tipo / carrocería",  type: "texto", placeholder: "Ej: SEDAN 5 PTAS",     required: true },
  { name: "VEHICULO_DOMINIO",  label: "Dominio (patente)",  type: "texto", placeholder: "Ej: FQV638",           required: true },
  { name: "VEHICULO_CHASIS",   label: "N° de chasis",       type: "texto", placeholder: "Ej: 98WKB052964173498",required: true },
  { name: "VEHICULO_MOTOR",    label: "N° de motor",        type: "texto", placeholder: "Ej: BAH299927",        required: true },
];

const { data: existente } = await sb
  .from("templates").select("id").eq("slug", "autorizacion_vehiculo").maybeSingle();

if (existente) {
  const { error } = await sb.from("templates")
    .update({ contenido, variables_json })
    .eq("id", existente.id);
  console.log(error ? "✗ " + error.message : "↑ autorizacion_vehiculo — actualizado");
} else {
  const { error } = await sb.from("templates").insert({
    slug: "autorizacion_vehiculo", nombre: "Autorización para conducir / exportar vehículo",
    tipo: "extraprotocolar", familia: "autorizaciones",
    descripcion: "Autorización para conducir, exportar e importar vehículo o motovehículo.",
    frecuencia: 5, contenido, variables_json, registro_id: null, editable: false, visible: true,
  });
  console.log(error ? "✗ " + error.message : "+ autorizacion_vehiculo — insertado");
}
