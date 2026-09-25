# UC-1: Corregir un detalle puntual de una escritura sin tocar el modelo

**Actor:** Escribano revisando la escritura generada de un lote de barrio.

**Disparador:** De las ~100 escrituras de un barrio, casi todas salen
bien del modelo — pero una necesita un ajuste puntual (una palabra, un
número, una circunstancia particular de ese lote) que el modelo no
puede prever y que no amerita crear un submodelo aparte.

**Flujo esperado:**
1. El escribano abre la escritura de ese lote.
2. Puede escribir directamente sobre el texto generado, como en
   cualquier otro documento de la app — no solo mirarlo.
3. El ajuste queda guardado para ese lote específico, sin afectar el
   modelo del barrio ni las demás escrituras.

**Estado actual:** `LoteDocScreen` solo muestra una vista previa —
texto generado a partir del modelo, sin forma de escribir sobre él. La
única manera de corregir algo hoy es editar el modelo del barrio
entero (lo que corrompe las otras ~99 escrituras) o exportar a DOCX y
editar afuera de la app (se pierde el circuito: no vuelve a guardarse
en Notarial).

**Fuente:** decisión de alcance 25/09/26 — "siempre hay una letra, un
número, una circunstancia que cambia para una escritura en particular
que un modelo no puede contemplar, y no puedo tener 5 submodelos por
barrio."
