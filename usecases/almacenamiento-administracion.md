# UC-4: Retirar Drive y ver el uso por registro

**Feature:** [Almacenamiento propio](../features/almacenamiento-propio.md)

## Actor

Administrador (Lucas).

## Disparador

Se pasa a almacenamiento propio y hay que cerrar lo de Google. Más adelante, saber cuánto usa cada
escribanía.

## Flujo esperado

1. Se **desconectan** las dos conexiones de Drive de prueba (registros 853 y 9876). Notarial revoca el
   permiso en Google y borra el token guardado.
2. El panel "Drive de escribanías" y los enlaces de conexión desaparecen de la aplicación.
3. El botón "Entrar con Google" queda **solo para identificarse**: ya no pide acceso a Drive.
4. El administrador abre un panel donde ve, por registro, **cuántos archivos y cuántos GB** ocupa, para
   saber cuándo y cuánto cobrar.

## Resultado esperado

Notarial no depende de ninguna autorización de Google para guardar archivos. El cliente de Google
"Notarial Drive escribanias" puede eliminarse de Google Cloud, y con él el secreto que se pegó en el
chat.

## Casos borde

- Los archivos de prueba que estaban en esos Drive: no se llevan al almacenamiento propio (decisión
  abierta, ver spec).
