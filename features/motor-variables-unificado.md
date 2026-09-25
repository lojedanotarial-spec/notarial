# Feature: Motor de variables unificado para Carga Masiva

**Epic:** [Reconstrucción de Carga Masiva](../epics/carga-masiva-rebuild.md)
**Estado:** ✅ Terminado (25/09/26)
**Spec:** [`specs/motor-variables-unificado/`](../specs/motor-variables-unificado/)

## Qué entrega

Que las escrituras de lotes de barrio se generen con el mismo motor de
variables que usa el resto de la app (`buildVars()` /
`templateVars.js`) en vez del motor propio, duplicado y hardcodeado, que
tiene hoy Carga Masiva (`generarEscritura.js`). Mismo cálculo de partes,
escribano y fecha en todos lados — más las variables propias de un
inmueble de barrio (lote, superficies, límites, precio, certificados),
que no existen en el motor genérico porque hasta ahora nadie las
necesitaba fuera de Carga Masiva.

## Por qué importa ahora

`generarEscritura.js` solo toma el **primer** adquirente del lote
(`adquirentes[0]`) para armar las variables `ADQ_*` — cualquier lote con
más de un comprador (cónyuges comprando juntos, por ejemplo) pierde en
silencio los datos del resto. Tampoco usa el `rol` que ya captura
`ModalPartes` (concordancia de género/plural, "el señor"/"la señora",
COMPARECE/COMPARECEN) ni el formateo de nombres/domicilio que el resto
del sistema ya resuelve. Con escrituras reales de barrio encima, este no
es un problema teórico.

## Casos de uso

| Caso de uso | Resumen |
|---|---|
| [UC-1: Lote con más de un adquirente](../usecases/lote-multiples-adquirentes.md) | Hoy se pierden los datos de todos menos el primero |
| [UC-2: Concordancia de rol y género](../usecases/lote-concordancia-rol.md) | El rol cargado en el lote debe reflejarse en el texto igual que en el resto de la app |
| [UC-3: Variables propias del inmueble sin regresión](../usecases/lote-variables-inmueble.md) | Manzana, lote, superficies, límites, precio y certificados deben seguir funcionando igual que hoy |

Estos casos de uso son la fuente de los criterios de aceptación en
`spec.md` — cualquier cambio de alcance se discute primero acá.
