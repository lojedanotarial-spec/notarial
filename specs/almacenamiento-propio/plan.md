# Plan: Almacenamiento propio de Notarial (R2)

**Estado:** ✅ aprobado por Lucas el 10/11/26 (fase 2 de 3). Siguiente: [`tasks.md`](tasks.md). NO escribir código hasta que `tasks.md` esté aprobado
**Spec:** [`spec.md`](spec.md) (aprobado 10/11/26, con las respuestas de Lucas: descartar lo de prueba, borrar a los 30 días, "Descargar todo" adentro, todo a producción sin esperar a la parte de privacidad)

## Decisiones que necesitan tu atención

| # | Decisión | Mi elección | Alternativa y por qué no |
|---|---|---|---|
| 1 | Cómo suben los archivos | Directo del navegador a R2 con una **dirección firmada de un solo uso** a una zona temporal; el servidor la valida y la mueve a su lugar definitivo | Pasar por Vercel: tope de 4,5 MB por pedido, no sirve |
| 2 | Cómo se ven y se bajan | **Por el servidor**, como hoy (así queda auditado y con las mismas protecciones) | Dirección firmada de descarga: más simple, pero rompe la auditoría y deja direcciones circulando |
| 3 | Lotes y expedientes | **Una sola tabla de archivos** para ambos (se agrega "lote" como dueño posible). Reutiliza renombrar, borrar, historial, ver y bajar | Dos sistemas separados: el doble de trabajo y de errores |
| 4 | Descargar todo (ZIP) | **Armado en el navegador** con la librería que ya usamos. Funciona bien hasta unos 300 MB por expediente; más allá avisa | Armarlo en el servidor en streaming: sin ese límite pero bastante más código. Lo dejo como mejora si hace falta |
| 5 | Nombre de la función `/api/drive` | **Se mantiene** (solo cambia por dentro). Renombrarla es cosmético y arriesga romper el celular y las pantallas | Renombrar a `/api/archivos` más adelante |
| 6 | Cuándo se corta Drive | **Al final**, cuando lo nuevo esté probado en producción. Mientras tanto conviven | Cortar de una: más rápido, pero sin red de seguridad |

## Arquitectura

**Almacén.** Un bucket nuevo de R2, **privado**, `notarial-archivos`, separado del de backups, con su propio token de acceso limitado a ese bucket. Ningún archivo tiene dirección pública. Las claves no llevan el nombre del archivo:

- Definitivos: `<registro>/<expediente o lote>/<id-del-archivo>` → renombrar es solo un cambio en la base.
- Temporales: `tmp/<id>` → una **regla de ciclo de vida** borra solos los que quedan a medias a las 24 h. No hace falta un proceso de limpieza para los huérfanos.

**Flujo de subida** (mismas acciones y mismo formato de respuesta que hoy, para no tocar casi nada del celular ni de la compu):

1. `iniciar_subida` valida el archivo, autoriza el expediente (o lote) y devuelve una dirección firmada para `tmp/<id>`, válida 15 minutos.
2. El navegador hace un `PUT` directo (igual que hoy; con barra de progreso).
3. `confirmar_subida` consulta el objeto temporal (existencia, tamaño real, tipo), rechaza y borra si pasa de 25 MB, lo **copia** a su clave definitiva, borra el temporal y registra la fila. Es el mismo punto donde hoy se le pregunta a Google.

El navegador nunca escribe en la ubicación definitiva: nadie puede dejar un archivo en un expediente ajeno ni saltarse el límite.

**Ver y bajar.** El servidor pide el objeto a R2 y lo reenvía en streaming con las mismas cabeceras de seguridad que ya tenemos (`nosniff`, `sandbox`, `no-store`).

**Borrar.** La fila queda oculta (`borrado_en`) y el objeto se conserva 30 días. Una **purga** elimina objeto y fila al vencer. Restaurar = limpiar `borrado_en` (acción de administrador).

