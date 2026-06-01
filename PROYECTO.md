# Notarial v2 — Documentación de Proyecto

> Última actualización: 27 mayo 2026

---

## Qué es esto

Sistema de gestión y generación de documentos notariales para escribanos argentinos. Permite redactar, editar y exportar instrumentos notariales con asistencia de IA (Scriba), integración con OnlyOffice para edición DOCX profesional, base de datos de requirentes y biblioteca de plantillas.

Desarrollado para escribanos de Mendoza; orientado inicialmente al Registro 0000 (admin/test) y escalable a múltiples registros.

---

## Stack Técnico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + Vite | 19.2.4 / 8.x |
| Editor de texto | TipTap | 3.22.3 |
| Editor DOCX | OnlyOffice Docs | 9.3.1 (Community) |
| Backend | Vercel Serverless (Node.js) | — |
| Base de datos | Supabase (PostgreSQL) | 2.105.1 |
| IA | Anthropic Claude API | SDK 0.98.0 |
| Generación DOCX | docx | 9.6.1 |
| Estilos | CSS inline + design tokens | — |
| Auth | Supabase Auth (email + Google OAuth) | — |

---

## Arquitectura

```
notarial.lat (Vercel)
├── src/                  React SPA (frontend)
│   ├── screens/          Pantallas principales
│   ├── components/       Componentes reutilizables
│   ├── hooks/            Hooks de estado/lógica
│   ├── utils/            Generación de DOCX, exportación
│   ├── context/          AuthContext (sesión global)
│   ├── constants.js      Tokens de diseño, constantes de app
│   └── supabase.js       Cliente Supabase (anon key)
├── api/
│   └── scriba.js         Serverless: integración Claude API
└── public/oo-plugin/     Plugin OO (panel lateral "Propiedades")

onlyoffice.notarial.lat   OnlyOffice Docs (externo, ver §Servidor OO)

supabase.co               Base de datos Supabase (ver §Base de Datos)
```

**Flujo de datos principal:**
1. Usuario edita partes/fecha/protocolo en el panel izquierdo de EditorScreen
2. EditorScreen genera un DOCX con `buildDocxCertFirmaF08` / `buildDocx`
3. El archivo se sube a Supabase Storage y OO recibe la URL firmada
4. OO carga el documento y permite edición DOCX nativa
5. El plugin OO (panelRight) muestra las propiedades y permite regenerar
6. Scriba (Claude) puede generar texto y "insertarlo" en el documento abierto

---

## Pantallas

| Pantalla | Ruta/acción | Qué hace |
|---|---|---|
| `LoginScreen` | — | Login email/contraseña y Google OAuth |
| `HomeScreen` | default tras login | Dashboard con documentos recientes del registro |
| `SelectorScreen` | "Nuevo documento" | Selector de plantilla por familia (cert, poder, acta, escritura...) |
| `EditorScreen` | al elegir plantilla | Editor principal: OO + panel de datos + Scriba |
| `BulkScreen` | "Lote" | Generación masiva de escrituras para subdivisiones |
| `ModeloScreen` | admin | Editor visual de plantillas HTML por registro |
| `AdminScreen` | admin | Gestión de registros (escribanos) |
| `LoteDocScreen` | desde BulkScreen | Formulario de medidas catastrales para cada lote |

---

## Funcionalidades Implementadas

### Scriba (IA)

Asistente de redacción notarial basado en Claude. Accesible desde cualquier pantalla como panel flotante.

| Feature | Estado | Notas |
|---|---|---|
| Respuestas en streaming | ✅ | `claude-opus-4-5` por defecto |
| Generar instrumentos notariales completos | ✅ | max_tokens elevado; conoce 50+ plantillas |
| Contexto del documento activo | ✅ | Recibe partes, fecha, protocolo, instrumento del editor abierto |
| Abrir editor desde Scriba (tool use) | ✅ | `abrir_editor` abre SelectorScreen con template correcto |
| Pre-cargar partes y fecha desde Scriba | ✅ | EditorScreen acepta `params.partes` y `params.fecha` |
| Consultar personas del registro | ✅ | `buscar_personas` con RLS y JWT del usuario |
| Consultar documentos del registro | ✅ | `buscar_documentos` |
| Persistencia de conversaciones | ✅ | Tabla `scriba_conversaciones` en Supabase |
| Fecha/hora actual en el system prompt | ✅ | `new Date()` inyectado en cada llamada |
| Botón "Copiar contenido" | ✅ | Copia markdown de la respuesta al portapapeles |
| Botón "Insertar en documento" | ⚠️ | Ver estado actual abajo |
| Historial de conversaciones en UI | ❌ | Pendiente: listado de conversaciones previas |

