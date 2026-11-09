# Feature: Subir documentación al expediente desde el celular

**Epic:** [Documentación de expedientes en el Drive de la escribanía](../epics/documentacion-expedientes-drive.md)
**Estado:** 📝 Spec en borrador, revisado con las respuestas de Lucas (09/11/26) — 3 preguntas abiertas
**Spec:** [`specs/documentacion-celular-expediente/`](../specs/documentacion-celular-expediente/)
**Depende de:** [Drive de la escribanía](drive-escribania.md) (ya en producción)

## Qué entrega

Que desde un expediente, en la compu, se pueda mostrar un QR; al escanearlo con el celular se abre
una página donde se sacan **todas las fotos de una** (o se eligen de la galería), sin clasificar nada, y
**todo queda guardado en el Drive de la escribanía, en la carpeta de ese expediente, en calidad
original**. En la compu, los archivos van apareciendo solos a medida que se suben, y después de subir
el sistema **identifica cada uno y lo renombra** (por ejemplo `DNI García - anverso.jpg`).

## En qué se diferencia de la captura que ya existe

| | Captura de datos (ya existe) | Esta feature |
|---|---|---|
| Para qué | Leer el DNI o la tarjeta verde y completar una parte o un vehículo | Archivar la foto tal cual, como respaldo del expediente |
| Qué pasa con la foto | Se lee y se **destruye** | Se **guarda** en el Drive de la escribanía |
| Calidad | Reducida para que la IA la lea | Original |
| Dónde se inicia | Desde una parte, un vehículo o Scriba | Desde la pestaña Archivos de un expediente |

## Casos de uso

| Caso de uso | Resumen |
|---|---|
| [UC-1: Subir documentación desde el celular](../usecases/documentacion-celular-subir.md) | Del QR en la compu a los archivos en el expediente |
| [UC-2: La sesión se corta o el Drive no responde](../usecases/documentacion-celular-fallas.md) | Qué ve la persona en el celular y en la compu cuando algo falla |
| [UC-3: Deshacer una foto subida por error](../usecases/documentacion-celular-deshacer.md) | Sacar del expediente, desde el celular, algo recién subido |
| [UC-4: Identificación y nombre automáticos](../usecases/documentacion-celular-identificar.md) | Después de subir, el sistema reconoce el documento y lo renombra; se puede corregir a mano |

Estos casos de uso son la fuente de los criterios de aceptación de `spec.md`.
