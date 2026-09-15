// Módulo de aprendizaje diario de Scriba.
//
// Una vez al día (cron de Vercel, ver vercel.json) analiza las conversaciones
// del día calendario anterior (hora Argentina) junto con el feedback 👍/👎 que
// haya dejado el usuario, y produce UN reporte legible por humanos en
// scriba_reportes_aprendizaje. No aplica ningún cambio automáticamente —
// el reporte es para que Lucas lo revise y decida qué ajustar a mano.
//
// Corre con la service role key (bypassa RLS): necesita leer conversaciones
// de todos los registros, no solo las de un usuario logueado.

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../_supabaseConfig.js";

const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // ART = UTC-3, sin horario de verano

const TAXONOMIA = `Categorías posibles para clasificar un problema (usá "otro" si no encaja):
- alucinacion_dato: Scriba afirmó o completó un dato (fecha, número, nombre) que no estaba en la conversación ni en un documento adjunto.
- instruccion_ambigua: la respuesta sugiere que el system prompt no cubre bien ese caso (dejalo explícito en la sugerencia).
- herramienta_no_usada: había una validación disponible (validar_cuit, validar_limites_inmueble, calcular_edad) que debió dispararse y no se usó, o se usó mal.
- alcance_mal_aplicado: Scriba respondió algo fuera de alcance notarial/legal, o rechazó algo que sí estaba dentro de alcance.
- tono_o_claridad: la respuesta es correcta pero confusa, muy larga, muy corta, o con un tono inadecuado para un estudio notarial.
- formato_o_dato_tecnico: error de formato (fechas, mayúsculas, CUIT mal armado, etc.) no cubierto por las categorías anteriores.
- otro: cualquier otro problema, con descripción propia.`;

function ventanaDeAyerArt() {
  const ahoraArt = new Date(Date.now() - AR_OFFSET_MS);
  const hoyArtMedianoche = new Date(Date.UTC(ahoraArt.getUTCFullYear(), ahoraArt.getUTCMonth(), ahoraArt.getUTCDate()));
  const inicioArt = new Date(hoyArtMedianoche.getTime() - 24 * 60 * 60 * 1000);
  const finArt = hoyArtMedianoche;
  return {
    fecha: inicioArt.toISOString().slice(0, 10),
    desde: new Date(inicioArt.getTime() + AR_OFFSET_MS),
    hasta: new Date(finArt.getTime() + AR_OFFSET_MS),
  };
}

function autorizado(req) {
  const auth = req.headers.authorization || "";
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  return false;
}

async function analizarConClaude(client, turnos) {
  const cuerpo = turnos.map((t, i) => {
    const fb = t.feedback
      ? `\nFEEDBACK DEL USUARIO: ${t.feedback.valoracion.toUpperCase()}${t.feedback.comentario ? ` — "${t.feedback.comentario}"` : ""}`
      : "";
    return `── Turno ${i + 1} (pantalla: ${t.screen || "?"}, instrumento: ${t.slug || "?"}) ──
USUARIO: ${(t.user_input || "").slice(0, 2000)}
SCRIBA: ${(t.response || "").slice(0, 2000)}${fb}`;
  }).join("\n\n");

  const prompt = `Sos un auditor interno que revisa el desempeño diario de Scriba, el asistente IA de un estudio notarial en Mendoza, Argentina. Te paso ${turnos.length} intercambios (usuario + respuesta de Scriba) del día de ayer, algunos con feedback 👍/👎 del usuario.

${TAXONOMIA}

Tu trabajo:
1. Identificá patrones reales — no reportes un problema si aparece una sola vez sin evidencia clara, salvo que tenga feedback 👎 explícito.
2. Priorizá los turnos con feedback 👎 (son la señal más confiable) pero no te limites a ellos — también evaluá el resto con tu propio criterio.
3. Para cada patrón, si tenés una sugerencia concreta y específica de qué ajustar (en el system prompt, en una validación, etc.), incluila. Si no estás seguro, dejá sugerencia en null — no inventes una corrección solo por completar el campo.
4. Si algo funcionó particularmente bien (sobre todo si tiene 👍 con contexto), anotalo en positivos_destacados — el objetivo no es solo cazar errores.

Conversaciones:

${cuerpo}

Respondé SOLO con este JSON, sin texto adicional:
{
  "resumen": "2-4 oraciones en español, tono directo, para que un humano entienda el día de un vistazo",
  "patrones": [
    { "categoria": "una de la taxonomía", "frecuencia": 0, "ejemplos": ["cita breve o paráfrasis de 1 línea"], "sugerencia": "string o null" }
  ],
  "positivos_destacados": ["string breve", "..."]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const texto = response.content.find(c => c.type === "text")?.text || "{}";
  const jsonMatch = texto.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { resumen: "", patrones: [], positivos_destacados: [] };
}

export default async function handler(req, res) {
  if (!autorizado(req)) return res.status(401).json({ error: "No autorizado" });

  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada" });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY no configurada" });

  const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { fecha, desde, hasta } = ventanaDeAyerArt();

  try {
    const { data: logs, error: errLogs } = await sb
      .from("scriba_logs")
      .select("id, slug, screen, user_input, response, created_at")
      .is("error", null)
      .not("response", "is", null)
      .gte("created_at", desde.toISOString())
      .lt("created_at", hasta.toISOString())
      .order("created_at", { ascending: true })
      .limit(200); // tope de seguridad — el volumen real de un estudio chico está muy por debajo
    if (errLogs) throw errLogs;

    let feedbackPorLog = {};
    if (logs?.length) {
      const { data: fb, error: errFb } = await sb
        .from("scriba_feedback")
        .select("scriba_log_id, valoracion, comentario")
        .in("scriba_log_id", logs.map(l => l.id));
      if (errFb) throw errFb;
      feedbackPorLog = Object.fromEntries((fb || []).map(f => [f.scriba_log_id, f]));
    }

    const turnos = (logs || []).map(l => ({ ...l, feedback: feedbackPorLog[l.id] || null }));
    const positivos = turnos.filter(t => t.feedback?.valoracion === "positivo").length;
    const negativos = turnos.filter(t => t.feedback?.valoracion === "negativo").length;

    let analisis = { resumen: "Sin actividad de Scriba en este período.", patrones: [], positivos_destacados: [] };
    if (turnos.length > 0) {
      analisis = await analizarConClaude(client, turnos);
    }

    const resumenMd = [
      analisis.resumen || "",
      analisis.positivos_destacados?.length
        ? `\n\n**Funcionó bien:**\n${analisis.positivos_destacados.map(p => `- ${p}`).join("\n")}`
        : "",
    ].join("");

    const { error: errUpsert } = await sb.from("scriba_reportes_aprendizaje").upsert({
      fecha,
      periodo_desde: desde.toISOString(),
      periodo_hasta: hasta.toISOString(),
      conversaciones_analizadas: turnos.length,
      feedback_positivo: positivos,
      feedback_negativo: negativos,
      resumen_md: resumenMd,
      patrones: analisis.patrones || [],
    }, { onConflict: "fecha" });
    if (errUpsert) throw errUpsert;

    return res.status(200).json({ ok: true, fecha, conversaciones_analizadas: turnos.length });
  } catch (e) {
    console.error("Error en scriba-learning:", e);
    return res.status(500).json({ error: e.message });
  }
}
