# Spec: Subir documentación al expediente desde el celular

**Estado:** 📝 borrador (fase 1 de 3) — pendiente de aprobación de Lucas. NO pasar a `plan.md` hasta entonces
**Feature:** [`features/subir-documentacion-celular.md`](../../features/subir-documentacion-celular.md)
**Epic:** [`epics/documentacion-expedientes-drive.md`](../../epics/documentacion-expedientes-drive.md)
**Casos de uso:** [UC-1](../../usecases/documentacion-celular-subir.md) · [UC-2](../../usecases/documentacion-celular-fallas.md) · [UC-3](../../usecases/documentacion-celular-deshacer.md)
**Depende de:** [`specs/drive-escribania/`](../drive-escribania/spec.md) (en producción desde el 09/11/26)
**Origen:** pedido de Lucas del 06/11/26 y del 09/11/26 ("subir por QR… la cámara full power")

## Problema

Hoy la documentación que trae la gente se sube a un expediente **solo desde la compu**, eligiendo
archivos que ya están ahí. Eso obliga a pasar las fotos del celular a la compu (WhatsApp, cable,
mail) antes de poder guardarlas. Además, la captura por QR que ya existe no sirve para esto: lee los
datos del documento y **destruye** la foto.

## Comportamiento actual (verificado, no supuesto)

- La pestaña **Archivos** de un expediente sube archivos desde la compu al Drive de la escribanía
  (ya conectado en el registro de prueba) y los lista con quién los subió. No tiene forma de recibir
  fotos del celular.
- La captura por QR existe en tres modos (una parte, vehículos, libre vía Scriba): el celular abre
  una página sin login, saca fotos, el sistema las **lee** y las destruye al entregar los datos.
- La cámara de esa página reduce las fotos a 2000 px para que la lectura sea rápida; no sirve tal
  cual para archivar en calidad original.
- Subir un archivo desde el navegador al Drive de la escribanía ya funciona sin que el archivo pase
  por los servidores de Notarial (límite 25 MB por archivo).

## Comportamiento deseado (criterios de aceptación)

**En la compu (usuario del registro)**
- [ ] La pestaña **Archivos** tiene un botón **Subir desde el celular** que muestra un QR. Lo puede
      usar cualquier usuario del registro, entre con email o con Google. *(UC-1)*
- [ ] El QR sirve solo para **ese expediente**. Quien lo escanea no puede ver, listar ni bajar nada
      del expediente ni del Drive: solo agregar archivos. *(UC-1)*
- [ ] Si el registro no tiene Drive conectado o la conexión está caída, el botón explica por qué no
      se puede, con el mismo mensaje de siempre. *(UC-2)*
- [ ] Mientras la sesión está abierta, los archivos que llegan **aparecen solos** en la lista del
      expediente, sin recargar, con su tipo y la marca "desde el celular". *(UC-1)*
- [ ] Desde la compu se puede **cerrar la sesión** en cualquier momento; el celular deja de poder
      subir de inmediato y lo ya subido queda guardado. *(UC-1, UC-2)*

**En el celular (sin iniciar sesión)**
- [ ] Al escanear el QR se abre una página que ya sabe de qué expediente se trata y lo muestra
      ("Expediente: Compraventa García"). No hay que escribir ni elegir nada para empezar. *(UC-1)*
- [ ] Se elige el **tipo** antes de sacar las fotos (DNI, tarjeta verde, poder, formulario 08,
      otro) y se puede cambiar entre grupos con un botón "Otro documento". *(UC-1)*
- [ ] Hay tres formas de cargar archivos: la cámara dentro de la página (varias fotos seguidas, sin
      flash), la cámara del teléfono (foto de resolución completa) y la galería o archivos del
      teléfono (incluye PDF). Funciona en iPhone y en Android. *(UC-1)*
- [ ] Las fotos se guardan en **calidad original**: no se reducen ni se vuelven a comprimir las que
      vienen de la galería o de la cámara del teléfono; la cámara de la página usa la máxima
      resolución que el teléfono permita. Tope de 25 MB por archivo. *(UC-1)*
