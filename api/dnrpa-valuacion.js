/**
 * GET /api/dnrpa-valuacion
 *
 * Búsqueda/autocomplete:
 *   ?q=volkswagen+gol&anio=2010    → [{ mtm, marca, modelo, tipo_desc, valor }, ...]
 *
 * Lookup exacto por MTM:
 *   ?mtm=00402288&anio=2010        → { mtm, marca, modelo, tipo_desc, valor }
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = "https://eueqluhhgvukovoyorrw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function extractValor(valores, anio) {
  if (!valores || !anio) return null;
  const key = String(anio).toLowerCase() === "0km" ? "0km" : String(anio);
  return valores[key] ?? null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  res.setHeader("Cache-Control", "public, max-age=3600"); // cachear 1h — la tabla cambia mensual

  const { q, mtm, anio } = req.query;

  // ── Lookup exacto por MTM ──────────────────────────────────────────────────
  if (mtm) {
    const { data, error } = await supabase
      .from("dnrpa_valuaciones")
      .select("mtm, marca, modelo, tipo_desc, tipo_vehiculo, valores")
      .eq("mtm", mtm.trim())
      .single();

    if (error || !data) return res.json(null);

    const valor = extractValor(data.valores, anio);
    const { valores: _, ...rest } = data;
    return res.json({ ...rest, valor, anio: anio ?? null });
  }

  // ── Búsqueda por texto ─────────────────────────────────────────────────────
  if (q) {
    const terms = q.trim().split(/\s+/).filter(Boolean).slice(0, 6); // máximo 6 términos

    let query = supabase
      .from("dnrpa_valuaciones")
      .select("mtm, marca, modelo, tipo_desc, tipo_vehiculo, valores")
      .limit(12);

    // AND de todos los términos sobre search_text (columna generada = marca || ' ' || modelo)
    for (const term of terms) {
      query = query.ilike("search_text", `%${term}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const results = (data || []).map(row => {
      const valor = extractValor(row.valores, anio);
      const { valores: _, ...rest } = row;
      return { ...rest, valor, anio: anio ?? null };
    });

    return res.json(results);
  }

  return res.status(400).json({ error: "Parámetro 'q' o 'mtm' requerido" });
}
