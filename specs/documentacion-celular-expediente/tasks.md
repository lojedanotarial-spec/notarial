# Tareas: Subir documentación al expediente desde el celular

**Estado:** ✅ aprobado por Lucas el 09/11/26, con un cambio de orden: **primero todo salvo la identificación automática (etapa A); el "agente" que identifica y renombra queda para después (etapa B)**. En ejecución: etapa A (fases 1 a 5 y T6.1 hechas; sigue el deploy)
**Spec:** [`spec.md`](spec.md) ✅ · **Plan:** [`plan.md`](plan.md) ✅
**Responsable:** 🤖 = Claude · 👤 = Lucas. Cada tarea cierra con su verificación.

## Cambio de orden (09/11/26)

Lucas prefirió no juntar fotos reales ahora. La identificación es un módulo separado (plan §6), así que:

- **Etapa A (ahora):** sesiones por QR, página del celular, subida de calidad original, quitar desde el celular, lista que se actualiza sola, y **corregir el nombre y el tipo a mano**. Mientras no esté el agente, los archivos de la cámara se nombran con fecha y hora (`Foto 09-11-2026 15.30.01.jpg`) y los de la galería conservan su nombre original.
- **Etapa B (después):** el agente que reconoce el documento y lo renombra, con las pruebas con fotos reales y el análisis de costo. Las columnas de la base que necesita se crean ya en la etapa A, para no migrar dos veces.

---

# ETAPA A — todo salvo el agente

## Fase 1 — Prueba previa

- [x] **T1.1 (hecho 09/11/26) 🤖** Renombrar en Drive un archivo creado por la app (con `drive.file`) contra la cuenta `lojeda.notarial@gmail.com`, con el token de prueba de `scripts/.env`. Borrar el archivo de prueba al final. *Resultado esperado: el nombre cambia. Si no: el nombre se guarda solo en la base y se muestra ese (plan B).*

## Fase 2 — Base de datos

- [x] **T2.1 (hecho 09/11/26) 🤖** `scripts/drive_celular.sql` (aditivo, plan §4, incluye las columnas de identificación que usará la etapa B) y su reversión `scripts/drive_celular_rollback.sql`.
- [x] **T2.2 (hecho 09/11/26) 🤖/👤** Aplicar la migración. Si el sistema de permisos la rechaza, **la aplica Lucas** en el SQL Editor. *Verif.: consulto tablas y columnas; `get_advisors` sin alertas nuevas salvo el informativo esperado.*

## Fase 3 — Lógica pura, con pruebas primero

- [x] **T3.1 (hecho 09/11/26) 🤖** `api/_driveCelular.js` + tests: vigencia de 30 min, gracia de 5 min solo para confirmar, sesión cerrada, qué archivos son de la sesión, URL del QR, nombre automático por fecha y hora para las fotos de la cámara.
- [x] **T3.2 (hecho 09/11/26) 🤖** Acciones de auditoría nuevas (`celular_abrir`, `celular_cerrar`, `renombrar`) en `api/_drive.js`. *Verif.: los tests existentes siguen en verde.*

## Fase 4 — API

- [x] **T4.1 (hecho 09/11/26) 🤖** **Refactor sin cambio de comportamiento:** partir `iniciarSubida` y `confirmarSubida` en funciones de núcleo reutilizables. *Verif.: los 59 tests de `driveApi.test.js` pasan sin modificarlos.*
- [x] **T4.2 (hecho 09/11/26) 🤖** Acciones de la compu: `celular_crear`, `celular_cerrar`, `renombrar`. *Verif. con Google simulado: solo expedientes del propio registro, Drive caído ⇒ mensaje claro, cerrar corta de inmediato, el renombre cambia el nombre en Drive y en la base.*
- [x] **T4.3 (hecho 09/11/26) 🤖** Acciones del celular: `celular_info`, `celular_iniciar_subida`, `celular_confirmar` (con gracia), `celular_quitar`. *Verif.: sesión vencida/cerrada/ajena ⇒ rechazo; no se puede quitar un archivo de otra sesión ni de otro expediente; confirmación idempotente; el celular nunca recibe archivos que no sean de su sesión.*
- [x] **T4.4 (hecho 09/11/26) 🤖** Limpieza oportunista de sesiones viejas al crear una. *Verif.: test.*

## Fase 5 — Pantallas

- [x] **T5.1 (hecho 09/11/26) 🤖** `driveCliente.js`: cola de subida de a uno con reintento. *Verif.: tests de lo puro.*
- [x] **T5.2 (hecho 09/11/26) 🤖** Cámara nueva `CamaraArchivo.jsx` de **máxima resolución** (componente aparte, para no tocar `CamaraCaptura.jsx` de la captura de datos). *Verif.: los tests de captura siguen en verde.*
- [x] **T5.3 (hecho 09/11/26) 🤖** `src/screens/SubirMovil.jsx` + ruta pública `/s/<código>` en `App.jsx`. *Verif.: estados vigente, vencida, cerrada, sin conexión, Drive caído, a 360 px.*
- [x] **T5.4 (hecho 09/11/26) 🤖** `ArchivosEscribania.jsx`: botón y panel del QR (cuenta regresiva, consulta cada 3 s, cerrar sesión), marca "desde el celular", botón **Editar** (nombre y tipo). *Verif.: no queda ninguna escritura directa del navegador a `expediente_archivos`.*

