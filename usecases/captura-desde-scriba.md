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

## Decisión de alcance

Si Scriba no tiene claro el contexto después de preguntar, ofrece igualmente el
código con el contexto más general posible (documento de identidad sin rol asignado)
en vez de bloquear al usuario.
