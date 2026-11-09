# UC-4: Identificación y nombre automáticos

**Feature:** [Subir documentación al expediente desde el celular](../features/subir-documentacion-celular.md)

## Actor

El sistema (automático), y cualquier usuario del registro que quiera corregir un nombre o un tipo.

## Disparador

Se acaba de guardar un archivo en el expediente (desde el celular, o desde la compu).

## Flujo esperado

1. El archivo se guarda primero, tal cual, y aparece en la lista del expediente como
   "Identificando…". La subida nunca espera a la identificación.
2. El sistema mira una copia del archivo y determina de qué documento es: DNI, tarjeta verde,
   poder, formulario 08, u otro tipo de documento.
3. Le pone un **nombre descriptivo**: el tipo, la persona (apellido) cuando el documento la tiene, y
   **anverso o reverso**, o el **número de página**, si corresponde. Ejemplos:
   `DNI García - anverso.jpg`, `DNI García - reverso.jpg`, `Poder - pág 2.jpg`,
   `Tarjeta verde - anverso.jpg`.
4. En la lista, el archivo pasa de "Identificando…" a su nombre y su tipo, sin recargar la página.
5. Si el nombre o el tipo no son los correctos, cualquier usuario del registro los corrige desde la
   compu (renombrar y cambiar el tipo). Queda registrado quién y cuándo.

## Resultado esperado

Un expediente con la documentación ordenada y con nombres que dicen qué es cada cosa, sin que nadie
haya tenido que clasificar nada. El archivo original es exactamente el que se subió: solo cambió su
nombre y su tipo.

## Casos borde

- **No se puede identificar** (foto borrosa, no es un documento, algo que no está en la lista): el
  archivo conserva su nombre original, queda como tipo "otro" y con la marca "Sin identificar". Nunca
  se inventa un nombre.
- **Documento de un tipo que no está en la lista** (por ejemplo una partida de nacimiento): queda
  como tipo "otro", pero el nombre puede describirlo igual (`Partida de nacimiento - anverso.jpg`).
- **Falla la identificación** (IA no disponible): los archivos igual quedan guardados con su nombre
  original y se pueden renombrar a mano.
- **Dos documentos de dos personas** (comprador y vendedor): el apellido en el nombre los distingue.
- **Privacidad:** de lo leído solo se guarda el nombre y el tipo; ningún dato del documento
  (números, domicilios, fechas) se guarda en ningún lado.

## Estado actual

No existe. Hoy el tipo se elige a mano de una lista de cinco antes de subir, y el archivo se guarda
con el nombre que ya traía (en el celular suelen ser nombres como `IMG_4821.jpg`).
