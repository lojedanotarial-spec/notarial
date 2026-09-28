# UC-1: Guardar documentación de un lote en Drive

**Actor:** Escribano o staff cargando documentación de un lote (fotos de
DNI, tarjeta verde, poder, lo que corresponda a esa escritura puntual).

## Parte A — estructura de carpetas al subir un archivo

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

## Parte B — pre-crear los lotes de un barrio antes de tener sus datos

**Problema:** en la realidad, la documentación de un barrio empieza a
llegar (DNIs, poderes) mucho antes de que haya datos cargados de cada
adquirente, y a veces antes incluso de que se genere ninguna escritura.
Hoy un lote solo se crea de a uno, vacío, con el botón "+ Agregar lote"
(`agregarLote` en `BulkScreen.jsx`) — no hay forma de tener de entrada
la carpeta correcta de un lote para empezar a guardar ahí documentación,
sin antes cargar sus datos.

**Disparador:** el escribano sabe la cantidad de lotes de un barrio (y
su numeración por manzana) antes de tener los datos de ningún
adquirente, y quiere tener ya la estructura de carpetas lista para
recibir documentación.

**Flujo esperado:**
1. El escribano abre "Crear estructura de lotes" (o equivalente) desde
   el barrio.
2. Carga una fila por manzana: nombre de la manzana + sus lotes, como
   rango (`1-12`) o lista con saltos (`3,5,7-11`) — porque la
   numeración real no es uniforme entre manzanas (ej: Manzana A tiene
   lotes 1 a 12, Manzana B tiene lotes 3 a 11).
3. Puede agregar tantas filas (manzanas) como necesite.
4. Al confirmar, se crea un lote vacío por cada número declarado — con
   `manzana` y `lote` ya cargados (el resto de los datos vacíos, a
   completar después) — y su subcarpeta de Drive correspondiente, según
   el mismo mecanismo de la Parte A.

**Fuera de alcance:** esto no reemplaza la carga de datos del lote (que
sigue siendo manual, vía `ModalLote`) — solo adelanta su existencia
(fila + nombre + carpeta) para que la documentación tenga dónde ir desde
el primer día.

**Fuente:** pedido 25/09/26 — "el expediente sería el nombre del barrio
y dentro lotes/casas... dentro de cada carpeta de lote va la
documentación"; y 27/09/26 — "quizás necesitemos un minimodal que
pregunte cuántas casas/lotes hay en ese barrio" + "la nomenclatura va a
ser un tema, porque por ahí voy a tener manzana A del lote 1 al 12,
manzana B del lote 3 al 11."
