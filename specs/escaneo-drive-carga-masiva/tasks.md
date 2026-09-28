# Tasks: Expedientes de barrio en Drive + escanear documentación por lote

**Plan:** [`plan.md`](plan.md) (aprobado)
**Estado:** 🔵 en curso

Orden estricto — cada tarea es verificable por separado antes de pasar a
la siguiente. Implementación en rama propia
(`feat/escaneo-drive-carga-masiva` o similar) + PR, nunca directo a
`main`.

- [ ] **T1 — Helpers de Drive nuevos, sin conectar a ninguna pantalla todavía**
  En `src/utils/driveHelper.js`: `descargarArchivoDrive(session,
  fileId)` (GET `alt=media`, devuelve `Blob`) y
  `reemplazarContenidoArchivoDrive(session, fileId, blob, mimeType)`
  (PATCH `uploadType=media`, pisa contenido sin crear archivo nuevo).
  **Verificación:** desde la consola del browser (o un botón de prueba
  temporal), descargar un archivo ya subido a un expediente existente y
  confirmar que el `Blob` resultante abre bien; reemplazar el contenido
  de un archivo de prueba y confirmar en Drive que el mismo `fileId`
  ahora tiene el contenido nuevo (no un archivo duplicado).

- [ ] **T2 — Migración: `barrios.drive_folder_id`, `archivos.*` + `obtenerCarpetaLoteDrive`**
  Columna nueva `drive_folder_id` (`text`, nullable) en `barrios`
  (Supabase). Tres columnas nuevas en `archivos` (`drive_file_id text`,
  `nombre text`, `mime_type text`) — la tabla ya existe con `lote_id`
  pero le faltaban estas para poder cachear archivos de Drive, mismo
  rol que `expediente_archivos` (plan.md sección 3). Nuevo
  `src/utils/loteDrive.js` con `obtenerCarpetaLoteDrive(session,
  { barrio, lote })` (raíz "Notarial" → carpeta del barrio, cacheada →
  carpeta "Manzana N" → carpeta "Lote N"), según plan.md sección 2.
  **Verificación:** llamarla dos veces seguidas para el mismo
  barrio/lote — la segunda vez no crea carpetas nuevas en Drive
  (reusa las de la primera, confirmado por id igual y por inspección
  visual en Drive).

- [ ] **T3 — Pre-creación masiva de lotes (UC-1 Parte B)**
  `ModalEstructuraLotes` en `BulkScreen.jsx`: filas de `{ manzana,
  rango }`, parser de rango (`1-12`, `3,5,7-11`), botón "+ Agregar
  manzana". Al confirmar: por cada número resuelto, si no existe ya un
  lote con esa `manzana`+`lote` en el barrio, insertar `LOTE_VACIO()`
  con `manzana`/`lote` cargados y crear su carpeta ya mismo vía
  `obtenerCarpetaLoteDrive` (secuencial, no en paralelo — plan.md
  decisión 1), guardando `driveFolderId` en el `datos_json` insertado.
  Fila con rango inválido: error inline en esa fila, no aborta las
  demás. Combinación ya existente: se salta, se informa cuántas.
  **Verificación:** crear un barrio nuevo, declarar 2 manzanas con
  rangos distintos (ej. `A: 1-5`, `B: 3,7-9`) — aparecen los lotes
  correctos en la tabla del barrio, y en Drive existe la carpeta del
  barrio con sus subcarpetas de manzana y lote, todas vacías. Repetir
  el mismo rango de la manzana A una segunda vez — no duplica lotes ni
  carpetas, avisa que ya existían.

- [ ] **T4 — Documentación de un lote, independiente de la escritura (UC-1 Parte A)**
  Nueva sección "Documentación" en `PanelLote` (`LoteDocScreen.jsx`):
  lista los archivos ya guardados leyendo `archivos` (`eq("lote_id",
  lote.id)`) y permite subir uno nuevo (`subirArchivoDrive` +
  `insert` en `archivos`), creando la carpeta on-demand vía
  `obtenerCarpetaLoteDrive` si el lote todavía no tiene
  `driveFolderId` (cubre lotes agregados de a uno, fuera de la
  estructura masiva de T3).
  **Verificación:** abrir un lote sin escritura generada todavía y sin
  `driveFolderId` — subir un archivo desde esa sección funciona, crea
  la carpeta en el momento, y el archivo queda visible en la lista al
  recargar la pantalla (confirmar también la fila nueva en `archivos`).

- [ ] **T5 — Escanear desde Drive (UC-2)**
  En `PartesEditor.jsx`: prop `loteId`, componente `ScanDriveBtn`
  (mismo archivo, para reusar `escanearDocumento()` directamente) que
  lista los archivos de `archivos` para ese `lote_id` (misma fuente
  que T4), deja elegir uno, lo descarga con `descargarArchivoDrive`
  (usando su `drive_file_id`) y lo pasa por el mismo camino que
  `ScanBtn`. Solo se muestra si `loteId` viene definido. `ModalPartes.jsx`
  recibe y reenvía la prop. `LoteDocScreen` la pasa con `lote.id`.
  **Verificación:** con al menos un archivo ya subido a la carpeta de
  un lote (de T4), abrir "Agregar adquirente" para ese lote — aparece
  la opción de escanear desde Drive junto al escaneo normal, elegir el
  archivo autocompleta los datos de la parte igual que el escaneo
  desde el dispositivo. Sin archivos guardados, muestra el aviso de
  "no hay archivos" en vez de romper. *(UC-2)*

- [ ] **T6 — La escritura generada queda en Drive (UC-3)**
  En `handleGenerar()` de `LoteDocScreen.jsx`, después de subir el DOCX
  a `oo-docs`: si `lote.driveEscrituraFileId` no existe, subir con
  `subirArchivoDrive` (nombre `Escritura - Mz {manzana} Lote
  {lote}.docx`) y guardar el id en `datos_json`; si ya existe, usar
  `reemplazarContenidoArchivoDrive` sobre ese mismo id. Si no hay
  `session.provider_token`, no bloquear la generación (plan.md
  decisión 4).
  **Verificación:** generar la escritura de un lote por primera vez —
  aparece un archivo nuevo en su carpeta de Drive. Cambiar un dato y
  regenerar — el mismo archivo se actualiza (mismo `fileId`, contenido
  nuevo), no aparece un segundo archivo.

- [ ] **T7 — Smoke test completo de los 3 UC en producción**
  Correr los tres casos de uso de punta a punta contra la app real (no
  hay entorno de staging estable): crear estructura de lotes, subir
  documentación, escanear desde Drive, generar escritura y verificar su
  copia en Drive — sobre un barrio de prueba real, no datos sintéticos
  sueltos. Documentar qué se probó en la descripción del PR.

- [ ] **T8 — PR, merge, y cierre del ciclo**
  Abrir el PR con el resumen de qué cambió y por qué (referenciando
  `spec.md`/`plan.md`). Tras mergear: actualizar `PROYECTO.md`, mover el
  ítem de "🔵 En curso" a "✅ Recién terminado" en `BACKLOG.md`, y marcar
  la Feature #16 y las User Stories #17-19 como `Closed` en Azure
  DevOps.
