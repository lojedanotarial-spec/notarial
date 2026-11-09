# Tareas: Subir documentación al expediente desde el celular

**Estado:** 📝 borrador (fase 3 de 3) — pendiente de aprobación de Lucas. NO escribir código hasta que se apruebe
**Spec:** [`spec.md`](spec.md) ✅ · **Plan:** [`plan.md`](plan.md) ✅ (aprobado 09/11/26)
**Responsable:** 🤖 = Claude · 👤 = Lucas. Cada tarea cierra con su verificación.

## Fase 0 — Preparación

- [ ] **T0.1 👤** Dejar **8 a 10 fotos reales** en `fotos_prueba/` (carpeta del proyecto, ya ignorada por git, así que no se sube nunca): DNI frente y dorso, una tarjeta verde (frente y dorso), un poder, un formulario 08, y si tenés algo más (una partida, una licencia). De personas a las que no les moleste que las lea la IA de prueba. *Verif.: yo cuento los archivos; no los abro fuera del script de la prueba S2.*

## Fase 1 — Pruebas previas (antes de construir encima)

- [ ] **T1.1 🤖 S1** Renombrar en Drive un archivo creado por la app (con `drive.file`) contra la cuenta `lojeda.notarial@gmail.com`, con el token de prueba que ya está en `scripts/.env`. Borrar el archivo de prueba al final. *Resultado esperado: el nombre cambia. Si no: plan B del plan (el nombre solo en la base).*
- [ ] **T1.2 🤖 S2** `scripts/spikes/identificar_modelo.mjs`: pasa cada foto de `fotos_prueba/` por **Haiku 5.5** y por **Sonnet 5.5** con la miniatura reducida, y arma una tabla (tipo, lado, nombre, tiempo, **tokens de entrada y salida**, JSON válido sí/no). *Depende de T0.1.*
- [ ] **T1.3 👤+🤖 Punto de control:** miramos la tabla juntos. Se decide el modelo y si el costo por foto justifica prender la identificación para la compu. Resultado anotado en `plan.md` §9. Si ningún modelo alcanza, se corta acá y se sigue sin identificación (nombre a mano).

## Fase 2 — Base de datos

- [ ] **T2.1 🤖** `scripts/drive_celular.sql` (aditivo, plan §4) y su reversión `scripts/drive_celular_rollback.sql`.
- [ ] **T2.2 🤖/👤** Aplicar la migración. Si el sistema de permisos la rechaza, **la aplica Lucas** en el SQL Editor (como la política del Drive). *Verif.: consulto las tablas y columnas nuevas; `get_advisors` sin alertas nuevas salvo el informativo esperado.*

## Fase 3 — Lógica pura, con pruebas primero

- [ ] **T3.1 🤖** `api/_driveIdentificar.js` + tests: armado del nombre (todos los casos del spec), saneado, nombres duplicados, normalización de la respuesta del modelo (JSON roto, campos de más, valores fuera de lista, `legible: false`, confianza baja ⇒ "sin identificar"), validación y tope de la miniatura, extensión del archivo.
- [ ] **T3.2 🤖** `api/_driveCelular.js` + tests: vigencia de 30 min, gracia de 5 min solo para confirmar, sesión cerrada, qué archivos son de la sesión, URL del QR.
- [ ] **T3.3 🤖** Acciones de auditoría nuevas (`celular_abrir`, `celular_cerrar`, `identificar`, `renombrar`) en `api/_drive.js`. *Verif.: tests existentes siguen en verde.*

## Fase 4 — API

- [ ] **T4.1 🤖** **Refactor sin cambio de comportamiento:** partir `iniciarSubida` y `confirmarSubida` en funciones de núcleo reutilizables. *Verif.: los 59 tests de `driveApi.test.js` pasan sin modificarlos.*
- [ ] **T4.2 🤖** Acciones de la compu: `celular_crear`, `celular_cerrar`, `renombrar`. *Verif. con Google simulado: solo expedientes del propio registro, Drive caído ⇒ mensaje claro, cerrar corta de inmediato.*
- [ ] **T4.3 🤖** Acciones del celular: `celular_info`, `celular_iniciar_subida`, `celular_confirmar` (con gracia), `celular_quitar`. *Verif.: sesión vencida/cerrada/ajena ⇒ rechazo; no se puede quitar un archivo de otra sesión ni de otro expediente; confirmación idempotente; el celular nunca recibe archivos que no sean de su sesión.*
- [ ] **T4.4 🤖** Identificación: llamada al modelo, bloqueo atómico, renombre en Drive y en la base, `celular_identificar` e `identificar`, interruptores `DRIVE_IDENTIFICAR` y `DRIVE_IDENTIFICAR_COMPU`, tokens en la auditoría. *Verif. con la IA simulada: una sola identificación por archivo, error de la IA ⇒ "Sin identificar", solo se guardan nombre y tipo, el token de Google no aparece en ninguna respuesta.*
- [ ] **T4.5 🤖** Limpieza oportunista de sesiones viejas al crear una. *Verif.: test.*

