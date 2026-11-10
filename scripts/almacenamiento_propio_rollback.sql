-- Reversión de almacenamiento_propio.sql (Fase 1).
-- ATENCIÓN: borra las columnas clave y lote_id: se pierde la referencia a archivos propios.
-- Si ya hay filas con almacen='propio', hay que eliminarlas antes (los objetos en R2 quedarían huérfanos).

begin;

drop trigger if exists expedientes_purgar_archivos on public.expedientes;
drop trigger if exists lotes_purgar_archivos on public.lotes;
drop function if exists public.archivos_a_purgar_por_expediente();
drop function if exists public.archivos_a_purgar_por_lote();
drop table if exists public.archivos_a_purgar;

alter table public.drive_auditoria drop column if exists lote_id;

drop index if exists public.expediente_archivos_clave_uq;
drop index if exists public.expediente_archivos_lote_idx;
alter table public.expediente_archivos drop constraint if exists expediente_archivos_clave_chk;
alter table public.expediente_archivos drop constraint if exists expediente_archivos_duenio_chk;
alter table public.expediente_archivos drop constraint if exists expediente_archivos_almacen_chk;
alter table public.expediente_archivos
  add constraint expediente_archivos_almacen_chk
  check (almacen = any (array['personal'::text, 'escribania'::text]));
alter table public.expediente_archivos drop column if exists lote_id;
alter table public.expediente_archivos drop column if exists clave;
-- drive_file_id vuelve a ser obligatorio solo si no quedan filas sin él:
-- alter table public.expediente_archivos alter column drive_file_id set not null;

commit;
