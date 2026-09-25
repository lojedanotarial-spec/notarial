# Tasks: Ver documento de un lote sobre el editor unificado

**Plan:** [`plan.md`](plan.md) (aprobado)
**Estado:** ⬜ no iniciado

Orden estricto — cada tarea es verificable por separado antes de pasar a
la siguiente. Implementación en rama propia (`feat/editor-unificado-carga-masiva`
o similar) + PR, nunca directo a `main`.

- [ ] **T1 — Generar el DOCX del lote con el motor unificado (sin tocar la UI todavía)**
  En `LoteDocScreen`, construir `vars` con `buildVars({ partes: lote.partes
  || [], escribano, fecha })` + las variables de inmueble (la función ya
  extraída en `generarEscritura.js` durante la Feature 1) como
  `extravars`, y pasarlas a `buildDocxGenerico({ contenido: templateHTML,
  ...vars })`. Subir el resultado a `oo-docs` con una key nueva. No
  renderizar OnlyOffice todavía — solo confirmar que el DOCX se genera
  sin errores.
  **Verificación:** descargar el DOCX generado (desde el bucket, a
  mano) y confirmar que tiene los mismos datos que la vista previa
  actual de ese mismo lote.

- [ ] **T2 — Reemplazar la vista previa por `<OnlyOfficeEditor>`**
  Sacar `VistaDocumento` (zoom, toggle Fondo/Variables) y renderizar
  `<OnlyOfficeEditor documentUrl={...} documentKey={...} onEdit={...}>`
  apuntando al DOCX de T1.
  **Verificación:** abrir "Ver documento" de un lote con datos cargados
  — se ve la escritura generada dentro del editor completo (misma
  barra de herramientas que un documento individual), y se puede
  escribir sobre ella. *(UC-1, UC-2)*

- [ ] **T3 — Persistir `document_key` para no perder el documento al volver**
  Guardar `document_key` en la fila de `documentos` del lote (mismo
  patrón que `useAutoguardado` ya hace para documentos individuales).
  Al reabrir "Ver documento" de un lote que ya tiene `document_key`,
  abrir el DOCX guardado directamente — no regenerar automático.
  **Verificación:** generar la escritura de un lote, cerrar y volver a
  entrar — se ve el mismo documento, no uno regenerado de cero.

- [ ] **T4 — Conectar el panel de datos del lote al mecanismo de regeneración**
  Implementar `hasOoEdits`/`pendingRegen`/`generatedOnceRef`/
  `regenerarPorCambio` (duplicado de `EditorScreen`, según plan.md
  decisión 1). Conectar cada campo de `PanelLote`:
  - Adquirentes (vía `ModalPartes`, ya existente) → regenera apenas se
    aplica el modal.
  - Campos de texto libre (superficie, límites, certificados, etc.) →
    regeneran al salir del campo (`onBlur`), no por tecla.
  - Al reabrir un lote con `document_key` ya guardado, arrancar con
    `hasOoEdits = true` (mismo criterio conservador que `EditorScreen`).
  **Verificación:** con el documento recién generado (sin ediciones
  manuales), cambiar el precio del lote — se regenera solo, sin pedir
  confirmación. *(UC-2)*

- [ ] **T5 — Mostrar el aviso antes de pisar una edición manual**
  Reusar `<ConfirmRegenerar>` (ya extraído a componente compartido).
  Al cambiar un dato del panel habiendo ediciones manuales sin
  regenerar (`hasOoEdits === true`), mostrar el aviso en vez de
  regenerar directo.
  **Verificación:** escribir algo a mano en el documento generado,
  después cambiar un dato del panel (ej. el precio) — aparece el aviso.
  Cancelar no toca el documento; confirmar lo regenera y pierde lo
  escrito a mano. *(UC-3)*

- [ ] **T6 — Aviso al salir con cambios sin guardar**
  Igual que `handleGo` en `EditorScreen`: si hay una edición manual sin
  guardar (`hasUnsavedOoEditRef` o equivalente) al volver a la lista de
  lotes, confirmar antes de salir.
  **Verificación:** escribir algo a mano, tocar "Volver" sin haber
  guardado — pide confirmación antes de salir.

- [ ] **T7 — Confirmar que `exportarBarrioZip.js` no se ve afectado**
  La exportación masiva sigue usando `generarEscritura.js` (fuera de
  alcance de esta feature). Confirmar que generar/editar la vista
  individual de un lote no rompe ni cambia el resultado de la
  exportación ZIP del barrio completo.
  **Verificación:** exportar el ZIP de un barrio con al menos un lote
  que ya tiene `document_key` guardado — el DOCX del ZIP sale igual
  que si nunca se hubiera abierto "Ver documento" para ese lote.

- [ ] **T8 — Smoke test completo de los 3 UC en producción**
  Correr los 3 casos de uso de punta a punta contra la app real (no
  solo unitariamente) — no hay entorno de staging estable, así que esto
  reemplaza a ese paso. Documentar qué se probó en la descripción del PR.

- [ ] **T9 — PR, merge, y cierre del ciclo**
  Abrir el PR con el resumen de qué cambió y por qué (referenciando
  `spec.md`/`plan.md`). Tras mergear: actualizar `PROYECTO.md`, mover el
  ítem de "🔵 En curso" a "✅ Recién terminado" en `BACKLOG.md`, y marcar
  la Feature #12 y las User Stories #13-15 como `Closed` en Azure DevOps.
