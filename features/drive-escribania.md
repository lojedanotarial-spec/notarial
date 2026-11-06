# Feature: Drive de la escribanía — conexión y archivos del expediente

**Epic:** [Documentación de expedientes en el Drive de la escribanía](../epics/documentacion-expedientes-drive.md)
**Estado:** 🔵 En curso — spec en revisión (06/11/26)
**Spec:** [`specs/drive-escribania/`](../specs/drive-escribania/)

## Qué entrega

Que cada registro tenga un único Drive (el de su escribanía), conectado una sola vez por el
administrador, y que todos los usuarios del registro puedan subir, ver y descargar la
documentación de los expedientes desde Notarial, sin iniciar sesión con Google y sin que importe
con qué método entran.

## Casos de uso

| Caso de uso | Resumen |
|---|---|
| [UC-1: Conectar el Drive de una escribanía](../usecases/drive-conectar-escribania.md) | El administrador genera un enlace de un solo uso; quien tiene el Gmail de la escribanía lo abre y acepta |
| [UC-2: Archivos del expediente](../usecases/drive-archivos-expediente.md) | Cualquier usuario del registro sube, ve y descarga archivos, sin Google |
| [UC-3: Conexión rota o espacio lleno](../usecases/drive-conexion-rota.md) | Qué ven los usuarios y qué ve el administrador cuando la conexión falla o se acaba el espacio |

Estos casos de uso son la fuente de los criterios de aceptación de `spec.md`.
