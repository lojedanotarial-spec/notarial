-- Ejecutar manualmente en el SQL Editor de Supabase (mismo patrón que las demás
-- tablas de logging: no viven en schema_notarial.sql).
--
-- Un reporte por día calendario (ART), generado por el cron de aprendizaje
-- (api/cron/scriba-learning.js). Solo lectura para la UI — nunca se escribe
-- desde el cliente (lo escribe el cron con la service role key, que salta RLS).

CREATE TABLE IF NOT EXISTS scriba_reportes_aprendizaje (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                   date NOT NULL UNIQUE,       -- día calendario ART analizado
  periodo_desde           timestamptz NOT NULL,
  periodo_hasta           timestamptz NOT NULL,
  conversaciones_analizadas integer NOT NULL DEFAULT 0,
  feedback_positivo       integer NOT NULL DEFAULT 0,
  feedback_negativo       integer NOT NULL DEFAULT 0,
  resumen_md              text NOT NULL DEFAULT '',
  patrones                jsonb NOT NULL DEFAULT '[]', -- [{categoria, frecuencia, ejemplos[], sugerencia}]
  created_at              timestamptz DEFAULT now()
);

ALTER TABLE scriba_reportes_aprendizaje ENABLE ROW LEVEL SECURITY;

-- Solo admin lee reportes (contienen extractos de conversaciones de clientes).
CREATE POLICY scriba_reportes_select_admin ON scriba_reportes_aprendizaje
  FOR SELECT USING (es_admin());

-- Sin política de INSERT/UPDATE para usuarios: el cron escribe con la
-- service role key, que ignora RLS por completo.
