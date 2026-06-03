// Lookup de tildes para nombres de pila argentinos.
// Solo aplica a NOMBRES, nunca a apellidos.
// Fuente: nombres más frecuentes en Argentina según RENAPER.
// Clave: uppercase sin tilde. Valor: forma correcta con tilde.

const T = {
  // A
  ADRIAN:       'ADRIÁN',
  AGUSTIN:      'AGUSTÍN',
  ANGEL:        'ÁNGEL',
  ANGELES:      'ÁNGELES',
  ANALIA:       'ANALÍA',
  ANIBAL:       'ANÍBAL',
  AYELEN:       'AYELÉN',

  // B
  BARTOLOME:    'BARTOLOMÉ',
  BELEN:        'BELÉN',
  BENJAMIN:     'BENJAMÍN',

  // C
  CAMILO:       'CAMILO',   // sin tilde
  CESAR:        'CÉSAR',
  CONCEPCION:   'CONCEPCIÓN',
  CRISTIAN:     'CRISTIAN', // en Argentina generalmente sin tilde

  // D
  DAMASO:       'DÁMASO',
  DAMIAN:       'DAMIÁN',
  DARIO:        'DARÍO',
  DEBORA:       'DÉBORA',

  // E
  EFRAIN:       'EFRAÍN',
  ELIAS:        'ELÍAS',
  ESTEFANIA:    'ESTEFANÍA',
  EXEQUIEL:     'EXEQUIEL', // sin tilde (ex-e-QUIEL)

  // F
  FABIAN:       'FABIÁN',
  FATIMA:       'FÁTIMA',
  FELIX:        'FÉLIX',

  // G
  GASTON:       'GASTÓN',
  GERMAN:       'GERMÁN',

  // H
  HECTOR:       'HÉCTOR',
  HERNAN:       'HERNÁN',

  // I
  INES:         'INÉS',
  ISAIAS:       'ISAÍAS',
  IVAN:         'IVÁN',

  // J
  JEREMIAS:     'JEREMÍAS',
  JERONIMO:     'JERÓNIMO',
  JOAQUIN:      'JOAQUÍN',
  JOSE:         'JOSÉ',
  JULIAN:       'JULIÁN',

  // L
  LAZARO:       'LÁZARO',
  LEON:         'LEÓN',
  LIA:          'LÍA',

  // M
  MALEN:        'MALÉN',
  MARIA:        'MARÍA',
  MARTIN:       'MARTÍN',
  MATIAS:       'MATÍAS',
  MAXIMO:       'MÁXIMO',
  MESIAS:       'MESÍAS',
  MONICA:       'MÓNICA',

  // N
  NESTOR:       'NÉSTOR',
  NICOLAS:      'NICOLÁS',
  NOEL:         'NOEL',    // sin tilde

  // O
  OSCAR:        'ÓSCAR',

  // R
  RAMON:        'RAMÓN',
  RAUL:         'RAÚL',
  ROCIO:        'ROCÍO',
  ROMAN:        'ROMÁN',
  RUBEN:        'RUBÉN',

  // S
  SEBASTIAN:    'SEBASTIÁN',
  SIMON:        'SIMÓN',
  SOFIA:        'SOFÍA',
  SOLEDAD:      'SOLEDAD', // sin tilde

  // T
  TOBIAS:       'TOBÍAS',
  TOMAS:        'TOMÁS',

  // V
  VALENTIN:     'VALENTÍN',
  VERONICA:     'VERÓNICA',
  VICTOR:       'VÍCTOR',
};

/**
 * Aplica tildes correctas a un nombre de pila (no apellido).
 * Procesa cada palabra por separado para manejar nombres compuestos.
 * Si una palabra no está en el lookup, la deja intacta.
 *
 * @param {string} nombre - nombre en mayúsculas sin tilde (como viene del OCR)
 * @returns {string} nombre con tildes correctas
 */
export function aplicarTildesNombre(nombre) {
  if (!nombre) return nombre;
  return nombre
    .split(/\s+/)
    .map(w => T[w.toUpperCase()] ?? w)
    .join(' ');
}
