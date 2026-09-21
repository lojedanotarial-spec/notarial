# Spec: Persistencia del chat de Scriba + aviso de respuesta pendiente

**Estado:** en revisión (fase 1 de 3 — ver `specs/README.md`)
**Feature:** [`features/persistencia-chat-scriba.md`](../../features/persistencia-chat-scriba.md)
**Epic:** [`epics/scriba-continuidad-chat.md`](../../epics/scriba-continuidad-chat.md)
**Casos de uso:** [UC-1](../../usecases/cierre-panel-respuesta-exitosa.md) · [UC-2](../../usecases/cierre-panel-respuesta-fallida.md) · [UC-3](../../usecases/reapertura-panel-aviso-pendiente.md) · [UC-4](../../usecases/borrador-no-enviado.md)
**Origen:** pedido 13/07/26, backlog `PROYECTO.md` → migrado a `BACKLOG.md`

## Problema

El panel de Scriba se cierra y se vuelve a abrir constantemente mientras el
escribano trabaja en otras pantallas. Hoy eso tiene costos que el usuario no
espera:

1. Si cierra el panel mientras Scriba está respondiendo, esa respuesta puede
   perderse sin aviso — o, si falla, perderse el intercambio entero sin
   ningún registro ni forma de reintentarlo.
2. Si una respuesta efectivamente llega mientras el panel está cerrado, no
   hay ninguna señal de que pasó algo — el usuario tiene que reabrir "porque
   sí" y notar el cambio.
3. Cualquier texto que estaba escribiendo (sin enviar) o archivo que había
   adjuntado (sin enviar) se pierde al cerrar el panel.

## Comportamiento actual (verificado en código, no supuesto)

- El panel se monta y desmonta por completo al abrir/cerrar (no queda vivo
  en segundo plano dentro de la app).
- Los intercambios que **ya recibieron respuesta y se guardaron** sí
  reaparecen al reabrir el panel, porque al montarse vuelve a cargar la
  última conversación guardada. Esta parte ya funciona.
- Un pedido en curso (esperando la respuesta de Scriba) **no se cancela**
  al cerrar el panel — sigue corriendo en la red aunque el usuario ya no
  esté mirando.
  - Si ese pedido **termina bien** después de cerrado el panel, la
    respuesta se guarda igual, pero en silencio: no hay ningún aviso.
  - Si ese pedido **falla** después de cerrado el panel, no se guarda nada
    en absoluto — ni la pregunta del usuario ni el error. El intercambio
    desaparece sin dejar rastro y sin posibilidad de reintentar.
- Texto escrito sin enviar y archivos adjuntados sin enviar viven solo en el
  estado del panel — se pierden al cerrarlo, sin excepción.
- Existe hoy un punto/indicador junto al botón de Scriba, pero es
  permanente mientras el panel está cerrado — no comunica actividad nueva,
  es decorativo.

## Comportamiento deseado (criterios de aceptación)

- [ ] Cerrar el panel mientras Scriba está respondiendo **nunca** hace que
      ese intercambio desaparezca sin dejar rastro — ni en el caso de
      éxito ni en el de falla. *(UC-1, UC-2)*
- [ ] Si un pedido en curso al cerrarse termina fallando, el usuario puede
      enterarse y reintentarlo cuando vuelva a abrir el panel (no
      silenciosamente perdido). *(UC-2)*
- [ ] Cuando una respuesta llega mientras el panel está cerrado, aparece una
      señal visible junto al botón de Scriba que sea claramente distinta
      del estado normal (no el punto permanente actual) — para que "tengo
      algo nuevo para ver" sea visualmente obvio. *(UC-1, UC-3)*
- [ ] La señal es **binaria** (hay algo nuevo / no hay nada nuevo), no un
      contador — no importa cuántos intercambios se acumularon, solo que
      hay al menos uno sin ver. *(UC-1, UC-3)*
- [ ] La señal es **genérica**: no distingue si lo que llegó fue una
      respuesta exitosa (UC-1) o un intercambio que falló y espera
      reintento (UC-2) — un solo tipo de señal cubre ambos casos. El
      detalle (qué pasó exactamente) se ve recién al abrir el panel.
      *(UC-1, UC-2, UC-3)*
- [ ] Esa señal desaparece cuando el usuario abre el panel y ve la
      respuesta. *(UC-3)*
- [ ] Texto escrito sin enviar y archivos adjuntados sin enviar sobreviven
      a cerrar y reabrir el panel — no solo los intercambios ya enviados.
      *(UC-4)*

## Fuera de alcance (a propósito)

- Sincronizar el aviso entre pestañas del navegador o dispositivos
  distintos — se asume una sola pestaña activa.
- Historial de conversaciones / navegación entre conversaciones pasadas —
  eso es el ítem separado "Mejoras UX del panel de Scriba" en el backlog.
- Cualquier cambio al comportamiento de Scriba mientras el panel está
  *abierto* — este spec es puntualmente sobre qué pasa al cerrarlo y
  reabrirlo.

## Preguntas abiertas (a resolver antes de pasar a `plan.md`)

1. ~~El texto/archivos sin enviar al cerrar el panel — ¿deben
   preservarse?~~ **Resuelto (21/09/26):** sí, entran en el alcance —
   ver UC-4 y el criterio de aceptación arriba.
2. ~~La señal de "respuesta nueva" — ¿binaria o contador?~~ **Resuelto:**
   binaria y genérica (no distingue éxito de falla, no cuenta cuántas).
   Ver criterios de aceptación arriba.
3. Si el usuario recarga la página completa (no solo cierra el panel)
   mientras hay un pedido en curso, ¿ese caso entra en este spec o se
   considera un escenario distinto (se pierde la pestaña entera, no solo
   el panel)?
