# Plan técnico: Subir documentación al expediente desde el celular

**Estado:** 📝 borrador (fase 2 de 3) — pendiente de aprobación de Lucas. NO escribir código hasta que `tasks.md` esté aprobado
**Spec:** [`spec.md`](spec.md) (aprobado 09/11/26)
**Fecha:** 09/11/26

## 1. Resumen de la solución

Tres piezas nuevas, apoyadas en lo que ya funciona:

1. **Sesión de subida por QR** (nueva tabla y acciones en `api/drive.js`). Una sesión liga un código al
   expediente y al usuario que la abrió; vale 30 minutos. El celular, sin login, solo puede **agregar**
   archivos a ese expediente, **quitar los que subió en esa sesión** e **identificar** los suyos.
2. **Página del celular** (`/s/<codigo>`, pantalla nueva) con tres formas de cargar: cámara en la página,
   cámara del teléfono y galería/archivos. Sube de a uno, **directo del teléfono a Google** (la misma
   subida directa que ya probamos con 20 MB), y después confirma al servidor.
3. **Identificación y nombre automáticos** (módulo nuevo, mismo flujo para el celular y la compu): una
   **miniatura reducida** de la foto, que genera el propio teléfono o navegador, se manda a un modelo
   liviano, que devuelve un JSON mínimo; con eso el servidor arma el nombre y renombra el archivo en
   Drive y en la base. El archivo original no se toca ni se vuelve a subir.

```
Celular (código del QR)                 Notarial (api/drive.js)                  Google / IA
 ─────────────────────  ── iniciar ──►  valida sesión (30 min, expediente)  ──►  sesión de subida
  PUT directo a Google  ◄─────────────────────────────────────────────────────  (sin pasar por Vercel)
  ── confirmar ───────►  registra el archivo ("Identificando…")
  ── miniatura ───────►  modelo liviano ► JSON ► nombre ► renombra en Drive y base
Compu (usuario)  ◄──── lista que se refresca sola (consulta cada 3 s mientras el QR está abierto)
```

## 2. Qué se reutiliza (ya existe y está probado)

| Pieza | De dónde | Para qué |
|---|---|---|
| Subida directa a Google, carpeta del expediente, validación de 25 MB y de nombre | `api/drive.js` (`iniciarSubida`, `confirmarSubida`) | Mismo núcleo; se separa en funciones que pueden llamar la compu **y** el celular |
| Conexión del Drive, token cifrado, errores traducidos a mensajes claros | `api/_drive.js`, `_driveGoogle.js` | Idéntico: un Drive caído se ve igual en el celular |
| Auditoría | `drive_auditoria` | Se suman acciones nuevas |
| Código de 256 bits, solo el hash en la base | `generarCodigo`, `hashCodigo` | Igual que el enlace de conexión |
| Generar el QR en el navegador | `generarSvgQR` (`src/hooks/useSesionCaptura.js`) | Mismo QR |
| Cámara en la página, sin flash, ráfaga | `src/components/CamaraCaptura.jsx` | Se le agrega un modo de **máxima resolución** |
| Cálculo de escala y de miniaturas | `src/utils/capturaImagen.js` | La miniatura de identificación |
| Cliente de Anthropic y modelos | `api/vision.js`, `api/_modelos.js` | Se agrega un modelo para identificar |

## 3. Decisiones de diseño y por qué

