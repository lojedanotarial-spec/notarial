# Spec: Captura de documentos desde el celular

**Estado:** 📝 borrador (fase 1 de 3 — pendiente de revisión) — NO pasar a `plan.md` hasta aprobarlo
**Feature:** [`features/captura-celular.md`](../../features/captura-celular.md)
**Epic:** [`epics/captura-documentos-multicanal.md`](../../epics/captura-documentos-multicanal.md)
**Casos de uso:** [UC-1](../../usecases/captura-desde-parte-generador.md) · [UC-2](../../usecases/captura-desde-scriba.md) · [UC-3](../../usecases/lote-multifoto-confirmacion.md) · [UC-4](../../usecases/foto-ilegible-reintento.md)
**Origen:** pedido de Lucas, 06/11/26

## Problema

Para que Notarial lea un documento de identidad o la tarjeta de un vehículo, el
documento tiene que estar como archivo en la compu. Quien tiene el documento en la
mano tiene que fotografiarlo con el celular, pasarlo a la compu por algún medio
ajeno a Notarial y recién ahí subirlo. Con documentos de dos caras y varias partes
por escritura, eso se repite muchas veces por trámite.

Además, cuando el escribano le pide algo a Scriba, Scriba no tiene forma de
recibir una foto sacada en el momento: solo lo que ya esté como archivo adjunto.

## Comportamiento actual (verificado leyendo el código, no supuesto)

- El generador manual tiene, junto a cada parte, un botón de escaneo que abre el
  selector de archivos de la compu. Acepta imágenes y PDF, varios a la vez.
- Cada archivo se lee por separado, uno tras otro, y los resultados se fusionan
  después (si dos archivos corresponden a la misma persona, se unifican).
- Scriba puede leer imágenes y PDF que el usuario le adjunta en la conversación, y
  tiene una herramienta para extraer datos de documentos de identidad y vehículos.
- La lectura distingue tres familias: frente de tarjeta de vehículo, dorso de
  tarjeta de vehículo y documentos de personas (DNI, licencia, pasaporte, partidas).
  Deja vacío lo que no puede leer con certeza.
- No hay ninguna forma de usar la cámara del celular como entrada.
- Existe, sin uso, infraestructura de una bandeja de fotos pendientes pensada para
  un bot de WhatsApp (diseño pausado: el registro del número en Meta falla).

## Comportamiento deseado (criterios de aceptación)

**Inicio de la captura**
- [ ] En el modal de partes comparecientes, cada parte tiene su propio botón para
      capturar desde el celular, y el código es **siempre de una sola parte**. Al
      usarlo no se le pregunta al usuario qué tipo de documento es ni de quién: la
      pantalla ya lo sabe. *(UC-1)*
- [ ] En el modal de vehículos, un mismo código sirve para capturar **varios
      vehículos seguidos**, sin tener que generar otro código por cada uno.
      *(UC-1)*
- [ ] Desde Scriba, pedir subir fotos hace que Scriba pregunte únicamente lo que
      falta para tener contexto (de quién, de qué tipo, cuántas fotos), y no repita
      lo que el usuario ya dijo. Recién entonces muestra el código dentro de la
      conversación. *(UC-2)*
- [ ] **Modo libre desde Scriba:** si el usuario dice que va a pasar "todo junto" (o
      el contexto sigue sin estar claro después de preguntar), Scriba ofrece el
      código igualmente, sin bloquear y sin preguntar de más. En ese modo el celular
      no exige una cantidad ni un tipo de fotos: se puede subir cualquier mezcla
      (por ejemplo dos DNI y una tarjeta de vehículo). *(UC-2)*
- [ ] En modo libre, cada foto se clasifica por lo que es (DNI, licencia, tarjeta
      de vehículo, otra cosa) y Scriba le cuenta al usuario qué encontró en
      conjunto. *(UC-2)*
- [ ] Scriba pregunta lo que no puede deducir con certeza (quién es el comprador y
      quién el vendedor, a qué vehículo corresponde cada foto) y no adivina. Lo que
      sí es inequívoco no lo pregunta. *(UC-2)*
- [ ] Con las respuestas, Scriba distribuye los datos en el documento que está
      abierto (partes y vehículos) por su cuenta, y puede mover o reasignar lo ya
      cargado si el usuario se lo pide. *(UC-2)*
- [ ] El código sirve para una sola captura, vence a los 10 minutos y solo permite
      subir fotos para ese contexto: no da acceso a nada más de la cuenta. El
      usuario puede cancelarlo desde la compu y deja de servir. *(UC-1, UC-2)*

**En el celular**
- [ ] Al escanear el código se abre la captura **sin pedir usuario ni contraseña**.
      *(UC-1, UC-2)*
- [ ] Se muestra qué se espera sacar ("Frente y dorso del DNI del COMPRADOR") y
      cuántas fotos van de las esperadas. *(UC-3)*
- [ ] Se pueden sacar varias fotos en el mismo lote (como mínimo las dos caras;
      hasta 20 por lote), ver las miniaturas y borrar o repetir cualquiera. *(UC-3)*
- [ ] No es solo modo cámara: se pueden elegir fotos que ya estaban guardadas en el
      celular (una o varias a la vez), capturas de pantalla del DNI digital y PDF,
      mezclables con fotos sacadas en el momento dentro del mismo lote. *(UC-3)*
- [ ] Las fotos se envían mientras se saca la siguiente; "listo" no obliga a esperar
      que se suba todo. *(UC-3)*
- [ ] Si el contexto esperaba más fotos de las sacadas, avisa cuál falta antes de
      dejar cerrar; siempre permite agregar más de las esperadas. *(UC-3)*
