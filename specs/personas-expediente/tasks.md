# Tareas: Personas del expediente

**Estado:** ✅ aprobado por Lucas el 11/11/26 ("si dale, ejecuta"). En ejecución
**Spec:** [`spec.md`](spec.md) ✅ · **Plan:** [`plan.md`](plan.md) ✅
**Responsable:** 🤖 = Claude · 👤 = Lucas. Cada tarea cierra con su verificación. Los tests se escriben antes que el código.

## Qué te toca a vos (resumen)

- **Fase 0:** correr 1 script SQL en el SQL Editor de Supabase (te lo dejo listo, con reversión).
- **Fase 6:** probar con el celular y con la cuenta de Fátima; mirar los textos.
- Todo lo demás lo hago yo, con deploy a producción en cada fase.

## Fase 0 — Base de datos y lector compartido

- [x] **T0.1 🤖** (hecho 11/11/26, commit 8b42d70 y siguiente; se sumaron barrio, manzana, casa, provincia y país a `personas`, que el formulario de partes manejaba sin guardar) `scripts/personas_expediente.sql` y `_rollback.sql`: `personas.notas`, tabla `expediente_personas` (con su regla de acceso por registro), `expediente_archivos.persona_id`, `ident_apellido`, `ident_nombre`, índices. Solo aditivo. *Verif.: el script se relee contra el esquema real sin errores de nombres; la reversión deja todo como estaba.*
- [ ] **T0.2 👤** Correr el SQL en el SQL Editor. *Verif.: "Success".*
- [ ] **T0.3 🤖** Verificar contra la base real: tablas y columnas nuevas, reglas de acceso (una persona de un registro no se ve desde otro) y que borrar un expediente borra la pertenencia pero no la ficha. Revisar si las tablas nuevas entran en el backup. *Verif.: consultas de comprobación, sin datos de prueba dejados.*
- [x] **T0.4 🤖** (hecho 11/11/26, commit fbf31a1) Mover `escanearDocumento` (y PDF, merge) de `PartesEditor.jsx` a `src/utils/escanearDocumento.js` y exportar la lista de estados civiles. Tests del merge antes de mover. *Verif.: tests en verde; el botón "Escanear" del editor se comporta igual.*
- [x] **T0.5 🤖** (hecho 11/11/26, commit fbf31a1; también se guardan barrio, manzana, casa, provincia y país) Corregir `guardarPartesEnCRM`: DNI vacío se guarda sin valor, no `""`. Test con dos personas sin DNI. *Verif.: tests en verde.*

## Fase 1 — Servidor

- [ ] **T1.1 🤖** Tests primero y luego `api/_personas.js`: normalizar apellido/nombre para comparar (sin tildes ni mayúsculas), detectar duplicados (por DNI y por nombre), armar el detalle del historial **sin valores personales**. *Verif.: tests en verde.*
- [ ] **T1.2 🤖** Acciones `persona_guardar`, `persona_agregar`, `persona_quitar`, `persona_borrar`, `archivo_asignar` en `api/drive.js`, con autorización por registro, historial y respuesta `{ duplicada }`. Tests con el arnés de pruebas existente, incluida la prueba de **un registro intentando tocar fichas o archivos de otro**. *Verif.: tests en verde.*
- [ ] **T1.3 🤖** Guardar `ident_apellido` e `ident_nombre` al identificar (solo confianza alta). *Verif.: test: con confianza baja no se guarda nada.*
- [ ] **T1.4 🤖** Tests, lint, build y deploy a producción. Verificar el deploy. *Verif.: producción sana, rutas viejas responden igual.*

## Fase 2 — Pestaña Personas y modal

- [ ] **T2.1 🤖** `src/utils/personasCliente.js` + tests: listar las personas de un expediente, buscar en la libreta, armar el texto "actualizada hace…", agrupar por persona. *Verif.: tests en verde.*
- [ ] **T2.2 🤖** `PersonasExpediente.jsx` y la pestaña **Personas (n)** primera y abierta al entrar. Todos sus estados (vacía, cargando, error, lista). *Verif.: capturas de cada estado a 1366×768.*
- [ ] **T2.3 🤖** `AgregarPersona.jsx`: buscar existente (DNI o apellido) o crear nueva; aviso de duplicado con "Actualizar la existente". *Verif.: probado en producción con un DNI ya existente.*
- [ ] **T2.4 🤖** `ModalPersona.jsx` (**Completar perfil**): datos, estado civil en desplegable, notas, "actualizada el…", quitar del expediente (reversible) y borrar la ficha (con confirmación que nombra a la persona). *Verif.: teclado (Tab, Esc, Enter) y capturas.*
- [ ] **T2.5 🤖** Tests, lint, build, deploy y prueba en producción de la pestaña. *Verif.: todo verde, deploy verificado.*

## Fase 3 — Archivos de cada persona

