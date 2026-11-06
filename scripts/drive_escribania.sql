-- Drive de la escribanía (specs/drive-escribania/plan.md §4)
-- PARTE 1: ADITIVA. Solo agrega tablas y columnas con valores por defecto. No cambia ninguna política existente,
-- así que la pestaña de archivos actual sigue funcionando igual hasta el deploy.
-- La PARTE 2 (cambio de política de expediente_archivos) está en scripts/drive_escribania_politicas.sql y se aplica en T6.2.

-- Una conexión de Google Drive por registro (el token va cifrado; la clave vive en Vercel, no en la base)
create table if not exists public.drive_conexiones (
  registro_numero       text primary key,
  google_email          text not null,
  refresh_token_cifrado text not null,
  estado                text not null default 'activa' check (estado in ('activa', 'rota')),
  motivo                text,
  sin_espacio           boolean not null default false,
  carpeta_raiz_id       text,
  cuota_usada           bigint,
  cuota_total           bigint,
  cuota_leida_en        timestamptz,
  conectada_en          timestamptz not null default now(),
  conectada_por         uuid,
  actualizada_en        timestamptz not null default now()
);

-- Enlaces de un solo uso para conectar (se guarda solo el hash del código)
create table if not exists public.drive_enlaces (
  id              uuid primary key default gen_random_uuid(),
  codigo_hash     text not null unique,
  registro_numero text not null,
  creado_por      uuid not null,
  creado_en       timestamptz not null default now(),
  expira_en       timestamptz not null,
  usado_en        timestamptz
);
create index if not exists idx_drive_enlaces_registro on public.drive_enlaces (registro_numero);

-- Quién hizo qué
create table if not exists public.drive_auditoria (
  id              bigint generated always as identity primary key,
  registro_numero text not null,
  usuario_id      uuid,
  accion          text not null,
  expediente_id   uuid,
  archivo_id      uuid,
  detalle         jsonb,
  creada_en       timestamptz not null default now()
);
create index if not exists idx_drive_auditoria_registro on public.drive_auditoria (registro_numero, creada_en desc);

-- RLS activado SIN políticas: solo el servidor (service key) las toca. Ningún navegador las lee ni escribe.
alter table public.drive_conexiones enable row level security;
alter table public.drive_enlaces    enable row level security;
alter table public.drive_auditoria  enable row level security;
revoke all on public.drive_conexiones, public.drive_enlaces, public.drive_auditoria from anon, authenticated;

-- expediente_archivos: columnas nuevas. Lo existente queda como 'personal' (viejo, se oculta en la parte 2).
alter table public.expediente_archivos
  add column if not exists almacen            text not null default 'personal',
  add column if not exists tamano             bigint,
  add column if not exists subido_por         uuid,
  add column if not exists subido_por_nombre  text,
  add column if not exists borrado_en         timestamptz,
  add column if not exists borrado_por        uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'expediente_archivos_almacen_chk') then
    alter table public.expediente_archivos
      add constraint expediente_archivos_almacen_chk check (almacen in ('personal', 'escribania'));
  end if;
end $$;
-- Un mismo archivo de Drive no se registra dos veces (por ejemplo si se repite la confirmación de subida)
create unique index if not exists uq_exparch_drive_escribania
  on public.expediente_archivos (drive_file_id) where almacen = 'escribania';

-- expedientes: carpeta en el Drive de la escribanía (no reusa drive_folder_id, que apunta a un Drive personal)
alter table public.expedientes add column if not exists drive_carpeta_escribania_id text;
