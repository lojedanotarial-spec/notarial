# Tareas: Almacenamiento propio de Notarial (R2)

**Estado:** ✅ aprobado de hecho por Lucas el 10/11/26 (pidió avanzar: "corré vos el sql"). En ejecución: Fases 0 a 3 hechas y desplegadas; Fase 4: desplegada y probada en producción; falta lo de T4.6 que es de Lucas (celular real, entrar por email)
**Spec:** [`spec.md`](spec.md) ✅ · **Plan:** [`plan.md`](plan.md) ✅ (aprobado 10/11/26)
**Responsable:** 🤖 = Claude · 👤 = Lucas. Cada tarea cierra con su verificación. Los tests se escriben antes que el código.

## Qué te toca a vos (resumen)

- **Fase 1:** correr 1 script SQL en el SQL Editor de Supabase (te lo dejo listo, con reversión).
- **Fase 1 (T0.4):** abrir una página de prueba desde tu celular y subir una foto.
- **Fase 6:** correr el SQL de limpieza y borrar el cliente de Google en Google Cloud.
- **Al final:** probar con un iPhone y un Android reales (queda pendiente tuyo, como el resto).

Todo lo demás lo hago yo.

## Fase 0 — Infraestructura y experimento (T0)

Nada se construye encima hasta tener esto.

- [x] **T0.1 🤖** (hecho 10/11/26) `scripts/r2_archivos.mjs`: crea el bucket privado `notarial-archivos`, un token limitado a ese bucket, la regla de CORS (`https://notarial.lat` y `http://localhost:5173`), la regla de ciclo de vida (borrar `tmp/` a las 24 h) y guarda `ARCHIVOS_R2_*` en `scripts/.env`. Es repetible: si algo ya existe, lo reutiliza. *Verif.: el script informa cada paso y no imprime ningún secreto; el bucket figura en Cloudflare.*
- [x] **T0.2 🤖** (hecho 10/11/26) Cargar las variables en Vercel con `node scripts/vercel_env.mjs ARCHIVOS_R2_...` (sensitive / production). *Verif.: `--listar` muestra los nombres.*
- [x] **T0.3 🤖 Experimento** (hecho 10/11/26, resultados en `plan.md`) contra R2 real, con un script temporal en `scripts/spikes/` (se borra al terminar):
  - [ ] Dirección firmada de subida: ¿la acepta R2 desde un navegador real con CORS?
  - [ ] ¿Se puede fijar el tamaño en la firma, o hay que medir después? (decide si el servidor mide el objeto temporal.)
  - [ ] Consultar el objeto (existencia, tamaño, tipo), copiarlo a la clave definitiva, borrar el temporal.
  - [ ] Lectura en streaming de 20 MB a través de una función de Vercel.
  - [ ] Confirmar que la regla de ciclo de vida quedó registrada.
  *Resultado esperado: todo funciona. Si algo falla, se ajusta `plan.md` y te aviso antes de seguir.*
- [~] **T0.4 👤 Experimento en celular** (se junta con T4.6: la subida desde un navegador real ya funciona y CORS no depende del dispositivo; el celular real se prueba en el flujo del QR, sin página aparte) Abrir una página de prueba temporal en `notarial.lat` desde tu celular y subir una foto con la cámara. *Verif.: llega a R2 sin error de CORS. Hacerlo en iPhone si hay uno a mano; si no, Android.*
- [x] **T0.5 🤖** (hecho 10/11/26) Registrar los resultados en `plan.md` y borrar el material de prueba (archivos, página, rutas). *Verif.: sin restos en el repo, en Vercel ni en el bucket.*

**Punto de control:** si el experimento obliga a cambiar el diseño, se actualiza `plan.md` y te aviso.

## Fase 1 — Base de datos (solo aditivo)

- [x] **T1.1 🤖** (hecho 10/11/26) `scripts/almacenamiento_propio.sql` + `scripts/almacenamiento_propio_rollback.sql`: columna `clave`, `lote_id`, `expediente_id` opcional con chequeo de que haya uno u otro, valor `almacen='propio'`; tabla `archivos_a_purgar`; triggers en `expedientes` y `lotes` que copian las claves a purgar (+30 días); acciones `restaurar` y `purgar` y `lote_id` en `drive_auditoria`; RLS sin políticas en tablas nuevas. *Verif.: el script es idempotente y no toca las filas ni la política actuales.*
- [x] **T1.2 👤** (hecho 10/11/26) Pegar y correr `almacenamiento_propio.sql` en el SQL Editor de Supabase (un solo pegado). *Verif.: dice "Success".*
- [x] **T1.3 🤖** (hecho 10/11/26: 34 filas intactas, solo el aviso esperado) Verificar por consulta: columnas, triggers, que las 34 filas de prueba quedaron intactas y que `get_advisors` no suma avisos de seguridad nuevos. *Verif.: informe corto.*
- [x] **T1.4 🤖** (hecho 10/11/26: Lucas borró el expediente de prueba desde la pantalla; la clave quedó en la cola a 30 días. La fila de prueba en `archivos_a_purgar` se limpia sola al vencer) Prueba del trigger en la base real: crear un expediente de prueba con una fila de archivo, borrarlo, ver que la clave quedó en `archivos_a_purgar` a 30 días, y limpiar. *Verif.: la fila existe y se borró lo de prueba.*

