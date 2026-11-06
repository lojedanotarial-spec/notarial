# UC-2: Archivos del expediente

**Feature:** [Drive de la escribanía](../features/drive-escribania.md)

## Actor

Cualquier usuario de un registro con Drive conectado, entre con email o con Google.

## Disparador

Está en un expediente y quiere guardar, mirar o bajar documentación.

## Flujo esperado

1. En la pestaña de archivos del expediente, sube uno o varios archivos desde su compu y elige el
   tipo (DNI, tarjeta verde, poder, formulario 08, otro). No se le pide iniciar sesión con Google.
2. Los archivos quedan en la carpeta de ese expediente dentro del Drive de la escribanía y
   aparecen en la lista con quién los subió y cuándo.
3. Cualquier otro usuario del mismo registro ve esa lista, abre un archivo dentro de Notarial
   (vista previa) o lo descarga.
4. Si alguien borra un archivo, desaparece de la lista pero queda recuperable.

## Resultado esperado

Todo el registro ve la misma documentación de cada expediente. Un usuario de otro registro nunca
la ve, ni sabiendo la dirección de un archivo.

## Estado actual

La pestaña existe, pero exige iniciar sesión con Google, usa el Drive personal de quien sube, y la
autorización vence a la hora. Detalle en `specs/drive-escribania/spec.md`.
