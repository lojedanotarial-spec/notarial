import { diaLetras, anioLetras, numeroALetras } from "../utils";
import { textoInterviene } from "./buildInterviene";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MESES_UP = MESES.map(m => m.toUpperCase());

// Capitaliza cada palabra: "RAUL ALBERTO" → "Raúl Alberto"
const toTitleCase = (str) => (str || "").split(/\s+/)
  .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)
  .join(" ");

const fmtFechaNac = (v) => {
  if (!v) return "";
  // acepta "1949-12-22" o "22/12/1949"
  const parts = v.includes("-") ? v.split("-") : v.split("/").reverse();
  const [anio, mes, dia] = parts;
  return `${Number(dia)} de ${MESES[Number(mes)-1] || ""} de ${anio}`;
};

const fmtDni = (v) => v ? Number(String(v).replace(/\D/g,"")).toLocaleString("es-AR") : "";
const fmtDomicilio = (p) => [
  p.barrio  && `Barrio ${p.barrio}`,
  p.manzana && `Manzana ${p.manzana}`,
  p.casa    && `Casa ${p.casa}`,
  p.calle,
  p.numero,
  p.piso    && `piso ${p.piso}`,
  p.dpto    && `dpto. ${p.dpto}`,
  p.localidad,
  p.departamento,
].filter(Boolean).join(", ");

