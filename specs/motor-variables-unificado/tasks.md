# Tasks: Motor de variables unificado para Carga Masiva

**Plan:** [`plan.md`](plan.md) (aprobado)
**Estado:** ⬜ no iniciado

Orden estricto — cada tarea es verificable por separado antes de pasar a
la siguiente. Implementación en rama propia (`feat/motor-variables-unificado`
o similar) + PR, nunca directo a `main`.

- [ ] **T1 — Aislar las variables propias del inmueble, sin cambiar su lógica**
  Extraer del cuerpo de `generarEscritura()` el bloque de variables que
  no tiene equivalente en `buildVars()` (`NRO_ESCRITURA*`,
  `FECHA_ESCRITURA`, `MANZANA`, `LOTE`, `SUP_*`, `LIMITES`,
  `PLANO_MENSURA`, `PRECIO_*`, `RETENCION_GANANCIAS*`, `CERT_*`,
  `NOMENCLATURA`, `AVALUO`, `PADRON_*`, `TRANSMITENTE_*`,
  `MATRICULA_SIRC`, `ESCRIBANO_LOCALIDAD`) a una función propia, sin
  tocar ni un valor. Refactor puro.
  **Verificación:** generar la escritura de un lote de prueba (con datos
  en todos los campos de inmueble) antes y después de este paso — el
  HTML resultante debe ser idéntico.

- [ ] **T2 — Reemplazar el cálculo de identidad por `buildVars()`**
  Importar `buildVars` de `templateVars.js`. Llamarlo con
  `{ partes: lote.partes || [], escribano, fecha }` y fusionar su
  resultado con las variables de inmueble de T1. Eliminar la lógica
  vieja de `ADQ_*` y los helpers que quedan sin uso (`fmtDni` y
  `fmtFechaLetras` de persona — no de superficies/otros usos que sigan
  haciendo falta).
  **Verificación:** con un lote de un solo adquirente, comparar la
  escritura generada antes/después. Deben coincidir todos los datos
  salvo dos cambios esperados y documentados en `plan.md`: el domicilio
  (ahora usa todos los campos disponibles, no solo calle/número/
  localidad) y `ESCRIBANO_REGISTRO_LETRAS` (ahora en minúscula).

- [ ] **T3 — Test: lote con múltiples adquirentes (UC-1)**
  Nuevo test (`src/__tests__/generarEscritura.test.js`, no existe
  todavía) que arma un lote con dos o más `partes` con distintos roles y
  confirma que las variables de **todos** aparecen (`PARTE_1_*`,
  `PARTE_2_*`, etc.), no solo las del primero.
  **Verificación:** el test falla contra el código viejo (confirma que
  cubre el bug real) y pasa contra el código nuevo.

- [ ] **T4 — Test: concordancia de rol y género (UC-2)**
  Test con partes de distinto género y rol (ej. compradora + cónyuge del
  comprador) que confirma que las fórmulas de concordancia
  (`COMPARECE_TEXTO`/`DICE_TEXTO` en plural cuando corresponde,
  `PARTE_N_ARTICULO`, `PARTE_N_ROL` con la concordancia de
  `fmtRol`) salen igual que para cualquier otro documento del sistema.
  **Verificación:** test pasa.

- [ ] **T5 — Test: variables de inmueble sin regresión (UC-3)**
  Test con un lote completo (superficies de mensura y los 4 títulos,
  límites, precio, retención, certificados de registro/catastro,
  padrones, nomenclatura, avalúo) que confirma que cada variable de
  inmueble sale con el mismo valor y formato que el motor actual.
  **Verificación:** test pasa; si hace falta, se arma comparando contra
  la salida capturada en la verificación manual de T1.

- [ ] **T6 — Smoke test manual en la app real**
  Con un barrio y lote de prueba en el ambiente real (o un preview de
  Vercel), abrir `LoteDocScreen`, cargar un lote con más de un
  adquirente con roles distintos, y confirmar visualmente en la vista
  previa que todos aparecen con la redacción correcta. Confirmar
  también que un lote con un solo adquirente y todos los datos de
  inmueble se ve igual que antes (salvo los dos cambios esperados de T2).
  **Verificación:** documentar qué se probó en la descripción del PR —
  no hay ambiente de staging estable, así que esto reemplaza a ese paso.

- [ ] **T7 — PR, merge, y cierre del ciclo**
  Abrir el PR con el resumen de qué cambió y por qué (referenciando
  `spec.md`/`plan.md`). Tras mergear: actualizar `PROYECTO.md`, mover el
  ítem de "🔵 En curso" a "✅ Recién terminado" en `BACKLOG.md`, marcar
  la Feature #8 y las User Stories #9-11 como `Closed` en Azure DevOps,
  y actualizar `epics/carga-masiva-rebuild.md` para reflejar que la
  Feature 1 está lista y las Features 2-5 (que dependen de esta) pueden
  arrancar.
