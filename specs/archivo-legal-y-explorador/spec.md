# Spec: Explorador y clasificación por Protocolo

Aprobado por Lucas el 20/11/2026, junto con la maqueta (https://claude.ai/artifact/2QzJfGt6e6BzCAs1HjUuXG) y el [plan](plan.md). El diseño completo y sus decisiones están en [diseno-ux.md](diseno-ux.md).

## Problema

La escribanía tiene que encontrar cualquier documento o expediente de los últimos diez años: por persona (apellido, nombre, DNI o CUIT), por año, por acto, por estado y por **Protocolo**, es decir, si el documento quedó en el protocolo o se entregó en original.

## Cómo es hoy (verificado el 20/11/26)

- Inicio muestra solo los últimos 200 documentos y no avisa que corta.
- La búsqueda por persona es solo por DNI y abre el contenido de cada documento.
- La pantalla Expedientes filtra solo por estado y por nombre.
- Ningún documento guarda si es protocolar o extraprotocolar.

## Términos

- **Acto:** qué se hace (compraventa, poder, certificación de firma…).
- **Protocolo:** Protocolar · Extraprotocolar · Sin definir. Nunca «no protocolar» ni «forma».

## Criterios de aceptación

1. Cada documento tiene un valor de **Protocolo**. Sale de la plantilla cuando la ley lo define, y se puede elegir a mano en el modal «Protocolo» del editor.
2. Si la plantilla admite las dos formas y nadie eligió, el documento queda **Sin definir** y eso se ve en el Explorador.
3. Cuando cambia el valor por defecto de un acto (por ejemplo, al cargar las respuestas de Fátima), todos los documentos de ese acto que no se eligieron a mano se reclasifican solos.
4. Guardar un documento nunca falla por culpa de la clasificación o del índice.
5. El Explorador filtra por Protocolo, Acto, Año, Estado y Persona, y muestra los filtros aplicados como etiquetas que se quitan con un clic.
6. El buscador acepta nombre, apellido, DNI, CUIT o acto, y dice cómo interpretó lo escrito.
7. Siempre dice «Mostrando N de TOTAL». El total y los contadores salen del servidor, no de lo cargado.
8. Cada escribanía ve solo lo suyo.
9. Con 10.000 documentos, una búsqueda responde en menos de 300 ms.

## Fuera de alcance

- El cierre de expediente con PDF y Drive (D31).
- La ficha de persona y «Nuevo acto con…» (D29 y D30).
- Mover plantillas de familia: espera el OK de Fátima.
- Una clasificación distinta para cada escribanía.
