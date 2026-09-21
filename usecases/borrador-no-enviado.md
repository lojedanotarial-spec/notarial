# UC-4: Cierre del panel con un mensaje escrito (o adjunto cargado) pero sin enviar

**Feature:** [Persistencia del chat al cerrar/reabrir el panel](../features/persistencia-chat-scriba.md)
**Estado:** en alcance — confirmado 21/09/26

## Actor

Escribano o admin escribiendo un mensaje o adjuntando un archivo en el
panel de Scriba.

## Disparador

El usuario tiene texto tipeado (o un archivo ya adjuntado) que todavía no
envió, y cierra el panel — a propósito o sin querer.

## Flujo esperado

1. Usuario escribe un mensaje o adjunta un archivo, sin enviarlo.
2. Usuario cierra el panel.
3. Usuario reabre el panel más tarde.
4. El texto/adjunto sigue ahí, tal cual lo había dejado.

## Resultado esperado

Tanto el texto sin enviar como los archivos adjuntados sin enviar
sobreviven a cerrar y reabrir el panel. El "cómo" (dónde vive ese borrador
mientras el panel está desmontado) se decide en `plan.md`, no acá.

## Estado actual

Se pierde siempre, sin excepción — vive solo en estado de React que se
destruye al desmontar el panel.
