-- Reversión de explorador_rpc.sql. Deja el índice de T1 como estaba (las columnas nuevas se borran; indexar_documento
-- vuelve a la versión de explorador_indice.sql: correr ese script de nuevo si hace falta).
begin;
drop function if exists public.explorador_conteos(jsonb);
drop function if exists public.explorador_buscar(jsonb, text, int, int);
drop function if exists public.explorador_ids(jsonb, text);
drop index if exists public.indice_partes_reg_clave_idx;
alter table public.indice_partes drop column if exists clave;
alter table public.indice_partes drop column if exists nombre;
alter table public.indice_partes drop column if exists apellido;
commit;
