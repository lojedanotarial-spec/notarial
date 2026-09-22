# UC-3: Variables propias del inmueble sin regresión

**Actor:** Escribano generando o exportando la escritura de un lote de
barrio.

**Disparador:** El lote tiene cargados sus datos propios de inmueble:
manzana, lote, superficies (mensura y hasta 4 títulos), límites, precio,
retención de ganancias, y certificados (registro, catastro, avalúo,
padrones, nomenclatura).

**Flujo esperado:**
1. Todas esas variables siguen generándose exactamente igual que hoy
   (mismo formato, mismos montos en letras, misma redacción de
   superficies y límites) — el motor unificado no es una reescritura de
   esta parte, es una migración de "dónde vive el cálculo".
2. No hace falta cargar de nuevo ningún dato en los barrios/lotes ya
   existentes en Supabase (`lotes.datos_json`) para que sigan
   funcionando.

**Estado actual:** esto ya funciona bien en `generarEscritura.js` — este
caso de uso existe para fijar como criterio de aceptación que la
migración al motor unificado **no rompa** lo que ya anda, no para pedir
ningún cambio de comportamiento acá.

**Fuente:** lectura de `src/utils/generarEscritura.js` y
`src/screens/LoteDocScreen.jsx` (campos de `PanelLote`: Inmueble, Precio,
Registraciones).
