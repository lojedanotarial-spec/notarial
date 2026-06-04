-- Corregir política RLS con recursión infinita
DROP POLICY IF EXISTS "expedientes_registro" ON expedientes;

-- Política corregida: sin auto-referencia
CREATE POLICY "expedientes_acceso" ON expedientes
  FOR ALL USING (
    usuario_id = auth.uid()
    OR registro_id IN (
      SELECT registro FROM registros WHERE id = auth.uid()
    )
  );

CREATE POLICY "expediente_docs_acceso" ON expediente_documentos
  FOR ALL USING (
    expediente_id IN (
      SELECT id FROM expedientes
      WHERE usuario_id = auth.uid()
         OR registro_id IN (SELECT registro FROM registros WHERE id = auth.uid())
    )
  );

CREATE POLICY "expediente_arch_acceso" ON expediente_archivos
  FOR ALL USING (
    expediente_id IN (
      SELECT id FROM expedientes
      WHERE usuario_id = auth.uid()
         OR registro_id IN (SELECT registro FROM registros WHERE id = auth.uid())
    )
  );
