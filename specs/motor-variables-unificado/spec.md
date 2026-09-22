# Spec: Motor de variables unificado para Carga Masiva

**Estado:** ✅ aprobado (22/09/26) — listo para `plan.md`
**Feature:** [`features/motor-variables-unificado.md`](../../features/motor-variables-unificado.md)
**Epic:** [`epics/carga-masiva-rebuild.md`](../../epics/carga-masiva-rebuild.md)
**Casos de uso:** [UC-1](../../usecases/lote-multiples-adquirentes.md) · [UC-2](../../usecases/lote-concordancia-rol.md) · [UC-3](../../usecases/lote-variables-inmueble.md)
**Origen:** pedido de urgencia 21/09/26, Epic "Reconstrucción de Carga Masiva"

## Problema

Carga Masiva calcula las variables de una escritura de lote con su propia
lógica, separada y duplicada de la que usa el resto del sistema para
cualquier otro documento. Esa duplicación no es solo deuda técnica: hoy
produce escrituras incompletas y con una redacción distinta a la del
resto de los documentos que emite la escribanía.

## Comportamiento actual (verificado en código, no supuesto)

- El motor de Carga Masiva toma únicamente al **primer** adquirente
  cargado en el lote para construir las variables de identidad — si hay
  más de un adquirente (por ejemplo cónyuges comprando juntos), los
  datos de los demás no aparecen en ningún lugar de la escritura
  generada, sin ningún aviso al escribano.
- El rol cargado para cada adquirente (comprador, co-comprador, cónyuge
  del comprador, etc.) no se usa para nada en el texto generado. El
  género sí se usa, pero con una fórmula más simple que no cubre
  plurales ni las variaciones de concordancia que el resto del sistema
  ya resuelve (tratamiento singular/plural, verbos en plural cuando hay
  más de un compareciente del mismo rol).
- El formateo de nombres, DNI y domicilio de los adquirentes sigue reglas
  propias, distintas de las que usa el resto del sistema para el mismo
  tipo de dato.
- Las variables propias del inmueble del lote (manzana, lote,
  superficies — mensura y hasta cuatro títulos —, límites, precio,
  retención de ganancias, y certificados de registro/catastro/avalúo/
  padrones) sí funcionan correctamente hoy y no tienen equivalente en el
  motor que usa el resto del sistema, porque hasta ahora nadie las había
  necesitado fuera de Carga Masiva.

## Comportamiento deseado (criterios de aceptación)

- [ ] Una escritura de lote con más de un adquirente incluye los datos de
      **todos** los adquirentes cargados, no solo el primero. *(UC-1)*
- [ ] El rol y el género cargados para cada adquirente se reflejan en el
      texto generado con la misma concordancia (tratamiento, plural
      cuando corresponde) que usa el resto del sistema para cualquier
      otro documento. *(UC-2)*
- [ ] El formateo de nombres, DNI y domicilio de los adquirentes es el
      mismo, dato por dato, que el que usa el resto del sistema — un
      escribano que conoce la redacción de otros documentos no nota
      diferencia de convención al leer una escritura de lote de barrio.
      *(UC-2)*
- [ ] Las variables propias del inmueble (manzana, lote, superficies,
      límites, precio, retención de ganancias, certificados) se siguen
      generando exactamente igual que hoy — mismo cálculo, mismo
      formato, sin necesidad de volver a cargar datos de lotes o barrios
      ya existentes. *(UC-3)*
- [ ] No hay dos lugares distintos del sistema calculando variables de
      identidad de una persona con reglas diferentes — la lógica de
      partes/escribano/fecha queda en un solo lugar, del que depende
      tanto Carga Masiva como el resto del sistema.

## Fuera de alcance (a propósito)

- Cambiar el diseño del formulario de carga de adquirentes
  (`ModalPartes`) — ya soporta rol y múltiples partes, el problema es
  exclusivamente que el cálculo de variables no las aprovecha.
- La curación de qué variables detecta cada modelo de barrio (eso es la
  Feature "Curación de modelo por barrio" del mismo epic, depende de
  esta).
- El formulario de carga dinámico por lote y el import masivo de lotes
  en tabla — features separadas del mismo epic, dependen de esta.
- Cualquier cambio a cómo se ven o exportan las escrituras ya generadas
  con el motor actual antes de este cambio — no hay migración retroactiva
  de documentos ya guardados, solo de cómo se generan los nuevos.

## Preguntas abiertas (a resolver antes de pasar a `plan.md`)

Ninguna — el comportamiento actual está verificado en código y los
criterios de aceptación surgen directamente de los tres casos de uso.