## Fase 2 — Almacén y purga (lógica con pruebas primero)

- [x] **T2.1 🤖** (hecho 10/11/26: 14 tests; almacén falso en `src/__tests__/_almacenFalso.js`) `api/_almacen.js` + `src/__tests__/almacen.test.js` (tests antes): armado de claves (`<registro>/<expediente|lote>/<id>`, `tmp/<id>`), cliente R2 con `aws4fetch` (firmar subida a `tmp/`, consultar, copiar, borrar, leer en streaming) y un **almacén falso** para pruebas. Un registro no puede producir claves de otro. *Verif.: tests en verde.*
- [x] **T2.2 🤖** (hecho 10/11/26: 10 tests; nunca borra claves temporales o inválidas; acciones `restaurar` y `purgar` y `lote_id` agregadas al historial) `api/_almacenPurga.js` + tests: borra los archivos vencidos (`borrado_en` > 30 días) y las claves de `archivos_a_purgar` vencidas, objeto primero y fila después, tolerando que el objeto ya no exista; registra `purgar` en el historial. *Verif.: tests con almacén falso: vencidos se van, no vencidos se quedan, un fallo no frena el resto.*
- [x] **T2.3 🤖** (hecho 10/11/26: la purga nunca lanza, así una falla del almacén no tumba la de capturas ni el backup; suite completa 675 en verde; sin deploy hasta T3.5) Enganchar la purga al camino que ya usa el Worker horario (`workers/purga` → `api/captura`, acción `purgar`) y al backup diario (`api/cron/backup.js`) como respaldo. *Verif.: los tests existentes de purga y backup siguen en verde y hay uno nuevo que prueba el enganche. Sin funciones ni cupos de cron nuevos en Vercel.*

## Fase 3 — Servidor de expedientes (`api/drive.js`)

Las acciones y el formato de respuesta se mantienen para no tocar casi nada del cliente.

- [x] **T3.1 🤖** (hecho 10/11/26: `almacenApi.test.js`, 35 tests; la subida usa un *ticket* firmado por el servidor que ata registro, expediente, nombre, tipo y tamaño) Tests nuevos primero, con el almacén falso (reutilizando los de Google que ya existen, adaptados): `iniciar_subida` (valida tamaño ≤ 25 MB, nombre y tipo; autoriza el expediente; devuelve dirección firmada a `tmp/`), `confirmar_subida` (mide el objeto, rechaza y borra si pasa de 25 MB, copia a la clave definitiva, borra el temporal, registra la fila), `ver`/`descargar` en streaming con las cabeceras de seguridad, `borrar`, `restaurar` (solo administrador), `renombrar` (solo base), `celular_*` (subida por QR y espera), identificación. Otro registro ⇒ 404 en todo. *Verif.: tests escritos y fallando por la razón correcta.*
- [x] **T3.2 🤖** (hecho 10/11/26: el almacén propio es opt-in con `almacen:"propio"` en el pedido, así la pantalla vieja y los archivos de Drive siguen igual hasta la Fase 4; se agregaron `restaurar` y `listar_borrados`, solo administrador) Implementar las acciones del T3.1 sobre el almacén, manteniendo `almacen='escribania'` (Drive) funcionando en paralelo para los archivos viejos hasta la Fase 6. *Verif.: tests en verde, incluidos los viejos.*
- [x] **T3.3 🤖** (hecho 10/11/26: acciones `restaurar`/`purgar` y `lote_id` en el historial; los mensajes del almacén propio no mencionan Drive. Los mensajes viejos se van con el código de Google en la Fase 6) `api/_drive.js`: ajustes de reglas puras (mensajes en castellano sin términos técnicos, tamaño, nombres). *Verif.: tests en verde.*
- [x] **T3.4 🤖** (hecho 10/11/26: 710 tests en verde, lint y build sin errores) Tests completos, lint (sin errores nuevos respecto de la base) y build. *Verif.: todo verde.*
- [x] **T3.5 🤖** (hecho 10/11/26, commit ba08103, estado "success" en GitHub/Vercel. La prueba real contra R2 desde producción queda para T4.6 con la pantalla nueva: el navegador de pruebas perdió la sesión) Deploy a producción (todavía sin que las pantallas usen el almacén nuevo, salvo que el cliente lo pida). Verificar el deploy por la API de GitHub/Vercel y que las rutas viejas responden igual. *Verif.: producción sana, sin errores nuevos.*

