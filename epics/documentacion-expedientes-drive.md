# Epic: Documentación de expedientes en el Drive de la escribanía

**Estado:** en curso

## Por qué existe

La documentación que trae la gente (DNI, tarjetas verdes, poderes, formularios) tiene que quedar
ordenada y a mano de todo el registro, asociada al expediente que corresponde. Hoy el sistema
guarda esos archivos en Google Drive, pero en el Drive **personal de quien los sube** y usando la
sesión de Google de esa persona. Eso tiene tres costos: solo puede hacerlo quien entra con Google
(la mayoría entra con email), la autorización de Google vence a la hora, y los archivos quedan
en el Drive de una persona aunque el expediente sea de todo el registro.

La decisión (06/11/26): cada registro tiene **un único Drive, el de la escribanía**, conectado una
sola vez. La identidad de cada persona sigue siendo su Gmail personal en Notarial; el acceso a la
documentación depende de pertenecer al registro, no de tener Google conectado.

## Features de este epic

| Feature | Estado |
|---|---|
| [Drive de la escribanía: conexión y archivos del expediente](../features/drive-escribania.md) | 🔵 En curso — spec en revisión |
| Subir documentación al expediente desde el celular (cámara de máxima calidad, por tipo de documento) | 🟢 Próximo — depende de la anterior; sin feature.md todavía |
| Carga Masiva (barrios y lotes) usando el Drive de la escribanía | 🟡 Después |
| Extras: unir las fotos de un documento en un PDF, leer y nombrar automáticamente, Scriba ofrece "agregar documentación" | 🟡 Después |

## Fuera de este epic

- La captura de **datos** desde el celular (leer un DNI para completar una parte): ya existe, ver
  [Captura de documentos por varios canales](captura-documentos-multicanal.md). Esta es otra cosa:
  archivar la foto tal cual, en calidad original.
- Copias de seguridad del contenido de Drive (queda anotado como riesgo).
