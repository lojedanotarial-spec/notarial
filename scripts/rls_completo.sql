-- ══════════════════════════════════════════════════════════════════════════════
-- RLS NOTARIAL — snapshot del estado REAL en Supabase (verificado por SQL directo el 13/07/26)
-- Este archivo documenta lo que HOY está aplicado en la base. Es idempotente
-- (DROP IF EXISTS + CREATE) así que se puede correr de nuevo sin romper nada,
-- pero su propósito principal es referencia/reproducibilidad (ej. para levantar
-- un proyecto Supabase nuevo desde cero), no "arreglar" la base actual.
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- HELPERS (SECURITY DEFINER para evitar recursión entre tablas)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION es_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(is_admin, false) FROM usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION mi_registro()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT r.registro
  FROM registros r
  INNER JOIN usuarios u ON r.id = u.registros_id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USUARIOS — 3 políticas activas hoy (⚠️ una vieja + dos nuevas, redundantes pero no riesgosas)
-- ─────────────────────────────────────────────────────────────────────────────
-- Vieja (pre-helpers, FOR ALL, sin escape de admin — no se toca acá, sigue viva
-- en la base salvo que se dropee a mano):
--   "usuarios ven su registro"  FOR ALL  USING (auth.uid() = id)
-- Nuevas (usan es_admin()):
DROP POLICY IF EXISTS "usuarios_select" ON usuarios;
CREATE POLICY "usuarios_select" ON usuarios
  FOR SELECT USING (id = auth.uid() OR es_admin());

DROP POLICY IF EXISTS "usuarios_update" ON usuarios;
CREATE POLICY "usuarios_update" ON usuarios
  FOR UPDATE USING (id = auth.uid() OR es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. REGISTROS — 4 políticas activas hoy (⚠️ dos viejas + dos nuevas, redundantes)
-- ─────────────────────────────────────────────────────────────────────────────
-- Viejas (pre-helpers, referencian usuarios.registro_numero/is_admin directo):
--   "leer miembros de su registro"    SELECT
--   "actualizar su propio registro"   UPDATE
-- Nuevas (usan mi_registro()/es_admin()):
DROP POLICY IF EXISTS "registros_select" ON registros;
CREATE POLICY "registros_select" ON registros
  FOR SELECT USING (registro = mi_registro() OR es_admin());

DROP POLICY IF EXISTS "registros_update" ON registros;
CREATE POLICY "registros_update" ON registros
  FOR UPDATE USING (
    id = (SELECT registros_id FROM usuarios WHERE id = auth.uid())
    OR es_admin()
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PERSONAS — 2 políticas activas hoy (⚠️ una vieja + una nueva, redundantes)
-- ─────────────────────────────────────────────────────────────────────────────
-- Vieja: "personas de su registro"  FOR ALL  (referencia usuarios.registro_numero directo)
DROP POLICY IF EXISTS "personas_acceso" ON personas;
CREATE POLICY "personas_acceso" ON personas
  FOR ALL USING (registro_id = mi_registro() OR es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DOCUMENTOS — 2 políticas activas hoy (⚠️ una vieja + una nueva, redundantes)
-- ─────────────────────────────────────────────────────────────────────────────
-- Vieja: "documentos de su registro"  FOR ALL  (referencia usuarios.registro_numero directo)
DROP POLICY IF EXISTS "documentos_acceso" ON documentos;
CREATE POLICY "documentos_acceso" ON documentos
  FOR ALL USING (
    usuario_id = auth.uid()
    OR registro_id = mi_registro()
    OR es_admin()
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SCRIBA_CONVERSACIONES — 1 política (sin duplicados)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "scriba_conv_acceso" ON scriba_conversaciones;
CREATE POLICY "scriba_conv_acceso" ON scriba_conversaciones
  FOR ALL USING (usuario_id = auth.uid() OR es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TEMPLATES — 2 políticas (resuelto 17/07/26)
-- ─────────────────────────────────────────────────────────────────────────────
-- La política vieja "templates globales o de su registro" (FOR ALL, sin chequeo
-- de es_admin()) se dropeó en producción el 17/07/26 — ya no convive con las
-- nuevas. Hoy solo escribe quien sea es_admin().
DROP POLICY IF EXISTS "templates_select" ON templates;
CREATE POLICY "templates_select" ON templates
  FOR SELECT USING (
    registro_id IS NULL
    OR registro_id = mi_registro()
    OR es_admin()
  );

DROP POLICY IF EXISTS "templates_write" ON templates;
CREATE POLICY "templates_write" ON templates
  FOR ALL USING (es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CLAUSULAS_BIBLIOTECA — 2 políticas (sin duplicados)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clausbib_select" ON clausulas_biblioteca;
CREATE POLICY "clausbib_select" ON clausulas_biblioteca
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "clausbib_write" ON clausulas_biblioteca;
CREATE POLICY "clausbib_write" ON clausulas_biblioteca
  FOR ALL USING (es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. CLAUSULAS_REGISTRO — 1 política (sin duplicados)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clausreg_acceso" ON clausulas_registro;
CREATE POLICY "clausreg_acceso" ON clausulas_registro
  FOR ALL USING (registro_id = mi_registro() OR es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. EXPEDIENTES / EXPEDIENTE_DOCUMENTOS / EXPEDIENTE_ARCHIVOS
--    Ya están en su forma final (granulares por comando), SIN duplicados viejos.
--    El insert de expedientes es deliberadamente laxo (solo auth.uid() IS NOT NULL)
--    porque el código (ExpedientesScreen.jsx, ModalAgregarExpediente.jsx) ya manda
--    usuario_id correctamente — verificado 13/07/26, no es un bug activo.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "expedientes_select" ON expedientes;
CREATE POLICY "expedientes_select" ON expedientes
  FOR SELECT USING (usuario_id = auth.uid() OR registro_id = mi_registro() OR es_admin());

DROP POLICY IF EXISTS "expedientes_update" ON expedientes;
CREATE POLICY "expedientes_update" ON expedientes
  FOR UPDATE USING (usuario_id = auth.uid() OR registro_id = mi_registro() OR es_admin());

DROP POLICY IF EXISTS "expedientes_delete" ON expedientes;
CREATE POLICY "expedientes_delete" ON expedientes
  FOR DELETE USING (usuario_id = auth.uid() OR registro_id = mi_registro() OR es_admin());

DROP POLICY IF EXISTS "expedientes_insert" ON expedientes;
CREATE POLICY "expedientes_insert" ON expedientes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "expediente_docs_select" ON expediente_documentos;
CREATE POLICY "expediente_docs_select" ON expediente_documentos
  FOR SELECT USING (
    expediente_id IN (SELECT id FROM expedientes WHERE usuario_id = auth.uid() OR registro_id = mi_registro())
    OR es_admin()
  );

DROP POLICY IF EXISTS "expediente_docs_delete" ON expediente_documentos;
CREATE POLICY "expediente_docs_delete" ON expediente_documentos
  FOR DELETE USING (
    expediente_id IN (SELECT id FROM expedientes WHERE usuario_id = auth.uid() OR registro_id = mi_registro())
    OR es_admin()
  );

DROP POLICY IF EXISTS "expediente_docs_insert" ON expediente_documentos;
CREATE POLICY "expediente_docs_insert" ON expediente_documentos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "expediente_arch_acceso" ON expediente_archivos;
CREATE POLICY "expediente_arch_acceso" ON expediente_archivos
  FOR ALL USING (
    expediente_id IN (SELECT id FROM expedientes WHERE usuario_id = auth.uid() OR registro_id = mi_registro())
    OR es_admin()
  );
