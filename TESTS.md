# Plan de Tests — Notarial v2

> Estado: Mayo 2026, ampliado 29/07/26 (secciones K-T) | Servidor OO: Google Compute Engine, Santiago (confirmado 27/07/26, ver PROYECTO.md §Servidor OnlyOffice) | OO: 9.4.0.129

---

## FASE 1 — Lucas (técnico, cubre todo)

### A. Autenticación

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| A1 | Login con email/contraseña válidos | Entra a Home | |
| A2 | Login con contraseña incorrecta | Mensaje de error, no entra | |
| A3 | Refresco de página estando logueado | Mantiene sesión | |
| A4 | Logout | Vuelve a Login | |

### B. Home

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| B1 | Home carga con documentos existentes | Lista de documentos visible | |
| B2 | Filtrar por tipo (Certificación, Poder, etc.) | Filtra correctamente | |
| B3 | Filtrar por estado (Borrador, Completo) | Filtra correctamente | |
| B4 | Click en un documento existente | Abre el editor con ese documento | |
| B5 | Botón "+ Documento" | Abre SelectorScreen | |

### C. Selector de plantillas

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| C1 | Se muestran las familias de instrumentos | Cert, Poder, Acta, Escritura, etc. | |
| C2 | Click en "Certificación de firma" | Abre EditorScreen con esa plantilla | |
| C3 | Click en "Poder especial" | Abre EditorScreen con esa plantilla | |
| C4 | Botón Volver | Regresa a Home | |

### D. Editor — Panel de datos

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| D1 | Sección Escribano muestra datos del usuario | Nombre y registro correctos | |
| D2 | Click en Fecha → modal → cambiar fecha | Fecha actualizada en panel y documento | |
| D3 | Click en Partes → modal → completar una parte | Parte aparece en el panel | |
| D4 | En modal Partes: ingresar DNI 8 dígitos, género M | CUIT se calcula automáticamente (prefijo 20, verificador correcto) | |
| D5 | En modal Partes: ingresar DNI 7 dígitos, género F | CUIT se calcula con cero adelante (prefijo 27) | |
| D6 | En modal Partes: buscar por DNI en buscador | Devuelve resultados del directorio | |
| D7 | En modal Partes: seleccionar resultado del buscador | Completa todos los campos automáticamente | |
| D8 | Click en Protocolo → completar libro y acta | Datos aparecen en panel | |
| D9 | Click en Instrumento → escribir descripción | Aparece en panel | |
| D10 | Click en Formato → cambiar fuente a Merriweather | Merriweather aparece en la lista | |
| D11 | Click en Formato → cambiar fuente a Montserrat | Montserrat aparece en la lista | |

### E. Editor — OnlyOffice

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| E1 | Abrir editor → OO carga sin "Reconectando" | Documento visible en menos de 30s | |
| E2 | Panel lateral "Propiedades del Acto" visible | Plugin cargado | |
| E3 | Panel lateral muestra los datos ingresados | Partes, fecha, protocolo correctos | |
| E4 | Click en sección del panel lateral | Abre el modal correspondiente | |
| E5 | Editar texto directo en OO | Se puede tipear normalmente | |
| E6 | Fuente Merriweather renderiza en OO | Texto se ve en Merriweather (no fallback) | |
| E7 | Botón "Actualizar documento" en plugin | Regenera el documento | |
| E8 | Guardar documento | Estado cambia a "Guardado hace un momento" | |
| E9 | Botón "Descargar DOCX" | Descarga el archivo | |

