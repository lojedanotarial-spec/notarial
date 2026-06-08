# Notarial v2 — Documentación de Proyecto

> Última actualización: 8 junio 2026

---

## Qué es esto

Sistema de gestión y generación de documentos notariales para escribanos argentinos. Permite redactar, editar y exportar instrumentos notariales con asistencia de IA (Scriba), integración con OnlyOffice para edición DOCX profesional, base de datos de requirentes, biblioteca de plantillas y gestión de expedientes con Drive.

Desarrollado para escribanos de Mendoza; orientado inicialmente al Registro 0000 (admin/test) y escalable a múltiples registros.

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
| `HomeScreen` | default tras login | Dashboard con documentos recientes del registro; botón Expedientes |
| `SelectorScreen` | "Nuevo documento" | Selector de plantilla por familia (cert, poder, acta, escritura, autorizaciones...) |
| `EditorScreen` | al elegir plantilla | Editor principal: OO + panel de datos + Scriba |
| `ExpedientesScreen` | desde HomeScreen | Lista de expedientes con filtros por estado; crear nuevo expediente |
| `ExpedienteDetailScreen` | desde ExpedientesScreen | Dos tabs: Documentos (Supabase) + Archivos Drive; editar nombre/notas/estado |
| `BulkScreen` | "Lote" | Generación masiva de escrituras para subdivisiones |
| `ModeloScreen` | admin | Editor visual de plantillas HTML por registro |
| `AdminScreen` | admin | Gestión de registros (escribanos) |
| `LoteDocScreen` | desde BulkScreen | Formulario de medidas catastrales para cada lote |

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
| Builder genérico con sistema de variables `{{VAR}}` | ✅ | `buildDocxGenerico.js` — parsea `**bold**`, `__underline__`, `{{VAR}}` |
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
| Vincular docs existentes a expediente desde ExpedientesScreen | ❌ | Flow 3 — pendiente |

**Tablas de expedientes:**
- `expedientes` — id, nombre, tipo_acto, registro_id, usuario_id, estado, notas
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
| Respuestas en streaming | ✅ | `claude-opus-4-5` por defecto |
| Generar instrumentos notariales completos | ✅ | max_tokens elevado; conoce 50+ plantillas |
| Contexto del documento activo | ✅ | Recibe partes, fecha, protocolo, instrumento, vehiculos del editor |
| Abrir editor desde Scriba (tool use) | ✅ | `abrir_editor` abre SelectorScreen con template correcto |
| Pre-cargar partes y fecha desde Scriba | ✅ | EditorScreen acepta `params.partes` y `params.fecha` |
| Completar parte con posición exacta | ✅ | `parte_index` permite a Scriba posicionar partes exactas |
| Modificar documento completo | ✅ | Tool `modificar_documento` + btn "Aplicar" |
| Leer DNI/documento con foto | ✅ | Sube imagen → Claude Vision extrae datos → completa partes |
| Consultar personas del registro | ✅ | `buscar_personas` con RLS y JWT del usuario |
| Consultar documentos del registro | ✅ | `buscar_documentos` |
| Persistencia de conversaciones | ✅ | Tabla `scriba_conversaciones` en Supabase |
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
| Resaltado de variables (vacías en rojo, completas en negro) | ✅ |
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

### Tests

| Suite | Tests | Estado |
|---|---|---|
| `utils.test.js` | Cálculo CUIL, CIENTO, regex estado civil | ✅ |
| `localHandler.test.js` | Handler local Scriba (estado civil, rol, extendidos) | ✅ |
| `tildesNombres.test.js` | Lookup tildes en nombres propios | ✅ |
| `templateVars.test.js` | Variables de plantilla, ROL uppercase, nombres | ✅ |
| **Total** | **35 tests** | ✅ todos pasan |

---

## Funcionalidades Pendientes / Backlog

### ⚠️ Bugs activos

~~- [ ] **RLS expedientes insert**~~ ✅ Resuelto 8/6/26 — política `expedientes_acceso` (FOR ALL) reemplazada por SELECT/UPDATE/DELETE con ownership check + INSERT con `auth.uid() IS NOT NULL`; código usa `session.user.id`.

### Features próximas

- [ ] **Flow 3 — ExpedientesScreen** — desde el detalle de expediente, vincular documentos existentes (buscar/seleccionar docs de Supabase) y editar nombre/tipo_acto/estado del expediente
- [ ] **Landing page + Google OAuth producción** — página de inicio pública con descripción del producto + privacy policy; necesaria para que Google apruebe el OAuth en producción (actualmente en modo test)
- [ ] **Auto-nombre de expediente** — generar nombre sugerido desde partes + tipo_acto al crear expediente desde el editor
- [ ] **Historial de conversaciones Scriba** — listar y cargar conversaciones previas desde Supabase (tabla `scriba_conversaciones` ya existe)

### Features mediano plazo

- [ ] **Insertar en OO confirmado** — validar end-to-end cuando el servidor OO esté estable (fix ya deployado, pendiente confirmación)
- [ ] **Guardado de ediciones OO** — persistir los cambios hechos en OO de vuelta a Supabase (callback de OO → Supabase Storage)
- [ ] **Calculador de presupuesto** — calcular sellos ATM + honorarios desde valor del acto
- [ ] **Sync requirentes CRM** — botón "Sincronizar" en ModalPartes (placeholder visible, sin backend)
- [ ] **F04 model** — plantilla F-04 (diferente a F-08; `ModalFormulario` ya tiene el selector)

### Features largo plazo

- [ ] **Tutorial/onboarding liviano** — primer flujo guiado para nuevos usuarios
- [ ] **Más modelos de Fátima** — subir plantillas adicionales con el texto real de la escribana
- [ ] **Plantillas por registro (ModeloScreen)** — edición de plantillas HTML custom por registro
- [ ] **Panel admin completo** — AdminScreen básico, sin gestión de plantillas ni usuarios
- [ ] **Google test users** — agregar usuarios cuando sea necesario; Fátima ya está habilitada

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

### RLS (Row Level Security)

Todas las tablas usan RLS con `auth.uid()`. Las consultas desde serverless (Vercel) deben pasar el JWT del usuario vía `Authorization: Bearer <token>`.

**Expedientes — política actual:**
```sql
-- SELECT/UPDATE/DELETE: usuario_id = auth.uid() OR registro tiene ese usuario como miembro
-- INSERT: requiere usuario_id = auth.uid() en el body de la insert
```

> ⚠️ Hay un bug activo: las inserts en ExpedientesScreen y ExpedienteDetailScreen no incluyen `usuario_id`, causando RLS violation. Fix pendiente: agregar `usuario_id: (await supabase.auth.getUser()).data.user?.id`.

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
| `buscar_documentos` | Busca en tabla `documentos` del registro |
| `insertar_en_documento` | Devuelve texto limpio para insertar en OO abierto |
| `modificar_documento` | Reemplaza el contenido completo del documento |

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
npm run test      # Vitest (35 tests)
npm run build     # Build de producción
```

Deploy automático en Vercel al hacer push a `main`.

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

---

*Este documento se mantiene manualmente. Actualizar al cerrar features o tomar decisiones de arquitectura.*
