-- ============================================================
-- Actualización de contenido de templates notariales
-- Sistema de variables: {{VARIABLE_NAME}}
-- Variables disponibles en templateVars.js
-- ============================================================

-- PODER ESPECIAL
UPDATE templates SET contenido = 'En la ciudad de {{FECHA_CIUDAD}}, Provincia de Mendoza, República Argentina, a los {{FECHA_DIA_LETRAS}} días del mes de {{FECHA_MES_LETRAS}} de {{FECHA_ANIO_LETRAS}}, ante mí, {{ESCRIBANO_NOMBRE}}, Notario/a {{ESCRIBANO_CARACTER}} del Registro Notarial Número {{ESCRIBANO_REGISTRO}} de la {{ESCRIBANO_CIRCUNSCRIPCION}} circunscripción de la Provincia de Mendoza.

COMPARECE: {{PARTE_1_IDENTIDAD}}, quien justifica su identidad mediante el Documento Nacional de Identidad relacionado, conforme art. 306, inc. a) del Código Civil y Comercial de la Nación, doy fe.

INTERVIENE por sí y EXPRESA:

PODER ESPECIAL

PRIMERO: Que por medio del presente instrumento, el/la compareciente confiere PODER ESPECIAL a favor de {{PARTE_2_COMPLETO}}, DNI Nro. {{PARTE_2_DNI}}, CUIL/CUIT {{PARTE_2_CUIT}}, con domicilio en {{PARTE_2_DOMICILIO}}, en adelante el/la APODERADO/A, para que en su nombre y representación pueda: {{INSTRUMENTO}}.

SEGUNDO: El/la APODERADO/A queda facultado/a para realizar todos los actos jurídicos, gestiones administrativas, otorgar y suscribir escrituras e instrumentos públicos y privados, firmar documentos y declaraciones juradas, e interponer recursos y reclamos que sean necesarios para el cumplimiento del objeto de este poder ante cualquier organismo público o privado, nacional, provincial o municipal.

TERCERO: El presente poder es de carácter especial y revocable. Se extingue una vez cumplido su objeto o por revocación expresa del poderdante.

LEO la presente escritura al/la compareciente, quien presta su conformidad y firma conjuntamente conmigo, ante mí, doy fe.' WHERE slug = 'poder_especial';

-- PODER GENERAL
UPDATE templates SET contenido = 'En la ciudad de {{FECHA_CIUDAD}}, Provincia de Mendoza, República Argentina, a los {{FECHA_DIA_LETRAS}} días del mes de {{FECHA_MES_LETRAS}} de {{FECHA_ANIO_LETRAS}}, ante mí, {{ESCRIBANO_NOMBRE}}, Notario/a {{ESCRIBANO_CARACTER}} del Registro Notarial Número {{ESCRIBANO_REGISTRO}} de la {{ESCRIBANO_CIRCUNSCRIPCION}} circunscripción de la Provincia de Mendoza.

COMPARECE: {{PARTE_1_IDENTIDAD}}, quien justifica su identidad mediante el Documento Nacional de Identidad relacionado, conforme art. 306, inc. a) del Código Civil y Comercial de la Nación, doy fe.

INTERVIENE por sí y EXPRESA:

PODER GENERAL AMPLIO DE ADMINISTRACIÓN Y DISPOSICIÓN

PRIMERO: Que por medio del presente instrumento, el/la compareciente confiere PODER GENERAL AMPLIO DE ADMINISTRACIÓN Y DISPOSICIÓN a favor de {{PARTE_2_COMPLETO}}, DNI Nro. {{PARTE_2_DNI}}, CUIL/CUIT {{PARTE_2_CUIT}}, con domicilio en {{PARTE_2_DOMICILIO}}, en adelante el/la APODERADO/A.

SEGUNDO: En virtud del presente poder, el/la APODERADO/A queda ampliamente facultado/a para representar al poderdante en todos los actos de administración y disposición de sus bienes, incluyendo entre otras las siguientes facultades: a) Administrar bienes inmuebles, muebles y semovientes; b) Comprar, vender, permutar, donar, hipotecar, gravar o de cualquier modo disponer de bienes; c) Cobrar y percibir toda clase de créditos, sumas de dinero y valores; d) Celebrar contratos de locación, comodato, mutuo y toda clase de contratos civiles y comerciales; e) Representar al poderdante ante toda clase de organismos públicos y privados, nacionales, provinciales y municipales; f) Iniciar, proseguir y desistir de acciones judiciales y administrativas; g) Sustituir este poder en todo o en parte.

