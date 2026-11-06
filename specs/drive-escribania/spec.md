# Spec: Drive de la escribanía — conexión y archivos del expediente

**Estado:** ✅ aprobado por Lucas el 06/11/26 (fase 1 de 3). Siguiente: [`plan.md`](plan.md) → `tasks.md`. NO escribir código hasta que `tasks.md` esté aprobado
**Feature:** [`features/drive-escribania.md`](../../features/drive-escribania.md)
**Epic:** [`epics/documentacion-expedientes-drive.md`](../../epics/documentacion-expedientes-drive.md)
**Casos de uso:** [UC-1](../../usecases/drive-conectar-escribania.md) · [UC-2](../../usecases/drive-archivos-expediente.md) · [UC-3](../../usecases/drive-conexion-rota.md)
**Origen:** conversación del 06/11/26 con Lucas y Fátima

## Problema

La documentación que trae la gente tiene que quedar ordenada y accesible para todo el registro,
asociada a su expediente. Hoy el sistema la guarda en Google Drive, pero de una forma que no sirve
al registro: el archivo queda en el Drive **personal** de quien lo sube, solo puede subir quien
entró a Notarial con Google, y la autorización de Google se pierde a la hora.

## Comportamiento actual (verificado leyendo el código y la base, no supuesto)

- Cada expediente tiene una pestaña de archivos que sube archivos a una carpeta de Drive propia del
  expediente, dentro de una carpeta raíz "Notarial". Los archivos se clasifican como DNI, tarjeta
  verde, poder, formulario 08 u otro.
- Todo se hace desde el navegador con la autorización de Google de la persona que inició sesión.
  Quien entra con email y contraseña no puede subir nada: la pantalla le pide "iniciar sesión con
  Google". De los 3 usuarios actuales, 2 entran con email.
- La autorización de Google se guarda en el navegador y vence a la hora; después aparece un mensaje
  pidiendo cerrar sesión y volver a entrar.
- Los expedientes y la lista de archivos de cada uno son visibles para todo el registro, pero el
  archivo en sí queda en el Drive de quien lo subió.
- Uso real: 5 expedientes, 4 archivos, todos de pruebas y de una sola persona.
- La carpeta de un expediente también se usa para Carga Masiva (barrios y lotes) con el mismo
  mecanismo personal.

## Comportamiento deseado (criterios de aceptación)

**Conexión (administrador)**
- [ ] Cada registro puede tener conectada **una sola** cuenta de Google, que es la de su
      escribanía. *(UC-1)*
- [ ] Solo el administrador de Notarial puede conectar, cambiar o desconectar esa cuenta. Ningún
      usuario del registro puede hacerlo, ni la titular desde Notarial. *(UC-1)*
- [ ] El administrador genera un enlace de un solo uso, con vencimiento corto, para que la persona
      que tiene el Gmail de la escribanía autorice la conexión **sin tener cuenta en Notarial y sin
      compartir su contraseña con nadie**. *(UC-1)*
- [ ] Un enlace vencido, ya usado o inválido no conecta nada y explica qué hacer. *(UC-1)*
- [ ] Si quien recibe el enlace rechaza la autorización, no queda nada conectado. *(UC-1)*
- [ ] En el panel de administración, cada registro muestra si tiene Drive conectado, con qué cuenta
      de Google, desde cuándo, quién lo conectó y cuánto espacio queda. *(UC-1, UC-3)*
- [ ] Desconectar un registro corta el acceso de inmediato y revoca la autorización en Google; los
      archivos ya guardados quedan en el Drive de la escribanía, intactos. *(UC-1)*
- [ ] La autorización de Google se guarda protegida: ningún usuario, ni el administrador desde la
      aplicación, puede verla. *(UC-1)*

**Archivos del expediente (usuarios del registro)**
- [ ] Cualquier usuario del registro, entre con email o con Google, puede subir, ver y descargar
      archivos de los expedientes de su registro, sin que se le pida iniciar sesión con Google.
      *(UC-2)*
- [ ] Los archivos se guardan en el Drive de la escribanía, en una carpeta por expediente dentro de
      "Notarial", y se clasifican con los mismos tipos de hoy. *(UC-2)*
- [ ] Todos los usuarios del registro ven los mismos archivos de cada expediente. Un usuario de otro
      registro no los ve ni los abre, ni siquiera conociendo la dirección de un archivo. *(UC-2)*
