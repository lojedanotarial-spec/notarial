-- Drive de la escribanía — PARTE 2: cambio de política de expediente_archivos (plan.md D8).
-- SE APLICA EN T6.2, JUNTO CON EL DEPLOY de la pantalla nueva (no antes: la pantalla vieja escribe esta tabla desde el navegador).
--
-- Antes: política "expediente_arch_acceso" FOR ALL — cualquier usuario del registro podía insertar/borrar filas
-- desde el navegador (podía apuntar al drive_file_id de otro registro).
-- Después: solo lectura para el navegador, y solo lo del Drive de la escribanía que no esté borrado.
-- Altas y bajas las hace el servidor con la service key (que saltea RLS).
-- Para revertir: scripts/drive_escribania_rollback.sql

drop policy if exists "expediente_arch_acceso" on public.expediente_archivos;

create policy "expediente_arch_select" on public.expediente_archivos
  for select using (
    almacen = 'escribania'
    and borrado_en is null
    and (
      expediente_id in (
        select expedientes.id from expedientes
        where expedientes.usuario_id = auth.uid() or expedientes.registro_id = mi_registro()
      )
      or es_admin()
    )
  );