- [ ] **T3.1 🤖** Tests de la propuesta: agrupar los archivos sin asignar por apellido y nombre detectados y compararlos con las personas del registro. *Verif.: tests en verde.*
- [ ] **T3.2 🤖** `ArchivosEscribania`: "De quién" en cada archivo, **Asignar a…** (también para varios seleccionados) y la propuesta "Detecté a… ¿Asignarlo?". *Verif.: capturas con 20 archivos y nombres largos.*
- [ ] **T3.3 🤖** En la pestaña Personas: aviso "Detecté a… en N archivos. ¿Agregarlo?" que agrega, asigna y abre el modal; la ficha lista sus archivos (abrir y bajar). *Verif.: probado en producción subiendo un DNI con "Automático".*
- [ ] **T3.4 🤖** Tests, lint, build y deploy. *Verif.: todo verde.*

## Fase 4 — Leer del DNI

- [ ] **T4.1 🤖** Tests: la lectura completa solo campos vacíos, marca discrepancias ("El DNI dice X · Tenés Y"), no inventa y maneja lectura parcial y fallida. *Verif.: tests en verde.*
- [ ] **T4.2 🤖** Botón **Leer del DNI** en el modal: usa los archivos de la persona, panel de proceso con paso y avance, resultado revisable y **nada se guarda hasta Guardar**. *Verif.: probado con fotos reales en producción; con lectura fallida se puede completar a mano.*
- [ ] **T4.3 🤖** Tests, lint, build y deploy. *Verif.: todo verde.*

## Fase 5 — Documento vinculado al expediente y personas en el editor

- [x] **T5.1 🤖** (hecho 11/11/26, commit fbf31a1; la prueba en producción queda para T5.2) Arreglar el vínculo al crear desde el expediente: la selección recibe el expediente y se lo pasa al editor, que vincula en el primer guardado (sin duplicar si ya existe). Tests de la decisión de vincular. *Verif.: tests en verde; en producción, "+ Nuevo documento" desde un expediente deja el documento en su lista.*
- [ ] **T5.2 🤖** Campo opcional **Expediente** en la selección (lista del registro con búsqueda, ya elegido si se llegó desde uno) y indicador **Expediente: …** en el editor con **Cambiar / Quitar / Vincular** sin salir del documento. Reutiliza la lógica de `ModalAgregarExpediente`. *Verif.: probado en producción creando un documento por cada camino (desde el expediente, con el campo, y vinculando después); "Agregar a expediente" de hoy sigue funcionando.*
- [ ] **T5.3 🤖** Franja **Personas del expediente** arriba de las partes y sugerencias en la búsqueda de cada parte: tocar una completa la parte (género, nacionalidad, CUIT), muestra notas y "actualizada hace…", avisa antes de reemplazar datos y avisa si la misma persona ya es otra parte. Si se vincula con el documento ya abierto, la franja aparece al instante. Tests de la lógica. *Verif.: prueba en producción con un documento de un expediente con 2 personas; un documento sin expediente funciona como hoy.*
- [ ] **T5.4 🤖** Extraer el visor de archivos a un componente compartido y agregar el botón **Archivos del expediente** con el panel agrupado por persona. *Verif.: la pestaña Archivos sigue igual (probada) y el panel abre y baja archivos.*
- [ ] **T5.5 🤖** Tests, lint, build y deploy. *Verif.: todo verde.*

## Fase 6 — Prueba de punta a punta, documentación y cierre

- [ ] **T6.1 🤖** Prueba en producción: expediente nuevo → subir DNI desde el celular (QR) → detectar y agregar → completar perfil con Leer del DNI → crear un documento con esa persona como parte. Verificar que **otro registro no ve** las fichas y que el historial muestra cada acción. Dejar la base limpia. *Verif.: todo anda; sin datos de prueba.*
- [ ] **T6.2 👤** Mirar el resultado con tu cuenta o la de Fátima: textos, orden de la pestaña, si el estado civil sale bien en el documento. *Verif.: tu OK o lista de cambios.*
- [ ] **T6.3 🤖** Documentación: `PROYECTO.md`, `BACKLOG.md` (cónyuge vinculado, completar desde el celular, "posibles repetidos", que Scriba use las fichas), estado de spec/plan/tasks y de la feature, memoria del proyecto. *Verif.: sin menciones a Drive como almacén.*

## Trazabilidad con la spec

| Criterio de la spec | Tareas |
|---|---|
| Una sola ficha por persona; aviso y actualizar si ya existe | T1.1–T1.2, T2.3 |
| Pestaña Personas (agregar existente o nueva, quitar sin borrar) | T2.2–T2.4 |
| Completar perfil: estado civil en desplegable, notas, última actualización | T0.1, T2.4 |
| Leer del DNI solo a pedido, sin pisar lo escrito | T4.1–T4.2 |
| Proponer personas detectadas, nunca crear solo | T1.3, T3.1, T3.3 |
| Historial de cada cambio | T1.1–T1.2, T6.1 |
| Archivos de una persona; asignar; sin asignar | T3.2–T3.3 |
| Documento vinculado a su expediente (desde el expediente, al crear, o después) | T5.1–T5.2 |
| Sugerencias al armar las partes, a la vista; copia propia en el documento | T5.3 |
| Ver archivos mientras se edita | T5.4 |
| Solo el registro dueño; borrar expediente/ficha | T0.1, T0.3, T1.2, T6.1 |
