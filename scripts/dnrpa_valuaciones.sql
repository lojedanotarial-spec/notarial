-- Tabla de valuaciones DNRPA
-- Actualizar corriendo scripts/ingest_dnrpa.py cuando el DNRPA publica nueva tabla (mensual)

CREATE TABLE IF NOT EXISTS dnrpa_valuaciones (
  mtm           TEXT PRIMARY KEY,
  tipo_vehiculo CHAR(1) NOT NULL CHECK (tipo_vehiculo IN ('A', 'M')),
  marca         TEXT NOT NULL,
  modelo        TEXT NOT NULL,
  tipo_desc     TEXT,
  valores       JSONB NOT NULL DEFAULT '{}',  -- {"0km": 53466800, "2025": 48120800, ...}
  search_text   TEXT GENERATED ALWAYS AS (marca || ' ' || modelo) STORED,
  tabla_fecha   DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS dnrpa_val_search_idx  ON dnrpa_valuaciones (search_text);
CREATE INDEX IF NOT EXISTS dnrpa_val_marca_idx   ON dnrpa_valuaciones (marca);
CREATE INDEX IF NOT EXISTS dnrpa_val_tipo_idx    ON dnrpa_valuaciones (tipo_vehiculo);

-- RLS: lectura pública, escritura solo service_role
ALTER TABLE dnrpa_valuaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON dnrpa_valuaciones
  FOR SELECT TO anon USING (true);
