// Llamada al modelo que identifica un documento a partir de su miniatura. `fetch` se inyecta para probarla sin red.
// Configuración medida el 09/11/26 (specs/documentacion-celular-expediente/plan.md §9): estos modelos PIENSAN antes de
// responder y ese razonamiento cuenta contra max_tokens; con 300 se cortaba el JSON. Con 1000 y effort bajo no falló ninguna
// de 42 imágenes. No incluye nunca la clave en los errores.
import { PROMPT_IDENTIFICAR } from "./_driveIdentificar.js";
import { MODELOS } from "./_modelos.js";

export const MAX_TOKENS_IDENTIFICAR = 1000;
export const TIMEOUT_IA_MS = 25_000;

export class ErrorIA extends Error {
  constructor(motivo, estado) { super(motivo); this.name = "ErrorIA"; this.motivo = motivo; this.estado = estado; }
}

export function crearIA({ apiKey, modelo = MODELOS.identificacion, fetch: f = (...a) => globalThis.fetch(...a), timeoutMs = TIMEOUT_IA_MS } = {}) {
  return {
    modelo,
    // Devuelve { texto, entrada, salida, parada }. Lanza ErrorIA ante cualquier falla (el llamador deja el archivo "sin identificar").
    async consultar(miniaturaBase64) {
      if (!apiKey) throw new ErrorIA("sin_clave");
      const control = new AbortController();
      const reloj = setTimeout(() => control.abort(), timeoutMs);
      let r;
      try {
        r = await f("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: control.signal,
          headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: modelo,
            max_tokens: MAX_TOKENS_IDENTIFICAR,
            output_config: { effort: "low" },
            messages: [{ role: "user", content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: miniaturaBase64 } },
              { type: "text", text: PROMPT_IDENTIFICAR },
            ] }],
          }),
        });
      } catch (e) {
        throw new ErrorIA(e?.name === "AbortError" ? "timeout" : "red");
      } finally {
        clearTimeout(reloj);
      }
      let j = null;
      try { j = await r.json(); } catch { /* sin cuerpo */ }
      if (!r.ok) throw new ErrorIA(r.status === 429 || r.status === 529 ? "saturada" : "api", r.status);
      return {
        texto: (j?.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""),
        entrada: j?.usage?.input_tokens ?? null,
        salida: j?.usage?.output_tokens ?? null,
        parada: j?.stop_reason ?? null,
      };
    },
  };
}