**Estado del botón "Insertar en documento":**
- Arquitectura: Scriba genera `accion.tipo = "insertar_texto"` con texto limpio → `BtnInsertar` dispara `CustomEvent("scriba:insertar")` → `EditorScreen` lo recibe → `postMessage` al plugin OO → plugin llama `callCommand`
- Bloqueante actual: el servidor OO cae con frecuencia; cuando el WebSocket de OO falla, el plugin panel nunca dispara `init` y `pluginWindowRef` queda en null
- Fix deployado (27/05/26): timeout fallback de 3s en el plugin + cola de inserción pendiente en EditorScreen
- Pendiente: confirmar que `callCommand` funciona cuando OO está estable

### Editor de Documentos

| Feature | Estado |
|---|---|
| OnlyOffice DOCX con edición nativa | ✅ |
| Generación de DOCX desde plantilla | ✅ |
| Autoguardado en Supabase | ✅ |
| Plugin OO "Propiedades del Acto" | ✅ |
| Regenerar documento desde plugin | ✅ |
| Múltiples fuentes (Merriweather, etc.) | ✅ |
| Márgenes protocolar / no protocolar | ✅ |
| Interlineado configurable | ✅ |
| Reconexión automática si OO cae | ✅ |
| Exportar DOCX directamente | ✅ |

### Personas / Requirentes

| Feature | Estado |
|---|---|
| Búsqueda por DNI y apellido | ✅ |
| Autocompletar en ModalPartes | ✅ |
| RLS por registro (Supabase) | ✅ |
| Sync desde CRM externo | ❌ (placeholder en UI) |

### Exportación

| Feature | Estado |
|---|---|
| Descarga DOCX individual | ✅ |
| Descarga ZIP lote (BulkScreen) | ✅ |
| Exportar HTML → DOCX | ✅ |

---

## Funcionalidades Pendientes / Backlog

Estas son ideas o requerimientos sin implementar aún:

- [ ] **Historial de conversaciones Scriba** — listar y cargar conversaciones previas desde Supabase
- [ ] **Insertar en OO confirmado** — validar end-to-end cuando el servidor OO esté estable
- [ ] **Buscar documentos en Scriba** — mostrar resultados de búsqueda en UI (tool `buscar_documentos` existe pero no tiene UI de resultado)
- [ ] **Sync requirentes CRM** — botón "Sincronizar" en ModalPartes (placeholder visible, sin backend)
- [ ] **Plantillas por registro (ModeloScreen)** — edición de plantillas HTML custom por registro
- [ ] **Notificaciones de estado** — feedback al usuario cuando OO no está disponible
- [ ] **Cláusulas adicionales** — tabla `clausulas_biblioteca` y `clausulas_registro` creadas en DB pero sin UI
- [ ] **Autenticación Google OAuth completa** — flujo parcialmente configurado
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
| `templates` | 50 plantillas base por tipo de instrumento |
| `scriba_conversaciones` | Historial de conversaciones IA (mensajes JSONB + contexto) |
| `clausulas_biblioteca` | Cláusulas opcionales globales por template |
| `clausulas_registro` | Cláusulas custom por registro |

### RLS (Row Level Security)

Todas las tablas usan RLS con `auth.uid()`. Las consultas desde serverless (Vercel) deben pasar el JWT del usuario vía `Authorization: Bearer <token>` — si no, devuelven 0 filas.