- [ ] Si se corta la conexión, las fotos ya sacadas no se pierden y se pueden
      reenviar; si vence el código, se avisa en el celular. *(UC-3)*

**Lectura**
- [ ] El lote se lee en conjunto: frente y dorso de la misma persona dan una sola
      persona; documentos de personas distintas dan una por cada una. *(UC-3)*
- [ ] Un dato ilegible o dudoso queda vacío y marcado como tal; nunca se estima ni
      se completa. *(UC-4)*
- [ ] Cuando una foto o un dato no es confiable (reflejo, desenfoque, corte), se le
      dice al usuario cuál foto repetir y por qué; no tiene que rehacer el lote.
      *(UC-4)*
- [ ] En los DNI, cuando la zona de lectura del dorso es legible, los datos clave
      (número, fecha de nacimiento) se contrastan con ella y las discrepancias se
      marcan. *(UC-4)*
- [ ] Antes de dar nada por cargado, el celular muestra lo leído y deja confirmar o
      repetir. *(UC-3)*

**Fotos que no coinciden con lo esperado** (aplica a las capturas con contexto
fijo: una parte o vehículos; en el modo libre de Scriba mezclar es lo normal)
- [ ] Captura de una parte: si el lote contiene fotos de más de una persona, el
      celular lo avisa y pregunta cuál es la de esa parte. Las demás no se pierden:
      en la compu se ofrecen para agregarlas como partes nuevas. *(UC-3)*
- [ ] Una misma persona con documentos distintos (por ejemplo DNI y licencia) se
      fusiona en una sola. Si los datos no coinciden, prevalece el DNI y la
      diferencia se marca para que el usuario la vea. *(UC-3, UC-4)*
- [ ] Captura de vehículos: el usuario arma en el celular los grupos de fotos de cada
      vehículo ("Vehículo 1", "Otro vehículo", ...). El sistema no adivina qué foto
      corresponde a qué vehículo; respeta los grupos. *(UC-3)*
- [ ] Una foto que no es de ningún documento esperado (otra cosa) se avisa y no se
      cuenta como parte del lote. *(UC-4)*

**Destino**
- [ ] Desde el generador manual, los datos confirmados aparecen en la parte
      correspondiente en la compu sin que el usuario toque nada. *(UC-1)*
- [ ] Los campos que el usuario ya había completado a mano no se pisan sin su
      confirmación. *(UC-1)*
- [ ] Desde Scriba, el resultado vuelve a la conversación y Scriba continúa por su
      cuenta, proponiendo qué hacer con lo leído. *(UC-2)*
- [ ] Cargar datos en el documento abierto (un borrador editable) no es lo mismo
      que guardarlos en el directorio de personas o vehículos: eso último nunca
      ocurre sin que el usuario lo confirme. *(UC-2, UC-3)*

**Privacidad y registro**
- [ ] Las fotos solo las puede ver el usuario que las sacó y su propio registro
      notarial; nunca otro registro. *(todos)*
- [ ] Las fotos se borran solas a las 72 horas. *(todos)*
- [ ] Queda constancia de quién subió, cuándo y para qué contexto, sin guardar el
      contenido leído en ese registro. *(todos)*
- [ ] Las fotos solo pasan por los servicios que Notarial ya usa para leer
      documentos; esta feature no suma ningún tercero nuevo. *(todos)*

**Tipos de documento en esta versión**
- [ ] Documentos de identidad (DNI, licencia, pasaporte) y tarjeta de vehículo
      (verde o azul, ambas caras), que es lo que la lectura actual ya sabe hacer.
      *(UC-1, UC-2)*

## Fuera de alcance (a propósito)

- Otros canales de entrada (WhatsApp, mail, Telegram, escáner físico, ícono propio
  en el celular). Este spec no debe impedirlos: el contexto, la lectura y el destino
  tienen que poder reutilizarse tal cual cuando se sumen.
- Que el requirente (el cliente) suba su propia documentación por un enlace.
- Documentos de varias páginas (escrituras antecedentes, títulos) y partidas: el
  contexto debe poder extenderse a ellos más adelante, pero no se leen en esta versión.
- Validar la identidad contra registros oficiales (RENAPER).
- Aplicación nativa para el celular, o uso sin conexión a internet.
- Cambiar el modelo o el prompt de lectura (se mide aparte; ver "Modelos de IA" en
  `BACKLOG.md`).

## Preguntas abiertas (a resolver antes de pasar a `plan.md`)

1. **¿iPhone o Android en el equipo?** No cambia lo que entrega esta versión, pero
   sí cuánto conviene invertir después en el ícono propio en el celular. Si hay
   iPhone, probar que las fotos HEIC de la galería se lean bien.
2. **¿Quién sube?** Se asume que solo usuarios del registro (quien tiene sesión en
   la compu y genera el código). ¿Confirmado?
3. ~~¿Un código por contexto o por sesión?~~ **Resuelto (06/11/26):** un código por
   parte, sin excepción; en vehículos, un código para varios (ver criterios).
4. **Retención de 72 h**: ¿suficiente, o querés que se borren apenas se confirma la
   lectura?
5. **Scriba, ¿carga directo o confirma antes?** Cuando no hay ninguna duda (por
   ejemplo un solo DNI y una sola parte vacía), propongo que cargue directo y lo
   avise, ya que es un borrador editable. ¿O preferís que siempre pregunte antes de
   mover datos?
6. **Revisión legal** de que las fotos de DNI se procesen en Estados Unidos
   (Anthropic, Supabase, Vercel). No es nuevo (el escaneo de hoy ya lo hace), pero
   esta feature aumenta el volumen: conviene confirmar con Fátima antes de lanzarla.
