import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";

const mm2twip = (mm) => Math.round(mm * 56.69);

export async function buildDocxBlanco({ escribano, margenKey = "protocolar", fontSize = 11, fuente }) {
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2;
  const margenes = margenKey === "protocolar"
    ? { top: mm2twip(10), bottom: mm2twip(10), left: mm2twip(35), right: mm2twip(20) }
    : { top: mm2twip(20), bottom: mm2twip(20), left: mm2twip(25), right: mm2twip(25) };

  const doc = new Document({
    sections: [{
      properties: { page: { margin: margenes } },
      children: [
        new Paragraph({
          children: [new TextRun({ text: escribano?.nombre || "", bold: true, size, font: fontName })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ children: [new TextRun({ text: "", size, font: fontName })] }),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

export async function buildDocxCertFirmaF08({
  partes, escribano, fecha, protocolo, instrumento,
  instrTexto, fechaLetras, gen,
  showRol = true,
  margenKey = "protocolar",
  fontSize = 11,
  fuente,
  interlineado,
  showVarHighlight = true,
}) {
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2; // docx uses half-points

  const fmtDni = (val) =>
    val ? Number(String(val).replace(/\D/g, "")).toLocaleString("es-AR") : "";

  const fmtCuit = (c) => {
    if (!c) return "";
    const parts = c.split("-");
    return parts[0] + "-" + (parts[1] ? Number(parts[1]).toLocaleString("es-AR") : "") + "-" + (parts[2] || "");
  };

  const lang = { value: "es-AR", eastAsia: "es-AR", bidi: "es-AR" };

  const vRun = (label, value, bold = false) =>
    new TextRun({
      text: value ? String(value) : `{{${label}}}`,
      bold: bold || (showVarHighlight && !value),
      color: showVarHighlight && !value ? "c0392b" : "1A2332",
      size,
      font: fontName,
      language: lang,
    });

  const r = (text, bold = false) =>
    new TextRun({ text: String(text), bold, size, font: fontName, language: lang });

  const al_del = escribano.caracter?.toLowerCase().includes("titular") ? "del" : "al";

  const partesRuns = [];
  if (partes.length === 0) {
    partesRuns.push(vRun("PARTE", ""));
  } else {
    const fraseIdentidad = partes.length === 1
      ? ", y cuya identidad justifica conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhibe el documento anteriormente relacionado cuya copia archivo en esta escribanía.- "
      : ", y cuyas identidades justifican conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhiben los documentos anteriormente relacionados cuyas copias archivo en esta escribanía.- ";
    const fraseCapacidad = partes.length === 1
      ? gen(partes[0], "La compareciente", "El compareciente") + " manifiesta no tener su capacidad de ejercicio restringida por sentencia alguna.-"
      : "Los comparecientes manifiestan no tener su capacidad de ejercicio restringida por sentencia alguna.-";

    partes.forEach((p, idx) => {
      const esUltima = idx === partes.length - 1;
      const domicilio = [
        p.calle, p.numero,
        p.piso && "piso " + p.piso,
        p.dpto && "departamento " + p.dpto,
        p.localidad,
      ].filter(Boolean).join(", ");

      if (idx === 0) partesRuns.push(r("por "));
      if (idx > 0 && !esUltima) partesRuns.push(r("; "));
      if (idx > 0 && esUltima) partesRuns.push(r("; y "));

      partesRuns.push(r(gen(p, "la señora", "el señor") + " "));
      const nombreCompleto = p.apellido
        ? p.apellido + (p.nombre ? ", " + p.nombre : "")
        : (p.nombre || "");
      partesRuns.push(vRun("APELLIDO Y NOMBRE", nombreCompleto, true));
      partesRuns.push(r(", "));
      partesRuns.push(vRun("NACIONALIDAD", p.nacionalidad));
      partesRuns.push(r(", con "));
      partesRuns.push(vRun("TIPO DOC", p.tipoDoc));
      partesRuns.push(r(" número "));
      partesRuns.push(vRun("N° DOCUMENTO", fmtDni(p.nroDoc)));
      if (p.cuit) {
        partesRuns.push(r(", C.U.I.T./L. "));
        partesRuns.push(vRun("CUIT/CUIL", fmtCuit(p.cuit)));
      }
      if (p.fechaNac) {
        const MESES_NAC = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
        const fmtNac = (v) => {
          if (!v) return v;
          const parts = v.includes("-") ? v.split("-") : v.split("/").reverse();
          const [anio, mes, dia] = parts;
          return `${Number(dia)} de ${MESES_NAC[Number(mes)-1] || ""} de ${anio}`;
        };
        partesRuns.push(r(", nacid" + gen(p, "a", "o") + " el "));
        partesRuns.push(vRun("FECHA NAC", fmtNac(p.fechaNac)));
      }
      partesRuns.push(r(", quien manifiesta ser de estado de familia "));
      partesRuns.push(vRun("ESTADO CIVIL", p.estadoCivil));
      if (domicilio) {
        partesRuns.push(r(", con domicilio en "));
        partesRuns.push(vRun("DOMICILIO", domicilio));
        partesRuns.push(r(", departamento "));
        partesRuns.push(vRun("DEPARTAMENTO", p.departamento));
        partesRuns.push(r(", de esta Provincia de Mendoza"));
      }
      if (showRol) {
        partesRuns.push(r("; datos que surgen del Documento Nacional de Identidad que he tenido a la vista para este acto, "));
        partesRuns.push(r(gen(p, "la que", "el que") + " firma en su carácter de "));
        partesRuns.push(vRun("ROL", p.rol, true));
      } else {
        partesRuns.push(r("; datos que surgen del Documento Nacional de Identidad que he tenido a la vista para este acto"));
      }
    });

    partesRuns.push(r(fraseIdentidad + fraseCapacidad));
  }

  const margen = margenKey === "protocolar"
    ? { left: 36, top: 76, right: 15, bottom: 20 }
    : { left: 30, top: 35, right: 20, bottom: 20 };

  const mainRuns = [
    vRun("ESCRIBANO", escribano.nombre, true),
    r(", "),
    r(escribano.caracter || "Notario/a"),
    r(" " + al_del + " Registro Notarial número "),
    r(escribano.registro || ""),
    r(" de la "),
    r(escribano.circunscripcion ? escribano.circunscripcion + " circunscripción" : ""),
    r(", "),
    r("CERTIFICO:-", true),
    r(" Que la firma que se encuentra inserta en "),
    vRun("INSTRUMENTO", instrTexto),
    instrumento.fojas ? r(", " + instrumento.fojas) : null,
    r(", que lleva mi firma y sello; ha sido puesta en mi presencia "),
    ...partesRuns,
    r(" El requerimiento respectivo ha sido formalizado en Acta número "),
    vRun("N° ACTA", protocolo.nroActa),
    r(" del "),
    vRun("LIBRO", protocolo.libro),
    r(" número "),
    vRun("N° LIBRO", protocolo.nroLibro),
    r(".- En "),
    vRun("CIUDAD", fecha.ciudad ? fecha.ciudad.toUpperCase() : "", true),
    r(", Provincia de Mendoza, República Argentina, a los "),
    vRun("FECHA", fechaLetras, true),
    r(".-"),
  ].filter(Boolean);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top:    mm2twip(margen.top),
            right:  mm2twip(margen.right),
            bottom: mm2twip(margen.bottom),
            left:   mm2twip(margen.left),
          },
          size: {
            width:  mm2twip(210),
            height: mm2twip(297),
          },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: interlineado?.line ?? 480, lineRule: interlineado?.rule ?? "exact" },
          children: mainRuns,
        }),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