### F. Scriba — Consultas normativas

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| F1 | "¿Qué artículo regula la firma a ruego?" | Cita art. 309 CCyC directamente | |
| F2 | "¿Está vigente el ITI?" | "No, derogado por Ley 27.743, julio 2024" | |
| F3 | "¿Qué es el COTI?" | "Derogado desde 01/06/2025, RG 5698/2025" | |
| F4 | "¿Cuánto es el impuesto de sellos en Mendoza?" | "1,25% para 2025, Ley 3799" | |
| F5 | "Tengo un inmueble en Malargüe, ¿hay restricciones para vender a un extranjero?" | Menciona zona de frontera, DL 15385, requiere autorización | |
| F6 | "Inmueble rural con derechos de riego, ¿qué pasa con el agua en la venta?" | Cita Ley de Aguas 1884, art. 14, inseparabilidad | |
| F7 | "¿Cuáles son los requisitos del art. 305 CCyC?" | Lista nombre, DNI, estado civil, domicilio, lugar, fecha, naturaleza del acto | |
| F8 | Consulta compleja de Fatima (boleto + poder + sellos) | Responde primero la pregunta concreta de sellos, menciona poder al final | |

### G. Scriba — Cálculo de CUIT

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| G1 | "CUIT de DNI 31645431, varón" | `20-31645431-4` | |
| G2 | "CUIT de DNI 32030032, varón" | `20-32030032-1` | |
| G3 | "CUIL de DNI 4572946, mujer" | `27-04572946-5` | |
| G4 | DNI que genera dígito verificador 10 (colisión) | Prefijo cambia a 23 o 24 según corresponda | |
| G5 | Resultado sin paso a paso | Solo muestra el CUIT final, no la aritmética | |

### H. Scriba — Generación de instrumentos

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| H1 | "Generá una certificación de firma simple" | Pide datos mínimos necesarios | |
| H2 | Dar todos los datos de una certificación | Genera borrador completo con cláusulas mendocinas | |
| H3 | Borrador incluye checklist pre-autorización | Aparece al final del instrumento | |
| H4 | "Abrí una certificación de firma" | Navega al selector/editor con esa plantilla | |
| H5 | Abrir editor desde Scriba pre-carga partes | Las partes mencionadas en el chat aparecen en el modal | |
| H6 | "Generá una fórmula de cierre notarial" | Genera texto limpio con botón "Insertar en documento" | |

### I. Scriba — Inserción en documento

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| I1 | Con editor abierto, pedir fórmula de cierre | Aparece bloque dorado con texto + botón Insertar | |
| I2 | Click en "Insertar en documento" | Texto aparece en el documento OO | |
| I3 | Click en "Copiar contenido" | Texto copiado al portapapeles | |

### J. Flujo completo end-to-end

| # | Test | Flujo completo | ✓/✗ |
|---|------|----------------|-----|
| J1 | Certificación de firma completa | Login → Home → Nuevo → Selector → Editor → Completar datos → Ver en OO → Descargar DOCX | |
| J2 | Consulta Scriba → abrir editor | Chat con Scriba → pedir abrir cert. firma → editor abre con datos pre-cargados | |
| J3 | Scriba ayuda a redactar y lo inserta | Chat → pedir fórmula → insertar en documento abierto | |

---

## Ampliación exhaustiva (agregado 29/07/26)