export function buildVars({ partes = [], escribano = {}, fecha = {}, protocolo = {}, instrumento = {}, extravars = {}, rolesContextuales = null, vehiculos = [] }) {
  // Si hay roles definidos para este template, ordenar partes por rol antes de asignar posiciones.
  // Así "Autorizado/a" siempre va a PARTE_2 aunque se haya cargado primero.
  if (rolesContextuales?.length) {
    let restantes = [...partes];
    const slots = rolesContextuales.map(rolEsperado => {
      if (!rolEsperado) return null;
      const base = rolEsperado.toLowerCase().split("/")[0].trim();
      const idx = restantes.findIndex(p => {
        const pr = (p.rol || "").toLowerCase();
        return pr && (pr.startsWith(base) || base.startsWith(pr) || pr.includes(base));
      });
      if (idx >= 0) { const p = restantes[idx]; restantes.splice(idx, 1); return p; }
      return null; // posición sin parte todavía
    });
    // Partes sin rol reconocido van al final
    partes = [...slots, ...restantes];
  }
  // Usar caracter tal como viene de la tabla registros (ya tiene género correcto)
  // Solo derivar si no está seteado
  const esTitular = (escribano.caracter || "").toLowerCase().includes("titular");
  const escribanoCaracterTexto = escribano.caracter || (() => {
    const esFemenino = (escribano.nombre || "").match(/\b(dra|dra\.|doctora|notaria)\b/i);
    const titulo = esFemenino ? "Notaria" : "Notario";
    return esTitular ? `${titulo} Titular` : `${titulo} Adscripta/o`;
  })();
  // Extraer título (Notaria/Notario) del caracter
  const escribanoTitulo = escribanoCaracterTexto.split(" ")[0] || "Notario";

  const vars = {
    // Defaults para variables de concordancia (se sobreescriben abajo si hay partes con roles)
    COMPARECE_TEXTO:           "**COMPARECE**",
    DICE_TEXTO:                "**DICE**",
    AUTORIZANTE_TEXTO:         "",
    AUTORIZANTES_UP:           "",
    AUTORIZANTE_CAPACIDAD:     "mayor de edad, quien justifica su identidad conforme a los términos del artículo 306 inciso a del Código Civil y Comercial de la Nación",
    DEL_DE_LA_COMPARECIENTE:  "del compareciente",
    EL_LA_COMPARECIENTE:      "el compareciente",
    EL_COMPARECIENTE_CIERRE:  "el compareciente",
    AUTORIZADOS_TEXTO:        "",
    AUTORIZADOS_UP:           "",
    FACULTADO_TEXTO:          "queda facultado",
    EL_AUTORIZADO_TEXTO:      "El autorizado asume",

    ESCRIBANO_NOMBRE:           (escribano.nombre || "").toUpperCase(),
    ESCRIBANO_REGISTRO:         escribano.registro || "",
    ESCRIBANO_CARACTER:         escribano.caracter || "",
    ESCRIBANO_CARACTER_TEXTO:   escribanoCaracterTexto,
    ESCRIBANO_TITULO:           escribanoTitulo,
    ESCRIBANO_CIRCUNSCRIPCION:  escribano.circunscripcion || "primera",
    ESCRIBANO_REGISTRO_LETRAS:  (() => {
      const n = parseInt(escribano.registro || "0");
      if (!n) return "";
      return numeroALetras(n).replace(/ CON 00\/100$/, "").toLowerCase();
    })(),
    // "del" para titular, "al" para adscripto/a
    ESCRIBANO_AL_DEL: esTitular ? "del" : "al",

    FECHA_DIA:          String(fecha.dia || 1).padStart(2, "0"),
    FECHA_MES:          String((fecha.mes || 0) + 1).padStart(2, "0"),
    FECHA_ANIO:         String(fecha.anio || new Date().getFullYear()),
    FECHA_DIA_LETRAS:   diaLetras(fecha.dia || 1),
    FECHA_MES_LETRAS:   MESES_UP[fecha.mes || 0] || "",
    FECHA_ANIO_LETRAS:  anioLetras(fecha.anio || new Date().getFullYear()),
    FECHA_CIUDAD:       fecha.ciudad || "Mendoza",

    PROTOCOLO_LIBRO:  protocolo.nroLibro || "",
    PROTOCOLO_ACTA:   protocolo.nroActa  || "",

    INSTRUMENTO: instrumento.descripcion || "",
  };

  partes.forEach((p, i) => {
    if (!p) return; // slot vacío — no se generan vars para esta posición
    const n = i + 1;
    // Formato: nombre capitalizado + apellido UPPERCASE (ej: "Raúl Alberto MORÁN")
    const nombreFmt   = toTitleCase(p.nombre);
    const apellidoFmt = (p.apellido || "").toUpperCase();
    const apellidoNombre = [nombreFmt, apellidoFmt].filter(Boolean).join(" ");
    const dni = fmtDni(p.nroDoc);
    const domicilio = fmtDomicilio(p);
    const genArticulo = p.genero === "M" ? "el señor" : "la señora";

    const esF = p.genero !== "M";
    vars[`PARTE_${n}_APELLIDO`]        = apellidoFmt;
    vars[`PARTE_${n}_NOMBRE`]          = nombreFmt;
    vars[`PARTE_${n}_NOMBRE_UP`]       = (p.nombre || "").toUpperCase();
    vars[`PARTE_${n}_COMPLETO_UP`]     = [(p.nombre || "").toUpperCase(), apellidoFmt].filter(Boolean).join(" ");
    vars[`PARTE_${n}_COMPLETO`]        = apellidoNombre;
    vars[`PARTE_${n}_DNI`]             = dni;
    vars[`PARTE_${n}_CUIT`]            = p.cuit         || "";
    vars[`PARTE_${n}_CUIT_LABEL`]      = p.cuit ? `, C.U.I.T./L. ${p.cuit}` : "";
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
    vars[`PARTE_${n}_INTERVIENE`]      = textoInterviene(p);

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

  // Variables pre-formateadas para autorizaciones (soporta múltiples autorizantes y autorizados)
  const fmtPersonaAut = (p) => {
    const art = p.genero === "M" ? "el señor" : "la señora";
    const nombre = [toTitleCase(p.nombre), (p.apellido||"").toUpperCase()].filter(Boolean).join(" ");
    const n = (p.nacionalidad||"").toLowerCase().trim();
    const masc = {argentina:"argentino",uruguaya:"uruguayo",chilena:"chileno",boliviana:"boliviano",peruana:"peruano",paraguaya:"paraguayo","brasileña":"brasileño",venezolana:"venezolano",colombiana:"colombiano"};
    const nac = p.genero==="M" ? (masc[n]||p.nacionalidad||"") : (p.nacionalidad||"");
    const dni = fmtDni(p.nroDoc);
    const dom = fmtDomicilio(p);
    const datos = [
      nac,
      dni ? `Documento Nacional de Identidad número ${dni}` : null,
      p.cuit ? `C.U.I.T./L. ${p.cuit}` : null,
      p.estadoCivil || null,
      dom ? `domicilio en ${dom}` : null,
    ].filter(Boolean).join(", ");
    return `**__${art} ${nombre}__**, ${datos}`;
  };

  const autorizantes = partes.filter(p => p?.rol?.toUpperCase().startsWith("AUTORIZANTE"));
  if (autorizantes.length > 0) {
    const textos = autorizantes.map(fmtPersonaAut);
    vars.AUTORIZANTE_TEXTO = textos.length === 1
      ? textos[0]
      : textos.slice(0,-1).join("; ") + "; y " + textos[textos.length-1];
    const plural = autorizantes.length > 1;
    vars.AUTORIZANTE_CAPACIDAD = plural
      ? "mayores de edad, quienes justifican su identidad conforme a los términos del artículo 306 inciso a del Código Civil y Comercial de la Nación"
      : "mayor de edad, quien justifica su identidad conforme a los términos del artículo 306 inciso a del Código Civil y Comercial de la Nación";
    // **COMPARECE** / **COMPARECEN** y **DICE** / **DICEN** — negrita + pluralidad
    vars.COMPARECE_TEXTO = plural ? "**COMPARECEN**" : "**COMPARECE**";
    vars.DICE_TEXTO       = plural ? "**DICEN**"      : "**DICE**";

    // Concordancia de género/número para el autorizante
    const todosM_aut = autorizantes.every(p => p.genero === "M");
    const hayF_aut   = autorizantes.some(p => p.genero === "F");
    // "la compareciente" / "el compareciente" / "los comparecientes" / "las comparecientes"
    vars.DEL_DE_LA_COMPARECIENTE = plural
      ? (todosM_aut ? "del compareciente" : "de los comparecientes")
      : (autorizantes[0]?.genero === "M" ? "del compareciente" : "de la compareciente");
    vars.EL_LA_COMPARECIENTE = plural
      ? (todosM_aut ? "el compareciente" : hayF_aut ? "los comparecientes" : "el compareciente")
      : (autorizantes[0]?.genero === "M" ? "el compareciente" : "la compareciente");
    vars.LOS_LAS_COMPARECIENTES = plural
      ? (todosM_aut ? "los comparecientes" : "los/las comparecientes")
      : (autorizantes[0]?.genero === "M" ? "el compareciente" : "la compareciente");

    // Para el HEADER: nombres de autorizantes en todo uppercase
    vars.AUTORIZANTES_UP = autorizantes
      .map(p => [(p.nombre||"").toUpperCase(), (p.apellido||"").toUpperCase()].filter(Boolean).join(" "))
      .join("; y ");
  }

  // Autorizados: lista de todos los autorizados para "a favor de:"
  const autorizados = partes.filter(p => p?.rol?.toUpperCase().startsWith("AUTORIZADO"));
  if (autorizados.length > 0) {
    const fmtAut = (p) => {
      const nombre = [toTitleCase(p.nombre), (p.apellido||"").toUpperCase()].filter(Boolean).join(" ");
      const nac = (() => {
        const n = (p.nacionalidad||"").toLowerCase().trim();
        const masc = {argentina:"argentino",uruguaya:"uruguayo",chilena:"chileno",boliviana:"boliviano",peruana:"peruano",paraguaya:"paraguayo","brasileña":"brasileño",venezolana:"venezolano",colombiana:"colombiano"};
        return p.genero==="M" ? (masc[n]||p.nacionalidad||"") : (p.nacionalidad||"");
      })();
      const dniP = fmtDni(p.nroDoc);
      return [`**__${nombre}__**`, nac, dniP ? `Documento Nacional de Identidad número ${dniP}` : null].filter(Boolean).join(", ");
    };
    const textos = autorizados.map(fmtAut);
    vars.AUTORIZADOS_TEXTO = textos.length === 1
      ? textos[0]
      : textos.slice(0,-1).join("; ") + "; y " + textos[textos.length-1];
    // Concordancia de género/número para el autorizado
    const pluralAut   = autorizados.length > 1;
    const todosM_aut2 = autorizados.every(p => p.genero === "M");
    vars.FACULTADO_TEXTO = pluralAut
      ? (todosM_aut2 ? "quedan facultados" : "quedan facultados/as")
      : (autorizados[0]?.genero === "F" ? "queda facultada" : "queda facultado");
    vars.EL_AUTORIZADO_TEXTO = pluralAut
      ? (todosM_aut2 ? "Los autorizados asumen" : "Los autorizados/as asumen")
      : (autorizados[0]?.genero === "F" ? "La autorizada asume" : "El autorizado asume");
    const pluralAut2 = autorizantes.length > 1;
    vars.EL_COMPARECIENTE_CIERRE = pluralAut2
      ? "los comparecientes"
      : (autorizantes[0]?.genero === "M" ? "el compareciente" : "la compareciente");

    // Para el HEADER: nombres de autorizados en todo uppercase
    vars.AUTORIZADOS_UP = autorizados
      .map(p => [(p.nombre||"").toUpperCase(), (p.apellido||"").toUpperCase()].filter(Boolean).join(" "))
      .join("; y ");
  }

  // Variables de vehículos — genera VEHICULO_N_* y VEHICULOS_LISTA
  if (vehiculos.length > 0) {
    vehiculos.forEach((v, i) => {
      const n = i + 1;
      vars[`VEHICULO_${n}_TIPO`]      = v.tipo_vehiculo || "VEHÍCULO";
      vars[`VEHICULO_${n}_MARCA`]     = v.marca         || "";
      vars[`VEHICULO_${n}_MODELO`]    = v.modelo        || "";
      vars[`VEHICULO_${n}_TIPO_DESC`] = v.tipo_desc     || "";
      vars[`VEHICULO_${n}_DOMINIO`]   = v.dominio       || "";
      vars[`VEHICULO_${n}_CHASIS`]    = v.chasis        || "";
      vars[`VEHICULO_${n}_MOTOR`]     = v.motor         || "";
    });

    // VEHICULOS_LISTA — texto formateado con marcadores de negrita
    const fmtVehiculo = (v) =>
      [
        v.marca     ? `Marca: **${v.marca}**`                             : null,
        v.modelo    ? `Modelo: **${v.modelo}**`                           : null,
        v.tipo_desc ? `Tipo: **${v.tipo_desc}**`                          : null,
        v.dominio   ? `Dominio: **${v.dominio}**${v.chasis ? ` Chasis: **${v.chasis}**` : ""}` : null,
        v.motor     ? `Motor: **${v.motor}**`                             : null,
      ].filter(Boolean).join(", ");

    vars.VEHICULOS_LISTA = vehiculos.length === 1
      ? fmtVehiculo(vehiculos[0]) + ";"
      : vehiculos.map((v, i) => `${i + 1}) ${fmtVehiculo(v)}`).join("; ") + ";";

    // TIPO_VEHICULO y TIPO_VEHICULO_MIN derivados del array
    const tipos = [...new Set(vehiculos.map(v => (v.tipo_vehiculo || "VEHÍCULO").toUpperCase()))];
    vars.TIPO_VEHICULO     = tipos.length === 1 ? tipos[0] : "VEHÍCULOS";
    vars.TIPO_VEHICULO_MIN = tipos.length === 1
      ? (tipos[0] === "MOTOVEHÍCULO" ? "moto vehículo" : "vehículo")
      : "vehículos";
  }

  // Variables extra del template (inyectadas desde el editor)
  Object.assign(vars, extravars);

  return vars;
}

export function sustituirVars(texto, vars) {
  let result = texto.replace(/\{\{([^}]+)\}\}/g, (match, key) =>
    vars[key] !== undefined ? vars[key] : match
  );
  // Limpiar comas/espacios huérfanos cuando una variable queda vacía
  // ej: "DNI 123, , domicilio" → "DNI 123, domicilio"
  result = result.replace(/,\s*,/g, ",").replace(/,\s*;/g, ";").replace(/\(\s*\)/g, "");
  return result;
}
