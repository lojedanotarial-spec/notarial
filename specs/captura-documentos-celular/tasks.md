# Tareas: Captura de documentos desde el celular

**Estado:** implementado y en producción el 06/11/26, **abierto a todos los usuarios** (se abrió el mismo día, antes de completar el checklist manual; ver más abajo).
Convención: ✅ hecha y verificada · 🟡 hecha, falta verificar en celular real · ⬜ pendiente.

## Fase A — Servidor

- ✅ **T1** `scripts/captura_celular.sql`: tabla `capturas` (RLS sin políticas), bucket privado, funciones atómicas, tope de lecturas.
      Verificado con la anon key: no lee, no escribe, no llama a las funciones.
- ✅ **T2** `api/_captura.js`: lógica pura + 30 tests.
- ✅ **T3** `api/captura.js` (+ `_auth.js`, `_capturaPurga.js`, `vercel.json`). Probado en producción con sesiones sembradas por SQL:
      código inválido 404, acción desconocida 400, sin sesión 401, subir / quitar / leer / confirmar, tipo no admitido 400,
      confirmar sin leer 409, subir tras confirmar 409, tope de 5 lecturas 429; modos libre, parte y vehículos.
- ✅ **T4** `api/cron/backup.js`: `capturas` excluida del backup + purga de red de seguridad. Test que lo garantiza.
- 🟡 **T5** `workers/purga` + `scripts/deploy_purga.mjs`: Worker `notarial-purga` desplegado con cron `0 * * * *`.
      La purga se probó a mano (200, 2 purgadas); falta ver **una ejecución horaria real** del Worker.

## Fase B — Celular

- 🟡 **T6** `src/screens/CapturaMovil.jsx`, `src/utils/capturaImagen.js`, ruta `/c/<codigo>`. Verificado en Chrome headless:
      todos los estados a 360 px de ancho; reducción de 4000×3000 a 2000×1500 (175 KB), PNG, fotos chicas, PDF > 3 MB e
      imagen rota. **No probado**: cámara real, galería, HEIC de iPhone.

## Fase C — Escritorio

- 🟡 **T7** `src/hooks/useSesionCaptura.js` (máquina de la sesión, 9 tests), `src/components/CapturaCelular.jsx` (QR con `qrcode`).
- 🟡 **T8** Botón "Desde el celular" en `PartesEditor` (con aviso para agregar personas sobrantes) y `ModalVehiculos` (varios
      vehículos, sin duplicar dominios). Solo admin. **No probado en el navegador con sesión real.**

## Fase D — Scriba

- 🟡 **T9** Herramientas `pedir_captura_celular` y `distribuir_captura`, sesión del QR en `useScribaSesion`, tarjetas del panel,
      evento `scriba:aplicar_captura` en `EditorScreen` (con `capturaAplicar.js`, 9 tests). Probado con el modelo real (7
      escenarios). **No probado de punta a punta en pantalla.**

## Cierre

- ✅ **T10** Documentación: BACKLOG, PROYECTO, estado de spec y feature, memoria.

## Checklist manual (lo único que no puedo verificar yo)

Ya está abierto a todos: el checklist sigue pendiente y es lo que falta para darlo por verificado. Si hiciera falta volver a restringirlo, el interruptor único es `capturaCelularHabilitada` en `src/hooks/useSesionCaptura.js`.

- [ ] iPhone: abrir el QR, elegir 2 fotos de la galería (HEIC), sacar una con la cámara, "Listo", confirmar.
- [ ] Android: lo mismo.
- [ ] Modal de partes: el dato aparece en la parte correcta; con datos tipeados pide confirmación antes de pisar; una persona
      sobrante se puede agregar como parte nueva.
- [ ] Modal de vehículos: dos autos en el mismo QR con "Otro vehículo"; un dominio repetido no se duplica.
- [ ] Scriba: "te paso todo junto" con 2 DNI y 1 tarjeta → pregunta quién es quién → "Aplicar todo" → el documento se regenera una vez.
- [ ] Scriba: cerrar el panel mientras se sacan las fotos; el QR sigue vivo y al llegar los datos aparece el aviso.
- [ ] En Supabase, tras entregar: la fila queda sin fotos ni datos y el bucket `capturas` vacío.
- [ ] A la hora en punto, ver en Cloudflare (Workers → `notarial-purga` → Logs) que corrió y devolvió `{"purgadas":N}`.
- [ ] Comparar la lectura con 8–10 fotos reales (también pendiente en "Modelos de IA" del BACKLOG).

## Pendiente a propósito (no entra en esta entrega)

- Contraste con la MRZ del DNI (criterio del spec): requiere que la lectura devuelva el texto de la MRZ.
- Señalar qué foto individual repetir (hoy se muestran las notas de la lectura y los campos no leídos).
- PDF de más de 3 MB, modo "documento de varias páginas", ícono propio en el celular, otros canales.
- Filas de prueba: quedan 3 filas `vencida` sin datos en `capturas` (el clasificador rechazó el DELETE); se pueden borrar a mano.
