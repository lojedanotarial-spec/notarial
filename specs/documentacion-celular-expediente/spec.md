# Spec: Subir documentación al expediente desde el celular

**Estado:** 📝 borrador revisado el 09/11/26 con las respuestas de Lucas (fase 1 de 3) — quedan 3 preguntas abiertas. NO pasar a `plan.md` hasta resolverlas y que Lucas apruebe
**Feature:** [`features/subir-documentacion-celular.md`](../../features/subir-documentacion-celular.md)
**Epic:** [`epics/documentacion-expedientes-drive.md`](../../epics/documentacion-expedientes-drive.md)
**Casos de uso:** [UC-1](../../usecases/documentacion-celular-subir.md) · [UC-2](../../usecases/documentacion-celular-fallas.md) · [UC-3](../../usecases/documentacion-celular-deshacer.md) · [UC-4](../../usecases/documentacion-celular-identificar.md)
**Depende de:** [`specs/drive-escribania/`](../drive-escribania/spec.md) (en producción desde el 09/11/26)
**Origen:** pedido de Lucas del 06/11/26 y del 09/11/26 ("subir por QR… la cámara full power")

## Problema

Hoy la documentación que trae la gente se sube a un expediente **solo desde la compu**, eligiendo
archivos que ya están ahí. Eso obliga a pasar las fotos del celular a la compu (WhatsApp, cable,
mail) antes de poder guardarlas. Además, la captura por QR que ya existe no sirve para esto: lee los
datos del documento y **destruye** la foto. Y clasificar cada foto a mano, de antemano, frena el
proceso: no siempre el tipo está en la lista y obliga a ir foto por foto.

## Comportamiento actual (verificado, no supuesto)

- La pestaña **Archivos** de un expediente sube archivos desde la compu al Drive de la escribanía
  (ya conectado en el registro de prueba) y los lista con quién los subió. El tipo se elige de una
  lista fija de cinco antes de subir. No tiene forma de recibir fotos del celular ni de nombrar los
  archivos según lo que contienen.
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
      expediente, sin recargar, con la marca "desde el celular". Mientras se identifican se ven como
      "Identificando…" y enseguida pasan a su nombre definitivo. *(UC-1, UC-4)*
- [ ] Desde la compu se puede **cerrar la sesión** en cualquier momento; el celular deja de poder
      subir de inmediato y lo ya subido queda guardado. *(UC-1, UC-2)*

**En el celular (sin iniciar sesión)**
- [ ] Al escanear el QR se abre una página que ya sabe de qué expediente se trata y lo muestra
      ("Expediente: Compraventa García"). No hay que escribir ni elegir nada para empezar. *(UC-1)*
- [ ] **No se elige el tipo de documento**: se sacan o se eligen todas las fotos de una, de
      cualquier tipo y mezcladas, y se suben. La clasificación la hace el sistema después. *(UC-1)*
- [ ] Hay tres formas de cargar archivos: la cámara dentro de la página (varias fotos seguidas, sin
      flash), la cámara del teléfono (foto de resolución completa) y la galería o archivos del
      teléfono (incluye PDF). Funciona en iPhone y en Android. *(UC-1)*
- [ ] Las fotos se guardan en **calidad original**: no se reducen ni se vuelven a comprimir las que
      vienen de la galería o de la cámara del teléfono; la cámara de la página usa la máxima
      resolución que el teléfono permita. Tope de 25 MB por archivo, **sin tope de cantidad**. *(UC-1)*
- [ ] Se sube de a un archivo por vez y cada uno muestra su avance y su resultado ("✓ Guardada").
      Si uno falla, se puede reintentar sin repetir los demás. *(UC-1, UC-2)*
- [ ] La página muestra lo subido en la sesión, con una miniatura de cada foto, y un contador.
      *(UC-1, UC-3)*
- [ ] Se puede **quitar** una foto subida en esa misma sesión, con confirmación. Queda en la papelera
      del Drive y se registra. Lo que no se subió en esa sesión no se puede ver ni quitar desde el
      celular. *(UC-3)*
- [ ] Un archivo de más de 25 MB se rechaza diciendo cuál es, sin frenar a los demás. *(UC-1)*

**Identificación y nombre automáticos (después de subir)**
- [ ] Cada archivo subido se **identifica solo**: se determina de qué documento es (DNI, tarjeta
      verde, poder, formulario 08, u otro) y se le pone un **nombre descriptivo** que incluye, cuando
      corresponde, **anverso o reverso**, o el **número de página** si el documento lo tiene.
      Ejemplos: `DNI García - anverso.jpg`, `Poder - pág 2.jpg`. *(UC-4)*
- [ ] La identificación **nunca demora ni frena la subida**: primero se guarda, después se
      identifica. *(UC-4)*
