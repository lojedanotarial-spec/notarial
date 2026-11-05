# Backlog — Notarial

Backlog único y priorizado. Reemplaza a la sección "Funcionalidades Pendientes /
Backlog" de `PROYECTO.md` como fuente de verdad de **qué sigue**; `PROYECTO.md`
sigue siendo la fuente de verdad de **cómo funciona** el sistema hoy y su
historia.

## Cómo trabajamos (Scrum liviano)

Somos un equipo de una persona (Lucas) + Claude. Sin sprints con fecha fija,
sin story points, sin ceremonias — esas herramientas existen para coordinar
equipos, y acá no hay nada que coordinar entre personas. Lo que sí vale la
pena de Scrum:

- **Un backlog único y priorizado**, no ideas dispersas en la cabeza o en el chat.
- **Límite de trabajo en curso = 1.** Un solo ítem en "🔵 En curso" a la vez.
  Terminarlo (mergeado a `main`) antes de arrancar el siguiente.
- **Reordenar es gratis.** Las prioridades de abajo son la lectura de Claude
  del estado actual — cambialas cuando quieras, es una lista, no un contrato.

Cada ítem que entra en curso se formaliza en el embudo **Epic → Feature →
Caso de uso → Spec** — ver [`PROCESO.md`](PROCESO.md).

## 🔴 Urgente — interrumpe el orden normal

- **Reconstrucción de Carga Masiva** — ventana de ~2 semanas, escrituras de
  barrios próximas. Interrumpe el límite de WIP=1 normal por razón de
  negocio real, no por desorden. Feature 1 y Feature 2 terminadas
  (2026-09-25). Feature 7 (expedientes de barrio en Drive + escanear
  documentación por lote): T1-T6 implementados y en producción
  (2026-09-30) — falta T7 (smoke test completo de punta a punta, con
  sesión de Google real) y T8 (cierre formal: PROYECTO.md, ADO).
  — [epic](epics/carga-masiva-rebuild.md) · [spec](specs/escaneo-drive-carga-masiva/)

## 🟢 Próximo

- ~~Confirmar guardado de ediciones OnlyOffice → Supabase end-to-end~~ — hecho 04/11/26: abrir con token, editar, cerrar y verificar el .docx en Supabase con la edición
- ~~JWT real para OnlyOffice~~ — hecho 04/11/26 (`api/oo-config.js` firma, `api/oo-callback.js` verifica; servidor nuevo en Contabo)
- Bucket `oo-docs` es público: cualquiera con la URL de un documento lo descarga. Evaluar URLs firmadas de corta vida (ojo: OO descarga el documento desde su servidor, así que la URL debe durar lo que tarde en abrirse)
- ~~Quitar el `console.log` de diagnóstico en `AuthContext.jsx`~~ — hecho 04/11/26 (auditoría de código: salieron los 9 `console.log` de depuración)
- **Correr `scripts/oo_docs_privado.sql`** en el SQL Editor de Supabase (el código que firma las URLs ya está en producción) y pasar la tabla final de políticas para re-probar con la clave anon. Mientras no se corra, el bucket `oo-docs` sigue siendo público.
- **Verificar `templates_barrio.html`**: el editor de modelos guarda HTML; desde 04/11/26 `htmlATexto` lo convierte antes de generar. Cargar el primer modelo real de un barrio y confirmar que la escritura sale limpia (sin etiquetas) y con negrita/subrayado.
- **Probar en vivo el ZIP de barrio**: ahora usa el mismo motor que el editor del lote e incluye los .docx editados a mano. Unit tests cubren el motor, pero la descarga completa no se probó en navegador.
- **Auditoría de código (04/11/26) — deuda que quedó**:
  - `api/scriba.js` (467 líneas): extraer `ejecutarTool` (cascada de `if` por nombre de tool) a un módulo por tool.
  - `buildVars` en `templateVars.js` es una sola función de ~440 líneas; `BulkScreen` (1.185 líneas, 141 estilos inline), `EditorScreen` (29 `useState`) y `PartesEditor` (1.099 líneas) piden partirse.
  - Dos editores para modelos y documentos: `PageEditor`+`usePagination` (ProseMirror, solo `ModeloScreen`) vs. OnlyOffice. Decidir si los modelos de barrio también pasan a OnlyOffice.
  - Bundle único de 1,48 MB (406 KB gzip): cargar pantallas y herramientas (`React.lazy`).
  - Lint: quedan 39 problemas, casi todos reglas de hooks (`exhaustive-deps`, `set-state-in-effect`). El CI no corre lint; sumarlo cuando bajen a 0.
  - 31 `alert()`/`confirm()` nativos → UX/UI.
  - `PROYECTO.md` (838 líneas) sigue describiendo GCP/Oracle/Clouding; reescribir las secciones de infraestructura con el estado real (Contabo + Cloudflare).
  - La URL y la anon key de Supabase están repetidas en `src/supabase.js`, `api/_supabaseConfig.js` y 4 scripts.
