# Plan técnico: Drive de la escribanía

**Estado:** ✅ aprobado por Lucas el 06/11/26 (enlace de 24 h; solo el administrador conecta). Siguiente: [`tasks.md`](tasks.md). NO escribir código hasta que `tasks.md` esté aprobado
**Spec:** [`spec.md`](spec.md) (aprobado 06/11/26)
**Fecha:** 06/11/26

## 1. Resumen de la solución

Cada registro (identificado por `usuarios.registro_numero`) tiene **una conexión** a una cuenta de Google. Notarial guarda en el servidor el *refresh token* de esa cuenta, cifrado. Los navegadores de los usuarios **nunca ven ni tocan ese token**: piden al servidor subir, ver o borrar, y el servidor, después de comprobar que el usuario pertenece al registro, habla con Google en su nombre.

```
Usuario (email o Google)         Notarial (api/drive.js)              Google Drive de la escribanía
 ───────────────────────  ───►  verifica sesión Supabase     ───►   token de acceso (se renueva
  sube / ve / borra             deduce registro del usuario          con el refresh token cifrado)
                                valida expediente ∈ registro
                                registra en auditoría
```

## 2. Lo que ya está hecho (06/11/26)

- Proyecto de Google Cloud: `lojeda-notarial-credentials`. Pantalla de consentimiento **en producción, externa**, `drive.file` declarado como **no sensible** (no requiere verificación de Google).
- Cliente OAuth nuevo `Notarial Drive escribanias` (separado del del login). Redirect URI registrada: `https://notarial.lat/api/drive-callback`. ID y secreto en `scripts/.env` (`GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`).
- Pendiente de Lucas, no bloquea: rotar el secreto (se pegó en el chat el 06/11). Hacerlo **antes de conectar a Fátima**.

## 3. Decisiones de diseño y por qué

| # | Decisión | Por qué / alternativa descartada |
|---|---|---|
| D1 | Una sola función serverless nueva, `api/drive.js`, con `accion` en el body (mismo patrón que `captura.js`). Pasa de 8 a **9 de 12** funciones | Hobby limita a 12. Una por acción las gastaría |
| D2 | El callback de Google entra por `/api/drive-callback`, resuelto con una **ruta de `vercel.json`** hacia `/api/drive?accion=callback`, no con un archivo aparte | No gasta otra función |
| D3 | Permisos pedidos a Google: `drive.file` + `openid email` | `drive.file` = solo archivos que Notarial crea (mínimo). `email` para mostrar al administrador qué cuenta quedó conectada |
| D4 | Refresh token cifrado con AES-256-GCM en la columna, clave en la variable `DRIVE_CIFRADO_CLAVE` (32 bytes, base64), con prefijo de versión (`v1.`) para poder rotarla | La base y la clave viven en lugares distintos: filtrar la base sola no alcanza |
| D5 | Las tablas nuevas tienen RLS activado **sin políticas**: solo el servidor (service key) las toca | Mismo criterio que `capturas`. Ningún cliente puede leer el token ni los enlaces |
| D6 | **Subida directa del navegador a Google** con una *sesión de subida reanudable* que crea el servidor | Vercel limita cuerpos de request a 4,5 MB; con 25 MB por archivo no se puede pasar el archivo por la función. Ver spike S1 |
| D7 | **Ver y descargar pasan por el servidor** en streaming (el servidor lee de Google y reenvía) | No se puede dar al navegador un enlace de Google sin exponer acceso. Ver spike S2 por el límite de 4,5 MB en respuestas |
| D8 | `expediente_archivos` deja de poder escribirse desde el navegador (RLS solo `SELECT` para el registro). Altas y bajas las hace el servidor | Hoy la política es `ALL`: un usuario podría insertar una fila apuntando al `drive_file_id` de otro registro. El servidor además comprueba que el archivo esté en la carpeta del expediente |
| D9 | Borrar = mover a la **papelera de Drive** (`trashed: true`) y marcar la fila (`borrado_en`, `borrado_por`). No se borra de verdad | Pedido del spec: recuperable |
| D10 | Los 4 archivos de prueba viejos se **ocultan**: columna `almacen` (`personal` por defecto para lo existente, `escribania` para lo nuevo); la lista solo muestra `escribania` | Pedido de Lucas: ignorarlos. No se borra nada |
| D11 | El enlace de conexión es de **un solo uso** y vence a las **24 h**; se guarda solo su hash SHA-256 | Fátima puede abrirlo horas después de recibirlo por WhatsApp. Se "gasta" recién cuando Google devuelve la autorización, no al abrir la página, así que puede reintentar si cancela |
| D12 | La conexión rota no se detecta con un cron (los dos cupos están usados): se detecta **al usarla** (`invalid_grant` ⇒ `rota`) y cuando el administrador abre su panel | Hobby: 2 crons, ya ocupados |
| D13 | Carga Masiva (barrios y lotes) **no se toca**: sigue con el mecanismo personal | Fuera de alcance del spec |
| D14 | La conexión del registro es el interruptor de la feature: un registro sin conexión no ve cambios salvo el aviso en la pestaña. **No hay restricción de usuarios** (no se limita a admin) | Lección del 06/11: no restringir en producción sin preguntar. Lo gradual lo da conectar el 9876 primero y el 853 después |