Todo lo que sigue (K en adelante) es la ronda "extensa y quisquillosa" pedida explícitamente: cubrir todas las funciones posibles, con foco especial en los casos donde el estado de OnlyOffice y el estado de React pueden desincronizarse en silencio — la familia de bugs más peligrosa de esta app (ya pasó una vez con el cambio de escribano, ver Historial de Features #46 de `PROYECTO.md`). No asumir que "no rompió nada visible" significa que no rompió nada — releer el documento generado, no solo mirar que la app no tire un error.

### K. Editor — Modal de Partes (exhaustivo)

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| K1 | Agregar 1 parte completa a mano (sin escaneo) | Aparece en el panel y en el documento con el rol correcto | |
| K2 | Agregar 2ª parte con el mismo DNI que la 1ª | El sistema debería avisar/no duplicar silenciosamente | |
| K3 | Cambiar el DNI de una parte ya cargada | Se actualiza esa parte puntual, no crea una nueva | |
| K4 | Cambiar el rol de una parte (ej. de Vendedor a Comprador) en un template con roles fijos (`ROLES_CONTEXTUALES`) | El documento refleja el nuevo rol en el lugar correcto (concordancia de género incluida) | |
| K5 | Escanear DNI de una persona ya cargada con datos manuales distintos | Aparece el modal de confirmación antes de sobrescribir (`ConfirmSobrescribirEscaneo`) — no pisa en silencio | |
| K6 | Escanear DNI en un campo vacío (sin datos previos) | Aplica directo, sin modal de confirmación (no hay nada que perder) | |
| K7 | Quitar una parte ya cargada | Aparece `ConfirmQuitarParte`, no se borra con un solo click | |
| K8 | Buscar por DNI en el buscador de personas y NO encontrar resultados | Mensaje claro de "sin resultados", no un error genérico | |
| K9 | Cargar una parte con estado civil "casado/a" en un template de compraventa | El documento pide/menciona asentimiento conyugal según corresponda | |
| K10 | Cargar 3+ partes en un template que solo espera 2 (ej. compraventa con varios condóminos) | El documento arma la lista completa, concordancia plural correcta | |
| K11 | Domicilio con barrio + manzana + casa (barrio privado/de emergencia) | Se arma correctamente en el texto, sin campos "undefined" | |
| K12 | Nombre con tilde reconocida (ej. "RAUL" → "RAÚL") | Se aplica la tilde automáticamente | |
| K13 | Cerrar el modal de Partes sin guardar (cancelar) | No se pierde lo que ya estaba cargado antes de abrir el modal | |

### L. Editor — Modal de Vehículos

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| L1 | Cargar un vehículo a mano | Aparece en el panel y en `VEHICULOS_LISTA` del documento | |
| L2 | Escanear tarjeta verde (frente) | Completa marca/modelo/dominio/chasis/motor | |
| L3 | Escanear tarjeta verde (dorso) después del frente | Fusiona en el mismo vehículo, no crea uno nuevo | |
| L4 | Escanear frente y dorso de dos vehículos distintos en la misma sesión | Quedan como 2 vehículos separados, no se mezclan datos | |
| L5 | Cargar 2° vehículo con mismo dominio que el 1° | Actualiza el existente, no duplica | |
| L6 | Motovehículo (no auto) | `TIPO_VEHICULO_MIN` dice "moto vehículo", no "vehículo" | |

### M. Editor — Cláusulas opcionales (piloto de bloques)

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| M1 | Abrir `compraventa_urbana` → sección Cláusulas | Aparece la lista completa (18 cláusulas) | |
| M2 | Activar una cláusula sin variables (ej. "Venta ad corpus") | Se agrega al final, antes de "EN SU TESTIMONIO", con numeración correcta | |
| M3 | Activar una cláusula CON variables (ej. "Pacto de mejor comprador") | Aparecen los campos para completar; el texto final las sustituye sin dejar `{{VAR}}` sueltas | |
| M4 | Activar 3 cláusulas a la vez | Se agregan las 3, en el orden de activación, numeradas consecutivamente | |
| M5 | Desactivar una cláusula ya activa | Desaparece del documento, las demás mantienen su numeración | |
| M6 | Activar una cláusula, guardar el documento, cerrarlo y volver a abrirlo | La cláusula sigue activa y con sus valores (persistencia en `documentos.clausulas`) | |
| M7 | Pedirle a Scriba (por descripción, no por nombre técnico) que active una cláusula — ej. "el vendedor se puede quedar con el derecho de recomprarlo" | Reconoce y ofrece `mejor_comprador` con el botón "Aplicar al documento" | |
| M8 | Pedirle a Scriba una cláusula que no existe para ese template | Avisa que no existe, no la inventa ni la redacta como texto libre sin avisar | |
| M9 | Activar una cláusula en `cesion_posicion_contractual` (fianza) | El campo de texto libre del fiador (no es una parte del sistema) se completa y aparece bien en el texto | |

### N. Casos adversariales de sincronización OO ↔ React (crítico)

Esta es la familia de bugs que ya rompió una vez en producción (fix #46/#58 en `PROYECTO.md`). Repetir cada secuencia EXACTA, no solo el resultado final — el orden de los pasos es lo que importa acá.

| # | Secuencia exacta | Qué mirar | ✓/✗ |
|---|-------------------|-----------|-----|
| N1 | Abrir documento → cambiar el **escribano** en el modal → cambiar el escribano OTRA VEZ a uno distinto | El documento debe reflejar el 2° cambio, no quedarse pegado en el 1° (bug histórico exacto) | |
| N2 | Abrir documento → agregar una parte por el modal → **escribir texto a mano en OO** (cualquier párrafo) → cambiar esa misma parte en el modal (ej. cambiarle el DNI) | Debe aparecer el modal/banner de "¿Regenerar documento?" — si regenera en silencio, se pierde lo escrito a mano sin avisar | |
| N3 | Mismo caso que N2, pero eligiendo **"Cancelar"** en el modal de regenerar | El texto escrito a mano en OO debe seguir intacto, y el cambio del modal de Partes NO debe haberse aplicado al documento visible | |
| N4 | Mismo caso, eligiendo **"Sí, regenerar"** | El documento vuelve al texto de plantilla con el dato nuevo — la escribana debe saber que perdió lo escrito a mano (eso es lo esperado, no un bug) | |
| N5 | Escribir texto a mano en OO → sin tocar ningún modal, esperar ~5 segundos → cambiar un campo de "Datos del instrumento" y salir del campo (onBlur) | No debería aparecer el banner de regenerar por error si en realidad no había ediciones reales (falso positivo del bug ya arreglado — confirmar que sigue arreglado) | |
| N6 | Activar una cláusula (checkbox) MIENTRAS hay ediciones manuales pendientes en OO sin guardar | Debe pasar por el mismo modal de confirmación que cualquier otro cambio — las cláusulas no deberían ser una puerta trasera que regenera sin avisar | |
| N7 | Cambiar la fecha del acto → sin salir del modal, cambiar también el protocolo → cerrar el modal una sola vez | Ambos cambios (fecha y protocolo) deben aplicarse juntos, ninguno se pierde | |
| N8 | Con el documento recién generado (dentro de los primeros 3 segundos), tipear rápido en un campo de texto | La ventana de gracia (`ignorarEdicionesHastaRef`) no debe bloquear ni demorar el guardado del campo | |
| N9 | Dos cambios seguidos y rápidos en Partes (agregar parte A, sin esperar, agregar parte B) | Las 2 partes quedan cargadas, ninguna pisa a la otra por una condición de carrera | |
| N10 | Cerrar el editor con cambios sin guardar (botón atrás/volver a Home) | Debe avisar antes de salir ("hay cambios sin guardar") | |

### O. Precio en letras automático

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| O1 | Template con campo de precio (ej. `compraventa_urbana`) → "Datos del instrumento" | Aparece UN SOLO campo numérico, no dos campos (número y letras por separado) | |
| O2 | Escribir `1500000` en el campo de precio | El documento muestra "PESOS UN MILLÓN QUINIENTOS MIL CON 00/100 ($ 1500000)" | |
| O3 | Escribir un monto redondo de miles (ej. `8000`) | Incluye la palabra "MIL" (no "OCHO CON 00/100" a secas) | |
| O4 | Escribir un monto con centavos en formato argentino (ej. `1500,50`) | Dice "...CON 50/100", no "CON 00/100" | |
| O5 | Dejar el campo de precio vacío | El documento no muestra "PESOS CON 00/100" huérfano ni rompe el párrafo | |
| O6 | Mismo test en `mutuo_simple`, `hipoteca_constitucion`, `prenda_con_registro`, `cesion_credito` | Cada uno deriva su propio monto en letras correctamente (son campos independientes por template) | |

### P. Templates de 3 partes (cesión de posición contractual)

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| P1 | Abrir "Cesión de la posición contractual" | El modal de Partes pide 3 roles: Cedente, Cesionario/a, Cedido/a | |
| P2 | Cargar solo 2 de las 3 partes y generar | El documento debe mostrar claramente que falta el Cedido (no debería verse "undefined" ni un hueco silencioso) | |
| P3 | Cargar las 3 partes completas | Las 3 identidades aparecen correctas en el encabezado y en la cláusula de conformidad del cedido | |
| P4 | Cambiar el Cedido por otra persona después de generado | Se actualiza esa parte puntual (mismo comportamiento que K3) | |
| P5 | Activar la cláusula de fianza | El fiador (texto libre) se agrega bien, sin pisar los datos de las 3 partes del sistema | |

### Q. Scriba — tools no cubiertas en F-I

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| Q1 | "Cambiale el rol a Vendedor a [nombre ya cargado]" | Usa `completar_parte` con `parte_index`, actualiza esa parte sin crear una nueva | |
| Q2 | Adjuntar tarjeta verde y pedir "cargá este vehículo" | `extraer_documento` + `completar_vehiculo`, aparece botón de confirmación antes de aplicar | |
| Q3 | "El precio es 5 millones, seña 500 mil" en un template con esos extravars | `completar_extravars` completa ambos campos, no toca el resto del documento | |
| Q4 | Pedir Scriba que redacte texto y usar `modificar_documento` | Preserva las `{{VARIABLES}}` intactas, no las reemplaza por texto fijo | |
| Q5 | "Buscá a Pérez" con varios Pérez en la base | `buscar_personas` devuelve la lista, no asume cuál sin confirmar | |
| Q6 | "Traeme el boleto que hice el mes pasado de [nombre]" | `buscar_documentos` primero, confirma cuál, recién después `leer_documento` | |
| Q7 | Pedir a Scriba que compare contra un template antes de redactar libre | Usa `leer_template_base`, cita similitudes/diferencias reales | |
| Q8 | Pedir algo que ningún template cubre | Cae a `crear_documento_libre` con `campos_libres` propios, no fuerza un template que no aplica | |
| Q9 | Adjuntar un PDF de referencia (no identidad) | Lo lee directo como contexto, no intenta `extraer_documento` sobre él | |
| Q10 | Adjuntar un .docx real desde el navegador | Se extrae el texto server-side (mammoth) y Scriba puede usarlo — **nunca confirmado en uso real, chequear ahora** | |
| Q11 | Preguntar sobre un CUIT con dígito verificador límite (colisión, ver G4) | `validar_cuit` corre el algoritmo real, no lo calcula "de memoria" | |
| Q12 | Hacer que Scriba falle (ej. cortar la conexión a mitad) | Aparece botón "Reintentar" que reenvía el mismo pedido sin reescribir | |

### R. Expedientes

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| R1 | Crear expediente nuevo desde ExpedientesScreen | Aparece en la lista con estado "abierto" | |
| R2 | Vincular un documento existente a un expediente | Aparece en la pestaña Documentos del expediente | |
| R3 | Vincular el mismo documento a un 2° expediente | Ambos vínculos coexisten, no se pisa el primero | |
| R4 | Subir un archivo a la carpeta de Drive del expediente | Aparece en la pestaña Archivos Drive | |
| R5 | Cambiar el estado del expediente (abierto → en trámite → completado) | Se refleja en la lista y en el filtro del sidebar | |
| R6 | Buscar documentos para vincular por apellido de una parte | `ModalVincularDoc` los encuentra por full-text, no solo por título | |

### S. Herramientas

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| S1 | Calculadora CUIT: DNI + género → resultado | CUIT correcto, botón Copiar funciona | |
| S2 | Calculadora CUIT: botón "Verificar en Plataforma Notario" | Abre `plataformanotario.cnmza.org.ar` en pestaña nueva (pide login propio, no autocompleta nada) | |
| S3 | Presupuesto Notarial: elegir un acto y completar montos | Calcula honorarios/sellos/tasas coherentes con la Ley 5053-8100 vigente | |
| S4 | Presupuesto Notarial: sobreescribir un valor a mano | Permite override y "Restaurar" al valor original | |
| S5 | Herramientas → tarjetas "Próximamente" (Informe de Dominio) | No son clickeables o avisan que no está disponible, no rompen | |

### T. Persistencia, autoguardado y recarga

| # | Test | Resultado esperado | ✓/✗ |
|---|------|--------------------|-----|
| T1 | Cargar datos, esperar el autoguardado (indicador "Guardado hace un momento") | Se guarda solo, sin acción manual | |
| T2 | Recargar la página (F5) con un documento abierto | Vuelve a abrir el mismo documento con todos los datos (partes, cláusulas, extravars) | |
| T3 | Cerrar la pestaña sin guardar manualmente y volver a entrar desde Home | El autoguardado ya lo había persistido — no se perdió nada | |
| T4 | Abrir el mismo documento en dos pestañas y editar en ambas | Documentar qué pasa (caso conocido no resuelto — ver si pisa datos) | |

---

## FASE 2 — Fatima (escribana, usuario real)

> Objetivo: validar que el flujo principal funciona sin explicaciones técnicas.
> No mostrar código, no explicar arquitectura. Solo el producto.

### Flujo principal que debe poder hacer sola

| # | Tarea | Cómo se la pedís | ✓/✗ | Comentario de Fatima |
|---|-------|------------------|-----|----------------------|
| F01 | Entrar al sistema | "Entrá a notarial.lat" | | |
| F02 | Crear una certificación nueva | "Creá un documento nuevo" | | |
| F03 | Cargar los datos del requirente | "Completá los datos de la parte" | | |
| F04 | Buscar un requirente por DNI | "Buscá a alguien por DNI en el buscador" | | |
| F05 | Ver el documento en el editor | "¿Cómo se ve el documento?" | | |
| F06 | Cambiar la fecha del acto | "Cambiá la fecha a mañana" | | |
| F07 | Completar número de libro y acta | "Completá el protocolo" | | |
| F08 | Guardar el documento | "Guardá" | | |
| F09 | Descargar el DOCX | "Bajate el Word" | | |
| F10 | Hacer una consulta a Scriba | "Preguntale algo a Scriba" | | |
| F11 | Pedirle a Scriba que calcule un CUIT | "Pedile el CUIT de un DNI tuyo" | | |

### Preguntas de UX a Fatima después de cada tarea

- ¿Entendiste qué tenías que hacer?
- ¿Encontraste lo que buscabas fácilmente?
- ¿Algo te confundió o esperabas que fuera diferente?
- ¿Faltó algo?

### Test de Scriba normativo (ella sola, sin ayuda)

Darle estas consultas reales y registrar respuestas:

| # | Consulta | ¿La respuesta fue útil? | ¿Fue precisa? | ¿Faltó algo? |
|---|----------|------------------------|---------------|--------------|
| S01 | Una consulta de su día a día (que elija ella) | | | |
| S02 | "¿Tengo que mencionar sellos en un boleto que no voy a sellar en ATM?" | | | |
| S03 | "¿Cuándo necesito autorización de zona de frontera?" | | | |
| S04 | "¿Qué pasa con los derechos de agua si vendo un campo en Mendoza?" | | | |

---

## FASE 3 — Lucas y Fatima juntos

### Casos normativos complejos para Scriba

| # | Consulta | Respuesta Scriba | Evaluación Fatima | Delta con criterio real |
|---|----------|------------------|-------------------|------------------------|
| C01 | Poder revocable con autocontratación post mortem — ¿qué pasa? | | | |
| C02 | Compraventa de inmueble rural con riego en Luján de Cuyo a ciudadano chileno | | | |
| C03 | Testamento por acto público — requisitos completos | | | |
| C04 | SAS con dos socios — ¿escritura pública o instrumento privado? | | | |
| C05 | Vivienda IPV con deuda pendiente — ¿se puede vender? | | | |
| C06 | Partición hereditaria — ¿cuándo necesita escritura? | | | |
| C07 | Conviviente de hecho vende vivienda familiar — ¿qué necesitamos? | | | |
| C08 | Capacidad restringida por sentencia — ¿cómo comparece? | | | |

### Calibración de Scriba vs criterio de Fatima

Para cada respuesta de Scriba, Fatima responde:
- **Correcto** — coincide con la norma y el criterio del Colegio
- **Incompleto** — falta algo importante
- **Incorrecto** — error de fondo (documentar exactamente qué)
- **Gris** — depende del caso, ninguno tiene razón absoluta

### UX avanzada

| # | Test | Resultado esperado | Comentario |
|---|------|--------------------|------------|
| U01 | Fatima usa Scriba para redactar algo que necesita hoy | Flujo natural sin fricción | |
| U02 | Fatima intenta insertar texto en OO | ¿Funciona? ¿Es intuitivo? | |
| U03 | Fatima busca un requirente que sabe que existe | ¿Lo encuentra rápido? | |
| U04 | Fatima intenta algo que el sistema no soporta | ¿El error es comprensible? | |

---

## Registro de bugs encontrados

| # | Dónde | Descripción | Severidad | Estado |
|---|-------|-------------|-----------|--------|
| 1 | Editor — Propiedades del acto | Los campos de extravars/cláusulas regeneran el documento en cada tecla en vez de al salir del campo (onBlur) | Media | ✅ Resuelto 27/07/26 |
| 2 | Editor — campo PRECIO | Precio en letras se tipea a mano en vez de derivarse automáticamente del valor en números | Media | ✅ Resuelto 27/07/26 |
| 3 | Conversor número→letras | No fuerza la unidad "mil" ni los centavos ("CON 00/100") en montos — ligado al bug #2 | Media | ✅ Resuelto 27/07/26 |
| 4 | Documento generado (OO) | Tags HTML literales (`<strong>...</strong>`) aparecen como texto plano en el cuerpo en vez de negrita real — ej. "ante mí, `<strong>`FABIÁN MCLEOD`</strong>`, Notar..." | Alta | ✅ Resuelto 27/07/26 |
| 5 | Editor — navegación | Abrir "otro documento" desde Scriba mientras ya se estaba dentro del editor dejaba el editor colgado en "Preparando documento..." infinito (y rompía el modal de Formato de rebote): `<EditorScreen>` no tenía `key` en App.jsx, así que React reusaba la instancia vieja con estado stale (templateId, partes, refs de auto-generate) en vez de remontar | Alta | ✅ Resuelto 29/07/26 |
| 6 | Editor — ModalFormato | Al reabrir un documento existente, los ajustes de formato (fuente, márgenes, interlineado, etc.) nunca se habían guardado en el documento — volvían siempre a los valores por defecto en silencio | Alta | ✅ Resuelto 29/07/26 |
| 7 | Editor — carga de template | Si el template fallaba al cargar desde Supabase (fila faltante/duplicada, error de RLS), el editor quedaba en "Preparando documento..." para siempre sin ningún error visible | Alta | ✅ Resuelto 29/07/26 — ahora muestra una alerta si falla |
| 8 | Editor — salir sin guardar | Agregar un fragmento de texto directo en OO y presionar "volver" salía sin avisar y esa edición se perdía, porque el chequeo de "cambios sin guardar" no contemplaba ediciones hechas solo en OO (sólo partes/escribano/fecha/etc.) | Alta | 🔶 Parcialmente resuelto 29/07/26 — ahora avisa antes de salir; falta forzar el guardado real del cuerpo OO (requiere trabajo de backend, ver nota abajo) |
| 9 | Editor — texto de adscriptos | "Notaria/o Adscripta/o **del** Registro Notarial número..." debería decir "**al** Registro Notarial" para adscriptos (titulares sí llevan "del") — afectaba 50 de 52 templates (la variable `ESCRIBANO_AL_DEL` ya existía pero sólo estaba cableada en 2); 2 de esos 50 (`cert_copia`, `fe_vida`) tenían el bug inverso, con "al" hardcodeado también para titulares | Media | ✅ Resuelto 29/07/26 — `scripts/fix_adscripto_al_del.sql` corrido en Supabase vía MCP, verificado: 0 templates con el patrón viejo, 52/52 usando `ESCRIBANO_AL_DEL` |
| 10 | Modal de escribanos | El orden debería ser Titular → Adscriptos → otros usuarios (las 3 consultas a `registros` ordenaban por `.order("rol")`, alfabético, que ponía adscripta/adscripto ANTES que titular) | Baja | ✅ Resuelto 29/07/26 |
| 11 | Redacción — CCyC art. 306 | El sistema siempre asume identificación por inciso a) (documento exhibido); no ofrece el inciso b) (conocimiento personal del escribano) como alternativa. Confirmado: hardcodeado en 7 lugares de `templateVars.js` (`AUTORIZANTE_CAPACIDAD` y varios bloques de certificación de firmas), sin ninguna rama condicional | Media | Pendiente — falta decidir el texto exacto del inciso b) (redacción legal nueva, no la escribo sin que la revisen) |
| 12 | Partes — cónyuge | No había forma de vincular el/la cónyuge a una parte casada | Media | ✅ Resuelto 29/07/26 — se eligió el modelo "dos partes relacionadas": nuevo campo `relacionadoConId`/`tipoRelacion` (cónyuge/conviviente) en cada parte, UI en el editor de partes, y variables derivadas `PARTE_N_CONYUGE_NOMBRE/DNI/DOMICILIO` + `PARTE_N_TIPO_RELACION` en `templateVars.js`. La cláusula `asentimiento_conyugal` (5 templates de compraventa) ahora se completa sola vía la nueva variable global `CONYUGE_IDENTIDAD` (toma a quien declaró el vínculo) — de yapa, se descubrió que el mecanismo de variables_json por cláusula nunca tuvo UI para completarse a mano (el checkbox de activar/desactivar clásulas siempre manda `valores: {}`), así que este era el único camino real para que esa cláusula funcionara |
| 13 | Editor (admin) — "Preparando documento" infinito, segunda causa | Confirmado en producción (notarial.lat) después del fix del bug #5 — un documento nuevo tipo "Certificación de firma" quedaba colgado con escribano en blanco ("Admin, Notario/a Adscripto/a · Reg. [vacío]"). Causa distinta a la del #5: para un admin, el efecto de auto-generación esperaba `miembros.length === 0` para saber si ya cargaron los miembros del registro activo — pero eso no distingue "todavía no llegó la respuesta" de "llegó y el registro no tiene miembros cargados", así que en el segundo caso quedaba bloqueado para siempre | Alta | ✅ Resuelto 29/07/26 — se agregó una bandera `miembrosCargados` en AuthContext que sólo es true una vez que el fetch efectivamente resolvió (con o sin datos), y el efecto de auto-generación ahora espera esa bandera en vez de `length===0`. De paso: el panel "Escribano" ahora muestra el punto rojo de alerta cuando no tiene registro asignado (antes sólo Partes/Protocolo lo mostraban) |

---

## Criterios de "listo para demo externa"

- [ ] Flujo J1 (cert. firma completa) funciona sin errores en 3 intentos seguidos
- [ ] Scriba responde correctamente F1-F8 sin errores de fondo
- [ ] CUIT se calcula correctamente en modal y en Scriba
- [ ] Fatima completa F01-F11 sin ayuda técnica
- [ ] Scriba pasa el 80% de los casos C01-C08 según criterio de Fatima
- [ ] Inserción de texto en OO funciona (I2)
- [ ] **Sección N completa (N1-N10) sin ningún ✗** — es el gate más importante de todos: si algo de la sincronización OO↔React falla en silencio, no importa cuán bien funcione el resto
