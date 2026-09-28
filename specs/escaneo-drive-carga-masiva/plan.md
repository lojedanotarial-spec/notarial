# Plan: Expedientes de barrio en Drive + escanear documentación por lote

**Spec:** [`spec.md`](spec.md) (aprobado, sin preguntas abiertas)
**Estado:** 🟡 en revisión — pendiente de aprobación

## Causa raíz (por qué esto es extender, no inventar)

`ExpedienteDetailScreen.jsx` ya resuelve el problema general: carpeta
raíz "Notarial" → subcarpeta por expediente (id cacheado en
`expedientes.drive_folder_id`) → archivos sueltos, todo con
`driveHelper.js` (`buscarOCrearCarpetaDrive`, `subirArchivoDrive`,
`listarArchivosDrive`). Esta feature agrega un nivel más de jerarquía
(barrio → manzana → lote) y dos operaciones que hoy no existen en
`driveHelper.js` (descargar bytes de un archivo, reemplazar el
contenido de uno ya subido) — no un mecanismo de Drive nuevo.

El escaneo (`ScanBtn`/`escanearDocumento` en `PartesEditor.jsx`) también
se reusa tal cual: hoy recibe un `File` del selector del dispositivo,
lo redimensiona con un canvas y lo manda a `/api/vision`. Un archivo
descargado de Drive como `Blob` entra por el mismo camino sin tocar esa
función — el único paso nuevo es conseguir el `Blob` en vez de que lo
traiga un `<input type="file">`.

## Archivos afectados

### 1. `src/utils/driveHelper.js` — dos funciones nuevas

- **`descargarArchivoDrive(session, fileId)`** — `GET
  /files/{fileId}?alt=media` con el `Bearer` token, devuelve un `Blob`.
  Es lo que le falta al helper para el UC-2 (hoy solo tiene
  `urlDescargaDrive`, que arma un link para un `<a href>`, no bytes
  fetcheables con el token de la app).
