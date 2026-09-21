# Feature: Persistencia del chat al cerrar/reabrir el panel

**Epic:** [Continuidad y confiabilidad del panel de Scriba](../epics/scriba-continuidad-chat.md)
**Estado:** 🔵 En curso
**Spec:** [`specs/persistencia-chat-scriba/`](../specs/persistencia-chat-scriba/)

## Qué entrega

Que cerrar y volver a abrir el panel de Scriba no pierda un intercambio en
curso (ni en éxito ni en falla), y que el usuario se entere de si llegó algo
nuevo mientras no estaba mirando.

## Casos de uso

| Caso de uso | Resumen |
|---|---|
| [UC-1: Cierre con respuesta exitosa](../usecases/cierre-panel-respuesta-exitosa.md) | La respuesta llega después de cerrado el panel — hoy se guarda en silencio |
| [UC-2: Cierre con respuesta fallida](../usecases/cierre-panel-respuesta-fallida.md) | El pedido falla después de cerrado el panel — hoy se pierde todo, sin rastro |
| [UC-3: Reapertura con aviso pendiente](../usecases/reapertura-panel-aviso-pendiente.md) | El usuario vuelve a abrir el panel y debe notar que algo pasó |
| [UC-4: Borrador sin enviar](../usecases/borrador-no-enviado.md) | Texto/adjuntos sin enviar al momento de cerrar — confirmado en alcance |

Estos casos de uso son la fuente de los criterios de aceptación en
`spec.md` — cualquier cambio de alcance se discute primero acá.
