-- Ejecutar manualmente en el SQL Editor de Supabase (igual que scriba_logs / error_logs / feedback_reports,
-- estas tablas de logging no viven en schema_notarial.sql).
--
-- Valoración 👍/👎 (+ comentario opcional en negativo) por respuesta puntual de Scriba.
-- Una fila por (scriba_log_id, usuario_id) — votar de nuevo actualiza el voto anterior.

CREATE TABLE IF NOT EXISTS scriba_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scriba_log_id uuid NOT NULL REFERENCES scriba_logs(id) ON DELETE CASCADE,
  usuario_id    uuid NOT NULL DEFAULT auth.uid(),
  valoracion    text NOT NULL CHECK (valoracion IN ('positivo', 'negativo')),
  comentario    text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (scriba_log_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_scriba_feedback_log ON scriba_feedback(scriba_log_id);

ALTER TABLE scriba_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY scriba_feedback_insert ON scriba_feedback
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY scriba_feedback_update ON scriba_feedback
  FOR UPDATE USING (auth.uid() = usuario_id);

CREATE POLICY scriba_feedback_select_admin ON scriba_feedback
  FOR SELECT USING (es_admin());
