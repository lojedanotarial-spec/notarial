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
  negocio real, no por desorden. El fix urgente de arranque (crash al
  crear barrio + `jszip`) ya está en producción — arranca ahora la
  Feature 1 (motor de variables unificado).
  — [epic](epics/carga-masiva-rebuild.md)

## 🟢 Próximo

- JWT real para OnlyOffice (hoy desactivado — deuda de seguridad aceptada explícitamente durante la migración a Clouding)
- Confirmar guardado de ediciones OnlyOffice → Supabase end-to-end (el callback existe, falta validarlo con el servidor ya estable)

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

- Persistencia del chat de Scriba al cerrar/reabrir el panel + rediseño de navegación de historial (2026-09-21) — 8 bugs reales encontrados y corregidos en smoke test manual antes de mergear
- Fix crash al crear barrio nuevo en Carga masiva + dependencia `jszip` faltante (2026-09-21)
- Feedback 👍/👎 por respuesta de Scriba + módulo de aprendizaje diario (2026-09-21)
- Validaciones deterministas (`validar_limites_inmueble`, `calcular_edad`) + límite de alcance en Scriba
- Buscador de instrumentos por nombre en "Crear documento"
- Mensaje de mantenimiento en el editor OnlyOffice (en vez de loop infinito de reconexión)
- Fix fecha de nacimiento inventada en escaneo de DNI
