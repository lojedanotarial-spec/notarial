# UC-2: Borrar, recuperar y fin del expediente

**Feature:** [Almacenamiento propio](../features/almacenamiento-propio.md)

## Actor

Cualquier usuario del registro; el administrador para recuperar.

## Disparador

Se borró un archivo por error, o se va a borrar un expediente.

## Flujo esperado

1. Borrar un archivo lo saca de la lista. **No se elimina de inmediato**: queda recuperable durante 30
   días (igual que la papelera de Drive que reemplaza).
2. Pasados los 30 días, el archivo se elimina de verdad. Del historial de actividad queda constancia de
   quién lo borró y cuándo.
3. Al **borrar un expediente**, el sistema avisa cuántos archivos tiene y que se eliminarán. Los archivos
   siguen el mismo plazo de 30 días antes de desaparecer. Su historial de actividad se borra con el
   expediente, como ya está decidido.
4. Durante esos 30 días el administrador puede restaurar un archivo borrado.

## Resultado esperado

Un error al borrar se puede deshacer dentro del plazo. Nada queda guardado para siempre sin dueño.

## Casos borde

- Un archivo restaurado vuelve a su expediente y su persona, si el expediente sigue existiendo.
- Restaurar un archivo cuyo expediente ya se borró no es posible.
