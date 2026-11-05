// Avisos a Telegram desde las funciones de api/. Si faltan las variables (TELEGRAM_BOT_TOKEN y
// TELEGRAM_CHAT_ID) no hace nada: un aviso nunca debe romper la función que lo manda.
export async function avisar(texto) {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!token || !chat) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: texto, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Para avisos que pueden repetirse (ej. un error de Scriba que el usuario reintenta): una vez cada
// `ventanaMs` por instancia de la función. No es exacto (cada instancia tiene su propio reloj), pero
// alcanza para no llenar el chat.
const ultimoAviso = new Map();
export async function avisarSinRepetir(clave, texto, ventanaMs = 10 * 60 * 1000) {
  const ahora = Date.now();
  if (ahora - (ultimoAviso.get(clave) || 0) < ventanaMs) return false;
  ultimoAviso.set(clave, ahora);
  return avisar(texto);
}
