# Feature: Personas del expediente

**Epic:** [Documentación de expedientes en el Drive de la escribanía](../epics/documentacion-expedientes-drive.md)
**Estado:** 📝 Spec aprobada (11/11/26); plan y tareas esperando aprobación de Lucas
**Spec:** [`specs/personas-expediente/`](../specs/personas-expediente/)
**Depende de:** [Almacenamiento propio](../specs/almacenamiento-propio/spec.md) (reemplaza a Drive) y [Subir documentación desde el celular](subir-documentacion-celular.md) (ambas en producción)

## Qué entrega

Que cada persona tenga **una ficha permanente en el registro** (datos, estado civil, comentarios) que se
completa en un modal a partir de las fotos de su documentación, y que cada expediente tenga la lista de
**las personas que intervienen**, con **sus archivos asociados** (el DNI, el poder, la partida). Esas
personas aparecen luego como **sugerencias al elegir cada parte** de un documento del expediente, y los
archivos se pueden **consultar sin salir del documento**.

## Por qué

Lo primero que necesita la escribana al recibir a una persona es saber si es soltera o casada, y eso
no figura en el DNI. Hoy no hay dónde anotarlo, y los archivos subidos no tienen ninguna conexión con
los documentos que se arman después: hay que volver a escanear el DNI.

## Casos de uso

| Caso de uso | Resumen |
|---|---|
| [UC-1: Completar el perfil de una persona](../usecases/personas-expediente-ficha.md) | Agregar a la persona al expediente y completar su ficha en un modal, con ayuda de la lectura del DNI |
| [UC-2: Asociar archivos a una persona](../usecases/personas-expediente-archivos.md) | Que cada DNI, poder o partida quede con su dueño, y ver de quién es cada archivo |
| [UC-3: Sugerir las personas al elegir cada parte](../usecases/personas-expediente-traer-a-parte.md) | En el documento nuevo, completar la parte desde la ficha sin volver a subir ni escanear |
| [UC-4: Ver los archivos del expediente mientras se edita](../usecases/personas-expediente-ver-en-editor.md) | Consultar el DNI o el poder al lado del documento |

Estos casos de uso son la fuente de los criterios de aceptación de `spec.md`.
