import { describe, it, expect } from "vitest";
import { tools, TEMPLATES_MAP } from "../../api/_scribaTools.js";
import { SYSTEM_PROMPT } from "../../api/_scribaPrompt.js";

describe("Scriba: definiciones", () => {
  it("cada tool tiene nombre único, descripción y esquema de entrada", () => {
    const nombres = tools.map((t) => t.name);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const t of tools) {
      expect(t.description?.length).toBeGreaterThan(10);
      expect(t.input_schema?.type).toBe("object");
    }
  });
  it("los campos required existen en properties", () => {
    for (const t of tools) {
      for (const campo of t.input_schema.required || []) {
        expect(t.input_schema.properties, `${t.name}.${campo}`).toHaveProperty(campo);
      }
    }
  });
  it("TEMPLATES_MAP: todos con id (uuid) y nombre", () => {
    for (const [slug, v] of Object.entries(TEMPLATES_MAP)) {
      expect(v.id, slug).toMatch(/^[0-9a-f-]{36}$/);
      expect(v.nombre, slug).toBeTruthy();
    }
  });
  it("el system prompt está cargado", () => {
    expect(SYSTEM_PROMPT.startsWith("Sos Scriba")).toBe(true);
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(100000);
  });
});
