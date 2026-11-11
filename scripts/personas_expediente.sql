-- Personas del expediente — Fase 0: cambios ADITIVOS en la base.
-- Spec: specs/personas-expediente/ (tasks.md T0.1). Reversión: personas_expediente_rollback.sql
-- Es idempotente: se puede correr dos veces sin romper nada.
-- Cambia una sola fila existente: el paso 4 (estado civil "Soltero" pasa a "soltero"). No toca las políticas actuales.

begin;

-- 1) personas: notas libres (por ejemplo "casada con Pérez Juan, en primeras nupcias") y los datos de domicilio que el
--    formulario de partes ya maneja pero la tabla no tenía (barrio, manzana, casa/lote, provincia, país): hoy se pierden al
--    guardar la persona en la libreta.
alter table public.personas
  add column if not exists notas text,
  add column if not exists barrio text,
  add column if not exists manzana text,
  add column if not exists casa text,
  add column if not exists provincia text,
  add column if not exists pais text;

-- 2) Qué personas intervienen en cada expediente.
--    Borrar el expediente borra la pertenencia, NO la ficha. Borrar la ficha la saca de todos los expedientes.
create table if not exists public.expediente_personas (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  agregada_por uuid,
  created_at timestamptz not null default now(),
  unique (expediente_id, persona_id)
);
create index if not exists expediente_personas_persona_idx on public.expediente_personas (persona_id);

-- Solo se LEE desde el navegador (con la misma regla que los archivos del expediente).
-- Agregar y quitar personas lo hace el servidor, que valida el registro y deja el historial.
alter table public.expediente_personas enable row level security;
drop policy if exists expediente_personas_lectura on public.expediente_personas;
create policy expediente_personas_lectura on public.expediente_personas
  for select
  using (
    expediente_id in (
      select e.id from public.expedientes e
      where e.usuario_id = auth.uid() or e.registro_id = mi_registro()
    )
    or es_admin()
  );

-- 3) De quién es cada archivo (una persona o ninguna) y a quién nombra la lectura automática.
--    Si se borra la ficha, los archivos quedan "sin asignar".
alter table public.expediente_archivos
  add column if not exists persona_id uuid references public.personas(id) on delete set null,
  add column if not exists ident_apellido text,
  add column if not exists ident_nombre text;
create index if not exists expediente_archivos_persona_idx
  on public.expediente_archivos (persona_id) where persona_id is not null;

-- 4) Estado civil: la lista del editor y de las fichas es en minúscula (soltero, casada…). Hoy hay 1 ficha escrita "Soltero";
--    se unifica para que el desplegable la reconozca. Es lo único que este script cambia de filas existentes.
update public.personas set estado_civil = lower(estado_civil)
where estado_civil is not null and estado_civil <> lower(estado_civil);

commit;
