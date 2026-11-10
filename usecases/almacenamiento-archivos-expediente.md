# UC-1: Archivos del expediente sin Google

**Feature:** [Almacenamiento propio](../features/almacenamiento-propio.md)

## Actor

Cualquier usuario de un registro, entre con email o con Google.

## Disparador

Está en un expediente y quiere guardar, mirar o bajar documentación, desde la compu o desde el celular.

## Flujo esperado

1. En la pestaña **Archivos** del expediente el usuario sube archivos desde la compu, o muestra el QR y
   sube fotos desde el celular, igual que hoy. **Nunca se le pide iniciar sesión con Google ni autorizar
   nada.**
2. Los archivos aparecen en la lista con quién los subió y cuándo, y el sistema los identifica y nombra
   igual que hoy (por ejemplo `DNI García Juan - anverso.jpg`).
3. Cualquier usuario del mismo registro abre un archivo dentro de Notarial o lo baja. Un usuario de otro
   registro nunca lo ve, ni sabiendo la dirección.
4. Un botón **Descargar todo** baja todo el expediente en un solo archivo comprimido, con los nombres
   actuales.
5. La pestaña ya no habla de "Drive": dice "Archivos del expediente".

## Resultado esperado

Subir y ver archivos funciona siempre, sin depender de ninguna cuenta externa ni de ningún permiso.

## Casos borde

- Archivo de más de 25 MB: se rechaza con el mismo aviso de siempre.
- Se corta la conexión a mitad de una subida: se puede reintentar sin repetir los demás.
- Si el almacenamiento no responde, el mensaje es en castellano y dice que se intente de nuevo.
