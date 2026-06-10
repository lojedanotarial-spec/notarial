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
  if (!valores) return { valor: null, anioUsado: null };
  if (!anio)    return { valor: null, anioUsado: null };

  const key = String(anio).toLowerCase() === "0km" ? "0km" : String(anio);

  // Año exacto disponible
  if (valores[key] != null) return { valor: valores[key], anioUsado: key };

  // Fallback: año más cercano disponible
  const yearNum = parseInt(anio);
  if (isNaN(yearNum)) return { valor: null, anioUsado: null };

  const disponibles = Object.keys(valores)
    .filter(k => k !== "0km" && /^\d{4}$/.test(k))
    .map(Number)
    .sort((a, b) => a - b);

  if (disponibles.length === 0) return { valor: null, anioUsado: null };

  // Tomar el más cercano (si el año pedido es más viejo que todos, usar el más antiguo)
  const closest = disponibles.reduce((prev, curr) =>
    Math.abs(curr - yearNum) < Math.abs(prev - yearNum) ? curr : prev
  );
  return { valor: valores[String(closest)], anioUsado: String(closest), esFallback: true };
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

    const { valor, anioUsado, esFallback } = extractValor(data.valores, anio);
    const { valores: _, ...rest } = data;
    return res.json({ ...rest, valor, anio: anio ?? null, anioUsado, esFallback: !!esFallback });
  }

  // ── Búsqueda por texto ─────────────────────────────────────────────────────
  if (q) {
    const terms = q.trim().split(/\s+/).filter(Boolean).slice(0, 6);

    let query = supabase
      .from("dnrpa_valuaciones")
      .select("mtm, marca, modelo, tipo_desc, tipo_vehiculo, valores")
      .limit(12);

    for (const term of terms) {
      query = query.ilike("search_text", `%${term}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const results = (data || []).map(row => {
      const { valor, anioUsado, esFallback } = extractValor(row.valores, anio);
      const { valores: _, ...rest } = row;
      return { ...rest, valor, anio: anio ?? null, anioUsado, esFallback: !!esFallback };
    });

    return res.json(results);
  }

  return res.status(400).json({ error: "Parámetro 'q' o 'mtm' requerido" });
}
