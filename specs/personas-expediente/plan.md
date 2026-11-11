# Plan: Personas del expediente

**Estado:** 📝 borrador (11/11/26, fase 2 de 3), esperando aprobación de Lucas. Siguiente: [`tasks.md`](tasks.md). NO escribir código hasta que `tasks.md` esté aprobado
**Spec:** [`spec.md`](spec.md) ✅ (aprobada 11/11/26, con las decisiones de Lucas)
**Depende de:** [`specs/almacenamiento-propio/`](../almacenamiento-propio/spec.md) (archivos en R2, ya en producción)

## Decisiones que necesitan tu atención

| # | Decisión | Mi elección | Alternativa y por qué no |
|---|---|---|---|
| 1 | Quién escribe las fichas | El **servidor** (acciones nuevas en `api/drive.js`, lógica en un módulo aparte). Así el aviso de duplicado y el historial siempre ocurren | Desde el navegador, como la libreta de hoy: más simple, pero el historial y el aviso dependen de que cada pantalla se acuerde de hacerlos |
| 2 | Cómo se une persona y expediente | Tabla chica `expediente_personas` (una fila por persona en cada expediente) | Un campo en cada archivo: no sirve para una persona sin archivos |
| 3 | De quién es cada archivo | Columna `persona_id` en `expediente_archivos` (una persona o ninguna). Al borrar la ficha, los archivos quedan "Sin asignar" | Tabla intermedia: permitiría un archivo para varias personas, pero la spec lo deja fuera |
| 4 | "Leer del DNI" | En el **navegador**, con el mismo lector que ya usa el editor (se mueve a un módulo compartido), sobre los archivos de esa persona. Solo al tocar el botón. Nada se guarda hasta **Guardar** | Que el servidor lea en segundo plano y guarde: rompe el criterio "nunca en segundo plano" |
| 5 | Cómo se proponen las personas detectadas | Hoy el nombre leído solo queda dentro del nombre del archivo ("DNI Pérez Juan anverso"); compararlo así es frágil. Se guardan **apellido y nombre** en 2 columnas nuevas, solo cuando la lectura estaba segura (ya es la regla) | Parsear el nombre del archivo: se rompe con cualquier renombre manual |
| 6 | Cómo se vincula un documento con su expediente | Se **arregla y se completa el vínculo**: (a) creado desde el expediente, queda vinculado en el primer guardado (hoy la pantalla de selección descarta el expediente y no se vincula nada); (b) creado desde otro lado, un campo opcional **Expediente** en la selección; (c) dentro del editor, un indicador del expediente con **Cambiar / Quitar**, sin salir del documento. Se sigue usando la tabla que ya existe (`expediente_documentos`) | Vincular solo al volver al expediente (como hoy): se pierde si nadie vuelve, y mientras se edita el editor no sabe dónde buscar |
| 6b | Dónde se ven las personas en el editor | Una **franja arriba de las partes** con las personas del expediente, siempre a la vista; tocar una la usa en la parte abierta (o crea la próxima). Además aparecen en la búsqueda de cada parte | Solo dentro de la búsqueda de cada parte: obliga a abrir cada parte para descubrirlas |
| 7 | Estado civil | La **misma lista del editor** (con concordancia de género: soltero/a, casado/a…) para que lo elegido llegue igual al documento. Notas en una columna nueva | Una lista nueva: dos listas que mantener y que pueden diferir |
| 8 | Duplicados | Por DNI ya lo impide la base (índice único por registro + DNI). El servidor lo detecta **antes** y devuelve la ficha existente: "Ya existe… ¿Actualizarla con estos datos?". Sin DNI, avisa si hay otra con el mismo apellido y nombre | Dejar que la base falle: el usuario vería un error técnico |

**Un problema que ya existe y se corrige de paso:** al guardar un documento, `guardarPartesEnCRM` guarda un DNI vacío como `""`, y el índice único hace que una segunda persona sin DNI falle **en silencio** (no se guarda y nadie se entera). Se corrige guardando el vacío como "sin valor", que el índice permite repetir. No toca las 11 fichas existentes.

## Datos (solo aditivo; el SQL lo corrés vos en el SQL Editor, con reversión)

| Cambio | Detalle |
|---|---|
| `personas.notas` | texto libre (nuevo) |
| `expediente_personas` | `id`, `expediente_id` (borra en cascada), `persona_id` (borra en cascada), `agregada_por`, `created_at`; único por (expediente, persona); misma regla de acceso que `expediente_archivos` (solo el registro dueño) |
| `expediente_archivos.persona_id` | puede ser nulo; si se borra la ficha queda nulo |
| `expediente_archivos.ident_apellido`, `ident_nombre` | texto, solo con lectura segura |
| Historial | `drive_auditoria` ya admite cualquier acción: se suman `persona_crear`, `persona_editar`, `persona_agregar`, `persona_quitar`, `persona_borrar`, `archivo_asignar`. El detalle guarda **qué campos** cambiaron, nunca sus valores (nombres, DNI, domicilios no van a los registros) |
| Backup | verificar que las tablas nuevas entran en el backup diario |

Borrar un expediente borra sus pertenencias pero **no** las fichas. Borrar una ficha la saca de todos los expedientes y deja sus archivos sin asignar.

## Servidor

Acciones nuevas en `api/drive.js` (sigue siendo la misma función; la lógica va en `api/_personas.js`, con tests primero, igual que el resto):

