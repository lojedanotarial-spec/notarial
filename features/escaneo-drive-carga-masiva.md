# Feature: Expedientes de barrio en Drive + escanear documentación por lote

**Epic:** [Reconstrucción de Carga Masiva](../epics/carga-masiva-rebuild.md)
**Estado:** 🔵 En curso
**Spec:** [`specs/escaneo-drive-carga-masiva/`](../specs/escaneo-drive-carga-masiva/)

## Qué entrega

Que cada barrio tenga su propio expediente de Google Drive (mismo
patrón que los expedientes generales), organizado por manzana y lote —
y que desde el panel de un lote se pueda escanear un documento ya
guardado en esa carpeta puntual para autocompletar los datos de un
adquirente, reusando el motor de extracción que ya usa el resto de la
app.

## Por qué importa ahora

Cargar los datos de cada adquirente a mano, lote por lote, es lento —
y la documentación de cada lote (DNI, tarjeta verde, poderes) hoy no
tiene ningún lugar organizado donde vivir dentro de Carga Masiva. Con
la carpeta correcta y el escaneo conectado, cargar un lote pasa a ser
"elegí el archivo" en vez de tipear todo a mano.

## Casos de uso

| Caso de uso | Resumen |
|---|---|
| [UC-1: Guardar documentación en Drive](../usecases/lote-guardar-documentacion-drive.md) | La estructura de carpetas — barrio → manzana → lote |
| [UC-2: Escanear desde Drive](../usecases/lote-escanear-desde-drive.md) | La parte "mágica" — autocompletar una parte desde un archivo ya guardado |
| [UC-3: La escritura queda en Drive](../usecases/lote-escritura-en-drive.md) | Conveniencia — ver todo el expediente del lote sin entrar a la app |

Estos casos de uso son la fuente de los criterios de aceptación en
`spec.md` — cualquier cambio de alcance se discute primero acá.
