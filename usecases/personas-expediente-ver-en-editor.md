# UC-4: Ver los archivos del expediente mientras se edita

**Feature:** [Personas del expediente](../features/personas-expediente.md)

## Actor

Usuario que redacta un documento vinculado a un expediente.

## Disparador

Necesita mirar el DNI, un poder o una partida sin salir del documento que está armando.

## Flujo esperado

1. Dentro del editor, un botón **Archivos del expediente** abre un panel con la lista, agrupada por
   persona (y "Sin asignar" al final).
2. Tocar un archivo lo abre para verlo; también se puede bajar.
3. El panel se cierra sin tocar nada del documento. No modifica ni vincula nada por sí solo.

## Resultado esperado

Se puede consultar la documentación sin cambiar de pantalla ni perder el lugar en el documento.

## Casos borde

- Documento que no está vinculado a un expediente: el botón no aparece.
- Expediente sin Drive conectado o con la conexión caída: el panel explica por qué no se puede, con el
  mismo mensaje que la pestaña Archivos.
