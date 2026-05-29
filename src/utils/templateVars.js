import { diaLetras, anioLetras } from "../utils";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

const fmtDni = (v) => v ? Number(String(v).replace(/\D/g,"")).toLocaleString("es-AR") : "";
const fmtDomicilio = (p) => [p.calle, p.numero, p.piso && `piso ${p.piso}`, p.dpto && `dpto. ${p.dpto}`, p.localidad, p.departamento].filter(Boolean).join(", ");

export function buildVars({ partes = [], escribano = {}, fecha = {}, protocolo = {}, instrumento = {} }) {
  const vars = {
    ESCRIBANO_NOMBRE:           escribano.nombre || "",
    ESCRIBANO_REGISTRO:         escribano.registro || "",
    ESCRIBANO_CARACTER:         escribano.caracter || "",
    ESCRIBANO_CIRCUNSCRIPCION:  escribano.circunscripcion || "primera",

    FECHA_DIA:          String(fecha.dia || 1).padStart(2, "0"),
    FECHA_MES:          String((fecha.mes || 0) + 1).padStart(2, "0"),
    FECHA_ANIO:         String(fecha.anio || new Date().getFullYear()),
    FECHA_DIA_LETRAS:   diaLetras(fecha.dia || 1),
    FECHA_MES_LETRAS:   MESES[fecha.mes || 0] || "",
    FECHA_ANIO_LETRAS:  anioLetras(fecha.anio || new Date().getFullYear()),
    FECHA_CIUDAD:       fecha.ciudad || "Mendoza",

    PROTOCOLO_LIBRO:  protocolo.nroLibro || "",
    PROTOCOLO_ACTA:   protocolo.nroActa  || "",

    INSTRUMENTO: instrumento.descripcion || "",
  };

  partes.forEach((p, i) => {
    const n = i + 1;
    const apellidoNombre = [p.apellido, p.nombre].filter(Boolean).join(" ");
    const dni = fmtDni(p.nroDoc);
    const domicilio = fmtDomicilio(p);
    const genArticulo = p.genero === "M" ? "el señor" : "la señora";

    vars[`PARTE_${n}_APELLIDO`]      = p.apellido     || "";
    vars[`PARTE_${n}_NOMBRE`]        = p.nombre       || "";
    vars[`PARTE_${n}_COMPLETO`]      = apellidoNombre;
    vars[`PARTE_${n}_DNI`]           = dni;
    vars[`PARTE_${n}_CUIT`]          = p.cuit         || "";
    vars[`PARTE_${n}_ESTADO_CIVIL`]  = p.estadoCivil  || "";
    vars[`PARTE_${n}_NACIONALIDAD`]  = p.nacionalidad || "";
    vars[`PARTE_${n}_DOMICILIO`]     = domicilio;
    vars[`PARTE_${n}_ROL`]           = p.rol          || "";
    vars[`PARTE_${n}_ARTICULO`]      = genArticulo;

    // Identidad completa — la fórmula notarial estándar
    vars[`PARTE_${n}_IDENTIDAD`] =
      `${genArticulo} ${apellidoNombre}, de nacionalidad ${p.nacionalidad || ""}, ` +
      `estado civil ${p.estadoCivil || ""}, con domicilio en ${domicilio || ""}, ` +
      `DNI Nro. ${dni}, CUIL/CUIT ${p.cuit || ""}`;
  });

  return vars;
}

export function sustituirVars(texto, vars) {
  return texto.replace(/\{\{([^}]+)\}\}/g, (match, key) =>
    vars[key] !== undefined ? vars[key] : match
  );
}