```js
// Correcto en api/scriba.js:
const sb = createClient(URL, ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${userToken}` } }
});
```

---

## API Serverless

### `api/scriba.js`

Endpoint: `POST /api/scriba`

**Body:**
```json
{
  "mensaje": "string",
  "mensajes_anteriores": [],
  "contexto": { "tipo": "redaccion|revision|consulta", ... },
  "registroId": "string",
  "userToken": "jwt"
}
```

**Tools de Claude disponibles:**

| Tool | Qué hace |
|---|---|
| `abrir_editor` | Navega a SelectorScreen con template + partes + fecha pre-cargados |
| `buscar_personas` | Busca en tabla `personas` por DNI o nombre |
| `buscar_documentos` | Busca en tabla `documentos` del registro |
| `insertar_en_documento` | Devuelve texto limpio para insertar en OO abierto |

**Respuesta:**
```json
{
  "respuesta": "string",
  "accion": {
    "tipo": "abrir_editor | insertar_texto | ...",
    "template": "...",
    "partes": [],
    "texto": "..."
  }
}
```

---

## Plugin OnlyOffice

**Ubicación:** `public/oo-plugin/`  
**GUID:** `asc.{8f3e2a91-4c7d-4b9e-a123-5f6e7d8c9b0a}`  
**Tipo:** `panelRight` (panel lateral derecho dentro del editor OO)  
**Versión mínima OO:** 7.3.3  

El plugin muestra las propiedades del acto (partes, fecha, protocolo, formato) y permite regenerar el documento. La comunicación con la app es via `postMessage` a `window.top`.

**Flujo de init:**
1. OO carga el plugin y llama `window.Asc.plugin.init()`
2. El plugin manda `{ type: "oo-plugin", action: "ready" }` a la app
3. La app responde con los datos del documento
4. Si OO no llama `init` en 3 segundos (por WebSocket failure), el plugin lo dispara solo (fallback)

---

## Servidor OnlyOffice

> ⚠️ El servidor tiene inestabilidad frecuente — es el problema bloqueante principal al 27/05/26.

**URL:** `https://onlyoffice.notarial.lat`  
**Versión:** OnlyOffice Docs **9.3.1** (build 10, mayo 2026)  
**Edición:** Community Edition (gratuita, single-server, sin HA)  
**Hardware:** Lenovo IdeaPad S145 con Ubuntu (servidor físico en oficina)  
**RAM:** 4 GB soldada + 1 slot SO-DIMM libre (puede ampliarse a 12 GB con módulo de 8 GB, ~$25 USD)  
**Deployment:** Docker  
**Proxy:** Cloudflare (Buenos Aires PoP — EZE)  
**Servidor web interno:** nginx  
**Healthcheck:** `GET /healthcheck → 200 → true`  

### Specs del Servidor

Verificar con SSH al equipo:

```bash
# SSH al servidor y ejecutar:
free -h                              # RAM total y disponible
nproc                                # CPUs
df -h                                # Disco
docker stats                         # Uso en tiempo real por container
docker logs <oo-container> --tail 100  # Últimos logs
dmesg | grep -i oom                  # Ver si hay OOM kills
```

### Causa Principal de Inestabilidad

El S145 tiene 4 GB RAM soldados. Ubuntu consume ~1.5 GB, OO Docker consume ~2.5 GB → queda en 0 GB libre → OOM kill del sistema operativo.

**Fix definitivo:** agregar módulo SO-DIMM 8 GB DDR4 (~$25 USD) → 12 GB total → completamente estable.

**Fix inmediato (sin hardware):**
- Deshabilitar suspensión: `sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target`
- Restart automático del container: `docker update --restart=always <nombre-container>`
- Ver si hay OOM kills: `dmesg | grep -i oom`

### Recomendaciones

```yaml
# docker-compose.yml mínimo recomendado:
services:
  onlyoffice:
    image: onlyoffice/documentserver:9.3.1
    restart: always          # ← crítico
    mem_limit: 4g            # ← evita OOM total del host
    ports:
      - "80:80"
```

**Specs mínimos recomendados para producción con uso liviano:**
- RAM: 4 GB (8 GB recomendado)
- CPU: 2 vCPU
- Disco: 40 GB SSD
- OS: Ubuntu 22.04 LTS

---

## Configuración y Variables de Entorno

### Frontend (`notarial/.env.local`)
```
VITE_ONLYOFFICE_URL=https://onlyoffice.notarial.lat
```

### Backend (`api/scriba.js` — hardcodeado, NO en .env)
- Supabase URL + Anon Key
- Anthropic API Key (en `scripts/.env` para scripts locales)

> ⚠️ Las keys están hardcodeadas en `api/scriba.js`. Para producción habría que moverlas a variables de entorno de Vercel.

---

## Desarrollo Local

```bash
npm install
npm run dev          # Vite dev server en localhost:5173
npm run build        # Build de producción
```

Deploy automático en Vercel al hacer push a `main`.

OO en local: usar `VITE_ONLYOFFICE_URL=http://localhost` con un OO local, o apuntar al servidor de producción.

---

## Identidad de Marca

**Nombre del producto:** Notarial  
**Asistente IA:** Scriba  
**Tagline:** "Fe pública digital"  

### Logos y assets (en `public/`)
- `logo-pen-transparent.png` — logo principal (pluma, fondo transparente)
- `logo-pen-transparent1.png` — variante
- `Logo Gold.png` — variante dorada
- `favicon.svg` — ícono del navegador
- `Scriba-icon-1.png` — avatar del asistente IA
- `Protocolo_Front.png` / `Protocolo_Back.png` — imágenes de referencia notarial

### Paleta de colores (en `src/constants.js` — objeto `C`)

