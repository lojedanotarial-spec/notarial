# UC-3: La escritura generada de un lote queda guardada en su carpeta de Drive

**Actor:** Escribano que ya generó/editó la escritura de un lote (Feature
2, editor unificado).

**Disparador:** La escritura del lote se genera o se actualiza.

**Flujo esperado:** una copia queda guardada en la carpeta de Drive de
ese lote, junto con la documentación que ya se subió ahí (UC-1) — todo
lo relacionado a ese lote en un solo lugar, no repartido entre Supabase
y Drive sin conexión visible entre ambos.

**Estado actual:** la escritura de un lote hoy solo vive en Supabase
(`documentos`/`oo-docs`, ver Feature 2) — no hay ninguna copia en Drive.

**Decisión de alcance:** esto es una conveniencia, no reemplaza a
Supabase como fuente de verdad — Supabase sigue siendo de dónde se lee
el documento al abrir "Ver documento". La copia en Drive es para que el
expediente completo del lote (documentación + escritura) se pueda ver
desde Drive también, sin tener que entrar a la app.

**Fuente:** pedido 25/09/26 — "dentro de cada carpeta de lote se van a
guardar las escrituras."
