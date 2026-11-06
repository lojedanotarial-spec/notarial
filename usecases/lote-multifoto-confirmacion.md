# UC-3: Lote de varias fotos con confirmación

**Feature:** [Captura de documentos desde el celular](../features/captura-celular.md)

## Actor

Quien tiene el celular en la mano con la captura abierta (UC-1 o UC-2).

## Disparador

Hace falta más de una foto: como mínimo frente y dorso, a veces muchas más (varias
personas, varios documentos, tarjeta verde por ambos lados).

## Flujo esperado

1. Saca la primera foto. Aparece una miniatura y las opciones "agregar otra" y "listo".
2. Puede seguir sacando; ve todas las miniaturas y puede borrar o repetir cualquiera.
3. Mientras saca la siguiente, las anteriores ya se están enviando: "listo" no espera.
4. Si el contexto esperaba, por ejemplo, frente y dorso y falta una, la captura avisa
   cuál falta antes de dejar cerrar. Siempre se puede agregar más de lo esperado.
5. Al cerrar el lote, el celular muestra lo que se leyó ("Juan Pérez, DNI 12.345.678,
   nac. 01/02/1980 — ¿está bien?") con las opciones de confirmar o repetir.

## Resultado esperado

Frente y dorso de la misma persona dan una sola persona. Documentos de personas
distintas dan una por cada una. Hasta que el usuario confirma, nada queda cargado
como dato definitivo.

## Casos borde

- Se corta la conexión a mitad del lote: las fotos ya sacadas no se pierden y se
  pueden reenviar.
- Se agota el tiempo del código antes de terminar: se avisa claramente en el
  celular y las fotos ya enviadas no se descartan en silencio.