| # | Decisión | Por qué / alternativa descartada |
|---|---|---|
| D1 | Sin función serverless nueva: las acciones nuevas van en `api/drive.js`, con la lógica en módulos `api/_driveCelular.js` y `api/_driveIdentificar.js`. Siguen siendo **9 de 12** funciones | Hobby limita a 12 |
| D2 | **Tabla propia** `drive_sesiones_celular`, no se reusa `capturas` | `capturas` está hecha para destruir fotos y leer datos (modos, resultados, purga de 24 h). Mezclar los dos usos complica ambos |
| D3 | La sesión vale **30 minutos fijos** desde que se genera; una subida ya empezada puede **confirmarse hasta 5 minutos después** de vencida | Respuesta de Lucas. La gracia evita perder un archivo grande que terminó justo al vencer |
| D4 | El celular **nunca lee ni lista** el expediente ni el Drive. Solo ve el nombre del expediente y los archivos de **su** sesión | Un QR en manos ajenas solo puede agregar basura recuperable (papelera), nunca ver documentación |
| D5 | **La miniatura la genera el teléfono / el navegador** (≤ 1000 px, JPEG ≈ 100 KB) y se manda al servidor con la llamada de identificar | Evita que el servidor baje 25 MB desde Drive para cada foto; funciona aunque el original sea HEIC (si el navegador lo puede abrir); es más barato y rápido |
| D6 | **Modelo: Haiku 5.5** (`claude-haiku-5-5`), salida JSON mínima, sin razonamiento extendido, `max_tokens` bajo. Sube a Sonnet 5.5 solo si la prueba con fotos reales (S2) no alcanza | Cumple el piso de la generación 5.5 y es la tarea más simple de la plataforma: reconocer el tipo de documento y leer un nombre. Lucas pidió que sea barato en tokens |
| D7 | **Solo imágenes se identifican en esta versión.** Un PDF se guarda y queda "Sin identificar" (se renombra a mano) | Un PDF cuesta varias veces más tokens por página y exige bajar el archivo de Drive; no entra en "barato". Se revisa cuando haya uso real |
| D8 | Una identificación por archivo, con **bloqueo atómico** (`pendiente` → `procesando`) | Evita pagar dos veces si llegan dos llamadas |
| D9 | De la respuesta del modelo **solo se usa un conjunto cerrado de campos** (tipo, descripción corta, nombre, apellido, lado, página, legible, confianza), saneados; **nada más se guarda**. El nombre y apellido viven solo dentro del nombre del archivo | Requisito de privacidad del spec: ningún número, domicilio ni fecha se guarda |
| D10 | Ante cualquier duda (`legible: false`, confianza baja, JSON roto, error de la IA) el archivo queda **"Sin identificar"** con su nombre original. Nunca se inventa un nombre | Requisito del spec |
| D11 | La lista de la compu se **consulta cada 3 s** mientras el QR está abierto, no se usa Realtime de Supabase | Mucho más simple y suficiente; el costo es una consulta chica solo mientras hay una sesión abierta |
| D12 | Identificar lo que se sube **desde la compu** queda detrás de una variable (`DRIVE_IDENTIFICAR_COMPU`), apagada hasta medir el costo real | Condición de Lucas: "solo si es barato". Hay que verlo con números antes de prenderlo |
| D13 | Interruptor general `DRIVE_IDENTIFICAR` (`0` apaga toda la identificación sin deploy de código) | Si algo se dispara en costo o calidad, se corta en un minuto |
| D14 | Cada identificación guarda en la auditoría los **tokens usados** (entrada y salida) y el modelo | Medir el costo real sin adivinar; se resume después en un número por mes |

## 4. Datos (migración `scripts/drive_celular.sql`, aditiva)

```sql
create table drive_sesiones_celular (
  id              uuid primary key default gen_random_uuid(),
  codigo_hash     text unique not null,
  expediente_id   uuid not null references expedientes(id) on delete cascade,
  registro_numero text not null,
  usuario_id      uuid not null,          -- quien generó el QR: es quien figura como "subió"
  usuario_nombre  text,
  creada_en       timestamptz not null default now(),
  expira_en       timestamptz not null,   -- creada_en + 30 min
  cerrada_en      timestamptz
);
-- RLS activado SIN políticas (solo el servidor), como el resto de las tablas de Drive.

alter table expediente_archivos
  add column origen          text not null default 'compu' check (origen in ('compu','celular')),
  add column sesion_id       uuid references drive_sesiones_celular(id) on delete set null,
  add column nombre_original text,
  add column identificacion  text check (identificacion in ('pendiente','procesando','ok','sin_identificar','manual'));
-- identificacion = null en todo lo anterior (no se identifica retroactivamente)
```

- **Auditoría:** acciones nuevas `celular_abrir`, `celular_cerrar`, `identificar`, `renombrar` (más `subir` y `borrar`, ya existentes, con `detalle.via = "celular"`).
- **Backup:** `drive_sesiones_celular` se respalda (solo guarda un hash, no hay nada sensible).
- **Limpieza:** al crear una sesión se borran las de más de 7 días (oportunista, sin cron: los dos cupos están usados).

## 5. API (se suma a `api/drive.js`)

**Desde la compu** (`Authorization: Bearer`, el registro se deduce en el servidor como siempre):

