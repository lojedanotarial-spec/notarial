# Tareas: Drive de la escribanía

**Estado:** ✅ aprobado por Lucas el 06/11/26 (fase 3 de 3). En ejecución: Fases 0 a 4 hechas; sigue la Fase 5 (pantallas)
**Spec:** [`spec.md`](spec.md) ✅ · **Plan:** [`plan.md`](plan.md) ✅ (aprobado 06/11/26: enlace 24 h, solo el administrador conecta)
**Responsable:** 🤖 = Claude · 👤 = Lucas. Cada tarea cierra con su verificación.

## Fase 0 — Preparación

- [x] **T0.1 🤖** (hecho 06/11/26) Generar `DRIVE_CIFRADO_CLAVE` (32 bytes, base64) y guardarla en `scripts/.env`. *Verif.: la variable existe y no está en git.*
- [ ] **T0.2 👤** En Google Cloud, cliente `Notarial Drive escribanias` → agregar una segunda URI de redirección **temporal**: `http://localhost:53682/callback` (solo para los spikes; se borra al terminar la Fase 1). *Verif.: figura en el cliente.*
- [x] **T0.3** (hecho 06/11/26) Lucas dio un `VERCEL_TOKEN` en `scripts/.env` y cargué `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET` y `DRIVE_CIFRADO_CLAVE` con `scripts/vercel_env.mjs`. Figuran como Sensitive / Production. *Verif.: listadas por nombre, ningún valor impreso.*

## Fase 1 — Spikes (de-risk; nada se construye encima hasta tenerlos)

Script de apoyo en `scripts/spikes/drive_oauth.mjs` (hace el baile OAuth local con `lojeda.notarial@gmail.com`; guarda el token **solo** en `scripts/.env`).

- [x] **T1.1 👤** (hecho 06/11/26) Correr el script una vez y autorizar con `lojeda.notarial@gmail.com` en el navegador que se abre. *Verif.: el script informa "token guardado".*
- [x] **T1.2 🤖 S3** (hecho 06/11/26) Pedir `about.get` con `drive.file` + `openid email`. *Resultado esperado: devuelve email y cuota. Si no, pedir `email` además.*
- [x] **T1.3 🤖 S1** (hecho 06/11/26 con cabeceras; falta confirmarlo en navegador real en T6.3) Abrir una sesión reanudable con `Origin: https://notarial.lat` y hacer el `PUT` de un archivo de ~20 MB **desde un navegador real** (página de prueba temporal servida desde `notarial.lat`). *Resultado esperado: sube sin error de CORS. Si falla: plan B de tramos por el servidor (ajustar plan.md D6).*
- [x] **T1.4 🤖 S2** (hecho 06/11/26) Función temporal en Vercel que responde un cuerpo de 20 MB en streaming. *Resultado esperado: el navegador lo recibe completo. Si falla: plan B del plan.md (vista previa limitada + descarga por tramos).*
- [x] **T1.5 🤖** (hecho 06/11/26) Registrar los resultados en `plan.md` §8 y borrar los archivos de prueba. *Verif.: sin restos en el repo ni en Vercel.*
- [x] **T1.6 👤** (hecho 06/11/26) Borrar la URI `localhost` del cliente de Google. *Verif.: solo queda `https://notarial.lat/api/drive-callback`.*

**Punto de control:** si algún spike obliga a cambiar el diseño, se actualiza `plan.md` y se me avisa antes de seguir.

## Fase 2 — Base de datos

- [x] **T2.1 🤖** (hecho 06/11/26) Guardar la definición actual de la política `expediente_arch_acceso` para poder revertir: `scripts/drive_escribania_rollback.sql`.
- [x] **T2.2 🤖** (hecho 06/11/26, **parte aditiva**) `scripts/drive_escribania.sql` aplicado: tablas `drive_conexiones`, `drive_enlaces`, `drive_auditoria` con RLS sin políticas, columnas nuevas en `expediente_archivos` y `expedientes`. Verificado: 4 filas viejas quedaron como `personal`, la política existente no cambió, `get_advisors` solo suma 3 avisos informativos (RLS sin políticas, a propósito). **Cambio de plan:** el reemplazo de la política de `expediente_archivos` por solo lectura (`scripts/drive_escribania_politicas.sql`) pasa a **T6.2**, junto con el deploy, porque la pantalla actual escribe esa tabla desde el navegador.
- [x] **T2.3 🤖** (hecho 06/11/26) `drive_conexiones` y `drive_enlaces` agregadas a `TABLAS_EXCLUIDAS` en `api/cron/backup.js`, con test (316 en verde).

## Fase 3 — Lógica pura, con pruebas primero

- [x] **T3.1 🤖** (hecho 06/11/26: 43 tests propios, 359 en total; incluye `invalid_client` como error de configuración que NO rompe conexiones, y solo se previsualizan imágenes y PDF) `api/_drive.js` + `src/__tests__/drive.test.js` (escribir los tests antes): cifrado ida y vuelta y rechazo de datos alterados o con versión desconocida; vigencia y consumo de enlaces (24 h, un solo uso); `state` firmado y su verificación; validación de tamaño (≤ 25 MB), nombre y tipo; nombre de carpeta de expediente; mapeo de errores de Google a estado (`invalid_grant` → rota, cuota → sin_espacio); regla del 80 %; mensajes al usuario sin texto técnico. *Verif.: tests en verde.*

## Fase 4 — API (`api/drive.js`)

