// Genera el SQL de inserción para las 16 cláusulas nuevas de compraventa.
// Uso: node scripts/seed_clausulas_compraventa.mjs > /tmp/seed.sql
// (script de un solo uso, no forma parte del build de la app)

const TPL = {
  urbana: "449e5acf-5484-4891-8b77-07ddddd90a2e",
  ph: "44be6a84-4f37-495a-9e95-180298069c3c",
  boleto: "70cc60b5-e77e-4867-b151-4e75ee68ef08",
  lote: "f5a9e19d-7e13-4c43-8933-9196a839ceac",
  rural: "fda809dd-cbb8-485d-84a9-8d79ea76c5f8",
};
const TODAS = [TPL.urbana, TPL.ph, TPL.boleto, TPL.lote, TPL.rural];
const ESCRITURA = [TPL.urbana, TPL.ph, TPL.lote, TPL.rural];

const CLAUSULAS = [
  {
    slug: "mejor_comprador", titulo: "Pacto de mejor comprador",
    descripcion: "Otorga al vendedor el derecho de dejar sin efecto la venta si consigue un mejor comprador dentro de un plazo, salvo que el comprador original iguale la oferta (derecho de preferencia).",
    templates: [TPL.boleto],
    variables: [
      { name: "PLAZO_MEJOR_COMPRADOR", label: "Plazo para conseguir mejor comprador (días)" },
      { name: "PLAZO_COMUNICACION_OFERTA", label: "Plazo para comunicar la oferta (días)" },
      { name: "PLAZO_EJERCICIO_PREFERENCIA", label: "Plazo para ejercer la preferencia (días)" },
    ],
    contenido: `Esta venta se realiza con "PACTO DE MEJOR COMPRADOR" a favor de {{PARTE_1_ROL}}, que se somete al procedimiento siguiente: A) si dentro de {{PLAZO_MEJOR_COMPRADOR}} días de la fecha, {{PARTE_1_ROL}} consiguiera un mejor comprador del inmueble vendido, quedará sin efecto alguno esta venta efectuada a favor de {{PARTE_2_ROL}}, salvo que este comunique fehacientemente a aquel su ofrecimiento de compra por el mismo precio, condiciones, plazo de pago y demás términos propuestos por el pretenso comprador, en cuyo caso {{PARTE_2_ROL}} tendrá derecho de preferencia para consolidar la venta a su favor. El plazo indicado a favor de {{PARTE_1_ROL}} es de caducidad, por lo que a su vencimiento se extingue el pacto de mejor comprador establecido a su favor. B) {{PARTE_1_ROL}} debe comunicar en forma fehaciente a {{PARTE_2_ROL}} dentro de los {{PLAZO_COMUNICACION_OFERTA}} días de existir, la oferta de compra formulada por el tercero pretenso comprador y todo su contenido y condiciones, para que {{PARTE_2_ROL}} pueda ejercer su derecho de preferencia. C) Este derecho de preferencia deberá ser ejercido dentro de los {{PLAZO_EJERCICIO_PREFERENCIA}} días de recibida la comunicación, y quedará sin efecto alguno en caso de no ser ejercido y comunicado dentro del plazo indicado. D) Efectuada en tiempo y forma la comunicación indicada en el apart. B) precedente y no ejercida la preferencia, la venta podrá ser realizada al tercero ofertante y {{PARTE_2_ROL}} nada tendrá que reclamar por ningún concepto derivado de esta operación. E) Si la venta no se concretara con el tercero pretenso comprador, renacerán los derechos de mejor comprador y de preferencia establecidos en esta cláusula a favor de {{PARTE_1_ROL}} y {{PARTE_2_ROL}}, respectivamente.`,
  },
  {
    slug: "entrega_posesion_post_boleto", titulo: "Entrega de posesión posterior al boleto",
    descripcion: "Fija que la posesión del inmueble se entrega en un plazo posterior a la firma del boleto, condicionado a que el comprador esté al día con los pagos.",
    templates: [TPL.boleto],
    variables: [{ name: "PLAZO_ENTREGA_POSESION", label: "Plazo para entregar la posesión (días)" }],
    contenido: `La posesión del inmueble vendido será entregada a {{PARTE_2_ROL}} dentro de un plazo de {{PLAZO_ENTREGA_POSESION}} días a contar de la fecha, siempre que {{PARTE_2_ROL}} se encontrare al día en el cumplimiento de las cuotas de pago del precio de este boleto y demás obligaciones asumidas.`,
  },
  {
    slug: "improcedencia_asentimiento_conyugal", titulo: "Improcedencia del asentimiento conyugal",
    descripcion: "Deja constancia de que el inmueble es bien propio del vendedor y nunca fue vivienda familiar, por lo que no corresponde el asentimiento del cónyuge.",
    templates: TODAS,
    variables: [],
    contenido: `{{PARTE_1_ROL}} manifiesta que el inmueble que por este acto se transfiere es un bien que reúne el carácter de propio, conforme a los antecedentes de dominio referidos en esta escritura, y que no es, ni ha sido nunca, vivienda familiar de conformidad a los arts. 469 y 456 del Código Civil y Comercial, razón por la cual no resulta procedente legalmente la comparecencia de su cónyuge a asentir este acto de venta.`,
  },
  {
    slug: "asentimiento_convivencial", titulo: "Asentimiento del conviviente",
    descripcion: "El conviviente de una unión convivencial inscripta presta su asentimiento a la venta, en los términos del art. 522 del Código Civil y Comercial.",
    templates: TODAS,
    variables: [
      { name: "NOMBRE_CONVIVIENTE", label: "Nombre del conviviente" },
      { name: "DNI_CONVIVIENTE", label: "DNI del conviviente" },
      { name: "DOMICILIO_CONVIVIENTE", label: "Domicilio del conviviente" },
      { name: "FECHA_INSCRIPCION_UNION", label: "Fecha de inscripción de la unión convivencial" },
      { name: "REGISTRO_UNION", label: "Registro donde se inscribió la unión convivencial" },
    ],
    contenido: `{{NOMBRE_CONVIVIENTE}}, DNI {{DNI_CONVIVIENTE}}, con domicilio en {{DOMICILIO_CONVIVIENTE}}, en unión convivencial inscripta con {{PARTE_1_ROL}}, manifiesta que a todos los efectos legales presta su asentimiento a la venta instrumentada en la presente escritura en los términos del art. 522 del Código Civil y Comercial. La unión convivencial fue inscripta con fecha {{FECHA_INSCRIPCION_UNION}} en el Registro {{REGISTRO_UNION}}, según constancia original que tengo a la vista cuya copia autenticada agrego a la presente a todos los efectos que correspondan.`,
  },
  {
    slug: "venta_ad_corpus", titulo: "Venta ad corpus",
    descripcion: "La venta se realiza sin consideración a la superficie exacta del inmueble; ninguna parte puede reclamar por diferencias de medida.",
    templates: TODAS,
    variables: [],
    contenido: `La venta del inmueble enajenado se realiza ad corpus, sin consideración a sus medidas o superficie, por lo que las partes no podrán realizarse reclamo alguno de ningún tipo fundado en que el inmueble vendido tiene una superficie o área mayor o menor a la que ellas suponían o pretendían.`,
  },
  {
    slug: "venta_ad_mensuram", titulo: "Venta ad mensuram",
    descripcion: "El precio se determina en función de la superficie real del inmueble, verificada mediante una mensura a realizar dentro de un plazo.",
    templates: TODAS,
    variables: [
      { name: "PLAZO_MENSURA", label: "Plazo para realizar la mensura (días)" },
      { name: "PROFESIONAL_MENSURA", label: "Profesional designado para la mensura" },
    ],
    contenido: `El precio total de esta venta surgirá de la superficie real del inmueble vendido, para lo cual las partes deben realizar una mensura de sus dimensiones y superficie dentro de los {{PLAZO_MENSURA}} días de la fecha de este acuerdo. La mensura debe ser realizada por {{PROFESIONAL_MENSURA}}, que las partes designan de común acuerdo. El resultado de la mensura es irrevocable y no podrá ser objeto de impugnación alguna por ninguna de las partes, que expresamente se someten a su resultado y al precio definitivo de esta venta que surja en función de la superficie concreta del inmueble que sea determinada por el profesional actuante. Los gastos y honorarios de la mensura estarán a cargo de {{PARTE_1_ROL}}.`,
  },
  {
    slug: "titulos_perfectos_boleto", titulo: "Títulos perfectos (boleto)",
    descripcion: "El vendedor garantiza que, al momento de escriturar, el inmueble estará libre de gravámenes, embargos o restricciones, y él mismo libre de inhibiciones.",
    templates: [TPL.boleto],
    variables: [],
    contenido: `El inmueble objeto de esta compraventa se encontrará, a la fecha en que se otorgue la escritura traslativa de dominio a favor de {{PARTE_2_ROL}}, libre de toda restricción, limitación, gravamen, derecho real, embargo y/o afectación como vivienda, y libre {{PARTE_1_ROL}} de toda restricción, interdicción y/o inhibición para enajenar el inmueble de su titularidad dominial.`,
  },
  {
    slug: "exclusion_responsabilidad_saneamiento", titulo: "Exclusión de responsabilidad por saneamiento",
    descripcion: "El comprador asume el riesgo del negocio y el vendedor queda liberado de responder por evicción o vicios ocultos.",
    templates: TODAS,
    variables: [],
    contenido: `Esta compraventa es realizada a riesgo expresamente asumido por {{PARTE_2_ROL}}, por lo cual {{PARTE_1_ROL}} no responderá frente a {{PARTE_2_ROL}} por ningún hecho que dé lugar a evicción total o parcial del inmueble vendido, ni por ninguna pretensión judicial o extrajudicial por la cual cualquier tercero reclamare o pretendiera algún derecho sobre el inmueble objeto de esta venta. Tampoco {{PARTE_1_ROL}} responderá por vicios ocultos ni redhibitorios de ninguna especie, todo lo cual es expresamente asumido por {{PARTE_2_ROL}}.`,
  },
  {
    slug: "limitacion_responsabilidad_saneamiento", titulo: "Limitación de responsabilidad por saneamiento",
    descripcion: "La responsabilidad del vendedor por saneamiento se limita a los supuestos específicos que se detallen.",
    templates: TODAS,
    variables: [{ name: "DETALLE_LIMITACION_SANEAMIENTO", label: "Supuestos por los que el vendedor sí responde", type: "texto_largo" }],
    contenido: `La responsabilidad de {{PARTE_1_ROL}} por saneamiento frente a {{PARTE_2_ROL}} se limita únicamente a los siguientes supuestos: {{DETALLE_LIMITACION_SANEAMIENTO}}. Fuera de los casos aludidos, {{PARTE_1_ROL}} no responderá de modo alguno frente a {{PARTE_2_ROL}} por saneamiento.`,
  },
  {
    slug: "venta_cosa_ajena_boleto", titulo: "Venta de cosa ajena (boleto)",
    descripcion: "El vendedor reconoce que el inmueble aún no es de su propiedad y se compromete a adquirirlo dentro de un plazo para poder transferirlo.",
    templates: [TPL.boleto],
    variables: [{ name: "PLAZO_ADQUISICION_INMUEBLE", label: "Plazo para adquirir el inmueble (días)" }],
    contenido: `Las partes reconocen y dejan aclarado que el inmueble objeto de esta operación no es de propiedad de {{PARTE_1_ROL}} al día de la fecha. Por lo tanto, {{PARTE_1_ROL}} asume el compromiso firme e irrevocable y garantiza a {{PARTE_2_ROL}} que adquirirá el inmueble de su actual propietario dentro de los {{PLAZO_ADQUISICION_INMUEBLE}} días de este acuerdo, con quien ha mantenido conversaciones favorables antes de ahora con la finalidad de adquirir el inmueble. {{PARTE_1_ROL}} será exclusivamente responsable frente a {{PARTE_2_ROL}} por los daños y perjuicios que se ocasionen a este en caso de que no pueda adquirir el inmueble del actual propietario, por cualquier motivo que sea, incluso por caso fortuito o fuerza mayor. Concretada la adquisición del inmueble y recibido por {{PARTE_1_ROL}}, este deberá entregarlo a {{PARTE_2_ROL}} en los términos, condiciones y bajo las responsabilidades establecidas en este contrato.`,
  },
  {
    slug: "resolutoria_expresa", titulo: "Cláusula resolutoria expresa",
    descripcion: "Ante el incumplimiento de cualquiera de las partes, la otra puede exigir el cumplimiento con una multa diaria, o resolver el contrato reteniendo o reintegrando lo pagado como indemnización.",
    templates: TODAS,
    variables: [
      { name: "MONTO_MULTA_DIARIA_COMPRADOR", label: "Multa diaria por incumplimiento del comprador" },
      { name: "MONTO_MULTA_DIARIA_VENDEDOR", label: "Multa diaria por incumplimiento del vendedor" },
      { name: "PLAZO_HORAS_REINTEGRO", label: "Plazo para reintegrar sumas (horas)" },
    ],
    contenido: `En caso de incumplimiento de {{PARTE_2_ROL}} a las obligaciones a su cargo asumidas en este contrato, {{PARTE_1_ROL}} está facultada alternativamente para: a) reclamar el cumplimiento de este contrato, con más una multa diaria en concepto de indemnización de $ {{MONTO_MULTA_DIARIA_COMPRADOR}} que se devengará desde la mora y hasta el efectivo y completo cumplimiento de la prestación debida; o b) resolver este contrato notificando su decisión de forma fehaciente, en cuyo caso las sumas de dinero recibidas hasta el ejercicio de esta facultad resolutoria quedarán a su exclusivo beneficio como indemnización única por todos los daños y perjuicios ocasionados, y el inmueble objeto de la venta queda liberado para ser comercializado a cualquier tercero. En caso de incumplimiento de {{PARTE_1_ROL}} a las obligaciones a su cargo, {{PARTE_2_ROL}} queda facultada alternativamente para: a) reclamar el cumplimiento de este contrato, con más una multa diaria en concepto de indemnización de $ {{MONTO_MULTA_DIARIA_VENDEDOR}} que se devengará desde la mora hasta el efectivo y completo cumplimiento de la prestación debida; o b) resolver este contrato notificando su decisión de forma fehaciente, en cuyo caso {{PARTE_1_ROL}} deberá reintegrar a {{PARTE_2_ROL}} las sumas de dinero recibidas hasta el ejercicio de esta facultad resolutoria, más otro tanto dinerario de idéntico monto, en concepto de única indemnización por todos los daños y perjuicios ocasionados. Estas sumas dinerarias deben ser abonadas en la misma moneda entregada por {{PARTE_2_ROL}}, en el domicilio constituido por esta en este acuerdo, dentro de las {{PLAZO_HORAS_REINTEGRO}} horas de ser notificada la resolución de este contrato.`,
  },
  {
    slug: "reconocimiento_embargo", titulo: "Reconocimiento de embargo vigente",
    descripcion: "Deja constancia de que sobre el inmueble pesa un embargo, cuyos datos se detallan en las constancias notariales de la escritura.",
    templates: ESCRITURA,
    variables: [],
    contenido: `{{PARTE_1_ROL}} manifiesta que sobre el inmueble descripto pesa un embargo cuyos datos se relacionarán en el apartado "Constancias Notariales" de esta escritura.`,
  },
  {
    slug: "embargo_cargo_comprador_registral", titulo: "Embargo pagado, pendiente de cancelación registral",
    descripcion: "El vendedor deja constancia de que la deuda que originó un embargo sobre el inmueble ya fue pagada, aunque la cancelación registral está pendiente de trámite.",
    templates: ESCRITURA,
    variables: [],
    contenido: `{{PARTE_1_ROL}} manifiesta que la deuda que originó el embargo trabado sobre el inmueble objeto de esta venta, cuyos datos se relacionarán en el apartado "Constancias Notariales" de esta escritura, ha sido abonada totalmente, exhibiendo en este acto los respectivos comprobantes de pago, así como de accesorios, gastos, costas y honorarios, quedando pendiente el trámite de cancelación registral de dicho embargo.`,
  },
  {
    slug: "reconocimiento_hipoteca_extinguida", titulo: "Hipoteca extinguida, pendiente de cancelación registral",
    descripcion: "Deja constancia de que la hipoteca que pesa sobre el inmueble ya está extinguida, aunque la cancelación registral está pendiente.",
    templates: ESCRITURA,
    variables: [{ name: "CAUSAL_EXTINCION_HIPOTECA", label: "Causal y prueba de extinción de la hipoteca" }],
    contenido: `{{PARTE_1_ROL}} manifiesta que sobre el inmueble descripto se publicita un derecho real de hipoteca, cuyos datos se relacionarán en el apartado "Constancias Notariales" de esta escritura, el que se encuentra extinguido por {{CAUSAL_EXTINCION_HIPOTECA}}, encontrándose pendiente el trámite de cancelación de su inscripción registral.`,
  },
  {
    slug: "reconocimiento_hipoteca_vigente", titulo: "Hipoteca vigente sobre el inmueble",
    descripcion: "Deja constancia de que sobre el inmueble pesa una hipoteca vigente, cuyos datos se detallan en las constancias notariales.",
    templates: ESCRITURA,
    variables: [],
    contenido: `{{PARTE_1_ROL}} manifiesta que sobre el inmueble descripto pesa un derecho real de hipoteca, cuyos datos se relacionarán en el apartado "Constancias Notariales" de esta escritura.`,
  },
  {
    slug: "precio_con_saldo_retenido_hipoteca", titulo: "Precio con saldo retenido para cancelar hipoteca",
    descripcion: "Parte del precio se entrega en efectivo y el resto queda retenido por el comprador para cancelar la deuda hipotecaria que pesa sobre el inmueble.",
    templates: ESCRITURA,
    variables: [
      { name: "PRECIO_TOTAL_HIPOTECA", label: "Precio total de la venta" },
      { name: "MONTO_ENTREGADO_EFECTIVO", label: "Monto entregado en efectivo" },
      { name: "MONTO_RETENIDO_HIPOTECA", label: "Monto retenido para cancelar la hipoteca" },
    ],
    contenido: `Esta venta se realiza por el precio total, único y convenido de $ {{PRECIO_TOTAL_HIPOTECA}}, de los cuales la suma de $ {{MONTO_ENTREGADO_EFECTIVO}} {{PARTE_2_ROL}} entrega en este acto íntegramente en efectivo a {{PARTE_1_ROL}}, quien recibe de conformidad. El saldo, o sea la suma de $ {{MONTO_RETENIDO_HIPOTECA}}, es retenido por {{PARTE_2_ROL}} para abonar la deuda garantizada con el gravamen hipotecario en primer lugar y grado de privilegio que pesa sobre el inmueble y que más adelante se relacionará. {{PARTE_1_ROL}} otorga recibo de pago total y cancelatorio por la totalidad del precio de esta compraventa.`,
  },
];

function esc(s) { return s.replace(/'/g, "''"); }

const ordenPorTemplate = {};
const rows = [];
for (const c of CLAUSULAS) {
  for (const tid of c.templates) {
    ordenPorTemplate[tid] = (ordenPorTemplate[tid] || 2) + 1;
    rows.push(
      `('${tid}', '${esc(c.slug)}', '${esc(c.titulo)}', '${esc(c.descripcion)}', '${esc(c.contenido)}', '${esc(JSON.stringify(c.variables))}'::jsonb, true, ${ordenPorTemplate[tid]}, true)`
    );
  }
}

console.log(`insert into clausulas_biblioteca (template_id, slug, titulo, descripcion, contenido, variables_json, opcional, orden, activo) values`);
console.log(rows.join(",\n") + ";");
console.error(`-- ${rows.length} filas generadas de ${CLAUSULAS.length} cláusulas`);
