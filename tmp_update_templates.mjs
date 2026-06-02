import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://eueqluhhgvukovoyorrw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E'
);

const templates = JSON.parse(readFileSync('./tmp_templates.json', 'utf-8'));

async function run() {
  let ok = 0;
  const failed = [];
  for (const t of templates) {
    const { error } = await supabase
      .from('templates')
      .update({ contenido: t.contenido, variables_json: t.variables_json })
      .eq('slug', t.slug);
    if (error) {
      failed.push({ slug: t.slug, error: error.message });
    } else {
      ok++;
      process.stdout.write('.');
    }
  }
  console.log('\nRESULT:' + JSON.stringify({ updated: ok, failed, total: templates.length }));
}

run();
