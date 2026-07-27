// Referencia de los 2 templates nuevos creados directo vía Supabase MCP
// (piloto de bloques, expansión post #81) — este archivo documenta qué se
// cargó, no es un script ejecutable/idempotente.

// cesion_credito (id 5bfc89c6-4f78-439f-b517-6fbca3633d08)
//  Base: adaptado de "ESCRITURA PÚBLICA DE CESIÓN DE CRÉDITO POR PRECIO EN
//  DINERO". El origen del crédito (DESCRIPCION_CREDITO) queda como texto
//  libre a propósito — las variantes del formulario original (litigioso,
//  hipotecario, pro solvendo, pro soluto, gratuita) son documentos de
//  5.000-6.000 caracteres cada uno que reescriben todo el antecedente, no
//  addenda cortos. En vez de forzarlos al modelo de cláusulas (que solo
//  agrega texto al final), se resolvió con UN campo de texto libre que el
//  escribano/Scriba completa según el caso real — el mismo patrón que ya
//  existía para "cláusulas de precio en moneda extranjera".
//  Sin cláusulas propias en este pase.

// cesion_posicion_contractual (id 82642778-72f4-4735-874a-086a6a78156d)
//  Base: adaptado de "ESCRITURA PÚBLICA DE CESIÓN ONEROSA DE LA POSICIÓN
//  CONTRACTUAL". Es un acto de 3 partes (Cedente/Cesionario/Cedido) — la
//  conformidad del Cedido es obligatoria por art. 1636 CCyC, no opcional.
//  El antecedente del contrato cedido (DESCRIPCION_CONTRATO_BASE) también
//  queda como texto libre, mismo criterio que cesion_credito.
//  3 cláusulas opcionales (genuinas, ya venían marcadas como "(cláusula
//  opcional)"/"(variante FIANZA...)" en el original):
//   - responsabilidad_cedente_incumplimiento (art. 1637, 2do párrafo)
//   - fianza_simple_posicion_contractual
//   - fianza_principal_pagador_posicion_contractual

// Hallazgo general de este pase (aplica a compraventa/donación/superficie
// también): la mayoría de las "variantes" del formulario original NO son
// addenda cortos — son documentos alternativos completos que reescriben el
// antecedente/objeto del acto. El modelo de cláusulas opcionales (append-only
// al final del cuerpo) solo funciona bien para agregados genuinos (pactos,
// garantías, manifestaciones). Para variantes de "mismo acto, distinto
// antecedente", la solución más simple y honesta es un campo de texto libre
// en el template base, no una cláusula ni un template nuevo por variante.
