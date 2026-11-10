# Spec: Almacenamiento propio de Notarial (sin permisos de Google)

**Estado:** ✅ aprobado por Lucas el 10/11/26 (fase 1 de 3). Siguiente: [`plan.md`](plan.md) → `tasks.md`. NO escribir código hasta que `tasks.md` esté aprobado
**Respuestas de Lucas (10/11/26):** (1) descartar lo de prueba y probar todo desde cero; (2) los archivos de un expediente borrado se eliminan a los 30 días; (3) "Descargar todo" entra en esta versión; (4) "full production para todo": se resuelve la parte de privacidad en el camino, ahora lo importante es que funcione.
**Feature:** [`features/almacenamiento-propio.md`](../../features/almacenamiento-propio.md)
**Epic:** [`epics/documentacion-expedientes-drive.md`](../../epics/documentacion-expedientes-drive.md)
**Casos de uso:** [UC-1](../../usecases/almacenamiento-archivos-expediente.md) · [UC-2](../../usecases/almacenamiento-borrar-recuperar.md) · [UC-3](../../usecases/almacenamiento-lotes-barrios.md) · [UC-4](../../usecases/almacenamiento-administracion.md)
**Reemplaza:** [`specs/drive-escribania/`](../drive-escribania/spec.md) (conexión por registro) y el mecanismo de Drive por usuario de Carga Masiva ([`specs/escaneo-drive-carga-masiva/`](../escaneo-drive-carga-masiva/spec.md))
**Origen:** pedido de Lucas del 10/11/26, tras la prueba con la cuenta de Fátima ("estoy harto de pedir miles de permisos")

## Problema

1. Notarial pide permisos de Google en dos lugares que no se hablan: uno por registro (la cuenta Gmail
   de la escribanía) y otro por usuario (el botón "Entrar con Google"). El segundo vence a la hora y
   falla si se entra con email; el primero exige que alguien con acceso a la cuenta autorice, y Google
   puede pedir verificar un celular que ya no existe.
2. El generador de barrios y Carga Masiva dependen de ese segundo mecanismo, y guardan en el Drive
   personal de cada usuario, no en el de la escribanía.
3. Cada mejora que construimos (personas, sugerencias, identificación) hereda esa dependencia.

## Comportamiento actual (verificado, no supuesto)

- Los archivos de los expedientes viven en el Drive de una cuenta Gmail conectada por registro. Hoy hay
  dos conexiones, ambas de prueba (registros 853 y 9876). El 853 no tiene archivos vigentes; el 9876
  tiene 4 de prueba.
- Carga Masiva y el generador de barrios usan el token de Google de quien inició sesión (dura
  aproximadamente una hora). No funcionan si se entra con email.
- Hay una sola carpeta de barrio creada en el mecanismo viejo y ningún archivo registrado en lotes.
- Los respaldos diarios de la base van a un almacenamiento de Cloudflare ya contratado; los archivos de
  expedientes no se respaldan ahí porque viven en Drive.
- "Entrar con Google" pide, además de identificarse, permiso para crear archivos en Drive.

## Comportamiento deseado (criterios de aceptación)

**Archivos sin Google** *(UC-1)*
- [ ] Subir, ver, bajar, subir por QR desde el celular, renombrar y la identificación automática
      funcionan **igual que hoy**, pero sin que nadie autorice nada en Google, con cualquier forma de
      ingreso.
- [ ] Todo archivo se guarda de forma **privada y separada por registro**: un usuario de un registro no
      puede ver ni bajar archivos de otro, ni conociendo la dirección.
- [ ] El límite de **25 MB por archivo** se mantiene, con el mismo aviso.
- [ ] Los archivos se guardan **en calidad original**, sin recomprimir.
- [ ] Un botón **Descargar todo** baja los archivos vigentes de un expediente en un solo comprimido, con
      los nombres actuales.
- [ ] La pantalla ya no menciona "Drive": habla de "Archivos del expediente".
- [ ] Los errores se muestran en castellano, sin términos técnicos.

**Borrar y recuperar** *(UC-2)*
- [ ] Borrar un archivo lo saca de la lista y lo deja **recuperable 30 días**; después se elimina de
      verdad. El historial de actividad conserva quién lo borró y cuándo, hasta que se borra el expediente.
- [ ] El administrador puede **restaurar** un archivo borrado dentro de esos 30 días.
- [ ] Al borrar un expediente se avisa cuántos archivos tiene y que se eliminarán; los archivos siguen el
      mismo plazo de 30 días.
- [ ] No queda ningún archivo guardado sin un expediente o lote al cual pertenezca, pasado el plazo.

**Barrios y lotes** *(UC-3)*
- [ ] Crear la estructura de un barrio, subir documentación a un lote, escanear un archivo del lote y
      guardar la escritura generada funcionan **sin iniciar sesión con Google**, entrando con email o
      con Google.
- [ ] La escritura generada de un lote queda guardada junto a su documentación y se ve desde el lote.
- [ ] Todo lo de un lote lo ve el mismo registro y ningún otro.

**Administración** *(UC-4)*
- [ ] Se desconectan las conexiones de Drive de prueba, revocando el permiso en Google y borrando el
      token guardado.
- [ ] El panel "Drive de escribanías" y los enlaces de conexión dejan de existir en la aplicación.
- [ ] "Entrar con Google" queda **solo para identificarse**: no pide acceso a Drive.
- [ ] El administrador ve, **por registro, cuántos archivos y cuántos GB** ocupa.
- [ ] Una vez retirado todo, el cliente de Google "Notarial Drive escribanias" puede eliminarse sin
      afectar a nadie.

**Seguridad y privacidad**
- [ ] Los archivos se guardan **cifrados** y solo se entregan a usuarios autenticados del registro dueño,
      a través de Notarial. No existen direcciones públicas permanentes de los archivos.
- [ ] Cada acción sobre un archivo (subir, ver, bajar, renombrar, borrar, restaurar) queda en el
      historial de actividad, como hoy.
- [ ] La identificación automática sigue guardando **solo el nombre y el tipo** de lo que lee.
- [ ] Antes de cargar documentación **real** de clientes, la política de privacidad refleja que Notarial
      custodia los archivos y se consultó la normativa de protección de datos personales y de secreto
      profesional. *(Condición previa a producción real, no a desarrollo.)*

## Fuera de alcance (primera versión)

- Una **copia automática al Drive propio** de la escribanía, o importar archivos desde su Drive.
- Una segunda copia de los archivos en otro proveedor.
- Migrar los archivos de prueba de los Drive actuales (ver pregunta 1).
- Cambiar la forma de nombrar o identificar los archivos.
- Editar archivos dentro de Notarial.
- Cobrar por almacenamiento (solo se mide el uso).

## Preguntas abiertas para Lucas

1. **Archivos de prueba que hoy están en los Drive (4 en el 9876, más los del 853):** ¿los descartamos
   (recomendado, son de prueba) o querés que se copien al almacenamiento nuevo?
2. **Borrar un expediente:** ¿confirmás que sus archivos se eliminen también (tras los 30 días)? En Drive
   quedaban para siempre. Mi recomendación es que se eliminen, para no custodiar documentación sin dueño.
3. **Descargar todo:** ¿lo dejamos como parte de esta versión? Es lo que compensa que Fátima ya no vea los
   archivos en su Drive.
4. **Antes de que Fátima cargue documentos reales,** hay que revisar privacidad y normativa (criterio de
   seguridad). Hasta entonces, ¿ella prueba solo con documentos de ejemplo?
