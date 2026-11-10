-- Almacenamiento propio (R2) — Fase 1: cambios ADITIVOS en la base.
-- Spec: specs/almacenamiento-propio/ (tasks.md T1.1). Reversión: almacenamiento_propio_rollback.sql
-- Es idempotente: se puede correr dos veces sin romper nada.
-- No toca las filas existentes ni las políticas actuales.

begin;

-- 1) expediente_archivos: un archivo pertenece a un expediente O a un lote
alter table public.expediente_archivos
  add column if not exists clave text,
  add column if not exists lote_id uuid references public.lotes(id) on delete cascade;

-- Los archivos propios no tienen id de Drive
alter table public.expediente_archivos alter column drive_file_id drop not null;

-- Nuevo valor de almacén: 'propio'
alter table public.expediente_archivos drop constraint if exists expediente_archivos_almacen_chk;
alter table public.expediente_archivos
  add constraint expediente_archivos_almacen_chk
  check (almacen = any (array['personal'::text, 'escribania'::text, 'propio'::text]));

-- Un archivo tiene expediente o lote (uno solo) y, si es propio, tiene clave
alter table public.expediente_archivos drop constraint if exists expediente_archivos_duenio_chk;
alter table public.expediente_archivos
  add constraint expediente_archivos_duenio_chk
  check ((expediente_id is not null) <> (lote_id is not null));

alter table public.expediente_archivos drop constraint if exists expediente_archivos_clave_chk;
alter table public.expediente_archivos
  add constraint expediente_archivos_clave_chk
  check (almacen <> 'propio' or clave is not null);

create unique index if not exists expediente_archivos_clave_uq
  on public.expediente_archivos (clave) where clave is not null;
create index if not exists expediente_archivos_lote_idx
  on public.expediente_archivos (lote_id) where lote_id is not null;

-- 2) Historial: también para lotes
alter table public.drive_auditoria
  add column if not exists lote_id uuid references public.lotes(id) on delete cascade;

-- 3) Cola de objetos a eliminar del almacén (cuando se borra un expediente o lote)
create table if not exists public.archivos_a_purgar (
  clave text primary key,
  purgar_en timestamptz not null,
  creada_en timestamptz not null default now()
);
create index if not exists archivos_a_purgar_vence_idx on public.archivos_a_purgar (purgar_en);
alter table public.archivos_a_purgar enable row level security;
-- Sin políticas a propósito: solo el servidor (service key) la usa.

-- 4) Triggers: al borrar un expediente o lote, sus archivos propios pasan a la cola (+30 días)
create or replace function public.archivos_a_purgar_por_expediente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.archivos_a_purgar (clave, purgar_en)
  select clave, coalesce(borrado_en, now()) + interval '30 days'
  from public.expediente_archivos
  where expediente_id = old.id and almacen = 'propio' and clave is not null
  on conflict (clave) do nothing;
  return old;
end $$;

create or replace function public.archivos_a_purgar_por_lote()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.archivos_a_purgar (clave, purgar_en)
  select clave, coalesce(borrado_en, now()) + interval '30 days'
  from public.expediente_archivos
  where lote_id = old.id and almacen = 'propio' and clave is not null
  on conflict (clave) do nothing;
  return old;
end $$;

revoke execute on function public.archivos_a_purgar_por_expediente() from public, anon, authenticated;
revoke execute on function public.archivos_a_purgar_por_lote() from public, anon, authenticated;

drop trigger if exists expedientes_purgar_archivos on public.expedientes;
create trigger expedientes_purgar_archivos
  before delete on public.expedientes
  for each row execute function public.archivos_a_purgar_por_expediente();

drop trigger if exists lotes_purgar_archivos on public.lotes;
create trigger lotes_purgar_archivos
  before delete on public.lotes
  for each row execute function public.archivos_a_purgar_por_lote();

commit;
