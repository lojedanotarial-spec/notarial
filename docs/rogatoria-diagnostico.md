# Rogatoria de Escrituras Públicas — diagnóstico (Fase 0) y decisiones

**Estado: en pausa, 30/07/26.** Fase 0 (diagnóstico) completa. Fase 1 (motor de tablas) no arrancó — no se tocó código todavía. Este documento es el handoff completo para retomar sin perder contexto.

## Qué es esto

Feature nueva: generar la Rogatoria de Escrituras Públicas (formulario oficial de la Dirección de Registros Públicos y Archivo Judicial de Mendoza) como un template más del sistema existente — mismo motor que los otros 53 templates, no un sistema paralelo. Se descartó a propósito editar el XML del .docx oficial por coordenadas (frágil); la vía elegida es reproducir el diseño a mano como template propio con tablas + variables.

El .docx oficial está en `docs/fixtures/Rogatorias-de-Escrituras-Publicas-2026-2.docx`.

## Diagnóstico de Fase 0

### Por qué el soporte de tablas es la pieza nueva real

`buildDocxGenerico.js` (220 líneas) hoy solo genera párrafos: parte `contenido` por `\n`, cada línea es un `Paragraph`. `sections[0].children` es siempre `[Paragraph, Paragraph, ...]` — no existe ningún concepto de tabla en el pipeline. `docx@9.6.1` (ya instalado, sin nuevas dependencias) trae `Table`/`TableRow`/`TableCell`/`TableBorders`/`VerticalMergeType` nativos, y permite mezclar `Paragraph` y `Table` en el mismo `children`. `parsearSegmentos()`/`sustituirVars()` (negrita, subrayado, `~~dato~~`, `{{VAR}}`) son independientes del párrafo — el texto dentro de una celda puede reusar el mismo parser sin cambios.

### Estructura real del .docx oficial (confirmada por inspección del XML)

9 tablas, 50 filas, 199 celdas. Sin controles de formulario (`w:sdt`/checkbox) — todo son celdas en blanco para tipear a mano, incluidos los booleanos (zona de frontera, tierra rural, tipo de acto: se marcan con "X"). Sin saltos de página forzados, A4 vertical estándar, una sola sección.

| Tabla | Contenido |
|---|---|
| 1 | Número de entrada + título |
| 2 | Datos del notario (6 columnas) |
| 3 | Solicitante/autorizado para retiro (3 columnas) |
| 4 | Datos de la escritura (4 columnas) |
| **5 y 6** | **Bloque INMUEBLE completo (15 filas c/u), idénticas — "PRIMER INMUEBLE"/"SEGUNDO INMUEBLE"** |
| 7 | Certificados Ley + Catastral |
| 8 | UIF (persona humana / jurídica) |
| 9 | Retirante + firma |

**Hallazgo clave para el diseño:** los títulos de sección ("DATOS DEL SOLICITANTE...", "SEGUNDO INMUEBLE:", "CERTIFICADOS:", "UIF:", "RETIRANTE:") no son párrafos sueltos entre tablas — están **incrustados como texto en la última celda de la fila anterior**. El bloque repetible de inmueble necesita poder recibir "qué texto va en su última celda" como parámetro (nombre del inmueble siguiente, o "CERTIFICADOS:" si es el último).

**Merges reales a reproducir:** `gridSpan` (celdas horizontales fusionadas) y un `vMerge` real de 6 filas de alto en la celda "TIPO DE ACTO". `docx.js` soporta ambos (`columnSpan`, `verticalMerge` con `RESTART`/`CONTINUE`), es la parte más delicada de reproducir a mano.

### Precedentes confirmados (no solo mencionados — releídos)

- `variables_json` hoy es siempre plano: `[{name, type, label, required, placeholder}]` (`texto`/`texto_largo`/`dinero`, confirmado en `compraventa_urbana`, 20 campos). **No existe tipo array/tabla.** Para `inmuebles`, el precedente más cercano no son las cláusulas sino **`vehiculos`**: array de objetos, estado propio, `ModalVehiculos.jsx`, variable derivada `VEHICULOS_LISTA`. Diseño propuesto (no confirmado aún — quedó pendiente junto con la pausa): inmuebles como estado propio tipo `vehiculos`, no como extravar plano.
- `ensamblarClausulas()` + `numeroOrdinal()` + `detectarNumeracion()` (`templateVars.js`) — patrón de numeración exacto a reusar para PRIMER/SEGUNDO/TERCER inmueble. Lo que hay que construir nuevo es el clonado del *bloque de tabla* (hoy `ensamblarClausulas` solo concatena strings, no tablas).
- `completar_extravars` ya usa los nombres exactos de `templateVarsSchema` — los campos planos nuevos (notario, solicitante, escritura, certificados, retirante) deberían funcionar sin tocar `api/scriba.js`.