- [ ] Ver un archivo ocurre dentro de Notarial (vista previa o descarga); no exige que el usuario
      tenga acceso al Drive de la escribanía. *(UC-2)*
- [ ] Cada archivo muestra quién lo subió y cuándo. *(UC-2)*
- [ ] Queda registro de quién vio o descargó un archivo y de quién lo borró, con fecha y hora.
      *(UC-2)*
- [ ] Borrar un archivo lo saca de la lista pero queda recuperable (en la papelera de Drive).
      *(UC-2)*
- [ ] Se pueden subir varios archivos a la vez; cada uno informa su resultado y uno fallido no
      impide los demás. *(UC-2)*
- [ ] Se aceptan archivos de hasta 25 MB cada uno; uno mayor se rechaza con un mensaje claro.
      *(UC-2)*
- [ ] El límite de 25 MB se avisa **en la pantalla de subida**, antes de elegir los archivos
      ("Máximo 25 MB por archivo"), no solo cuando algo se rechaza. *(UC-2)*

**Conexión rota o espacio lleno**
- [ ] Si Google rechaza la conexión, los usuarios ven "El Drive de la escribanía no está
      disponible, avisale a quien administra Notarial", nunca un error técnico ni un pedido de
      iniciar sesión con Google. *(UC-3)*
- [ ] Lo que no se pudo subir se informa; nada se pierde en silencio. *(UC-3)*
- [ ] El administrador ve qué registros tienen la conexión caída, desde cuándo y por qué
      (revocada o sin espacio), y puede reconectar con un enlace nuevo. *(UC-3)*
- [ ] Con el 80 % del espacio usado, el administrador ve una advertencia. *(UC-3)*

**Lo que no cambia**
- [ ] El inicio de sesión de cada persona con su Gmail personal o con email sigue igual. *(todos)*
- [ ] Un registro sin Drive conectado sigue pudiendo usar Notarial entero; solo la pestaña de
      archivos le avisa que la escribanía todavía no conectó su Drive. *(UC-2)*

## Fuera de alcance (a propósito)

- Subir documentación **desde el celular** (siguiente feature del epic: depende de esta).
- Leer o nombrar automáticamente las fotos, unir las fotos de un documento en un PDF.
- Que Carga Masiva (barrios y lotes) use el Drive de la escribanía (queda con el mecanismo actual
  hasta una feature propia).
- Ver en Notarial los archivos que alguien suba a mano directamente en drive.google.com: Notarial
  solo ve los archivos que él mismo guardó.
- Copias de seguridad del contenido de Drive, y migrar los 4 archivos de prueba que hay hoy en un
  Drive personal (se dejan donde están).
- Permisos finos dentro del registro (quién puede borrar, quién solo ver): todos pueden todo,
  con registro de lo que hacen.

## Preguntas abiertas (a resolver antes de pasar a `plan.md`)

1. ~~¿Drive por escribano o por registro?~~ **Resuelto (06/11/26):** uno por registro.
2. ~~¿Quién conecta?~~ **Resuelto:** solo el administrador (Lucas).
3. ~~¿Los archivos se ven solo desde Notarial?~~ **Resuelto:** sí, todos entran por Notarial.
4. ~~Los 4 archivos de prueba~~ **Resuelto:** se ignoran.
5. ~~¿Qué cuenta de Google se usa para las pruebas?~~ **Resuelto (06/11/26):** el Drive de
   `lojeda.notarial@gmail.com`, conectado al registro de prueba. Solo para pruebas.
6. ~~¿Existe ya el Gmail de la escribanía de Fátima?~~ **Resuelto (06/11/26):** sí, Fátima tiene un
   mail de escribanía. Falta confirmar si es `@gmail.com` o un Google Workspace con dominio propio.
7. ~~Borrar~~ **Resuelto (06/11/26):** cualquier usuario del registro puede, igual que hoy puede
   en el Drive compartido de una escribanía. Queda registrado quién y recuperable en la papelera.
8. ~~Tope de 25 MB~~ **Resuelto (06/11/26):** 25 MB alcanza (sobra). Se agrega el aviso visible
   del límite en la pantalla de subida.
9. ~~Tipo de mail de la escribanía de Fátima~~ **Resuelto (06/11/26):** es `@gmail.com`, sirve.

**Datos de arranque:** registro de prueba = `9876` (el de Lucas, conectado al Drive de
`lojeda.notarial@gmail.com`); primera escribanía real = registro `853` (Fátima).
