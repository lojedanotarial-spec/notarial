# UC-2: Captura iniciada desde Scriba

**Feature:** [Captura de documentos desde el celular](../features/captura-celular.md)

## Actor

Escribano o colaborador del registro, conversando con Scriba.

## Disparador

Dice algo como "quiero subir los documentos de los compradores" o "te paso el DNI".

## Flujo esperado

1. Scriba pregunta solo lo que falta para tener contexto: de quién son los
   documentos, de qué tipo, cuántas fotos esperar. Si el usuario ya lo dijo
   ("el DNI del comprador"), no lo vuelve a preguntar.
2. Scriba muestra el código QR dentro de la conversación.
3. El usuario saca las fotos en el celular y confirma lo leído (UC-3).
4. El resultado vuelve a la conversación: Scriba dice qué leyó y propone qué hacer
   ("Leí a Juan Pérez, DNI 12.345.678. ¿Lo cargo como comprador?").

## Resultado esperado

La conversación sigue sola después de la captura; el usuario no tiene que volver a
pedirle nada a Scriba.

## Variante: lote mixto (modo libre)

El usuario dice "te paso todo junto". Scriba no pregunta nada antes y muestra el
código; en el celular no se exige ninguna cantidad ni tipo de fotos. Ejemplo:
dos DNI y la tarjeta de un auto.

1. Se lee y clasifica cada foto.
2. Scriba cuenta qué encontró ("2 DNI y 1 tarjeta verde") y pregunta lo que no
   puede deducir: quién es comprador y quién vendedor, a qué vehículo va cada foto.
3. Con las respuestas, arma la distribución completa y la muestra como un solo
   resumen con un único botón "Aplicar todo". Se puede corregir antes de aplicar.
4. Al confirmar, carga cada dato en su lugar en el documento abierto, y puede
   mover o reasignar si el usuario se lo pide después.

## Decisión de alcance

Si Scriba no tiene claro el contexto después de preguntar, ofrece igualmente el
código en modo libre en vez de bloquear al usuario. Cargar en el documento abierto
(borrador editable) es distinto de guardar en el directorio de personas: eso último
requiere confirmación del usuario.
