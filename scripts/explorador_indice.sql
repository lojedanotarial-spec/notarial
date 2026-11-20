-- Explorador: índice liviano y clasificación por Protocolo (Protocolar · Extraprotocolar · Sin definir).
-- Spec: specs/archivo-legal-y-explorador/ (tasks.md T1 y T2). Reversión: explorador_indice_rollback.sql
-- Cambios ADITIVOS: no modifica ni borra datos existentes. Es idempotente.
-- Códigos internos: 'P' = Protocolar, 'NP' = Extraprotocolar, 'sin_definir'. En pantalla nunca se muestran los códigos.
-- Regla de oro: el trigger NUNCA hace fallar el guardado de un documento (si algo falla, lo anota en error_logs).

begin;

-- 1) Catálogo de actos: la clase por defecto de cada plantilla según la ley. Se completa con las respuestas de Fátima (T6).
create table if not exists public.actos_catalogo (
  codigo        text primary key,                 -- slug de templates o clave normalizada
  nombre        text not null,
  item_listado  text,                             -- id en actos-protocolares-y-no-protocolares.md / formulario de Fátima
  clase_defecto text not null check (clase_defecto in ('P', 'NP', 'ambas')),
  fundamento    text,
  actualizado   timestamptz not null default now()
);
alter table public.actos_catalogo enable row level security;
drop policy if exists actos_catalogo_lectura on public.actos_catalogo;
create policy actos_catalogo_lectura on public.actos_catalogo for select to authenticated using (true);
drop policy if exists actos_catalogo_admin on public.actos_catalogo;
create policy actos_catalogo_admin on public.actos_catalogo for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- 2) Elección manual por documento. Vacío = «según la plantilla».
alter table public.documentos add column if not exists clase text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'documentos_clase_check') then
    alter table public.documentos add constraint documentos_clase_check check (clase in ('P', 'NP'));
  end if;
end $$;

-- 3) Índice: una fila por documento (sin el contenido) y una por parte.
create table if not exists public.indice_documentos (
  documento_id  uuid primary key references public.documentos(id) on delete cascade,
  registro_id   text,
  usuario_id    uuid,
  titulo        text,
  acto          text,
  clase         text not null check (clase in ('P', 'NP', 'sin_definir')),
  clase_origen  text not null check (clase_origen in ('documento', 'catalogo', 'sin_dato')),
  anio          int,
  fecha_acto    date,
  estado        text,
  partes_texto  text,
  creado        timestamptz,
  actualizado   timestamptz,
  indexado      timestamptz not null default now()
);
create index if not exists indice_documentos_reg_anio_idx on public.indice_documentos (registro_id, anio desc, actualizado desc);
create index if not exists indice_documentos_reg_clase_idx on public.indice_documentos (registro_id, clase);
create index if not exists indice_documentos_reg_acto_idx on public.indice_documentos (registro_id, acto);
create index if not exists indice_documentos_reg_estado_idx on public.indice_documentos (registro_id, estado);
create index if not exists indice_documentos_usuario_idx on public.indice_documentos (usuario_id);

create table if not exists public.indice_partes (
  documento_id  uuid not null references public.documentos(id) on delete cascade,
  orden         int not null,
  registro_id   text,
  usuario_id    uuid,
  persona_id    uuid,
  apellido_norm text,
  nombre_norm   text,
  nro_doc       text,
  cuit          text,
  rol           text,
  primary key (documento_id, orden)
);
create index if not exists indice_partes_reg_doc_idx on public.indice_partes (registro_id, nro_doc);
create index if not exists indice_partes_reg_cuit_idx on public.indice_partes (registro_id, cuit);
create index if not exists indice_partes_reg_apellido_idx on public.indice_partes (registro_id, apellido_norm text_pattern_ops);
create index if not exists indice_partes_persona_idx on public.indice_partes (persona_id);

