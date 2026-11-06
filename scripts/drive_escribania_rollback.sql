-- Drive de la escribanía — REVERSIÓN (guardada el 06/11/26 antes de aplicar nada).
-- Uso: solo si hay que deshacer la feature. Los archivos ya subidos quedan en el Drive de la escribanía.

-- 1) Restaurar la política original de expediente_archivos (definición leída de pg_policy el 06/11/26)
drop policy if exists "expediente_arch_select" on public.expediente_archivos;
drop policy if exists "expediente_arch_acceso" on public.expediente_archivos;
create policy "expediente_arch_acceso" on public.expediente_archivos
  for all using (
    expediente_id in (
      select expedientes.id from expedientes
      where expedientes.usuario_id = auth.uid() or expedientes.registro_id = mi_registro()
    )
    or es_admin()
  );

-- 2) Sacar lo agregado (CUIDADO: borra las conexiones, enlaces y la auditoría del Drive)
drop index if exists public.uq_exparch_drive_escribania;
alter table public.expediente_archivos drop constraint if exists expediente_archivos_almacen_chk;
alter table public.expediente_archivos
  drop column if exists almacen, drop column if exists tamano, drop column if exists subido_por,
  drop column if exists subido_por_nombre, drop column if exists borrado_en, drop column if exists borrado_por;
alter table public.expedientes drop column if exists drive_carpeta_escribania_id;
drop table if exists public.drive_auditoria;
drop table if exists public.drive_enlaces;
drop table if exists public.drive_conexiones;
