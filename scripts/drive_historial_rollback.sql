-- Reversión de scripts/drive_historial.sql
drop index if exists public.idx_drive_auditoria_expediente;
alter table public.drive_auditoria drop constraint if exists drive_auditoria_expediente_fk;
