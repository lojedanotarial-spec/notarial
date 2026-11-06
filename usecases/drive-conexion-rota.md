# UC-3: Conexión rota o espacio lleno

**Feature:** [Drive de la escribanía](../features/drive-escribania.md)

## Actor

Los usuarios del registro y el administrador.

## Disparador

Google rechaza la conexión (la titular revocó el permiso, cambió la contraseña, cerró la cuenta) o
el espacio de la cuenta se está agotando o se agotó.

## Flujo esperado

1. Un usuario intenta subir o ver un archivo y falla. Ve un mensaje claro: "El Drive de la
   escribanía no está disponible. Avisale a quien administra Notarial." No ve errores técnicos ni
   pedidos de iniciar sesión con Google.
2. Lo que no se pudo subir no se pierde en silencio: se avisa qué quedó sin guardar.
3. El administrador ve en su panel que ese registro tiene la conexión caída, desde cuándo y por
   qué (revocada, sin espacio), y puede reconectar generando un enlace nuevo.
4. Con el espacio al 80 %, el administrador ve una advertencia antes de que se llene.

## Resultado esperado

Una falla del Drive nunca se confunde con una falla de Notarial, nunca se pierden archivos sin
avisar, y el administrador se entera antes que los usuarios cuando es posible.
