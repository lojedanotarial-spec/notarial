// Prueba del análisis EN LOTE (todas las fotos de una tanda juntas, para emparejar caras entre sí). Usa el prompt y las reglas REALES
// de producción (api/_driveLote.js) y compara contra la respuesta correcta. Mide: acierto por imagen, emparejamientos correctos,
// emparejamientos FALSOS (lo más grave: pegarle el nombre de otra persona) y tokens/tiempo.
// Uso: node comparar_lote.mjs [modelo1,modelo2] [repeticiones] [ladoMaximo]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve("../../../fotos_prueba");
const { armarPromptLote, normalizarLote, aplicarGrupos } = await import(pathToFileURL(path.resolve("../../../api/_driveLote.js")).href);
const { armarNombreArchivo, extensionDe } = await import(pathToFileURL(path.resolve("../../../api/_driveIdentificar.js")).href);

const env = {};
for (const l of fs.readFileSync(path.resolve("../../.env"), "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const MODELOS = (process.argv[2] || "claude-haiku-5-5").split(",");
const REPETIR = Number(process.argv[3] || 1);
const LADO = Number(process.argv[4] || 1000);

const verdad = { ...JSON.parse(fs.readFileSync(path.join(RAIZ, "verdad.json"), "utf8")), ...JSON.parse(fs.readFileSync(path.join(RAIZ, "verdad_reales.json"), "utf8")) };
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const TANDAS = [
  { nombre: "REAL: DNI + licencia de Lucas (4 fotos, desordenadas)",
    imagenes: ["reales/lote_3.jpg", "reales/lote_5.jpg", "reales/lote_2.jpg", "reales/lote_4.jpg"],
    grupos: [["reales/lote_2.jpg", "reales/lote_5.jpg"], ["reales/lote_3.jpg", "reales/lote_4.jpg"]] },
  { nombre: "SINTÉTICA: 10 mezcladas, con dos DNI de personas DISTINTAS que NO deben emparejarse",
    imagenes: ["sinteticos/tarjeta_frente__normal.jpg", "oficiales/dni_2023_reverso__normal.jpg", "sinteticos/partida__normal.jpg", "oficiales/dni_2020_reverso__normal.jpg",
      "sinteticos/poder_2__normal.jpg", "sinteticos/tarjeta_dorso__inclinada_sombra.jpg", "oficiales/dni_2020_frente__normal.jpg", "sinteticos/poder_1__reflejo_borrosa.jpg",
      "oficiales/dni_2023_frente__normal.jpg", "sinteticos/ticket__normal.jpg"],
    grupos: [["sinteticos/tarjeta_frente__normal.jpg", "sinteticos/tarjeta_dorso__inclinada_sombra.jpg"], ["oficiales/dni_2020_frente__normal.jpg", "oficiales/dni_2020_reverso__normal.jpg"],
      ["sinteticos/poder_1__reflejo_borrosa.jpg", "sinteticos/poder_2__normal.jpg"]] },
];

async function consultar(modelo, jpegs) {
  const n = jpegs.length;
  const contenido = [];
  jpegs.forEach((j, i) => { contenido.push({ type: "text", text: `Imagen ${i + 1}:` }); contenido.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: j.toString("base64") } }); });
  contenido.push({ type: "text", text: armarPromptLote(n) });
  const t0 = Date.now();
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: modelo, max_tokens: 2000 + 400 * n, output_config: { effort: "low" }, messages: [{ role: "user", content: contenido }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${j?.error?.message}`);
  return { texto: j.content.filter((b) => b.type === "text").map((b) => b.text).join(""), entrada: j.usage.input_tokens, salida: j.usage.output_tokens, parada: j.stop_reason, ms: Date.now() - t0 };
}

const pares = (grupos) => new Set(grupos.flatMap((g) => g.flatMap((a, i) => g.slice(i + 1).map((b) => [a, b].sort().join(" ~ ")))));

function evaluarImagen(esperado, item) {
  if (!item.ok) return [`sin_identificar:${item.motivo}`];
  const i = item.ident, f = [];
  if (i.tipo !== esperado.tipo) f.push(`tipo(${i.tipo})`);
  if (esperado.lado && !esperado.lado_libre && i.lado !== esperado.lado) f.push(`lado(${i.lado})`);
  if (esperado.pagina && i.pagina !== esperado.pagina) f.push(`pagina(${i.pagina})`);
  if (esperado.apellido && norm(i.apellido) !== norm(esperado.apellido)) f.push(`apellido(${i.apellido || "vacío"})`);
  if (esperado.nombre && norm(i.nombre) !== norm(esperado.nombre)) f.push(`nombre(${i.nombre || "vacío"})`);
  if (esperado.descripcion_contiene && !norm(i.descripcion).includes(norm(esperado.descripcion_contiene))) f.push(`desc(${i.descripcion})`);
  return f;
}

for (const modelo of MODELOS) {
  for (const tanda of TANDAS) {
    for (let rep = 1; rep <= REPETIR; rep++) {
      const jpegs = await Promise.all(tanda.imagenes.map((rel) => sharp(path.join(RAIZ, rel)).rotate().resize({ width: LADO, height: LADO, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer()));
      const resp = await consultar(modelo, jpegs);
      const crudo = normalizarLote(resp.texto, tanda.imagenes.length);
      const final = aplicarGrupos(crudo);
      console.log(`\n=== ${modelo} · ${tanda.nombre} · corrida ${rep} · ${resp.entrada}+${resp.salida} tokens · ${(resp.ms / 1000).toFixed(1)} s · ${resp.parada}`);
      let bien = 0;
      tanda.imagenes.forEach((rel, i) => {
        const fallas = evaluarImagen(verdad[rel], final[i]);
        if (!fallas.length) bien++;
        const nombre = final[i].ok ? armarNombreArchivo(final[i].ident, extensionDe(rel, "image/jpeg")) : "(sin identificar)";
        console.log(`  ${String(i + 1).padStart(2)}. ${rel.split("/").pop().padEnd(42)} ${fallas.length ? "✗ " + fallas.join(" ") : "✓"}   → ${nombre}   [grupo ${crudo[i].ok ? crudo[i].grupo : "-"}, ${crudo[i].ok ? crudo[i].evidencia : "-"}, ${final[i].agrupado ? "agrupado" : "solo"}]`);
      });
      const verdaderos = pares(tanda.grupos);
      const modeloPares = pares(Object.values(Object.groupBy(final.map((it, i) => ({ ...it, rel: tanda.imagenes[i] })).filter((it) => it.ok && it.agrupado), (it) => it.grupo)).map((g) => g.map((x) => x.rel)));
      const acertados = [...modeloPares].filter((p) => verdaderos.has(p)).length;
      const falsos = [...modeloPares].filter((p) => !verdaderos.has(p));
      const faltan = [...verdaderos].filter((p) => !modeloPares.has(p));
      console.log(`  → ${bien}/${tanda.imagenes.length} imágenes bien · emparejamientos: ${acertados}/${verdaderos.size} correctos · FALSOS: ${falsos.length}${falsos.length ? " " + JSON.stringify(falsos) : ""} · sin emparejar: ${faltan.length}`);
    }
  }
}
