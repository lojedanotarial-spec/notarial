# Notarial v2 — Documentación de Proyecto

> Última actualización: 17 julio 2026

---

## Qué es esto

Sistema de gestión y generación de documentos notariales para escribanos argentinos. Permite redactar, editar y exportar instrumentos notariales con asistencia de IA (Scriba), integración con OnlyOffice para edición DOCX profesional, base de datos de requirentes, biblioteca de plantillas y gestión de expedientes con Drive.

Desarrollado para escribanos de Mendoza; orientado inicialmente al Registro 9876 (admin/test) y escalable a múltiples registros.

---

## Stack Técnico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + Vite | 19.2.4 / 8.x |
| Editor DOCX | OnlyOffice Docs | 9.3.1 (Community) |
| Backend | Vercel Serverless (Node.js) | — |
| Base de datos | Supabase (PostgreSQL) | 2.105.1 |
| IA | Anthropic Claude API | SDK 0.98.0 |
| Generación DOCX | docx | 9.6.1 |
| OCR / Visión | Claude Vision (api/vision.js) | — |
| Google Drive | Drive API v3 (OAuth drive.file) | — |
| Estilos | CSS inline + design tokens | — |
| Auth | Supabase Auth (email + Google OAuth) | — |
| Tests | Vitest | — |

---

## Arquitectura

```
notarial.lat (Vercel)
├── src/                      React SPA (frontend)
│   ├── screens/              Pantallas principales
│   ├── components/           Componentes reutilizables
│   │   ├── modals/           Modales (Partes, Vehículos, Formato, Formulario, Expediente...)
│   │   └── ui/               Componentes UI (PartesEditor, Btn, FormElements...)
│   ├── hooks/                Hooks de estado/lógica
│   ├── utils/                Generación de DOCX, exportación, helpers
│   ├── context/              AuthContext (sesión global, Google OAuth)
│   ├── constants.js          Tokens de diseño, constantes de app
│   └── supabase.js           Cliente Supabase (anon key)
├── api/
│   ├── scriba.js             Serverless: integración Claude API
│   └── vision.js             Serverless: OCR de DNI y tarjetas verdes
└── public/oo-plugin/         Plugin OO (panel lateral "Propiedades")

onlyoffice.notarial.lat       OnlyOffice Docs (externo, ver §Servidor OO)
supabase.co                   Base de datos Supabase (ver §Base de Datos)
```

**Flujo de datos principal:**
1. Usuario edita partes/fecha/protocolo en el panel izquierdo de EditorScreen
2. EditorScreen genera un DOCX con `buildDocxGenerico` / `buildDocxCertFirmaF08`
3. El archivo se sube a Supabase Storage y OO recibe la URL firmada
4. OO carga el documento y permite edición DOCX nativa
5. El plugin OO (panelRight) muestra las propiedades y permite regenerar
6. Scriba (Claude) puede generar texto, completar partes y modificar el documento

---

## Pantallas

| Pantalla | Ruta/acción | Qué hace |
|---|---|---|
| `LoginScreen` | — | Login email/contraseña y Google OAuth (con scope Drive) |
| `HomeScreen` | default tras login | Dashboard con 3 columnas: FILTROS (izq) · DOCUMENTOS recientes (centro) · UTILIDADES (der) |
| `SelectorScreen` | "Nuevo documento" | Selector de plantilla por familia (cert, poder, acta, escritura, autorizaciones...) |
| `EditorScreen` | al elegir plantilla | Editor principal: OO + panel de datos + Scriba |
| `ExpedientesScreen` | desde HomeScreen | Lista de expedientes con filtros por estado; crear nuevo expediente |
| `ExpedienteDetailScreen` | desde ExpedientesScreen | Dos tabs: Documentos (Supabase) + Archivos Drive; editar nombre/notas/estado |
| `BulkScreen` | "Lote" | Generación masiva de escrituras para subdivisiones |
| `ModeloScreen` | admin | Editor visual de plantillas HTML por registro |
| `AdminScreen` | admin (avatar dropdown) | Gestión de registros (escribanos) |
| `HerramientasScreen` | "Ver todas →" en panel Utilidades | Grid de herramientas/calculadoras con estado (disponible / próximamente) |
| `LoteDocScreen` | desde BulkScreen | Formulario de medidas catastrales para cada lote |
| `LogsScreen` | admin (desde AdminScreen) | Observabilidad: 3 tabs — Errores JS, Scriba, Feedback (17/07/26) |

---

## Modales Principales

| Modal | Qué hace |
|---|---|
| `ModalPartes` | Lista/agrega/edita partes del documento; búsqueda por DNI, escaneo OCR |
| `ModalVehiculos` | Lista/agrega/edita vehículos; escaneo de tarjeta verde |
| `ModalFormato` | Controles de formato global: tipografía, márgenes, interlineado, énfasis, nombres |
| `ModalFormulario` | Selecciona tipo de formulario F-08 / F-08 Moto / F-04 con número y dominio |
| `ModalAgregarExpediente` | Desde el editor: vincula documento a expediente existente o crea uno nuevo |
| `ModalOtros` | Campos adicionales por template (extravars de texto libre) |

---

## Funcionalidades Implementadas

### Generación de Documentos

| Feature | Estado | Notas |
|---|---|---|
| Builder genérico con sistema de variables `{{VAR}}` | ✅ | `buildDocxGenerico.js` — parsea `**bold**`, `__underline__`, `~~userdata~~`, `{{VAR}}` |
| Variables dinámicas de negrita/subrayado | ✅ | `VARS_BOLD_DYN` / `VARS_UNDERLINE_DYN` según `estilos` del usuario |
| 50+ plantillas operativas | ✅ | Certificados, poderes, actas, escrituras, hipotecas, autorizaciones |
| Cert firma F08 — reescrito al texto de Fátima | ✅ | Orden VENTA/COMPRA, bloque INTERVIENE para apoderados |
| Formulario F-08 / F-08 Moto / F-04 | ✅ | `ModalFormulario.jsx`; prefijo M hardcodeado en moto |
| Flota de vehículos (múltiples) | ✅ | `ModalVehiculos.jsx`; `VEHICULOS_LISTA` en negrita en el documento |
| Múltiples autorizantes | ✅ | `AUTORIZANTE_TEXTO` itera todos, concordancia singular/plural automática |
| Roles contextuales por template | ✅ | Autorizante/Autorizado, Vendedor/Comprador, etc. según el template |
| Concordancia género/número | ✅ | del/de la, el/la/los autorizado/a, facultado/a/os |
| Márgenes simétricos protocolar | ✅ | Inyección `w:mirrorMargins` en settings.xml (75mm top, 16mm bottom, 36mm interior, 14mm exterior) |
| Bloque INTERVIENE para apoderados | ✅ | `buildInterviene.js` — PF y PJ unificados, reutilizable en F08 y genérico |
| Estilos globales de formato | ✅ | `ESTILOS_DEFAULT` exportado de `ModalFormato.jsx`; persiste por sesión |

