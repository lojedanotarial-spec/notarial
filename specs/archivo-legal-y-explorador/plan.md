# Plan técnico: índice del Explorador y clasificación P/NP (20/11/2026)

**Términos de pantalla (decidido por Lucas el 20/11/26):** la categoría se llama **Protocolo** y sus valores son **Protocolar**, **Extraprotocolar** y **Sin definir**, al lado de **Acto**. En este plan, P y NP son solo los códigos internos de la base (NP = extraprotocolar). Maqueta navegable: https://claude.ai/artifact/2QzJfGt6e6BzCAs1HjUuXG

Plan de la U4 de [diseno-ux.md](diseno-ux.md) (Explorador, D26 a D28). **Aprobado por Lucas el 20/11/26**, con la opción A (§2) y el selector en el modal Protocolo. Spec: [spec.md](spec.md). Tareas: [tasks.md](tasks.md).

**Decisiones del §10 tomadas al aprobar:** 1) opción A; 2) selector en el modal «Protocolo» del editor; 3) las plantillas mal ubicadas esperan a Fátima; 4) el catálogo queda global, sin columna por escribanía (se agrega cuando haga falta).

## 1. El problema

El Explorador tiene que filtrar y contar por **año, protocolar o no, acto, persona (apellido, nombre, DNI, CUIT) y estado** sobre diez años de documentos, con paginación del servidor (D28). Hoy eso no se puede hacer bien:

| Hecho (verificado en la base el 20/11/26) | Consecuencia |
|---|---|
| Las partes viven dentro de `documentos.contenido.partes` (jsonb), no en una tabla. | Buscar por DNI obliga a abrir el contenido de cada documento. |
| Solo **6 de 122** partes tienen `_personaId` (enlace a la libreta `personas`). | Buscar por persona no puede depender del enlace: hay que indexar el DNI, el CUIT y el nombre escritos en el documento. |
| Hay dos claves de plantilla: `template_key` (de dibujo: `certFirma`, `certFirmaF08`, `escrituraBarrio`) y `tipo_acto` (el slug de `templates`: `cert_firma`). 26 de 88 documentos no tienen `tipo_acto`. | Hace falta normalizar a un solo código de acto. |
| La fecha del acto está en `contenido.fecha` como `{anio, mes, dia}` numéricos (88 de 88). | El año se toma de ahí; si falta, de `created_at`. |
| No existe el dato protocolar o no protocolar. `contenido.protocolo.libro` dice en qué libro de requerimientos se asentó la certificación; no es lo mismo. | La clasificación es nueva. |
| Un documento se vincula a expedientes por `expediente_documentos` (muchos a muchos), y las personas a expedientes por `expediente_personas`. | El filtro por expediente es un join, no una columna. |
| Inicio carga los últimos 200 documentos **con todo el contenido** (`HomeScreen.jsx:296`). | Con años de archivo esto se vuelve lento y además corta en silencio (lo que D28 prohíbe). |
| No están instaladas las extensiones `pg_trgm` ni `unaccent`. | La búsqueda por nombre usa columnas normalizadas a mano (minúsculas, sin tildes) y `LIKE` con prefijo. Alcanza para el volumen de una escribanía. |

## 2. Opciones

| | A. Tablas índice mantenidas por triggers (recomendada) | B. Vistas sobre `documentos` |
|---|---|---|
| Cómo | Dos tablas livianas que la base actualiza sola cada vez que se guarda un documento. | Vistas que extraen los campos del jsonb al consultar. |
| Quién escribe | Nadie del código: lo hace el trigger. Cubre el editor, la carga masiva, Scriba y cualquier escritura futura. | Nadie. |
| Velocidad | Índices reales sobre DNI, CUIT, año, acto y estado. Los contadores salen de `count(*)` indexado. | Cada búsqueda recorre el jsonb de todos los documentos. |
| Costo | Dos tablas, un trigger y una carga inicial. | Casi nada. |
| Riesgo | Si el trigger falla, el guardado falla. Se mitiga con un trigger que nunca lanza error (ver §4). | Ninguno, pero no escala. |

