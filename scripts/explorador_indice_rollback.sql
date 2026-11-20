-- Reversión de explorador_indice.sql. Borra el índice, el catálogo y la elección manual de Protocolo de cada documento.
-- OJO: la columna documentos.clase guarda lo que eligió la escribanía a mano; revertir la pierde.

begin;
drop trigger if exists documentos_indexar on public.documentos;
drop trigger if exists actos_catalogo_reindexar on public.actos_catalogo;
drop function if exists public.trg_indexar_documento();
drop function if exists public.trg_reindexar_acto();
drop function if exists public.indexar_documento(uuid);
drop function if exists public.acto_normalizado(text, text);
drop function if exists public.normalizar_texto(text);
drop table if exists public.indice_partes;
drop table if exists public.indice_documentos;
drop table if exists public.actos_catalogo;
alter table public.documentos drop constraint if exists documentos_clase_check;
alter table public.documentos drop column if exists clase;
commit;
