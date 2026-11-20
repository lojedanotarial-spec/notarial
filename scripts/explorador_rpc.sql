-- Explorador T4: funciones de búsqueda y conteos sobre el índice (requiere explorador_indice.sql aplicado).
-- Spec: specs/archivo-legal-y-explorador/ (tasks.md T4). Reversión: explorador_rpc_rollback.sql
-- Aditivo e idempotente. Las funciones son SECURITY INVOKER: la RLS del índice decide qué ve cada escribanía.
--
-- Filtros (jsonb, todos opcionales):
--   clase: 'P' | 'NP' | 'sin_definir'   anio: 2026   acto: 'cert_firma'   estado: 'borrador' | 'revision' | 'completo'
--   persona: clave de persona devuelta por explorador_conteos (DNI, CUIT o nombre normalizado)
--   expediente_id: uuid   q: texto libre (nombre, apellido, DNI, CUIT, título o acto)
--   registro: número de registro (el administrador ve todos; Inicio y el Explorador filtran por el registro activo)

begin;

-- 1) Nombres tal cual se escribieron (con tildes) para mostrarlos; los *_norm siguen sirviendo para buscar.
alter table public.indice_partes add column if not exists apellido text;
alter table public.indice_partes add column if not exists nombre text;
alter table public.indice_partes add column if not exists clave text;  -- identifica a la persona: DNI, si no CUIT, si no el nombre
create index if not exists indice_partes_reg_clave_idx on public.indice_partes (registro_id, clave);

