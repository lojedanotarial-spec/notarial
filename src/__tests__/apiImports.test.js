// El backend (Vercel, Node ESM) exige extensión .js en los imports relativos; el navegador y Vitest
// no. Esto rompió Scriba en producción el 04/11/26 (import "./formato" sin .js en un archivo de src/
// que también carga api/scriba.js). Este test sigue los imports desde cada api/*.js y los valida.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "../..");
const IMPORT_RELATIVO = /(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+)["']/g;

function recorrer(archivo, vistos = new Set(), problemas = []) {
  if (vistos.has(archivo)) return problemas;
  vistos.add(archivo);
  const codigo = fs.readFileSync(archivo, "utf8");
  for (const m of codigo.matchAll(IMPORT_RELATIVO)) {
    const spec = m[1];
    if (!/\.(js|mjs|cjs|json)$/.test(spec)) {
      problemas.push(`${path.relative(RAIZ, archivo)} importa "${spec}" sin extensión`);
      continue;
    }
    recorrer(path.resolve(path.dirname(archivo), spec), vistos, problemas);
  }
  return problemas;
}

describe("imports alcanzables desde api/ (Node ESM)", () => {
  const entradas = [
    ...fs.readdirSync(path.join(RAIZ, "api")).filter((f) => f.endsWith(".js")).map((f) => path.join(RAIZ, "api", f)),
    ...fs.readdirSync(path.join(RAIZ, "api/cron")).filter((f) => f.endsWith(".js")).map((f) => path.join(RAIZ, "api/cron", f)),
  ];
  it("todos los imports relativos llevan extensión y apuntan a archivos que existen", () => {
    const problemas = [];
    const vistos = new Set();
    for (const e of entradas) recorrer(e, vistos, problemas);
    expect(problemas).toEqual([]);
  });
});
