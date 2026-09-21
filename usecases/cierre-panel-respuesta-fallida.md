# UC-2: Cierre del panel con una respuesta que termina fallando

**Feature:** [Persistencia del chat al cerrar/reabrir el panel](../features/persistencia-chat-scriba.md)

## Actor

Escribano o admin usando Scriba desde cualquier pantalla.

## Disparador

El usuario envía un mensaje a Scriba y, antes de que llegue la respuesta,
cierra el panel. El pedido termina en error (falla de red, error del
servidor, lo que sea).

## Flujo esperado

1. Usuario envía un mensaje.
2. Usuario cierra el panel mientras Scriba todavía está pensando.
3. El pedido falla en segundo plano.
4. Al reabrir el panel (en algún momento posterior), el usuario puede ver
   que ese mensaje no tuvo respuesta y tiene forma de reintentarlo —
   igual que si el error hubiera pasado con el panel abierto.

## Resultado esperado

Ningún intercambio desaparece sin dejar rastro. Un error con el panel
cerrado se comporta, desde la perspectiva del usuario, igual que un error
con el panel abierto: se ve, se puede reintentar.

## Estado actual — este es el caso más grave de los cuatro

Hoy este intercambio se pierde por completo: ni la pregunta del usuario ni
el error quedan guardados en ningún lado. No es solo "falta un aviso", es
pérdida real de la pregunta que el usuario escribió. Detalle completo en
`specs/persistencia-chat-scriba/spec.md`.
