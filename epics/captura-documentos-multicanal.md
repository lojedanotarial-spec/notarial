# Epic: Captura de documentos por varios canales

**Estado:** en curso

## Por qué existe

Hoy, para que Notarial lea un DNI, una licencia o una tarjeta verde, el documento
tiene que estar como archivo en la compu: alguien lo fotografía con el celular, se
lo pasa a la compu de alguna manera y recién ahí lo sube. Ese camino es lo que
separa "tengo el documento en la mano" de "los datos están cargados".

El objetivo es acortarlo: sacar la foto con el celular y que los datos lleguen
solos, por el canal que resulte más cómodo en cada momento. Los canales son
intercambiables; lo que importa es que todos terminen en la misma lectura y en
el mismo lugar.

## Features de este epic

| Feature | Estado |
|---|---|
| [Captura desde el celular (cámara web con código QR)](../features/captura-celular.md) | 🔵 En curso — spec en revisión |
| Canal WhatsApp | ⚪ Bloqueada — registro del número en Meta (error `1675030`, ver `PROYECTO.md`) |
| Canal mail (cubre también el escáner físico si escanea a mail) | 🟡 Después — sin feature.md todavía |
| Ícono "Notarial Cámara" en el celular, sin contexto previo | 🟡 Después — sin feature.md todavía |

## Fuera de este epic

- La calidad de la lectura en sí (qué modelo lee, el prompt de extracción). Eso se
  mide aparte: ver "Modelos de IA" en `BACKLOG.md`.
- Documentos de varias páginas (escrituras antecedentes, títulos): necesitan otra
  lectura, no la de documentos de identidad.
