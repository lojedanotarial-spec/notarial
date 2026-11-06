// Único lugar donde se elige qué modelo de Anthropic usa cada parte de la plataforma.
// Antes cada archivo tenía el suyo escrito a mano y se fueron desfasando (vision.js quedó una
// generación atrás de Scriba). Para cambiar un modelo se cambia acá, nada más.
//
// Piso acordado (06/11/26): ninguna parte baja de la generación 5.5.
export const MODELOS = {
  // Chat de Scriba: sigue el flujo de herramientas (leer_template_base, buscar_personas, etc.).
  // Medido el 06/11/26 con el prompt y las herramientas reales: Sonnet 5.5 respeta el flujo y responde
  // en segundos; Opus 5.5 redactó una cláusula sin pasar por leer_template_base y tardó 41 s.
  scriba: "claude-sonnet-5-5",

  // Lectura de DNI, tarjeta verde, licencias, partidas. Volumen bajísimo (unas pocas imágenes por día)
  // y el error sale caro (un número o una fecha mal leídos), así que va con el más capaz de la
  // generación. Opus 5.5 rinde ~10 puntos más que Sonnet 5.5 en ParseBench (un solo agregador:
  // tomarlo como indicio, no como prueba). Revisar con fotos reales (ver BACKLOG).
  vision: "claude-opus-5-5",

  // Resumen nocturno de conversaciones. Es texto → texto, no necesita más.
  aprendizaje: "claude-sonnet-5-5",
};