TERCERO: El presente poder es de carácter general y revocable, de conformidad con lo establecido por el Código Civil y Comercial de la Nación.

LEO la presente escritura al/la compareciente, quien presta su conformidad y firma conjuntamente conmigo, ante mí, doy fe.' WHERE slug = 'poder_general';

-- CERTIFICACIÓN DE FIRMA (sin F08)
UPDATE templates SET contenido = 'En la ciudad de {{FECHA_CIUDAD}}, Provincia de Mendoza, República Argentina, a los {{FECHA_DIA_LETRAS}} días del mes de {{FECHA_MES_LETRAS}} de {{FECHA_ANIO_LETRAS}}, ante mí, {{ESCRIBANO_NOMBRE}}, Notario/a {{ESCRIBANO_CARACTER}} del Registro Notarial Número {{ESCRIBANO_REGISTRO}} de la {{ESCRIBANO_CIRCUNSCRIPCION}} circunscripción de la Provincia de Mendoza.

COMPARECE: {{PARTE_1_IDENTIDAD}}, quien justifica su identidad mediante el Documento Nacional de Identidad relacionado, conforme art. 306, inc. a) del Código Civil y Comercial de la Nación, doy fe.

CERTIFICO: Que la firma que se encuentra inserta en el instrumento adjunto a la presente Actuación Notarial, que lleva mi firma y sello, ha sido puesta en mi presencia por {{PARTE_1_ARTICULO}} {{PARTE_1_COMPLETO}}, quien manifiesta ser de estado de familia {{PARTE_1_ESTADO_CIVIL}}, argentina/o, con DNI número {{PARTE_1_DNI}}; datos que surgen del Documento Nacional de Identidad que he tenido a la vista para este acto, la que firma en su carácter de {{PARTE_1_ROL}}, y cuya identidad justifico conforme al artículo 306, incisos a) del Código Civil y Comercial de la Nación, me exhibe el documento anteriormente relacionado cuya copia archivo en esta escribanía.

La compareciente manifiesta no tener su capacidad de ejercicio restringida por sentencia alguna.

El requerimiento respectivo ha sido formalizado en Acta número {{PROTOCOLO_ACTA}} del Libro de Requerimientos para Certificaciones de Firmas número {{PROTOCOLO_LIBRO}}.

En {{FECHA_CIUDAD}}, Provincia de Mendoza, República Argentina, a los {{FECHA_DIA_LETRAS}} días del mes de {{FECHA_MES_LETRAS}} de {{FECHA_ANIO_LETRAS}}.' WHERE slug = 'cert_firma';

-- ACTA DE CONSTATACIÓN
UPDATE templates SET contenido = 'En la ciudad de {{FECHA_CIUDAD}}, Provincia de Mendoza, República Argentina, a los {{FECHA_DIA_LETRAS}} días del mes de {{FECHA_MES_LETRAS}} de {{FECHA_ANIO_LETRAS}}, siendo las _____ horas, yo, {{ESCRIBANO_NOMBRE}}, Notario/a {{ESCRIBANO_CARACTER}} del Registro Notarial Número {{ESCRIBANO_REGISTRO}} de la {{ESCRIBANO_CIRCUNSCRIPCION}} circunscripción de la Provincia de Mendoza, a requerimiento de {{PARTE_1_IDENTIDAD}}, quien justifica su identidad mediante el Documento Nacional de Identidad relacionado, conforme art. 306, inc. a) del Código Civil y Comercial de la Nación, doy fe.

ACTA DE CONSTATACIÓN

Me constituyo en {{INSTRUMENTO}}, a los efectos de constatar el estado de situación que a continuación se describe:

HECHOS CONSTATADOS: [Descripción de los hechos constatados]

Las presentes constancias se extienden en _____ (cantidad) folios del protocolo a pedido del requirente, quien las firma conjuntamente conmigo, ante mí, doy fe.' WHERE slug = 'acta_constatacion';
