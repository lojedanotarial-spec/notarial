-- ══════════════════════════════════════════════════════════════════════════════
-- WHATSAPP BOT — esquema mínimo para probar el flujo con DNI/vehículos primero
-- Sigue el mismo patrón de aislamiento por registro que documentos/expedientes
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Teléfono del escribano, para whitelist del bot
--    Formato obligatorio: +549XXXYYYYYYY (celular argentino, formato internacional)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefono text;

ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS telefono_formato_valido;

ALTER TABLE usuarios
  ADD CONSTRAINT telefono_formato_valido
  CHECK (telefono IS NULL OR telefono ~ '^\+549\d{10}$');

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_telefono
  ON usuarios(telefono) WHERE telefono IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Bandeja de fotos recibidas por WhatsApp, pendientes de usar
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_pendientes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  registro_id     text NOT NULL,
  imagen_path     text NOT NULL,        -- path dentro del bucket, no URL pública
  tipo_detectado  text,                 -- 'dni' | 'vehiculo' | null (no reconocido)
  datos_extraidos jsonb,                -- salida cruda de extraerDocumento()
  estado          text NOT NULL DEFAULT 'pendiente',  -- 'pendiente' | 'leido' | 'descartado'
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_pend_usuario  ON whatsapp_pendientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_pend_registro ON whatsapp_pendientes(registro_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_pend_created  ON whatsapp_pendientes(created_at);

DROP POLICY IF EXISTS "whatsapp_pend_acceso" ON whatsapp_pendientes;
CREATE POLICY "whatsapp_pend_acceso" ON whatsapp_pendientes
  FOR ALL USING (
    usuario_id = auth.uid()
    OR registro_id = mi_registro()
    OR es_admin()
  );

ALTER TABLE whatsapp_pendientes ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Bucket privado de Storage para las fotos (72hs de vida, después se borran)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-pendientes', 'whatsapp-pendientes', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "whatsapp_storage_acceso" ON storage.objects;
CREATE POLICY "whatsapp_storage_acceso" ON storage.objects
  FOR ALL USING (
    bucket_id = 'whatsapp-pendientes'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR es_admin()
    )
  );

-- Nota: el webhook (server-side, con service_role key) sube directo salteando
-- RLS -- esta policy es para cuando el USUARIO lee/borra desde el browser.
-- Convención de path: whatsapp-pendientes/{usuario_id}/{uuid}.jpg


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Limpieza automática (72hs) — NO va acá
--    pg_cron puede borrar filas pero no puede llamar al Storage API para borrar
--    el archivo asociado. Se resuelve con un Vercel Cron pegándole a un endpoint
--    propio (api/whatsapp-cleanup.js, a construir en el paso del webhook) que
--    borra fila + archivo de Storage juntos, con la service_role key.
-- ─────────────────────────────────────────────────────────────────────────────