create or replace function public.indexar_documento(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  d record;
  v_acto text; v_def text; v_clase text; v_origen text;
  v_anio int; v_mes int; v_dia int; v_fecha date;
  v_partes jsonb; v_texto text;
begin
  select id, registro_id, usuario_id, titulo, tipo_acto, template_key, estado, clase, contenido, created_at, updated_at
    into d from documentos where id = p_id;
  if not found then
    delete from indice_documentos where documento_id = p_id;
    return;
  end if;

  v_acto := acto_normalizado(d.tipo_acto, d.template_key);
  select clase_defecto into v_def from actos_catalogo where codigo = v_acto;
  if d.clase in ('P', 'NP') then
    v_clase := d.clase; v_origen := 'documento';
  elsif v_def in ('P', 'NP') then
    v_clase := v_def; v_origen := 'catalogo';
  else
    v_clase := 'sin_definir'; v_origen := 'sin_dato';
  end if;

  begin
    v_anio := nullif(d.contenido -> 'fecha' ->> 'anio', '')::int;
    v_mes  := nullif(d.contenido -> 'fecha' ->> 'mes', '')::int;
    v_dia  := nullif(d.contenido -> 'fecha' ->> 'dia', '')::int;
    v_fecha := make_date(v_anio, v_mes + 1, v_dia);
  exception when others then
    v_fecha := null;
  end;
  if v_anio is null or v_anio < 1900 or v_anio > 2200 then
    v_anio := extract(year from coalesce(d.created_at, now()))::int;
  end if;

  v_partes := case when jsonb_typeof(d.contenido -> 'partes') = 'array' then d.contenido -> 'partes' else '[]'::jsonb end;
  delete from indice_partes where documento_id = p_id;
  insert into indice_partes (documento_id, orden, registro_id, usuario_id, persona_id, apellido_norm, nombre_norm, nro_doc, cuit, rol, apellido, nombre, clave)
  select p_id, x.orden, d.registro_id, d.usuario_id, x.persona_id, x.apellido_norm, x.nombre_norm, x.nro_doc, x.cuit, x.rol, x.apellido, x.nombre,
         coalesce(x.nro_doc, x.cuit, nullif(concat_ws(' ', x.apellido_norm, x.nombre_norm), ''))
    from (
      select (t.o - 1)::int as orden,
             case when (t.e ->> '_personaId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  then (t.e ->> '_personaId')::uuid end as persona_id,
             normalizar_texto(t.e ->> 'apellido') as apellido_norm,
             normalizar_texto(t.e ->> 'nombre') as nombre_norm,
             nullif(regexp_replace(coalesce(t.e ->> 'nroDoc', ''), '\D', '', 'g'), '') as nro_doc,
             nullif(regexp_replace(coalesce(t.e ->> 'cuit', ''), '\D', '', 'g'), '') as cuit,
             nullif(btrim(t.e ->> 'rol'), '') as rol,
             nullif(btrim(t.e ->> 'apellido'), '') as apellido,
             nullif(btrim(t.e ->> 'nombre'), '') as nombre
        from jsonb_array_elements(v_partes) with ordinality as t(e, o)
       where jsonb_typeof(t.e) = 'object'
    ) x;

  select string_agg(concat_ws(' ', apellido_norm, nombre_norm, nro_doc, cuit), ' | ' order by orden)
    into v_texto from indice_partes where documento_id = p_id;

  insert into indice_documentos (documento_id, registro_id, usuario_id, titulo, acto, clase, clase_origen, anio, fecha_acto, estado, partes_texto, creado, actualizado, indexado)
  values (p_id, d.registro_id, d.usuario_id, d.titulo, v_acto, v_clase, v_origen, v_anio, v_fecha, d.estado, v_texto, d.created_at, d.updated_at, now())
  on conflict (documento_id) do update set
    registro_id = excluded.registro_id, usuario_id = excluded.usuario_id, titulo = excluded.titulo,
    acto = excluded.acto, clase = excluded.clase, clase_origen = excluded.clase_origen,
    anio = excluded.anio, fecha_acto = excluded.fecha_acto, estado = excluded.estado,
    partes_texto = excluded.partes_texto, creado = excluded.creado, actualizado = excluded.actualizado,
    indexado = now();
end $$;
revoke all on function public.indexar_documento(uuid) from public, anon, authenticated;

-- 2) Núcleo: los documentos que cumplen los filtros. p_sin: filtro a ignorar (para contar cada grupo con los demás filtros).
create or replace function public.explorador_ids(p_filtros jsonb, p_sin text default null)
returns table (documento_id uuid)
language sql stable security invoker set search_path = public as $$
  with f as (
    select
      case when p_sin = 'clase'   then null else nullif(p_filtros ->> 'clase', '') end as clase,
      case when p_sin = 'anio'    then null else nullif(p_filtros ->> 'anio', '')::int end as anio,
      case when p_sin = 'acto'    then null else nullif(p_filtros ->> 'acto', '') end as acto,
      case when p_sin = 'estado'  then null else nullif(p_filtros ->> 'estado', '') end as estado,
      case when p_sin = 'persona' then null else nullif(p_filtros ->> 'persona', '') end as persona,
      nullif(p_filtros ->> 'expediente_id', '')::uuid as expediente_id,
      nullif(p_filtros ->> 'registro', '') as registro,
      nullif(btrim(coalesce(p_filtros ->> 'q', '')), '') as q
  ), q as (
    select f.*,
      case when f.q ~ '^[0-9.\-\s]+$' then nullif(regexp_replace(f.q, '\D', '', 'g'), '') end as q_dig,
      case when f.q is not null and f.q !~ '^[0-9.\-\s]+$' then string_to_array(normalizar_texto(f.q), ' ') end as q_pal
    from f
  )
  select i.documento_id
    from indice_documentos i
    left join actos_catalogo c on c.codigo = i.acto
    cross join q
   where (q.registro is null or i.registro_id = q.registro)
     and (q.clase is null or i.clase = q.clase)
     and (q.anio is null or i.anio = q.anio)
     and (q.acto is null or i.acto = q.acto)
     and (q.estado is null or i.estado = q.estado)
     and (q.persona is null or exists (select 1 from indice_partes p where p.documento_id = i.documento_id and p.clave = q.persona))
     and (q.expediente_id is null or exists (select 1 from expediente_documentos ed where ed.documento_id = i.documento_id and ed.expediente_id = q.expediente_id))
     and (q.q_dig is null or exists (select 1 from indice_partes p where p.documento_id = i.documento_id
                                      and (p.nro_doc like q.q_dig || '%' or p.cuit like q.q_dig || '%')))
     and (q.q_pal is null or not exists (
            select 1 from unnest(q.q_pal) w
             where position(w in coalesce(normalizar_texto(i.titulo), '') || ' ' || coalesce(normalizar_texto(c.nombre), '') || ' '
                              || coalesce(i.acto, '') || ' ' || coalesce(i.partes_texto, '')) = 0))
$$;

-- 3) Una página de resultados, con el total para «Mostrando N de TOTAL».
create or replace function public.explorador_buscar(p_filtros jsonb default '{}'::jsonb, p_orden text default 'fecha_desc',
                                                    p_limite int default 50, p_desde int default 0)
returns table (documento_id uuid, titulo text, acto text, acto_nombre text, clase text, clase_origen text,
               anio int, fecha_acto date, estado text, partes text, creado timestamptz, actualizado timestamptz, total bigint)
