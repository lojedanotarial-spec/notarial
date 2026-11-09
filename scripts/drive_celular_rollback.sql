-- Subir desde el celular — REVERSIÓN de scripts/drive_celular.sql (guardada el 09/11/26 antes de aplicar nada).
-- CUIDADO: borra las sesiones de subida y las marcas de origen/identificación. Los archivos quedan en el Drive.
drop index if exists public.idx_exparch_sesion;
alter table public.expediente_archivos drop constraint if exists expediente_archivos_identificacion_chk;
alter table public.expediente_archivos drop constraint if exists expediente_archivos_origen_chk;
alter table public.expediente_archivos
  drop column if exists identificacion, drop column if exists nombre_original,
  drop column if exists sesion_id, drop column if exists origen;
drop table if exists public.drive_sesiones_celular;
