# Feature: Ver documento de un lote sobre el editor unificado

**Epic:** [Reconstrucción de Carga Masiva](../epics/carga-masiva-rebuild.md)
**Estado:** 🔵 En curso
**Spec:** [`specs/editor-unificado-carga-masiva/`](../specs/editor-unificado-carga-masiva/)

## Qué entrega

Que la escritura de un lote de barrio se vea y edite con el mismo
editor que usa el resto de la app (OnlyOffice + panel lateral de
datos), en vez de la vista previa propia de `LoteDocScreen` que solo
permite mirar el texto generado, no escribir sobre él.

## Por qué importa ahora

De las escrituras de un barrio, la enorme mayoría sale bien directo
del modelo — pero siempre hay alguna con un detalle puntual (una
palabra, un número, una circunstancia de ese lote en particular) que el
modelo no puede prever. Hoy no hay forma de corregir eso sin romper el
modelo del barrio entero o salirse del sistema (exportar y editar
afuera, perdiendo el circuito de guardado). Con las escrituras urgentes
encima, esto deja de ser un "sería lindo tener" — es lo que separa un
barrio que sale bien de un barrio con 99 escrituras idénticas y una
mal.

## Casos de uso

| Caso de uso | Resumen |
|---|---|
| [UC-1: Corregir un detalle puntual](../usecases/lote-correccion-puntual.md) | El motivo del cambio — hoy no se puede |
| [UC-2: Generación inicial](../usecases/lote-generacion-inicial-editor-unificado.md) | Lo que ya funciona hoy debe seguir funcionando igual |
| [UC-3: Cambio de dato tras edición manual](../usecases/lote-cambio-dato-tras-edicion-manual.md) | No perder en silencio una corrección ya hecha a mano |

Estos casos de uso son la fuente de los criterios de aceptación en
`spec.md` — cualquier cambio de alcance se discute primero acá.
