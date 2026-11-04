# Brief de trabajo — Endurecimiento técnico de Notarial

**Contexto:** postulación al Concurso Soluciones Innovadoras Banco Nación (17ª ed.).
**Deadline duro:** 7 de agosto de 2026, 12:00 hs. Hoy es 27 de julio.
**Objetivo de este brief:** dejar el proyecto en condiciones de ser descrito con honestidad como producto y no como prototipo, y cerrar los puntos que un evaluador externo puede cuestionar.

Documento de referencia del proyecto: la doc de Notarial v2 (mantenida manualmente en el repo). Este brief la complementa; no la reemplaza.

---

## Cómo usar este documento

Pegar en Claude Code el bloque "Prompt de arranque" de abajo, con este archivo en el repo o adjunto.

### Prompt de arranque

> Vamos a preparar Notarial para una postulación externa que se evalúa técnicamente. Tengo hasta el 6 de agosto.
>
> Leé `notarial-hardening-concurso.md` completo antes de tocar nada. Trabajamos en orden: P0 primero, y no pasás a P1 hasta que los P0 estén cerrados y verificados.
>
> Reglas: no refactors que no estén en el brief, no cambiar decisiones de arquitectura ya tomadas (no TypeScript, no React Router, no librerías de UI, no ORM), commits chicos y atómicos, y antes de cada tarea me decís qué vas a tocar y esperás confirmación.
>
> Arrancá con un diagnóstico de P0-1, P0-2 y P0-3: leé el código relevante y decime qué encontrás, sin modificar todavía.

---

## Guardrails (aplican a todo el trabajo)

- **Rollback point:** crear tag `pre-hardening-concurso-2026-07-27` antes del primer commit.
- No hay entorno de staging. Todo cambio va a producción vía push a `main`. Por eso: commits chicos, verificables, reversibles de a uno.
- **No tocar el texto de los templates de Fátima** sin confirmación explícita. El contenido notarial es validado por escribana; el código que lo procesa es nuestro, el texto no.
- Cuenta de git: si `git push` da 403, `gh auth switch --hostname github.com --user lojedanotarial-spec`.
- Cada tarea cerrada actualiza la doc del proyecto en el mismo commit. La doc desactualizada es parte del problema que estamos resolviendo.
- Si una tarea resulta más grande de lo que dice el brief, parar y reportar antes de seguir.

---

## P0 — Bloqueantes

Estas tres tienen que estar cerradas antes de redactar el formulario, porque determinan qué se puede afirmar por escrito.

### P0-1 · Secreto expuesto: rotar y externalizar la API key de Anthropic

**Situación:** `api/scriba.js` tiene hardcodeados la URL de Supabase, la Anon Key de Supabase y la API key de Anthropic.

**Precisión importante:** la URL y la Anon Key de Supabase **no son secretos** — la Anon Key está diseñada para ser pública y lo que protege los datos es RLS, que ya está implementado. Moverlas a env vars es prolijidad, no seguridad.

**El problema real es la API key de Anthropic.** Estuvo en el repositorio, por lo tanto hay que tratarla como comprometida. Moverla a una variable de entorno sin rotarla no resuelve nada.

**Tareas, en este orden:**

1. Verificar si la key está en el historial de git, no solo en el working tree:
   ```
   git log --all -p -- api/scriba.js | grep -i "sk-ant" | head
   ```
