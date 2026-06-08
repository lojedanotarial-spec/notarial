import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import JSZip from "jszip";
import { runsInterviene } from "./buildInterviene";

async function inyectarMargenesSimetricos(blob) {
  const buf = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const file = zip.file("word/settings.xml");
  if (!file) return blob;
  let xml = await file.async("string");
  if (!xml.includes("w:mirrorMargins")) {
    xml = xml.replace("</w:settings>", "<w:mirrorMargins/></w:settings>");
    zip.file("word/settings.xml", xml);
  }
  const nuevo = await zip.generateAsync({ type: "arraybuffer" });
  return new Blob([nuevo], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

const mm2twip = (mm) => Math.round(mm * 56.69);

export async function buildDocxBlanco({ escribano, margenKey = "protocolar", fontSize = 11, fuente, estilos = {} }) {
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2;
  const margenes = margenKey === "protocolar"
    ? { top: mm2twip(10), bottom: mm2twip(10), left: mm2twip(35), right: mm2twip(20) }
    : { top: mm2twip(20), bottom: mm2twip(20), left: mm2twip(25), right: mm2twip(25) };

  const escribanoNombre = (estilos.escribanoUppercase ?? true)
    ? (escribano?.nombre || "").toUpperCase()
    : (escribano?.nombre || "");

  const doc = new Document({
    sections: [{
      properties: { page: { margin: margenes } },
      children: [
        new Paragraph({
          children: [new TextRun({ text: escribanoNombre, bold: estilos.escribanoNegrita ?? true, size, font: fontName })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ children: [new TextRun({ text: "", size, font: fontName })] }),
      ],
    }],
  });
  return Packer.toBlob(doc);
}

// Orden de grupos para cert_firma_f08
const F08_ROL_INFO = {
  'VENDEDOR':                { g:0, o:0 }, 'VENDEDORA':                { g:0, o:0 },
  'CO-VENDEDOR':             { g:0, o:1 }, 'CO-VENDEDORA':             { g:0, o:1 },
  'CONYUGE DEL VENDEDOR':    { g:0, o:2 }, 'CÓNYUGE DEL VENDEDOR':     { g:0, o:2 },
  'CONYUGE DE LA VENDEDORA': { g:0, o:2 }, 'CÓNYUGE DE LA VENDEDORA':  { g:0, o:2 },
  'COMPRADOR':               { g:1, o:0 }, 'COMPRADORA':               { g:1, o:0 },
  'CO-COMPRADOR':            { g:1, o:1 }, 'CO-COMPRADORA':            { g:1, o:1 },
  'CONYUGE DEL COMPRADOR':   { g:1, o:2 }, 'CÓNYUGE DEL COMPRADOR':    { g:1, o:2 },
  'CONYUGE DEL COMPRADORA':  { g:1, o:2 }, 'CÓNYUGE DE LA COMPRADORA': { g:1, o:2 },
};

function ordenarPartesF08(partes) {
  return [...partes].sort((a, b) => {
    const rA = (a.rol||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const rB = (b.rol||'').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const infoA = F08_ROL_INFO[(a.rol||'').toUpperCase()] || F08_ROL_INFO[rA] || {g:9,o:9};
    const infoB = F08_ROL_INFO[(b.rol||'').toUpperCase()] || F08_ROL_INFO[rB] || {g:9,o:9};
    return infoA.g !== infoB.g ? infoA.g - infoB.g : infoA.o - infoB.o;
  });
}

export async function buildDocxCertFirmaF08({
  partes, escribano, fecha, protocolo, instrumento,
  instrTexto, fechaLetras, gen,
  showRol = true,
  margenKey = "protocolar",
  fontSize = 11,
  fuente,
  interlineado,
  estilos = {},
  showVarHighlight = true,
  extravars = {},
}) {
  const fontName = fuente?.family?.replace(/['"]/g, "").split(",")[0].trim() || "Times New Roman";
  const size = fontSize * 2; // docx uses half-points

  const nombresNegrita   = estilos.nombresNegrita   ?? true;
  const nombresSubrayado = estilos.nombresSubrayado ?? true;
  const nombresFormato   = estilos.nombresFormato   || "titlecase_upper";
  const escribanoNegrita  = estilos.escribanoNegrita  ?? true;
  const escribanoUppercase = estilos.escribanoUppercase ?? true;
  const fechaNegrita     = estilos.fechaNegrita     ?? true;

  const fmtDni = (val) =>
    val ? Number(String(val).replace(/\D/g, "")).toLocaleString("es-AR") : "";

  const fmtCuit = (c) => {
    if (!c) return "";
    const parts = c.split("-");
    return parts[0] + "-" + (parts[1] ? Number(parts[1]).toLocaleString("es-AR") : "") + "-" + (parts[2] || "");
  };

  const lang = { value: "es-AR", eastAsia: "es-AR", bidi: "es-AR" };

  const vRun = (label, value, bold = false, underline = false) =>
    new TextRun({
      text: value ? String(value) : `{{${label}}}`,
      bold: bold || (showVarHighlight && !value),
      underline: underline ? {} : undefined,
      color: showVarHighlight && !value ? "c0392b" : "1A2332",
      size,
      font: fontName,
      language: lang,
    });

  const r = (text, bold = false) =>
    new TextRun({ text: String(text), bold, size, font: fontName, language: lang });

  const al_del = escribano.caracter?.toLowerCase().includes("titular") ? "del" : "al";

  const MESES_NAC = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const fmtNac = (v) => {
    if (!v) return "";
    const pts = v.includes("-") ? v.split("-") : v.split("/").reverse();
    const [anio, mes, dia] = pts;
    return `${Number(dia)} de ${MESES_NAC[Number(mes)-1]||""} de ${anio}`;
  };
  const nacGenero = (nac, g) => {
    if (!nac) return "";
    const n = nac.toLowerCase().trim();
    const map = { argentina:"argentino", uruguaya:"uruguayo", chilena:"chileno", boliviana:"boliviano", peruana:"peruano", paraguaya:"paraguayo", "brasileña":"brasileño", venezolana:"venezolano", colombiana:"colombiano" };
    return g === "M" ? (map[n] || nac) : nac;
  };
  const fmtDom = (p) => [
    p.barrio  && "Barrio " + p.barrio,
    p.manzana && "Manzana " + p.manzana,
    p.casa    && "Casa " + p.casa,
    p.calle, p.numero,
    p.piso && "piso " + p.piso,
    p.dpto && "departamento " + p.dpto,
    p.localidad && p.departamento && p.localidad !== p.departamento
      ? p.localidad + " del departamento de " + p.departamento
      : (p.localidad || p.departamento),
  ].filter(Boolean).join(", ");

  // Ordenar partes: VENTA primero, COMPRA después; dentro de cada grupo por prioridad
  const partesOrdenadas = ordenarPartesF08(partes.filter(Boolean));

  const numFormulario = extravars.NUMERO_FORMULARIO || extravars.numero_formulario || "";
  const dominio       = extravars.DOMINIO           || extravars.dominio           || "";
  const nPartes       = partesOrdenadas.length;

  // Texto del bloque de partes
  const partesRuns = [];

  if (nPartes === 0) {
    partesRuns.push(vRun("PARTE", ""));
  } else {
    partesOrdenadas.forEach((p, idx) => {
      const art = gen(p, "la señora", "el señor");
      const toTC = s => (s||"").split(/\s+/).map(w => w ? w.charAt(0).toUpperCase()+w.slice(1).toLowerCase() : w).join(" ");
      const nombre = nombresFormato === "titlecase_both"
        ? [toTC(p.nombre), toTC(p.apellido)].filter(Boolean).join(" ")
        : nombresFormato === "uppercase"
          ? [(p.nombre||"").toUpperCase(), (p.apellido||"").toUpperCase()].filter(Boolean).join(" ")
          : [toTC(p.nombre), (p.apellido||"").toUpperCase()].filter(Boolean).join(" "); // titlecase_upper
      const dom = fmtDom(p);
      const elLaQue = gen(p, "la que", "el que");

      // Conector entre partes
      if (idx === 0) {
        partesRuns.push(r("ha sido puesta en mi presencia por " + art + " "));
      } else {
        partesRuns.push(r("; y " + art + " "));
      }

      partesRuns.push(vRun("NOMBRE", nombre, nombresNegrita, nombresSubrayado));
      if (p.nacionalidad) { partesRuns.push(r(", " + nacGenero(p.nacionalidad, p.genero))); }
      partesRuns.push(r(", con "));
      partesRuns.push(vRun("TIPO DOC", p.tipoDoc || "Documento Nacional de Identidad"));
      partesRuns.push(r(" número "));
      partesRuns.push(vRun("DNI", fmtDni(p.nroDoc)));
      if (p.cuit) {
        partesRuns.push(r(", con C.U.I.T./L. número "));
        partesRuns.push(vRun("CUIT", fmtCuit(p.cuit)));
      }
      if (p.fechaNac) {
        partesRuns.push(r(", nacid" + gen(p, "a", "o") + " el "));
        partesRuns.push(vRun("FECHA NAC", fmtNac(p.fechaNac)));
      }
      if (p.estadoCivil) {
        partesRuns.push(r(", quien manifiesta ser de estado civil "));
        partesRuns.push(vRun("ESTADO CIVIL", p.estadoCivil));
      }
      if (dom) {
        partesRuns.push(r(", con domicilio en "));
        partesRuns.push(vRun("DOMICILIO", dom));
        partesRuns.push(r(", de ésta Provincia de Mendoza"));
      }
      partesRuns.push(r("; datos que surgen del Documento Nacional de Identidad que he tenido a la vista para este acto, cuya copia archivo en ésta escribanía "));
      partesRuns.push(r(elLaQue + " firma en su carácter de "));
      partesRuns.push(vRun("ROL", p.rol, true));

      // Bloque INTERVIENE — función compartida
      runsInterviene(p, r, vRun, fmtDni).forEach(run => partesRuns.push(run));
    });

    // Cierre colectivo
    const plural = nPartes > 1;
    const fraseIdentidad = plural
      ? "; y cuyas identidades justifican conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhiben los documentos anteriormente relacionados cuyas copias archivo en esta escribanía.-"
      : "; y cuya identidad justifica conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhibe el documento anteriormente relacionado cuya copia archivo en esta escribanía.-";
    const fraseCapacidad = plural
      ? " Los comparecientes manifiestan no tener su capacidad de ejercicio restringida por sentencia alguna.-"
      : " " + gen(partesOrdenadas[0], "La compareciente", "El compareciente") + " manifiesta no tener su capacidad de ejercicio restringida por sentencia alguna.-";
    const fraseRequerimiento = plural
      ? " Los requerimientos respectivos han sido formalizados en Acta número "
      : " El requerimiento respectivo ha sido formalizado en Acta número ";

    partesRuns.push(r(fraseIdentidad + fraseCapacidad + fraseRequerimiento));
    partesRuns.push(vRun("N° ACTA", protocolo.nroActa));
    partesRuns.push(r(" Libro de Requerimientos para Certificaciones de Firmas número "));
    partesRuns.push(vRun("N° LIBRO", protocolo.nroLibro));
    partesRuns.push(r(".-"));
  }

  const margen = margenKey === "protocolar"
    ? { left: 36, top: 75, right: 14, bottom: 16 }
    : { left: 30, top: 35, right: 20, bottom: 20 };

  const escribanoNombreFmt = escribanoUppercase
    ? (escribano.nombre || "").toUpperCase()
    : (escribano.nombre || "");

  const mainRuns = [
    vRun("ESCRIBANO", escribanoNombreFmt, escribanoNegrita),
    r(", "),
    r(escribano.caracter || "Notario/a"),
    r(" " + al_del + " Registro Notarial número "),
    r(escribano.registro || ""),
    r(" de la "),
    r(escribano.circunscripcion ? escribano.circunscripcion + " circunscripción" : ""),
    r(", "),
    r("CERTIFICO:-", true),
    r(" Que las firmas que se encuentran insertas en el Formulario 08 N.° "),
    vRun("N° FORMULARIO", numFormulario),
    r(", perteneciente al dominio "),
    vRun("DOMINIO", dominio),
    r(", el que se encuentra parcialmente en blanco, adjunto a la presente Actuación Notarial, que lleva mi firma y sello; "),
    ...partesRuns,
    r(" En "),
    vRun("CIUDAD", fecha.ciudad ? fecha.ciudad.toUpperCase() : "", true),
    r(", Provincia de Mendoza, República Argentina, a "),
    vRun("FECHA", fechaLetras, fechaNegrita),
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

  const blob = await Packer.toBlob(doc);
  return margenKey === "protocolar" ? inyectarMargenesSimetricos(blob) : blob;
}
