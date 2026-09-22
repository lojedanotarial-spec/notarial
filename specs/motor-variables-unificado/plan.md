# Plan: Motor de variables unificado para Carga Masiva

**Spec:** [`spec.md`](spec.md) (aprobado, sin preguntas abiertas)
**Estado:** ✅ aprobado (22/09/26) — listo para `tasks.md`

## Causa raíz (por qué un solo cambio resuelve los 3 UC)

`src/utils/generarEscritura.js` calcula las variables de identidad de los
adquirentes con su propia lógica, en paralelo a `buildVars()`
(`src/utils/templateVars.js`), que ya resuelve exactamente el mismo
problema —para el resto de la app— con más capacidad: múltiples personas,
rol, concordancia de género/plural, y el mismo formateo de nombre/DNI/
domicilio en todos lados. `generarEscritura.js` solo lee
`lote.partes[0]` porque nunca tuvo motivo para leer más de una — se
escribió pensando en un único comprador.

`lote.partes` ya se carga con `ModalPartes` (el mismo componente que usa
el resto del sistema, con `showRol={true}`), así que **el dato ya tiene
la forma que `buildVars()` espera** — nombre, apellido, nroDoc, cuit,
nacionalidad, estadoCivil, fechaNac, genero, rol, y los campos de
domicilio. El problema no es de datos, es de qué función los procesa.

**La solución es que `generarEscritura.js` deje de calcular variables de
identidad a mano y le pase `lote.partes` a `buildVars()`**, igual que
hace cualquier otra pantalla del sistema. Las variables propias del
inmueble (manzana, superficies, límites, precio, certificados) no tienen
equivalente en `buildVars()` porque son propias de un lote — esas se
extraen tal cual existen hoy, sin tocar su lógica, y se agregan al mismo
objeto de variables.

## Archivos afectados

- **`src/utils/generarEscritura.js`** — se reescribe el cálculo de
  variables, sin tocar la firma de la función
  (`generarEscritura(templateHTML, lote, barrio, escribano, fecha, nroEscritura)`)
  ni la lógica de sustitución/resaltado que ya usa `LoteDocScreen` para
  la vista previa (`<span class="var-filled">` / `var-empty`):
  - Importa `buildVars` de `./templateVars.js`.
  - Llama `buildVars({ partes: lote.partes || [], escribano, fecha })`
    → variables de identidad (`PARTE_N_*`, `ESCRIBANO_*`, `FECHA_*`) para
    **todos** los adquirentes, con rol y concordancia.
  - Mantiene, extraída tal cual (sin cambios de comportamiento), la
    lógica de variables propias del inmueble que no tiene equivalente en
    `buildVars()`: `NRO_ESCRITURA*`, `FECHA_ESCRITURA`, `MANZANA`,
    `LOTE`, `SUP_*`, `LIMITES`, `PLANO_MENSURA`, `PRECIO_*`,
    `RETENCION_GANANCIAS*`, `CERT_*`, `NOMENCLATURA`, `AVALUO`,
    `PADRON_*`, `TRANSMITENTE_*`, `MATRICULA_SIRC`, `ESCRIBANO_LOCALIDAD`.
  - Deja de generar las variables `ADQ_*` — se reemplazan por
    `PARTE_N_*` (ver decisión 2).
  - Elimina los helpers locales que quedan sin uso (`fmtDni`,
    `fmtFechaLetras` para datos de persona) una vez que `buildVars()`
    cubre esa parte.
- **`src/utils/templateVars.js`** — sin cambios. Ya soporta todo lo que
  este plan necesita.
- **`src/screens/LoteDocScreen.jsx`** — sin cambios. Ya arma `escribano`
  y `fecha` con la forma exacta que `buildVars()` espera (confirmado
  leyendo el componente); sigue llamando a `generarEscritura()` igual
  que hoy.
- **`src/components/modals/ModalPartes.jsx`** — sin cambios. Ya soporta
  rol y múltiples partes.
