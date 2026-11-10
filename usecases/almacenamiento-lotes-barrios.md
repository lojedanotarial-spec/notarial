# UC-3: Barrios y lotes

**Feature:** [Almacenamiento propio](../features/almacenamiento-propio.md)

## Actor

Usuario de un registro que trabaja con Carga Masiva (barrios y lotes).

## Disparador

Crea la estructura de carpetas de un barrio, sube documentación de un lote, escanea un documento del lote
o guarda la escritura generada.

## Flujo esperado

1. Crear la estructura de un barrio (carpetas por manzana y lote), subir documentación a un lote y
   guardar la escritura generada funcionan **entrando con email o con Google**, sin iniciar sesión con
   Google ni autorizar nada.
2. La escritura generada de un lote queda guardada junto a su documentación, y se ve desde el lote.
3. "Escanear desde Drive" pasa a llamarse **Escanear un archivo del lote** y lee un archivo ya guardado
   en ese lote.
4. Todo lo del lote lo ve el mismo registro; ningún otro.

## Resultado esperado

El generador de barrios deja de fallar por "falta de login". No hay una carpeta creada en el Drive
personal de cada usuario.

## Casos borde

- Barrio con carpetas ya creadas en el mecanismo viejo: hoy hay una sola, de prueba; se vuelve a crear.
