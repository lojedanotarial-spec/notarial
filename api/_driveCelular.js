// Lógica pura de las sesiones de subida por QR (sin red ni base: se prueba sola).
// El handler (api/drive.js) la usa. Spec y plan: specs/documentacion-celular-expediente/.

const MIN = 60_000;
export const SESION_VENCE_MS = 30 * MIN;                 // el QR sirve 30 minutos desde que se genera
export const GRACIA_CONFIRMAR_MS = 5 * MIN;              // una subida ya empezada se puede confirmar hasta 5 min después
export const LIMPIEZA_SESIONES_MS = 7 * 24 * 60 * MIN;   // las sesiones de más de 7 días se borran

export function calcularVencimientoSesion(ahora = Date.now()) {
  return new Date(ahora + SESION_VENCE_MS).toISOString();
}

// Por qué una sesión no sirve (null si sirve). "Cerrada" gana sobre "vencida": es lo más útil de decirle a quien
// está en el celular. Con `paraConfirmar`, una sesión recién vencida todavía deja confirmar lo que ya se subió,
// pero una cerrada desde la compu no se revive nunca.
export function motivoSesionInvalida(sesion, ahora = Date.now(), { paraConfirmar = false } = {}) {
  if (!sesion) return "inexistente";
  if (sesion.cerrada_en) return "cerrada";
  const limite = new Date(sesion.expira_en).getTime() + (paraConfirmar ? GRACIA_CONFIRMAR_MS : 0);
  return limite <= ahora ? "vencida" : null;
}

export const sesionVigente = (sesion, ahora = Date.now()) => motivoSesionInvalida(sesion, ahora) === null;

export const urlSesion = (base, codigo) => `${base}/s/${codigo}`;

export const vencimientoLimpieza = (ahora = Date.now()) => new Date(ahora - LIMPIEZA_SESIONES_MS).toISOString();

// El celular solo puede quitar lo que subió en SU sesión, en SU expediente, y que no esté ya quitado.
export function puedeQuitar(archivo, sesion) {
  return !!archivo && !!sesion && archivo.sesion_id === sesion.id && archivo.expediente_id === sesion.expediente_id && !archivo.borrado_en;
}

// Lo único que se le muestra a quien escanea el QR: el nombre del expediente y los archivos de ESTA sesión.
// Nada del registro, de los usuarios ni de Drive.
export function resumenSesionParaCelular(sesion, expediente, archivos = [], ahora = Date.now()) {
  const motivo = motivoSesionInvalida(sesion, ahora);
  if (!sesion) return { vigente: false, motivo, expediente_nombre: null, expira_en: null, archivos: [] };
  return {
    vigente: motivo === null,
    motivo,
    expediente_nombre: expediente?.nombre ?? null,
    expira_en: sesion.expira_en,
    archivos: motivo ? [] : archivos
      .filter((a) => puedeQuitar(a, sesion))
      .map((a) => ({ id: a.id, nombre: a.nombre, tamano: a.tamano, mime_type: a.mime_type })),
  };
}
