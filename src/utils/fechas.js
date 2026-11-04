export const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

// Fecha del acto como { dia, mes (0-11), anio }, que es lo que espera buildVars.

export function fechaDeHoy(ahora = new Date()) {
  return { dia: ahora.getDate(), mes: ahora.getMonth(), anio: ahora.getFullYear() };
}

// "dd/mm/aaaa" -> { dia, mes (0-11), anio }. Lo que falte o sea inválido se completa con hoy.
// Ojo: el mes 0 (enero) es un valor válido, por eso no se usa `||` para completar.
export function parseFechaDDMMAAAA(texto, ahora = new Date()) {
  const hoy = fechaDeHoy(ahora);
  if (!texto) return hoy;
  const [d, m, a] = String(texto).split("/").map(Number);
  return {
    dia:  d >= 1 && d <= 31 ? d : hoy.dia,
    mes:  m >= 1 && m <= 12 ? m - 1 : hoy.mes,
    anio: a > 0 ? a : hoy.anio,
  };
}
