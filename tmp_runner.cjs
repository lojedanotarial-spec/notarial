// Runner: reads JSON from file written by write_data.cjs, then updates Supabase
const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://eueqluhhgvukovoyorrw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E';

function patchTemplate(slug, contenido, variables_json) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ contenido, variables_json });
    const url = new URL(`${SUPABASE_URL}/rest/v1/templates?slug=eq.${encodeURIComponent(slug)}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true });
        } else {
          resolve({ ok: false, status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const templates = JSON.parse(fs.readFileSync('./tmp_templates.json', 'utf-8'));
  let ok = 0;
  const failed = [];
  for (const t of templates) {
    try {
      const result = await patchTemplate(t.slug, t.contenido, t.variables_json);
      if (result.ok) {
        ok++;
        process.stdout.write('.');
      } else {
        failed.push({ slug: t.slug, status: result.status, body: result.body });
      }
    } catch(e) {
      failed.push({ slug: t.slug, error: e.message });
    }
  }
  console.log('\nRESULT: ' + JSON.stringify({ updated: ok, failed, total: templates.length }));
}

main();
