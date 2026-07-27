# Checklist manual — piloto de bloques y arreglos del 27/07/26

Sin entorno de staging, esto reemplaza una prueba automatizada de UI. Marcar cada paso; si algo falla, anotar qué pasó y avisar antes de seguir con el siguiente bloque.

## 1. Cláusulas sobre compraventa (ya existía, hoy se sumaron 16 más)

1. Abrir un documento nuevo de `compraventa_urbana`.
2. En "Propiedades del acto" → sección **Cláusulas**, debería aparecer una lista larga (18 cláusulas: las 2 originales + 16 nuevas).
3. Activar **"Pacto de mejor comprador"** (o cualquier otra con variables) — deberían aparecer campos para completar (ej. plazos).
4. Completar esos campos y confirmar que el documento se regenera con el texto de la cláusula al final, antes de "EN SU TESTIMONIO", con numeración correcta (continuando la secuencia de PRIMERO/SEGUNDO/... del cuerpo base).
5. Activar una segunda cláusula (ej. "Venta ad corpus", sin variables) y confirmar que se agrega DESPUÉS de la primera, no la reemplaza.
6. Desactivar ambas y confirmar que el documento vuelve al cuerpo base limpio.
7. Repetir un chequeo rápido (activar 1 cláusula, mirar que se vea bien) en `compraventa_rural`, `compraventa_ph`, `compraventa_lote` y `boleto_compraventa` — las cláusulas no son las mismas 18 en los 5 (algunas son solo de boleto, otras solo de escritura definitiva).

## 2. Cláusulas en familias nuevas (donación, locación, superficie)

8. Abrir `donacion_inmueble` → activar **"Cargo a favor de un tercero con interés público"** → completar el campo de descripción → confirmar que se ve bien.
9. Abrir `locacion_inmueble` → activar **"Prohibición de ceder, prestar y/o sublocar"** → confirmar texto.
10. Abrir `superficie` → activar **"Indivisión forzosa temporaria entre cosuperficiarios"** → completar el plazo → confirmar texto.

## 3. Templates nuevos (cesión de crédito, cesión de posición contractual)

11. Desde el selector de plantillas, buscar **"Cesión de crédito"** — confirmar que aparece y abre un documento en blanco con los campos correctos (incluyendo "Descripción del crédito cedido" como texto libre).
12. Completar partes (Cedente/Cesionario) y los campos del cuerpo — confirmar que el documento se arma bien, con el mismo estilo que el resto (negrita en nombres, etc.).
13. Buscar **"Cesión de la posición contractual"** — esta pide **3 partes** (Cedente, Cesionario, Cedido). Cargar las 3 en el modal de Partes con esos roles y confirmar que las 3 identidades aparecen bien en el encabezado.
14. Activar una de sus 3 cláusulas opcionales (ej. "Fianza como principal pagador") y completar los datos del fiador (texto libre, no es una parte del sistema) — confirmar que se agrega bien al final.

## 4. Precio en letras automático

15. En cualquier template con campo de precio (ej. `compraventa_urbana`, `boleto_compraventa`, `mutuo_simple`), en "Datos del instrumento" **debería aparecer un solo campo numérico** (ej. "Precio en números"), sin un campo aparte para "en letras".
16. Escribir un monto (ej. `1500000`) y confirmar que en el documento aparece automáticamente en letras — algo como "PESOS UN MILLÓN QUINIENTOS MIL CON 00/100 ($ 1500000)".
17. Probar con un monto con centavos escrito en formato argentino (ej. `1500,50`) y confirmar "...CON 50/100".

## 5. Cesión de herencia — cambio de diseño

18. Abrir `cesion_herencia` → en "Datos del instrumento" debería aparecer un campo de texto libre para precio/gratuidad (en vez de los 3 campos viejos de precio) — escribir la cláusula de precio (o de gratuidad) y confirmar que se inserta bien en el documento.

## 6. Modal de Formato reorganizado

19. Abrir el modal de Formato (ícono en la barra) — confirmar que las secciones ahora son: **Tipografía y márgenes**, **Formato de nombres**, **Escribano**, **Énfasis automático** (con todos los toggles de negrita/subrayado juntos ahí), **Visualización en pantalla**. Ningún toggle debería faltar ni comportarse distinto a antes.

## 7. El `<strong>` ya no debería aparecer

20. Generar cualquier documento de la familia compraventa y confirmar que el nombre del escribano aparece en **negrita real** (no como texto `<strong>...</strong>` literal).

---

**Si algo de esto falla:** anotar el paso exacto, qué se esperaba y qué pasó, y avisar antes de seguir usando esa función en un documento real.
