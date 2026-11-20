# Tareas: Explorador y clasificación por Protocolo

Derivadas de [plan.md](plan.md) §9. Cada tarea se sube sola.

- [x] **T1. Base de datos** (`scripts/explorador_indice.sql` + rollback): catálogo de actos, columna `documentos.clase`, tablas `indice_documentos` e `indice_partes` con RLS, funciones de normalización, `indexar_documento`, triggers sobre `documentos` y `actos_catalogo`, carga inicial. **Aplicada por Lucas en Supabase el 20/11/26** (el filtro de permisos no deja que Claude corra cambios de estructura): 88 documentos indexados, 122 partes, 0 errores; las alertas de seguridad no marcan nada de lo nuevo.
- [x] **T2. Catálogo cargado** con la tabla del plan §7 (las 53 plantillas y `documento_libre`), en el mismo script.
- [x] **T3. Selector de Protocolo** en el modal «Protocolo» del editor. Se guarda en `documentos.clase`; «Según la plantilla» guarda vacío. El panel lateral del editor muestra Protocolar, Extraprotocolar o Sin definir.
- [ ] **T4. Funciones de búsqueda y conteos** (`explorador_buscar`, `explorador_conteos`), con prueba de volumen (10.000 documentos en una rama).
- [ ] **T5. Pantalla del Explorador** según la maqueta. Reemplaza a Expedientes (D27).
- [ ] **T6. Respuestas de Fátima** cargadas en el catálogo.

**Deuda anotada:** la base traduce las claves viejas (`certFirma`…) solo cuando vienen en `template_key`; el cliente también las traduce si vienen en `tipo_acto`. Hoy ningún documento las tiene en `tipo_acto`, así que no hay diferencia. Si aparece alguno, se corrige `acto_normalizado` en la base.
