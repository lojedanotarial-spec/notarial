import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://eueqluhhgvukovoyorrw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const templates = JSON.parse(
  readFileSync(join(__dirname, "templates_para_cargar.json"), "utf8")
);

// También cargar los de seis_faltantes.json
const faltantes = JSON.parse(
  readFileSync(join(__dirname, "seis_faltantes.json"), "utf8")
);

const todos = [...templates, ...faltantes];

console.log(`Cargando ${todos.length} templates...`);

let ok = 0, err = 0;

for (const t of todos) {
  if (!t.slug) { console.warn("  ⚠ sin slug, skip"); continue; }

  // Buscar si ya existe por slug
  const { data: existente } = await supabase
    .from("templates")
    .select("id, slug, contenido")
    .eq("slug", t.slug)
    .maybeSingle();

  if (existente) {
    // Solo actualizar si no tiene contenido todavía
    if (existente.contenido && existente.contenido.trim().length > 10) {
      console.log(`  ✓ ${t.slug} — ya tiene contenido, skip`);
      ok++;
      continue;
    }
    // Actualizar contenido y variables_json
    const { error } = await supabase
      .from("templates")
      .update({
        contenido:      t.contenido      || "",
        variables_json: t.variables_json || [],
      })
      .eq("id", existente.id);

    if (error) {
      console.error(`  ✗ ${t.slug} — update error:`, error.message);
      err++;
    } else {
      console.log(`  ↑ ${t.slug} — actualizado`);
      ok++;
    }
  } else {
    // Insertar nuevo
    const { error } = await supabase
      .from("templates")
      .insert({
        slug:           t.slug,
        nombre:         t.nombre         || t.slug.replace(/_/g, " "),
        tipo:           t.tipo           || "escritura",
        familia:        t.familia        || "otros",
        descripcion:    t.descripcion    || "",
        frecuencia:     t.frecuencia     || 0,
        contenido:      t.contenido      || "",
        variables_json: t.variables_json || [],
        registro_id:    null,
        editable:       false,
        visible:        true,
      });

    if (error) {
      console.error(`  ✗ ${t.slug} — insert error:`, error.message);
      err++;
    } else {
      console.log(`  + ${t.slug} — insertado`);
      ok++;
    }
  }
}

console.log(`\nListo: ${ok} ok, ${err} errores`);
