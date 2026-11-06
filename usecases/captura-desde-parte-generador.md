# UC-1: Captura desde una parte del generador manual

**Feature:** [Captura de documentos desde el celular](../features/captura-celular.md)

## Actor

Escribano o colaborador del registro, con sesión iniciada en la compu, armando un
documento con el generador manual.

## Disparador

Está cargando una parte (por ejemplo el comprador) y tiene el DNI físico en la mano.

## Flujo esperado

1. Toca el botón de cámara junto a esa parte.
2. En la pantalla aparece un código QR, sin preguntarle qué tipo de documento es ni
   de quién: la pantalla ya lo sabe.
3. Escanea el QR con el celular; se abre la captura con la instrucción
   "Sacá frente y dorso del DNI del COMPRADOR".
4. Saca las fotos, confirma lo leído (ver UC-3).
5. En la compu, los datos aparecen en esa parte sin que toque nada.

## Resultado esperado

La parte queda completada con lo leído. Si ya tenía campos cargados a mano, no se
pisan sin que el usuario lo confirme.

## Estado actual

Existe un botón de escaneo por parte, pero solo acepta archivos que ya estén en la
compu. Cada archivo se lee por separado y los resultados se fusionan después.
