-- ══════════════════════════════════════════════════════════════════════════════
-- SCHEMA NOTARIAL v2 — solo lo que falta
-- personas y templates ya existen, no se tocan
-- ══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENDER templates (ya existe)
--    Agregar slug, descripcion, frecuencia, familia para los 50 modelos base
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS slug        text,
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS frecuencia  int DEFAULT 99,
  ADD COLUMN IF NOT EXISTS familia     text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug) WHERE slug IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_templates_tipo ON templates(tipo);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. EXTENDER documentos (ya existe)
--    partes: array de comparecientes del acto
--    clausulas: slugs de cláusulas opcionales activadas
--    tipo_acto: slug del modelo base usado
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS partes    jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS clausulas jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS tipo_acto text;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CLÁUSULAS BIBLIOTECA (global — por template)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clausulas_biblioteca (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES templates(id) ON DELETE CASCADE,
  slug        text NOT NULL,
  titulo      text NOT NULL,
  descripcion text,
  html        text NOT NULL DEFAULT '',
  opcional    boolean NOT NULL DEFAULT true,
  orden       int NOT NULL DEFAULT 0,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clausbib_template ON clausulas_biblioteca(template_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CLÁUSULAS REGISTRO (por registro — nivel 2)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clausulas_registro (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id text NOT NULL,
  template_id uuid REFERENCES templates(id),
  titulo      text NOT NULL,
  descripcion text,
  html        text NOT NULL DEFAULT '',
  publica     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clausreg_registro ON clausulas_registro(registro_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SCRIBA — conversaciones con el asistente IA
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scriba_conversaciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id  text NOT NULL,
  usuario_id   uuid NOT NULL,
  documento_id uuid REFERENCES documentos(id) ON DELETE SET NULL,
  modo         text NOT NULL DEFAULT 'redaccion',  -- 'redaccion' | 'revision' | 'consulta'
  mensajes     jsonb NOT NULL DEFAULT '[]',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scriba_registro  ON scriba_conversaciones(registro_id);
CREATE INDEX IF NOT EXISTS idx_scriba_documento ON scriba_conversaciones(documento_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- SEED: 50 modelos globales en templates (registro_id NULL = global)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO templates (nombre, tipo, familia, slug, descripcion, frecuencia, contenido, variables_json, registro_id, editable, visible) VALUES

-- CERTIFICACIONES
('Certificación de firma',                 'cert', 'cert', 'cert_firma',           'Certificación de firma de documento privado',           1,  '', '{}', NULL, false, true),
('Certificación de firma - Formulario 08', 'cert', 'cert', 'cert_firma_f08',        'Certificación de firma en F08 (vehículos)',             2,  '', '{}', NULL, false, true),
('Certificación de copia',                 'cert', 'cert', 'cert_copia',            'Copia certificada de documento',                        3,  '', '{}', NULL, false, true),
('Fe de vida',                             'cert', 'cert', 'fe_vida',               'Constatación de que una persona se encuentra con vida', 4,  '', '{}', NULL, false, true),

-- PODERES
('Poder especial',          'escritura', 'poder', 'poder_especial',       'Poder para acto/s determinado/s',                       5,  '', '{}', NULL, false, true),
('Poder general',           'escritura', 'poder', 'poder_general',        'Poder amplio para representación general',              6,  '', '{}', NULL, false, true),
('Poder de administración', 'escritura', 'poder', 'poder_administracion', 'Poder para administrar bienes',                         7,  '', '{}', NULL, false, true),
('Revocación de poder',     'escritura', 'poder', 'revocacion_poder',     'Revocación de poder notarial anterior',                 8,  '', '{}', NULL, false, true),
('Poder irrevocable',       'escritura', 'poder', 'poder_irrevocable',    'Poder irrevocable art. 380 CCyC',                       9,  '', '{}', NULL, false, true),

-- ACTAS
('Acta de constatación',          'acta', 'acta', 'acta_constatacion',   'Constatación de hechos o situaciones',                  10, '', '{}', NULL, false, true),
('Acta de notificación',          'acta', 'acta', 'acta_notificacion',   'Notificación fehaciente',                               11, '', '{}', NULL, false, true),
('Acta de manifestación',         'acta', 'acta', 'acta_manifestacion',  'Declaración unilateral o voluntaria',                   12, '', '{}', NULL, false, true),
('Acta de entrega',               'acta', 'acta', 'acta_entrega',        'Constatación de entrega de bien o documento',           13, '', '{}', NULL, false, true),
('Acta de asamblea',              'acta', 'acta', 'acta_asamblea',       'Labrado de acta de asamblea societaria',                14, '', '{}', NULL, false, true),
('Acta de directorio',            'acta', 'acta', 'acta_directorio',     'Labrado de acta de reunión de directorio',              15, '', '{}', NULL, false, true),
('Autorización de viaje de menor','acta', 'acta', 'autorizacion_viaje',  'Autorización para que menor viaje sin ambos padres',    16, '', '{}', NULL, false, true),

-- COMPRAVENTAS
('Compraventa inmueble urbano',      'escritura', 'escritura', 'compraventa_urbana',   'Compraventa de inmueble en zona urbana',               17, '', '{}', NULL, false, true),
('Compraventa inmueble rural',       'escritura', 'escritura', 'compraventa_rural',    'Compraventa de inmueble rural con/sin agua',           18, '', '{}', NULL, false, true),
('Compraventa propiedad horizontal', 'escritura', 'escritura', 'compraventa_ph',       'Compraventa de unidad en edificio PH',                 19, '', '{}', NULL, false, true),
('Compraventa de lote',              'escritura', 'escritura', 'compraventa_lote',     'Compraventa de lote en urbanización',                  20, '', '{}', NULL, false, true),
('Boleto de compraventa',            'escritura', 'escritura', 'boleto_compraventa',   'Boleto de compraventa con posesión',                   21, '', '{}', NULL, false, true),

-- GARANTÍAS
('Constitución de hipoteca', 'escritura', 'escritura', 'hipoteca_constitucion', 'Primera hipoteca sobre inmueble',           22, '', '{}', NULL, false, true),
('Cancelación de hipoteca',  'escritura', 'escritura', 'hipoteca_cancelacion',  'Cancelación total de hipoteca',             23, '', '{}', NULL, false, true),
('Prenda con registro',      'escritura', 'escritura', 'prenda_con_registro',   'Prenda sobre bien mueble registrable',      24, '', '{}', NULL, false, true),

-- DONACIONES
('Donación de inmueble',              'escritura', 'escritura', 'donacion_inmueble',    'Donación pura y simple de inmueble',                  25, '', '{}', NULL, false, true),
('Donación con reserva de usufructo', 'escritura', 'escritura', 'donacion_reserva_uso', 'Donación reservando el usufructo vitalicio',          26, '', '{}', NULL, false, true),

-- FAMILIA / CONDOMINIO
('Convenio de división de condominio', 'escritura', 'escritura', 'convenio_division',   'División y adjudicación entre condóminos',            27, '', '{}', NULL, false, true),
('Partición de herencia',              'escritura', 'escritura', 'particion_herencia',   'Partición extrajudicial de bienes hereditarios',      28, '', '{}', NULL, false, true),
('Donación a hijo con imputación',     'escritura', 'escritura', 'donacion_hijo',        'Donación a heredero con imputación a la legítima',    29, '', '{}', NULL, false, true),

-- DERECHOS REALES
('Constitución de usufructo',   'escritura', 'escritura', 'usufructo_constitucion', 'Usufructo sobre inmueble vitalicio o temporario',    30, '', '{}', NULL, false, true),
('Constitución de servidumbre', 'escritura', 'escritura', 'servidumbre',            'Servidumbre de paso u otras',                        31, '', '{}', NULL, false, true),
('Derecho de superficie',       'escritura', 'escritura', 'superficie',             'Derecho real de superficie art. 2114 CCyC',          32, '', '{}', NULL, false, true),

-- SOCIEDADES
('Estatuto de S.A.',                        'escritura', 'escritura', 'estatuto_sa',      'Constitución de sociedad anónima',                    33, '', '{}', NULL, false, true),
('Estatuto de S.A.S.',                       'escritura', 'escritura', 'estatuto_sas',     'Constitución de sociedad por acciones simplificada',  34, '', '{}', NULL, false, true),
('Contrato de S.R.L.',                       'escritura', 'escritura', 'contrato_srl',     'Constitución de sociedad de responsabilidad limitada', 35, '', '{}', NULL, false, true),
('Reforma de estatuto — aumento de capital', 'escritura', 'escritura', 'aumento_capital',  'Aumento de capital social',                           36, '', '{}', NULL, false, true),
('Cesión de cuotas sociales',                'escritura', 'escritura', 'cesion_cuotas',    'Transferencia de cuotas de SRL',                      37, '', '{}', NULL, false, true),

-- LOCACIONES
('Contrato de locación de inmueble', 'escritura', 'escritura', 'locacion_inmueble',   'Locación de inmueble urbano Ley 27.551',              38, '', '{}', NULL, false, true),
('Contrato de locación comercial',   'escritura', 'escritura', 'locacion_comercial',  'Locación con destino comercial',                     39, '', '{}', NULL, false, true),

-- MUTUOS
('Mutuo hipotecario',     'escritura', 'escritura', 'mutuo_hipotecario',    'Préstamo de dinero con garantía hipotecaria',          40, '', '{}', NULL, false, true),
('Mutuo simple',          'escritura', 'escritura', 'mutuo_simple',         'Préstamo de dinero sin garantía real',                 41, '', '{}', NULL, false, true),
('Reconocimiento de deuda','escritura','escritura', 'reconocimiento_deuda', 'Reconocimiento de obligación dineraria',               42, '', '{}', NULL, false, true),

-- SUCESIONES
('Declaratoria de herederos',      'escritura', 'sucesion', 'declaratoria_herederos', 'Proceso sucesorio — declaratoria',                   43, '', '{}', NULL, false, true),
('Protocolización de testamento',  'escritura', 'sucesion', 'aprobacion_testamento',  'Protocolización de testamento ológrafo',             44, '', '{}', NULL, false, true),
('Cesión de derechos hereditarios','escritura', 'sucesion', 'cesion_herencia',        'Cesión onerosa o gratuita de herencia',             45, '', '{}', NULL, false, true),

-- TRASLADOS
('Primer testimonio',      'traslado', 'traslado', 'primer_testimonio',    'Primera copia del protocolo',                          46, '', '{}', NULL, false, true),
('Testimonios posteriores','traslado', 'traslado', 'testimonio_posterior', 'Copias posteriores al primer testimonio',              47, '', '{}', NULL, false, true),
('Copia simple',           'traslado', 'traslado', 'copia_simple',         'Copia informativa sin fe pública',                    48, '', '{}', NULL, false, true),

-- VARIOS
('Aceptación de donación', 'escritura', 'escritura', 'aceptacion_donacion', 'Acto separado de aceptación de donación',             49, '', '{}', NULL, false, true),
('Renuncia a la herencia', 'escritura', 'sucesion',  'renuncia_herencia',   'Repudiación de herencia art. 2299 CCyC',             50, '', '{}', NULL, false, true)

ON CONFLICT DO NOTHING;
