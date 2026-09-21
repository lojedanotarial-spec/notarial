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
| 1 | Motor de variables unificado | — | Todo lo demás se apoya en esto; sin esto, cada feature nueva duplicaría más lógica |
| 2 | Formulario de carga dinámico por lote | 1 | El formulario se genera a partir de las variables que detecta el motor unificado |
| 3 | Import de lotes en tabla (la "masiva" real) | 1 | Cargar N lotes de una sin pasar por el modal de a uno |
| 4 | Curación de modelo por barrio (staff, IA + manual) | 1 | Alimenta a 1 y 2: sin variables detectadas, no hay formulario que generar |
| 5 | Exportación masiva sobre el motor unificado | 1 | `exportarBarrioZip.js` pasa a generar con el motor nuevo, no con `generarEscritura.js` |
| 6 | Guardado de expedientes de barrio/lote en Drive | — (reusa `driveHelper.js`) | Independiente de 1-5, puede ir en paralelo |

Sin spec/plan/tasks todavía — quedan para cuando se acuerde el orden real
de trabajo dado el tiempo disponible.

## Fuera de este epic

- Rediseño visual de las pantallas existentes (BulkScreen, ModeloScreen) —
  se tocan solo donde lo exige la reconstrucción funcional.
- Cualquier flujo de carga masiva que no sea para escrituras de lotes en
  barrios (otros tipos de documento masivo quedan para después).
