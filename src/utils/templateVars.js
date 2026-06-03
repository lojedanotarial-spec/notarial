import { diaLetras, anioLetras, numeroALetras } from "../utils";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

const fmtFechaNac = (v) => {
  if (!v) return "";
  // acepta "1949-12-22" o "22/12/1949"
  const parts = v.includes("-") ? v.split("-") : v.split("/").reverse();
  const [anio, mes, dia] = parts;
  return `${Number(dia)} de ${MESES[Number(mes)-1] || ""} de ${anio}`;
};

const fmtDni = (v) => v ? Number(String(v).replace(/\D/g,"")).toLocaleString("es-AR") : "";
const fmtDomicilio = (p) => [p.calle, p.numero, p.piso && `piso ${p.piso}`, p.dpto && `dpto. ${p.dpto}`, p.localidad, p.departamento].filter(Boolean).join(", ");

export function buildVars({ partes = [], escribano = {}, fecha = {}, protocolo = {}, instrumento = {}, extravars = {} }) {
  const esTitular = (escribano.caracter || "").toLowerCase().includes("titular");
  const esFemenino = (escribano.nombre || "").match(/\b(dra|dra\.|doctora|notaria)\b/i);
  const escribanoTitulo = esFemenino ? "Notaria" : "Notario";
  const escribanoCaracterTexto = esTitular
    ? `${escribanoTitulo} Titular`
    : `${escribanoTitulo} Adscripta/o`;

  const vars = {
    ESCRIBANO_NOMBRE:           escribano.nombre || "",
    ESCRIBANO_REGISTRO:         escribano.registro || "",
    ESCRIBANO_CARACTER:         escribano.caracter || "",
    ESCRIBANO_CARACTER_TEXTO:   escribanoCaracterTexto,
    ESCRIBANO_TITULO:           escribanoTitulo,
    ESCRIBANO_CIRCUNSCRIPCION:  escribano.circunscripcion || "primera",
    ESCRIBANO_REGISTRO_LETRAS:  numeroALetras(parseInt(escribano.registro || "0")).replace(/ CON 00\/100$/, ""),

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

    const esF = p.genero !== "M";
    vars[`PARTE_${n}_APELLIDO`]        = p.apellido     || "";
    vars[`PARTE_${n}_NOMBRE`]          = p.nombre       || "";
    vars[`PARTE_${n}_COMPLETO`]        = apellidoNombre;
    vars[`PARTE_${n}_DNI`]             = dni;
    vars[`PARTE_${n}_CUIT`]            = p.cuit         || "";
    vars[`PARTE_${n}_ESTADO_CIVIL`]    = p.estadoCivil  || "";
    // Concordancia de género en la nacionalidad
    const fmtNacionalidad = (nac, genero) => {
      if (!nac) return "";
      const n = nac.toLowerCase().trim();
      if (genero === "M") {
        if (n === "argentina")  return "argentino";
        if (n === "uruguaya")   return "uruguayo";
        if (n === "chilena")    return "chileno";
        if (n === "boliviana")  return "boliviano";
        if (n === "peruana")    return "peruano";
        if (n === "paraguaya")  return "paraguayo";
        if (n === "brasileña")  return "brasileño";
        if (n === "venezolana") return "venezolano";
        if (n === "colombiana") return "colombiano";
        // si ya está en masculino o no reconocemos, devolver tal cual
        return nac;
      }
      return nac; // femenino: devolver tal cual
    };
    vars[`PARTE_${n}_NACIONALIDAD`]    = fmtNacionalidad(p.nacionalidad, p.genero);
    vars[`PARTE_${n}_DOMICILIO`]       = domicilio;
    vars[`PARTE_${n}_ROL`]             = (p.rol || "").toUpperCase();
    vars[`PARTE_${n}_ARTICULO`]        = genArticulo;
    vars[`PARTE_${n}_FECHA_NAC`]       = fmtFechaNac(p.fechaNac || "");
    vars[`PARTE_${n}_ARTICULO_LA_EL`]  = esF ? "La" : "El";
    vars[`PARTE_${n}_NACIDO_A`]        = esF ? "nacida" : "nacido";
    vars[`PARTE_${n}_DEL_DE_LA`]       = esF ? "de la" : "del";

    // Identidad completa — la fórmula notarial estándar
    const identidadPartes = [
      `${genArticulo} ${apellidoNombre}`,
      p.nacionalidad ? `de nacionalidad ${p.nacionalidad}` : null,
      p.estadoCivil  ? `estado civil ${p.estadoCivil}` : null,
      domicilio      ? `con domicilio en ${domicilio}` : null,
      dni            ? `DNI Nro. ${dni}` : null,
      p.cuit         ? `CUIL/CUIT ${p.cuit}` : null,
    ].filter(Boolean);
    vars[`PARTE_${n}_IDENTIDAD`] = identidadPartes.join(", ");

    // Identidad en formato acta notarial (estructura de Fatima)
    const identidadActa = [
      apellidoNombre,
      p.nacionalidad || null,
      dni ? `Documento Nacional de Identidad número ${dni}` : null,
      p.cuit ? `CUIT/CUIL ${p.cuit}` : null,
      vars[`PARTE_${n}_FECHA_NAC`] ? `${vars[`PARTE_${n}_NACIDO_A`]} el día ${vars[`PARTE_${n}_FECHA_NAC`]}` : null,
      p.estadoCivil ? `quien manifiesta ser de estado de familia ${p.estadoCivil}` : null,
      domicilio ? `con domicilio en ${domicilio}` : null,
    ].filter(Boolean).join(", ");
    vars[`PARTE_${n}_IDENTIDAD_ACTA`] = identidadActa;
  });

  // Variables extra del template (inyectadas desde el editor)
  Object.assign(vars, extravars);

  return vars;
}

export function sustituirVars(texto, vars) {
  return texto.replace(/\{\{([^}]+)\}\}/g, (match, key) =>
    vars[key] !== undefined ? vars[key] : match
  );
}
