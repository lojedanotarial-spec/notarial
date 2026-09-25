# Epic: Reconstrucción de Carga Masiva

**Estado:** en curso — urgente, ventana de ~2 semanas (escrituras de barrios próximas)
**Prioridad:** máxima — interrumpe el orden normal del backlog

## Por qué existe

"Carga masiva" (`BulkScreen.jsx` + satélites) se construyó en abril/26 como
una vertical aparte para un caso puntual — escrituras de lotes dentro de
barrios/loteos — y quedó **desconectada del resto del sistema** en vez de
reusarlo:

- Tiene su propio motor de variables (`generarEscritura.js`), duplicado y
  hardcodeado, en paralelo al motor genérico que ya usa toda la app
  (`templateVars.js`/`buildVars()`/`{{VARIABLE}}`).
- El modelo de cada barrio se carga pegando HTML crudo en un `prompt()` del
  navegador (`ModeloScreen.jsx`) — no pasa por el pipeline de DOCX del
  resto de la app.
- Los lotes se cargan **de a uno**, a mano, con un formulario modal de
  campos fijos (`ModalLote`) — no existe ninguna forma de cargar varios
  lotes de una sola vez, pese al nombre "carga masiva".
- Nunca pasó un smoke test real: tenía un crash bloqueante en el flujo más
  básico ("Crear barrio nuevo" llamaba a una función inexistente) que
  estuvo ahí 5 meses sin que nadie lo notara — ver `fix/bulk-nuevo-barrio-crash`.

Lo que sí está sólido y se reusa tal cual: la exportación a DOCX
(`exportarBarrioZip.js`, motor `docx`/`jszip`), el guardado de
barrios/lotes en Supabase, y — descubierto durante el diagnóstico — un
**helper de Google Drive ya funcionando** (`driveHelper.js`, patrón
carpeta raíz "Notarial" → subcarpeta por expediente → archivos, ya en
producción en `ExpedienteDetailScreen.jsx`).

## Visión (tal como la describió Lucas)

1. Analizar el modelo de escritura de cada barrio.
2. Poblar ese modelo con las variables necesarias.
3. Generar un formulario de carga a partir de esas variables (no un
   formulario fijo hardcodeado).
4. Guardar todas las escrituras bajo su barrio correspondiente.
5. Exportación/impresión masiva.
6. Guardar la información de cada expediente en Google Drive — puede haber
   varios tipos de documento por casa/lote/escritura, no solo la escritura.

## Decisiones ya tomadas (21/09/26)

- **Análisis de modelo = tarea de staff de Notarial (Lucas/Fátima), no del
  escribano cliente.** Mixto: detección asistida por IA + revisión e
  intervención manual, en cualquier orden. No es un flujo self-service.
- **Google Drive entra en las 2 semanas**, reusando `driveHelper.js` tal
  cual existe — no es una integración nueva de cero.
- El foco de las 2 semanas es que **las escrituras de los barrios urgentes
  salgan bien**, no una reescritura completa de cada pantalla.

## Features de este epic

| # | Feature | Depende de | Por qué en ese orden |
|---|---|---|---|
| 1 | Motor de variables unificado | — | ✅ Terminada (2026-09-25). Todo lo demás se apoya en esto. |
| 2 | Ver documento de un lote sobre el editor unificado (OnlyOffice + panel lateral) | 1 | Reemplaza la vista previa propia de `LoteDocScreen` por el mismo sistema que ya usa el resto de la app — necesario para poder corregir a mano una escritura puntual (una letra, un número, una circunstancia particular) sin tocar el modelo del barrio entero. El mecanismo difícil (generar DOCX, subir, abrir en OnlyOffice, no perder ediciones manuales al regenerar) ya existe y se reusa de `EditorScreen`, no se inventa de nuevo. |
| 3 | Formulario de carga dinámico por lote | 1 | El formulario se genera a partir de las variables que detecta el motor unificado |
| 4 | Import de lotes en tabla (la "masiva" real) | 1 | Cargar N lotes de una sin pasar por el modal de a uno |
| 5 | Curación de modelo por barrio (staff, IA + manual) | 1 | Alimenta a 1 y 3: sin variables detectadas, no hay formulario que generar |
| 6 | Exportación masiva sobre el motor unificado | 1 | `exportarBarrioZip.js` pasa a generar con el motor nuevo, no con `generarEscritura.js` |
| 7 | Expedientes de barrio en Drive + escanear documentación por lote | 2 | Alcance definido el 25/09/26 (ver abajo) — reusa `driveHelper.js` y el motor de escaneo (`ScanBtn`/`/api/vision`) ya probados en el resto de la app, sin inventar IA nueva. Depende de 2 porque el lugar natural para el botón "Escanear" es el panel del editor unificado de un lote. |

Sin spec/plan/tasks todavía para las Features 3-6 — quedan para cuando se
acuerde el orden real de trabajo dado el tiempo disponible. La Feature 7
ya tiene spec/plan/tasks — ver [`specs/escaneo-drive-carga-masiva/`](../specs/escaneo-drive-carga-masiva/).

### Alcance de la Feature 7 (definido 25/09/26)

Cada barrio es un expediente de Drive (mismo patrón que
`ExpedienteDetailScreen.jsx`), con subcarpetas por manzana y lote. El
modelo del barrio vive en la raíz del expediente; la documentación
escaneada y la escritura generada de cada lote viven en la subcarpeta de
ese lote. Desde el panel de un lote (editor unificado, Feature 2), un
botón "Escanear" abre un selector de los archivos ya guardados en la
carpeta Drive de ESE lote — el escribano elige cuál, y corre el mismo
motor de extracción que ya usa el resto de la app (`ScanBtn`/`/api/vision`)
para autocompletar los datos de la parte. No hay detección automática de
"qué archivo es de quién" — el escribano siempre elige a mano.

## Fuera de este epic

- Rediseño visual de las pantallas existentes (BulkScreen, ModeloScreen) —
  se tocan solo donde lo exige la reconstrucción funcional.
- Cualquier flujo de carga masiva que no sea para escrituras de lotes en
  barrios (otros tipos de documento masivo quedan para después).