-- Mismo alcance que la política de documentos. Solo lectura: escribe únicamente la función de indexado.
alter table public.indice_documentos enable row level security;
drop policy if exists indice_documentos_lectura on public.indice_documentos;
create policy indice_documentos_lectura on public.indice_documentos for select to authenticated
  using (usuario_id = auth.uid() or registro_id = public.mi_registro() or public.es_admin());
alter table public.indice_partes enable row level security;
drop policy if exists indice_partes_lectura on public.indice_partes;
create policy indice_partes_lectura on public.indice_partes for select to authenticated
  using (usuario_id = auth.uid() or registro_id = public.mi_registro() or public.es_admin());

-- 4) Normalización.
create or replace function public.normalizar_texto(t text) returns text
language sql immutable set search_path = public as $$
  select nullif(btrim(regexp_replace(
    translate(lower(coalesce(t, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
    '\s+', ' ', 'g')), '')
$$;

-- Claves viejas de dibujo (template_key) → slug de templates.
create or replace function public.acto_normalizado(p_tipo_acto text, p_template_key text) returns text
language sql immutable set search_path = public as $$
  select coalesce(
    nullif(btrim(p_tipo_acto), ''),
    case btrim(coalesce(p_template_key, ''))
      when 'certFirma' then 'cert_firma'
      when 'certFirmaF08' then 'cert_firma_f08'
      when 'escrituraBarrio' then 'compraventa_lote'
      else nullif(btrim(p_template_key), '')
    end,
    'documento_libre')
$$;

-- 5) Indexa un documento. La llaman los triggers; no la puede llamar un usuario.
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

  -- contenido.fecha = {anio, mes (0 a 11, como Date.getMonth), dia}
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
  insert into indice_partes (documento_id, orden, registro_id, usuario_id, persona_id, apellido_norm, nombre_norm, nro_doc, cuit, rol)
  select p_id, (t.o - 1)::int, d.registro_id, d.usuario_id,
         case when (t.e ->> '_personaId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then (t.e ->> '_personaId')::uuid end,
         normalizar_texto(t.e ->> 'apellido'),
         normalizar_texto(t.e ->> 'nombre'),
         nullif(regexp_replace(coalesce(t.e ->> 'nroDoc', ''), '\D', '', 'g'), ''),
         nullif(regexp_replace(coalesce(t.e ->> 'cuit', ''), '\D', '', 'g'), ''),
         nullif(btrim(t.e ->> 'rol'), '')
    from jsonb_array_elements(v_partes) with ordinality as t(e, o)
   where jsonb_typeof(t.e) = 'object';

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

-- 6) Trigger sobre documentos: nunca corta el guardado.
create or replace function public.trg_indexar_documento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform indexar_documento(new.id);
  exception when others then
    begin
      insert into error_logs (type, message, screen, context)
      values ('indice_explorador', sqlerrm, 'trigger documentos',
              jsonb_build_object('documento_id', new.id, 'sqlstate', sqlstate));
    exception when others then
      null;
    end;
  end;
  return null;
end $$;
revoke all on function public.trg_indexar_documento() from public, anon, authenticated;

drop trigger if exists documentos_indexar on public.documentos;
create trigger documentos_indexar
  after insert or update of contenido, estado, titulo, tipo_acto, template_key, clase, registro_id, usuario_id
  on public.documentos
  for each row execute function public.trg_indexar_documento();

-- 7) Si cambia la clase por defecto de un acto, se reclasifican sus documentos (los elegidos a mano no cambian).
create or replace function public.trg_reindexar_acto() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select documento_id from indice_documentos
     where acto in (case when tg_op <> 'INSERT' then old.codigo end, case when tg_op <> 'DELETE' then new.codigo end)
  loop
    perform indexar_documento(r.documento_id);
  end loop;
  return null;
end $$;
revoke all on function public.trg_reindexar_acto() from public, anon, authenticated;

drop trigger if exists actos_catalogo_reindexar on public.actos_catalogo;
create trigger actos_catalogo_reindexar
  after insert or update or delete on public.actos_catalogo
  for each row execute function public.trg_reindexar_acto();

-- 8) Catálogo inicial (T2): plan.md §7. «on conflict do nothing» para no pisar lo que se cargue después (respuestas de Fátima).
insert into public.actos_catalogo (codigo, nombre, item_listado, clase_defecto, fundamento) values
  ('cert_firma', 'Certificación de firma', 'np-firmas', 'NP', 'Ley 3058 art. 56'),
  ('cert_firma_f08', 'Certificación de firma - Formulario 08', 'np-formularios', 'NP', 'Ley 3058 art. 56'),
  ('cert_copia', 'Certificación de copia', 'np-copias', 'NP', 'Ley 3058 art. 60'),
  ('fe_vida', 'Fe de vida', 'np-fe-vida', 'NP', 'Ley 3058 art. 58'),
  ('autorizacion_vehiculo', 'Autorización para conducir - exportar vehículo', 'np-privados', 'NP', 'Ley 3058 arts. 56 y 57'),
  ('autorizacion_viaje', 'Autorización de viaje de menor', 'mix-viaje', 'ambas', 'Normativa de Migraciones'),
  ('acta_constatacion', 'Acta de constatación', 'mix-constatacion', 'ambas', 'Ley 3058 arts. 12, 29 y 37'),
  ('acta_notificacion', 'Acta de notificación', 'mix-notificacion', 'ambas', 'Ley 3058 arts. 12, 29 y 32'),
  ('acta_manifestacion', 'Acta de manifestación', null, 'ambas', 'Ley 3058 arts. 12 y 29'),
  ('acta_entrega', 'Acta de entrega', 'mix-deposito', 'ambas', 'Ley 3058 arts. 12, 29 y 46'),
  ('acta_asamblea', 'Acta de asamblea', 'mix-asamblea', 'ambas', 'Ley 3058 arts. 12 y 29'),
  ('acta_directorio', 'Acta de directorio', 'mix-asamblea', 'ambas', 'Ley 3058 arts. 12 y 29'),
  ('compraventa_urbana', 'Compraventa inmueble urbano', 'inm-compraventa', 'P', 'CCyC art. 1017'),
  ('compraventa_rural', 'Compraventa inmueble rural', 'inm-compraventa', 'P', 'CCyC art. 1017'),
  ('compraventa_ph', 'Compraventa propiedad horizontal', 'inm-compraventa', 'P', 'CCyC art. 1017'),
  ('compraventa_lote', 'Compraventa de lote', 'inm-compraventa', 'P', 'CCyC art. 1017'),
  ('boleto_compraventa', 'Boleto de compraventa', 'np-privados', 'NP', 'Ley 3058 arts. 56 y 57'),
  ('hipoteca_constitucion', 'Constitución de hipoteca', 'inm-hipoteca', 'P', 'CCyC art. 2208'),
  ('hipoteca_cancelacion', 'Cancelación de hipoteca', 'inm-cancelacion', 'P', 'Ley 8100 g.1'),
  ('prenda_con_registro', 'Prenda con registro', 'np-formularios', 'NP', 'Ley 3058 art. 56'),
  ('donacion_inmueble', 'Donación de inmueble', 'inm-donacion', 'P', 'CCyC art. 1552'),
  ('donacion_reserva_uso', 'Donación con reserva de usufructo', 'inm-donacion', 'P', 'CCyC art. 1552'),
  ('donacion_hijo', 'Donación a hijo con imputación', 'inm-donacion', 'P', 'CCyC art. 1552'),
  ('aceptacion_donacion', 'Aceptación de donación', 'inm-donacion', 'P', 'CCyC arts. 1545 y 1552'),
  ('convenio_division', 'Convenio de división de condominio', 'inm-division', 'P', 'CCyC art. 1017'),
  ('particion_herencia', 'Partición de herencia', 'inm-division', 'P', 'CCyC art. 1017'),
  ('usufructo_constitucion', 'Constitución de usufructo', 'inm-usufructo', 'P', 'CCyC art. 1017'),
  ('servidumbre', 'Constitución de servidumbre', 'inm-servidumbre', 'P', 'CCyC art. 1017'),
  ('superficie', 'Derecho de superficie', 'inm-superficie', 'P', 'CCyC art. 1017'),
  ('estatuto_sa', 'Estatuto de S.A.', 'pj-sa', 'P', 'Ley 19.550 art. 165'),
  ('estatuto_sas', 'Estatuto de S.A.S.', 'mix-sas', 'ambas', 'Ley 27.349 art. 35'),
  ('contrato_srl', 'Contrato de S.R.L.', 'mix-srl', 'ambas', 'Ley 19.550 art. 4'),
  ('aumento_capital', 'Reforma de estatuto - aumento de capital', 'mix-reorg', 'ambas', 'Ley 19.550 art. 4'),
  ('cesion_cuotas', 'Cesión de cuotas sociales', 'mix-cuotas', 'ambas', 'Ley 19.550 art. 152'),
  ('locacion_inmueble', 'Contrato de locación de inmueble', 'np-privados', 'NP', 'Ley 3058 arts. 56 y 57'),
  ('locacion_comercial', 'Contrato de locación comercial', 'np-privados', 'NP', 'Ley 3058 arts. 56 y 57'),
  ('mutuo_hipotecario', 'Mutuo hipotecario', 'inm-hipoteca', 'P', 'CCyC art. 2208'),
  ('mutuo_simple', 'Mutuo simple', 'mix-mutuo', 'ambas', 'CCyC art. 1015'),
  ('reconocimiento_deuda', 'Reconocimiento de deuda', 'mix-mutuo', 'ambas', 'CCyC art. 1015'),
  ('cesion_credito', 'Cesión de crédito', 'mix-cesion-creditos', 'ambas', 'CCyC art. 1618'),
  ('cesion_posicion_contractual', 'Cesión de la posición contractual', null, 'ambas', 'Sigue la forma del contrato cedido'),
  ('poder_especial', 'Poder especial', 'pod-general', 'P', 'Ley 3058 art. 17'),
  ('poder_general', 'Poder general', 'pod-general', 'P', 'Ley 3058 art. 17'),
  ('poder_administracion', 'Poder de administración', 'pod-general', 'P', 'Ley 3058 art. 17'),
  ('poder_irrevocable', 'Poder irrevocable', 'pod-general', 'P', 'Ley 3058 art. 17'),
  ('revocacion_poder', 'Revocación de poder', 'pod-modif', 'P', 'Ley 8100 a.6'),
  ('declaratoria_herederos', 'Declaratoria de herederos (protocolización)', 'act-protoc-judiciales', 'P', 'Ley 3058 art. 39'),
  ('aprobacion_testamento', 'Protocolización de testamento', 'act-protoc-olografo', 'P', 'CCyC art. 2339; Ley 3058 art. 39'),
  ('cesion_herencia', 'Cesión de derechos hereditarios', 'con-cesion-hered', 'P', 'CCyC art. 1618'),
  ('renuncia_herencia', 'Renuncia a la herencia', 'suc-renuncia', 'P', 'CCyC art. 2299'),
  ('primer_testimonio', 'Primer testimonio', 'der-testimonio', 'NP', 'Ley 3058 art. 63'),
  ('testimonio_posterior', 'Testimonios posteriores', 'der-testimonio', 'NP', 'Ley 3058 arts. 63 y 68'),
  ('copia_simple', 'Copia simple', 'der-copia-simple', 'NP', 'Ley 3058 art. 64'),
  ('documento_libre', 'Documento libre', null, 'ambas', null)
on conflict (codigo) do nothing;

-- 9) Carga inicial del índice.
select public.indexar_documento(id) from public.documentos;

commit;