## 4. Datos (migración `scripts/drive_escribania.sql`)

```sql
-- Una conexión por registro
drive_conexiones (
  registro_numero      text PRIMARY KEY,
  google_email         text NOT NULL,
  refresh_token_cifrado text NOT NULL,          -- "v1.<iv>.<tag>.<cifrado>"
  estado               text NOT NULL DEFAULT 'activa',  -- activa | rota
  motivo               text,                    -- revocada | otro
  sin_espacio          boolean NOT NULL DEFAULT false,
  carpeta_raiz_id      text,                    -- carpeta "Notarial" en ese Drive
  cuota_usada          bigint, cuota_total bigint, cuota_leida_en timestamptz,
  conectada_en         timestamptz NOT NULL DEFAULT now(),
  conectada_por        uuid,                    -- admin que generó el enlace
  actualizada_en       timestamptz NOT NULL DEFAULT now()
);

-- Enlaces de un solo uso
drive_enlaces (
  id uuid PK, codigo_hash text UNIQUE NOT NULL, registro_numero text NOT NULL,
  creado_por uuid NOT NULL, creado_en timestamptz DEFAULT now(),
  expira_en timestamptz NOT NULL, usado_en timestamptz
);

-- Quién hizo qué
drive_auditoria (
  id bigint identity PK, registro_numero text NOT NULL, usuario_id uuid,
  accion text NOT NULL,   -- conectar | desconectar | subir | ver | descargar | borrar | conexion_rota
  expediente_id uuid, archivo_id uuid, detalle jsonb, creada_en timestamptz DEFAULT now()
);

-- expediente_archivos: columnas nuevas
  almacen text NOT NULL DEFAULT 'personal'   -- personal (viejo, oculto) | escribania
  tamano bigint, subido_por uuid, subido_por_nombre text,
  borrado_en timestamptz, borrado_por uuid
-- expedientes: columna nueva
  drive_carpeta_escribania_id text            -- no reusa drive_folder_id (apunta a Drive personal)
```

- **RLS:** `drive_*` activado sin políticas. `expediente_archivos`: se reemplaza la política `expediente_arch_acceso` (ALL) por una de solo `SELECT` con la misma condición, filtrando además `almacen = 'escribania'` y `borrado_en IS NULL`.
- **Cascada:** borrar un expediente ya borra sus filas de `expediente_archivos` (FK `ON DELETE CASCADE`); los dos `delete` explícitos de la UI se sacan. Sus archivos **quedan en el Drive** de la escribanía (recuperables), y se documenta.
- **Backup:** `drive_conexiones` y `drive_enlaces` se agregan a `TABLAS_EXCLUIDAS` de `api/cron/backup.js` (el token cifrado no viaja a R2; si hace falta restaurar, se reconecta). `drive_auditoria` sí se respalda.

## 5. API (`api/drive.js`)

