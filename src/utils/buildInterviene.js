/**
 * Lógica compartida para generar el bloque INTERVIENE de representaciones.
 * Usada por todos los builders (F08, cert_firma, genérico vía buildVars).
 */

/**
 * Genera texto plano del bloque INTERVIENE para una parte.
 * Usado en buildVars → {{PARTE_N_INTERVIENE}} para templates genéricos.
 */
export function textoInterviene(p) {
  const reprs = p?.representaciones || [];
  if (!reprs.length) return "";

  const bloques = [];

  for (const repr of reprs) {
    const esPF = repr.tipo === "pf_apoderado";
    const esPJ = repr.tipo === "pj_apoderado" || repr.tipo === "pj_representante";

    if (esPF) {
      const nombre = [(repr.repr_nombre||"").toUpperCase(), (repr.repr_apellido||"").toUpperCase()].filter(Boolean).join(" ");
      const art    = repr.repr_genero === "F" ? "de la señora" : "del señor";
      const dni    = repr.repr_dni ? `, con Documento Nacional de Identidad número ${fmtDniTexto(repr.repr_dni)}` : "";
      const docs   = repr.documentacion
        ? `; con facultades suficientes para este acto a mérito de la siguiente documentación: ${repr.documentacion}.-`
        : "";
      bloques.push(`INTERVIENE: en nombre y representación ${art} ${nombre}${dni}${docs} Documentación que para este acto he tenido a la vista, doy fe`);
    }

    if (esPJ) {
      const rs     = (repr.razon_social || "").toUpperCase();
      const cuit   = repr.cuit_sociedad   ? `, C.U.I.T. número ${repr.cuit_sociedad}` : "";
      const dom    = repr.domicilio_social ? `, con domicilio en ${repr.domicilio_social}` : "";
      const car    = repr.caracter         ? `; en su carácter de ${repr.caracter.toUpperCase()}` : "";
      const docs   = repr.documentacion
        ? `, con facultades suficientes para el presente acto, conforme lo que acredita con la siguiente documentación: ${repr.documentacion}.-`
        : "";
      bloques.push(`INTERVIENE: en nombre y representación de ${rs}${cuit}${dom}${car}${docs} Documentación que para este acto he tenido a la vista, doy fe`);
    }
  }

  return bloques.join(" ") ;
}

function fmtDniTexto(val) {
  if (!val) return "";
  const n = Number(String(val).replace(/\D/g, ""));
  return isNaN(n) ? "" : n.toLocaleString("es-AR");
}

/**
 * Genera TextRuns del bloque INTERVIENE para builders programáticos (F08, cert_firma).
 * @param {Object} p - parte
 * @param {Function} r  - función TextRun normal
 * @param {Function} vRun - función TextRun con highlight de variable
 * @param {Function} fmtDni - función de formato de DNI
 */
export function runsInterviene(p, r, vRun, fmtDni) {
  const reprs = p?.representaciones || [];
  const runs  = [];

  for (const repr of reprs) {
    const esPF = repr.tipo === "pf_apoderado";
    const esPJ = repr.tipo === "pj_apoderado" || repr.tipo === "pj_representante";

    if (esPF) {
      const nombre = [(repr.repr_nombre||"").toUpperCase(), (repr.repr_apellido||"").toUpperCase()].filter(Boolean).join(" ");
      const art    = repr.repr_genero === "F" ? "de la señora" : "del señor";
      runs.push(r(`.- INTERVIENE: en nombre y representación ${art} `));
      runs.push(vRun("REPRESENTADO", nombre, true));
      if (repr.repr_dni) {
        runs.push(r(", con Documento Nacional de Identidad número "));
        runs.push(vRun("DNI REP", fmtDni(repr.repr_dni)));
      }
      if (repr.documentacion) {
        runs.push(r(`; con facultades suficientes para este acto a mérito de la siguiente documentación: ${repr.documentacion}.-`));
      }
      runs.push(r(" Documentación que para este acto he tenido a la vista, doy fe"));
    }

    if (esPJ) {
      runs.push(r(".- INTERVIENE: en nombre y representación de "));
      runs.push(vRun("RAZÓN SOCIAL", (repr.razon_social||"").toUpperCase(), true));
      if (repr.cuit_sociedad)   { runs.push(r(`, C.U.I.T. número ${repr.cuit_sociedad}`)); }
      if (repr.domicilio_social){ runs.push(r(`, con domicilio en ${repr.domicilio_social}`)); }
      if (repr.caracter)        { runs.push(r("; en su carácter de ")); runs.push(vRun("CARÁCTER", repr.caracter.toUpperCase(), true)); }
      if (repr.documentacion) {
        runs.push(r(`, con facultades suficientes para el presente acto, conforme lo que acredita con la siguiente documentación: ${repr.documentacion}.-`));
      }
      runs.push(r(" Documentación que para este acto he tenido a la vista, doy fe"));
    }
  }

  return runs;
}
