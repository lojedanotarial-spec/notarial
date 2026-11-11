# Spec: Personas del expediente

**Estado:** ✅ aprobada por Lucas el 11/11/26 (fase 1 de 3), con sus respuestas a las preguntas abiertas (ver el final). Siguiente: [`plan.md`](plan.md)
**Feature:** [`features/personas-expediente.md`](../../features/personas-expediente.md)
**Epic:** [`epics/documentacion-expedientes-drive.md`](../../epics/documentacion-expedientes-drive.md)
**Casos de uso:** [UC-1](../../usecases/personas-expediente-ficha.md) · [UC-2](../../usecases/personas-expediente-archivos.md) · [UC-3](../../usecases/personas-expediente-traer-a-parte.md) · [UC-4](../../usecases/personas-expediente-ver-en-editor.md)
**Depende de:** [`specs/almacenamiento-propio/`](../almacenamiento-propio/spec.md) (los archivos viven en el almacén propio de Notarial, ya no en Drive; reemplaza a `drive-escribania`) y [`specs/documentacion-celular-expediente/`](../documentacion-celular-expediente/spec.md)
**Origen:** pedido de Lucas del 09/11/26, tras la primera prueba con la cuenta de Fátima. Dirección elegida por Lucas: la persona es **una sola ficha permanente del registro**, se completa en un modal a partir de las fotos, se guarda en la base y después se ofrece como sugerencia al armar las partes.

## Problema

1. La primera pregunta de la escribana es "¿soltero o casado?", y eso no figura en el DNI. Hoy no hay
   dónde anotarlo en el expediente, salvo un único campo de notas general.
2. Los archivos que se suben a un expediente y los documentos que se arman en él **no tienen ninguna
   conexión**. Después de subir el DNI, al crear el documento hay que subirlo o escanearlo de nuevo, y
   desde el documento no se pueden ver los archivos del expediente.
3. Cada vez que la misma persona aparece en otro trámite, sus datos se vuelven a cargar.

## Comportamiento actual (verificado leyendo el código, no supuesto)

- El expediente tiene dos pestañas, **Documentos** y **Archivos**, sin relación entre ellas.
- El expediente tiene un solo campo de **notas** de texto libre, sin estructura ni dueño.
- Los archivos tienen nombre, tipo y quién los subió; **no** tienen persona asociada.
- Existe una **libreta de personas del registro**: al guardar un documento, cada parte se guarda en ella
  (documento, domicilio, estado civil, etc.), y al armar una parte se puede buscar por DNI o apellido.
  No está conectada a los expedientes ni a los archivos, y nada impide que la misma persona quede
  repetida.
- El editor de partes tiene botones para escanear un documento del dispositivo, del celular (QR) o de
  una carpeta de Drive de un lote de barrio. **Ninguno** lee los archivos de un expediente.
- **Un documento NO queda vinculado a su expediente al crearlo, ni siquiera desde el expediente** (verificado el 11/11/26 leyendo el código): el botón "+ Nuevo documento" del expediente le pasa el expediente a la pantalla de selección, y esa pantalla lo descarta. El vínculo solo se arma a mano, con "Agregar a expediente" dentro del editor, que además te lleva a la pantalla del expediente.

## Comportamiento deseado (criterios de aceptación)

**La persona es una ficha permanente del registro** *(UC-1)*
- [ ] Cada persona existe **una sola vez** en el registro y se reutiliza en todos sus trámites. Si se
      intenta crear una con un DNI que ya existe, el sistema avisa y ofrece usar la existente.
- [ ] El expediente tiene una pestaña **Personas** con quienes intervienen en él. Se agrega una persona
      **existente** (buscándola por DNI o apellido) o **nueva**; se puede quitar del expediente sin
      borrar la ficha.
- [ ] Todos los usuarios del registro ven las mismas fichas; los de otros registros, nunca.

**Completar el perfil en un modal** *(UC-1)*
- [ ] Desde la ficha hay un modal **Completar perfil** que reúne: los datos de la persona (los mismos
      que hoy tiene una parte: nombre, documento, CUIT, fecha de nacimiento, domicilio, etc.), **estado
      civil** (soltero/a, casado/a, divorciado/a, viudo/a, unión convivencial) y un **comentario libre**.
- [ ] Si la persona tiene archivos de identidad, el modal ofrece **Leer del DNI**: el sistema lee las
      fotos y **precarga** los datos. Nada se guarda hasta que el usuario revisa y toca **Guardar**.
      La lectura **solo ocurre cuando el usuario la pide**, nunca en segundo plano.
- [ ] Lo que escribe el usuario manda: la lectura nunca pisa un dato que ya se cargó sin avisar.
- [ ] La ficha muestra **cuándo se actualizó por última vez**, para que quien arma un documento sepa
      qué tan vigente es el estado civil.
- [ ] Cuando después de subir fotos (desde la compu o el celular) el sistema reconoce a alguien que no
      está en el expediente, **propone** agregarlo y abrir su perfil. **Nunca se crea ni se completa
      nada sin confirmación.**
- [ ] Todo cambio de una ficha, de sus archivos o de su pertenencia a un expediente queda en el
      historial del expediente.

