-- Tabla principal de expedientes
CREATE TABLE IF NOT EXISTS expedientes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  tipo_acto   text,
  estado      text NOT NULL DEFAULT 'abierto',  -- abierto | en_tramite | completado | archivado
  notas       text,
  registro_id text,          -- registro notarial al que pertenece
  usuario_id  uuid REFERENCES auth.users(id),   -- quien lo creó
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Relación expediente ↔ documentos generados (Supabase)
CREATE TABLE IF NOT EXISTS expediente_documentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id   uuid REFERENCES expedientes(id) ON DELETE CASCADE,
  documento_id    uuid,   -- referencia a tabla documentos existente
  created_at      timestamptz DEFAULT now()
);

-- Archivos en Drive (fotos, scans, poderes firmados, etc.)
CREATE TABLE IF NOT EXISTS expediente_archivos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id   uuid REFERENCES expedientes(id) ON DELETE CASCADE,
  drive_file_id   text NOT NULL,
  nombre          text NOT NULL,
  tipo            text,   -- dni | tarjeta_verde | poder | formulario | otro
  mime_type       text,
  created_at      timestamptz DEFAULT now()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_expedientes_registro  ON expedientes(registro_id);
CREATE INDEX IF NOT EXISTS idx_expedientes_usuario   ON expedientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_expdocs_expediente    ON expediente_documentos(expediente_id);
CREATE INDEX IF NOT EXISTS idx_exparch_expediente    ON expediente_archivos(expediente_id);

-- RLS básico: cada usuario ve sus expedientes y los de su registro
ALTER TABLE expedientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expediente_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE expediente_archivos   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expedientes_registro" ON expedientes
  FOR ALL USING (registro_id IN (
    SELECT registro FROM registros WHERE id = auth.uid()
    UNION
    SELECT registro_id FROM expedientes WHERE usuario_id = auth.uid()
  ));