## Validación contra escrituras reales

Fixtures reales en `C:\Users\Florencia Martinez\Downloads\Escrituras Bulk-20260428T174249Z-3-001\Escrituras Bulk\Cooperativa\` — 110 escrituras de transferencia por adjudicación (cooperativa de vivienda) + `Escriturador_MK_I.xlsx` (posible fuente de datos del bulk original) + `MODELO COOPERATIVA mk III.docx`. Se leyó una completa (`Escritura Coop. B° San Martin Manzana F Lote 12.docx`) para cruzar contra el listado de campos de la Rogatoria.

**Confirmado que aparece en una escritura real:** notario (nombre, registro, TIT/ADSC), n° de escritura, fecha, matrícula del lote, precio, certificado Ley (mismo organismo — Dirección de Registros Públicos y Archivo Judicial — que la Rogatoria), certificado Catastral, avalúo fiscal, tipo de acto (en este caso "TRANSFIERE POR ADJUDICACIÓN", no compraventa — confirma que el mapeo de roles no puede asumir Vendedor/Comprador).

**Confirmado que NUNCA aparece en el cuerpo de una escritura** (carga manual siempre, en cualquier Camino A): solicitante/autorizado para retiro, cantidad de testimonios, testimonio nativo digital, retirante.

### Tres decisiones ya tomadas (30/07/26) sobre ambigüedades de Fase 4

1. **Otorgante persona jurídica**: el campo de la Rogatoria dice literalmente "Apellido y Nombre / **Razón Social**" — va la razón social + CUIT de la entidad (ej. la cooperativa) directamente. No hace falta traer el patrón de `representaciones` a este campo puntual.
2. **Bloque TOMO (n° asiento, n° fojas, cód. tomo) del inmueble**: se decidió que estos son datos que el Registro asigna/ya tiene de una Rogatoria anterior (la que inscribió el antecedente) — **no se auto-completan desde el documento origen en Fase 4**, quedan de carga manual. No intentar mapear los tomo/fojas del antecedente.
3. **Campos UIF (monto total, beneficiario final, origen de fondos)**: en una escritura real son declaraciones en prosa libre, no datos estructurados. Se decidió **no escribir un extractor determinístico** — Fase 4/5 delega esto a Scriba (que ya puede leer el documento origen vía `leer_documento` y completar con criterio vía `completar_extravars`), en vez de lógica de parsing nueva.

## Por qué está en pausa

El brief exige verificación visual (render a PDF + comparación contra el formulario oficial en blanco) en cada fase antes de avanzar a la siguiente. Esta sesión/máquina no tiene LibreOffice ni Word instalado — no hay forma de renderizar a PDF ni de "ver" el resultado generado sin intervención humana. Se preguntó cómo resolver esto (¿la escribana abre y confirma cada .docx generado, o se avanza confiando solo en inspección estructural del XML?) y la respuesta fue pausar el feature en vez de decidir ese punto ahora.

## Para retomar

1. Resolver el mecanismo de verificación visual (ver punto anterior) — es lo que bloqueó el arranque de Fase 1.
2. Confirmar el diseño de datos de `inmuebles` (estado propio tipo `vehiculos` vs. extender `variables_json` con un tipo array) — quedó propuesto, no confirmado explícitamente.
3. Tag de rollback (`pre-rogatoria-2026-07-29`, mencionado en el brief original) todavía no se creó — no hizo falta porque no se tocó código de producción, solo se agregó el fixture (`docs/fixtures/`) y este documento.
4. Retomar en Fase 1 tal como está descripta en el brief original (buscar el mensaje/brief completo si se perdió del contexto de chat — no está commiteado en ningún lado más que en esta conversación).