## Fase 4 — Pantallas de expedientes

- [x] **T4.1 🤖** (hecho 11/11/26: `almacenCliente.test.js`, 14 tests; ZIP con JSZip real, cancelable, carga diferida) `src/utils/driveApi.js` y `driveCliente.js` + tests: la subida hace el `PUT` directo a la dirección firmada (sin esperar respuesta de Google) con barra de progreso; errores traducidos; "Descargar todo" arma el comprimido en el navegador (jszip), con nombres actuales, y avisa si el total pasa de ~300 MB. *Verif.: tests en verde.*
- [x] **T4.2 🤖** (hecho 11/11/26; la verificación visual a 360 px y 1366x768 se hace en producción en T4.6) `ArchivosEscribania.jsx`: sin estados de conexión ni la palabra "Drive" (título "Archivos del expediente"); botón **Descargar todo**; para el administrador, ver archivos borrados y **Restaurar**; aviso fijo "Máximo 25 MB por archivo". *Verif.: los estados vistos a 360 px.*
- [x] **T4.3 🤖** (hecho 11/11/26 en código; capturas a 360x640 en T4.6) `SubirMovil.jsx` y `SubidaCelular.jsx`: la subida usa el flujo nuevo. Probar con listas largas en 360x640 (la trampa del scroll global). *Verif.: capturas a 360x640 con muchas fotos.*
- [x] **T4.4 🤖** (hecho 11/11/26: componente compartido `ConfirmarEliminarExpediente`; se quitó el botón "Abrir carpeta en Drive") Al borrar un expediente, la pantalla avisa cuántos archivos tiene y que se eliminarán a los 30 días (`ExpedientesScreen.jsx` / `ExpedienteDetailScreen.jsx`). *Verif.: aviso visible; la fila de `archivos_a_purgar` se crea (ya probado en T1.4).*
- [x] **T4.5 🤖** (hecho 11/11/26, commits 54507ac y 363647f; 724 tests; lint sin errores nuevos) Tests, lint, build y deploy a producción. *Verif.: todo verde, deploy verificado.*
- [~] **T4.6 🤖+👤 Prueba de punta a punta en producción** (11/11/26: hecho por mí lo marcado con ✅; falta lo de 👤) con tus fotos de prueba, registro **9876** (y el 853 como "otro registro"):
  - [x] ✅ Subir varios archivos juntos (2 desde la compu, 6 desde la página del celular) y rechazo de más de 25 MB con mensaje claro. Subida con tamaño distinto al declarado: rechazada al confirmar. Falta solo uno de ~20 MB real.
  - [~] ✅ El flujo del QR anda contra R2 real (abrir página, subir 6 fotos, quitar; el scroll y el panel fijo andan). 👤 Falta que Lucas lo pruebe con su celular real (cámara y CORS en iPhone/Android).
  - [x] ✅ Ver, bajar, borrar y restaurar (admin) probados en producción. Renombrar cubierto por tests (falta mirarlo en pantalla).
  - [x] ✅ **Descargar todo**: comprimido de 813 KB con los dos archivos y sus nombres.
  - [ ] Entrar **por email** (no por Google): todo funciona sin pedir nada.
  - [ ] Usuario del registro **853**: no ve ni abre archivos del 9876 (ni con la dirección).
  - [~] ✅ El aviso al eliminar muestra la cuenta de archivos (con 0: "No tiene archivos."). Falta probarlo con un expediente con archivos (👤 o yo con un expediente nuevo).
  - [ ] El historial muestra cada acción.

## Fase 5 — Lotes y barrios, login sin Drive

