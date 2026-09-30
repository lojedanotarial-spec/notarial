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

- Confirmar guardado de ediciones OnlyOffice → Supabase end-to-end (el callback existe, falta validarlo con el servidor ya estable)
- JWT real para OnlyOffice (hoy desactivado — deuda de seguridad aceptada explícitamente durante la migración a Clouding)
- Quitar el `console.log` de diagnóstico en `AuthContext.jsx` (efecto de carga de miembros) — quedó de una investigación anterior, ya no hace falta con el fix de admin→McLeod directo del 30/09/26
- Confirmar que el automatismo de horario de Clouding (con verificación de estado real, no solo el 202 de aceptación) sostiene bien varios ciclos seguidos — reforzado 30/09/26 tras un fallo silencioso real

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