**Recomiendo A.** Con 88 documentos la B andaría, pero el objetivo es diez años, y la A cuesta poco más. Además el trigger garantiza que ningún camino de escritura quede sin indexar, que es justo el tipo de error silencioso que este producto no se puede permitir.

## 3. Esquema propuesto

```sql
-- Catálogo: qué es cada acto y su clase por defecto. Se carga con el listado y con las respuestas de Fátima.
create table actos_catalogo (
  codigo        text primary key,            -- slug de templates (cert_firma, compraventa_urbana...) o código propio
  nombre        text not null,               -- "Certificación de firma"
  item_listado  text,                         -- id del listado legal (np-firmas, inm-compraventa...)
  clase_defecto text not null check (clase_defecto in ('P','NP','ambas')),
  fundamento    text,                         -- "Ley 3058 art. 56"
  registro_id   text                          -- null = global; con valor = ajuste propio de una escribanía (a futuro)
);

-- Elección manual por documento (solo cuando el acto admite las dos formas, o para corregir).
alter table documentos add column clase text check (clase in ('P','NP'));

-- Una fila por documento, sin el contenido.
create table indice_documentos (
  documento_id   uuid primary key references documentos(id) on delete cascade,
  registro_id    text,
  titulo         text,
  acto           text,                        -- código normalizado (ver §4)
  clase          text not null,               -- 'P' | 'NP' | 'sin_definir'
  clase_origen   text not null,               -- 'documento' (elegida a mano) | 'catalogo' | 'sin_dato'
  anio           int,
  fecha_acto     date,
  estado         text,
  partes_texto   text,                        -- "garcia juan 31645431 | perez ana 20316454313" (para el buscador único)
  creado         timestamptz,
  actualizado    timestamptz
);
create index on indice_documentos (registro_id, anio desc, actualizado desc);
create index on indice_documentos (registro_id, clase);
create index on indice_documentos (registro_id, acto);
create index on indice_documentos (registro_id, estado);

-- Una fila por parte de cada documento.
create table indice_partes (
  documento_id  uuid references documentos(id) on delete cascade,
  orden         int,
  registro_id   text,
  persona_id    uuid,                         -- _personaId si existe
  apellido_norm text,                         -- minúsculas, sin tildes
  nombre_norm   text,
  nro_doc       text,                         -- solo dígitos
  cuit          text,                         -- solo dígitos
  rol           text,
  primary key (documento_id, orden)
);
create index on indice_partes (registro_id, nro_doc);
create index on indice_partes (registro_id, cuit);
create index on indice_partes (registro_id, apellido_norm text_pattern_ops);
create index on indice_partes (persona_id);
```

**Seguridad:** las dos tablas índice llevan RLS con la misma regla que `documentos` (`registro_id = mi_registro() or es_admin()`), y el código solo las lee. `actos_catalogo` es de lectura para todos y de escritura solo para el administrador.

## 4. Cómo se llena

**Trigger** `after insert or update of contenido, estado, titulo, tipo_acto, template_key, clase on documentos`. Llama a una función `indexar_documento(id)` que:

1. **Normaliza el acto:** `coalesce(nullif(tipo_acto,''), mapa(template_key))`, con el mapa `certFirma → cert_firma`, `certFirmaF08 → cert_firma_f08`, `escrituraBarrio → compraventa_lote`. Si no hay ninguno, queda `documento_libre`.
2. **Resuelve la clase:** si `documentos.clase` tiene valor, se usa (`origen = documento`). Si no, se toma `clase_defecto` del catálogo: si es P o NP, se usa (`origen = catalogo`); si es `ambas` o el acto no está en el catálogo, queda `sin_definir`.
3. **Toma el año** de `contenido.fecha.anio`; si falta, de `created_at`.
4. **Reescribe las partes:** borra las del documento y vuelve a insertar una fila por cada elemento de `contenido.partes`, con apellido y nombre normalizados y DNI y CUIT solo con dígitos.
5. **Nunca corta el guardado:** el cuerpo va dentro de `begin … exception when others then` y, si falla, registra el error en `error_logs` y deja el índice como estaba. Un índice desactualizado se repara; un documento que no se guardó, no.

