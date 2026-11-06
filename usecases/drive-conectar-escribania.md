# UC-1: Conectar el Drive de una escribanía

**Feature:** [Drive de la escribanía](../features/drive-escribania.md)

## Actor

El administrador de Notarial (hoy, Lucas) y la persona que tiene acceso al Gmail de la escribanía
(por ejemplo la titular), que no necesita cuenta en Notarial.

## Disparador

Un registro todavía no tiene Drive conectado y quiere guardar documentación de expedientes.

## Flujo esperado

1. En el panel de administración, el administrador elige el registro y pide "Conectar Drive".
   Se genera un enlace de un solo uso que vence en poco tiempo.
2. El administrador le manda el enlace a la persona que tiene el Gmail de la escribanía.
3. Esa persona abre el enlace en su compu, ya con su Gmail abierto, y Google le pide autorizar a
   Notarial a guardar archivos en su Drive.
4. Al aceptar, ve un mensaje claro ("Listo, el Drive de la escribanía quedó conectado") y no tiene
   que hacer nada más.
5. En el panel de administración, el registro figura como conectado: cuenta de Google, fecha,
   quién generó el enlace y cuánto espacio queda.

## Resultado esperado

Desde ese momento, todos los usuarios del registro guardan y ven documentación en ese Drive.
Nadie más que el administrador puede conectar, cambiar o desconectar la cuenta, y la persona
del Gmail nunca comparte su contraseña.

## Casos borde

- El enlace vence o ya se usó: se explica y el administrador genera otro.
- Se intenta conectar una cuenta distinta a un registro que ya tiene una: el administrador debe
  desconectar primero, y se avisa qué pasa con lo ya guardado.
- La persona rechaza la autorización: no queda nada conectado y se le explica cómo reintentar.
