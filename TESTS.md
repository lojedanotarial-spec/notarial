# Plan de Tests — Notarial v2

> Estado: Mayo 2026 | Servidor: Google Cloud Santiago | OO: 9.4.0

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
| | | | | |

---

## Criterios de "listo para demo externa"

- [ ] Flujo J1 (cert. firma completa) funciona sin errores en 3 intentos seguidos
- [ ] Scriba responde correctamente F1-F8 sin errores de fondo
- [ ] CUIT se calcula correctamente en modal y en Scriba
- [ ] Fatima completa F01-F11 sin ayuda técnica
- [ ] Scriba pasa el 80% de los casos C01-C08 según criterio de Fatima
- [ ] Inserción de texto en OO funciona (I2)
