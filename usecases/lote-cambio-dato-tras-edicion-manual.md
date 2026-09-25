# UC-3: Cambiar un dato del lote después de haber editado el documento a mano

**Actor:** Escribano que ya hizo el ajuste puntual de UC-1 (escribió
algo a mano en el documento) y después necesita cambiar un dato del
lote en el panel (por ejemplo corregir el precio).

**Disparador:** Hay una edición manual sin regenerar en el documento, y
el escribano cambia un campo del panel lateral que normalmente
regeneraría la escritura entera.

**Flujo esperado:**
1. El sistema detecta que hay una edición manual todavía no
   "absorbida" por una regeneración.
2. Antes de regenerar (lo que borraría el texto escrito a mano), avisa
   al escribano y pide confirmación explícita.
3. Si confirma, se regenera con el dato nuevo (se pierde el ajuste
   manual, a sabiendas). Si cancela, el documento queda como estaba y
   el dato del panel no se aplica todavía.

**Estado actual:** Este mecanismo **ya existe y funciona** en
`EditorScreen` (los documentos individuales) — no hay que inventarlo,
solo reusarlo para la vista de lote. Es la pieza que hace seguro
migrar `LoteDocScreen` al editor unificado sin arriesgar que un cambio
de dato pise en silencio una corrección manual ya hecha.

**Fuente:** mecanismo verificado en código (`hasOoEdits`/`pendingRegen`
en `EditorScreen.jsx`) — confirmado el 25/09/26 antes de aprobar esta
feature.
