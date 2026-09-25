# Spec: Ver documento de un lote sobre el editor unificado

**Estado:** ✅ aprobado (25/09/26) — listo para `plan.md`. Nota del usuario al aprobar: prestar atención especial en `plan.md` a los mecanismos y reglas exactas de edición después de cambios manuales (ver UC-3).
**Feature:** [`features/editor-unificado-carga-masiva.md`](../../features/editor-unificado-carga-masiva.md)
**Epic:** [`epics/carga-masiva-rebuild.md`](../../epics/carga-masiva-rebuild.md)
**Casos de uso:** [UC-1](../../usecases/lote-correccion-puntual.md) · [UC-2](../../usecases/lote-generacion-inicial-editor-unificado.md) · [UC-3](../../usecases/lote-cambio-dato-tras-edicion-manual.md)
**Origen:** pedido 25/09/26, durante el smoke test manual de la Feature 1 del mismo epic

## Problema

La escritura de un lote de barrio se muestra hoy en una vista de solo
lectura: texto generado a partir de un modelo, sin forma de escribir
sobre él. El resto de la aplicación, para cualquier otro tipo de
documento, sí permite editar el texto libremente con un editor
completo. Esta asimetría no es solo de estilo visual — es una
limitación funcional real: no hay manera de corregir un detalle puntual
de una escritura sin modificar el modelo del barrio entero (lo que
afecta a todas las demás escrituras de ese barrio) o sin salir del
sistema por completo (exportar el documento y editarlo aparte, perdiendo
la posibilidad de que quede guardado en la app).

## Comportamiento actual (verificado en código, no supuesto)

- La vista de un lote genera el texto de la escritura sustituyendo
  variables sobre el modelo del barrio y lo muestra como HTML de solo
  lectura, con un resaltado opcional de qué variables están completas o
  vacías. No hay ningún mecanismo para escribir texto libre sobre ese
  resultado.
- El resto de los documentos de la aplicación (no los de barrio) usan
  un editor de texto completo, embebido, con guardado automático de lo
  que se escribe.
- Ese editor completo ya resuelve un problema que sería necesario
  resolver de nuevo si se construyera algo desde cero para los lotes:
  qué pasa cuando cambia un dato de origen (por ejemplo, se corrige el
  DNI de un adquirente) después de que ya se escribió algo a mano sobre
  el documento generado. Hoy, en ese editor completo, el sistema detecta
  que hay una edición manual sin "absorber" y pide confirmación antes de
  regenerar el documento y perderla — no la pisa en silencio.
- Los datos de un lote (adquirentes, inmueble, precio, registraciones)
  ya se cargan hoy mediante formularios existentes, que no cambian con
  esta feature.

## Comportamiento deseado (criterios de aceptación)

- [ ] Al ver la escritura de un lote, el escribano puede escribir texto
      libremente sobre ella, igual que en cualquier otro documento de
      la aplicación — no solo mirarla. *(UC-1)*
- [ ] Un ajuste hecho a mano en la escritura de un lote no afecta al
      modelo del barrio ni a las escrituras de los demás lotes. *(UC-1)*
- [ ] La primera vez que se ve la escritura de un lote (sin ediciones
      manuales todavía), se genera automáticamente con los datos ya
      cargados del lote — igual que sucede hoy. *(UC-2)*
- [ ] Cambiar un dato del lote antes de haber escrito nada a mano
      regenera la escritura con el dato nuevo, sin pedir confirmación
      (no hay nada que se pueda perder todavía). *(UC-2)*
- [ ] Si ya existe una edición manual sin regenerar y se cambia un dato
      del lote que normalmente regeneraría la escritura, el sistema
      avisa antes de reemplazar el texto y pide confirmación explícita
      — nunca reemplaza una edición manual en silencio. *(UC-3)*
- [ ] La experiencia de ver/editar una escritura de lote es
      reconocible como la misma que la del resto de la aplicación
      (misma forma de escribir, mismo comportamiento de guardado) — no
      una herramienta aparte con sus propias reglas.

## Fuera de alcance (a propósito)

- La exportación masiva de todas las escrituras de un barrio a la vez
  (ZIP de DOCX) — sigue funcionando como hoy, no se toca en esta
  feature. Pasar esa exportación a generarse desde el mismo motor es
  la Feature "Exportación masiva sobre el motor unificado" del epic,
  posterior a esta.
- El formulario de carga de datos del lote (adquirentes, inmueble,
  precio) — no cambia con esta feature, solo cambia cómo se ve y edita
  el texto ya generado.
- Cualquier flujo de datos desde Google Drive — es una idea anotada por
  separado en el backlog, no arranca con esta feature.

## Preguntas abiertas (a resolver antes de pasar a `plan.md`)

Ninguna — el mecanismo clave (qué hacer ante una edición manual sin
regenerar) ya existe, verificado en código, y los criterios de
aceptación surgen directamente de los tres casos de uso.
