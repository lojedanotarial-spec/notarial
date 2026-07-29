-- Fix: "Notaria/o Adscripta/o DEL Registro Notarial" debería decir "AL Registro
-- Notarial" (los titulares sí llevan "del"). Bug reportado en la ronda de
-- testing manual del 29/07/26.
--
-- La variable {{ESCRIBANO_AL_DEL}} ya existe en src/utils/templateVars.js
-- (resuelve "del" para titular, "al" para adscripto/a) pero sólo estaba
-- cableada en 2 de 52 templates (cert_firma_f08, autorizacion_vehiculo).
-- Los otros 50 tenían "del"/"al" HARDCODEADO en el texto, ignorando el
-- carácter real del escribano firmante:
--   - 47 templates: "{{ESCRIBANO_CARACTER_TEXTO}} del Registro Notarial"
--     → adscriptos salían mal ("... Adscripta DEL Registro...")
--   - cert_copia, fe_vida: "{{ESCRIBANO_CARACTER_TEXTO}} al Registro Notarial"
--     → el bug inverso: acá eran los TITULARES los que salían mal
--       ("... Titular AL Registro...")
--   - poder_especial, poder_general: "Notario/a {{ESCRIBANO_CARACTER}} del
--     Registro Notarial" (nota aparte: esto además duplica "Notario/a" con
--     lo que ya trae {{ESCRIBANO_CARACTER}} — p.ej. "Notario/a Notario
--     Titular" — bug pre-existente y distinto, no se toca en este script)
--
-- Fuera de alcance a propósito: menciones de OTROS escribanos en
-- antecedentes/referencias (DONACION_CARACTER, PODER_CARACTER_ESCRIBANO_
-- ORIGINAL, ESCRIBANO_ORIGEN_CARACTER) — esos no tienen hoy una variable
-- derivada equivalente a ESCRIBANO_AL_DEL porque su carácter viene de texto
-- libre, no de un toggle titular/adscripto. Requeriría trabajo aparte.
--
-- Verificar ANTES de correr (debería dar 50 filas / 51 ocurrencias):
--   SELECT slug, contenido FROM templates
--   WHERE contenido ~ '(\{\{ESCRIBANO_CARACTER_TEXTO\}\}|\{\{ESCRIBANO_CARACTER\}\})\s+(del|al)\s+Registro Notarial';

UPDATE templates
SET contenido = regexp_replace(
  contenido,
  '(\{\{ESCRIBANO_CARACTER_TEXTO\}\}|\{\{ESCRIBANO_CARACTER\}\})\s+(del|al)\s+Registro Notarial',
  '\1 {{ESCRIBANO_AL_DEL}} Registro Notarial',
  'g'
)
WHERE contenido ~ '(\{\{ESCRIBANO_CARACTER_TEXTO\}\}|\{\{ESCRIBANO_CARACTER\}\})\s+(del|al)\s+Registro Notarial';

-- Verificar DESPUÉS de correr (debería dar 0 filas — ya no debería quedar
-- ningún "del"/"al" hardcodeado al lado de esas dos variables):
--   SELECT slug FROM templates
--   WHERE contenido ~ '(\{\{ESCRIBANO_CARACTER_TEXTO\}\}|\{\{ESCRIBANO_CARACTER\}\})\s+(del|al)\s+Registro Notarial';
--
-- Y que haya quedado bien cableado (debería dar 52 — los 50 de acá + los
-- 2 que ya estaban bien):
--   SELECT count(*) FROM templates WHERE contenido LIKE '%ESCRIBANO_AL_DEL%';
