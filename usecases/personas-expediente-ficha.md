# UC-1: Completar el perfil de una persona

**Feature:** [Personas del expediente](../features/personas-expediente.md)

## Actor

Cualquier usuario del registro con acceso al expediente.

## Disparador

Llega una persona (o su documentación, por ejemplo fotos sacadas con el celular) y hay que dejar
registrado quién es, su estado civil y lo que haga falta saber.

## Flujo esperado

1. En el expediente, la pestaña **Personas** muestra a quienes intervienen (vacía al principio).
2. El usuario toca **Agregar persona**: busca a una que ya exista en el registro (por DNI o apellido) o
   crea una nueva. Si ya existe una con ese DNI, el sistema avisa y ofrece usar la existente.
3. Se abre el modal **Completar perfil**, con los datos de la persona, estado civil y un comentario libre
   (por ejemplo: "casada con Pérez Juan, en primeras nupcias" o "viene con poder de su hermano").
4. Si la persona tiene fotos de su DNI, el modal ofrece **Leer del DNI**: el sistema lee las fotos y
   precarga los datos. El usuario los revisa, completa lo que falta (el estado civil no está en el DNI) y
   toca **Guardar**. Hasta ese toque no se guarda nada.
5. Si después de subir fotos el sistema reconoció a alguien que todavía no está en el expediente, lo
   **propone** ("Detecté a Raúl Pérez en 2 archivos. ¿Agregarlo?"). Con un toque se agrega, se le asocian
   esos archivos y se abre el modal. Nunca se hace solo.
6. La ficha queda con la fecha de su última actualización. Se puede editar cuando haga falta.

## Resultado esperado

La persona queda guardada una sola vez en el registro, lista para reutilizar en este y en futuros
expedientes. Todos los usuarios del registro la ven; los de otros registros, nunca.

## Casos borde

- La lectura falla o la foto es ilegible: se explica en castellano y se puede completar a mano.
- Dos personas con el mismo nombre y distinto DNI: son dos fichas; el comentario ayuda a distinguirlas.
- Persona sin archivos: es válida (solo ficha).
- Quitar a la persona del expediente no borra su ficha ni sus archivos; borrar la ficha pide confirmación.
