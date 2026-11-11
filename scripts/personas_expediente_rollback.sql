-- Reversión de personas_expediente.sql
-- ATENCIÓN: borra la tabla expediente_personas (quién interviene en cada expediente), las notas y los datos de barrio, manzana, casa, provincia y país de las fichas
-- y la asignación de archivos a personas. Las fichas (personas) y los archivos NO se borran.

begin;

drop index if exists public.expediente_archivos_persona_idx;
alter table public.expediente_archivos drop column if exists persona_id;
alter table public.expediente_archivos drop column if exists ident_apellido;
alter table public.expediente_archivos drop column if exists ident_nombre;

drop policy if exists expediente_personas_lectura on public.expediente_personas;
drop table if exists public.expediente_personas;

alter table public.personas drop column if exists notas;
alter table public.personas drop column if exists barrio;
alter table public.personas drop column if exists manzana;
alter table public.personas drop column if exists casa;
alter table public.personas drop column if exists provincia;
alter table public.personas drop column if exists pais;

commit;