Todas las acciones de usuario exigen `Authorization: Bearer`. **El registro se deduce siempre en el servidor** (`usuarios.registro_numero` del usuario del token); el cliente nunca lo manda salvo el administrador en las acciones `admin_*`.

| Acción | Quién | Qué hace |
|---|---|---|
| `estado` | usuario | `{ conectado, estado, sin_espacio }` de su registro (sin mostrar la cuenta de Google) |
| `iniciar_subida` | usuario | Valida: expediente ∈ registro, tamaño ≤ 25 MB, tipo permitido. Crea (si falta) la carpeta "Notarial" y la del expediente. Abre la sesión reanudable con `Origin: https://notarial.lat`. Devuelve `{ sesion_url, pendiente }` |
| `confirmar_subida` | usuario | Con `drive_file_id`: pide metadatos a Google, comprueba que el padre sea la carpeta del expediente y que el tamaño coincida, inserta la fila, audita `subir` |
| `ver` / `descargar` | usuario | Comprueba fila ∈ registro y no borrada. Streaming desde Google. Audita |
| `borrar` | usuario | Papelera de Drive + marca la fila + audita |
| `admin_estado` | admin | Por cada registro con usuarios: estado, cuenta, desde cuándo, quién conectó, cuota (se lee de Google en el momento; marca advertencia ≥ 80 %) |
| `admin_enlace` | admin | Crea enlace de un solo uso, devuelve `https://notarial.lat/drive/<codigo>` |
| `admin_desconectar` | admin | Revoca el token en Google, borra la fila de conexión, audita |
| `enlace_info` | pública (por código) | Valida el enlace sin consumirlo; devuelve registro y estado para la página |
| `enlace_iniciar` | pública (por código) | Devuelve la URL de Google (`access_type=offline`, `prompt=consent`, `state` firmado atado al enlace) |
| `callback` | Google (por ruta D2) | Valida `state` y enlace vigente, canjea el `code`, guarda el token cifrado, **consume** el enlace, audita `conectar`, redirige a `/drive/listo` o `/drive/<codigo>?error=...` |

**Errores de Google → estado:** `invalid_grant` ⇒ conexión `rota` (motivo `revocada`), el usuario ve "El Drive de la escribanía no está disponible, avisale a quien administra Notarial". `storageQuotaExceeded` ⇒ `sin_espacio = true`, se informa qué quedó sin guardar. Nunca se muestra el error técnico al usuario.

**Un administrador** es quien tiene `usuarios.is_admin = true`, verificado en el servidor con service key (no se confía en el cliente).

## 6. Pantallas (`src/`)

| Pieza | Cambio |
|---|---|
| `src/utils/driveApi.js` (nuevo) | Cliente del endpoint: subir con progreso, ver, descargar, borrar, estado |
| `ExpedienteDetailScreen.jsx` | La pestaña de archivos deja de pedir login con Google. Subida de varios archivos con resultado individual; aviso fijo "Máximo 25 MB por archivo"; muestra quién subió y cuándo; ver (vista previa en el modal), descargar, borrar con confirmación. Si el registro no tiene Drive, aviso "la escribanía todavía no conectó su Drive" |
| `AdminScreen.jsx` | Sección "Drive de las escribanías": por registro, estado/cuenta/espacio, botones **Conectar** (genera y copia el enlace), **Desconectar** y advertencia al 80 % |
| `src/screens/DriveConectar.jsx` (nuevo) | Página pública `/drive/<codigo>` y `/drive/listo`: explica qué se autoriza, botón "Autorizar con Google", mensajes de vencido / ya usado / rechazado. Se resuelve en `App.jsx` antes del login, igual que `/c/<codigo>` |
| `vercel.json` | Función `api/drive.js` (`maxDuration` 60) y la ruta de D2 |

## 7. Seguridad