| Token | Hex | Uso |
|---|---|---|
| `dark` | `#1a2332` | Texto principal, fondos oscuros |
| `gold` | `#c9a961` | Acento dorado, Scriba, highlights |
| `cerulean` | `#3a7ca5` | Azul interactivo, links, variables con valor |
| `ceruleanLight` | `#e8f2f8` | Fondos azul claro |
| `ceruleanMid` | `#bdd9ec` | Bordes azul |
| `warm` | `#f0ece3` | Fondo principal de la app |
| `porcelain` | `#FDFCFA` | Fondo de botones y superficies claras |
| `danger` | `#c0392b` | Errores, variables vacías |
| `muted` | `rgba(26,35,50,.45)` | Texto secundario |

### Tipografía (Google Fonts)

**Import en `src/App.jsx`:**
```
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');
```

| Fuente | Uso | Pesos |
|---|---|---|
| **Montserrat** | UI completa (botones, labels, navegación) | 400, 500, 600 |
| **Merriweather** | Documentos notariales (fuente por defecto) | 400, 700, italic |
| **Georgia** | Opción de fuente para documentos | sistema |
| **Times New Roman** | Opción de fuente para documentos | sistema |

**Fuentes requeridas en el servidor OO** (para que OO las sirva al cliente):
- Merriweather Regular, Bold, Italic, BoldItalic
- Montserrat Regular, Bold (mínimo)

**Instalación en OO Docker:**
```bash
sudo docker exec <container_id> bash -c "
apt-get update -qq && apt-get install -y wget &&
mkdir -p /usr/share/fonts/truetype/merriweather &&
wget -q -O /usr/share/fonts/truetype/merriweather/Merriweather-Regular.ttf 'https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather-Regular.ttf' &&
wget -q -O /usr/share/fonts/truetype/merriweather/Merriweather-Bold.ttf 'https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather-Bold.ttf' &&
wget -q -O /usr/share/fonts/truetype/merriweather/Merriweather-Italic.ttf 'https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather-Italic.ttf' &&
mkdir -p /usr/share/fonts/truetype/montserrat &&
wget -q -O /usr/share/fonts/truetype/montserrat/Montserrat-Regular.ttf 'https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-Regular.ttf' &&
wget -q -O /usr/share/fonts/truetype/montserrat/Montserrat-Bold.ttf 'https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-Bold.ttf' &&
fc-cache -f &&
/var/www/onlyoffice/documentserver/documentserver-generate-allfonts.sh
"
```
> ⚠️ El último comando tarda 5-10 minutos. Es necesario para que OO registre las fuentes.

### Tipografía de UI (tokens en `src/theme.js`)

| Nivel | Tamaño | Peso | Uso |
|---|---|---|---|
| L1 | 14px | 600 | Headers, labels primarios |
| L2 | 12px | 400 | Texto secundario |
| L3 | 11px | 700 | Labels en mayúscula con tracking |

---

## Decisiones de Diseño

### Lo que hacemos
- **Inline CSS con tokens**: sin CSS-in-JS ni frameworks de componentes. Paleta y tipografía definidas en `src/constants.js` y `src/theme.js`.
- **Un serverless para IA**: toda la lógica de Claude va por `api/scriba.js` para mantener el API key fuera del frontend.
- **Plugin OO para propiedades**: en lugar de un formulario fuera del editor, las propiedades del acto viven en el panel lateral del propio documento.
- **JWT del usuario al serverless**: obligatorio para respetar RLS de Supabase (auth.uid()).

### Lo que NO hacemos (decisiones explícitas)
- **No TypeScript**: el proyecto es JavaScript puro con JSX.
- **No React Router**: la navegación es estado de React en `App.jsx` (sin URL routing).
- **No componentes de UI externos** (MUI, Tailwind, etc.): todo custom para control total del diseño notarial.
- **No ORM**: queries directas con Supabase JS client.
- **No tests automatizados**: el ciclo de desarrollo actual es demasiado rápido para mantener una suite de tests.
- **No server-side rendering**: SPA pura, Vercel solo sirve el bundle estático + serverless functions.

---

## Historial de Features (por orden de implementación)

1. UI base de Scriba (botón flotante, glow, avatar)
2. Scriba genera instrumentos notariales completos (system prompt + max_tokens)
3. Contexto del documento activo enviado a Scriba
4. Scriba abre el editor con el template correcto (tool `abrir_editor`)
5. Persistencia de conversaciones en Supabase
6. Scriba consulta personas y documentos del registro (tool `buscar_personas`)
7. Fix RLS: pasar JWT del usuario al serverless
8. Pre-cargar partes y fecha cuando Scriba abre el editor
9. Fecha/hora actual en el system prompt de Scriba
10. Botón "Insertar en documento" con tool `insertar_en_documento`
11. Fix OO plugin: fallback de ready cuando WebSocket falla

---

*Este documento se mantiene manualmente. Actualizar al cerrar features o tomar decisiones de arquitectura.*