Hay un segundo trigger sobre `actos_catalogo`: cuando cambia la clase por defecto de un acto, se reindexan los documentos de ese acto. Así, cuando lleguen las respuestas de Fátima, se carga el catálogo y el archivo entero queda clasificado solo.

**Carga inicial:** `select indexar_documento(id) from documentos;` (88 filas hoy) dentro de la misma migración.

## 5. Lectura (lo que usa la pantalla)

Dos funciones RPC con `security invoker`, de modo que la RLS se sigue aplicando:

- `explorador_buscar(filtros jsonb, orden text, limite int, desde int)` devuelve las filas de `indice_documentos` y el **total**, para mostrar «Mostrando 50 de 1.240» (D28).
- `explorador_conteos(filtros jsonb)` devuelve los contadores de «Ver por» (Años, Protocolar o no, Actos, Estado) aplicando los demás filtros.

El buscador único interpreta lo escrito igual que D25: 11 dígitos es CUIT, 7 u 8 es DNI (busca en `indice_partes`) y el texto busca por prefijo de apellido o nombre, o en el título.

Expedientes: en v1 se listan desde `expedientes` (son pocos y livianos) y el filtro «expediente» hace join con `expediente_documentos`. Si el volumen lo pide, se suman al índice más adelante.

## 6. Dónde se elige P o NP en la interfaz

- En el editor, en **«Otros datos»** (`ModalOtros.jsx`), junto al libro de requerimientos que ya existe, va un control de tres opciones: «Protocolar», «No protocolar» y «Según la plantilla (…)». Si la plantilla del acto es `ambas` y nadie eligió, el documento queda «Sin definir».
- En el Explorador, «Sin definir (N)» aparece como filtro, igual que «Sin copia del DNI» (D35), para ir completando.
- Más adelante, al cerrar un expediente (D31), la lista de revisión avisa de los documentos sin definir, sin bloquear el cierre.

## 7. Plantillas actuales → listado legal

Clase por defecto propuesta según la ley. Las que figuran como **ambas** esperan las respuestas de Fátima (formulario «Protocolar o no»).