- El token de Google no sale nunca del servidor ni de la base sin cifrar. No se escribe en logs.
- Un usuario no puede tocar archivos de otro registro: el registro se deduce en el servidor y el archivo se resuelve **por fila**, nunca por un id que mande el cliente.
- El enlace: 256 bits aleatorios, se guarda solo el hash, un solo uso, vence a las 24 h, `state` atado al enlace contra CSRF.
- La URL de sesión de subida es de un solo archivo y solo vive en el navegador que la pidió.
- Auditoría de subir/ver/descargar/borrar/conectar/desconectar; solo la lee el administrador.
- **Residual aceptado:** quien tenga el enlace antes de que se use puede conectar *su* cuenta de Google a ese registro. Mitigación: se muestra al administrador la cuenta conectada; si no es la esperada, desconecta y genera otro enlace.
- Los tokens de actualización de Google caducan tras **6 meses sin usarse**. Un registro que no suba ni vea archivos en ese lapso aparecerá como "rota" y se reconecta con un enlace nuevo.

## 8. Spikes (se hacen primero, antes de construir encima)

| # | Pregunta | Si sale mal |
|---|---|---|
| S1 | ¿Puede el navegador hacer `PUT` directo a la sesión reanudable de Google (CORS con `Origin`) para un archivo de ~20 MB? | Plan B: el navegador manda tramos de ≤ 3,5 MB al servidor y el servidor los reenvía a Google (cada tramo en múltiplo de 256 KB) |
| S2 | ¿Una función de Vercel puede responder en streaming un archivo > 4,5 MB? | Plan B: dar vista previa solo hasta cierto tamaño y para el resto, descarga por tramos |
| S3 | ¿`drive.file` + `openid email` devuelven el email de la cuenta sin pedir permisos extra? | Pedir solo `email` además, que es básico y no sensible |

Cada spike se prueba contra el Drive real de `lojeda.notarial@gmail.com`.

### Resultados (06/11/26) — los tres pasaron, el diseño no cambia

| # | Resultado |
|---|---|
| S1 | ✅ Sesión reanudable abierta con `Origin: https://notarial.lat`: el preflight y el `PUT` responden `Access-Control-Allow-Origin: https://notarial.lat` (método `PUT`, cabecera `content-type`). Subida de 20 MB en 2,9 s, tamaño en Drive exacto (20971520). **Pendiente de confirmar en un navegador real en T6.3**: esta prueba fue con cabeceras desde Node, no desde un navegador |
| S2 | ✅ Una función de Vercel entregó 20 MB en streaming a través de `notarial.lat` (20971520 bytes, 2,9 s). El límite de 4,5 MB no aplica a respuestas en streaming |
| S3 | ✅ Con `drive.file openid email` Google devuelve el email (en el `id_token` y en `about.get`) y la cuota (`storageQuota`: usado y límite de 15 GB). Los permisos concedidos fueron solo esos |

## 9. Pruebas

- **Unitarias** (`src/__tests__/drive.test.js` y `driveApi.test.js`, módulo puro `api/_drive.js`): cifrado ida y vuelta y rechazo de datos alterados, vigencia/consumo de enlaces, validación de tamaño y nombre, armado de nombres de carpeta, mapeo de errores de Google a estados, regla de 80 %, no mostrar errores técnicos.
- **De integración con Google simulado:** `fetch` mockeado para `invalid_grant`, cuota llena, rechazo en el callback, enlace vencido o ya usado.
- **Manual con Google real** (checklist en `tasks.md`): conectar el 9876, subir varios archivos incluyendo uno de ~20 MB, ver, descargar, borrar y recuperar de la papelera, desconectar y verificar la revocación; desde un usuario por email y desde otro registro (debe fallar).

## 10. Despliegue y reversibilidad

- Migración SQL aditiva (las columnas nuevas tienen valores por defecto), salvo el reemplazo de la política de `expediente_archivos`; guardar su definición actual antes para poder revertirla.
- Variables nuevas en Vercel: `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `DRIVE_CIFRADO_CLAVE`.
- Deploy directo a producción (criterio del proyecto); sin conexiones creadas la feature no cambia nada para nadie. Orden: 9876 (prueba) → 853 (Fátima) **solo después de rotar el secreto**.
- Reversible: desconectar el registro y revertir el commit; los archivos quedan en el Drive de la escribanía.

## 11. Fuera de este plan

Subir desde el celular (siguiente feature del epic), lectura automática de las fotos, Carga Masiva sobre este Drive, copias de seguridad del contenido de Drive.
