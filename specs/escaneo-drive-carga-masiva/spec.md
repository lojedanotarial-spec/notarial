# Spec: Expedientes de barrio en Drive + escanear documentación por lote

**Estado:** 🟡 en revisión — pendiente de aprobación
**Feature:** [`features/escaneo-drive-carga-masiva.md`](../../features/escaneo-drive-carga-masiva.md)
**Epic:** [`epics/carga-masiva-rebuild.md`](../../epics/carga-masiva-rebuild.md)
**Casos de uso:** [UC-1](../../usecases/lote-guardar-documentacion-drive.md) · [UC-2](../../usecases/lote-escanear-desde-drive.md) · [UC-3](../../usecases/lote-escritura-en-drive.md)
**Origen:** pedido 25/09/26

## Problema

Cargar los datos de cada adquirente de cada lote de un barrio, a mano,
uno por uno, es el cuello de botella real de Carga Masiva. Al mismo
tiempo, la documentación de respaldo de cada lote (DNI, tarjeta verde,
poderes) no tiene hoy ningún lugar organizado donde guardarse dentro
del sistema — si existe, vive dispersa fuera de la app. El resto de la
aplicación ya resuelve un problema equivalente para expedientes
generales (organizar documentación en Google Drive, y extraer datos de
un documento escaneado para autocompletar un formulario), pero Carga
Masiva no está conectada a ninguna de las dos cosas.

## Comportamiento actual (verificado en código, no supuesto)

- Existe un mecanismo de expedientes en Drive con esta estructura:
  carpeta raíz fija → una subcarpeta por expediente → archivos sueltos
  dentro. No tiene niveles adicionales de jerarquía (no hay concepto de
  "subcarpeta dentro de un expediente").
- Existe un mecanismo para listar los archivos que ya están guardados
  en una carpeta puntual de Drive.
- Existe un botón de "Escanear" que abre el selector de archivos **del
  dispositivo** (no de Drive), sube la imagen elegida a un servicio de
  extracción, y devuelve los datos de la persona (nombre, documento,
  fecha de nacimiento, domicilio, etc.) ya identificados — usado hoy
  para autocompletar los datos de una parte en otros documentos de la
  app.
- Carga Masiva (barrios y lotes) no tiene ninguna integración con Drive
  hoy — ni para guardar documentación ni para generar expedientes.
- La escritura generada de un lote se guarda únicamente en la base de
  datos de la aplicación; no existe ninguna copia en Drive.

## Comportamiento deseado (criterios de aceptación)

- [ ] Cada barrio tiene un expediente de Drive propio, identificado por
      el nombre del barrio. *(UC-1)*
- [ ] Dentro del expediente de un barrio, cada lote tiene su propia
      subcarpeta, organizada por manzana. *(UC-1)*
- [ ] Subir un archivo a un lote lo guarda en la subcarpeta
      correspondiente — creando el expediente del barrio y/o la
      subcarpeta del lote si todavía no existen. *(UC-1)*
- [ ] Desde el lote, un escribano puede iniciar un escaneo eligiendo un
      archivo entre los que **ya están guardados en la carpeta de Drive
      de ese lote puntual** — no del disco de su computadora, y no de
      la carpeta de otro lote. *(UC-2)*
- [ ] El resultado del escaneo autocompleta los datos de la parte que
      se está cargando, con el mismo criterio y calidad que el escaneo
      ya existente en el resto de la aplicación. *(UC-2)*
- [ ] El sistema no intenta adivinar solo a qué persona corresponde
      cada archivo — el escribano elige siempre cuál escanear. *(UC-2)*
- [ ] La escritura generada de un lote deja una copia en la subcarpeta
      de Drive de ese lote, además de seguir viviendo en la base de
      datos de la aplicación (que sigue siendo la fuente de verdad para
      abrir/editar el documento). *(UC-3)*

## Fuera de alcance (a propósito)

- Detectar automáticamente a qué adquirente corresponde un archivo
  subido — el escribano siempre elige a mano cuál escanear (ver UC-2).
- Cualquier lógica nueva de extracción/IA — se reusa el motor de
  escaneo que ya existe tal cual, sin modificarlo.
- Migrar o reorganizar expedientes de Drive ya creados para otros usos
  (expedientes generales, no de barrio) — esta feature es solo para
  Carga Masiva.
- El modelo del barrio (la plantilla) no se gestiona desde Drive en
  esta feature — sigue cargándose como hoy.

## Preguntas abiertas (a resolver antes de pasar a `plan.md`)

Ninguna — el comportamiento actual está verificado en código y los
criterios de aceptación surgen directamente de los tres casos de uso.