| Plantilla (slug) | Ítem del listado | Clase | Nota |
|---|---|---|---|
| cert_firma | np-firmas | NP | |
| cert_firma_f08 | np-formularios | NP | |
| cert_copia | np-copias | NP | |
| fe_vida | np-fe-vida | NP | |
| autorizacion_vehiculo | np-privados | NP | Los 9 documentos existentes se asentaron en el libro de requerimientos. |
| autorizacion_viaje | mix-viaje | ambas | El único documento existente se asentó en el libro de requerimientos, así que hoy se hace como NP. |
| acta_constatacion | mix-constatacion | ambas | |
| acta_notificacion | mix-notificacion | ambas | |
| acta_manifestacion | — | ambas | **No está en el listado.** Preguntarle a Fátima qué es en su práctica. |
| acta_entrega | mix-deposito | ambas | Coincide solo en parte con el ítem. |
| acta_asamblea, acta_directorio | mix-asamblea | ambas | |
| compraventa_urbana, compraventa_rural, compraventa_ph, compraventa_lote | inm-compraventa | P | |
| donacion_inmueble, donacion_reserva_uso, donacion_hijo, aceptacion_donacion | inm-donacion | P | |
| hipoteca_constitucion, mutuo_hipotecario | inm-hipoteca | P | |
| hipoteca_cancelacion | inm-cancelacion | P | |
| convenio_division, particion_herencia | inm-division | P | Una partición sin inmuebles podría no ser escritura; se corrige a mano por documento. |
| usufructo_constitucion | inm-usufructo | P | |
| servidumbre | inm-servidumbre | P | |
| superficie | inm-superficie | P | |
| estatuto_sa | pj-sa | P | |
| estatuto_sas | mix-sas | ambas | |
| contrato_srl | mix-srl | ambas | |
| aumento_capital | mix-reorg | ambas | En una SA suele ser P. |
| cesion_cuotas | mix-cuotas | ambas | |
| cesion_credito | mix-cesion-creditos | ambas | Si es un crédito hipotecario, es P (inm-cesion-hip). |
| cesion_posicion_contractual | — | ambas | **No está en el listado.** Sigue la forma del contrato cedido. |
| mutuo_simple, reconocimiento_deuda | mix-mutuo | ambas | |
| boleto_compraventa | np-privados | NP | **Está en la familia «Escrituras públicas» del selector**, pero normalmente es un instrumento privado con firma certificada. |
| locacion_inmueble, locacion_comercial | np-privados | NP | Ídem. El documento existente se asentó en el libro de requerimientos. |
| prenda_con_registro | np-formularios | NP | Ídem: está en «Escrituras públicas». |
| poder_especial, poder_general, poder_administracion, poder_irrevocable | pod-general | P | |
| revocacion_poder | pod-modif | P | |
| declaratoria_herederos | act-protoc-judiciales | P | La declaratoria la dicta el juez; lo notarial es protocolizarla. Conviene revisar el nombre de la plantilla. |
| aprobacion_testamento («Protocolización de testamento») | act-protoc-olografo | P | |
| cesion_herencia | con-cesion-hered | P | |
| renuncia_herencia | suc-renuncia | P | |
| primer_testimonio, testimonio_posterior | der-testimonio | NP (derivado) | Van en la carpeta de la escritura de origen. |
| copia_simple | der-copia-simple | NP (derivado) | |
| documento_libre (sin plantilla) | — | ambas | Se elige a mano. |

Tres plantillas están en la familia equivocada del selector («Escrituras públicas» siendo instrumentos privados): boleto, locaciones y prenda con registro. Mover de familia es un cambio de una línea en `templates`. Conviene hacerlo con el OK de Fátima.

## 8. Pruebas

- **Función de indexado (SQL, con datos de prueba):** normalización del acto (las tres claves viejas y la vacía); la clase manual le gana al catálogo; `ambas` sin elección da `sin_definir`; año tomado de la fecha y, si falta, de `created_at`; partes con tildes y DNI con puntos; documento sin partes; jsonb malformado que no corta el guardado.
- **RLS:** un usuario de otro registro no ve filas del índice (consulta con su rol).
- **Recálculo:** cambiar la clase por defecto de un acto en el catálogo reclasifica sus documentos.
- **Volumen:** generar 10.000 documentos de prueba en una rama de Supabase y medir `explorador_buscar` y `explorador_conteos`. Objetivo: menos de 300 ms.
- **Vitest:** el intérprete del buscador único (CUIT, DNI o texto) y el armado de filtros.

## 9. Orden de trabajo (cada paso se puede subir solo)

1. **Migración:** catálogo + columna `clase` + tablas índice + triggers + carga inicial. Sin cambios visibles.
2. **Catálogo cargado** con la tabla del §7, con `ambas` donde falta Fátima.
3. **Selector P/NP en «Otros datos»** del editor.
4. **RPC de búsqueda y conteos**, con pruebas de volumen.
5. **Pantalla del Explorador** (U4 de diseno-ux.md), que reemplaza a Expedientes (D27).
6. **Respuestas de Fátima** cargadas en el catálogo: el archivo se reclasifica solo.

## 10. Decisiones abiertas

1. **A o B** (§2). Recomiendo A.
2. **Dónde se elige P/NP:** en «Otros datos» (recomendado) o como un paso al crear el documento.
3. **Mover las tres plantillas de familia** (§7): esperar el OK de Fátima.
4. **Ajuste por escribanía:** la columna `registro_id` del catálogo deja abierta la posibilidad de que cada escribanía tenga su propia clasificación, aunque v1 la usa solo como global. ¿Se deja así o se saca hasta que haga falta?
