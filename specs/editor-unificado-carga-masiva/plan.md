# Plan: Ver documento de un lote sobre el editor unificado

**Spec:** [`spec.md`](spec.md) (aprobado, sin preguntas abiertas)
**Estado:** 🟡 en revisión — pendiente de aprobación

## Causa raíz (por qué esto es reusar, no inventar)

`LoteDocScreen` genera el texto de la escritura con `generarEscritura()`
(HTML con `{{VAR}}` sustituidas y resaltadas) y lo muestra de solo
lectura. `EditorScreen` resuelve el mismo problema — generar un
documento desde variables — pero un paso más allá: genera un **DOCX
real**, lo sube a Supabase Storage, y lo abre en OnlyOffice para poder
seguir editándolo. Ese camino ya existe, ya está en producción, y ya
resuelve el problema difícil (no perder una edición manual al
regenerar). Migrar `LoteDocScreen` es conectar sus datos a ese mismo
camino, no construir uno nuevo.

Verificado en código que las piezas son genéricas, no atadas a
`EditorScreen`:

- `buildDocxGenerico({ contenido, partes, escribano, fecha, protocolo,
  instrumento, extravars, vehiculos, rolesContextuales, estilos, ... })`
  — `protocolo`/`instrumento`/`vehiculos` tienen default vacío y no
  hace falta usarlos para lotes. `extravars` es el escape hatch genérico
  donde entran las variables propias del inmueble (las mismas que ya
  calcula `generarEscritura.js` desde la Feature 1 — `MANZANA`, `LOTE`,
  `PRECIO_LETRAS`, etc.), sin modificar esta función.
- `<OnlyOfficeEditor>` es un componente genérico (`documentUrl`,
  `documentKey`, `onEdit`), no conoce nada de "documento individual" ni
  de "lote".
- `useAutoguardado` ya persiste `document_key` en la tabla `documentos`
  genéricamente — Carga Masiva ya usa esa misma tabla hoy
  (`template_key: "escrituraBarrio"`, `lote_id`), solo le falta guardar
  `document_key`.
- El mecanismo de UC-3 (no perder ediciones manuales) vive en
  `EditorScreen` como un puñado de piezas de estado + un flujo, no como
  código atado a esa pantalla — se puede reusar el mismo flujo.

## El mecanismo de UC-3, en detalle (pedido explícito de prestarle atención)

Así funciona hoy en `EditorScreen`, verificado línea por línea:

1. **Generar por primera vez** (`handleGenerar`): arma `vars` con
   `buildVars()`, construye el DOCX con `buildDocxGenerico()`, lo sube a
   `oo-docs` con una key nueva (`doc-${Date.now()}`), y marca
   `generatedOnceRef.current = true`, `hasOoEdits = false`.
2. **El escribano escribe algo a mano en OnlyOffice** → el componente
   dispara `onEdit`, que pone `hasOoEdits = true` (con un ref espejo,
   `hasOoEditsRef`, para leer el valor actual dentro de callbacks sin
   depender de la clausura de React).
3. **Cambia un dato del panel** (ej. el precio) → en vez de regenerar
   directo, se llama `regenerarPorCambio()`:
   - Si `hasOoEditsRef.current` es `false` (nunca se tocó a mano, o ya
     se regeneró después de la última edición) → regenera directo, sin
     preguntar. *(criterio de aceptación UC-2)*
   - Si es `true` → `setPendingRegen(true)`, se muestra un modal de
     confirmación (`ConfirmRegenerar`) en vez de tocar el documento.
     *(criterio de aceptación UC-3)*
4. **El escribano confirma** → recién ahí se llama `handleGenerar()` de
   nuevo (pisa la edición manual, a sabiendas) y se resetea
   `hasOoEdits = false`. **Si cancela**, no pasa nada — el dato nuevo
   del panel queda cargado en el estado local, pero el documento sigue
   como estaba hasta que el escribano decida regenerar.
5. **Reabrir un documento ya generado** (`docId` con `document_key`
   existente): se abre el DOCX guardado tal cual está (no se regenera
   nunca automáticamente), y se marca `hasOoEdits = true` de entrada —
   conservador a propósito: no hay forma de saber si hubo ediciones
   manuales sin volver a abrir el archivo, así que se asume que sí las
   puede haber.

Para lotes, el mismo flujo aplica campo por campo: cambiar un
adquirente, el precio, o cualquier dato del panel de un lote pasa por
el mismo `regenerarPorCambio()` — no hace falta un mecanismo distinto
por tipo de campo.

## Archivos afectados

