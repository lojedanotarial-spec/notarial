# UC-1: Guardar documentación de un lote en Drive

**Actor:** Escribano o staff cargando documentación de un lote (fotos de
DNI, tarjeta verde, poder, lo que corresponda a esa escritura puntual).

**Disparador:** Desde el lote, sube uno o más archivos.

**Flujo esperado:**
1. Si el barrio todavía no tiene expediente de Drive, se crea uno con su
   nombre (misma carpeta raíz "Notarial" que ya usa el resto de la app).
2. Si el lote todavía no tiene su subcarpeta dentro de ese expediente
   (organizada por manzana), se crea.
3. El archivo queda guardado ahí, visible para cualquiera que abra ese
   lote más adelante — no hace falta volver a subirlo.

**Estado actual:** no existe ninguna forma de guardar documentación por
lote hoy — Carga Masiva no tiene integración de Drive en absoluto. El
patrón (carpeta raíz → subcarpeta → archivos) ya existe y funciona para
expedientes generales (`ExpedienteDetailScreen.jsx`, `driveHelper.js`);
acá se extiende con un nivel más de jerarquía (barrio → manzana → lote).

**Fuente:** pedido 25/09/26 — "el expediente sería el nombre del barrio
y dentro lotes/casas... dentro de cada carpeta de lote va la
documentación."