- `persona_guardar`: crea o edita una ficha. Si ya existe otra con el mismo DNI devuelve `{ duplicada }` con la existente, y solo la actualiza si el cliente confirma (`actualizar_existente`).
- `persona_agregar` / `persona_quitar`: pertenencia al expediente (quitar no borra la ficha ni los archivos).
- `persona_borrar`: borra la ficha (el cliente ya pidió confirmación).
- `archivo_asignar`: asigna uno o varios archivos a una persona o los deja sin asignar. Verifica que archivo y persona sean del **mismo registro**.
- La lectura (listar personas de un expediente, buscar en la libreta) sigue directo desde el navegador con las reglas de la base, como hoy.
- Al terminar la identificación automática se guardan `ident_apellido` e `ident_nombre` (solo con confianza alta).

## Pantallas

| Pieza | Qué cambia |
|---|---|
| `ExpedienteDetailScreen` | Pestaña **Personas (n)** primera y abierta al entrar (decidido). Las otras dos no cambian |
| `PersonasExpediente` (nuevo) | Lista de personas del expediente con estado civil y "actualizada hace…"; botón **Agregar persona**; avisos "Detecté a… en 2 archivos. ¿Agregarlo?" |
| `ModalPersona` (nuevo) | **Completar perfil**: datos, estado civil (desplegable), notas, archivos de la persona y **Leer del DNI** |
| `AgregarPersona` (nuevo) | Buscar en la libreta (DNI o apellido) o crear nueva; avisa si ya existe |
| `ArchivosEscribania` | Cada archivo muestra de quién es ("Sin asignar" si no tiene) y **Asignar a…**; también para varios seleccionados; propuesta cuando el nombre coincide |
| `PartesEditor` | Con documento en un expediente: franja **Personas del expediente** arriba de las partes, y también como sugerencias arriba de la búsqueda de la libreta de cada parte. Reutiliza la función que ya completa una parte desde la libreta, con su concordancia de género y su aviso antes de reemplazar datos |
| `SelectorScreen` | Campo opcional **Expediente** (lista del registro con búsqueda; ya elegido si se llegó desde un expediente). El expediente viaja al editor |
| `EditorScreen` | Al primer guardado vincula el documento con el expediente elegido; indicador **Expediente: …** en el encabezado con Cambiar / Quitar / Vincular (la lógica de `ModalAgregarExpediente` se reutiliza pero sin sacarte del documento) |
| Editor del documento | Botón **Archivos del expediente** que abre un panel lateral con la lista agrupada por persona; reutiliza el visor de archivos de la pestaña Archivos (se extrae a un componente compartido) |
| Lector de documentos | `escanearDocumento` y sus ayudas salen de `PartesEditor.jsx` a un módulo propio; el comportamiento del botón "Escanear" actual no cambia |

## Diseño (skill `notarial-design`)

- **Una acción principal por vista:** en la pestaña, **Agregar persona**; en el modal, **Guardar**; "Leer del DNI" es secundaria.
- **Estados a diseñar:** pestaña vacía (con qué hacer primero), cargando, error de carga, lista; en el modal: lectura en curso (panel con paso y avance), lectura parcial ("Leí 5 de 8 datos"), lectura fallida (se puede completar a mano), duplicado, guardando, error al guardar.
- **Lo leído nunca pisa lo escrito:** los campos vacíos se completan y se dice cuáles; si el DNI discrepa de un dato ya cargado se muestra "El DNI dice X · Tenés Y" con un botón para usar el del DNI.
- **Quitar de un expediente es reversible** (se vuelve a agregar); **borrar la ficha** es la única confirmación y nombra a la persona.
- **Accesibilidad y textos:** foco, Esc, etiquetas, contraste, voseo; tablas y avisos sin depender solo del color.
- Se prueba a **1366×768** (lo importante es escritorio) y la pestaña también a 360 px, con 30 archivos y nombres largos.

## Privacidad

- Las fichas tienen datos personales: solo las ve el registro dueño (misma regla que los archivos, con prueba entre dos registros).
- La lectura de fotos ocurre **solo** cuando el usuario la pide, y manda a la IA la imagen reducida, igual que hoy "Escanear". Lo leído no se guarda hasta que la persona revisa y toca Guardar.
- El historial no guarda valores personales.
- Antes de cargar datos reales sigue vigente la revisión legal y de privacidad que ya está en el backlog.

## Riesgos

| Riesgo | Cómo se maneja |
|---|---|
| La lectura del DNI se equivoca | Nada se guarda sin revisión; discrepancias a la vista; se puede completar a mano |
| `PartesEditor.jsx` es un archivo grande y central | Cambios mínimos y aditivos; el lector se mueve con tests antes y después |
| Extraer el visor de archivos puede romper la pestaña Archivos | Se hace con la prueba de punta a punta en producción de esa pestaña |
| Fichas que ya están repetidas | No se tocan; se avisa cuando una aparece (decidido) |

## Orden de trabajo

1. Datos y base (SQL con reversión) y el lector compartido. *(El arreglo del vínculo documento-expediente es independiente y se puede adelantar.)*
2. Servidor con tests.
3. Pestaña Personas y modal (sin la lectura).
4. Archivos de cada persona y propuestas.
5. Leer del DNI.
6. Editor: sugerencias en las partes y panel de archivos.
7. Prueba en producción con dos registros, documentación y cierre.