**Variables disponibles en templates (selección):**

| Variable | Descripción |
|---|---|
| `PARTE_N_COMPLETO` | Nombre TitleCase + APELLIDO (según `nombresFormato`) |
| `PARTE_N_COMPLETO_UP` | Todo en mayúsculas (para headers) |
| `PARTE_N_ROL` | Rol del compareciente |
| `PARTE_N_INTERVIENE` | Bloque completo "en nombre y representación de..." |
| `PARTE_N_CUIT_LABEL` | CUIT con prefijo para autorizante, omitido para autorizado |
| `ESCRIBANO_NOMBRE` | Nombre del escribano (uppercase si `escribanoUppercase`) |
| `ESCRIBANO_REGISTRO_LETRAS` | Número de registro en letras o número según `registroFormato` |
| `ESCRIBANO_CARACTER_TEXTO` | Notario/Notaria según género del registro |
| `VEHICULO_MARCA/MODELO/DOMINIO/CHASIS/MOTOR` | Datos del rodado (en negrita automática) |
| `VEHICULOS_LISTA` | Lista formateada de vehículos para documentos de flota |
| `FECHA_DIA_LETRAS/FECHA_MES_LETRAS/FECHA_ANIO_LETRAS` | Fecha en palabras (en negrita automática) |
| `ARTICULO_LA_EL` | Concordancia de género para el instrumento |

### ModalFormato — Estilos Globales

Configuración que afecta a todos los documentos generados. Persiste en el estado de EditorScreen.

| Opción | Valores | Descripción |
|---|---|---|
| `fuente` | Merriweather, Times New Roman, Georgia, Courier | Fuente del documento |
| `fontSize` | 8–14 pt | Tamaño de fuente |
| `margenKey` | protocolar / no protocolar | Márgenes del documento |
| `interlineado` | Sencillo, 1.5, Doble | Espaciado entre líneas |
| `nombresFormato` | titlecase_both / titlecase_upper / uppercase | "Nombre Apellido" / "Nombre APELLIDO" / "NOMBRE APELLIDO" |
| `nombresNegrita` | true/false | Nombres de partes en negrita |
| `nombresSubrayado` | true/false | Nombres de partes subrayados |
| `escribanoUppercase` | true/false | Nombre del escribano en mayúsculas |
| `escribanoNegrita` | true/false | Nombre del escribano en negrita |
| `registroFormato` | letras / numero | Registro como "ochocientos..." o "853" |
| `fechaNegrita` | true/false | Fecha en letras en negrita |
| `vehiculoNegrita` | true/false | Datos del vehículo en negrita |
| `showVarHighlight` | true/false | Resaltado de variables: vacías en rojo, datos de usuario en amarillo. **Default: false.** |

### Expedientes

Sistema de gestión de expedientes notariales con integración a Google Drive.

| Feature | Estado | Notas |
|---|---|---|
| Lista de expedientes con filtros por estado | ✅ | `ExpedientesScreen.jsx` |
| Crear nuevo expediente | ✅ | Nombre + tipo de acto + estado |
| Detalle de expediente — tab Documentos | ✅ | Muestra documentos vinculados desde Supabase |
| Detalle de expediente — tab Archivos Drive | ✅ | Lista/sube/elimina archivos del escribano en Drive |
| Vincular documento a expediente desde el editor | ✅ | `ModalAgregarExpediente.jsx` — estado "vinculado" vs "sin vínculo" |
| ModalAgregarExpediente: Ver expediente vinculado | ✅ | Si ya está vinculado, muestra el expediente con "Ver →"; "Vincular a otro" colapsable |
| Upload de archivos a Google Drive | ✅ | `driveHelper.js` — `subirArchivoDrive`, `listarArchivosDrive`, etc. |
| Estructura de carpetas Drive: Notarial/[expediente]/ | ✅ | `buscarOCrearCarpetaDrive()` — busca o crea; `drive_folder_id` cacheado en expedientes |
| RLS por usuario | ✅ | `expedientes` requiere `usuario_id = auth.uid()` |
| Indicador de expediente por documento en HomeScreen | ✅ | Ícono carpeta cerulean rellena (vinculado) / borde (sin vincular); filtro sidebar |
| Vincular docs existentes a expediente desde ExpedienteDetailScreen | ✅ | Flow 3 — `ModalVincularDoc` con búsqueda por título/partes/tipo (chips)/fecha |
| Editar expediente (nombre, estado, notas) | ✅ | Desde `ExpedienteDetailScreen` |

**Tablas de expedientes:**
- `expedientes` — id, nombre, registro_id, usuario_id, estado, notas (`tipo_acto` existe en DB pero removido de la UI)
- `expediente_documentos` — vinculación documento ↔ expediente
- `expediente_archivos` — metadata de archivos en Drive (url, nombre, tipo)

### OCR / Escaneo de Documentos

| Feature | Estado | Notas |
|---|---|---|
| Escaneo de DNI (frente + dorso) | ✅ | `api/vision.js`; Claude Vision (Sonnet) |
| Escaneo de tarjeta verde / título automotor | ✅ | Detecta tipo automáticamente; extrae marca, modelo, dominio, chasis, motor |
| Escaneo múltiple — frente + dorso en un click | ✅ | Merge progresivo: scan-wins-or-fallback |
| Barra de progreso animada en escaneo | ✅ | Barra deslizante mientras procesa; sin texto de "Procesando" |
| Merge de datos: segundo scan completa vacíos | ✅ | No sobreescribe datos ya cargados |
| Barrio / Manzana / Casa desde domicilio | ✅ | Barrio separado de localidad en el prompt |
| Fecha de nacimiento desde MRZ | ✅ | Extrae dd/mm/aaaa desde zona legible por máquina |
| Inferencia de provincia por código | ✅ | `inferirProvincia()` — lookup localidades/departamentos, sin LLM |
| Tildes en nombres (RAUL→RAÚL, etc.) | ✅ | `tildesNombres.js` + lookup de 200+ nombres |

### PartesEditor

