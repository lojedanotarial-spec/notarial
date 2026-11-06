# Plan: Captura de documentos desde el celular

**Estado:** ✅ aprobado por Lucas (06/11/26) — en ejecución
**Spec:** [`spec.md`](spec.md) · **Tareas:** [`tasks.md`](tasks.md)

## Resumen de la arquitectura

Una **sesión de captura** (una fila en `capturas`) une tres actores:

```
 Compu (usuario logueado)        Celular (sin login, solo el código)        Servidor
 ───────────────────────         ───────────────────────────────────        ──────────────
 crear sesión ───────────────────────────────────────────────────────────▶  api/captura
 muestra QR  (url /c/<codigo>)
                                  abre /c/<codigo>  ◀── info ───────────────  api/captura
                                  elige/saca fotos ──── subir (1 por vez) ▶  Storage 'capturas'
                                  "Listo" ───────────── leer ─────────────▶  extraerDocumento()
                                  ve lo leído, "Está bien" ─ confirmar ───▶  estado = confirmada
 sondea estado ◀─────────────────────────────────────────────────────────── resultado
 aplica a la parte/vehículo/Scriba
 avisa entregado ────────────────────────────────────────────────────────▶  PURGA fotos + resultado
```

Todo pasa por **una sola función serverless** (`api/captura.js`, con `accion`). La tabla no
tiene políticas RLS: solo se toca con la service key desde el servidor. El celular nunca
habla con Supabase; solo con nuestra API, autorizado por el código.

## Decisiones de diseño (y por qué)

1. **Una función, no varias.** Vercel Hobby permite 12 funciones; hoy hay 7. Con `accion` en
   un solo archivo sumamos 1 (total 8) y dejamos margen.
2. **Sin RLS de usuario sobre `capturas`.** Cero políticas = nadie accede con la anon key.
   La escritorio consulta el estado por la API (con su token de usuario), no directo a la tabla.
   Evita errores de políticas y deja un único lugar donde se decide quién ve qué.
3. **Código del celular = secreto de 32 bytes aleatorios**, en la URL. Se guarda solo su
   hash SHA-256. Permite únicamente: ver la etiqueta, subir/quitar fotos, pedir la lectura y
   confirmar *de esa sesión*. No da sesión de usuario ni acceso a nada más.
4. **Vencimiento por inactividad:** 10 minutos desde la última acción del celular, con tope
   duro de 60 minutos desde la creación. *Interpretación del spec* ("vence a los 10 minutos"):
   un vencimiento fijo cortaría capturas de varios vehículos a mitad. Se avisa en el celular.
5. **Subida de a una foto, en base64 por JSON**, ya reducida en el celular (lado mayor
   2000 px, JPEG 0,85 ≈ 300–600 KB). Evita el límite de 4,5 MB por request de Vercel y
   quita los metadatos (GPS) al pasar por canvas. PDF: hasta 3 MB; si pesa más, se avisa.
6. **Lectura según el modo:**
   - *parte*: todas las fotos en **una** llamada a `extraerDocumento()` (su prompt ya fusiona
     frente/dorso de la misma persona). Si devuelve más de una persona → el celular pregunta
     cuál es la de esta parte; las otras viajan como `sobrantes`.
   - *vehiculos*: una llamada **por foto** y el código fusiona por grupo (el grupo lo arma el
     usuario en el celular). El dorso no trae patente: por eso no se adivina qué foto va con qué auto.
   - *libre*: una llamada por foto (en paralelo, máx. 4) y fusión determinista en código:
     personas por número de documento (o apellido+nombre), vehículos por dominio. Lo que no
     se pueda emparejar queda como entrada aparte y **Scriba pregunta**.
7. **Destrucción.** Al *entregar* (la compu confirma que recibió los datos) se borran las
   fotos del Storage y se vacían `fotos` y `resultado`; la fila queda como constancia
   (quién, cuándo, modo, etiqueta; sin datos personales). *Desvío respecto al spec:* en el
   modo libre se destruye al entregar los datos al panel de Scriba, no recién en "Aplicar
   todo": desde ese momento los datos ya viven en el navegador del usuario, así que es más
   estricto y no se pierde nada. Tope duro: `purgar_en` = creación + 24 h.
8. **Cómo se cumple el tope de 24 h sin cron de Vercel** (los dos cupos de Hobby están
   ocupados: aprendizaje y backup). Tres capas: (a) purga oportunista en cada llamada a la
   API de captura; (b) el cron diario del backup también la dispara; (c) un Worker de
   Cloudflare con cron horario (`workers/purga`) la llama con un token. La (c) es la que
   garantiza el tope; las otras dos son red de seguridad.