2. **Rotar la key en la consola de Anthropic.** Generar una nueva, revocar la vieja. Este paso es obligatorio y va primero.
3. Configurar en Vercel (Project Settings → Environment Variables): `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Aplicar a Production y Preview.
4. Reemplazar los literales en `api/scriba.js` y `api/vision.js` por `process.env.*`.
5. Agregar fail-fast al inicio de cada handler: si falta una env var, error 500 explícito con el nombre de la variable faltante. Que no falle en silencio ni mande la request a Anthropic sin key.
6. Verificar que `.env.local` esté en `.gitignore` y que no haya ningún `.env` commiteado.
7. Crear `.env.example` con los nombres de las variables y sin valores.

**No hacer:** reescritura del historial de git (`filter-repo`, BFG). Con la key rotada el riesgo queda neutralizado y el costo/beneficio de reescribir historia en un repo activo no cierra. Dejarlo anotado como decisión consciente.

**Criterio de aceptación:** `grep -rn "sk-ant" .` no devuelve nada en el working tree. La app funciona en producción con las env vars. La key vieja está revocada. Se puede afirmar por escrito: "credenciales gestionadas por variables de entorno del proveedor, sin secretos en el repositorio".

**✅ Resuelto 27/07/26 — la premisa estaba mal, en buen sentido.** Diagnóstico contra `git log --all -p` completo: la API key de Anthropic **nunca estuvo hardcodeada**, en ningún commit — siempre se leyó vía `process.env.ANTHROPIC_API_KEY`, con fail-fast ya en `api/scriba.js` (se agregó el mismo fail-fast a `api/vision.js`, que no lo tenía). No hizo falta rotar nada porque nunca hubo exposición real. Lo único hardcodeado era Supabase URL + Anon Key, que — como dice arriba — no son secretos; se consolidaron en `api/_supabaseConfig.js` (antes duplicadas a mano en 5 archivos) por prolijidad, no por seguridad. Se creó `.env.example`. Hallazgo aparte (no en el alcance original): se encontró y borró `api/test-personas.js`, un endpoint de debug sin auth propio deployado en producción (dependía 100% de RLS; verificado en vivo que no filtraba nada, pero era superficie pública innecesaria).

---

### P0-2 · Determinar y documentar residencia de datos

**Por qué:** Notarial procesa escaneos de DNI, domicilios, CUIT y protocolo notarial. Son datos personales bajo la Ley 25.326, y algunos son sensibles por contexto. La transferencia internacional de datos personales está restringida a jurisdicciones con nivel de protección adecuado.

**Lo que ya sabemos:** la VM de OnlyOffice está en Google Compute Engine, zona `southamerica-west1-b`, que es **Santiago de Chile**. Por ahí pasan los DOCX de los instrumentos.

**Lo que no sabemos y hay que averiguar:**

1. **Región del proyecto Supabase** (`eueqluhhgvukovoyorrw`). Verificar en el dashboard de Supabase → Project Settings → General. Ahí viven `personas`, `documentos`, y el Storage con los DOCX.
2. **Región de ejecución de las funciones serverless de Vercel.** Revisar `vercel.json` y la configuración del proyecto; si no está fijada, Vercel usa un default que conviene explicitar.
3. **Qué datos personales cruzan a la VM de Chile y en qué forma.** Concretamente: los DOCX se suben a Supabase Storage y OO recibe una URL firmada. Hay que determinar si OO además persiste algo en disco local (caché de documentos, archivos temporales) o si es solo procesamiento en tránsito. La respuesta cambia el análisis por completo.

**Entregable:** una sección nueva en la doc del proyecto, `## Residencia y protección de datos`, con una tabla de cada componente, su región, qué datos almacena o procesa, y si persiste o es tránsito.

**Nota de alcance:** el análisis jurídico de adecuación (si la transferencia a Chile requiere o no instrumento adicional) no es una tarea de código y no la resolvemos acá. Lo que sí resolvemos es tener el mapa técnico exacto para poder consultarlo con criterio. Chile sancionó nueva legislación de datos personales en 2024 con vigencia diferida, así que el estado de la cuestión hay que verificarlo, no asumirlo.

**Si del mapa surge que conviene mover la VM:** evaluar `southamerica-east1` (São Paulo) como alternativa. No ejecutar la migración sin decisión explícita — es un cambio de infra, no una tarea de este brief.

**🔶 Parcialmente resuelto 27/07/26 — el mapa técnico de las 2 primeras preguntas ya está, en `PROYECTO.md` §Infraestructura y Plataformas (no en una sección aparte "Residencia y protección de datos", pero cubre lo mismo):**
- Supabase (`personas`, `documentos`, Storage): confirmado **`us-west-2` (Oregon, EE.UU.)** — no Latam. Este es el hallazgo más importante del análisis: el dato personal real vive en EE.UU., la VM de Chile es la parte *menos* relevante.
- Vercel (serverless): confirmado **`iad1` (Virginia, EE.UU.)** — default nunca elegido explícitamente.
- La pregunta 3 (si OO persiste algo en disco local más allá del tránsito) **sigue sin responder** — requiere acceso a la VM, no se investigó.

