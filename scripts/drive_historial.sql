-- El historial de actividad del Drive (drive_auditoria) se conserva COMPLETO y se borra recién cuando se borra el expediente
-- (decisión de Lucas, 09/11/26). Antes la columna expediente_id era un uuid suelto: borrar un expediente dejaba su historial (con nombres
-- de archivo, que pueden incluir el de una persona) para siempre. Ahora queda atado al expediente.
-- ADITIVA. Reversión: scripts/drive_historial_rollback.sql
alter table public.drive_auditoria
  add constraint drive_auditoria_expediente_fk foreign key (expediente_id) references public.expedientes(id) on delete cascade;
create index if not exists idx_drive_auditoria_expediente on public.drive_auditoria (expediente_id);
