# UC-4: Foto ilegible o dato dudoso

**Feature:** [Captura de documentos desde el celular](../features/captura-celular.md)

## Actor

Quien está sacando las fotos.

## Disparador

Una foto tiene reflejo, está borrosa, cortada o torcida, o un dato no se puede leer
con certeza (por ejemplo una fecha de nacimiento).

## Flujo esperado

1. Al leer el lote, el sistema detecta qué foto o qué dato no es confiable.
2. En el celular se le dice qué pasó y qué hacer ("el dorso salió con reflejo, sacalo
   de nuevo inclinando un poco el documento"), en vez de mostrar datos dudosos como
   si fueran ciertos.
3. El usuario repite solo esa foto; no tiene que rehacer el lote.

## Resultado esperado

Un dato que no se pudo leer queda vacío y marcado, nunca inventado o estimado. Es
preferible pedir otra foto a cargar una fecha o un número equivocado.

## Estado actual

La lectura actual ya deja vacío lo que no puede leer con certeza (en particular la
fecha de nacimiento), pero no le avisa al usuario qué foto repetir.
