// TB.0 (a): baja los ejemplares OFICIALES del DNI argentino publicados en Wikimedia Commons (Gobierno de Argentina, licencia
// CC BY 4.0; el digital de Mi Argentina CC BY-SA 4.0) a fotos_prueba/oficiales/ (carpeta ignorada por git) y arma el README de
// atribución. Son imágenes de muestra con datos de ejemplo, no de personas reales.
import fs from "node:fs";
import path from "node:path";

const DESTINO = path.resolve("../../../fotos_prueba/oficiales");
fs.mkdirSync(DESTINO, { recursive: true });
const UA = { "User-Agent": "Notarial-research/1.0 (lojeda.notarial@gmail.com)" };

const ARCHIVOS = [
  ["File:DNI Argentina 2020 Frente.jpg", "dni_2020_frente"],
  ["File:DNI Argentina 2020 Reverso 01.jpg", "dni_2020_reverso"],
  ["File:Biometric Argentine DNI for Citizens-Foreigners.png", "dni_2023_frente"],
  ["File:Biometric Argentine DNI for Citizens-Foreigners back.png", "dni_2023_reverso"],
  ["File:Mi Argentina-DNI Digital 2026.jpg", "dni_digital_2026"],
  ["File:Argentine Idenentity Card-Anexo-3-DNI Extranjeros.jpg", "dni_extranjeros_anexo3"],
];

const q = new URLSearchParams({ action: "query", titles: ARCHIVOS.map((a) => a[0]).join("|"), prop: "imageinfo", iiprop: "url|extmetadata|mime", format: "json" });
const meta = await (await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, { headers: UA })).json();
const porTitulo = Object.fromEntries(Object.values(meta.query.pages).map((p) => [p.title, p]));

const atribucion = ["# Ejemplares oficiales del DNI (Wikimedia Commons)", "", "Bajados el 09/11/26 para pruebas locales. NO redistribuir sin respetar la licencia de cada uno.", ""];
for (const [titulo, nombre] of ARCHIVOS) {
  const p = porTitulo[titulo];
  const info = p?.imageinfo?.[0];
  if (!info) { console.log("no encontrado:", titulo); continue; }
  const ext = path.extname(new URL(info.url).pathname) || ".jpg";
  const destino = path.join(DESTINO, `${nombre}${ext}`);
  const buf = Buffer.from(await (await fetch(info.url, { headers: UA })).arrayBuffer());
  fs.writeFileSync(destino, buf);
  const m = info.extmetadata || {};
  const autor = (m.Artist?.value || "").replace(/<[^>]+>/g, "").trim();
  atribucion.push(`- **${nombre}${ext}** — ${titulo.replace("File:", "")} — ${m.LicenseShortName?.value || "?"} — ${autor} — https://commons.wikimedia.org/wiki/${encodeURIComponent(titulo.replace(/ /g, "_"))}`);
  console.log(`${nombre}${ext}: ${(buf.length / 1024).toFixed(0)} KB`);
}
fs.writeFileSync(path.join(DESTINO, "README.md"), atribucion.join("\n") + "\n");