| Feature | Estado | Notas |
|---|---|---|
| Domicilio todo texto libre | ✅ | Sin dropdowns; calle, número, piso, depto, barrio, localidad, departamento, provincia, país |
| titleCaseDomicilio | ✅ | OCOYUNTA→Ocoyunta; B° LAGUNA DEL DIAMANTE→B° Laguna del Diamante; preposiciones en minúsculas |
| REPRESENTACIONES — documentación libre | ✅ | Un solo textarea `documentacion` para PF/PJ apoderados; reemplaza campos individuales del poder |
| CUIT calculado automáticamente | ✅ | Desde DNI + género al cargar DNI o desde Scriba |
| Campos Barrio/Manzana/Casa | ✅ | Soporte de barrios de emergencia y barrios privados |
| Concordancia de género/número en roles | ✅ | argentino/argentina; comprador/compradora |
| Género no resetea en escaneo de dorso | ✅ | scan-wins-or-fallback aplicado por campo |

### Scriba (IA)

| Feature | Estado | Notas |
|---|---|---|
| Respuesta vía Claude Messages API | ✅ | `claude-sonnet-4-6`; NO es streaming (respuesta completa vía `res.json()`) |
| Generar instrumentos notariales completos | ✅ | max_tokens elevado; conoce 50+ plantillas |
| Contexto del documento activo | ✅ | Recibe partes, fecha, protocolo, instrumento, vehiculos del editor |
| Abrir editor desde Scriba (tool use) | ✅ | `abrir_editor` abre SelectorScreen con template correcto |
| Pre-cargar partes y fecha desde Scriba | ✅ | EditorScreen acepta `params.partes` y `params.fecha` |
| Completar parte con posición exacta | ✅ | `parte_index` permite a Scriba posicionar partes exactas |
| Modificar documento completo | ✅ | Tool `modificar_documento` + btn "Aplicar" |
| Leer DNI/documento con foto | ✅ | Sube imagen → Claude Vision extrae datos → completa partes |
| **Múltiples DNI/tarjetas verdes en un mensaje** | ✅ | (17/07/26) `ScribaPanel.jsx` — fusiona N resultados de `/api/vision` en un solo `completar_parte` (dedup por DNI) + merge de vehículo primer-no-vacío-gana; progreso "Escaneando i/N" |
| **PDFs de contexto para redactar** | ✅ | (17/07/26) Botón separado del escaneo de identidad; manda bloques `type:"document"` nativos de Anthropic a `/api/scriba` (no pasa por `/api/vision`); validación de tamaño client-side (~2.4MB, límite de body de Vercel Hobby) |
| **Referenciar documentos guardados** | ✅ | (17/07/26) Tool `leer_documento` — reconstruye el texto completo de un acto ya guardado reusando `buildVars`/`sustituirVars` de `templateVars.js`; requiere confirmar el documento con `buscar_documentos` primero. Limitación: no incluye vehículos/extravars del template (solo partes/fecha/protocolo/instrumento) |
| Consultar personas del registro | ✅ | `buscar_personas` con RLS y JWT del usuario |
| Consultar documentos del registro | ✅ | `buscar_documentos` (incluye `id` desde 17/07/26, necesario para `leer_documento`) |
| Persistencia de conversaciones | ✅ | Tabla `scriba_conversaciones` en Supabase — ⚠️ solo guarda `{role, content}` como texto; imágenes/PDFs/acciones adjuntas NO sobreviven a un reload (aplica también a las 3 features nuevas de arriba) |
| Prompt caching | ✅ | System prompt cacheado → ~90% reducción de latencia en llamadas consecutivas |
| Renderizado de markdown | ✅ | Respuestas de Scriba con formato (bold, listas, tablas) |
| Fecha/hora actual en el system prompt | ✅ | `new Date()` inyectado en cada llamada |
| Botón "Copiar contenido" | ✅ | Copia markdown de la respuesta |
| Toggle expandir/contraer panel Scriba | ✅ | Botón en la barra del panel |
| Mensajes largos colapsables | ✅ | Truncación con "Ver más" |
| Botón borrar historial | ✅ | Limpia el historial de la conversación actual |
| Disclaimer footer | ✅ | "Verificar antes de aplicar" |
| Calcular CUIT desde DNI y género | ✅ | Tool y handler local; Scriba no hace aritmética |
| Normativa Mendoza 2024-2026 | ✅ | CCyC verbatim, UIF, ARCA, DTR, OSC, ATM, Ley Avalúos |
| Etiquetado epistémico | ✅ | Norma/Análisis/Doctrina/Jurisprudencia/Fuente admin |
| Historial de conversaciones en UI | ❌ | Pendiente: listado y carga de conversaciones previas |
| Insertar en OO confirmado | ⚠️ | Ver estado actual en §Plugin OO |
| Persistencia del chat al cerrar el panel + aviso de respuesta pendiente | ❌ | Pedido 13/07/26: si se cierra el panel de Scriba no debería perder el contexto de la conversación, y si se cierra mientras está procesando, el avatar/globo debería avisar que llegó una respuesta. Sin diseñar todavía. |
| Completar variables custom de template (extravars) | ✅ | **Resuelto 17/07/26.** Nuevo tool `completar_extravars` — el contexto activo ahora incluye `[CAMPOS DEL TEMPLATE]` (nombres exactos de `templateVarsSchema`, ej. `PRECIO_NUMEROS`, `PLAZO_ESCRITURACION`); Scriba llama `completar_extravars({valores, mensaje})`, se muestra un botón "Aplicar al documento" (mismo patrón que `modificar_documento`), y `EditorScreen` mergea en `extravars` vía `scriba:completar_extravars` — la regeneración es automática (ya estaba en el efecto `[vehiculos, extravars]`). System prompt actualizado para que `modificar_documento` nunca se use para esto. |

**Estado del botón "Insertar en documento":**
- Fix deployado (27/05/26): timeout fallback de 3s en el plugin + cola de inserción
- Pendiente: confirmar end-to-end cuando OO esté estable

### Editor de Documentos

| Feature | Estado |
|---|---|
| OnlyOffice DOCX con edición nativa | ✅ |
| Generación de DOCX desde plantilla con sistema `{{VAR}}` | ✅ |
| Negrita/subrayado automático por variable (`**bold**`, `__sub__`) | ✅ |
| Autoguardado en Supabase | ✅ |
| Plugin OO "Propiedades del Acto" | ✅ |
| Regenerar documento desde plugin | ✅ |
| Múltiples fuentes (Merriweather, Times, Georgia, Courier) | ✅ |
| Márgenes protocolar / no protocolar / simétricos | ✅ |
| Interlineado configurable | ✅ |
| Reconexión automática si OO cae | ✅ |
| Exportar DOCX directamente | ✅ |
| Resaltado de variables (opt-in) | ✅ | Toggle en ModalFormato; **apagado por defecto**; vacías → texto rojo, datos usuario → fondo amarillo Word |
| Idioma es-AR en OO y en el DOCX | ✅ |
| Supresión del dialog "cambios sin guardar" de OO | ✅ |
| `callbackUrl` configurado en OO | ✅ |

