# Diseño UX/UI — Conservación legal, buscador y Explorador (20/11/2026)

Documento de diseño previo al spec. No hay código escrito. Cubre: ingreso solo con Google, cierre de expediente (PDF + copia a Drive), buscador de personas, explorador de expedientes y documentos, ficha de persona con «usar para un acto nuevo», y copia del DNI por persona. Las decisiones siguen la numeración del sistema visual (D1–D22 ya existen; acá empiezan en D23) para que Lucas pueda vetarlas una por una.

## 1. Lo que ya existe (verificado en el código)

| Hallazgo | Dónde | Consecuencia para el diseño |
|---|---|---|
| **Inicio ya es un explorador de documentos**: filtros por estado, tipo, escribano, expediente y fechas; búsqueda por título y por DNI de las partes. | `HomeScreen.jsx:322-344` | No se parte de cero: se reutilizan sus filtros y se agregan los que faltan. |
| Inicio **carga solo los últimos 200 documentos**, sin aviso. | `HomeScreen.jsx:296-298` | Con 10 años de conservación, lo antiguo desaparecería de la vista sin que nadie lo note. Es el riesgo de diseño más serio. |
| El buscador de partes (`BuscadorDNI`) busca **solo por DNI**, solo dígitos, mínimo 3, 5 resultados. | `PartesEditor.jsx:326-392` | Hay que ampliarlo a CUIT, nombre y apellido. |
| Ya existe un buscador mejor, `filtrarLibreta`: apellido, nombre y DNI, sin tildes y sin importar el orden. Lo usa «Agregar persona». | `personasCliente.js:87-98`, `AgregarPersona.jsx` | Un solo motor de búsqueda para toda la app. Falta CUIT. |
| Expedientes solo filtra por estado y por nombre o acto. No mira a las partes. | `ExpedientesScreen.jsx:184-191` | La pantalla se integra al explorador. |
| La pantalla de Expedientes tiene otra estética: cabecera propia, botón dorado «+ Nuevo», emoji 📁, «Cargando…». Los estados están **duplicados** en dos archivos, y el verde de «Completado» no llega a contraste. | `ExpedientesScreen.jsx:14-19,194-262`, `ExpedienteDetailScreen.jsx:11-16` | Se unifican estados y estilo al tocar la pantalla. |
| «Eliminar» borra de verdad, sin papelera, en Inicio y en Expedientes. | `HomeScreen.jsx:357-362`, `ExpedientesScreen.jsx:177-182` | La Fase 0 de conservación cambia estos botones (ver §8). |
| El login ofrece correo y contraseña, «¿Olvidaste tu contraseña?» y «Solicitar acceso» sin acción. | `LoginScreen.jsx:148,201` | Con ingreso solo por Google desaparece la recuperación de contraseña y con ella la dependencia del correo saliente (D18 queda sin efecto). |

## 2. Investigación (y cuánto pesa cada fuente)

