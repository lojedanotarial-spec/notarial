// Un solo lugar que arma los datos del escribano a partir de un miembro/usuario del registro.
// Antes se armaba a mano en 6 pantallas, con variantes: Editor distinguía género
// ("Notaria Titular") y Lote/Bulk ponían siempre "Notario/a Titular".

export const nombreDeMiembro = (m) => m?.nombre_preferido || `${m?.nombre ?? ""} ${m?.apellido ?? ""}`.trim();

export function caracterDeMiembro(m) {
  const fem = m?.genero === "f";
  switch (m?.rol) {
    case "titular":   return fem ? "Notaria Titular" : "Notario Titular";
    case "adscripta": return "Notaria Adscripta";
    case "adscripto": return "Notario Adscripto";
    default:          return "Notario/a Adscripto/a";
  }
}

// Objeto `escribano` que consumen buildVars / construirVarsLote.
export function escribanoDesdeMiembro(m) {
  return {
    nombre:             nombreDeMiembro(m),
    caracter:           caracterDeMiembro(m),
    registro:           m.registro,
    circunscripcion:    m.circunscripcion,
    localidad_registro: m.localidad_registro,
    genero:             m.genero,
  };
}