**🔶 Actualización 29/07/26 — DPA firmado con Supabase, cubre parte de la adecuación para el leg de EE.UU.:** se firmó (PandaDoc, ref. `VO3BF-XMRU7-F28RK-JGFLX`, completado 29/07/26 19:52:48 UTC) el Data Processing Addendum estándar de Supabase, que incorpora las Standard Contractual Clauses (Módulo Two, controlador→procesador) para la transferencia de datos a Supabase Pte. Ltd y sus subprocesadores autorizados (AWS, Google, Cloudflare, Vercel, OpenAI, entre otros — lista completa en el Schedule 3 del DPA). Esto le da un instrumento contractual formal a la transferencia hacia EE.UU. identificada arriba como el hallazgo más relevante.
No resuelto todavía: (a) el análisis jurídico de si esto es *suficiente* para la adecuación bajo Ley 25.326 sigue sin hacerse — es una conclusión legal, no técnica, y no la asumimos acá; (b) la pregunta 3 de arriba (persistencia local en la VM de OO); (c) el DPA de Supabase no cubre la transferencia hacia el proveedor de Anthropic (Claude API, usado en `api/scriba.js`) ni hacia OnlyOffice self-hosted (VM propia en Chile) — si esos también necesitan su propio instrumento es parte del mismo análisis pendiente en (a).
Guardar el PDF firmado en un lugar permanente (Drive o `docs/legal/` en el repo) — no se subió en esta sesión porque solo se compartió el texto extraído, no el archivo.

---

### P0-3 · Bug de tags HTML literales en el cuerpo del documento

**Situación:** aparecen `<strong>` literales en el documento final. Caso real reportado el 27/07: `...ante mí, <strong>FABIÁN MCLEOD</strong>, Notar...` se ve tal cual en OnlyOffice.

**Por qué es P0:** hace que el instrumento salga roto para el escribano. Cualquier demo que muestre esto invalida todo el argumento de "salida protocolar de calidad registral". No se puede mostrar el producto con este bug vivo.

**Diagnóstico:** el sistema de énfasis usa marcadores `**` / `__` / `~~`, nunca HTML. Entonces hay HTML pegado a mano en algún lado. Tres hipótesis a descartar en orden:

1. Un template puntual en la tabla `templates` con HTML en el body (query: buscar `%<strong>%` en el contenido de templates).
2. Un dato de escribano/registro con HTML (revisar `registros`, y el campo de nombre del escribano).
3. Algo introducido por el piloto de cláusulas (#81) — revisar `clausulas_biblioteca` y `ensamblarClausulas()`.

**Fix estructural, además del puntual:** una vez identificado el origen, agregar un sanitizador en el pipeline de generación que detecte tags HTML en el contenido y los convierta al marcador equivalente (`<strong>`/`<b>` → `**`, `<u>` → `__`) o los strippee. Esto evita que el mismo bug vuelva por otra puerta cuando se carguen templates nuevos.

**Criterio de aceptación:** test unitario que verifique que contenido con `<strong>` no produce tags literales en el DOCX. El caso real reproducido y corregido.

**✅ Resuelto 27/07/26 — hipótesis 1 confirmada.** `<strong>{{ESCRIBANO_NOMBRE}}</strong>` pegado a mano (una vez cada uno) en 4 templates de compraventa (`urbana`/`rural`/`ph`/`lote`, no en `boleto_compraventa`) — reemplazado por `**{{ESCRIBANO_NOMBRE}}**`. Barrido completo sobre toda la base (`templates` + `clausulas_biblioteca`) confirma 0 tags HTML restantes. **No se implementó** el sanitizador estructural sugerido (detectar/convertir HTML automáticamente en el pipeline) — se dejó como fix puntual; si se cargan templates nuevos a mano en el futuro, el riesgo puede volver. Sin test unitario dedicado (el caso ya no es reproducible porque no hay HTML para sanitizar hoy).

---

## P1 — Calidad demostrable

Si llegás a la etapa de tutorías y de finalista, vas a tener que hacer demo. Estas tareas son las que hacen que la demo no se caiga.

### P1-4 · Verificar end-to-end las features marcadas "sin probar en la app"

Hay cuatro cosas construidas y no verificadas en uso real. Están en la doc como `✅ (sin probar en la app)`, lo cual es honesto pero no alcanza:

- `leer_template_base` (#79) — tool-calling real, no solo tests unitarios.
- `crear_documento_libre` (#79) — flujo completo: Scriba redacta, botón "Abrir borrador libre", EditorScreen inicializa con `documento_libre`, se guarda, se reabre, `leer_documento` lo reconstruye.
- Adjuntos `.docx` (#80) — subir un Word real desde el navegador, no un script suelto.
- Piloto de cláusulas (#81) — activar cláusulas, verificar numeración de continuación, guardar, reabrir.
- "Insertar en documento" en OO — pendiente de confirmación desde el 27/05.

**Entregable:** un archivo `docs/smoke-tests.md` con un checklist manual reproducible, paso a paso, con resultado esperado por paso. Sin staging, un checklist manual disciplinado es el sustituto razonable — y además es material presentable: demuestra proceso de verificación.

**Regla:** cada ítem que se verifica se marca en la doc del proyecto quitando el "(sin probar en la app)". Cada ítem que falla se convierte en bug con su entrada en el backlog. No se marca nada como verificado sin haberlo corrido.

**🔶 Parcialmente resuelto 27/07/26 — el entregable existe, la verificación real todavía no se hizo.** `docs/smoke-tests.md` tiene el checklist manual (20 pasos, ampliado además con todo lo cargado en la expansión del piloto de bloques del mismo día). Pero **nadie lo corrió todavía en el navegador** — sigue pendiente que la escribana (o quien sea) lo ejecute paso a paso y marque qué falla. Los 4 ítems originales de esta tarea (`leer_template_base`, `crear_documento_libre`, adjuntos `.docx`, "insertar en documento") siguen sin confirmarse en uso real.

### P1-5 · Regeneración on-change → on-blur

Los campos de "Propiedades del acto" regeneran el documento en cada tecla, vía el `useEffect` que observa `[vehiculos, extravars, clausulasActivas]` en `EditorScreen.jsx`. La escribana espera que se aplique al salir del campo.

Evaluar las dos opciones y elegir con criterio explícito: `onBlur` real en los inputs de texto, o debounce en el efecto. El `onBlur` es más predecible para el usuario; el debounce es menos invasivo en el código. Afecta a todos los inputs de texto de esa sección, no solo a los nuevos de cláusulas.

**✅ Resuelto 27/07/26 — se eligió `onBlur` real** (más predecible, como sugería este mismo brief). `extravars` salió del `useEffect` de auto-regeneración (que ahora solo watchea `[vehiculos, clausulasActivas]` — cambios discretos que sí regeneran de inmediato); los inputs/textarea de "Datos del instrumento" regeneran recién en `onBlur`, vía `regenerarPorCambio()` factorizado del efecto anterior. El evento `scriba:completar_extravars` (Scriba completando un campo desde el chat) sigue regenerando de inmediato — es una acción discreta, no tecleo.

### P1-6 · Conversor número → letras para montos

Hoy el escribano tipea el monto en letras a mano. Falta un conversor enganchado a los `extravars` de precio / seña / saldo.

Requisitos explícitos de la escribana, ambos obligatorios:
- Siempre incluir la unidad "mil", incluso en montos redondos.
- Siempre incluir la fracción de centavos, incluso en cero (ej. `... CON 00/100`).

Ya existe lógica de número a letras para fechas — revisar si es reutilizable o si conviene un módulo aparte para montos. Tests unitarios obligatorios, con casos borde: montos redondos, montos con centavos, millones, y el cero.

**✅ Resuelto 27/07/26 — reutilizada, no reescrita.** Ya existía `numeroALetras()` en `src/utils.js` (se usaba solo para `ESCRIBANO_REGISTRO_LETRAS`) y **ya forzaba correctamente** "MIL" y "CON XX/100" — el bug real no era el conversor, era que nadie lo invocaba para precio/seña/saldo. `buildVars()` ahora deriva automáticamente cualquier extravar `X_LETRAS` desde su par `X_NUMEROS`; el campo `_LETRAS` se oculta del panel cuando existe su par (`camposInstrumentoVisibles`, `EditorScreen.jsx`). De paso se estandarizó la convención `_NUMEROS`/`_LETRAS` en 3 templates que la tenían invertida (`cesion_cuotas`, `mutuo_simple`, `prenda_con_registro`) y en los 2 templates nuevos de cesión — 0 documentos afectados. 7 tests nuevos con los casos borde pedidos (montos redondos de miles, centavos reales, cero).

---

## P2 — Higiene que sostiene el relato

Estas no son urgentes para el formulario pero son exactamente lo que diferencia "proyecto serio" de "proyecto de una persona los fines de semana". Si queda tiempo después de P0 y P1, van acá.

### P2-7 · Corregir inconsistencias de la documentación

- Tabla de Stack Técnico: la fila de OnlyOffice dice "hosting desconocido". Ya está resuelto y documentado más abajo en el mismo archivo. Actualizar.
- Sección Desarrollo Local: dice `# Vitest (163 tests, 12 desactualizados)`. Son 185 y pasan todos. Actualizar.
- Verificar que el conteo de tests en la sección Tests coincida con la salida real de `npm run test`.

**✅ Resuelto 27/07/26** (y superado varias veces desde entonces por el propio ritmo de la sesión). OnlyOffice: hosting confirmado (GCP `southamerica-west1-b`, IP estática, ver §Servidor OnlyOffice de `PROYECTO.md`) — ya no dice "desconocido". Tests: la suite creció durante el mismo día (163→175→185→192, cada salto documentado en su changelog correspondiente); el número en `PROYECTO.md` está sincronizado con `npm run test` a la fecha de este documento.

### P2-8 · CI mínimo

GitHub Action que en cada push y PR a `main` corra `npm run test` y `npm run build`. Es media hora de trabajo y cambia cualitativamente cómo se lee el proyecto: hoy no hay nada que impida romper producción con un push.

**✅ Resuelto 27/07/26** — `.github/workflows/ci.yml`, confirmado corriendo en verde en GitHub Actions. No incluye `npm run lint` a propósito: hay 54 errores preexistentes que harían fallar el CI desde el día uno; arreglarlos queda anotado como ítem de backlog aparte antes de sumarlo al gate.

### P2-9 · Limpiar políticas RLS duplicadas

Cinco tablas (`usuarios`, `registros`, `personas`, `documentos`) tienen dos generaciones de políticas conviviendo, previas a los helpers `es_admin()` / `mi_registro()`. Es redundancia inofensiva (las políticas permisivas se combinan con OR) pero es deuda que ya generó un riesgo real una vez: la política vieja de `templates` anulaba en la práctica el chequeo de `es_admin()` en escritura.

**Con cuidado:** primero listar el estado real en vivo, después proponer los `DROP`, después ejecutar de a uno verificando que la app siga funcionando. No batch. Referencia: `scripts/rls_completo.sql`.

### P2-10 · Indicador de frescura de datos normativos

Los aranceles, sellos y tasas del calculador de presupuesto se degradan con el tiempo, y ya hay cadencias definidas en `scripts/datos_sensibles.md` (ATM anual en diciembre, Colegio trimestral).

Implementar el indicador "Datos al: [fecha]" con warning si pasaron más de 90 días. Empezar visible solo para admin.

**Valor extra:** esto es citable en el formulario como evidencia de que el conocimiento normativo se trata como un activo mantenido y no como un dataset congelado. Es un diferencial real frente a cualquier wrapper de LLM.

### P2-11 · Entorno de staging

Aparece como excusa recurrente en la doc ("no hay entorno de staging"). La versión mínima viable: usar los preview deployments de Vercel apuntando a un proyecto Supabase separado. No es trivial (hay que replicar schema y RLS) así que no entra antes del 6 de agosto — pero conviene que quede escrito como decisión pendiente con un plan, no como un hueco.

---

## Lo que NO se hace en esta ventana

Explícito para evitar que se abra por accidente:

- Fase 2 del sistema de bloques (descomposición completa del cuerpo base, edición quirúrgica vía bookmarks en OO). Está fuera de alcance por decisión previa y sigue afuera.
- Migración a TypeScript.
- Reescritura del historial de git.
- Migración de región de la VM sin decisión explícita.
- Features nuevas de cualquier tipo. Esta ventana es de endurecimiento, no de construcción.

---

## Insumos para el formulario

A medida que se cierran tareas, ir juntando estas afirmaciones verificables. Son las que van al bloque de Operaciones y Tecnología, y tienen que ser ciertas cuando se escriban:

- Arquitectura de tres capas: Vercel serverless + Supabase (PostgreSQL con RLS) + VM dedicada para el motor DOCX, con Cloudflare como CDN y proxy propio (Worker `oo-proxy`) para assets same-origin y passthrough de WebSocket.
- Credenciales en variables de entorno del proveedor; sin secretos en el repositorio.
- Aislamiento de datos por escribanía mediante RLS con `auth.uid()`, JWT del usuario propagado a las funciones serverless.
- Scope OAuth mínimo (`drive.file`): la app accede únicamente a los archivos que ella misma crea.
- Verificación determinística de datos críticos: el modelo de lenguaje interpreta y redacta, pero no calcula ni valida. Los cálculos corren algoritmos reales (`validar_cuit` contra el algoritmo de ARCA, cálculo de CUIL, `inferirProvincia()` por lookup).
- Observabilidad instrumentada antes de tener clientes: captura global de errores, `ErrorBoundary`, logging de cada llamada al asistente con duración y resultado, canal de feedback del usuario.
- Suite de tests automatizados (número exacto según `npm run test` al momento de escribir).
- Residencia de datos documentada por componente.
- Corpus normativo con cadencias de actualización definidas por fuente.