- [ ] **T5.1 🤖** Tests primero y luego servidor: contenedor "lote" en `api/drive.js` (mismas acciones, `lote_id`, autorización por registro del barrio); la escritura generada queda como archivo del lote y se **reemplaza** al regenerar. *Verif.: tests en verde.*
- [ ] **T5.2 🤖** `BulkScreen.jsx`: crear la estructura del barrio ya no crea carpetas en Drive (es una agrupación lógica). `LoteDocScreen.jsx`: subir documentación y ver la escritura usan el componente de archivos. `PartesEditor.jsx`: **Escanear un archivo del lote** lee un archivo ya guardado en el lote. *Verif.: sin llamadas a Google en estas pantallas.*
- [ ] **T5.3 🤖** `AuthContext.jsx` y `App.jsx`: "Entrar con Google" deja de pedir el permiso de Drive y se elimina el manejo del `provider_token`. *Verif.: el scope pedido es solo de identificación; entrar con Google y con email funciona.*
- [ ] **T5.4 🤖** Tests, lint, build y deploy. Verificación en producción (👤 solo si hace falta ver algo con tu cuenta): crear un barrio nuevo, subir documentación a un lote, escanear un archivo, generar y guardar la escritura, **entrando con email**. *Verif.: el generador deja de fallar por "falta de login".*

## Fase 6 — Cortar Drive (la única sin vuelta fácil)

Solo si las fases 4 y 5 quedaron probadas en producción y me das el visto bueno.

- [ ] **T6.1 🤖** Desconectar las dos conexiones de prueba (853 y 9876): revocar el permiso en Google y borrar el token guardado. *Verif.: `drive_conexiones` sin tokens.*
- [ ] **T6.2 🤖** Quitar el código: `api/_driveGoogle.js`, cifrado de tokens, enlaces `/drive/<código>`, `driveHelper.js`, `loteDrive.js`, `DriveAdminScreen.jsx`, `DriveConectar.jsx`, botón del panel en "Seleccionar registro", ruta `/api/drive-callback` en `vercel.json`, acciones de Google en `api/drive.js` (incluido `sincronizar`) y variables de Google en Vercel. *Verif.: tests (los de Google se eliminan junto con su código), lint, build y el test de imports `.js` en verde.*
- [ ] **T6.3 🤖** `scripts/almacenamiento_propio_limpieza.sql` + reversión: elimina `drive_conexiones`, `drive_enlaces`, `archivos` (vacía) y las columnas de Drive; deja la política de `expediente_archivos` en solo lectura por registro (reemplaza al `drive_escribania_politicas.sql` que nunca se aplicó). *Verif.: el script es claro y el rollback restaura la estructura.*
- [ ] **T6.4 👤** Correr el SQL de limpieza en el SQL Editor. *Verif.: "Success".*
- [ ] **T6.5 🤖** Deploy y verificación final en producción: archivos y lotes siguen funcionando. Quitar `drive_conexiones` y `drive_enlaces` de `TABLAS_EXCLUIDAS` del backup si ya no existen. *Verif.: producción sana.*
- [ ] **T6.6 👤** En Google Cloud, eliminar el cliente "Notarial Drive escribanias". *Verif.: ya no figura. Con él, el secreto pegado en el chat deja de importar.*

## Fase 7 — Panel de uso y documentación

- [ ] **T7.1 🤖** Panel para el administrador: por registro, cantidad de archivos vigentes y borrados, y GB ocupados (consulta en el servidor, solo administrador). Tests primero. *Verif.: coincide con una suma hecha a mano en la base; vista a 360 px.*
- [ ] **T7.2 🤖** Documentación: `PROYECTO.md` (arquitectura, almacén, purga, costos), `BACKLOG.md` (segunda copia de archivos en otro proveedor, revisión legal y política de privacidad antes de cargar documentos reales, "Descargar todo" en streaming si hace falta), `specs/drive-escribania/` y `specs/escaneo-drive-carga-masiva/` marcadas como reemplazadas, memoria del proyecto actualizada. *Verif.: sin menciones a Drive como almacén vigente.*
- [ ] **T7.3 🤖** Cerrar la feature: marcar spec/plan/tasks como completados y retomar `specs/personas-expediente/` (en pausa) con sus preguntas abiertas. *Verif.: estados actualizados.*
- [ ] **T7.4 👤** Checklist manual en iPhone y Android reales (queda pendiente tuyo): sacar fotos, subir por el QR, ver y bajar un archivo, entrar con email y con Google.

## Trazabilidad (criterio de la spec → tarea)

| Criterio | Tareas |
|---|---|
| Archivos sin Google, privados por registro, 25 MB, calidad original | T3.1–T3.2, T4.6 |
| Descargar todo, sin la palabra "Drive", errores en castellano | T3.3, T4.1–T4.2 |
| Borrar recuperable 30 días, restaurar, borrar expediente | T1.1, T1.4, T2.2, T3.2, T4.4, T4.6 |
| Barrios y lotes sin login con Google | T5.1–T5.4 |
| Retirar Drive, "Entrar con Google" solo identifica, cliente eliminable | T5.3, T6.1–T6.6 |
| Panel de uso por registro | T7.1 |
| Cifrado, historial, privacidad antes de datos reales | T0.1, T3.2, T7.2 |