| Acción | Qué hace |
|---|---|
| `celular_crear` `{expediente_id}` | Exige expediente del usuario y Drive conectado y operativo. Crea la sesión. Devuelve `{ url: https://notarial.lat/s/<código>, expira_en }` |
| `celular_cerrar` `{sesion_id}` | Marca `cerrada_en`; el celular deja de poder subir al instante |
| `renombrar` `{archivo_id, nombre, tipo}` | Valida nombre y tipo, renombra en Drive y en la base, `identificacion = 'manual'`, audita |
| `identificar` `{archivo_id, miniatura}` | Identificación de un archivo subido desde la compu (con el selector en "Automático"); respeta `DRIVE_IDENTIFICAR_COMPU` |

**Desde el celular** (solo el código de la sesión; todas validan vigencia y que no esté cerrada):

| Acción | Qué hace |
|---|---|
| `celular_info` `{codigo}` | `{ vigente, motivo, expediente_nombre, expira_en, archivos }` con **solo los de esta sesión** |
| `celular_iniciar_subida` `{codigo, nombre, mime, tamano}` | Igual que `iniciar_subida`, pero el registro y el expediente salen de la sesión |
| `celular_confirmar` `{codigo, drive_file_id}` | Igual que `confirmar_subida`; fija `origen='celular'`, `sesion_id`, quién subió = el dueño del QR, `identificacion='pendiente'` si corresponde. Admite hasta 5 min de gracia tras vencer |
| `celular_quitar` `{codigo, archivo_id}` | Solo si el archivo es de esta sesión: papelera de Drive + marca de borrado + auditoría |
| `celular_identificar` `{codigo, archivo_id, miniatura}` | Identificación de un archivo de esta sesión |

**Refactor previo** (sin cambio de comportamiento, con los tests de hoy como red): `iniciarSubida` y `confirmarSubida` se parten en funciones de núcleo que reciben `{ expediente, registro, quién }`, para que las llamen la compu y el celular sin duplicar lógica.

## 6. Identificación y nombre (`api/_driveIdentificar.js`, lógica pura + una llamada a la IA)

**Entrada al modelo:** la miniatura (≤ 1000 px) y un prompt corto. **Salida pedida (JSON):**

```json
{ "tipo": "dni|tarjeta_verde|poder|formulario|otro", "descripcion": "solo si es 'otro'",
  "nombre": "", "apellido": "", "lado": "anverso|reverso|null", "pagina": 2, "paginas_total": 3,
  "legible": true, "confianza": "alta|media|baja" }
```

- `nombre` y `apellido` solo para documentos de una persona (DNI y similares), nunca para poderes ni formularios.
- Anverso = el lado con la foto y el nombre; reverso = el otro (en la tarjeta verde, el frente con dominio y chasis es el anverso).
- **Armado del nombre** (función pura, probada aparte): `{Tipo}[ {Apellido} {Nombre}][ - anverso|reverso | - pág N[ de M]].{extensión}`.
  Ejemplos: `DNI García Juan - anverso.jpg`, `Poder - pág 2 de 3.jpg`, `Partida de nacimiento - anverso.jpg`.
- **Saneado:** solo letras, espacios, guiones y apóstrofes en nombres; largo acotado; sin barras ni caracteres de control; si el nombre ya existe en el expediente, se agrega ` (2)`.
- **Costo estimado (a confirmar en S2):** una imagen de 1000 × 750 px son unos **1.000 tokens**; con el prompt, **alrededor de 1.400 tokens de entrada y menos de 100 de salida por foto**. Diez fotos son del orden de 14 mil tokens de entrada. El costo real se mide con los tokens que devuelve la API (D14) antes de prender nada para la compu.
- **Fallas:** timeout de 25 s, y cualquier error ⇒ "Sin identificar"; la subida ya estaba guardada.

## 7. Pantallas (`src/`)

| Pieza | Cambio |
|---|---|
| `src/screens/SubirMovil.jsx` (nueva, ruta pública `/s/<código>` antes del login, como `/c/<código>`) | Muestra el expediente; tres botones (cámara en la página, cámara del teléfono, galería/archivos); cola que sube **de a uno**; lista de lo subido con miniaturas locales, contador y **Quitar** con confirmación; "Listo"; estados de sesión vencida, sin conexión y Drive caído, con reintento |
| `CamaraCaptura.jsx` | Modo de **máxima resolución**: pide la mayor resolución disponible, exporta JPEG de calidad alta sin reducir y libera memoria entre fotos |
| `src/utils/driveCliente.js` | Generación de la miniatura de identificación; cola con reintento |
| `ArchivosEscribania.jsx` | Botón **Subir desde el celular** + panel del QR con cuenta regresiva de 30 min, consulta cada 3 s y **Cerrar sesión**; marca "Identificando…", "Sin identificar" y "desde el celular"; botón **Editar** (nombre y tipo); el selector "Tipo" suma **"Automático"** (por defecto) |

