# UC-1: Lote con más de un adquirente

**Actor:** Escribano cargando o revisando la escritura de un lote de barrio (`LoteDocScreen`).

**Disparador:** Un lote tiene más de una persona en `lote.partes` (ej.
cónyuges comprando juntos, o un comprador con su cónyuge asintiendo).

**Flujo esperado:**
1. El escribano carga los adquirentes en el modal de partes (ya soporta
   varios, con rol).
2. La escritura generada incluye los datos de **todos** los adquirentes
   cargados, no solo el primero — cada uno con su propio bloque de
   identidad (nombre, DNI, nacionalidad, domicilio, estado civil).
3. Si el template del barrio usa variables por posición (equivalente a
   `PARTE_1_*`, `PARTE_2_*`, etc. del resto de la app), cada adquirente
   cae en su posición.

**Estado actual:** `generarEscritura.js` solo lee `adquirentes[0]` y
genera variables singulares (`ADQ_NOMBRE_COMPLETO`, `ADQ_DNI`, etc.) —
el segundo adquirente en adelante no aparece en ningún lado de la
escritura generada, sin ningún aviso.

**Fuente:** diagnóstico de `epics/carga-masiva-rebuild.md`, confirmado
leyendo `src/utils/generarEscritura.js` y `src/screens/LoteDocScreen.jsx`
(`ModalPartes` ya se usa con `showRol={true}` y ya soporta múltiples
partes — el motor de variables es el que no las aprovecha).
