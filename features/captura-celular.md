# Feature: Captura de documentos desde el celular

**Epic:** [Captura de documentos por varios canales](../epics/captura-documentos-multicanal.md)
**Estado:** 🔵 En curso — implementado el 06/11/26, visible solo para admin hasta probarlo en iPhone y Android reales
**Spec:** [`specs/captura-documentos-celular/`](../specs/captura-documentos-celular/)

## Qué entrega

Que el escribano pueda sacar con el celular una o varias fotos de un documento
(DNI frente y dorso, licencia, tarjeta verde) y que los datos aparezcan solos
donde los estaba necesitando: en la parte del documento que está armando, o en la
conversación con Scriba. Sin pasar archivos del celular a la compu.

Se entra de dos maneras, que comparten todo lo demás:

1. Desde un botón junto a cada parte o campo del generador manual (el contexto ya
   lo sabe la pantalla).
2. Desde Scriba, que pregunta lo que falta saber antes de ofrecer el código.

## Casos de uso

| Caso de uso | Resumen |
|---|---|
| [UC-1: Captura desde una parte del generador](../usecases/captura-desde-parte-generador.md) | El contexto lo da la pantalla; no se pregunta nada |
| [UC-2: Captura iniciada desde Scriba](../usecases/captura-desde-scriba.md) | Scriba pregunta lo que falta y devuelve el resultado a la conversación |
| [UC-3: Lote de varias fotos con confirmación](../usecases/lote-multifoto-confirmacion.md) | Frente y dorso, o más fotos, y revisión de lo leído |
| [UC-4: Foto ilegible](../usecases/foto-ilegible-reintento.md) | Reflejo, desenfoque o dato dudoso: pedir otra foto sin inventar |

Estos casos de uso son la fuente de los criterios de aceptación de `spec.md`.
