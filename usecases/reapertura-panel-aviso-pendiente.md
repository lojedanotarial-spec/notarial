# UC-3: Reapertura del panel después de que llegó algo nuevo

**Feature:** [Persistencia del chat al cerrar/reabrir el panel](../features/persistencia-chat-scriba.md)

## Actor

Escribano o admin que ya generó la situación de UC-1 (respuesta exitosa) o
UC-2 (respuesta fallida) con el panel cerrado.

## Disparador

El usuario mira la pantalla en algún momento después de que un intercambio
se resolvió — bien o mal — con el panel cerrado.

## Flujo esperado

1. El botón flotante de Scriba muestra una señal claramente distinta del
   estado normal — algo que diga "pasó algo, mirá".
2. Usuario hace clic para abrir el panel.
3. Ve la respuesta nueva.
4. La señal desaparece — no vuelve a aparecer para esa misma respuesta.

## Resultado esperado

La señal es confiable: aparece cuando y solo cuando hay algo que el
usuario no vio todavía, y se apaga en cuanto lo ve.

## Estado actual

Existe un punto junto al botón de Scriba, pero está **siempre visible**
mientras el panel está cerrado — no distingue "no pasó nada" de "pasó
algo nuevo". Hay que reemplazarlo o complementarlo por una señal que sí
distinga esos dos estados. Detalle completo en
`specs/persistencia-chat-scriba/spec.md`.

## Decisión de alcance

La señal es **binaria** (no cuenta cuántos intercambios se acumularon) y
**genérica** (no distingue si lo pendiente es una respuesta exitosa de
UC-1 o un intercambio fallido de UC-2 — ambos casos activan la misma
señal). El detalle de qué pasó se ve recién al abrir el panel.
