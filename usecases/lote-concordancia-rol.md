# UC-2: Concordancia de rol y género

**Actor:** Escribano generando la escritura de un lote de barrio.

**Disparador:** El adquirente (o los adquirentes) del lote tienen un
`rol` y `género` cargados en `ModalPartes` (ej. "COMPRADOR/A",
"CÓNYUGE DEL COMPRADOR").

**Flujo esperado:**
1. El texto generado refleja el rol y género cargados exactamente como
   lo hace el resto del sistema: "el señor"/"la señora", DNI/CUIT
   formateados igual, concordancia singular/plural cuando hay más de un
   adquirente con el mismo rol.
2. Un escribano que ya conoce las escrituras generadas por el resto de
   la app (compraventas, donaciones, etc.) no nota diferencia de
   redacción entre esas y una escritura de lote de barrio.

**Estado actual:** `generarEscritura.js` ignora `rol` por completo y
calcula género con una lógica propia y más simple (`ADQ_TRATAMIENTO`)
que no soporta plural ni las fórmulas de concordancia que ya existen en
`buildVars()` (`fmtRol`, `COMPARECE_TEXTO`/`DICE_TEXTO`, etc.).

**Fuente:** comparación directa de `generarEscritura.js` contra
`src/utils/templateVars.js` (`buildVars()`), que ya resuelve esto para
el resto de la app.