**Borrar un expediente.** Hoy la base borra las filas de golpe. Un *trigger* previo copia las claves de sus archivos a una tabla chica `archivos_a_purgar` con fecha +30 días, y la purga elimina los objetos. Sin esto quedarían objetos huérfanos para siempre.

**La purga.** Se engancha a lo que ya corre: el Worker horario de Cloudflare (hoy purga capturas del celular) y el backup diario como red de seguridad. No agrega funciones ni cupos de cron en Vercel.

**Lotes y barrios.** Se eliminan las "carpetas" de Drive: pasan a ser una agrupación lógica en la base (barrio → manzana → lote). Los archivos de un lote usan la misma tabla y el mismo componente que los de un expediente. La copia de la escritura generada es un archivo del lote que **se reemplaza** al regenerar (misma clave), como hoy.

**Login con Google.** Se quita el permiso de Drive del botón y se elimina el manejo del `provider_token`. Queda como identificación.

**Lo que se elimina:** el cliente de Google (`_driveGoogle`), el cifrado de tokens, enlaces `/drive/<código>`, la pantalla de conexión, la acción `sincronizar` (no hay nadie que borre por fuera), `driveHelper.js`, `loteDrive.js`, `DriveAdminScreen` y `DriveConectar`.

## Cambios en la base (todos aditivos hasta el final)

| Cambio | Para qué |
|---|---|
| `expediente_archivos`: columna `clave` (clave del objeto), `lote_id` (opcional), `expediente_id` pasa a opcional, y un chequeo de que haya uno u otro. Nuevo valor `almacen = 'propio'` | Una sola tabla para expedientes y lotes |
| Tabla `archivos_a_purgar` (`clave`, `purgar_en`) y trigger en `expedientes` y `lotes` | Que borrar un expediente o lote no deje objetos huérfanos |
| `drive_auditoria`: acciones nuevas `restaurar`, `purgar`; además de `lote_id` | Historial completo |
| Al final: se eliminan `drive_conexiones`, `drive_enlaces`, `archivos` (vacía) y las columnas de Drive | Limpieza |

Cada script SQL trae su reversión, como siempre. **No tengo permiso para aplicar SQL de estructura desde acá**: te lo paso como archivo y lo corrés vos en el SQL Editor (un pegado por script).

## Archivos que cambian

- **Nuevos:** `api/_almacen.js` (cliente de R2 con `aws4fetch`, ya instalado), `api/_almacenPurga.js`, scripts SQL, `scripts/r2_archivos.mjs` (crea bucket, token, CORS, ciclo de vida y carga las variables en Vercel, sin imprimir secretos).
- **Cambian:** `api/drive.js` (se reemplaza todo lo de Google por el almacén; se agrega contenedor "lote"), `api/_drive.js`, `src/utils/driveApi.js`, `src/utils/driveCliente.js` (la subida deja de esperar una respuesta de Google), `ArchivosEscribania.jsx` (sin estados de conexión; se agregan "Descargar todo" y "Restaurar"), `SubirMovil.jsx`, `SubidaCelular.jsx`, `BulkScreen.jsx`, `LoteDocScreen.jsx`, `PartesEditor.jsx` ("Escanear un archivo del lote"), `AuthContext.jsx` (login sin Drive), `App.jsx` (rutas), `workers/purga/index.js`, `api/cron/backup.js`.
- **Se eliminan al final:** `api/_driveGoogle.js`, `driveHelper.js`, `loteDrive.js`, `DriveAdminScreen.jsx`, `DriveConectar.jsx`, la ruta `/api/drive-callback` en `vercel.json`.

La identificación automática, los nombres, el emparejamiento de caras, el QR, la papelera de 30 días y el historial **no cambian**: ya viven en la lógica que se reutiliza.

## Infraestructura (la hago yo, sin pedirte nada)

El token de Cloudflare que ya tengo en `scripts/.env` puede crear buckets y credenciales de R2. Un solo script crea el bucket privado, el token limitado a ese bucket, la regla de CORS (solo `https://notarial.lat` y `localhost` para probar), la regla de ciclo de vida de `tmp/`, y carga las variables nuevas en Vercel (`ARCHIVOS_R2_*`). Todo sin imprimir secretos.