9. **Fuera del backup.** `api/cron/backup.js` vuelca *todas* las tablas que ve en PostgREST;
   se agrega una lista de exclusión con `capturas`. El bucket `capturas` ya queda afuera (el
   backup solo espeja `oo-docs` y `documentos`).
10. **Lanzamiento gradual.** El botón nuevo solo se muestra a usuarios admin hasta probar en
    un iPhone y un Android reales (no puedo probar un celular desde acá). Se levanta con un
    cambio de una línea.
11. **Escritorio sondea, no usa Realtime.** Cada 2 s pregunta el estado a la API. Más simple
    y no requiere publicar la tabla ni políticas.
12. **QR con la librería `qrcode`** (genera SVG en el navegador; el código nunca sale a un
    servicio externo).

## Qué se agrega y qué cambia

**Base de datos (`scripts/captura_celular.sql`)**: tabla `capturas` (id, codigo_hash,
usuario_id, registro_numero, modo, etiqueta, esperadas, estado, fotos, resultado, expira_en,
vence_duro, purgar_en, creada, confirmada_en, entregada_en), RLS activada sin políticas,
bucket privado `capturas`.

**Servidor**
- `api/_captura.js` (nuevo): lógica pura y testeable — armar etiqueta, fusionar personas y
  vehículos, decidir estado/vencimiento, elegir qué purgar.
- `api/captura.js` (nuevo): acciones `crear`, `estado`, `entregar`, `cancelar` (usuario
  logueado) e `info`, `subir`, `quitar`, `leer`, `confirmar` (código) y `purgar` (token).
- `api/_auth.js`: función para obtener el usuario (no solo validar el token).
- `api/cron/backup.js`: exclusión de `capturas` + purga oportunista.
- `api/_scribaTools.js` / `api/scriba.js`: herramientas `pedir_captura_celular` y
  `distribuir_captura`; instrucciones en el prompt de sistema.
- `vercel.json`: `maxDuration` de la función nueva (lectura de varias fotos, 60 s).

**Cliente**
- `src/screens/CapturaMovil.jsx` (nuevo): la página del celular. `src/utils/capturaImagen.js`:
  reducir/convertir fotos (incluye HEIC de iPhone, que Safari decodifica).
- `src/App.jsx`: si la URL es `/c/<codigo>`, muestra la página del celular *antes* del login.
- `src/components/CapturaCelular.jsx` (nuevo): ventana con el QR y el sondeo; la usan los dos modales y Scriba.
- `src/components/ui/PartesEditor.jsx`: botón "Desde el celular" junto a "Escanear documento"; reutiliza
  `aplicarEscaneo`/`tieneDatosPropios` (ya piden confirmación antes de pisar datos).
- `src/components/modals/ModalVehiculos.jsx`: ídem, con varios vehículos.
- `src/components/ScribaPanel.jsx` + `src/hooks/useScribaSesion.js`: tarjeta con el QR, reenvío del
  resultado a la conversación y tarjeta "Aplicar todo" (dispara los eventos que ya existen,
  `scriba:completar_parte` y `scriba:completar_vehiculo`, uno tras otro).

**Infra:** `workers/purga/index.js` y `scripts/deploy_purga.mjs` (mismo patrón que el monitor).

## Pendiente a propósito (no entra en esta entrega)

- **Contraste con la MRZ del DNI** (criterio del spec): requiere que la lectura devuelva el
  texto de la MRZ. Toca el prompt que hoy usa el escaneo en producción; se hace aparte, con
  fotos reales para medir. Hasta entonces, la verificación es la confirmación humana en el celular.
- **Avisar qué foto repetir** (UC-4) con precisión: en esta entrega se muestran las notas de
  la lectura y los campos que no se pudieron leer; no se señala una foto individual.
- **PDF de más de 3 MB**, **modo "documento de varias páginas"** y **el ícono propio en el celular**.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| No puedo probar en un celular real desde acá | Lanzamiento solo admin; pruebas del servidor con curl; checklist manual en `tasks.md` |
| La lectura con Opus 5.5 tarda más con varias fotos | `maxDuration` 60 s; paralelismo; el celular muestra "Leyendo…" |
| Quedan fotos si falla la purga | Tres capas de purga + la fila nunca guarda datos tras entregar |
| Alguien adivina un código | 32 bytes aleatorios, 10 min de vida, solo permite subir fotos a esa sesión |
| Foto HEIC en iPhone | Se decodifica en el navegador (canvas) y se sube como JPEG; se prueba en iPhone real |
