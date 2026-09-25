# UC-2: Escanear un documento ya guardado en Drive para autocompletar una parte

**Actor:** Escribano cargando los datos de un adquirente de un lote.

**Disparador:** Ya hay documentación subida a la carpeta de ese lote
(ver UC-1), y el escribano quiere autocompletar los datos de una parte
en vez de tipearlos a mano.

**Flujo esperado:**
1. El escribano toca "Escanear" en el lote.
2. Se abre un selector con los archivos que ya están guardados en la
   carpeta de Drive de ESE lote puntual — no un selector de archivos
   del dispositivo, no toda la carpeta del barrio entero.
3. El escribano elige a mano cuál archivo corresponde a la persona que
   está cargando.
4. Se extraen los datos de ese documento (nombre, DNI, fecha de
   nacimiento, domicilio, etc.) y se autocompletan los campos de la
   parte — mismo resultado que ya da "Escanear documento" en cualquier
   otro lado de la app.

**Estado actual:** el botón "Escanear" que ya existe (`ScanBtn` en
`PartesEditor.jsx`) solo abre el selector de archivos del dispositivo —
no sabe nada de Drive ni de carpetas de lote. El motor de extracción en
sí (`/api/vision`) no cambia; lo que falta es el paso intermedio de
elegir el archivo desde la carpeta correcta de Drive en vez de desde el
disco.

**Decisión de alcance (25/09/26):** sin detección automática de "qué
archivo es de quién" — el escribano siempre elige a mano cuál escanear.
Evita el problema difícil de mapear automáticamente un archivo subido a
la persona correcta cuando puede haber varios adquirentes y varios
documentos por lote.

**Fuente:** pedido 25/09/26 — "si estoy en el lote 8... y le doy
escanear documento en una parte, debería abrirme la carpeta de Drive en
esa localización y yo manualmente le diría qué escanear."
