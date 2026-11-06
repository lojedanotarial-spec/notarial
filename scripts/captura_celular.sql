-- Captura de documentos desde el celular (spec: specs/captura-documentos-celular/)
-- Una fila por sesión de captura. SIN políticas RLS a propósito: solo se toca con la service key desde
-- api/captura.js. Con RLS activada y cero políticas, la anon key y los usuarios logueados no ven nada.
-- Esta tabla está EXCLUIDA del backup diario (api/cron/backup.js): guarda datos personales leídos de
-- documentos hasta que la compu los recibe (después se vacían).

create table if not exists public.capturas (
  id              uuid primary key default gen_random_uuid(),
  codigo_hash     text not null unique,            -- SHA-256 del código que viaja en el QR (el código en sí no se guarda)
  usuario_id      uuid not null,
  registro_numero text,
  modo            text not null check (modo in ('parte', 'vehiculos', 'libre')),
  etiqueta        text,                            -- texto para el celular, ej. "Frente y dorso del DNI del COMPRADOR"
  esperadas       jsonb not null default '{}'::jsonb,
  estado          text not null default 'abierta'
                  check (estado in ('abierta', 'leida', 'confirmada', 'entregada', 'cancelada', 'vencida')),
  fotos           jsonb not null default '[]'::jsonb,  -- [{id, path, grupo, tipo, orden}]
  resultado       jsonb,                           -- lectura; se vacía al entregar
  expira_en       timestamptz not null,            -- el código deja de servir (10 min de inactividad)
  vence_duro      timestamptz not null,            -- tope absoluto del código (60 min desde la creación)
  purgar_en       timestamptz not null,            -- tope para destruir fotos y datos (24 h desde la creación)
  creada          timestamptz not null default now(),
  confirmada_en   timestamptz,
  entregada_en    timestamptz
);

alter table public.capturas enable row level security;

create index if not exists idx_capturas_purgar on public.capturas (purgar_en)
  where estado not in ('entregada', 'cancelada', 'vencida');
create index if not exists idx_capturas_usuario on public.capturas (usuario_id);

-- Bucket privado para las fotos (se vacía al entregar la captura o a las 24 h)
insert into storage.buckets (id, name, public)
values ('capturas', 'capturas', false)
on conflict (id) do nothing;
-- Sin políticas sobre storage.objects para este bucket: solo la service key (api/captura.js) lo usa.

-- ── Agregados (mismo día) ────────────────────────────────────────────────────

-- Tope de lecturas por sesión: un código filtrado no puede gastar crédito de Anthropic sin límite.
alter table public.capturas add column if not exists lecturas integer not null default 0;

-- Sumar / quitar una foto de forma atómica. Sin esto, el celular subiendo varias fotos a la vez
-- pisaría la lista (leer–modificar–escribir). Solo las ejecuta la service key.
create or replace function public.captura_agregar_foto(p_id uuid, p_foto jsonb, p_max integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare nuevas jsonb;
begin
  update public.capturas
     set fotos = fotos || jsonb_build_array(p_foto)
   where id = p_id and jsonb_array_length(fotos) < p_max
   returning fotos into nuevas;
  return nuevas;  -- null si no existe la captura o ya se llegó al máximo
end $$;

create or replace function public.captura_quitar_foto(p_id uuid, p_foto_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare nuevas jsonb;
begin
  update public.capturas
     set fotos = coalesce((select jsonb_agg(e) from jsonb_array_elements(fotos) e where e->>'id' <> p_foto_id), '[]'::jsonb)
   where id = p_id
   returning fotos into nuevas;
  return nuevas;
end $$;

revoke all on function public.captura_agregar_foto(uuid, jsonb, integer) from public, anon, authenticated;
revoke all on function public.captura_quitar_foto(uuid, text) from public, anon, authenticated;
grant execute on function public.captura_agregar_foto(uuid, jsonb, integer) to service_role;
grant execute on function public.captura_quitar_foto(uuid, text) to service_role;
