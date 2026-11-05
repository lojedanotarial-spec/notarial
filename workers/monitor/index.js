// Monitor de Notarial: Cloudflare Worker con Cron Trigger (cada 5 min) que chequea los servicios y avisa
// por Telegram cuando algo se cae y cuando se recupera. Una vez por día (09:00 Argentina) manda un
// "todo OK" que sirve de latido: si un día ese mensaje no llega, el que está caído es el monitor.
//
// Deploy: node scripts/deploy_monitor.mjs  (sube el Worker, el KV y los secretos por la API de Cloudflare)
//
// Avisa recién a la 2.ª falla seguida (≈10 min) para no molestar por un parpadeo, y no repite el aviso
// mientras siga caído. El estado de cada chequeo vive en KV (binding ESTADO).

const CHEQUEOS = [
  {
    nombre: "App (notarial.lat)",
    pedir: () => fetch("https://notarial.lat/", { redirect: "manual" }),
    ok: (r) => r.status === 200,
  },
  {
    nombre: "Editor OnlyOffice",
    pedir: () => fetch("https://onlyoffice.notarial.lat/healthcheck"),
    ok: async (r) => r.status === 200 && (await r.text()).trim() === "true",
  },
  {
    // Sin sesión tiene que dar 401: prueba que la función carga y responde. Un 500 es que está rota.
    nombre: "Scriba (API)",
    pedir: () => fetch("https://notarial.lat/api/scriba", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    ok: (r) => r.status === 401,
  },
  {
    nombre: "Supabase",
    pedir: (env) => fetch(`${env.SUPABASE_URL}/auth/v1/health`, { headers: { apikey: env.SUPABASE_ANON_KEY } }),
    ok: (r) => r.status === 200,
  },
];

const FALLAS_PARA_AVISAR = 2;

async function avisar(env, texto) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: texto, disable_web_page_preview: true }),
  });
  if (!r.ok) console.error("Telegram respondió", r.status, await r.text());
}

async function chequear(env, c) {
  const t0 = Date.now();
  try {
    const r = await c.pedir(env, { signal: AbortSignal.timeout(12000) });
    const ok = await c.ok(r);
    return { ok, detalle: ok ? "" : `HTTP ${r.status}`, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, detalle: String(e.message || e).slice(0, 120), ms: Date.now() - t0 };
  }
}

const hora = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(11, 16); // Argentina

export default {
  async scheduled(event, env) {
    const resultados = [];
    for (const c of CHEQUEOS) {
      const res = await chequear(env, c);
      resultados.push({ c, res });

      const clave = `estado:${c.nombre}`;
      const previo = JSON.parse((await env.ESTADO.get(clave)) || '{"fallas":0,"caido":false,"desde":null}');

      if (res.ok) {
        if (previo.caido) await avisar(env, `🟢 ${c.nombre} se recuperó (caído desde las ${previo.desde}, ahora ${hora()}).`);
        await env.ESTADO.put(clave, JSON.stringify({ fallas: 0, caido: false, desde: null }));
      } else {
        const fallas = previo.fallas + 1;
        let { caido, desde } = previo;
        if (fallas >= FALLAS_PARA_AVISAR && !caido) {
          caido = true;
          desde = hora();
          await avisar(env, `🔴 ${c.nombre} NO responde (${res.detalle}). Falló ${fallas} chequeos seguidos, desde las ${hora()}.`);
        }
        await env.ESTADO.put(clave, JSON.stringify({ fallas, caido, desde }));
      }
    }

    // Latido diario (cron "0 12 * * *" = 09:00 en Argentina)
    if (event.cron === "0 12 * * *") {
      const lineas = resultados.map(({ c, res }) => `${res.ok ? "✅" : "🔴"} ${c.nombre} (${res.ms} ms)`);
      await avisar(env, `Buen día. Estado de Notarial:\n${lineas.join("\n")}`);
    }
  },

  // Para probar a mano: GET /?token=... no está expuesto a propósito; se prueba con el botón "Trigger" del dashboard
  // o con `curl "https://<worker>/__scheduled?cron=*/5+*+*+*+*"` en desarrollo local.
  async fetch() {
    return new Response("notarial-monitor", { status: 200 });
  },
};
