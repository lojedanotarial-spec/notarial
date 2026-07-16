-- ══════════════════════════════════════════════════════════════════════════════
-- RLS NOTARIAL — implementación completa
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- HELPERS (SECURITY DEFINER para evitar recursión entre tablas)
-- ─────────────────────────────────────────────────────────────────────────────

-- Devuelve true si el usuario actual es admin
CREATE OR REPLACE FUNCTION es_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(is_admin, false) FROM usuarios WHERE id = auth.uid();
$$;

-- Devuelve el número de registro del usuario actual (ej: "853")
CREATE OR REPLACE FUNCTION mi_registro()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT r.registro
  FROM registros r
  INNER JOIN usuarios u ON r.id = u.registros_id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USUARIOS — cada usuario ve/edita solo su propia fila; admin ve todos
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_select" ON usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON usuarios;

CREATE POLICY "usuarios_select" ON usuarios
  FOR SELECT USING (id = auth.uid() OR es_admin());

CREATE POLICY "usuarios_update" ON usuarios
  FOR UPDATE USING (id = auth.uid() OR es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. REGISTROS — miembros del mismo registro se ven entre sí
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registros_select" ON registros;
DROP POLICY IF EXISTS "registros_update" ON registros;

CREATE POLICY "registros_select" ON registros
  FOR SELECT USING (registro = mi_registro() OR es_admin());

-- Cada miembro puede editar su propia fila (nombre, rol, etc.)
CREATE POLICY "registros_update" ON registros
  FOR UPDATE USING (
    id = (SELECT registros_id FROM usuarios WHERE id = auth.uid())
    OR es_admin()
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PERSONAS — acceso por registro
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personas_acceso" ON personas;

CREATE POLICY "personas_acceso" ON personas
  FOR ALL USING (registro_id = mi_registro() OR es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DOCUMENTOS — acceso por registro o por usuario creador
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_acceso" ON documentos;

CREATE POLICY "documentos_acceso" ON documentos
  FOR ALL USING (
    usuario_id = auth.uid()
    OR registro_id = mi_registro()
    OR es_admin()
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SCRIBA_CONVERSACIONES — solo el usuario propietario
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE scriba_conversaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scriba_conv_acceso" ON scriba_conversaciones;

CREATE POLICY "scriba_conv_acceso" ON scriba_conversaciones
  FOR ALL USING (usuario_id = auth.uid() OR es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TEMPLATES — todos ven globales + las de su registro; solo admin escribe
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select" ON templates;
DROP POLICY IF EXISTS "templates_write"  ON templates;

CREATE POLICY "templates_select" ON templates
  FOR SELECT USING (
    registro_id IS NULL
    OR registro_id = mi_registro()
    OR es_admin()
  );

CREATE POLICY "templates_write" ON templates
  FOR ALL USING (es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CLAUSULAS_BIBLIOTECA — lectura global; escritura solo admin
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE clausulas_biblioteca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clausbib_select" ON clausulas_biblioteca;
DROP POLICY IF EXISTS "clausbib_write"  ON clausulas_biblioteca;

CREATE POLICY "clausbib_select" ON clausulas_biblioteca
  FOR SELECT USING (true);

CREATE POLICY "clausbib_write" ON clausulas_biblioteca
  FOR ALL USING (es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. CLAUSULAS_REGISTRO — acceso por registro
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE clausulas_registro ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clausreg_acceso" ON clausulas_registro;

CREATE POLICY "clausreg_acceso" ON clausulas_registro
  FOR ALL USING (registro_id = mi_registro() OR es_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. EXPEDIENTES — actualizar políticas (RLS ya estaba activo)
-- ─────────────────────────────────────────────────────────────────────────────
-- RLS ya habilitado, solo reemplazamos políticas

DROP POLICY IF EXISTS "expedientes_registro"   ON expedientes;
DROP POLICY IF EXISTS "expedientes_acceso"     ON expedientes;
DROP POLICY IF EXISTS "expediente_docs_acceso" ON expediente_documentos;
DROP POLICY IF EXISTS "expediente_arch_acceso" ON expediente_archivos;

CREATE POLICY "expedientes_acceso" ON expedientes
  FOR ALL USING (
    usuario_id = auth.uid()
    OR registro_id = mi_registro()
    OR es_admin()
  );

CREATE POLICY "expediente_docs_acceso" ON expediente_documentos
  FOR ALL USING (
    expediente_id IN (
      SELECT id FROM expedientes
      WHERE usuario_id = auth.uid()
         OR registro_id = mi_registro()
    )
    OR es_admin()
  );

CREATE POLICY "expediente_arch_acceso" ON expediente_archivos
  FOR ALL USING (
    expediente_id IN (
      SELECT id FROM expedientes
      WHERE usuario_id = auth.uid()
         OR registro_id = mi_registro()
    )
    OR es_admin()
  );
