# UC-1: Cierre del panel con una respuesta que termina llegando bien

**Feature:** [Persistencia del chat al cerrar/reabrir el panel](../features/persistencia-chat-scriba.md)

## Actor

Escribano o admin usando Scriba desde cualquier pantalla.

## Disparador

El usuario envía un mensaje a Scriba y, antes de que llegue la respuesta,
cierra el panel (para mirar otra cosa, no porque cambió de opinión).

## Flujo esperado

1. Usuario envía un mensaje.
2. Usuario cierra el panel mientras Scriba todavía está pensando.
3. La respuesta llega en segundo plano, exitosamente.
4. Aparece una señal visible (ver UC-3) de que hay algo nuevo.
5. Usuario reabre el panel más tarde y ve la respuesta como si hubiera
   estado mirando todo el tiempo.

## Resultado esperado

La respuesta se guarda y se ve al reabrir. El usuario se entera de que
llegó, no lo descubre por casualidad.

## Estado actual

La respuesta ya se guarda hoy (esto no está roto). Lo que falta es el
paso 4 — hoy no hay ninguna señal, el usuario tiene que reabrir "porque sí".
Detalle completo en `specs/persistencia-chat-scriba/spec.md`.