## 8. Seguridad

- El código es de 256 bits y solo se guarda su hash. Vale para **un** expediente y 30 minutos. Cerrarlo desde la compu lo mata al instante.
- Con el código solo se puede: ver el nombre del expediente, **agregar** archivos, **quitar los de la sesión** e identificarlos. No se puede listar, ver ni bajar nada más. Lo peor que puede hacer quien tenga un QR ajeno es subir archivos, que se pueden mandar a la papelera.
- Un archivo siempre se resuelve por su fila y su sesión, nunca por un id que mande el celular.
- La clave de Anthropic vive solo en el servidor. La miniatura tiene tope de tamaño y se verifica que sea realmente un JPEG.
- Lo que el modelo lee **no se guarda**: de la respuesta solo se conserva el nombre armado y el tipo; en la auditoría quedan el tipo, el modelo y la cantidad de tokens.
- Residual aceptado: el nombre del expediente se ve en el celular de quien escanee el QR. El QR se muestra en el mostrador, en persona.

## 9. Pruebas y pruebas previas

- **Unitarias** (módulo puro): armado del nombre (todos los casos de la tabla del spec), saneado, duplicados, normalización de la respuesta del modelo (JSON roto, campos de más, valores fuera de lista, `legible: false`), vigencia y gracia de la sesión, tope y formato de la miniatura.
- **De la API con Google y la IA simulados** (mismo esquema de `driveApi.test.js`): sesión vencida, cerrada, de otro expediente; el celular no puede quitar un archivo ajeno ni de otra sesión; confirmación idempotente; identificación una sola vez; error de la IA ⇒ "Sin identificar"; el nombre se aplica en Drive y en la base; el token de Google no aparece en ninguna respuesta.
- **Pruebas previas** (antes de construir encima):

| # | Pregunta | Si sale mal |
|---|---|---|
| S1 | ¿Se puede renombrar en Drive un archivo creado por la app con el permiso `drive.file`? (la prueba es chica y la hago yo) | Se guarda el nombre solo en la base y se muestra ese; el archivo en Drive queda con el original |
| S2 | ¿Haiku 5.5 reconoce y nombra bien DNI, tarjeta verde, poder y formulario 08, y cuánto cuesta por foto? **Necesito 8 a 10 fotos reales de Lucas** (DNI frente y dorso, tarjeta verde, un poder, un formulario) | Probar Sonnet 5.5; si tampoco alcanza, sin identificación y nombre a mano |
| S3 | ¿Qué resolución entrega de verdad la cámara dentro de la página en un iPhone y en un Android? | Se ofrece como camino principal la cámara del teléfono, que da la foto completa |
| S4 | ¿Qué devuelve el selector de archivos de un iPhone con fotos HEIC (original o JPEG)? ¿Se puede armar la miniatura? | La foto igual se guarda; solo queda "Sin identificar" |

S3 y S4 requieren teléfonos reales: se hacen en la prueba manual, con Lucas.

## 10. Despliegue y reversibilidad

- Migración aditiva (`scripts/drive_celular.sql`); si el sistema de permisos la rechaza al aplicarla, la corre Lucas a mano como la del Drive.
- Variables nuevas en Vercel (con `scripts/vercel_env.mjs`): `DRIVE_IDENTIFICAR=1` (se prende solo después de S2) y `DRIVE_IDENTIFICAR_COMPU=0`. `ANTHROPIC_API_KEY` ya existe.
- Sin sesiones creadas la feature no cambia nada para nadie: el QR solo aparece en un botón nuevo. **No se restringe por usuario**: lo gradual lo da que primero se prueba en el 9876.
- Reversible: apagar `DRIVE_IDENTIFICAR`, esconder el botón o revertir el commit; lo ya subido queda en el Drive de la escribanía.

## 11. Fuera de este plan

Identificar PDFs (D7), identificar retroactivamente lo ya subido, unir fotos en un PDF, leer datos para completar partes (eso es la captura de datos), WhatsApp u otros canales.
