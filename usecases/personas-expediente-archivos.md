# UC-2: Asociar archivos a una persona

**Feature:** [Personas del expediente](../features/personas-expediente.md)

## Actor

Cualquier usuario del registro con acceso al expediente.

## Disparador

Se subieron archivos (desde la compu o por QR desde el celular) y hay que saber de quién es cada uno.

## Flujo esperado

1. En la pestaña **Archivos**, cada archivo muestra a qué persona pertenece, o "Sin asignar".
2. El usuario elige la persona desde el archivo ("Asignar a…") o, en la ficha de la persona, ve la lista
   de sus archivos y puede sumar más.
3. Cuando el nombre automático del archivo coincide con una persona de la lista (por ejemplo
   `DNI Pérez Raúl - anverso`), el sistema **propone** asignarlo; el usuario confirma con un toque.
   Nunca se asigna solo.
4. Un archivo pertenece a **una** persona o a ninguna. Se puede reasignar o dejar sin asignar.
5. Cambiar de dueño o renombrar un archivo no lo mueve ni lo duplica en el Drive.

## Resultado esperado

En la ficha de cada persona se ven sus archivos (DNI frente y dorso, poder, etc.) y se pueden abrir o
bajar igual que en la pestaña Archivos.

## Casos borde

- Archivo que corresponde a un matrimonio (un poder, una partida): en esta primera versión se deja sin
  asignar y se aclara en el comentario de la ficha.
- Si el archivo se borra, desaparece también de la ficha.