language sql stable security invoker set search_path = public as $$
  with sel as (
    select i.*, c.nombre as acto_nombre, count(*) over () as total
      from indice_documentos i
      join explorador_ids(coalesce(p_filtros, '{}'::jsonb)) ids on ids.documento_id = i.documento_id
      left join actos_catalogo c on c.codigo = i.acto
     order by
       case when p_orden = 'fecha_asc' then coalesce(i.fecha_acto, i.creado::date) end asc nulls last,
       case when p_orden is distinct from 'fecha_asc' then coalesce(i.fecha_acto, i.creado::date) end desc nulls last,
       i.actualizado desc
     limit least(greatest(coalesce(p_limite, 50), 1), 200)
    offset greatest(coalesce(p_desde, 0), 0)
  )
  select sel.documento_id, sel.titulo, sel.acto, sel.acto_nombre, sel.clase, sel.clase_origen, sel.anio, sel.fecha_acto, sel.estado,
         (select string_agg(coalesce(p.apellido, p.nombre), ' · ' order by p.orden) from indice_partes p where p.documento_id = sel.documento_id),
         sel.creado, sel.actualizado, sel.total
    from sel
   order by
     case when p_orden = 'fecha_asc' then coalesce(sel.fecha_acto, sel.creado::date) end asc nulls last,
     case when p_orden is distinct from 'fecha_asc' then coalesce(sel.fecha_acto, sel.creado::date) end desc nulls last,
     sel.actualizado desc
$$;

-- 4) Contadores de «Ver por»: cada grupo se cuenta aplicando los OTROS filtros (no el suyo).
create or replace function public.explorador_conteos(p_filtros jsonb default '{}'::jsonb)
returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'total', (select count(*) from explorador_ids(coalesce(p_filtros, '{}'::jsonb))),
    'clase', (select coalesce(jsonb_object_agg(clase, n), '{}'::jsonb) from (
                select i.clase, count(*) n from indice_documentos i
                  join explorador_ids(coalesce(p_filtros, '{}'::jsonb), 'clase') ids using (documento_id) group by i.clase) s),
    'anios', (select coalesce(jsonb_agg(jsonb_build_object('anio', anio, 'n', n) order by anio desc), '[]'::jsonb) from (
                select i.anio, count(*) n from indice_documentos i
                  join explorador_ids(coalesce(p_filtros, '{}'::jsonb), 'anio') ids using (documento_id) group by i.anio) s),
    'actos', (select coalesce(jsonb_agg(jsonb_build_object('acto', acto, 'nombre', nombre, 'n', n) order by n desc, nombre), '[]'::jsonb) from (
                select i.acto, coalesce(c.nombre, i.acto) nombre, count(*) n from indice_documentos i
                  join explorador_ids(coalesce(p_filtros, '{}'::jsonb), 'acto') ids using (documento_id)
                  left join actos_catalogo c on c.codigo = i.acto group by i.acto, c.nombre) s),
    'estados', (select coalesce(jsonb_object_agg(estado, n), '{}'::jsonb) from (
                select coalesce(i.estado, 'borrador') estado, count(*) n from indice_documentos i
                  join explorador_ids(coalesce(p_filtros, '{}'::jsonb), 'estado') ids using (documento_id) group by 1) s),
    'personas', (select coalesce(jsonb_agg(jsonb_build_object('clave', clave, 'nombre', nombre, 'dni', dni, 'cuit', cuit, 'n', n) order by nombre), '[]'::jsonb) from (
                select p.clave,
                       max(concat_ws(', ', p.apellido, p.nombre)) nombre, max(p.nro_doc) dni, max(p.cuit) cuit,
                       count(distinct p.documento_id) n
                  from indice_partes p
                  join explorador_ids(coalesce(p_filtros, '{}'::jsonb), 'persona') ids using (documento_id)
                 where p.clave is not null
                 group by p.clave
                 order by 2
                 limit 500) s)
  )
$$;

grant execute on function public.explorador_ids(jsonb, text) to authenticated;
grant execute on function public.explorador_buscar(jsonb, text, int, int) to authenticated;
grant execute on function public.explorador_conteos(jsonb) to authenticated;
revoke execute on function public.explorador_ids(jsonb, text) from anon, public;
revoke execute on function public.explorador_buscar(jsonb, text, int, int) from anon, public;
revoke execute on function public.explorador_conteos(jsonb) from anon, public;

-- 5) Reindexar todo para llenar los nombres originales y la clave de persona.
select public.indexar_documento(id) from public.documentos;

commit;
