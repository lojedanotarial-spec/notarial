/**
 * Template: Certificacion de Firma (sin F08)
 * Igual al F08 pero sin el campo ROL de las partes.
 */

const v = (label, value) => {
  const isEmpty = !value;
  return '<span data-variable data-label="' + label + '" style="' +
    (isEmpty
      ? "color:#c0392b;font-weight:700;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;"
      : "color:#3a7ca5;font-weight:700;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;") +
    '">' + (isEmpty ? "{{" + label + "}}" : value) + "</span>";
};

export function buildCertFirma({ partes, escribano, fecha, protocolo, instrumento, instrTexto, fechaLetras, gen }) {
  const fmtDni  = (val) => val ? Number(String(val).replace(/\D/g, "")).toLocaleString("es-AR") : "";
  const fmtCuit = (c) => {
    if (!c) return "";
    const [pre, mid, suf] = c.split("-");
    return pre + "-" + (mid ? Number(mid).toLocaleString("es-AR") : "") + "-" + (suf || "");
  };

  let partesHTML = "";
  if (partes.length === 0) {
    partesHTML = v("PARTE", "");
  } else {
    const fraseIdentidad = partes.length === 1
      ? ", y cuya identidad justifica conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhibe el documento anteriormente relacionado cuya copia archivo en esta escribanía.- "
      : ", y cuyas identidades justifican conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhiben los documentos anteriormente relacionados cuyas copias archivo en esta escribanía.- ";
    const fraseCapacidad = partes.length === 1
      ? gen(partes[0], "La compareciente", "El compareciente") + " manifiesta no tener su capacidad de ejercicio restringida por sentencia alguna.-"
      : "Los comparecientes manifiestan no tener su capacidad de ejercicio restringida por sentencia alguna.-";

    partes.forEach((p, idx) => {
      const esUltima = idx === partes.length - 1;
      const domicilio = [p.calle, p.numero,
        p.piso && "piso " + p.piso,
        p.dpto && "departamento " + p.dpto,
        p.localidad,
      ].filter(Boolean).join(", ");

      if (idx === 0) partesHTML += "por ";
      if (idx > 0 && !esUltima) partesHTML += "; ";
      if (idx > 0 && esUltima)  partesHTML += "; y ";

      partesHTML += gen(p, "la señora", "el señor") + " ";
      partesHTML += v("APELLIDO Y NOMBRE", p.apellido ? p.apellido + (p.nombre ? ", " + p.nombre : "") : "");
      partesHTML += ", ";
      partesHTML += v("NACIONALIDAD", p.nacionalidad);
      partesHTML += ", con ";
      partesHTML += v("TIPO DOC", p.tipoDoc);
      partesHTML += " número ";
      partesHTML += v("N° DOCUMENTO", fmtDni(p.nroDoc));
      if (p.cuit) partesHTML += ", C.U.I.T./L. " + v("CUIT/CUIL", fmtCuit(p.cuit));
      if (p.fechaNac) partesHTML += ", nacid" + gen(p, "a", "o") + " el " + v("FECHA NAC", p.fechaNac);
      partesHTML += ", quien manifiesta ser de estado de familia ";
      partesHTML += v("ESTADO CIVIL", p.estadoCivil);
      if (domicilio) {
        partesHTML += ", con domicilio en " + v("DOMICILIO", domicilio);
        partesHTML += ", departamento " + v("DEPARTAMENTO", p.departamento);
        partesHTML += ", de esta Provincia de Mendoza";
      }
      partesHTML += "; datos que surgen del Documento Nacional de Identidad que he tenido a la vista para este acto";
    });
    partesHTML += fraseIdentidad + fraseCapacidad;
  }

  const al_del = escribano.caracter?.toLowerCase().includes("titular") ? "del" : "al";

  return "<p>" +
    "<strong>" + v("ESCRIBANO", escribano.nombre) + "</strong>, " +
    v("CARÁCTER", escribano.caracter) +
    " " + al_del + " Registro Notarial número " +
    v("N° REGISTRO", escribano.registro) +
    " de la " +
    v("CIRCUNSCRIPCIÓN", escribano.circunscripcion ? escribano.circunscripcion + " circunscripción" : "") +
    ", <strong>CERTIFICO:-</strong>" +
    " Que la firma que se encuentra inserta en " +
    v("INSTRUMENTO", instrTexto) +
    (instrumento.fojas ? ", " + instrumento.fojas : "") +
    ", que lleva mi firma y sello; ha sido puesta en mi presencia " +
    partesHTML +
    " El requerimiento respectivo ha sido formalizado en Acta número " +
    v("N° ACTA", protocolo.nroActa) +
    " del " +
    v("LIBRO", protocolo.libro) +
    " número " +
    v("N° LIBRO", protocolo.nroLibro) +
    ".- En " +
    v("CIUDAD", fecha.ciudad ? fecha.ciudad.toUpperCase() : "") +
    ", Provincia de Mendoza, República Argentina, a los " +
    v("FECHA", fechaLetras) +
    ".-</p>";
}
