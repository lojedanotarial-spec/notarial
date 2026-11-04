// Formatos de presentación compartidos (antes había 4 copias de fmtDni).

// 27123456 -> "27.123.456". Sin dígitos devuelve "".
export function fmtDni(valor) {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  return digitos ? Number(digitos).toLocaleString("es-AR") : "";
}
