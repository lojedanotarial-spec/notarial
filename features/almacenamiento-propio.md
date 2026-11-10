# Feature: Almacenamiento propio de Notarial (sin permisos de Google)

**Epic:** [Documentación de expedientes en el Drive de la escribanía](../epics/documentacion-expedientes-drive.md)
**Estado:** 📝 Spec en borrador (10/11/26) — esperando aprobación de Lucas
**Spec:** [`specs/almacenamiento-propio/`](../specs/almacenamiento-propio/)
**Reemplaza a:** la conexión de Drive por registro ([Drive de la escribanía](drive-escribania.md)) y el mecanismo viejo de Drive por usuario que usa Carga Masiva
**Decisión:** Lucas, 10/11/26 — "vamos con R2, estoy harto de pedir miles de permisos". Compara las opciones en la conversación del 10/11/26 (costo ≈ US$ 0,015 por GB al mes; bajar archivos no cuesta).

## Qué entrega

Que **todos los archivos de Notarial** (documentación de expedientes, fotos subidas desde el celular,
archivos de lotes y barrios) se guarden en un **almacenamiento propio de Notarial**, privado y separado
por registro. Ninguna escribanía tiene que autorizar nada en Google, ni se depende de la cuenta de
nadie: quien entra a Notarial ve y sube sus archivos, y listo.

## Por qué

Hoy hay dos sistemas de permisos de Google que no se hablan, uno por registro y otro por usuario. El
de usuario vence a la hora y falla si se entra con email. El de registro exige que alguien con acceso a
la cuenta de Gmail de la escribanía autorice (y Google puede pedir verificar un celular que no existe).
Cada alternativa que sigue dependiendo de Google trae el mismo problema de permisos.

## Casos de uso

| Caso de uso | Resumen |
|---|---|
| [UC-1: Archivos del expediente sin Google](../usecases/almacenamiento-archivos-expediente.md) | Subir, ver, bajar, subir por QR desde el celular y nombrar automáticamente, todo sin autorizar nada |
| [UC-2: Borrar, recuperar y fin del expediente](../usecases/almacenamiento-borrar-recuperar.md) | Qué pasa con los archivos al borrar uno o al borrar el expediente |
| [UC-3: Barrios y lotes](../usecases/almacenamiento-lotes-barrios.md) | La estructura de carpetas de Carga Masiva y la escritura de cada lote, en el mismo almacenamiento |
| [UC-4: Retirar Drive y ver el uso por registro](../usecases/almacenamiento-administracion.md) | Desconectar los Drive de prueba y ver cuánto ocupa cada registro |

Estos casos de uso son la fuente de los criterios de aceptación de `spec.md`.
