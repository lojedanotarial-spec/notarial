// TEMPORAL (spike S2 del Drive, 06/11/26): comprueba si Vercel entrega por streaming
// respuestas mayores a 4,5 MB. Se borra al terminar la Fase 1. No toca datos ni requiere nada.
export default async function handler(req, res) {
  const mb = Math.min(Math.max(parseInt(req.query?.mb, 10) || 20, 1), 30);
  const trozo = Buffer.alloc(64 * 1024, 7);
  const total = mb * 1024 * 1024;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");
  let enviados = 0;
  while (enviados < total) {
    const ok = res.write(trozo);
    enviados += trozo.length;
    if (!ok) await new Promise((r) => res.once("drain", r));
  }
  res.end();
}
