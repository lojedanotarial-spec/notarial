-- ══════════════════════════════════════════════════════════════════════════════
-- Fix: política INSERT separada para expediente_documentos
-- Problema: la política FOR ALL usa la misma expresión como WITH CHECK para
-- INSERT, pero el RETURNING puede ser filtrado antes de que la app reciba
-- el ID, causando que vincular nunca se llame aunque el INSERT fue exitoso.
-- Solución: política INSERT con un chequeo simple (usuario autenticado).
-- ══════════════════════════════════════════════════════════════════════════════

-- FK constraints necesarias para que PostgREST soporte el join embebido documentos(*)
-- Sin estas constraints la query select=*,documentos(*) falla con HTTP 400
ALTER TABLE expediente_documentos
  DROP CONSTRAINT IF EXISTS fk_expdocs_expediente,
  DROP CONSTRAINT IF EXISTS fk_expdocs_documento;

ALTER TABLE expediente_documentos
  ADD CONSTRAINT fk_expdocs_expediente FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_expdocs_documento  FOREIGN KEY (documento_id)  REFERENCES documentos(id)  ON DELETE CASCADE;

DROP POLICY IF EXISTS "expediente_docs_acceso"   ON expediente_documentos;
DROP POLICY IF EXISTS "expediente_docs_select"   ON expediente_documentos;
DROP POLICY IF EXISTS "expediente_docs_insert"   ON expediente_documentos;
DROP POLICY IF EXISTS "expediente_docs_delete"   ON expediente_documentos;

-- SELECT: solo puede ver filas de expedientes que le pertenecen
CREATE POLICY "expediente_docs_select" ON expediente_documentos
  FOR SELECT USING (
    expediente_id IN (
      SELECT id FROM expedientes
      WHERE usuario_id = auth.uid()
         OR registro_id = mi_registro()
    )
    OR es_admin()
  );

-- INSERT: cualquier usuario autenticado puede vincular
-- (FK constraints garantizan que expediente_id y documento_id existen)
CREATE POLICY "expediente_docs_insert" ON expediente_documentos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE: igual que SELECT
CREATE POLICY "expediente_docs_delete" ON expediente_documentos
  FOR DELETE USING (
    expediente_id IN (
      SELECT id FROM expedientes
      WHERE usuario_id = auth.uid()
         OR registro_id = mi_registro()
    )
    OR es_admin()
  );