| Hallazgo | Fuente | Confianza |
|---|---|---|
| Mostrar los filtros aplicados como **etiquetas quitables encima de los resultados** y ofrecer «Borrar todos» y borrado por grupo reduce la desorientación. | [Baymard: cómo diseñar filtros aplicados](https://baymard.com/blog/how-to-design-applied-filters), [Oracle APEX: filter chips](https://docs.oracle.com/en/database/oracle/apex/26.1/apxdc/showing-filter-chips-and-total-row-count.html) | Media-alta (comercio electrónico, no archivos) |
| Mostrar **cuántos resultados daría cada opción** de filtro antes de elegirla. | [Algolia: search filter UX](https://www.algolia.com/blog/ux/search-filter-ux-best-practices/) | Media (blog de proveedor) |
| Una vista de árbol exige el patrón ARIA más complejo (treegrid: navegación en dos dimensiones, niveles, expandir/colapsar). Para una tabla que solo se ordena, alcanza la tabla simple. | [W3C APG: Treegrid](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid), [APG: Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid) | Alta para el patrón; la elección es criterio propio |
| Al cerrar un expediente de un estudio jurídico lo habitual es una **lista de cierre**: carta al cliente, rendición de fondos, cierre administrativo, **fecha de conservación asignada** y cambio de estado a archivado. Regla práctica citada: 10 años como punto de partida; otras jurisdicciones llegan a 16. | [Goldberg Segalla](https://www.goldbergsegalla.com/blog/professional-liability-matters/risk-management/know-when-to-hold-em-when-to-close-em/), [Texas Bar](https://www.texasbarpractice.com/law-practice-management/practice-tip-checklist-for-developing-a-file-retention-policy/), [Law Society NB](https://lawsociety-barreau.nb.ca/en/for-lawyers/insurance/closing-client-files) | Media: son estudios de abogados de EE. UU. y Canadá, no escribanías argentinas. El plazo legal de Mendoza lo confirma Fátima |
| Al pedir permisos, **explicar antes, en palabras propias**, qué se va a pedir y para qué. Google permite desmarcar permisos individuales en su pantalla. | Práctica de OAuth de Google; no pude abrir la página de lineamientos | Media: **a verificar** antes de construir el estado «permiso parcial» |

**No encontré** investigación sobre exploradores para escribanías ni guías de UX para archivo notarial en español. La propuesta es criterio propio apoyado en lo anterior, en los patrones del producto y en cómo ya trabaja Inicio.

## 3. Decisiones (vetables)

| # | Decisión | Por qué |
|---|---|---|
| **D23** | **Ingreso solo con Google.** Una pantalla, un botón primario: «Ingresar con Google». Antes de ir a Google se explica en una frase qué va a pedir. | Menos caminos, menos errores. Y Google muestra un texto técnico: mejor explicarlo nosotros primero (regla 1). |
| **D24** | **Estados del ingreso con diseño propio**: primera vez (explicación), permiso de Drive faltante, cuenta no habilitada, error de Google, vencimiento del permiso. | Regla 3. El caso más probable de falla real es que la persona desmarque el permiso de Drive en la pantalla de Google. |
| **D25** | **Un buscador único de personas** (DNI, CUIT, nombre, apellido) que reemplaza a `BuscadorDNI` y se usa también en «Agregar persona» y en el explorador. Dice cómo interpretó lo escrito («Buscando por DNI 31.645.431»). | Un solo comportamiento en toda la app. Mostrar la interpretación evita dudas con los números. |
| **D26** | **CONFIRMADO por Lucas (20/11/26): filtros, no árbol.** Se suma el filtro **Protocolo: Protocolar · Extraprotocolar · Sin definir** (nombre decidido el 20/11/26; maqueta en https://claude.ai/artifact/2QzJfGt6e6BzCAs1HjUuXG) y una **ruta visible** (2026 › Protocolares › Compraventa) que da la sensación de carpetas sin serlo. Ver `arbol-carpetas.md`. **Explorador = tres zonas**: izquierda «Ver por» (Personas · Actos · Años · Estado), centro una **tabla ordenable**, derecha un panel de detalle. Los filtros aplicados van como etiquetas arriba de la tabla. **Sin árbol real** (ver §2). | Cumple «explorador de Windows» sin pagar la complejidad y los errores de accesibilidad de un árbol. Personas, actos y años son vistas alternativas del mismo conjunto, no una jerarquía. |
| **D27** | **DECIDIDO (Lucas, 20/11/26): el Explorador es una pestaña aparte, y la pestaña actual «Expedientes» desaparece**: se reconvierte en el Explorador (la lista de expedientes actual se retira; el detalle de cada expediente se conserva). **Inicio se moderniza** como pantalla de trabajo, con su propio diseño (pendiente). El Explorador reutiliza `FilterItem`/`SideSection` de Inicio, pasándolos a componentes compartidos. | «Archivo» se descartó: suena a «archivado». Expedientes hoy es confuso y su función queda cubierta, y mejorada, por el Explorador. |
| **D28** | **Sin tope silencioso de filas**: siempre «Mostrando 50 de 1.240» y «Ver más». Los contadores salen del servidor, no de lo cargado. | Con 10 años, el tope de 200 oculta casos. |
| **D29** | **Ficha de persona**: encabezado, copia del DNI, y la lista de los actos en que intervino, de cualquier año. Acción principal: «Nuevo acto con esta persona». Cada acto tiene «Usar como base» (secundaria). | Resuelve el ejemplo de Lucas: encontrar a A y generar la certificación. |
| **D30** | **«Nuevo acto con…» copia las personas, no los roles ni los números.** Se elige la plantilla, se tildan las personas a llevar y el rol se define en el acto nuevo. | En la compraventa A es vendedor; en la certificación es requirente. Copiar el rol sería un error silencioso. |
| **D31** | **Cierre en un solo botón, «Cerrar expediente»**, con confirmación que nombra el objeto, una lista de revisión antes de cerrar y un panel de proceso con tres pasos que pueden fallar por separado: armar el PDF, guardar en Notarial, copiar al Drive. | Reglas 4, 5 y 8. El Drive nunca puede impedir el cierre. |
| **D32** | **Se llama «expediente cerrado», no «caso cerrado»**. La sección se llama «Explorador» (nombre a confirmar por Lucas). | El glosario del producto dice «siempre expediente (nunca carpeta/caso)». Si Lucas prefiere «caso», se cambia el glosario entero, no solo este lugar. |
| **D33** | **HECHO (20/11/26, commit ae9a667, en producción).** **Estados unificados en un solo módulo** (`src/utils/estadosExpediente.js` + `InsigniaEstado`): Abierto · En trámite · Completado · **Cerrado**. «Archivado» se retira (hoy no hace nada distinto). Cada estado con ícono y texto, y colores con contraste. «Cerrado» no se elige a mano: lo pone el cierre (D31). | Dos copias de la lista y un verde que no llega a 4.5:1. |
| **D34** | **«Eliminar» desaparece de expedientes y documentos.** Pasa a «Archivar» (expedientes) y «Anular» (documentos), siempre reversibles y con registro. | Es la cara visible de la Fase 0 de conservación. |
| **D35** | **Copia del DNI: se avisa, no se bloquea.** Estados: copia completa · falta el dorso · sin copia. Avisos en la ficha, en el editor de partes y como filtro «Sin copia del DNI» en el Explorador. Al cerrar un expediente se listan las personas sin copia. | Un escribano con el cliente en el mostrador no puede quedar trabado. |

## 4. Pantallas y estados

### 4.1 Ingreso (reemplaza `LoginScreen.jsx`)
Mantiene los dos paneles de D14 (marca a la izquierda, formulario a la derecha; en celular, banda arriba). Solo queda un botón.

| Estado | Qué ve la persona | Texto sugerido |
|---|---|---|
| Primera vez | Botón primario + un recuadro corto sobre lo que Google va a pedir | «Ingresá con tu cuenta de Google. Te vamos a pedir permiso para guardar los expedientes cerrados en tu Drive. Notarial solo ve lo que ella misma guarda ahí.» |
| Redirigiendo | Botón deshabilitado, «Abriendo Google…» | |
| Permiso de Drive faltante | Pantalla propia, no un aviso suelto | «Entraste, pero falta el permiso de Drive. Sin él, los expedientes cerrados quedan solo en Notarial. [Dar permiso] · [Seguir sin Drive]» |
| Cuenta no habilitada | Pantalla propia | «Esta cuenta de Google no está habilitada en Notarial. Probá con otra cuenta o pedí el acceso. [Usar otra cuenta] · [Solicitar acceso]» |
| Error de Google o de red | Aviso rojo con reintento | «No pudimos completar el ingreso. Volvé a intentarlo.» |
| Permiso vencido (ya dentro) | Aviso fijo en el menú, no un modal | «Tu Drive necesita volver a conectarse. [Reconectar]» |

El botón de Google debe respetar los lineamientos de marca de Google (**a verificar** en su guía antes de construir). El botón primario va en cerúleo (D15). Se eliminan campos de clave, «mostrar», «Bloq Mayús» y los dos textos sin acción.

### 4.2 Buscador de personas (componente compartido)
- Un campo con etiqueta visible: «Buscar por nombre, apellido, DNI o CUIT». Debajo, una línea que dice cómo lo entendió: «Buscando por DNI 31.645.431» · «por nombre y apellido» · «por CUIT 20-31645431-3».
- Reglas de interpretación: 11 dígitos = CUIT (se valida el dígito verificador); 7 u 8 dígitos = DNI; letras = nombre y apellido sin importar el orden ni las tildes; puntos y guiones se ignoran.
- Cada resultado: nombre completo, DNI formateado, CUIT si existe, **«Última intervención: Compraventa · 12/03/2025»**, y la etiqueta de copia del DNI (ícono + texto).
- Dentro del editor de partes la acción es **«Cargar como parte»**. Dentro del Explorador es **«Ver sus actos»**.
- Estados: vacío («Escribí al menos 3 caracteres.»), buscando (esqueleto), sin resultados («No encontré a nadie con «García 3164». Probá con otro dato o cargá la persona nueva.» + [Crear persona nueva]), muchos resultados («Mostrando 10 de 34. Escribí más para acotar.»), error de red.
- Teclado: flechas para recorrer, Enter elige, Esc cierra. Lista como `listbox` con `aria-activedescendant`, o lista de botones si resulta más simple.

### 4.3 Explorador
Distribución a 1366×768: izquierda 220 px, centro flexible, derecha 340 px y colapsable. Debajo de 1100 px el panel derecho pasa a cajón. En celular de 360 px queda una columna: lista con filtros en una hoja inferior (el celular es sobre todo captura; esta pantalla se prueba pero no es prioridad).

- **Arriba:** buscador único (nombre, DNI, CUIT, título del acto), «Exp. y documentos» como conmutador (Todo · Expedientes · Documentos), orden, y una línea de **etiquetas de filtros aplicados** con «Borrar todos».
- **Izquierda, «Ver por»:** cuatro pestañas (Personas, Actos, Años, Estado). Cada una es una lista de un solo nivel con contador (p. ej. «Compraventa · 214»). Tocar una la aplica como filtro. «Personas» es una lista buscable, ordenada por apellido.
- **Centro, tabla:** columnas Nombre · Acto · Partes · Fecha · Estado · «Conservar hasta». Encabezados ordenables con botón, `aria-sort` y el ícono de dirección. Fila con un solo enlace principal. Acciones secundarias siempre visibles en táctil y al enfocar con teclado (patrón 9).
- **Derecha, detalle:** al elegir una fila muestra partes, documentos, archivos, historial y acciones: «Abrir», «Nuevo acto con estas personas», y para cerrados «Descargar PDF» y «Ver en Drive».

| Estado | Diseño |
|---|---|
| Cargando | Esqueleto de filas (no «Cargando…») |
| Vacío (archivo sin nada) | «Todavía no hay expedientes ni documentos. Cuando cierres un expediente, queda guardado acá.» + [Nuevo expediente] |
| Sin resultados con filtros | «No hay nada con estos filtros: Persona García · Año 2024.» + [Borrar filtros] |
| Parcial | Si el servidor devuelve solo un tramo: «Mostrando 50 de 1.240. [Ver más]» |
| Error | «No pudimos cargar el archivo. Revisá tu conexión y volvé a intentarlo.» + [Reintentar]. Conserva los filtros |
| Largo extremo | Nombres con elipsis y el nombre completo en el detalle; «Fernández de Kirchner de la Vega» se prueba |

### 4.4 Ficha de persona
Se abre desde el buscador, desde la lista «Personas» o desde una parte de un acto.
1. Encabezado: nombre, DNI, CUIT, última actualización.
2. **Documento de identidad:** miniaturas del frente y del dorso (abren el visor existente `VisorArchivo`), con el estado de la copia (D35) y las acciones «Subir desde la compu» y «Pedir desde el celular» (el flujo por QR ya existe).
3. **Actos en que intervino:** lista por fecha descendente (año, acto, expediente, rol, estado). Cada fila: «Abrir» y «Usar como base».
4. Acción principal de la ficha: **«Nuevo acto con esta persona»**.

«Nuevo acto con…» es un modal corto (tarea acotada, patrón 4): elegir plantilla (con búsqueda), tildar las personas a llevar (todas tildadas) y una línea «El rol de cada una se define en el acto nuevo». Botón: «Crear acto».

«Usar como base» (copiar el contenido de un acto anterior) **queda fuera de v1**: copia datos como números de escritura o fechas y exige reglas propias. Se anota en el backlog.

### 4.5 Cierre de expediente
**Entrada:** botón «Cerrar expediente» en el detalle del expediente (acción principal solo cuando el estado es «Completado»; en otros estados queda secundaria).

**Paso 1 — Revisión** (modal; el cuerpo desplaza, el pie queda fijo):
- Título: «¿Cerrar el expediente «García c/ Pérez»?»
- Cuerpo: «Se arma un PDF con todo el expediente y queda de solo lectura. Se guarda en Notarial y en tu Drive, y se conserva hasta el 20/11/2036.»
- Lista de revisión con ícono y texto, **sin bloquear**: documentos en borrador (con enlace), personas sin copia del DNI, archivos sin identificar.
- Botones: «Cancelar» (foco inicial) · «Cerrar expediente».

**Paso 2 — Panel de proceso** (patrón 5, un panel con `aria-live`):
1. Armando el PDF (documento 3 de 8)…
2. Guardando en Notarial…
3. Copiando a tu Drive…
Cada paso con su avance. Puede cancelarse hasta el paso 2.

**Paso 3 — Resultado**, tres líneas independientes:
- «PDF armado» ✓ · «Guardado en Notarial» ✓ · «Copiado a tu Drive» ✓ **o** «Pendiente de copiar a tu Drive. [Reintentar]» con el motivo en palabras simples.
- Botones: «Descargar PDF» (primaria) · «Ver en el Explorador».

| Falla | Qué pasa |
|---|---|
| No se pudo armar el PDF | Nada se cierra. «No pudimos armar el PDF del expediente. El expediente sigue abierto. [Reintentar]» |
| Falla el guardado en Notarial | Igual que arriba: no se cierra. |
| Falla Drive | **Se cierra igual**. Queda «Pendiente de copiar a tu Drive» en la ficha, con reintento automático al volver a entrar. |
| Se cierra la pestaña a la mitad | Al volver, el expediente figura «Cierre sin terminar. [Continuar]». |

**Reabrir:** solo la titular o el administrador, con motivo escrito; queda en el historial y el PDF anterior se conserva como versión. (Decisión pendiente, ver §7.)

**Expediente cerrado en pantalla:** insignia «Cerrado el 20/11/2026 · Se conserva hasta el 20/11/2036», todo en solo lectura, sin botón de eliminar, con «Descargar PDF».

### 4.6 DNI guardado
| Estado de la copia | Texto | Tratamiento |
|---|---|---|
| Completa | «Copia del DNI guardada (frente y dorso)» | Éxito, ícono de tilde |
| Parcial | «Falta el dorso del DNI» | Aviso dorado + «Subir dorso» |
| Sin copia | «Sin copia del DNI» | Aviso dorado + «Subir copia» |
| Subiendo | «Subiendo el DNI…» | Panel de proceso |
Nunca solo color: siempre ícono y texto. Filtro «Sin copia del DNI (N)» en el Explorador, para ir completando.

## 5. Componentes y tokens
- **Nuevos, compartidos:** `BuscadorPersonas`, `TablaOrdenable` (con `aria-sort`), `EtiquetasDeFiltro`, `PanelDeProceso` (el patrón 5 hoy es texto suelto en varias pantallas), `InsigniaEstado` (ícono + texto), `EstadoCopiaDni`.
- **Reutilizar:** `Modal`, `Btn`, `Fg`, `Aviso`, `VisorArchivo`, `filtrarLibreta`, `FilaEsqueleto`.
- **Tokens a agregar** (ya propuestos en `sistema-visual.md`): `danger`, `success`, `warnText`, `ceruleanText`, `borderControl`.
- **Estilos:** componentes nuevos con clases de `src/ui.css` y variables CSS (hover y foco reales), sin migrar pantallas viejas.
- **Datos:** la lista del Explorador no puede traer `contenido` entero de cada documento. Hace falta un índice liviano persona↔acto. Propuesta en [plan.md](plan.md).

## 6. Orden de entrega sugerido (cada paso se puede subir solo)
1. **U0. Glosario y estados** (D32, D33) + sacar «Eliminar» (D34). Texto y componentes chicos.
2. **U1. Buscador unificado** (D25): primero dentro del editor de partes, que es lo que pidió Lucas.
3. **U2. Ingreso solo con Google** (D23, D24), junto con guardar el permiso en el servidor.
4. **U3. Cierre de expediente** (D31) con panel de proceso.
5. **U4. Explorador** (D26–D28): tabla, «Ver por», etiquetas y paginación del servidor.
6. **U5. Ficha de persona y «Nuevo acto con…»** (D29, D30) y DNI guardado (D35).

## 7. Decisiones que necesito de Lucas
1. ~~D27~~ Resuelta: Explorador aparte, Expedientes se reconvierte en él, Inicio se moderniza.
2. D32: ¿«expediente cerrado» (recomendado) o «caso cerrado»?
3. ~~D33~~ Resuelta y hecha el 20/11/26: se retiró «Archivado» y entró «Cerrado». Ningún expediente usaba «Archivado», así que no hubo que migrar.
4. Reabrir un expediente cerrado: ¿lo permitimos con motivo (recomendado) o queda cerrado para siempre?
5. D35: ¿La copia del DNI solo avisa (recomendado) o debe impedir el cierre?
6. ¿Armamos primero un **prototipo navegable** en HTML (como el del ingreso) antes del código? Recomendado para el Explorador y el cierre.

## 8. Qué no pude verificar
- **No vi ninguna pantalla en un navegador**: el navegador de pruebas estaba desconectado. Todo lo anterior sale de leer el código y de la investigación. Antes de dar algo por terminado hacen falta capturas a 1366×768 y 360×640, prueba con teclado y con 1.000 filas.
- El texto de los lineamientos de marca del botón de Google y el comportamiento exacto del permiso parcial se confirman al construir.
- Cómo se convierten hoy los documentos redactados a PDF es un punto técnico abierto; condiciona la duración del paso 1 del panel de cierre.
- El plazo de 10 años y su punto de partida los confirma Fátima: las fuentes de §2 son de otras jurisdicciones.
- No verifiqué dónde se agrega «Explorador» en la barra de navegación (`NavBar.jsx`).

## 9. Protocolar (P) y no protocolar (NP) — investigación del 20/11/2026

> **Actualizado el 20/11/2026:** el listado completo y verificado está en [actos-protocolares-y-no-protocolares.md](actos-protocolares-y-no-protocolares.md). Lo que sigue es la primera versión.

**Qué es.** Protocolar es lo que se extiende dentro del protocolo (el libro de folios numerados por año): las escrituras públicas y las actas protocolares. Son los documentos matriz. No protocolar es lo que nace fuera del protocolo y no deja matriz: certificaciones, certificados, copias y actas extraprotocolares.

**Fuentes.** Ley Notarial de Mendoza 3058 (arts. 11, 12, 16-18, 29, 49-64), leída en una copia de terceros (silo.tips) con texto ordenado a 2005: **no es fuente oficial, no verifiqué modificaciones posteriores ni que siga vigente así**. Código Civil y Comercial arts. 299-300 y la Revista del Notariado (búsqueda web). Pendiente cotejar con el Colegio Notarial de Mendoza.

**Hallazgos que cambian el diseño**
- **Las actas pueden ser de los dos tipos** (art. 29). Por eso la clasificación **no puede depender solo de la plantilla**: hace falta una elección por documento. Esto confirma la opción A con corrección manual para cada acto.
- **Los poderes son protocolares** (art. 17: el protocolo auxiliar es para actas, protestos y poderes).
- **Los no protocolares se entregan en original a los interesados** (art. 50): el escribano no conserva matriz. Lo que se guarda en Notarial es su copia de trabajo.
- **El protocolo no se queda en la escribanía**: el notario lo conserva y lo entrega al **Archivo Judicial antes de finalizar el año siguiente** (art. 20). Por lo tanto, los 10 años que pide Fátima aplican a **la documentación del expediente** (borradores, DNI, certificados, PDF de cierre), no a la matriz.
- **No encontré el plazo de 10 años en la ley** (arts. 1 a 81). Tampoco una regla de guarda para lo extraprotocolar. El plazo y desde cuándo corre lo confirma Fátima o el Colegio Notarial.
- **El libro de requerimientos de certificaciones de firmas** casi no tiene regulación en el texto leído (solo se menciona en la facultad de los veedores, art. 81). El selector de protocolo del editor ya incluye «Libro de Protocolo de Actas de Requerimientos para Certificaciones de Firmas e Impresiones Digitales» (`ModalOtros.jsx:119`).
- **«Fe de vida» y «Autorización de viaje»** no aparecen en lo leído: clasificación a confirmar.

**Clasificación propuesta para las plantillas actuales** (a validar con Fátima)
| Grupo | Plantillas | Certeza |
|---|---|---|
| Protocolar | compraventas (urbana, rural, PH, lote), donaciones, mutuos, hipoteca y cancelación, usufructo, servidumbre, superficie, cesión y renuncia de herencia, partición, convenio de división, reconocimiento de deuda, poderes (general, especial, administración, irrevocable) y su revocación, aprobación de testamento | Alta, salvo las dudas de abajo |
| No protocolar | certificación de firma (y F08), certificado de copia, copia simple, fe de vida, autorización de viaje y de vehículo | Media: a confirmar |
| Depende (elección por documento) | actas de constatación, manifestación, notificación, asamblea, directorio, entrega | Alta: la ley admite ambas |
| Dudosas | boleto de compraventa, locación, prenda con registro, contratos SRL y estatutos SA/SAS (pueden ser escritura o instrumento privado), declaratoria de herederos | Baja |
| Derivadas | primer testimonio y testimonio posterior: son copias de una escritura y conviene guardarlas dentro de la carpeta de esa escritura | Media |

## 10. Filtros del Explorador (pedido de Lucas: «todo lo que sirva»)
Siempre visibles: **año · protocolar / no protocolar · acto jurídico · apellido · nombre · DNI · CUIT · estado (abierto, en trámite, completado, cerrado)**.
Para sumar si el dato ya está guardado en el documento (confirmar al diseñar el índice): número de escritura, dominio del vehículo, escribano, con o sin carpeta, sin copia del DNI, pendiente de copiar a Drive, conservar hasta (vence en el año…), rango de fechas.