- ~~Automatismo de horario de Clouding~~ — eliminado 04/11/26 (Clouding dado de baja; apagar de noche nunca ahorró plata porque factura igual apagado)

## 🟡 Después

- Revisión de datos del presupuesto notarial por Fátima (`scripts/datos_sensibles.md`, valores marcados ⚠️)
- Plantilla F-04 (`ModalFormulario` ya tiene el selector)
- Informe de Dominio (`HerramientasScreen`, familia Automotor)
- Sync de requirentes con CRM (placeholder visible en `ModalPartes`, sin backend)
- 54 errores de lint preexistentes (bloquean sumar `lint` al CI)

## ⚪ Bloqueadas / necesitan decisión externa

- Bot de WhatsApp — pausado, bloqueado por gating de antigüedad de cuenta en Meta Business API
- Rogatoria de Escrituras Públicas — pausado, necesita soporte de tablas en `buildDocxGenerico` y no hay forma de verificar visualmente en esta máquina (sin LibreOffice/Word)
- Cobertura de templates (271/563 categorías sin plantilla) — necesita curación y priorización de Fátima
- Firmar el DPA con Supabase — acción de cuenta del titular de la organización, no de código
- Recordatorio trimestral automatizado de aranceles/tasas (candidato a `/schedule`)
- Evaluar servidores MCP argentinos (`mcp-legal-ar`, `mcp-arca-afip`, `pyrenaper`) — sin garantía de mantenimiento, no implementado

## ✅ Recién terminado

- **Bug más antiguo del editor, resuelto de raíz (2026-09-30)**: cambiar cualquier dato del panel en un documento *reabierto* (no uno nuevo) nunca regeneraba el documento — `generatedOnceRef` solo se marcaba dentro de `handleGenerar()`, que a propósito no corre al reabrir un DOCX ya guardado, así que el efecto que dispara la regeneración se cortaba en su primera línea para siempre. Aplicado a `EditorScreen.jsx` y `LoteDocScreen.jsx` (que ya lo tenía bien). Encontrado con reproducción real + logs de diagnóstico temporales (ya removidos).
- Ediciones manuales de OnlyOffice: dejar de asumir siempre "sí hay texto a mano sin guardar" al reabrir un documento — ahora se persiste el dato real (`tiene_ediciones_manuales`) y se lee al reabrir, en vez de preguntar confirmación en cada primer cambio sin necesidad (2026-09-30)
- Fix: un documento podía quedar generado (y guardado para siempre) con "Admin" como escribano — el placeholder de arranque de una cuenta admin se colaba en la ventana de carrera antes de seleccionar el titular real. Ahora el admin carga directo el registro real (McLeod) desde el login, sin placeholder, más un guardia en `handleGenerar()` que nunca genera con escribano vacío o "Admin" (2026-09-30)
- Escaneo de documentos (DNI, tarjeta verde) no leía PDF — ahora se rasteriza en el navegador con `pdfjs-dist` antes de mandarlo, mismo camino liviano que las fotos; sin límite de tamaño real (2026-09-30)
- Scriba: `extraer_documento` descartaba los PDF adjuntos antes de analizarlos; el límite de tamaño de adjuntos se medía en crudo antes de comprimir la imagen, rechazando fotos de celular normales sin necesidad (2026-09-30)
- Automatización de horario de Clouding: ya no confía en que la API haya *aceptado* el pedido (202) — verifica el estado real del servidor después de pedir start/stop, reintenta una vez, y falla visiblemente (con notificación de GitHub) si no lo logra (2026-09-30)
- Editor unificado (OnlyOffice) para "ver documento" de un lote en Carga Masiva (2026-09-25) — smoke test en producción encontró y corrigió, de paso: botón "Volver" roto en Logs internos, nombres de barrio duplicados sin validar, fuga de datos entre registros en "Últimas escrituras", y agregó persistencia de navegación en `sessionStorage` (sobrevivir a un F5) tanto a nivel app como dentro de Carga Masiva
- Motor de variables unificado para Carga Masiva (2026-09-25) — ver PROYECTO.md #94
- Persistencia del chat de Scriba al cerrar/reabrir el panel + rediseño de navegación de historial (2026-09-21) — 8 bugs reales encontrados y corregidos en smoke test manual antes de mergear
- Fix crash al crear barrio nuevo en Carga masiva + dependencia `jszip` faltante (2026-09-21)
- Feedback 👍/👎 por respuesta de Scriba + módulo de aprendizaje diario (2026-09-21)
- Validaciones deterministas (`validar_limites_inmueble`, `calcular_edad`) + límite de alcance en Scriba
- Buscador de instrumentos por nombre en "Crear documento"
- Mensaje de mantenimiento en el editor OnlyOffice (en vez de loop infinito de reconexión)
- Fix fecha de nacimiento inventada en escaneo de DNI