- [ ] El archivo original **no se modifica ni se vuelve a subir**: solo cambian su nombre y su tipo.
      *(UC-4)*
- [ ] Si no se puede identificar (foto borrosa, no es un documento, tipo que no está en la lista), el
      archivo conserva su nombre original, queda como tipo "otro" y con la marca **"Sin
      identificar"**. Nunca se inventa un nombre. *(UC-4)*
- [ ] **Se puede corregir el nombre y el tipo** de cualquier archivo desde la compu, por cualquier
      usuario del registro. Queda registrado quién y cuándo. *(UC-4)*
- [ ] De lo leído del documento **solo se guarda el nombre y el tipo resultantes**: ningún otro dato
      leído (números, domicilios, fechas) se guarda en ningún lado. *(UC-4)*

**Fallas**
- [ ] Si el QR venció o se cerró la sesión desde la compu, el celular lo dice con claridad, informa
      cuántas fotos quedaron sin guardar y cómo seguir. Lo ya subido no se pierde. *(UC-2)*
- [ ] Si se corta internet, las fotos pendientes siguen en la pantalla del celular y se pueden
      reintentar; nunca se pierden en silencio. *(UC-2)*
- [ ] Si el Drive no está disponible o sin espacio, se muestra el mismo mensaje claro que en la
      compu, sin errores técnicos. *(UC-2)*
- [ ] Si falla solo la identificación, los archivos igualmente quedan guardados y se pueden
      renombrar a mano. *(UC-2, UC-4)*

**Registro y privacidad**
- [ ] Cada archivo queda registrado con **el usuario que generó el QR**, la fecha y hora, y que fue
      "desde el celular". Cada archivo quitado, y cada cambio de nombre o tipo (automático o manual),
      también. *(UC-1, UC-3, UC-4)*
- [ ] A diferencia de la captura de datos, **las fotos no se destruyen**: quedan en el Drive de la
      escribanía, que es el destino buscado. En ningún momento se guardan en la base ni en los
      servidores de Notarial. *(UC-1)*
- [ ] Para identificar, se lee una **copia** de la foto con la misma IA que ya lee los documentos en
      la captura de datos (procesamiento en EE. UU.); esa copia no se guarda. *(UC-4)*

**Lo que no cambia**
- [ ] La captura de datos desde el celular (partes, vehículos, Scriba) sigue igual. *(todos)*
- [ ] Subir desde la compu con el botón **Subir archivos** sigue funcionando. *(todos)*

## Fuera de alcance (a propósito)

- Completar datos de las partes a partir de lo leído (eso es la captura de datos, que ya existe).
- Unir las fotos de un mismo documento en un solo PDF o agruparlas.
- Escáner físico, WhatsApp u otros canales de entrada.
- Subir videos.
- Ver desde el celular los archivos que ya tiene el expediente.
- Carga Masiva (barrios y lotes) sobre el Drive de la escribanía.

## Decisiones tomadas (09/11/26)

| Tema | Decisión |
|---|---|
| Elegir tipo en el celular | **No.** Se sube todo de una y la clasificación es automática, después de subir. Resuelve el caso "el tipo no está en la lista" y el proceso trunco de ir foto por foto |
| Nombres | Descriptivos, con **anverso/reverso o número de página** si existe. Las fotos de galería ya no conservan su nombre `IMG_xxxx`: se renombran al identificarlas, y si no se pueden identificar se queda el original |
| Tope de archivos por sesión | **Sin tope** |
| Quién figura como "subió" | El usuario que generó el QR, con la marca "desde el celular" |
| Calidad | Las tres formas de cargar (cámara de la página, cámara del teléfono, galería), cada uno usa la que prefiera |
| Quitar desde el celular | Solo lo subido en esa sesión, con confirmación, a la papelera de Drive |

## Preguntas abiertas (a resolver antes de pasar a `plan.md`)

1. **Vigencia del QR.** Dijiste que 10 minutos es demasiado porque son acciones instantáneas.
   Propuesta: el QR vence a los **5 minutos sin actividad** (cada foto subida lo renueva) y con un
   tope de **30 minutos** desde que se generó. Si se vence en medio, se genera otro desde la compu
   en un toque. ¿Te cierra, o querés algo más corto todavía?
2. **¿El nombre incluye la persona?** Con dos DNI en el mismo expediente (comprador y vendedor),
   `DNI - anverso.jpg` no alcanza para distinguirlos. Propuesta: incluir el **apellido** de la
   persona cuando el documento la tiene (`DNI García - anverso.jpg`). Solo queda en el nombre del
   archivo, dentro del Drive de la escribanía.
3. **¿La identificación también aplica a lo que se sube desde la compu?** Propuesta: sí, para que
   el criterio sea el mismo; el selector de "Tipo" de hoy quedaría como **"Automático"** por
   defecto, y se puede forzar un tipo a mano si se prefiere.
