# UC-2: Generar la escritura inicial de un lote

**Actor:** Escribano viendo la escritura de un lote por primera vez
(o después de cargar/corregir sus datos, sin haber editado nada a mano
todavía).

**Disparador:** El escribano toca "Ver documento" de un lote con datos
ya cargados (adquirentes, inmueble, precio, etc.).

**Flujo esperado:**
1. Se genera la escritura con las variables del lote, igual que hoy.
2. Se ve con el mismo editor que el resto de los documentos de la app
   (mismo look, misma barra de herramientas), no una vista aparte.
3. Si el escribano cambia un dato del lote (por ejemplo corrige un DNI)
   antes de haber tocado el texto a mano, el documento se regenera solo
   con el dato nuevo — sin pedir confirmación, porque no hay nada que
   perder todavía.

**Estado actual:** `LoteDocScreen` ya genera la escritura a partir de
las variables del lote y la muestra — esta parte funciona. Lo que
cambia es *cómo* se ve y se genera (editor unificado con OnlyOffice, en
vez de una vista previa HTML propia), no el hecho de que se genere.

**Fuente:** comportamiento base a preservar mientras se migra al editor
unificado — ver UC-1 (motivo del cambio) y UC-3 (qué pasa si ya hay
ediciones manuales).