- [ ] Se sube de a un archivo por vez y cada uno muestra su avance y su resultado ("✓ Guardada").
      Si uno falla, se puede reintentar sin repetir los demás. *(UC-1, UC-2)*
- [ ] La página muestra lo subido en la sesión, con una miniatura y el tipo de cada foto, y un
      contador. *(UC-1, UC-3)*
- [ ] Se puede **quitar** una foto subida en esa misma sesión, con confirmación. Queda en la papelera
      del Drive y se registra. Lo que no se subió en esa sesión no se puede ver ni quitar desde el
      celular. *(UC-3)*
- [ ] Un archivo de más de 25 MB se rechaza diciendo cuál es, sin frenar a los demás. *(UC-1)*

**Fallas**
- [ ] Si el QR venció o se cerró la sesión desde la compu, el celular lo dice con claridad, informa
      cuántas fotos quedaron sin guardar y cómo seguir. Lo ya subido no se pierde. *(UC-2)*
- [ ] Si se corta internet, las fotos pendientes siguen en la pantalla del celular y se pueden
      reintentar; nunca se pierden en silencio. *(UC-2)*
- [ ] Si el Drive no está disponible o sin espacio, se muestra el mismo mensaje claro que en la
      compu, sin errores técnicos. *(UC-2)*

**Registro y privacidad**
- [ ] Cada archivo queda registrado con **el usuario que generó el QR**, la fecha y hora, y que fue
      "desde el celular". Cada archivo quitado también. *(UC-1, UC-3)*
- [ ] A diferencia de la captura de datos, **las fotos no se destruyen**: quedan en el Drive de la
      escribanía, que es el destino buscado. En ningún momento se guardan en la base ni en los
      servidores de Notarial. *(UC-1)*

**Lo que no cambia**
- [ ] La captura de datos desde el celular (partes, vehículos, Scriba) sigue igual. *(todos)*
- [ ] Subir desde la compu con el botón **Subir archivos** sigue igual. *(todos)*

## Fuera de alcance (a propósito)

- Leer el documento y completar datos automáticamente, o ponerle nombre solo al archivo según lo que
  dice (posible feature futura).
- Unir las fotos de un mismo documento en un solo PDF.
- Escáner físico, WhatsApp u otros canales de entrada.
- Subir videos.
- Ver desde el celular los archivos que ya tiene el expediente.
- Carga Masiva (barrios y lotes) sobre el Drive de la escribanía.

## Preguntas abiertas (a resolver antes de pasar a `plan.md`)

1. **¿Cuánto dura el QR?** Propuesta: se renueva con cada foto y vence tras **30 minutos sin
   actividad**, con un tope de **2 horas**. Más largo que el de la captura de datos (10 minutos y 1
   hora) porque acá una sesión puede incluir varios documentos de una persona.
2. **¿Cómo se llaman los archivos?** Propuesta: las fotos de la cámara salen con nombre automático
   (por ejemplo `DNI 1.jpg`, `DNI 2.jpg`, `Tarjeta verde 1.jpg`) y las de la galería **conservan su
   nombre original**. Los nombres como `IMG_4821.jpg` no dicen nada, pero cambiarlos en una foto
   que ya tiene nombre propio puede confundir.
3. **¿Cuántos archivos por sesión?** Propuesta: tope de **60**, para que una sesión olvidada no
   llene el Drive.
4. **¿Quién figura como "subió"?** Propuesta: el usuario que generó el QR, con la marca "desde el
   celular". El celular no tiene sesión, así que no hay otra persona para atribuirle.
5. **¿Alcanza con "calidad original" así?** La cámara que se abre dentro de la página puede usar
   hasta la resolución máxima que el navegador del teléfono le entregue (normalmente entre 8 y 12
   megapíxeles, no siempre el sensor completo). La cámara del propio teléfono y la galería sí
   entregan la foto completa. Propongo ofrecer las tres y que cada uno use la que prefiera.
6. **¿Quitar desde el celular está bien?** Propuesta: solo lo subido en esa misma sesión, con
   confirmación, a la papelera de Drive. Lo demás se borra desde la compu.
