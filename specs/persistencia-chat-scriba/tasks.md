# Tasks: Persistencia del chat de Scriba + aviso de respuesta pendiente

**Plan:** [`plan.md`](plan.md) (aprobado)
**Estado:** en revisión (fase 3 de 3 — ver `specs/README.md`)

Orden estricto — cada tarea es verificable por separado antes de pasar a
la siguiente. Implementación en rama propia (`feat/scriba-persistencia-chat`
o similar) + PR, nunca directo a `main` — Fátima usa Notarial en producción.

- [ ] **T1 — Extraer `useScribaSesion.js` con paridad funcional**
  Crear el hook nuevo y mover ahí `mensajes`, `input`, `archivos`,
  `cargando`, `error`, `procesarEnvio`→`enviar()`, `ultimoFalloRef`→
  `reintentar()`, tal cual están hoy en `ScribaPanel.jsx`, sin cambiar
  ningún comportamiento todavía. `useScribaConversacion` pasa a usarse
  desde adentro de este hook.
  **Verificación:** con el panel abierto, Scriba se comporta exactamente
  igual que antes del refactor (mandar mensaje, ver respuesta, error +
  reintentar manual).

- [ ] **T2 — Conectar `App.jsx` y `ScribaPanel.jsx` al hook**
  `App.jsx` instancia `useScribaSesion()` una sola vez y pasa el
  resultado como props a `ScribaPanel`. `ScribaPanel` deja sus `useState`
  equivalentes y consume las props.
  **Verificación:** la app compila sin warnings nuevos; Scriba sigue
  funcionando igual con el panel abierto (repetir el smoke test de T1).

- [ ] **T3 — Persistir el fallo igual que el éxito**
  En el `catch` de `enviar()`, agregar la llamada a `guardar()` con el
  marcador `{ role: "assistant", content: "", error: true }` a
  continuación del mensaje de usuario que falló.
  **Verificación:** forzar un error (cortar la red o apuntar `/api/scriba`
  a una URL rota momentáneamente) con el panel **cerrado**, esperar,
  reabrir el panel — el mensaje del usuario y el marcador de falla deben
  aparecer en el historial cargado desde Supabase (no solo en memoria).

- [ ] **T4 — Render del marcador de falla persistido + retry precargado**
  `ScribaPanel` reconoce `{ role: "assistant", error: true }` en
  `mensajes` y muestra una burbuja de error con botón reintentar; tocarlo
  precarga el input con el `content` del mensaje de usuario inmediato
  anterior (no reenvía solo, ni reintenta adjuntos).
  **Verificación:** con un mensaje fallido ya en el historial (de T3),
  abrir el panel, ver la burbuja de error, tocar reintentar, confirmar
  que el input queda precargado con el texto original.

- [ ] **T5 — Flag `avisoPendiente`**
  En `useScribaSesion`, agregar el booleano: se pone en `true` dentro de
  `enviar()` cuando el pedido se resuelve (éxito o falla) y el panel
  está cerrado en ese momento; se pone en `false` en `marcarVisto()`.
  El hook necesita saber si el panel está abierto — pasar ese dato desde
  `App.jsx` (prop o ref, lo que sea más simple sin inducir renders
  extra).
  **Verificación:** cerrar el panel, mandar un mensaje (puede ser desde
  una sesión con el panel ya cerrado si T1-T2 lo permiten, o cerrar
  justo después de enviar), esperar la respuesta, confirmar que el flag
  pasa a `true`.

- [ ] **T6 — Indicador visual condicionado en `App.jsx`**
  Reemplazar el punto siempre-visible junto al botón de Scriba por uno
  que solo aparece si `avisoPendiente` es `true`. Llamar `marcarVisto()`
  cuando `scribaOpen` pasa a `true`.
  **Verificación manual en la app:** cerrar el panel → mandar un mensaje
  → esperar respuesta → ver aparecer el indicador → abrir el panel → ver
  que desaparece y no vuelve a aparecer para esa misma respuesta.

- [ ] **T7 — Confirmar persistencia del borrador (UC-4)**
  No debería requerir código nuevo si T1-T2 están bien hechas — es una
  tarea de verificación, no de implementación.
  **Verificación:** escribir texto sin enviar (o adjuntar un archivo sin
  enviar), cerrar el panel, reabrir — el texto/adjunto debe seguir ahí.
  Si no sobrevive, revisar que `input`/`archivos` realmente quedaron en
  el hook y no en algún estado local remanente de `ScribaPanel`.

- [ ] **T8 — Edge cases del plan**
  - Confirmar que `guardar()` no rompe si `session` es `null` a mitad de
    un pedido (ya tiene `if (!session) return` — verificar que alcanza).
  - Confirmar que el cálculo de título de conversación
    (`mensajes.find(m => m.role === "user")`) no se ve afectado por el
    nuevo marcador de falla.
  - Confirmar que `avisoPendiente` no genera un loop de renders (revisar
    con React DevTools o el profiler si hay dudas).

- [ ] **T9 — Smoke test completo de los 4 UC en la app real**
  Correr los 4 casos de uso de punta a punta contra el dev server (no
  solo unitariamente), documentar qué se probó en la descripción del PR
  — no hay entorno de staging, así que esto reemplaza a ese paso.

- [ ] **T10 — PR, merge, y cierre del ciclo**
  Abrir el PR con el resumen de qué cambió y por qué (referenciando
  `spec.md`/`plan.md`). Tras mergear: actualizar `PROYECTO.md` (historial
  de features), mover el ítem de "🔵 En curso" a "✅ Recién terminado" en
  `BACKLOG.md`, y actualizar el estado de la Feature/User Stories en
  Azure DevOps a `Closed`.