### Personas / Requirentes

| Feature | Estado |
|---|---|
| Búsqueda por DNI y apellido | ✅ |
| Autocompletar en ModalPartes | ✅ |
| RLS por registro (Supabase) | ✅ |
| Cálculo automático de CUIT/CUIL | ✅ |
| Sync desde CRM externo | ❌ (placeholder en UI) |

### Observabilidad y Feedback (implementado 17/07/26, sin documentar hasta ahora)

| Feature | Estado | Notas |
|---|---|---|
| Captura de errores JS globales | ✅ | `App.jsx` — listeners de `window.error` y `window.unhandledrejection`, logueados vía `logError()` |
| `ErrorBoundary` | ✅ | Envuelve toda la app en `App.jsx`; pantalla de fallback "Algo salió mal" en vez de página en blanco; loguea `react_boundary` con el component stack |
| `FeedbackButton` | ✅ | Botón flotante global (todas las pantallas); categorías error/sugerencia/consulta; guarda en `feedback_reports` |
| `LogsScreen` | ✅ | Pantalla admin (accedida desde AdminScreen) con 3 tabs: Errores JS, Scriba, Feedback |
| Logging de llamadas a Scriba | ✅ | `logScriba()` en cada llamada a `/api/scriba` — slug, screen, input, respuesta, duración, error |

**Tablas Supabase:** `error_logs`, `scriba_logs`, `feedback_reports` (todas vía `src/utils/logger.js` — inserts silenciosos, nunca rompen la app si fallan).

### Tests

| Suite | Tests | Estado |
|---|---|---|
| `utils.test.js` | Cálculo CUIL, CIENTO, regex estado civil | ✅ |
| `localHandler.test.js` | Handler local Scriba (estado civil, rol, extendidos) | ✅ |
| `tildesNombres.test.js` | Lookup tildes en nombres propios | ✅ |
| `templateVars.test.js` | Variables de plantilla, ROL uppercase, nombres | ✅ |
| **Total** | **163 tests** | ✅ todos pasan |

