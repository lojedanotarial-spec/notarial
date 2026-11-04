-- Cierra el bucket oo-docs: pasa de público a privado (04/11/26).
-- Hasta hoy la clave `anon` (pública, está en el frontend) podía LISTAR y DESCARGAR los ~870
-- documentos del bucket (escrituras con datos personales). No podía escribir.
--
-- Ejecutar en Supabase → SQL Editor, DESPUÉS de desplegar el código que firma las URLs
-- (api/oo-config.js devuelve una URL firmada de 15 min; el frontend ya no usa URLs públicas).
--
-- Quién accede después de esto:
--   * Usuarios logueados (rol authenticated): leen/suben/actualizan desde la app.
--   * Servidor (service_role, saltea RLS): api/oo-callback.js guarda lo que edita OnlyOffice,
--     api/oo-config.js firma las URLs.
--   * anon: nada.
--
-- ROLLBACK (si algo falla): UPDATE storage.buckets SET public = true WHERE id = 'oo-docs';

-- 1) Borrar TODAS las políticas de storage.objects que mencionan oo-docs (se crearon a mano en el
--    dashboard y no están en el repo; no se conocen los nombres).
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') ILIKE '%oo-docs%' OR coalesce(with_check, '') ILIKE '%oo-docs%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
    RAISE NOTICE 'política borrada: %', p.policyname;
  END LOOP;
END $$;

-- 2) Bucket privado: las URLs /object/public/oo-docs/... dejan de funcionar.
UPDATE storage.buckets SET public = false WHERE id = 'oo-docs';

-- 3) Solo usuarios logueados. (upsert desde el navegador necesita INSERT + SELECT + UPDATE.)
CREATE POLICY "oo_docs_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'oo-docs');
CREATE POLICY "oo_docs_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'oo-docs');
CREATE POLICY "oo_docs_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'oo-docs') WITH CHECK (bucket_id = 'oo-docs');

-- 4) Revisión: tienen que quedar solo las 3 políticas de arriba para oo-docs, todas TO authenticated.
--    Si aparece alguna otra con rol anon/public que no menciona el bucket (p. ej. USING (true)),
--    también deja pasar a anon: borrarla.
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