- **`reemplazarContenidoArchivoDrive(session, fileId, blob, mimeType)`**
  — `PATCH /upload/files/{fileId}?uploadType=media`, sube nuevo
  contenido al mismo `fileId` sin crear un archivo nuevo ni tocar su
  nombre. Necesario para UC-3 (ver decisión #3).

Nada de lo que ya existe en el archivo cambia.

### 2. Nuevo: `src/utils/loteDrive.js`

Concentra la resolución de la jerarquía barrio → manzana → lote, para
que tanto la creación bajo demanda (UC-1 Parte A) como la pre-creación
masiva (UC-1 Parte B) usen la misma función y no diverjan:

```js
export async function obtenerCarpetaLoteDrive(session, { barrio, lote }) {
  const raizId = await buscarOCrearCarpetaDrive(session, "Notarial");

  let barrioFolderId = barrio.drive_folder_id;
  if (!barrioFolderId) {
    barrioFolderId = await buscarOCrearCarpetaDrive(session, barrio.nombre, raizId);
    await supabase.from("barrios").update({ drive_folder_id: barrioFolderId }).eq("id", barrio.id);
  }

  const manzanaFolderId = await buscarOCrearCarpetaDrive(
    session, `Manzana ${lote.manzana}`, barrioFolderId
  );

  let loteFolderId = lote.driveFolderId; // dentro de datos_json
  if (!loteFolderId) {
    loteFolderId = await buscarOCrearCarpetaDrive(session, `Lote ${lote.lote}`, manzanaFolderId);
    // el caller persiste driveFolderId en datos_json (ver más abajo)
  }
  return { barrioFolderId, manzanaFolderId, loteFolderId };
}
```

La función no persiste `loteFolderId` ella misma (no tiene acceso
directo a `datos_json` completo del caller) — devuelve el id y quien la
llama lo guarda. Sí persiste `barrio.drive_folder_id` directamente
porque ese campo vive en una columna real, no en JSON anidado.

### 3. Migración Supabase

- **`barrios.drive_folder_id`** (`text`, nullable) — mismo patrón que
  `expedientes.drive_folder_id`, mismo motivo (evitar recrear la
  carpeta del barrio cada vez).
- **`lotes` no necesita columna nueva** — ya guarda todo en
  `datos_json` (`manzana`, `lote`, `partes`, etc.), así que
  `driveFolderId` y `driveEscrituraFileId` (ver decisión #3) entran ahí
  como un campo más, igual que ya se extendió `LOTE_VACIO` en la
  Feature 1 sin migraciones.
- **`archivos`** gana tres columnas (`drive_file_id text`, `nombre
  text`, `mime_type text`) — corrección encontrada al revisar
  `ExpedienteDetailScreen.jsx` línea por línea: el patrón real de
  Expedientes **no lista archivos en vivo desde la API de Drive**
  (`listarArchivosDrive` existe en `driveHelper.js` pero no se usa en
  ningún lado) — usa una tabla que cachea cada archivo subido
  (`expediente_archivos`: `drive_file_id`, `nombre`, `tipo`,
  `mime_type`) y lee de ahí. La tabla `archivos` ya existe en el
  esquema con `lote_id` (FK a `lotes`) y `tipo`, pero le faltan esas
  tres columnas para poder cumplir el mismo rol para lotes — se
  completa en vez de crear una tabla nueva.

### 4. `src/screens/BulkScreen.jsx` — pre-creación masiva (UC-1 Parte B)

- `LOTE_VACIO()` gana dos campos: `driveFolderId: ""`,
  `driveEscrituraFileId: ""`.
- Nuevo componente `ModalEstructuraLotes` (junto a `ModalLote`,
  mismo archivo): filas de `{ manzana, rango }`, botón "+ Agregar
  manzana", parser de rango que acepta `1-12` y `3,5,7-11` (ver
  decisión #2).
- Nuevo botón "Crear estructura de lotes" al lado de "+ Agregar lote"
  en `DetalleBarrio` (línea ~310).
- Nueva función `crearEstructuraLotes(bid, filas)`: por cada número
  resuelto, si no existe ya un lote con esa `manzana`+`lote` en el
  barrio (evita duplicar), inserta un `LOTE_VACIO()` con `manzana`/
  `lote` cargados, llama `obtenerCarpetaLoteDrive()` para crear su
  carpeta ya mismo (a propósito no-lazy acá — ver decisión #1), guarda
  `driveFolderId` en el `datos_json` insertado.

### 5. `src/screens/LoteDocScreen.jsx` — documentación + escritura en Drive

- Nueva sección "Documentación" en `PanelLote`, independiente del
  estado de generación de la escritura: lista los archivos ya
  guardados para ese lote leyendo la tabla `archivos` (`eq("lote_id",
  lote.id)` — mismo patrón que `expediente_archivos`, no una llamada
  en vivo a la API de Drive) y un botón para subir uno nuevo
  (`subirArchivoDrive` + insertar la fila en `archivos`), creando la
  carpeta on-demand vía `obtenerCarpetaLoteDrive` si el lote no tiene
  `driveFolderId` todavía — cubre el lote que se creó de a uno, no por
  la estructura masiva.
- `handleGenerar()` — después de subir el DOCX a `oo-docs` (sin
  cambios ahí), sube/actualiza la copia en Drive:
  - Si `lote.driveEscrituraFileId` no existe: `subirArchivoDrive(...)`
    con nombre fijo `Escritura - Mz {manzana} Lote {lote}.docx`, guarda
    el id devuelto en `datos_json.driveEscrituraFileId`.
  - Si ya existe: `reemplazarContenidoArchivoDrive(session,
    driveEscrituraFileId, blob, ...)` — pisa el contenido, no crea un
    archivo nuevo cada regeneración (ver decisión #3).
  - Si `session.provider_token` no existe (no autenticado con Google o
    token vencido): no bloquea la generación — el documento se genera
    igual en `oo-docs` como hoy, la copia en Drive simplemente no se
    sube esa vez (mismo criterio no-bloqueante que ya usa
    `ExpedienteDetailScreen` para la subida a expedientes).

### 6. `src/components/ui/PartesEditor.jsx` — escanear desde Drive (UC-2)

- Nuevo prop `loteId` en `PartesEditor`, se muestra el botón nuevo
  solo si viene definido (en el resto de la app, documentos
  individuales, no hay lote — sigue mostrando solo `ScanBtn` como hoy).
- Nuevo componente `ScanDriveBtn` **en el mismo archivo** (no un
  archivo separado) para poder llamar directo a `escanearDocumento()`,
  que es privada del módulo — evita exportar una función interna solo
  para este caso:
  1. Al tocarlo, `supabase.from("archivos").select("*").eq("lote_id",
     loteId)` y muestra la lista en un menú/modal chico (mismo criterio
     que la sección "Documentación" de T4 — misma fuente de datos).
  2. El escribano elige un archivo.
  3. `descargarArchivoDrive(session, drive_file_id)` → `Blob`.
  4. `escanearDocumento(blob)` — mismo camino que ya usa `ScanBtn`,
     mismo resultado (`onDatos`).
- Si no hay archivos guardados para el lote: mensaje simple ("todavía
  no hay archivos subidos para este lote"), no un error.

### 7. `src/components/modals/ModalPartes.jsx`

Recibe y reenvía `loteId` a `PartesEditor` — cambio mecánico, sin
lógica nueva.

### 8. `src/screens/LoteDocScreen.jsx` → `ModalPartes`

Al abrir `ModalPartes` desde `PanelLote`, pasa `loteId={lote.id}`. El
lote siempre tiene `id` (viene de la fila de Supabase) aunque todavía
no tenga `driveFolderId` — `ScanDriveBtn` simplemente va a listar cero
archivos hasta que se suba el primero (T4).

## Decisiones de diseño

### 1. Pre-creación (UC-1 Parte B) crea las carpetas de una vez, no lazy

A diferencia de UC-1 Parte A (un lote agregado de a uno crea su carpeta
recién cuando sube el primer archivo o genera la primera escritura),
la estructura masiva las crea todas en el momento de confirmar el
modal. Es la razón de ser de la feature: tener la carpeta lista
**antes** de que llegue el primer documento, no en el primer uso.
Costo aceptado: si el escribano declara 40 lotes, son ~40+ llamadas a
la API de Drive de una sola vez (una por lote + las de manzana,
cacheadas por manzana). Se hacen secuenciales, no en paralelo, para no
pegarle a los rate limits de la API de Drive con ráfagas de decenas de
requests simultáneas — más lento, pero no hay apuro real en esta
pantalla (es una acción de configuración inicial, no un flujo repetido
todo el día).

### 2. Parser de rango: `desde-hasta` y lista con comas, nada más sofisticado

Cubre los dos casos reales mencionados (`1-12` y `3,5,7-11`). Si el
escribano escribe algo no parseable, se marca esa fila con error y no
se bloquea el resto — no hace falta un lenguaje de expresiones más
rico que esto; si aparece un caso real que no entra, se agranda el
parser ahí, no de antemano.

### 3. La copia de la escritura en Drive se **reemplaza**, no se duplica

A diferencia de `oo-docs` (que sí genera una key nueva por cada
regeneración, a propósito — ver `plan.md` de la Feature 2), la copia en
Drive representa "la escritura actual de este lote", no un historial de
versiones. Por eso se cachea el `fileId` y se usa
`reemplazarContenidoArchivoDrive` en vez de subir un archivo nuevo cada
vez — si no, cada ajuste menor (una coma, un número) dejaría un archivo
más en la carpeta del lote, y el expediente de Drive (pensado para
"ver todo de un vistazo sin entrar a la app", ver UC-3) se llenaría de
copias viejas sin valor.

### 4. Nada de esto bloquea el flujo si Drive falla

Igual que `ExpedienteDetailScreen` ya asume que puede no haber
`provider_token` (usuario no logueado con Google, o token vencido) y
no rompe el resto de la pantalla por eso, todas las operaciones de
Drive de esta feature (crear carpeta, subir documentación, subir/
reemplazar escritura) son best-effort: si fallan o no hay token, se
avisa (mismo patrón visual que ya existe) pero la generación de la
escritura y la carga de datos del lote —lo crítico— sigue funcionando
igual que hoy.

## Riesgos / edge cases a cubrir en tasks.md

- Bulk-crear una manzana/lote que ya existe como fila (cargado antes a
  mano con "+ Agregar lote") — no debe duplicar; se salta esa
  combinación y se avisa cuántas se saltearon.
- Rango inválido en una fila del modal de estructura (letras, `12-1`
  invertido, vacío) — error inline en esa fila, no aborta las demás.
- `provider_token` vencido a mitad de una pre-creación de 40 lotes —
  cortar ahí, informar cuántos quedaron creados y cuántos faltan (no
  reintentar solo, el escribano puede volver a correr el modal después
  de re-autenticarse — `obtenerCarpetaLoteDrive` ya evita duplicar
  carpetas gracias a `buscarOCrearCarpetaDrive`).
- Carpeta de Drive borrada a mano por el usuario (fuera de la app)
  después de haber cacheado su id — `buscarCarpetaDrive`/`listar` van a
  fallar o devolver vacío; no hay forma de detectarlo de antemano,
  pero no debe romper la pantalla — mismo nivel de tolerancia que ya
  tiene `ExpedienteDetailScreen` hoy ante este mismo caso (no lo
  soluciona, tampoco lo empeora).
- `escanearDocumento` ya maneja errores de `/api/vision` con un
  `alert` genérico — confirmar que el mismo manejo aplica igual cuando
  el `Blob` viene de Drive en vez del disco (no debería requerir
  ningún cambio, pero validarlo en el smoke test).