**Archivos y personas** *(UC-2)*
- [ ] Cada archivo pertenece a **una persona o a ninguna**. En la pestaña **Archivos** se ve de quién
      es (o "Sin asignar") y se puede cambiar.
- [ ] La ficha de cada persona lista sus archivos, que se pueden abrir y bajar como siempre.
- [ ] Cuando el nombre automático de un archivo coincide con una persona, se **propone** asignarlo.
- [ ] Reasignar un archivo no lo mueve, no lo copia ni cambia el archivo guardado.
- [ ] Quitar a una persona de un expediente deja sus archivos en el expediente, sin asignar.

**Vincular el documento con su expediente** *(nuevo, pedido de Lucas el 11/11/26)*
- [ ] Al crear un documento **desde un expediente**, queda vinculado a él desde el primer guardado, sin pasos extra.
- [ ] Al crear un documento **desde cualquier otro lado**, hay un campo opcional **Expediente** para elegir uno del registro (con búsqueda) o dejarlo sin vincular.
- [ ] Dentro del editor se ve **a qué expediente pertenece** el documento, y se puede cambiar, quitar o vincular después, sin salir del documento.
- [ ] Apenas el documento está vinculado, el editor sabe dónde buscar la documentación: las personas y los archivos de ese expediente.

**Sugerencias al armar las partes** *(UC-3)*
- [ ] Con el documento vinculado a un expediente que tiene personas, las personas aparecen **ya a la vista arriba del editor de partes**, sin tener que abrir nada: tocar una la usa como parte.
- [ ] En el editor de partes de un documento vinculado a un expediente con personas, al elegir cada
      parte (1, 2, 3…) aparecen **las personas del expediente como sugerencias**, arriba de la
      búsqueda general de la libreta.
- [ ] Elegir una sugerencia completa la parte con los datos de la ficha **sin volver a leer ningún
      archivo**, con la concordancia de género que ya usa el editor.
- [ ] El comentario de la ficha y su fecha de actualización se muestran como recordatorio junto a la
      parte.
- [ ] Si la parte ya tenía datos, se avisa antes de reemplazarlos.
- [ ] El **rol** (comprador, vendedor, etc.) lo define el documento, no la ficha.
- [ ] El documento guarda **su propia copia** de los datos de cada parte: cambiar una ficha después no
      altera documentos ya armados.
- [ ] Una misma persona no puede ser dos partes del mismo documento (se avisa).

**Ver archivos mientras se edita** *(UC-4)*
- [ ] En el editor de un documento vinculado a un expediente hay un botón **Archivos del expediente**
      que abre un panel con la lista agrupada por persona (y "Sin asignar").
- [ ] Desde el panel se puede abrir o bajar un archivo. No modifica el documento.
- [ ] Si el documento no está en un expediente, el botón no aparece. Si los archivos no se pueden cargar, se
      explica por qué, sin mensajes técnicos.

**Seguridad y privacidad**
- [ ] Fichas, pertenencia a expedientes y asociaciones con archivos respetan la misma regla que los
      archivos: solo las ve el registro dueño.
- [ ] Borrar un expediente borra su historial y la pertenencia de las personas a él, pero **no borra la
      ficha**, que es del registro. Borrar una ficha pide confirmación y la saca de todos los expedientes.
- [ ] La lectura automática de los archivos en segundo plano (la que solo les pone nombre) sigue
      guardando únicamente el nombre y el tipo. Los datos completos solo se guardan cuando una persona
      los revisó y los confirmó.

## Fuera de alcance (primera versión)

- Archivos que correspondan a **más de una persona** (un poder, una partida de matrimonio): quedan sin
  asignar y se aclara en el comentario.
- Cónyuge, régimen patrimonial o nupcias como datos propios o vinculados: van en el comentario por ahora.
- Que Scriba lea las fichas.
- Completar la parte sin que el usuario elija a la persona.
- Fusionar fichas repetidas que ya existan en la libreta actual.
- Asociar el archivo a una persona desde la pantalla del celular al subir.

## Decisiones de Lucas (11/11/26)

1. **Dónde se completa el perfil:** en la compu, después de que las fotos llegan desde el celular (asumido: Lucas no objetó; completarlo desde el celular queda para una versión posterior).
2. **Estado civil:** un **desplegable** con los estados civiles (soltero/a, casado/a, divorciado/a, viudo/a, unión convivencial) y un **campo de notas**. Si hace falta algo más (el cónyuge, el régimen), va en las notas; no se vincula con la ficha del cónyuge por ahora.
3. **Pestaña Personas:** aprobada, **primera** y abierta al entrar al expediente ("ok, a ver cómo queda").
4. **Fichas repetidas:** las fotos se guardan **por expediente** y las personas **en la base**, una sola vez por registro. Si al crear o completar una persona ya existe otra con el mismo documento, el sistema **avisa y ofrece actualizar la existente** (ya figuraba en la primera sección). Las repetidas que ya existen hoy (11 fichas) no se revisan en bloque: se avisa cuando una de ellas aparece. No hay pantalla de "posibles repetidos".
