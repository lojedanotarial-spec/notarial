// Referencia de las cláusulas cargadas en clausulas_biblioteca para donación,
// locación y superficie (piloto de bloques, expansión post #81). Ya ejecutadas
// vía Supabase MCP — este archivo documenta qué se cargó, no es idempotente.

// Donación (donacion_inmueble, donacion_hijo, donacion_reserva_uso):
//  - oferta_donacion_mancomunados: varios donatarios aceptan por separado, con
//    caducidad parcial si alguno no acepta en plazo.
//  - cargo_favor_tercero_interes_publico: cargo de destinar el inmueble a un
//    fin de interés público, con plazo y revocación por incumplimiento.
//  Fuera de alcance en este pase: las ~20 variantes "ESCRITURA DE DONACIÓN
//  CON..." (reserva de usufructo, dispensa de colación, mejora a heredero con
//  discapacidad, etc.) son documentos completos de 5.000-17.000 caracteres,
//  no addenda cortos — requieren extraer manualmente el párrafo diferencial
//  de cada uno, trabajo de curación aparte. "CLÁUSULAS DE CONSTITUCIÓN DE
//  USUFRUCTO ONEROSO" (18 sub-cláusulas, fiador, PH, poder de cancelación)
//  también se dejó pendiente por su extensión y complejidad — merece un pase
//  dedicado, no uno apurado dentro de este sweep.

// Locación (locacion_inmueble, locacion_comercial):
//  - prohibicion_ceder_sublocar
//  - opcion_compra_inmueble_locacion
//  - solidaridad_colocatarios
//  - autorizacion_mejoras_locacion
//  - responsabilidad_locatario_danos

// Superficie (superficie):
//  - indivision_forzosa_cosuperficiarios
//  Fuera de alcance: "derecho de acrecer entre cosuperficiarios" y
//  "continuación de PH luego de extinguido el derecho de superficie" son en
//  realidad variantes de CONSTITUCIÓN del derecho (una re-describe el
//  inmueble y las partes desde cero, la otra otorga un poder especial
//  irrevocable y un régimen de PH completo) — no son addenda sobre un
//  template ya constituido, se solaparían con el cuerpo base en vez de
//  complementarlo. Quedan documentadas acá para una futura Fase 2 real
//  (templates alternativos, no cláusulas).
