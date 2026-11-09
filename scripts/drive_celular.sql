-- Subir documentación al expediente desde el celular (specs/documentacion-celular-expediente/plan.md §4)
-- ADITIVA: solo agrega una tabla y columnas con valores por defecto. No cambia ninguna política ni dato existente.
-- Reversión: scripts/drive_celular_rollback.sql

-- Sesiones de subida por QR. El código nunca se guarda, solo su hash. Vale para UN expediente y 30 minutos.
create table if not exists public.drive_sesiones_celular (
  id              uuid primary key default gen_random_uuid(),
  codigo_hash     text not null unique,
  expediente_id   uuid not null references public.expedientes(id) on delete cascade,
  registro_numero text not null,
  usuario_id      uuid not null,            -- quien generó el QR: es quien figura como "subió"
  usuario_nombre  text,
  creada_en       timestamptz not null default now(),
  expira_en       timestamptz not null,     -- creada_en + 30 min
  cerrada_en      timestamptz
);
create index if not exists idx_drive_sesiones_expediente on public.drive_sesiones_celular (expediente_id);
create index if not exists idx_drive_sesiones_creada on public.drive_sesiones_celular (creada_en);

-- RLS activado SIN políticas: solo el servidor (service key) la toca, como el resto de las tablas de Drive.
alter table public.drive_sesiones_celular enable row level security;
revoke all on public.drive_sesiones_celular from anon, authenticated;

-- expediente_archivos: de dónde vino cada archivo, a qué sesión pertenece y el estado de la identificación automática
-- (las columnas de identificación las usa la etapa B; se crean ahora para no migrar dos veces).
alter table public.expediente_archivos
  add column if not exists origen           text not null default 'compu',
  add column if not exists sesion_id        uuid references public.drive_sesiones_celular(id) on delete set null,
  add column if not exists nombre_original  text,
  add column if not exists identificacion   text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'expediente_archivos_origen_chk') then
    alter table public.expediente_archivos add constraint expediente_archivos_origen_chk check (origen in ('compu', 'celular'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'expediente_archivos_identificacion_chk') then
    alter table public.expediente_archivos add constraint expediente_archivos_identificacion_chk
      check (identificacion is null or identificacion in ('pendiente', 'procesando', 'ok', 'sin_identificar', 'manual'));
  end if;
end $$;
-- null en identificacion = nunca se identificó (todo lo anterior); no se identifica retroactivamente.
create index if not exists idx_exparch_sesion on public.expediente_archivos (sesion_id) where sesion_id is not null;