- **`src/screens/LoteDocScreen.jsx`** — cambio principal:
  - Se elimina `VistaDocumento` (renderizado HTML propio, zoom, toggle
    Fondo/Variables) y se reemplaza por `<OnlyOfficeEditor>`.
  - `PanelLote` se mantiene como panel lateral, pero cada cambio de
    campo pasa a llamar `regenerarPorCambio()` en vez de solo actualizar
    estado local + re-renderizar el HTML.
  - Nuevo estado: `documentUrl`, `documentKey`, `hasOoEdits`,
    `pendingRegen`, `generatedOnceRef` (mismos nombres que
    `EditorScreen`, a propósito — facilita ver que es el mismo
    mecanismo si alguien compara ambos archivos).
  - La generación llama `buildVars({ partes: lote.partes || [],
    escribano, fecha })` + las variables de inmueble (ya extraídas como
    función propia en la Feature 1, dentro de `generarEscritura.js`) como
    `extravars`, y pasa el resultado a `buildDocxGenerico()`.
  - `generarEscritura.js` **no se borra** — `exportarBarrioZip.js` lo
    sigue usando para la exportación masiva (fuera de alcance de esta
    feature, ver spec). Queda como el motor de la exportación batch,
    mientras que la vista de un lote individual pasa a usar
    `buildDocxGenerico()`.
- **`src/utils/buildDocxGenerico.js`** — sin cambios. Ya acepta todo lo
  necesario vía `extravars`.
- **`src/components/OnlyOfficeEditor.jsx`** — sin cambios. Componente
  genérico, se reusa tal cual.
- **Tabla `documentos` (Supabase)** — sin cambios de esquema. Ya tiene
  `document_key` (la usa `EditorScreen`); los documentos de lote
  (`template_key: "escrituraBarrio"`) empiezan a completarlo.
- **`src/screens/BulkScreen.jsx`** — sin cambios funcionales; sigue
  navegando a `LoteDocScreen` igual que hoy.

## Decisiones de diseño

### 1. Duplicar el mecanismo de UC-3 en vez de extraerlo a un hook compartido — por ahora

Se evaluó extraer `hasOoEdits`/`pendingRegen`/`regenerarPorCambio` de
`EditorScreen` a un hook reusable (`useDocumentoGenerado` o similar) en
vez de repetir el patrón en `LoteDocScreen`. Se decide **duplicar por
ahora**: extraerlo bien implica tocar `EditorScreen` (que está en
producción, sin relación con el epic de Carga Masiva) para generalizar
sus nombres y casos, lo que agrega alcance y riesgo a una feature que
tiene que salir en un día. Duplicar ~30 líneas de estado y un
`useCallback` ya entendidos y probados es más seguro que refactorizar
código en producción bajo presión de tiempo. Queda anotado en
`BACKLOG.md` como limpieza técnica para después.

### 2. Panel lateral: mismas secciones que ya existen en `PanelLote`, no un panel nuevo

No hace falta rediseñar qué campos tiene el panel — `PanelLote` ya
tiene las secciones correctas (Escribano, Escritura, Adquirentes,
Inmueble, Precio, Registraciones). Lo que cambia es que cada `onChange`
pase a llamar `regenerarPorCambio()` en el momento correcto: campos de
texto libre (superficie, límites, certificados) regeneran al salir del
campo (`onBlur`), no por tecla — mismo criterio que ya usa
`EditorScreen` para sus campos libres. Cambios discretos (agregar/
editar un adquirente vía `ModalPartes`, ya existente) regeneran
apenas se aplican.

### 3. La key del documento se genera nueva cada vez que se regenera, nunca se reusa

Igual que en `EditorScreen`: cada `handleGenerar()` sube un archivo con
una key nueva (`doc-${Date.now()}`) en vez de sobreescribir el anterior.
El archivo viejo queda huérfano en el bucket `oo-docs` (mismo
comportamiento que ya existe hoy para documentos individuales — no es
una regresión nueva, es el mismo patrón). Limpiar archivos huérfanos del
bucket, si hace falta, es un tema aparte, no de esta feature.

## Riesgos / edge cases a cubrir en tasks.md

- Un lote sin `lote.partes` (recién creado, sin adquirentes todavía) no
  debe romper la generación inicial — `buildVars()` ya maneja `partes:
  []` (verificado en la Feature 1), confirmar que el flujo completo
  (subir DOCX vacío de partes, abrir en OnlyOffice) tampoco rompe.
- Confirmar que cerrar `LoteDocScreen` con una edición manual sin
  guardar avisa antes de salir — mismo patrón que `handleGo` en
  `EditorScreen` (`hasUnsavedOoEditRef`), adaptado a la navegación de
  `BulkScreen`.
- Confirmar que exportar el ZIP masivo del barrio (`exportarBarrioZip.js`,
  que sigue usando `generarEscritura.js`) no se ve afectado por lotes
  que ya tienen `document_key` — son caminos de generación
  independientes a propósito (ver spec, "fuera de alcance").