> ✅ (17/07/26) Los 12 tests que fallaban por el marcador `~~texto~~` (sistema de resaltado, desde `2c026f7`) fueron arreglados con un helper `sinTilde()` en el test file — quita solo `~~` antes de comparar contenido, sin tocar `**`/`__` que sí son parte de lo que esos tests verifican. Se aprovechó para también actualizar el test de `ESCRIBANO_REGISTRO_LETRAS` que esperaba el comportamiento viejo (pre fix #46).

---

## Funcionalidades Pendientes / Backlog

### ⚠️ Bugs activos

~~- [ ] **RLS expedientes insert**~~ ✅ Resuelto 8/6/26 — política `expedientes_acceso` (FOR ALL) reemplazada por SELECT/UPDATE/DELETE con ownership check + INSERT con `auth.uid() IS NOT NULL`; código usa `session.user.id`. Re-verificado 13/07/26 contra la base en vivo — sigue resuelto.
~~- [ ] **Scriba no completa extravars custom del template**~~ ✅ Resuelto 17/07/26 — nuevo tool `completar_extravars` (ver §Scriba (IA) y §API Serverless).
~~- [ ] **12 tests desactualizados en `templateVars.test.js`**~~ ✅ Resuelto 17/07/26 — ver §Tests.

### Features próximas (alta prioridad)

- [x] **Google OAuth producción** — ✅ en producción
- [ ] **Mejoras UI Scriba** — UX del panel de IA: historial de conversaciones, navegación, presentación de respuestas
- [ ] **Persistencia del chat de Scriba + aviso de respuesta pendiente** — no perder contexto al cerrar el panel; avisar en el globo si la respuesta llega mientras estaba cerrado. Pedido 13/07/26, sin diseñar.
- [🔄] **Landing page** — `public/landing.html` se modificó fuerte el 13/07/26 (135 líneas), estado de avance sin confirmar

### Features mediano plazo

- [ ] **Insertar en OO confirmado** — validar end-to-end cuando el servidor OO esté estable (fix ya deployado, pendiente confirmación)
- [ ] **Guardado de ediciones OO** — persistir los cambios hechos en OO de vuelta a Supabase (callback de OO → Supabase Storage)
- [x] **Calculador de presupuesto notarial** — ✅ implementado y actualizado (25-26/06/26) — `PresupuestoNotarial.jsx` en `/herramientas`. Cubre 20+ actos. Datos: Ley 5053-8100 (honorarios, vigente 25-03-26), Ley Imp. 9680 (sellos 2% inm / 1% gral), Tasas Registro con tramos reales (COD 620-628), tasas municipales 18 departamentos (planilla Colegio Feb 2026), Aportes Colegio 0,4% mín $108.450 (desde 01-07-26). Permite edición manual de valores con override/restaurar. Pendiente: **revisión de datos por la escribana** — ver `scripts/datos_sensibles.md`.
- [x] **Calculadora CUIT/CUIL standalone** — ✅ (13/07/26) `CalculadoraCuit.jsx` en `/herramientas`, además de la que ya usaba Scriba internamente
- [ ] **Revisión datos presupuesto** — la escribana debe verificar los valores marcados ⚠️ en `scripts/datos_sensibles.md`, especialmente: LLANA ($9.000/hoja), DILIGENC_FIJ ($135.000 + 0,2%), ESTUDIO_FIJ ($135.000 + 0,3%), herencia/declaratoria (actualmente a mínimo fijo, posiblemente incorrecto), afectación bien de familia (Art. referenciado puede estar mal).
- [ ] **Sync requirentes CRM** — botón "Sincronizar" en ModalPartes (placeholder visible, sin backend)
- [ ] **F04 model** — plantilla F-04 (diferente a F-08; `ModalFormulario` ya tiene el selector)
- [ ] **Informe de Dominio** — nueva card en `HerramientasScreen` (familia Automotor), estado "próximo", sin implementar

### Sistema de recordatorios para datos sensibles

La plataforma tiene datos que cambian periódicamente (aranceles, sellos, tasas). El inventario completo está en `scripts/datos_sensibles.md`.

**Cadencias a seguir:**
| Fuente | Cadencia | Mes clave |
|--------|----------|-----------|
| Ley Impositiva Mendoza (ATM) — sellos y tasas registro | Anual | Diciembre |
| Tabla honorarios — Colegio de Escribanos | Trimestral | Mar, Jun, Sep, Dic |
| Planilla reparticiones municipales — Colegio | Trimestral | Mar, Jun, Sep, Dic |
| Cartilla aportes — Colegio | Al publicarse | — |
| Normativa ARCA/AFIP (ITI/retenciones) | Al publicarse | — |

**Implementación propuesta (backlog):**
- [ ] **Indicador de datos frescos** — mostrar en el presupuesto (solo admin) "Datos al: [fecha]" con warning si > 90 días. La fecha se hardcodea en las constantes del archivo.
- [ ] **Recordatorio trimestral automatizado** — usar `/schedule` para crear un agente cloud que alerte en marzo/junio/septiembre/diciembre que hay que pedir tabla actualizada al Colegio.

### Features largo plazo / baja prioridad

- [ ] **Estimador DNRPA** — cálculo de costos transferencia automotor; pausado
- [ ] **Tutorial/onboarding liviano** — primer flujo guiado para nuevos usuarios
- [ ] **Más modelos de Fátima** — subir plantillas adicionales con el texto real de la escribana
- [ ] **Plantillas por registro (ModeloScreen)** — edición de plantillas HTML custom por registro
- [ ] **Panel admin completo** — AdminScreen básico, sin gestión de plantillas ni usuarios

---

## Base de Datos (Supabase)

**Proyecto:** `eueqluhhgvukovoyorrw.supabase.co`

### Tablas Principales

| Tabla | Propósito |
|---|---|
| `usuarios` | Perfil de usuario + link a `auth.users` + registro asignado |
| `registros` | Oficinas notariales (número de registro, nombre, miembros) |
| `documentos` | Documentos guardados con contenido, estado, partes (JSONB) |
| `personas` | Directorio de requirentes (DNI, apellido, nombre) — con RLS por registro |
| `templates` | 50+ plantillas base por tipo de instrumento |
| `scriba_conversaciones` | Historial de conversaciones IA (mensajes JSONB + contexto) |
| `clausulas_biblioteca` | Cláusulas opcionales globales por template |
| `clausulas_registro` | Cláusulas custom por registro |
| `expedientes` | Expedientes notariales (nombre, tipo_acto, estado, usuario_id, registro_id) |
| `expediente_documentos` | Vinculación N:M entre documentos y expedientes |
| `expediente_archivos` | Metadata de archivos en Google Drive por expediente |
| `error_logs` | Errores JS/React capturados globalmente (17/07/26) |
| `scriba_logs` | Log de cada llamada a `/api/scriba` (input, respuesta, duración, error) |
| `feedback_reports` | Feedback de escribanos vía `FeedbackButton` (error/sugerencia/consulta) |

### RLS (Row Level Security)

Todas las tablas usan RLS con `auth.uid()`. Las consultas desde serverless (Vercel) deben pasar el JWT del usuario vía `Authorization: Bearer <token>`.

**Expedientes — política actual:**
```sql
-- SELECT/UPDATE/DELETE: usuario_id = auth.uid() OR registro tiene ese usuario como miembro
-- INSERT: solo exige auth.uid() IS NOT NULL (no valida usuario_id — el código ya lo manda bien)
```

✅ Verificado 13/07/26 directo contra Supabase: no hay bug activo. `ExpedientesScreen.jsx` y `ModalAgregarExpediente.jsx` mandan `usuario_id` correctamente en el insert, y las políticas en vivo ya están separadas por comando (select/update/delete con ownership + insert laxo).

> ⚠️ Hallazgo (13/07/26): varias tablas (`usuarios`, `registros`, `personas`, `documentos`) tienen **dos generaciones de políticas RLS conviviendo** — viejas (pre-helpers `es_admin()`/`mi_registro()`) sin dropear cuando se agregaron las nuevas. Es redundancia inofensiva (políticas permisivas se combinan con OR), no bloquea nada, pero sería prolijo limpiarla en algún momento. Ver `scripts/rls_completo.sql`.
>
> En `templates` había además un riesgo real: la política vieja `"templates globales o de su registro"` era `FOR ALL` sin chequear `es_admin()`, anulando en la práctica la restricción de "solo admin escribe". **Resuelto 17/07/26** — se dropeó esa política en producción; hoy solo `es_admin()` puede escribir en `templates`. (De todos modos, hoy no hay ninguna pantalla en la app que edite `templates` — ni `ModeloScreen` ni `BulkScreen` lo tocan, solo leen; ese editor trabaja sobre la tabla `templates_barrio`, que es otra cosa.)

**Scripts SQL relevantes:**
- `scripts/crear_expedientes.sql` — esquema completo de expedientes
- `scripts/fix_rls_expedientes.sql` — política sin recursión infinita

---

## API Serverless

### `api/scriba.js`

Endpoint: `POST /api/scriba`  
Timeout: 60s (maxDuration en Vercel)

**Tools de Claude disponibles:**

| Tool | Qué hace |
|---|---|
| `abrir_editor` | Navega a SelectorScreen con template + partes + fecha pre-cargados |
| `buscar_personas` | Busca en tabla `personas` por DNI o nombre |
| `buscar_documentos` | Busca en tabla `documentos` del registro (incluye `id` desde 17/07/26) |
| `leer_documento` | (17/07/26) Trae el texto completo reconstruido de un documento guardado, dado su `id` — usar tras confirmar con `buscar_documentos` |
| `insertar_en_documento` | Devuelve texto limpio para insertar en OO abierto |
| `modificar_documento` | Reemplaza el contenido completo del documento (preserva `{{VARIABLES}}`) |
| `completar_extravars` | (17/07/26) Setea campos propios del template (precio, seña, plazo, etc.) — usa los nombres exactos de `templateVarsSchema`, pasados en `contexto.camposExtra` |

**Adjuntos (17/07/26):** `documentos_adjuntos` en el body — array de `{data, mediaType, nombre}` PDFs enviados como bloques `type:"document"` nativos de Anthropic, para contexto de redacción libre (reemplazó el camino viejo de `imagen` que estaba muerto — el frontend nunca llegaba a mandarlo a este endpoint, siempre desviaba a `/api/vision`).

**Optimización:** El system prompt usa Prompt Caching de Anthropic (`cache_control: ephemeral`) — la primera llamada tarda ~2s, las siguientes ~200ms para el mismo system prompt.

### `api/vision.js`

Endpoint: `POST /api/vision`  
Timeout: 30s  
Modelo: Claude Sonnet (mejor OCR que Haiku)

Detecta automáticamente si la imagen es DNI (frente/dorso) o tarjeta verde/título automotor. Extrae:
- DNI: apellido, nombre, sexo, fecha_nac (desde MRZ), domicilio (separando barrio de localidad), departamento, provincia (por inferencia de código)
- Tarjeta verde frente: marca, modelo, tipo, dominio, chasis, motor, año
- Tarjeta verde dorso: titular + autorizado con roles sugeridos

---

## Google Drive Integration

**Scope:** `https://www.googleapis.com/auth/drive.file` (mínimo necesario — solo archivos creados por la app)

**Helper:** `src/utils/driveHelper.js`

| Función | Qué hace |
|---|---|
| `crearCarpetaDrive(session, nombre, parentId?)` | Crea carpeta en Drive del escribano |
| `buscarCarpetaDrive(session, nombre, parentId?)` | Busca carpeta por nombre; devuelve id o null |
| `buscarOCrearCarpetaDrive(session, nombre, parentId?)` | Busca primero; crea solo si no existe |
| `subirArchivoDrive(session, file, nombre, tipo, carpetaId?)` | Sube archivo a la carpeta |
| `listarArchivosDrive(session, carpetaId)` | Lista archivos de la carpeta |
| `urlDescargaDrive(fileId)` | URL de descarga pública |
| `eliminarArchivoDrive(session, fileId)` | Elimina archivo |

**Diseño:** Drive es por escribano (cada usuario tiene su propio Drive). Supabase almacena los DOCX y su metadata (compartido por el registro). Los archivos de fotos/escaneos/PDFs de expedientes van a Drive.

**Estructura de carpetas:** `Mi Drive/Notarial/[nombre del expediente]/` — la carpeta raíz "Notarial" se crea una sola vez; cada expediente tiene su subcarpeta. El `drive_folder_id` se persiste en `expedientes.drive_folder_id` para evitar búsquedas repetidas.

**provider_token:** Solo llega en el evento SIGNED_IN inicial de Supabase. Se persiste en `localStorage` en `AuthContext` y se reinyecta en sesiones restauradas.

---

## Plugin OnlyOffice

**Ubicación:** `public/oo-plugin/`  
**GUID:** `asc.{8f3e2a91-4c7d-4b9e-a123-5f6e7d8c9b0a}`  
**Tipo:** `panelRight` (panel lateral derecho dentro del editor OO)

El plugin muestra las propiedades del acto y permite regenerar el documento. Comunicación via `postMessage` a `window.top`.

**Fixes implementados:**
- `callbackUrl` configurado para que OO no muestre dialog "cambios sin guardar"
- Fallback de ready cuando WebSocket falla (timeout 3s)
- `EventTarget.prototype.addEventListener` override en `OnlyOfficeEditor` para suprimir `beforeunload`
- `stopImmediatePropagation()` en el handler de `beforeunload`

---

## Servidor OnlyOffice

> ⚠️ El servidor tiene inestabilidad frecuente — es el problema bloqueante principal.

**URL:** `https://onlyoffice.notarial.lat`  
**Versión:** OnlyOffice Docs **9.3.1** (build 10, mayo 2026)  
**Hardware:** Lenovo IdeaPad S145 — Ubuntu, 4 GB RAM soldada  
**Deployment:** Docker con `restart: always`

**Causa de inestabilidad:** Ubuntu consume ~1.5 GB, OO ~2.5 GB → OOM kill.  
**Fix definitivo:** módulo SO-DIMM 8 GB DDR4 (~$25 USD) → 12 GB total.

---

## Configuración y Variables de Entorno

### Frontend (`notarial/.env.local`)
```
VITE_ONLYOFFICE_URL=https://onlyoffice.notarial.lat
```

### Backend (`api/scriba.js` — hardcodeado)
- Supabase URL + Anon Key
- Anthropic API Key

> ⚠️ Para producción mover keys a variables de entorno de Vercel.

---

## Desarrollo Local

```bash
npm install
npm run dev       # Vite dev server en localhost:5173
npm run test      # Vitest (163 tests, 12 desactualizados — ver §Tests)
npm run build     # Build de producción
```

Deploy automático en Vercel al hacer push a `main`.

> ⚠️ El remote de GitHub (`lojedanotarial-spec/notarial.git`) requiere la cuenta `gh` **`lojedanotarial-spec`**, no la de trabajo (`lojeda-simpli`) — esa no tiene permiso de push a este repo. Si `git push` da 403, correr `gh auth switch --hostname github.com --user lojedanotarial-spec`.

---

## Identidad de Marca

**Nombre del producto:** Notarial  
**Asistente IA:** Scriba  
**Tagline:** *Fe Pública Digital* (itálica, title case)

### Paleta de colores (en `src/constants.js` — objeto `C`)

| Token | Hex | Uso |
|---|---|---|
| `dark` | `#1a2332` | Texto principal, fondos oscuros |
| `gold` | `#c9a961` | Acento dorado, Scriba, highlights |
| `cerulean` | `#3a7ca5` | Azul interactivo, links |
| `ceruleanLight` | `#e8f2f8` | Fondos azul claro |
| `warm` | `#e8e3d8` | Fondo principal de la app |
| `porcelain` | `#FDFCFA` | Fondo de cards y superficies |
| `danger` | `#c0392b` | Errores, variables vacías |
| `muted` | `rgba(26,35,50,.45)` | Texto secundario |

### Tipografía

| Fuente | Uso | Pesos |
|---|---|---|
| **Inter** | UI completa (botones, inputs, texto) | 400, 500, 600 |
| **Montserrat** | Marca, títulos, navbar | 400, 500, 600 |
| **Merriweather** | Documentos notariales (fuente por defecto) | 400, 700, italic |
| **Times New Roman** | Opción de fuente para documentos | sistema |

---

## Decisiones de Diseño

### Lo que hacemos
- **Inline CSS con tokens**: sin CSS-in-JS ni frameworks. Paleta en `src/constants.js`.
- **Un serverless para IA**: toda la lógica de Claude va por `api/scriba.js` — API key fuera del frontend.
- **OCR dedicado**: `api/vision.js` separado de Scriba para evitar timeout en Hobby plan de Vercel.
- **Plugin OO para propiedades**: las propiedades del acto viven en el panel lateral del documento.
- **JWT del usuario al serverless**: obligatorio para respetar RLS de Supabase (`auth.uid()`).
- **Drive por escribano, Supabase por registro**: archivos de escaneo/fotos en Drive personal; documentos DOCX en Supabase compartido por el registro.

### Lo que NO hacemos (decisiones explícitas)
- **No TypeScript**: JavaScript puro con JSX.
- **No React Router**: navegación como estado de React en `App.jsx`.
- **No componentes de UI externos** (MUI, Tailwind): todo custom.
- **No ORM**: queries directas con Supabase JS client.
- **No server-side rendering**: SPA pura + serverless functions.

---

## Historial de Features (cronológico)

1. UI base de Scriba (botón flotante, avatar)
2. Scriba genera instrumentos completos (system prompt + max_tokens)
3. Contexto del documento activo enviado a Scriba
4. Scriba abre el editor con el template correcto (`abrir_editor`)
5. Persistencia de conversaciones en Supabase
6. Fix RLS: pasar JWT del usuario al serverless
7. Pre-cargar partes y fecha cuando Scriba abre el editor
8. Builder genérico con sistema `{{VAR}}`, negrita `**` y subrayado `__`
9. Scriba lee documentos — upload imagen, extrae datos, completa partes (Vision)
10. Resaltado de variables (vacías rojo, completas negro) en el editor
11. Tool `modificar_documento` — Scriba modifica el documento completo
12. Prompt caching en Scriba (~90% reducción de latencia)
13. Roles contextuales por template en ModalPartes
14. ModalVehiculos — flota de vehículos, escaneo tarjeta verde
15. `autorizacion_vehiculo` template + variables de flota
16. Escaneo múltiple frente+dorso en un click con merge progresivo
17. Múltiples autorizantes con concordancia singular/plural
18. Tildes en nombres propios (`tildesNombres.js`)
19. Campos barrio/manzana/casa en PartesEditor
20. `buildInterviene.js` — bloque INTERVIENE unificado PF/PJ para F08 y genérico
21. `cert_firma_f08` reescrito al texto de Fátima (orden VENTA/COMPRA, INTERVIENE para apoderados)
22. `ModalFormulario` — selector F-08 / F-08 Moto / F-04
23. Domicilio todo texto libre + Provincia + País en PartesEditor
24. `titleCaseDomicilio()` y `inferirProvincia()` por código
25. Barra de progreso animada en escaneo de documentos
26. `ModalFormato` expandido — toggles negrita/subrayado/mayúsculas/registro; botón en navbar
27. 3 opciones de formato de nombres (Nombre Apellido / Nombre APELLIDO / NOMBRE APELLIDO)
28. Expedientes — esquema SQL, Drive OAuth, `driveHelper.js`
29. `ExpedientesScreen` — lista, filtros, crear nuevo
30. `ExpedienteDetailScreen` + `ModalAgregarExpediente` — vincular docs, archivos Drive
31. Renderizado de markdown en respuestas de Scriba
32. Normativa exhaustiva Mendoza 2024-2026 en system prompt de Scriba
33. Fix `VARS_BOLD_DYN` — `parsearSegmentos` refactorizado a función de módulo con parámetros `boldVars`/`underlineVars`; defaults a los sets de módulo
34. `provider_token` persistence — persiste en `localStorage` al SIGNED_IN; se reinyecta en sesiones restauradas (Supabase solo lo entrega en el evento inicial)
35. Drive folder structure — `buscarOCrearCarpetaDrive()` crea `Mi Drive/Notarial/[expediente]/`; `drive_folder_id` cacheado en `expedientes` para evitar búsquedas repetidas
36. `ModalAgregarExpediente` rediseño — detecta si el doc ya está vinculado; estado "vinculado" muestra expedientes con "Ver →"; "Vincular a otro" colapsable
37. Flow 2 — ícono de carpeta por fila en HomeScreen; cerulean relleno (vinculado) / borde sin relleno (sin vincular); tooltip dinámico; filtro "Con expediente / Sin expediente" en sidebar
38. Slogan *Fe Pública Digital* — itálica, title case, color muted en navbar y login
39. Fix RLS `expedientes` INSERT — política FOR ALL dividida en SELECT/UPDATE/DELETE (ownership) + INSERT (`auth.uid() IS NOT NULL`); código usa `session.user.id`
40. Removido campo `tipo_acto` de la UI de expedientes (modal y sidebar) — sigue existiendo en DB pero no se usa
41. Flow 3 — `ModalVincularDoc` en `ExpedienteDetailScreen`: busca 300 docs con búsqueda full-text (título, partes, DNI), chips por tipo de template, dropdown de fecha (semana/mes/trimestre), contador "X de Y documentos"
42. Auto-nombre de expediente — `nombreExpediente` calculado en `EditorScreen` desde apellidos de partes + label de template (ej. "Cert. firma — OJEDA / LUCAS"); `sinFecha()` en HomeScreen strips la fecha del título para el sugerido
43. `HerramientasScreen` — pantalla de utilidades con grid de herramientas categorizadas (Automotor/General/Identidad); badges de estado "Disponible" / "Próximamente"
44. HomeScreen rediseño — layout 3 columnas: FILTROS (izq, 210px) · DOCUMENTOS (centro) · UTILIDADES (der, 192px); panel derecho con 4 cards de herramientas + "Ver todas →"; títulos de sección FILTROS / DOCUMENTOS
45. Admin movido al avatar dropdown (solo visible para is_admin); removido botón Admin y botón Utilidades del navbar
46. Fix `ESCRIBANO_REGISTRO_LETRAS` — `parseInt("0000") = 0`, `!0 = true` retornaba `""`. Fix: `if (!n) return raw` (devuelve el string crudo en lugar de vacío)
47. Admin registro cambiado de "0000" a "9876" — Fabián McLeod; registro test más realista
48. Admin flow rediseñado — Admin loguea directo a HomeScreen (no AdminScreen); muestra "Registro 9876" bajo el saludo; botón "Cambiar registro" en header solo para `esAdmin`; AuthContext auto-carga `registroActivo` desde `registros_id` del usuario
49. `cert_firma` — ocultar "Función en el acto" en ModalPartes (`showRol={false}` en EditorScreen); quitar "el que firma en su carácter de ****" del bloque `PARTES_CF_BLOQUE`
50. `showVarHighlight` movido de NavBar muerto a ModalFormato — toggle "Marcar variables faltantes en rojo"; ahora vive en el objeto `estilos` y llega a `buildDocxGenerico`
51. Marcador `~~texto~~` — nuevo marcador en `parsearSegmentos`: `fromUser = true` → color azul (2E75B6) cuando `showVarHighlight`. Permite distinguir datos del usuario (azul) de variables vacías (rojo) en el documento
52. `~~...~~` aplicado a todos los constructores de bloque — `PARTES_CF_BLOQUE`, `PARTES_F08_BLOQUE`, `AUTORIZANTE_TEXTO` (`fmtPersonaAut`), `AUTORIZADOS_TEXTO` (`fmtAut`), `PARTE_N_IDENTIDAD`, `PARTE_N_IDENTIDAD_ACTA` — todos envuelven nombre, nac, DNI, CUIT, fechaNac, estadoCivil, domicilio, rol, acta, libro con `~~`
53. Fix bug resaltado — `~~~~` (valor vacío envuelto en `~~`) causaba que el motor de regex spanneara todo el texto siguiente como `fromUser`. Fix doble: regex con lookbehind/lookahead `(?<!~)~~(?!~)` + guard en emisión (`valor ? \`~~${valor}~~\` : ""`) para DNI, rol, acta, libro vacíos
54. Estilo resaltado cambiado de texto azul a **fondo amarillo nativo Word** (`highlight: "yellow"` en TextRun) — visible en regular e itálica, independiente del peso de fuente
55. `showVarHighlight` default cambiado a `false` — el documento sale limpio por defecto; el usuario activa el resaltado desde Formato cuando lo necesita
56. Fix bug ModalFormulario — `formulario` no estaba en el array de deps del useEffect que dispara auto-regeneración; guardar el formulario F-08 no regeneraba el documento
57. Fix F08 — `extravars` se spreadeaba DESPUÉS de `NUMERO_FORMULARIO`/`DOMINIO`/`TIPO_FORMULARIO` en `EditorScreen.jsx` y los pisaba silenciosamente; ahora va primero, los datos del formulario ganan
58. Fix auto-generate al montar — antes disparaba a los 800ms fijo sin esperar datos; ahora espera a que `templateContenido` llegue de Supabase y (admin) a que carguen los `miembros` del registro, evitando generar con variables vacías/stale
59. Sistema de logs — `logger.js` (`logError`/`logScriba`/`logFeedback`), `LogsScreen` (admin, 3 tabs), `ErrorBoundary` (fallback global), `FeedbackButton` (flotante global) — tablas `error_logs`/`scriba_logs`/`feedback_reports`
60. `robots.txt` + `<meta name="robots" content="noindex,nofollow">` en `index.html` — la app privada (`/app`) no debe indexarse en buscadores; landing (`/`) y `/privacidad` sí
61. Herramientas — `PresupuestoNotarial.jsx` y `CalculadoraCuit.jsx` activas en `/herramientas`; "Informe de Dominio" agregado como card "próximo"
62. Limpieza — eliminados `buildDocxCertFirmaF08` y los templates `certFirma.js`/`certFirmaF08.js` (muertos tras la unificación a `buildDocxGenerico` de la sesión anterior); `TEMPLATES` sin uso removido de `constants.js`
63. Scriba — múltiples DNI/tarjetas verdes en un mensaje: `ScribaPanel.jsx` fusiona N resultados de `/api/vision` (fan-out secuencial con progreso "Escaneando i/N") en un solo `completar_parte` con dedup por DNI; vehículo con regla primer-no-vacío-gana (mismo patrón que `ModalVehiculos.jsx`)
64. Scriba — PDFs de contexto: botón separado del escaneo de identidad; `api/scriba.js` reemplaza el camino muerto de `imagen` por `documentos_adjuntos` → bloques `type:"document"` nativos de Anthropic; validación de tamaño client-side (~2.4MB, límite de body de Vercel Hobby)
65. Scriba — tool `leer_documento`: reconstruye el texto completo de un acto guardado reusando `buildVars`/`sustituirVars` de `templateVars.js` desde el serverless; requiere confirmar el documento con `buscar_documentos` primero
66. Fix imports sin extensión (`"../utils"`, `"./buildInterviene"`, `"./constants"`) en `templateVars.js`/`utils.js` — Vite los tolera pero Node/Vercel no los resuelve (confirmado con smoke test real); agregadas extensiones `.js` explícitas, sin cambios de comportamiento en el browser
67. RLS — auditoría completa contra la base en vivo: bug de insert en expedientes ya estaba resuelto (doc desactualizada); encontradas 2 generaciones de políticas conviviendo en 5 tablas; dropeada política vieja de `templates` que anulaba el chequeo de `es_admin()` en escritura
68. Scriba — tool `completar_extravars`: permite completar precio/seña/plazo/cláusulas y demás campos propios del template (antes imposible, `modificar_documento` preserva `{{VARIABLES}}` a propósito); contexto activo incluye `camposExtra` con los nombres exactos de `templateVarsSchema`
69. Fix 12 tests desactualizados en `templateVars.test.js` — helper `sinTilde()` para no acoplar los tests de contenido al marcador `~~` de resaltado; actualizado también el test de `ESCRIBANO_REGISTRO_LETRAS` al comportamiento correcto post fix #46

---

## Sistema de marcadores en constructores de texto

Regla: **todo constructor de bloque que incluya datos del usuario debe envolver cada valor con `~~valor~~`.**

| Marcador | Seg. resultado | Efecto con showVarHighlight |
|----------|----------------|----------------------------|
| `**texto**` | `bold: true` | — |
| `__texto__` | `underline: true` | — |
| `~~texto~~` | `fromUser: true` | fondo amarillo (`highlight: "yellow"`) |
| `{{VAR}}` vacía | `emptyVar: true` | texto rojo (C0392B) |
| `{{VAR}}` con valor | `fromVar: true` | — |

**Nota regex:** La regex usa `(?<!~)~~(?!~)(.+?)(?<!~)~~(?!~)` con lookbehind/lookahead para evitar que `~~~~` (valor vacío) cause falsos matches que pintan todo el bloque. Los valores potencialmente vacíos (DNI, rol, acta, libro) también tienen guard en emisión: `val ? \`~~${val}~~\` : ""`.

Los marcadores son anidables: `~~**__Juan PÉREZ__**~~` = bold + underline + azul.

Constructores que deben usar `~~` (todos implementados al 24/06/26):
- `PARTES_CF_BLOQUE` — cert_firma
- `PARTES_F08_BLOQUE` — F08/F08-Moto
- `AUTORIZANTE_TEXTO` (via `fmtPersonaAut`)
- `AUTORIZADOS_TEXTO` (via `fmtAut`)
- `PARTE_N_IDENTIDAD`
- `PARTE_N_IDENTIDAD_ACTA`

---

*Este documento se mantiene manualmente. Actualizar al cerrar features o tomar decisiones de arquitectura.*
