# UC-2: La sesión se corta o el Drive no responde

**Feature:** [Subir documentación al expediente desde el celular](../features/subir-documentacion-celular.md)

## Actor

La persona que sube fotos desde el celular, y el usuario de la compu que generó el QR.

## Disparador

Mientras se suben fotos, algo falla: el QR venció, se cerró la sesión desde la compu, se perdió la
señal, o el Drive de la escribanía dejó de responder o se quedó sin espacio.

## Flujo esperado

1. **QR vencido o sesión cerrada desde la compu:** en el celular se ve "Esta sesión terminó.
   Generá un QR nuevo desde la compu". Lo que ya se subió **queda guardado**; lo que no, se indica
   cuántas fotos faltaron.
2. **Se perdió la conexión del celular:** se avisa "Sin conexión. Cuando vuelva, tocá reintentar".
   Las fotos que no se subieron siguen en la pantalla del celular, sin perderse, y se pueden
   reintentar.
3. **El Drive no está disponible o no tiene espacio:** el celular muestra el mismo mensaje que ve un
   usuario en la compu ("El Drive de la escribanía no está disponible. Avisale a quien administra
   Notarial"), sin errores técnicos. Las fotos pendientes siguen en el celular.
4. **Falla solo la identificación automática** (la IA no responde): los archivos igual quedan
   guardados, con su nombre original, y se pueden renombrar a mano desde la compu.
5. En todos los casos, nada se pierde en silencio: la pantalla siempre dice qué se guardó y qué no.

## Resultado esperado

Una falla nunca hace perder una foto sin avisar, ni deja archivos a medio subir en el expediente, y
el mensaje siempre dice qué hacer.

## Estado actual

No existe. La captura de datos del celular ya maneja el vencimiento del código y la falta de
conexión; este caso de uso pide lo mismo para los archivos que se guardan.
