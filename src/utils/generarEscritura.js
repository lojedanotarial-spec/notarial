import { numeroALetras, concatenarLimites, concatenarAdquirentes, concatenarEncabezado } from "../utils";

// Superficie en letras
const parseSup = (v) => parseFloat((v || "0").replace(/\./g, "").replace(",", ".")) || 0;

const supLetras = (num) => {
  if (isNaN(num) || num === 0) return "";
  const entero = Math.floor(num);
  const dec = Math.round((num - entero) * 100);
  return numeroALetras(entero).replace(" CON 00/100", "").replace(/ CON \d+\/100/, "")
    + " metros cuadrados" + (dec > 0 ? ` con ${dec} decímetros cuadrados` : "");
};

// Variables propias de un lote de barrio — sin equivalente en el motor genérico
// (buildVars() no sabe de manzanas, superficies, precios ni certificados). Las usan
// LoteDocScreen (editor del lote) y exportarBarrioZip: un solo motor para ambos.
export function construirVarsLote(lote, barrio, escribano, nroEscritura) {
  const adquirentes = lote.partes || [];
  const precioNum = parseFloat((lote.precio || "0").replace(/\$|\./g, "").replace(",", "."));
  const retencionNum = parseFloat((lote.retencionGanancias || "0").replace(/\$|\./g, "").replace(",", "."));

  return {
    // Bloques de texto agregados con todos los adquirentes (no sólo el primero,
    // esto ya era correcto antes de este cambio — se deja tal cual).
    ADQUIRENTES_TEXTO: concatenarAdquirentes(adquirentes),
    ADQUIRENTES_ENCABEZADO: concatenarEncabezado(adquirentes),

    ESCRIBANO_LOCALIDAD: escribano?.localidad_registro || "",

    // Escritura
    NRO_ESCRITURA: String(nroEscritura || lote.nroEscritura || ""),
    NRO_ESCRITURA_LETRAS: numeroALetras(Number(nroEscritura || lote.nroEscritura || 0)).replace(" CON 00/100",""),
    FECHA_ESCRITURA: lote.fechaEscritura || "",

    // Inmueble
    MANZANA: lote.manzana || "",
    LOTE: lote.lote || "",
    FRENTE_CALLE: barrio.frente || "",
    SUP_MENSURA: lote.supMensura || "",
    SUP_MENSURA_LETRAS: supLetras(parseSup(lote.supMensura)),
    SUP_TITULO_I:          lote.supTitulo1 || "",
    SUP_TITULO_I_LETRAS:   supLetras(parseSup(lote.supTitulo1)),
    SUP_TITULO_II:         lote.supTitulo2 || "",
    SUP_TITULO_II_LETRAS:  supLetras(parseSup(lote.supTitulo2)),
    SUP_TITULO_III:        lote.supTitulo3 || "",
    SUP_TITULO_III_LETRAS: supLetras(parseSup(lote.supTitulo3)),
    SUP_TITULO_IV:         lote.supTitulo4 || "",
    SUP_TITULO_IV_LETRAS:  supLetras(parseSup(lote.supTitulo4)),
    LIMITES: concatenarLimites(lote),
    PLANO_MENSURA: barrio.plano || "",

    // Precio
    PRECIO_NUMEROS: lote.precio || "",
    PRECIO_LETRAS: "PESOS " + numeroALetras(precioNum),
    RETENCION_GANANCIAS:        lote.retencionGanancias || "",
    RETENCION_GANANCIAS_LETRAS: "PESOS " + numeroALetras(retencionNum),

    // Certificados
    CERT_REGISTRO_NRO: lote.certRegistro || "",
    CERT_REGISTRO_FECHA: lote.fechaRegistro || "",
    CERT_CATASTRO_NRO: lote.certCatastro || "",
    CERT_CATASTRO_FECHA: lote.fechaCatastro || "",
    NOMENCLATURA: lote.nomenclatura || "",
    AVALUO: lote.avaluo || "",
    PADRON_TERRITORIAL: lote.padronRentas || "",
    PADRON_MUNICIPAL: lote.padronMuni || "",

    // Transmitente (del barrio)
    TRANSMITENTE_NOMBRE: barrio.transmitente || "",
    TRANSMITENTE_CUIT: barrio.cuit || "",
    MATRICULA_SIRC: barrio.matricula || "",
  };
}