- **`src/__tests__/`** — nuevo archivo de test para
  `generarEscritura.js` (hoy no tiene) cubriendo los 3 UC.

## Decisiones de diseño

### 1. Un solo adquirente sigue funcionando exactamente igual en el caso simple

Para un lote con un solo adquirente, `PARTE_1_DNI`, `PARTE_1_NOMBRE`,
etc. deben salir con el mismo valor, dato por dato, que el
`ADQ_DNI`/`ADQ_NOMBRE_COMPLETO`/etc. de hoy — `buildVars()` usa la misma
fórmula de DNI (`fmtDni`) que `generarEscritura.js` ya tenía copiada. La
única diferencia deliberada es el domicilio: `buildVars()` arma el
domicilio con todos los campos disponibles (barrio/manzana/casa/piso/
dpto/departamento/provincia/país), no solo calle/número/localidad — esto
es la corrección pedida en UC-2 (mismo formateo que el resto del
sistema), no una regresión de UC-3, que aplica solo al bloque de
variables del inmueble.

### 2. Sin alias de compatibilidad — hoy no hay ningún template cargado

Se evaluó agregar alias `ADQ_*` calculados desde `PARTE_1_*` para no
romper templates de barrio ya curados con esos nombres. Se descarta:
verificado contra `templates_barrio` (la tabla de Supabase donde se
guardan los modelos, editada desde `ModeloScreen.jsx`), **hoy no hay
ningún barrio con modelo cargado** — no existe nada que el alias tuviera
que preservar. Agregar esa capa igual sería complejidad para un caso que
no pasa.

`PARTE_N_*` (con `N` = posición del adquirente) pasa a ser la única
convención, la misma que usa el resto del sistema. Cuando se carguen los
primeros modelos de barrio (Feature "Curación de modelo por barrio",
staff, dependiente de esta), van a usar `PARTE_N_*` desde el primer día
— sin variables viejas que migrar.

Si en el futuro aparece un template externo (de otra escribanía, por
ejemplo) que ya venga escrito con `{{ADQ_*}}`, se resuelve en ese
momento con la curación manual que ya está prevista para todo modelo
nuevo (Feature 4) — no hace falta anticiparlo en el motor.

### 3. La sustitución y el resaltado de variables en la vista previa no cambian

`generarEscritura()` sigue devolviendo el HTML con `{{VAR}}` reemplazado
por `<span class="var-filled">valor</span>` o
`<span class="var-empty">{{VAR}}</span>` para las que faltan — eso es un
mecanismo de la vista previa de `LoteDocScreen`, no de cálculo de
variables, y el spec no pide tocarlo. Cambia únicamente **de dónde sale**
el objeto `vars` que se le pasa a esa sustitución.

### 4. `ESCRIBANO_REGISTRO_LETRAS` pasa a minúscula (se resuelve a favor de `buildVars()`)

`generarEscritura.js` generaba esta variable en mayúscula/tal-cual de
`numeroALetras`; `buildVars()` la devuelve en minúscula (convención ya
usada en el resto del sistema). Al venir ahora de `buildVars()`, se
adopta esa convención — es exactamente el tipo de inconsistencia que este
motor unificado existe para eliminar (criterio de aceptación: "no hay
dos lugares... con reglas diferentes").

## Riesgos / edge cases a cubrir en tasks.md

- Confirmar que ningún nombre de variable propia del inmueble choca con
  un nombre que `buildVars()` ya genera (revisado: no hay colisión —
  prefijos distintos).
- Un lote sin adquirentes cargados (`lote.partes` vacío o `undefined`)
  no debe romper `buildVars()` — ya maneja `partes = []` por defecto,
  verificar igual con un caso de test.
- Verificar con un lote real ya guardado en Supabase (`lotes.datos_json`)
  que el documento generado hoy y el generado después del cambio
  coinciden campo por campo, salvo por la mejora de domicilio (decisión 1)
  y `ESCRIBANO_REGISTRO_LETRAS` (decisión 4).