## Riesgos y cómo se cubren

| Riesgo | Cobertura |
|---|---|
| La dirección firmada no deja fijar el tamaño máximo | El servidor mide el objeto temporal antes de aceptarlo y borra lo que pase de 25 MB. **Se verifica con un experimento corto antes de construir todo** |
| CORS de R2 con la cámara del celular (iPhone/Android) | El experimento incluye una subida real desde el navegador y desde un celular |
| Objetos huérfanos | Temporales: regla de ciclo de vida. Borrados: purga. Expedientes y lotes borrados: trigger |
| **No hay segunda copia de los archivos.** R2 es durable pero no protege contra un borrado nuestro por error | El plazo de 30 días cubre errores de usuarios. Un respaldo en otro proveedor queda fuera de alcance y anotado en `BACKLOG.md` |
| Pérdida de todo el contenido de prueba | Aprobado por Lucas |
| `ZIP` en el navegador con expedientes enormes | Avisa y propone bajar de a partes |

## Cómo se prueba

- **Pruebas automáticas** con un almacén falso (igual que hoy con el Google falso): autorización por registro, tamaño, tipos, renombrar, borrar y restaurar, purga, expedientes y lotes, historial.
- **Experimento previo (T0)** contra R2 real: subida firmada desde el navegador, CORS, tamaño, copia y ciclo de vida.
- **Prueba de punta a punta en producción** con tus fotos reales de prueba: subir por la compu y por el QR, identificar, ver, bajar, borrar, restaurar, "Descargar todo", lote nuevo con escritura, y borrar un expediente.
- **Checklist manual** de iPhone y Android reales (queda pendiente tuyo, como el resto).

## Orden de trabajo (fases)

1. **Infraestructura y experimento** (T0): bucket, token, CORS, ciclo de vida, subida firmada real.
2. **Almacén y base**: `_almacen.js`, scripts SQL, trigger, purga.
3. **Servidor de expedientes**: subir, confirmar, ver, bajar, borrar, restaurar, QR del celular.
4. **Pantallas de expedientes**: sin estados de Drive, "Descargar todo", "Restaurar".
5. **Lotes y barrios**: servidor y pantallas, login sin Drive.
6. **Cortar Drive**: desconectar las conexiones, quitar código y pantallas, eliminar tablas (Lucas elimina el cliente en Google Cloud).
7. **Panel de uso por registro** y documentación.

Cada fase se despliega y se verifica antes de pasar a la siguiente. La 6 es la única que no tiene vuelta atrás fácil.

## Resultados del experimento T0 (10/11/26, contra R2 real)

| Prueba | Resultado |
|---|---|
| Subida firmada desde un navegador real parado en `https://notarial.lat` (20 MB) | ✅ 200 en ~2 s, CORS correcto, `ETag` visible |
| CORS: `notarial.lat` y `localhost:5173` permitidos, cualquier otro origen rechazado (403) | ✅ |
| Consultar el objeto (existencia, tamaño real, tipo) | ✅ |
| Copiar `tmp/` → clave definitiva y borrar el temporal | ✅ |
| Leer el objeto completo con firma del servidor (1 MB; 20 MB en streaming ya probado en el spike de Drive) | ✅ |
| Sin firma no se puede leer (400) | ✅ |
| Regla de ciclo de vida de `tmp/` registrada | ✅ |
| **El tamaño NO se puede exigir en la firma**: un `PUT` con cuerpo mayor al declarado fue aceptado | ⚠️ confirma el diseño: `confirmar_subida` mide el objeto temporal y borra lo que pase de 25 MB. Un archivo excedido queda como máximo 24 h en `tmp/` (lo borra la regla) |

Consecuencia: ningún cambio de diseño. La validación de 25 MB es del servidor, antes de mover el archivo a su lugar definitivo.
