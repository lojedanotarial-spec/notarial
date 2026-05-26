import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL      = "https://eueqluhhgvukovoyorrw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E";

export default async function handler(req, res) {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Count total rows in personas
  const { count, error: countErr } = await sb
    .from("personas")
    .select("*", { count: "exact", head: true });

  // 2. First 3 rows (any)
  const { data: muestra, error: muestraErr } = await sb
    .from("personas")
    .select("registro_id, apellido, nombre, nro_doc")
    .limit(3);

  // 3. Search for 31645431
  const { data: porDni, error: dniErr } = await sb
    .from("personas")
    .select("registro_id, apellido, nombre, nro_doc")
    .ilike("nro_doc", "%31645431%");

  // 4. Search by apellido OJEDA
  const { data: porApellido, error: apErr } = await sb
    .from("personas")
    .select("registro_id, apellido, nombre, nro_doc")
    .ilike("apellido", "%ojeda%");

  return res.status(200).json({
    total_filas: count,
    errores: {
      count: countErr?.message,
      muestra: muestraErr?.message,
      dni: dniErr?.message,
      apellido: apErr?.message,
    },
    muestra_filas: muestra,
    busqueda_dni_31645431: porDni,
    busqueda_ojeda: porApellido,
  });
}
