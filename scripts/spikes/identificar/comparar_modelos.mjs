// TB.1 (S2): pasa cada imagen de fotos_prueba/ por uno o más modelos con el PROMPT REAL de producción
// (api/_driveIdentificar.js), con la miniatura reducida (≤ 1000 px, JPEG) como la armaría el navegador, y compara contra la
// respuesta correcta (fotos_prueba/verdad.json). Mide acierto por criterio, tokens y tiempo.
// Uso: node comparar_modelos.mjs [modelo1,modelo2] [ladoMaximo] [calidadJpeg] [maxTokens] [effort]
//      (por defecto: claude-haiku-5-5,claude-sonnet-5-5 1000 70 1000 sin effort)
// Las imágenes son de ejemplo (ejemplares oficiales y documentos inventados): no hay datos de personas reales.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve("../../../fotos_prueba");
const { PROMPT_IDENTIFICAR, normalizarIdentificacion } = await import(pathToFileURL(path.resolve("../../../api/_driveIdentificar.js")).href);

const env = {};
for (const l of fs.readFileSync(path.resolve("../../.env"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
if (!env.ANTHROPIC_API_KEY) { console.error("Falta ANTHROPIC_API_KEY en scripts/.env"); process.exit(1); }

const MODELOS = (process.argv[2] || "claude-haiku-5-5,claude-sonnet-5-5").split(",");
const LADO = Number(process.argv[3] || 1000);
const CALIDAD = Number(process.argv[4] || 70);
const MAX_TOKENS = Number(process.argv[5] || 1000);
const EFFORT = process.argv[6] || "";
const verdad = JSON.parse(fs.readFileSync(path.join(RAIZ, "verdad.json"), "utf8"));
// Fotos REALES de Lucas (solo en su equipo, carpeta ignorada por git): si existe verdad_reales.json se suman al conjunto.
const archivoReales = path.join(RAIZ, "verdad_reales.json");
if (fs.existsSync(archivoReales)) Object.assign(verdad, JSON.parse(fs.readFileSync(archivoReales, "utf8")));

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

async function miniatura(ruta) {
  const buf = await sharp(ruta).rotate().resize({ width: LADO, height: LADO, fit: "inside", withoutEnlargement: true }).jpeg({ quality: CALIDAD }).toBuffer();
  return buf;
}

async function preguntar(modelo, jpeg) {
  const t0 = Date.now();
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: modelo, max_tokens: MAX_TOKENS, ...(EFFORT ? { output_config: { effort: EFFORT } } : {}),
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
        { type: "text", text: PROMPT_IDENTIFICAR },
      ] }],
    }),
  });
  const ms = Date.now() - t0;
  const j = await r.json();
  if (!r.ok) return { error: `${r.status} ${j?.error?.message || ""}`.slice(0, 160), ms };
  return { texto: (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""), entrada: j.usage?.input_tokens, salida: j.usage?.output_tokens, ms, stop: j.stop_reason };
}

// Qué se esperaba vs qué salió. Devuelve los criterios que fallaron (lista vacía = acierto total).
function evaluar(esperado, resp) {
  if (resp.error) return ["error_api"];
  const n = normalizarIdentificacion(resp.texto);
  if (esperado.sin_identificar) return n.ok ? ["inventó_algo"] : [];
  if (!n.ok) return esperado.aceptar_sin_identificar ? [] : [`sin_identificar:${n.motivo}`];
  const i = n.ident, fallas = [];
  if (esperado.aceptar_sin_identificar) return i.tipo === "otro" ? [] : ["tipo"];
  if (i.tipo !== esperado.tipo) fallas.push(`tipo(${i.tipo})`);
  if (esperado.lado && !esperado.lado_libre && i.lado !== esperado.lado) fallas.push(`lado(${i.lado})`);
  if (esperado.pagina && i.pagina !== esperado.pagina) fallas.push(`pagina(${i.pagina})`);
  if (esperado.paginas_total && i.paginas_total !== esperado.paginas_total) fallas.push(`total(${i.paginas_total})`);
  if (esperado.sin_persona && (i.apellido || i.nombre)) fallas.push(`persona_de_mas(${i.apellido} ${i.nombre})`);
  if (esperado.apellido && norm(i.apellido) !== norm(esperado.apellido)) fallas.push(`apellido(${i.apellido})`);
  if (esperado.nombre && norm(i.nombre) !== norm(esperado.nombre)) fallas.push(`nombre(${i.nombre})`);
  if (esperado.descripcion_contiene && !norm(i.descripcion).includes(norm(esperado.descripcion_contiene))) fallas.push(`descripcion(${i.descripcion})`);
  return fallas;
}

async function enLotes(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

const rutas = Object.keys(verdad).filter((r) => !process.env.SOLO || r.includes(process.env.SOLO));
console.log(`${rutas.length} imágenes · modelos: ${MODELOS.join(", ")} · miniatura ≤ ${LADO}px JPEG q${CALIDAD}\n`);
const todos = {};
for (const modelo of MODELOS) {
  const filas = await enLotes(rutas, 4, async (rel) => {
    const jpeg = await miniatura(path.join(RAIZ, rel));
    const resp = await preguntar(modelo, jpeg);
    const fallas = evaluar(verdad[rel], resp);
    return { rel, bytes: jpeg.length, ...resp, fallas };
  });
  todos[modelo] = filas;
}

// ── Resumen ──────────────────────────────────────────────────────────────────
console.log("Imagen".padEnd(46), MODELOS.map((m) => m.replace("claude-", "").padEnd(34)).join(""));
for (const rel of rutas) {
  const celdas = MODELOS.map((m) => { const f = todos[m].find((x) => x.rel === rel); return (f.fallas.length ? "✗ " + f.fallas.join(" ") : "✓").slice(0, 32).padEnd(34); });
  console.log(rel.replace(/\.jpg$/, "").padEnd(46), celdas.join(""));
}
console.log("");
for (const m of MODELOS) {
  const f = todos[m];
  const ok = f.filter((x) => x.fallas.length === 0).length;
  const conUso = f.filter((x) => x.entrada);
  const prom = (k) => (conUso.reduce((a, x) => a + x[k], 0) / Math.max(1, conUso.length)).toFixed(0);
  const ms = f.map((x) => x.ms).sort((a, b) => a - b);
  const falla = (clave) => f.filter((x) => x.fallas.some((z) => z.startsWith(clave))).length;
  console.log(`${m}: ${ok}/${f.length} aciertos totales · tokens por foto: ${prom("entrada")} entrada + ${prom("salida")} salida · tiempo mediano ${ms[Math.floor(ms.length / 2)]} ms (máx ${ms.at(-1)})`);
  console.log(`   fallas → tipo ${falla("tipo")} · lado ${falla("lado")} · página ${falla("pagina") + falla("total")} · persona ${falla("apellido") + falla("nombre") + falla("persona_de_mas")} · sin identificar de más ${falla("sin_identificar")} · inventó ${falla("inventó")} · API ${falla("error_api")}`);
}
const salida = path.join(RAIZ, `resultados_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}_${LADO}px_${EFFORT || "std"}.json`);
fs.writeFileSync(salida, JSON.stringify(todos, null, 2));
console.log(`\nDetalle completo: ${path.relative(path.resolve("../../.."), salida)}`);
