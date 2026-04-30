import { numeroALetras, concatenarLimites, concatenarAdquirentes } from "../utils";
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

export function generarEscritura(templateHTML, lote, barrio, escribano, fecha, nroEscritura) {
  const adquirentes = lote.partes || [];
  const primerAdq = adquirentes[0] || {};

  // Fecha
  const diaStr   = String(fecha.dia).padStart(2, "0");
  const mesStr   = String(fecha.mes + 1).padStart(2, "0");
  const anioStr  = String(fecha.anio);

  // Superficie en letras
  const supMensuraNum = parseFloat((lote.supMensura || "0").replace(/\./g, "").replace(",", "."));
  const supTitulo1Num = parseFloat((lote.supTitulo1 || "0").replace(/\./g, "").replace(",", "."));
  const supTitulo2Num = parseFloat((lote.supTitulo2 || "0").replace(/\./g, "").replace(",", "."));

  const supLetras = (num) => {
    if (isNaN(num) || num === 0) return "";
    const entero = Math.floor(num);
    const dec = Math.round((num - entero) * 100);
    return numeroALetras(entero).replace(" CON 00/100", "").replace(/ CON \d+\/100/, "")
      + " metros cuadrados" + (dec > 0 ? ` con ${dec} decímetros cuadrados` : "");
  };

  // Precio en letras
  const precioNum = parseFloat((lote.precio || "0").replace(/\$|\./g, "").replace(",", "."));

  // Variables
  const vars = {
    // Escribano
    "ESCRIBANO_NOMBRE":    escribano?.nombre    || "",
    "ESCRIBANO_CARACTER":  escribano?.caracter  || "",
    "ESCRIBANO_REGISTRO":  escribano?.registro  || "",

    // Fecha
    "FECHA_DIA_LETRAS":  diaLetras(fecha.dia),
    "FECHA_MES":         MESES_LABEL[fecha.mes]?.toUpperCase() || "",
    "FECHA_ANIO_LETRAS": anioLetras(fecha.anio),
    "FECHA_DIA":         diaStr,
    "FECHA_MES_NUM":     mesStr,
    "FECHA_ANIO":        anioStr,

    // Escritura
    "NRO_ESCRITURA":        String(nroEscritura || lote.nroEscritura || ""),
    "NRO_ESCRITURA_LETRAS": numeroALetras(Number(nroEscritura || lote.nroEscritura || 0)).replace(" CON 00/100",""),
    "FECHA_ESCRITURA":      lote.fechaEscritura || "",

    // Adquirentes
    "ADQUIRENTES_TEXTO": concatenarAdquirentes(adquirentes),
    "ADQ_TRATAMIENTO":   primerAdq.genero === "F" ? "la señora" : "el señor",
    "ADQ_NOMBRE_COMPLETO": [primerAdq.apellido, primerAdq.nombre].filter(Boolean).join(" "),
    "ADQ_NACIONALIDAD":  primerAdq.nacionalidad || "",
    "ADQ_TIPO_DOC":      primerAdq.tipoDoc      || "DNI",
    "ADQ_NRO_DOC":       fmtDni(primerAdq.nroDoc),
    "ADQ_CUIT":          primerAdq.cuit         || "",
    "ADQ_FECHA_NAC":     fmtFechaLetras(primerAdq.fechaNac),
    "ADQ_ESTADO_CIVIL":  primerAdq.estadoCivil  || "",
    "ADQ_DOMICILIO":     [primerAdq.calle, primerAdq.numero, primerAdq.localidad].filter(Boolean).join(", "),

    // Inmueble
    "MANZANA":             lote.manzana    || "",
    "LOTE":                lote.lote       || "",
    "FRENTE_CALLE":        barrio.frente   || "",
    "SUP_MENSURA":         lote.supMensura || "",
    "SUP_MENSURA_LETRAS":  supLetras(supMensuraNum),
    "SUP_TITULO_1":        lote.supTitulo1 || "",
    "SUP_TITULO_1_LETRAS": supLetras(supTitulo1Num),
    "SUP_TITULO_2":        lote.supTitulo2 || "",
    "SUP_TITULO_2_LETRAS": supLetras(supTitulo2Num),
    "LIMITES":             concatenarLimites(lote),
    "PLANO_MENSURA":       barrio.plano    || "",

    // Precio
    "PRECIO_NUMEROS": lote.precio || "",
    "PRECIO_LETRAS":  "PESOS " + numeroALetras(precioNum),

    // Certificados
    "CERT_REGISTRO_NRO":    lote.certRegistro  || "",
    "CERT_REGISTRO_FECHA":  lote.fechaRegistro || "",
    "CERT_CATASTRO_NRO":    lote.certCatastro  || "",
    "CERT_CATASTRO_FECHA":  lote.fechaCatastro || "",
    "NOMENCLATURA":         lote.nomenclatura  || "",
    "AVALUO":               lote.avaluo        || "",
    "PADRON_TERRITORIAL":   lote.padronRentas  || "",
    "PADRON_MUNICIPAL":     lote.padronMuni    || "",

    // Transmitente (del barrio)
    "TRANSMITENTE_NOMBRE": barrio.transmitente || "",
    "TRANSMITENTE_CUIT":   barrio.cuit         || "",
    "MATRICULA_SIRC":      barrio.matricula    || "",
  };

  // Reemplazar todas las variables en el template
  let resultado = templateHTML;
  for (const [key, value] of Object.entries(vars)) {
    resultado = resultado.replaceAll(`{{${key}}}`, value);
  }

  return resultado;
}
