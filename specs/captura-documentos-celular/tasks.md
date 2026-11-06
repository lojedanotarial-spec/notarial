# Tareas: Captura de documentos desde el celular

**Estado:** en ejecución (06/11/26). Cada tarea se verifica sola antes de pasar a la siguiente.
Convención: ✅ hecha y verificada · 🟡 hecha, falta verificar en celular real · ⬜ pendiente.

## Fase A — Servidor (todo verificable sin celular)

- [ ] **T1** `scripts/captura_celular.sql`: tabla `capturas` + RLS sin políticas + bucket privado `capturas`.
      Aplicarlo en Supabase y verificar con la anon key que no se puede leer ni escribir.
- [ ] **T2** `api/_captura.js`: lógica pura + tests (etiqueta, fusión de personas/vehículos, vencimientos, selección de purga).
- [ ] **T3** `api/captura.js` + `_auth.js` + `vercel.json`: las acciones del servidor. Probar con curl las que van por código
      (info/subir/quitar/leer/confirmar) usando una sesión sembrada por SQL.
- [ ] **T4** `api/cron/backup.js`: excluir `capturas` + purga oportunista. Test que lo garantice.
- [ ] **T5** `workers/purga` + `scripts/deploy_purga.mjs`: purga horaria; desplegar y probar.

## Fase B — Celular

- [ ] **T6** `src/utils/capturaImagen.js` (+ tests de la parte pura) y `src/screens/CapturaMovil.jsx`; ruta `/c/<codigo>` en `App.jsx`.

## Fase C — Escritorio

- [ ] **T7** `src/components/CapturaCelular.jsx` (QR + sondeo) y dependencia `qrcode`.
- [ ] **T8** Integrar en `PartesEditor` y `ModalVehiculos` (solo admin al principio).

## Fase D — Scriba

- [ ] **T9** Herramientas `pedir_captura_celular` y `distribuir_captura`, prompt, tarjetas del panel y "Aplicar todo".

## Cierre

- [ ] **T10** Documentación: `BACKLOG.md`, `PROYECTO.md`, estado del spec/feature, memoria.

## Checklist manual (lo único que no puedo verificar yo)

- [ ] iPhone: abrir el QR, elegir 2 fotos de la galería (HEIC), sacar una con la cámara, "Listo", confirmar.
- [ ] Android: lo mismo.
- [ ] Modal de partes: el dato aparece en la parte correcta; con datos tipeados pide confirmación antes de pisar.
- [ ] Modal de vehículos: dos autos en el mismo QR, con "Otro vehículo".
- [ ] Scriba: "te paso todo junto" con 2 DNI y 1 tarjeta → pregunta quién es quién → "Aplicar todo".
- [ ] Confirmar en Supabase que, tras entregar, la tabla no tiene datos y el bucket `capturas` está vacío.
- [ ] Abandonar un lote y verificar que a las 24 h (o forzando `purgar_en`) desaparece.
