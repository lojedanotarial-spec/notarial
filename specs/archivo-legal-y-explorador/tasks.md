# Tareas: Explorador y clasificación por Protocolo

Derivadas de [plan.md](plan.md) §9. Cada tarea se sube sola.

- [x] **T1. Base de datos** (`scripts/explorador_indice.sql` + rollback): catálogo de actos, columna `documentos.clase`, tablas `indice_documentos` e `indice_partes` con RLS, funciones de normalización, `indexar_documento`, triggers sobre `documentos` y `actos_catalogo`, carga inicial. **Aplicada por Lucas en Supabase el 20/11/26** (el filtro de permisos no deja que Claude corra cambios de estructura): 88 documentos indexados, 122 partes, 0 errores; las alertas de seguridad no marcan nada de lo nuevo.
- [x] **T2. Catálogo cargado** con la tabla del plan §7 (las 53 plantillas y `documento_libre`), en el mismo script.
- [x] **T3. Selector de Protocolo** en el modal «Protocolo» del editor. Se guarda en `documentos.clase`; «Según la plantilla» guarda vacío. El panel lateral del editor muestra Protocolar, Extraprotocolar o Sin definir.
- [x] **T4. Funciones de búsqueda y conteos** (`scripts/explorador_rpc.sql`: `explorador_buscar`, `explorador_conteos`, `explorador_ids`). Aplicado por Lucas el 20/11/26. Verificado: totales y contadores cierran (7 + 77 + 4 = 88), paginación 50 + 38, DNI con y sin puntos, filtro por persona y por registro, y un usuario no administrador ve solo su registro (70 de 88). **Pendiente:** la prueba de volumen con 10.000 documentos (pide una rama de Supabase, que tiene costo).
- [x] **T5. Pantalla del Explorador** según la maqueta. Reemplaza a Expedientes (D27). Diferencia con la maqueta: Documentos y Expedientes se ven por separado (no hay «Todo» mezclado).
- [ ] **T6. Respuestas de Fátima** cargadas en el catálogo.

**Deuda anotada:** la base traduce las claves viejas (`certFirma`…) solo cuando vienen en `template_key`; el cliente también las traduce si vienen en `tipo_acto`. Hoy ningún documento las tiene en `tipo_acto`, así que no hay diferencia. Si aparece alguno, se corrige `acto_normalizado` en la base.
