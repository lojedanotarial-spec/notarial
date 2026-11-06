// Purga horaria de la captura de documentos desde el celular: Cloudflare Worker con Cron Trigger (cada hora).
// Llama a /api/captura (acción "purgar"), que destruye las fotos y lecturas que pasaron su tope de 24 h.
// Existe porque los dos cupos de cron de Vercel Hobby ya están usados (aprendizaje y backup); las otras
// dos capas (purga oportunista al crear una captura y la del backup diario) son red de seguridad.
//
// Deploy: node scripts/deploy_purga.mjs  (sube el Worker y el secreto por la API de Cloudflare)
//
// Si la purga falla, el Worker lo deja en el log (y si hay Telegram configurado, avisa).

export default {
  async scheduled(_event, env) {
    const r = await fetch("https://notarial.lat/api/captura", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.CAPTURA_PURGA_TOKEN}` },
      body: JSON.stringify({ accion: "purgar" }),
    });
    const cuerpo = await r.text();
    if (!r.ok) {
      console.error("Purga de capturas falló:", r.status, cuerpo.slice(0, 200));
      if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: `⚠️ La purga horaria de capturas falló (HTTP ${r.status}). Las fotos pueden quedar más de 24 h.` }),
        });
      }
    } else {
      console.log("Purga de capturas:", cuerpo);
    }
  },
  async fetch() {
    return new Response("notarial-purga", { status: 200 });
  },
};