- [x] **T4.1 🤖** (hecho 09/11/26) Esqueleto: enrutado por `accion`, autenticación con Bearer, deducción del registro en el servidor, verificación de administrador con service key, auditoría. *Verif.: tests de 401 sin token, 403 a no administradores en `admin_*`, y que el registro del body se ignora.*
- [x] **T4.2 🤖** (hecho 09/11/26) Conexión: `admin_enlace`, `enlace_info`, `enlace_iniciar`, `callback` (canje del código, token cifrado, consumo del enlace, redirecciones de éxito/rechazo/vencido), `admin_desconectar` (revocación en Google), `admin_estado` (con cuota y advertencia ≥ 80 %). *Verif.: tests con Google simulado: enlace vencido, ya usado, inexistente, rechazo en el consentimiento, `state` inválido.*
- [x] **T4.3 🤖** (hecho 09/11/26) Archivos: `estado`, `iniciar_subida` (carpetas con guarda contra carrera, sesión reanudable), `confirmar_subida` (verifica padre y tamaño), `ver`/`descargar` (streaming), `borrar` (papelera). *Verif.: tests de otro registro ⇒ 404, archivo borrado ⇒ 404, `invalid_grant` ⇒ conexión rota con mensaje claro, cuota llena ⇒ informa lo no guardado.*
- [x] **T4.4 🤖** (hecho 09/11/26) `vercel.json`: función `api/drive.js` y ruta `/api/drive-callback`. *Verif.: el test que ya guarda los imports `.js` sigue en verde; build local OK.*

## Fase 5 — Pantallas

- [ ] **T5.1 🤖** `src/utils/driveApi.js` + tests (subida con progreso, errores traducidos).
- [ ] **T5.2 🤖** `src/screens/DriveConectar.jsx` + ruta pública `/drive/<codigo>` y `/drive/listo` en `App.jsx` (antes del login). *Verif.: estados vencido, ya usado, rechazado y listo, probados a 360 px.*
- [ ] **T5.3 🤖** `AdminScreen.jsx`: sección "Drive de las escribanías" (estado, cuenta, espacio, Conectar, que genera el enlace y ofrece tres botones: **WhatsApp** (mensaje redactado), **Mail** (redacción de Gmail con asunto y texto listos; Lucas pone el destinatario) y **Copiar enlace**; sin servicio de envío, Desconectar con confirmación, advertencia al 80 %).
- [ ] **T5.4 🤖** `ExpedienteDetailScreen.jsx`: sacar el pedido de login con Google y el `delete` explícito de archivos; subida múltiple con resultado por archivo; aviso fijo **"Máximo 25 MB por archivo"**; quién subió y cuándo; ver, descargar, borrar con confirmación; aviso cuando el registro no tiene Drive y cuando la conexión está caída. Sacar también el `delete` explícito en `ExpedientesScreen.jsx`. *Verif.: no queda ninguna escritura del navegador a `expediente_archivos`.*

## Fase 6 — Verificación y deploy

- [ ] **T6.1 🤖** Tests completos, lint (sin errores nuevos respecto de la base), build. *Verif.: todo verde.*
- [ ] **T6.2 🤖** **Primero** aplicar `scripts/drive_escribania_politicas.sql` (cambio de política de `expediente_archivos`; si algo sale mal, `scripts/drive_escribania_rollback.sql`) y **a continuación** deploy a producción, verificado por la API de GitHub. Los dos pasos van juntos para que la pantalla vieja no quede sin permiso de escritura mucho tiempo.
- [ ] **T6.3 🤖+👤** Checklist manual contra Google real, con el registro **9876** y `lojeda.notarial@gmail.com`:
  - [ ] Generar enlace, abrirlo, autorizar, ver el registro "conectado" con cuenta, fecha y espacio.
  - [ ] Abrir el mismo enlace de nuevo ⇒ "ya usado". Enlace vencido ⇒ mensaje claro. Rechazar en Google ⇒ no queda nada conectado.
  - [ ] Subir varios archivos juntos, uno de ~20 MB y uno mayor de 25 MB (se rechaza con mensaje). Un fallido no frena a los demás.
  - [ ] Ver, descargar, borrar; recuperarlo de la papelera de Drive.
  - [ ] Con un usuario que entra **por email**: sube y ve sin que se le pida Google.
  - [ ] Con un usuario de **otro registro** (el 853): no ve ni abre los archivos del 9876.
  - [ ] Revocar el permiso desde la cuenta de Google ⇒ los usuarios ven el aviso claro y el panel muestra "rota"; reconectar con enlace nuevo.
  - [ ] Auditoría: queda registro de subir, ver, descargar, borrar, conectar y desconectar.
  - [ ] Desconectar desde el panel ⇒ corta de inmediato; los archivos siguen en Drive.
- [ ] **T6.4 🤖** Documentación: `PROYECTO.md`, `BACKLOG.md` (marcar la feature, abrir la de "subir desde el celular al expediente"), memoria del proyecto y nota del Picker como idea futura.

## Fase 7 — Primera escribanía real (Fátima, registro 853)

- [ ] **T7.1 👤** Rotar el secreto del cliente de Google (agregar uno nuevo, deshabilitar el viejo) y ponerlo en `scripts/.env` **y** en Vercel (yo actualizo Vercel cuando me avises). **Antes de conectar a Fátima.**
- [ ] **T7.2 👤** Generar el enlace para el registro 853 desde el panel y mandárselo a Fátima por WhatsApp: "abrilo con el mail de la escribanía y tocá Autorizar".
- [ ] **T7.3 🤖+👤** Verificar en el panel que quedó conectada la cuenta esperada; Fátima sube un archivo de prueba y lo ve otro usuario del 853.

## Orden y dependencias

`Fase 0 → Fase 1 (punto de control) → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7`. Las fases 2 y 3 pueden ir en paralelo.

## Lo que nunca se hace sin preguntarte

Restringir la feature a ciertos usuarios en producción, tocar Carga Masiva, o borrar archivos reales de un Drive.