## Fase 5 — Pantallas

- [ ] **T5.1 🤖** `driveCliente.js`: miniatura de identificación (≤ 1000 px, JPEG), cola de subida de a uno con reintento. *Verif.: tests de lo puro.*
- [ ] **T5.2 🤖** `CamaraCaptura.jsx`: modo de **máxima resolución** sin tocar el comportamiento de la captura de datos. *Verif.: los tests de captura siguen en verde.*
- [ ] **T5.3 🤖** `src/screens/SubirMovil.jsx` + ruta pública `/s/<código>` en `App.jsx`. *Verif.: estados vigente, vencida, cerrada, sin conexión, Drive caído, a 360 px.*
- [ ] **T5.4 🤖** `ArchivosEscribania.jsx`: botón y panel del QR (cuenta regresiva, consulta cada 3 s, cerrar sesión), marcas "Identificando…" / "Sin identificar" / "desde el celular", botón **Editar** (nombre y tipo), selector "Tipo" con **Automático**. *Verif.: no queda ninguna escritura directa del navegador a `expediente_archivos`.*

## Fase 6 — Verificación y deploy

- [ ] **T6.1 🤖** Tests completos, lint (sin problemas nuevos respecto de la base: hoy 46) y build.
- [ ] **T6.2 🤖** Cargar `DRIVE_IDENTIFICAR` y `DRIVE_IDENTIFICAR_COMPU` en Vercel con `scripts/vercel_env.mjs` (según lo decidido en T1.3), deploy y verificación del estado por la API de GitHub.
- [ ] **T6.3 🤖** Verificación en producción de lo que se pueda sin teléfono: rechazos sin sesión, código inexistente, página `/s/…` a 360 px.

## Fase 7 — Prueba manual con teléfonos reales (Lucas + Claude)

Registro **9876**, cuenta `lojeda.notarial@gmail.com`.

- [ ] En un expediente: **Subir desde el celular** muestra el QR con cuenta regresiva; escanear con un **iPhone** y con un **Android**.
- [ ] Las tres formas de cargar funcionan: cámara en la página (ráfaga, sin flash), cámara del teléfono, galería (incluye un PDF).
- [ ] **S3:** anotar qué resolución sale de la cámara en la página en cada teléfono. **S4:** subir fotos de iPhone en formato HEIC.
- [ ] Una foto de ~20 MB sube bien; una de más de 25 MB se rechaza diciendo cuál es, sin frenar las demás.
- [ ] Las fotos aparecen solas en la compu, primero "Identificando…" y después con su nombre (`DNI García Juan - anverso.jpg`).
- [ ] **Quitar** una foto desde el celular: desaparece de ambos y queda en la papelera de Drive.
- [ ] **Cerrar sesión** desde la compu: el celular deja de poder subir y lo dice. Un QR vencido muestra el mensaje claro.
- [ ] Cortar el wifi del celular a mitad: las pendientes siguen en pantalla y se reintentan.
- [ ] Un usuario de otro registro **no ve** lo subido; el código de un expediente no sirve para otro.
- [ ] Corregir a mano el nombre y el tipo de un archivo desde la compu.
- [ ] Auditoría: queda registrado el QR abierto, cada archivo, cada quitado, cada renombre y los tokens usados.

## Fase 8 — Cierre

- [ ] **T8.1 🤖** Con los tokens reales de la auditoría, calcular el **costo por foto** y presentarlo. **Decisión de Lucas:** prender o no `DRIVE_IDENTIFICAR_COMPU`.
- [ ] **T8.2 🤖** Documentación: `PROYECTO.md`, `BACKLOG.md` (marcar la feature; anotar PDFs sin identificar y "identificar de nuevo" como mejoras), memoria del proyecto.

## Orden y dependencias

`Fase 0 → Fase 1 (punto de control) → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8`.
Las fases 2 y 3 se pueden hacer mientras se espera T0.1. T1.1 se puede hacer ya, sin las fotos.

## Lo que nunca se hace sin preguntarte

Restringir la feature a ciertos usuarios en producción, prender la identificación para la compu sin haber visto el costo real, ni enviar fotos reales a la IA fuera de las pruebas acordadas.
