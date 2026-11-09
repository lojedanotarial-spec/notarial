# UC-3: Deshacer una foto subida por error

**Feature:** [Subir documentación al expediente desde el celular](../features/subir-documentacion-celular.md)

## Actor

La persona que sube fotos desde el celular.

## Disparador

Se dio cuenta de que una foto salió movida, cortada o es del documento equivocado, y ya se subió.

## Flujo esperado

1. En el celular, la página muestra lo subido en esta sesión, con una miniatura de cada foto.
2. Toca la foto mala y elige **Quitar**. Se le pide confirmar.
3. La foto desaparece de la lista del celular y del expediente en la compu. Queda en la papelera del
   Drive de la escribanía, donde se puede recuperar.
4. Saca la foto de nuevo.

## Resultado esperado

Solo se puede quitar desde el celular **lo que se subió en esa misma sesión**. Los archivos que ya
estaban en el expediente (o que subió otra persona) no se pueden ver ni borrar desde el celular: eso
se hace desde la compu, con sesión iniciada.

## Estado actual

No existe. Desde la compu, cualquier usuario del registro ya puede borrar un archivo (va a la
papelera de Drive y queda registrado quién fue).