## Backup diario a R2 (05/11/26) — hecho, con límites conocidos

`api/cron/backup.js` (cron 07:00 UTC) vuelca las 23 tablas de `public` + usuarios de Auth a `tablas/AAAA-MM-DD/*.json.gz`
(retención 30 días, regla del bucket) y espeja `oo-docs` y `documentos` a `storage/` (incremental, sin borrado).
Bucket privado `notarial-backups`; credenciales `BACKUP_R2_*` en Vercel (sensibles) y `scripts/.env`. Disparo manual:
`curl -H "Authorization: Bearer $BACKUP_TRIGGER_TOKEN" https://notarial.lat/api/cron/backup`.
Verificado: conteos de R2 == base para las 23 tablas y 886 + 31 archivos; una tabla se cargó con `json_populate_recordset`.

Pendiente / límites:
- **No es un `pg_dump`**: no incluye esquema (RLS, funciones, índices, triggers) ni hashes de contraseñas de Auth. Para eso hace
  falta la contraseña de la base (secreto de GitHub Actions + `pg_dump` a R2) o una foto del esquema versionada en `docs/`.
- **Falta un simulacro de restauración completa** en un proyecto Supabase limpio (script `scripts/restaurar_backup.mjs`).
- **Monitoreo con aviso por mail**: el backup falla con HTTP 500 y deja el error en los logs de Vercel, pero nadie se entera solo.
- Resetear la contraseña de la base (quedó pegada en el chat el 05/11/26). Nada del backup la usa, no hay nada que actualizar.

## Monitoreo y avisos por Telegram — 📌 en pausa hasta el número nuevo (retomar ~05/12/26)

Lucas cambia de número de teléfono en ~1 mes y quiere dar de alta el bot con el número nuevo. Todo el código ya está
desplegado y **no hace nada mientras falten las variables** (no rompe nada): `api/_telegram.js`, aviso diario en
`api/cron/backup.js`, aviso de "sin crédito" en `api/scriba.js`, y el Worker `workers/monitor/` (+ `scripts/deploy_monitor.mjs`).

Para activarlo (2 min de Lucas, 5 de Claude):
1. Lucas crea el bot con @BotFather (`/newbot`), agrega `TELEGRAM_BOT_TOKEN=...` a `scripts/.env` (no por chat) y le manda "hola" al bot.
2. Claude obtiene el `chat_id` (getUpdates), carga `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` en Vercel, corre
   `node scripts/deploy_monitor.mjs` y verifica con un mensaje de prueba y una caída simulada.

Mientras tanto no hay avisos: el backup diario corre igual, pero si falla solo queda en los logs de Vercel.