## Fase 6 — Verificación y deploy

- [x] **T6.1 (hecho 09/11/26) 🤖** Tests completos, lint (sin problemas nuevos respecto de la base: hoy 46) y build.
- [ ] **T6.2 🤖** Deploy y verificación por la API de GitHub.
- [ ] **T6.3 🤖** Verificación en producción de lo que se pueda sin teléfono: rechazos sin sesión, código inexistente, página `/s/…` a 360 px.

## Fase 7 — Prueba manual con teléfonos reales (Lucas + Claude)

Registro **9876**, cuenta `lojeda.notarial@gmail.com`.

- [ ] En un expediente: **Subir desde el celular** muestra el QR con cuenta regresiva; escanear con un **iPhone** y con un **Android**.
- [ ] Las tres formas de cargar funcionan: cámara en la página (ráfaga, sin flash), cámara del teléfono, galería (incluye un PDF).
- [ ] **S3:** anotar qué resolución sale de la cámara en la página en cada teléfono. **S4:** subir fotos de iPhone en formato HEIC.
- [ ] Una foto de ~20 MB sube bien; una de más de 25 MB se rechaza diciendo cuál es, sin frenar las demás.
- [ ] Las fotos aparecen solas en la compu, con la marca "desde el celular".
- [ ] **Quitar** una foto desde el celular: desaparece de ambos y queda en la papelera de Drive.
- [ ] **Cerrar sesión** desde la compu: el celular deja de poder subir y lo dice. Un QR vencido muestra el mensaje claro.
- [ ] Cortar el wifi del celular a mitad: las pendientes siguen en pantalla y se reintentan.
- [ ] Un usuario de otro registro **no ve** lo subido; el código de un expediente no sirve para otro.
- [ ] Corregir a mano el nombre y el tipo de un archivo desde la compu.
- [ ] Auditoría: queda registrado el QR abierto, cada archivo, cada quitado y cada renombre.

## Cierre de la etapa A

- [ ] **T8.1 🤖** Documentación: `PROYECTO.md`, `BACKLOG.md` (la feature en producción sin el agente; el agente como etapa B pendiente), memoria del proyecto.

---

# ETAPA B — el agente que identifica y renombra (cuando Lucas quiera)

- [ ] **TB.0 👤** Dejar **8 a 10 fotos reales** en `fotos_prueba/` (ya ignorada por git, nunca se sube): DNI frente y dorso, tarjeta verde, un poder, un formulario 08 y lo que tengas de más.
- [ ] **TB.1 🤖 S2** `scripts/spikes/identificar_modelo.mjs`: pasa cada foto por **Haiku 5.5** y por **Sonnet 5.5** con la miniatura reducida; tabla de tipo, lado, nombre, tiempo, **tokens de entrada y salida** y JSON válido. *Depende de TB.0.*
- [ ] **TB.2 👤+🤖 Punto de control:** miramos la tabla juntos; se decide el modelo y si el costo justifica identificar también desde la compu. Anotado en `plan.md` §9. Si ningún modelo alcanza, se corta y queda el nombre a mano.
- [ ] **TB.3 🤖** `api/_driveIdentificar.js` + tests: armado del nombre, saneado, duplicados, normalización de la respuesta del modelo (JSON roto, campos de más, valores fuera de lista, `legible: false`, confianza baja ⇒ "sin identificar"), validación y tope de la miniatura.
- [ ] **TB.4 🤖** Auditoría `identificar` y miniatura de identificación (≤ 1000 px, JPEG) en `driveCliente.js`.
- [ ] **TB.5 🤖** API: llamada al modelo, bloqueo atómico, renombre en Drive y en la base, `celular_identificar` e `identificar`, interruptores `DRIVE_IDENTIFICAR` y `DRIVE_IDENTIFICAR_COMPU`, tokens en la auditoría. *Verif. con la IA simulada: una sola identificación por archivo, error de la IA ⇒ "Sin identificar", solo se guardan nombre y tipo.*
- [ ] **TB.6 🤖** Pantallas: marcas "Identificando…" y "Sin identificar", selector "Tipo" con **Automático**, y la llamada desde el celular al terminar cada subida.
- [ ] **TB.7 🤖** Variables en Vercel (con `scripts/vercel_env.mjs`), deploy y prueba manual con teléfonos: el nombre aparece solo (`DNI García Juan - anverso.jpg`).
- [ ] **TB.8 🤖** Con los tokens reales de la auditoría, **costo por foto**. **Decisión de Lucas:** prender o no `DRIVE_IDENTIFICAR_COMPU`.

## Lo que nunca se hace sin preguntarte

Restringir la feature a ciertos usuarios en producción, prender la identificación para la compu sin haber visto el costo real, ni enviar fotos reales a la IA fuera de las pruebas acordadas.
