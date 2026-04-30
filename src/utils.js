import { numeroALetras, concatenarLimites, concatenarAdquirentes, concatenarEncabezado } from "../utils";
import { diaLetras, anioLetras } from "../utils";
import { MESES_LABEL } from "../constants";

const fmtDni = (v) => {
  if (!v) return "";
  const n = Number(String(v).replace(/\D/g, ""));
  return isNaN(n) ? "" : n.toLocaleString("es-AR");
};

const fmtFechaLetras = (fechaStr) => {
  if (!fechaStr) return "";
  const [dia, mes, anio] = fechaStr.split("/").map(Number);
  if (!dia || !mes || !anio) return fechaStr;
  return `${dia} de ${MESES_LABEL[mes - 1]?.toLowerCase() || ""} de ${anio}`;
};

const parseMonto = (v) =>
  parseFloat((v || "0").replace(/\$|\./g, "").replace(",", ".")) || 0;

const parseSup = (v) =>
  parseFloat((v || "0").replace(/\./g, "").replace(",", ".")) || 0;

const supLetras = (num) => {
  if (isNaN(num) || num === 0) return "";
  const entero = Math.floor(num);
  const dec = Math.round((num - entero) * 100);
  return numeroALetras(entero)
    .replace(" CON 00/100", "")
    .replace(/ CON \d+\/100/, "")
    + " metros cuadrados"
    + (dec > 0 ? ` con ${dec} decímetros cuadrados` : "");
};

export function generarEscritura(templateHTML, lote, barrio, escribano, fecha, nroEscritura) {
  const adquirentes = lote.partes || [];
  const primerAdq = adquirentes[0] || {};

  // Fecha
  const diaStr  = String(fecha.dia).padStart(2, "0");
  const mesStr  = String(fecha.mes + 1).padStart(2, "0");
  const anioStr = String(fecha.anio);

  // Precio
  const precioNum = parseMonto(lote.precio);

  // Retención ganancias
  const retencionNum = parseMonto(lote.retencionGanancias);

  // Registro escribano en letras
  const registroNum = Number(escribano?.registro || 0);

  const vars = {
    // Escribano
    "ESCRIBANO_NOMBRE":           escribano?.nombre            || "",
    "ESCRIBANO_CARACTER":         escribano?.caracter          || "",
    "ESCRIBANO_REGISTRO":         escribano?.registro          || "",
    "ESCRIBANO_REGISTRO_LETRAS":  numeroALetras(registroNum).replace(" CON 00/100", ""),
    "ESCRIBANO_CIRCUNSCRIPCION":  escribano?.circunscripcion   || "",
    "ESCRIBANO_LOCALIDAD":        escribano?.localidad_registro || "",

    // Fecha
    "FECHA_DIA_LETRAS":  diaLetras(fecha.dia),
    "FECHA_MES":         MESES_LABEL[fecha.mes]?.toUpperCase() || "",
    "FECHA_ANIO_LETRAS": anioLetras(fecha.anio),
    "FECHA_DIA":         diaStr,
    "FECHA_MES_NUM":     mesStr,
    "FECHA_ANIO":        anioStr,

    // Escritura
    "NRO_ESCRITURA":        String(nroEscritura || lote.nroEscritura || ""),
    "NRO_ESCRITURA_LETRAS": numeroALetras(Number(nroEscritura || lote.nroEscritura || 0)).replace(" CON 00/100", ""),
    "FECHA_ESCRITURA":      lote.fechaEscritura || "",

    // Adquirentes
    "ADQUIRENTES_ENCABEZADO": concatenarEncabezado(adquirentes),
    "ADQUIRENTES_TEXTO":      concatenarAdquirentes(adquirentes),
    "ADQ_TRATAMIENTO":        primerAdq.genero === "F" ? "la señora" : "el señor",
    "ADQ_NOMBRE_COMPLETO":    [primerAdq.apellido, primerAdq.nombre].filter(Boolean).join(" "),
    "ADQ_NACIONALIDAD":       primerAdq.nacionalidad  || "",
    "ADQ_TIPO_DOC":           primerAdq.tipoDoc       || "DNI",
    "ADQ_NRO_DOC":            fmtDni(primerAdq.nroDoc),
    "ADQ_CUIT":               primerAdq.cuit          || "",
    "ADQ_FECHA_NAC":          fmtFechaLetras(primerAdq.fechaNac),
    "ADQ_ESTADO_CIVIL":       primerAdq.estadoCivil   || "",
    "ADQ_DOMICILIO":          [primerAdq.calle, primerAdq.numero, primerAdq.localidad].filter(Boolean).join(", "),

    // Inmueble
    "MANZANA":              lote.manzana    || "",
    "LOTE":                 lote.lote       || "",
    "FRENTE_CALLE":         barrio.frente   || "",
    "PLANO_MENSURA":        barrio.plano    || "",
    "LIMITES":              concatenarLimites(lote),

    // Superficies — supTitulo1..4 en DB, expuestas como I..IV
    "SUP_MENSURA":           lote.supMensura  || "",
    "SUP_MENSURA_LETRAS":    supLetras(parseSup(lote.supMensura)),
    "SUP_TITULO_I":          lote.supTitulo1  || "",
    "SUP_TITULO_I_LETRAS":   supLetras(parseSup(lote.supTitulo1)),
    "SUP_TITULO_II":         lote.supTitulo2  || "",
    "SUP_TITULO_II_LETRAS":  supLetras(parseSup(lote.supTitulo2)),
    "SUP_TITULO_III":        lote.supTitulo3  || "",
    "SUP_TITULO_III_LETRAS": supLetras(parseSup(lote.supTitulo3)),
    "SUP_TITULO_IV":         lote.supTitulo4  || "",
    "SUP_TITULO_IV_LETRAS":  supLetras(parseSup(lote.supTitulo4)),

    // Precio
    "PRECIO_NUMEROS": lote.precio || "",
    "PRECIO_LETRAS":  "PESOS " + numeroALetras(precioNum),

    // Retención ganancias
    "RETENCION_GANANCIAS":        lote.retencionGanancias || "",
    "RETENCION_GANANCIAS_LETRAS": "PESOS " + numeroALetras(retencionNum),

    // Certificados
    "CERT_REGISTRO_NRO":   lote.certRegistro  || "",
    "CERT_REGISTRO_FECHA": lote.fechaRegistro || "",
    "CERT_CATASTRO_NRO":   lote.certCatastro  || "",
    "CERT_CATASTRO_FECHA": lote.fechaCatastro || "",
    "NOMENCLATURA":        lote.nomenclatura  || "",
    "AVALUO":              lote.avaluo        || "",
    "PADRON_TERRITORIAL":  lote.padronRentas  || "",
    "PADRON_MUNICIPAL":    lote.padronMuni    || "",

    // Transmitente (del barrio)
    "TRANSMITENTE_NOMBRE": barrio.transmitente        || "",
    "TRANSMITENTE_CUIT":   barrio.cuit                || "",
    "MATRICULA_SIRC":      barrio.matricula           || "",
  };

  let resultado = templateHTML;
  for (const [key, value] of Object.entries(vars)) {
    resultado = resultado.replaceAll(`{{${key}}}`, value);
  }

  return resultado;
}
