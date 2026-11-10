# UC-3: Sugerir las personas al elegir cada parte

**Feature:** [Personas del expediente](../features/personas-expediente.md)

## Actor

Usuario que arma un documento dentro de un expediente.

## Disparador

Desde el expediente toca **+ Nuevo documento** y, en el editor de partes, tiene que cargar a quienes
comparecen (parte 1, parte 2, parte 3…).

## Flujo esperado

1. Al elegir una parte, el editor muestra **primero las personas de ese expediente** como sugerencias,
   y debajo la búsqueda general de la libreta que ya existe.
2. El usuario toca una persona.
3. La parte se completa al instante con los datos de la ficha (nombre, documento, domicilio, estado
   civil con la concordancia de género que ya usa el editor). No se vuelve a leer ningún archivo.
4. Junto a la parte se muestra el comentario de la ficha y cuándo se actualizó, como recordatorio ("casada
   con Pérez Juan…", "actualizada hace 3 meses").
5. Si la parte ya tenía datos escritos, se avisa antes de reemplazarlos.
6. El rol (comprador, vendedor, etc.) se elige en el documento; la ficha no lo define.

## Resultado esperado

No hay que volver a subir ni a escanear el DNI: se parte de lo que ya se cargó en el expediente.

## Casos borde

- El expediente no tiene personas: el editor funciona como hoy.
- Una persona no puede ser dos partes del mismo documento (se avisa).
- El documento guarda su propia copia de los datos: si la ficha cambia después, el documento ya armado
  no se modifica.
