# Plan: Persistencia del chat de Scriba + aviso de respuesta pendiente

**Spec:** [`spec.md`](spec.md) (aprobado, sin preguntas abiertas)
**Estado:** en revisión (fase 2 de 3 — ver `specs/README.md`)

## Causa raíz (por qué un solo cambio arquitectónico resuelve los 4 UC)

Hoy todo el estado de una sesión de Scriba — mensajes, texto sin enviar,
adjuntos sin enviar, si hay un pedido en curso, si el último falló — vive
en `useState` **dentro de `ScribaPanel.jsx`**. Ese componente se
monta/desmonta por completo cada vez que se abre/cierra el panel
(`{scribaOpen && <ScribaPanel/>}` en `App.jsx`). Cerrar el panel no es
"ocultarlo", es destruirlo — y con él, todo lo que vivía en su estado.

Los 4 casos de uso son la misma causa vista desde 4 ángulos:
- UC-1/UC-2: el resultado de un pedido en curso se procesa en un
  componente que ya no existe para cuando llega.
- UC-3: no hay ningún lugar que sobreviva al cierre del panel para
  acordarse de "che, pasó algo".
- UC-4: el borrador vive en el mismo estado que se destruye.

**La solución es mover ese estado un nivel arriba**, a algo que viva
mientras dura la sesión del usuario en la app — no mientras el panel está
abierto. `ScribaPanel` pasa de dueño del estado a consumidor de props.

## Archivos afectados

- **`src/hooks/useScribaSesion.js`** (nuevo) — hook que se instancia una
  sola vez en `App.jsx`. Consolida lo que hoy está repartido entre el
  estado local de `ScribaPanel` y el hook `useScribaConversacion`
  (que se mantiene como dependencia interna, sin cambios en su propia
  lógica de guardado). Expone: `mensajes`, `enviar()`, `cargando`,
  `error`, `reintentar()`, `input`, `setInput`, `archivos`,
  `setArchivos`, `avisoPendiente`, `marcarVisto()`.
- **`src/App.jsx`** — instancia `useScribaSesion()` una vez (en vez de
  que `ScribaPanel` cree su propio estado al montarse). Le pasa el
  resultado como props a `ScribaPanel`. Reemplaza el punto decorativo
  siempre-visible por uno condicionado a `avisoPendiente`. Llama
  `marcarVisto()` cuando `scribaOpen` pasa a `true`.
- **`src/components/ScribaPanel.jsx`** — deja de tener sus propios
  `useState` para mensajes/input/archivos/cargando/error/ultimoFalloRef;
  los recibe como props. `procesarEnvio` se reemplaza por invocar
  `enviar()` del hook. El resto (render de mensajes, adjuntar archivos,
  acciones tipo `completar_parte`, etc.) no cambia de comportamiento,
  solo de dónde vienen sus datos.
- **`src/hooks/useScribaConversacion.js`** — sin cambios de lógica. Pasa
  a ser usado *dentro* de `useScribaSesion` en vez de dentro de
  `ScribaPanel` directamente.

## Decisiones de diseño

### 1. El pedido en curso ya no depende de que el panel siga montado

`enviar()` vive en el hook de nivel App — su `fetch` y el `.then/.catch`
que lo resuelve ya no están atados al ciclo de vida de `ScribaPanel`.
Cerrar el panel dejará de desmontar el componente que está esperando la
respuesta.

### 2. La falla se persiste igual que el éxito (fix real de UC-2)

Hoy el `catch` de `procesarEnvio` solo actualiza estado local (`setError`,
`ultimoFalloRef`) y nunca llama `guardar()` — por eso un fallo con el
panel cerrado desaparece sin dejar rastro. El fix: el `catch` de
`enviar()` también llama `guardar()`, agregando al array de mensajes
persistido un marcador de falla:
`{ role: "assistant", content: "", error: true }`
inmediatamente después del mensaje del usuario que falló (que ya se
persiste). Así, tanto éxito como falla quedan en la misma fuente de
verdad — la conversación guardada — en vez de exito=DB / falla=estado
efímero.

**Retry tras reabrir el panel:** no se intenta reenviar automáticamente
con los mismos adjuntos (los archivos no se persisten, y guardar sus
bytes en el JSONB de la conversación sería desproporcionado para este
fix). En su lugar, tocar el marcador de falla precarga el input con el
texto del mensaje de usuario inmediatamente anterior (ya está en el
array, no hace falta guardarlo aparte) — el usuario reenvía manualmente,
re-adjuntando si hacía falta. Alcance más chico que un retry perfecto,
pero cumple el criterio de aceptación ("puede reintentarlo") sin la
complejidad de persistir binarios.

### 3. La señal es un booleano en el hook, no polling ni Realtime

`avisoPendiente` se pone en `true` dentro de `enviar()` cuando el pedido
se resuelve (éxito o falla) **y el panel está cerrado en ese momento**.
Se pone en `false` en `marcarVisto()`, llamado desde `App.jsx` cuando
`scribaOpen` pasa a `true`. Nada de comparar `updated_at` contra un
timestamp guardado, nada de suscripción Realtime a Supabase — ambas
opciones se evaluaron y son más infraestructura de la que el problema
pide: ya vamos a tener la respuesta en memoria en el momento exacto en
que se resuelve, no hace falta reconstruir esa información después
consultando la base.

### 4. UC-4 (borrador) se resuelve gratis por el mismo movimiento

`input` y `archivos` pasan a vivir en `useScribaSesion` en vez de en
`ScribaPanel`. No hace falta ningún mecanismo nuevo — sobreviven a
cerrar/reabrir el panel por la misma razón que ahora sobrevive todo lo
demás: ya no están en un componente que se destruye. Si se cierra la
*pestaña* (no el panel), se pierden igual — ya excluido a propósito en
el spec.

## Riesgos / edge cases a cubrir en tasks.md

- Si el usuario cambia de `registroId`/cierra sesión mientras hay un
  pedido en curso, `enviar()` no debe intentar guardar contra una sesión
  que ya no es válida — revisar que `guardar()` (en `useScribaConversacion`)
  ya maneja `if (!session) return` (sí lo hace, confirmado en el código
  actual) y que alcanza para este caso.
- El marcador de falla persistido no debe activar el `AcceptanceCriteria`
  de `guardarPorCambio`/otros flujos que iteran `mensajes` esperando
  `content` no vacío (ej. el cálculo de título de la conversación usa
  `mensajes.find(m => m.role === "user")` — no debería verse afectado,
  pero se verifica en tasks.md).
- `avisoPendiente` no debe quedar en `true` para siempre si el usuario
  nunca vuelve a abrir el panel en la sesión — es aceptable (no hay
  requisito de que se apague solo), pero confirmar que no genera ningún
  loop de renders.
