import { describe, it, expect } from "vitest";
import { fmtDni } from "../utils/formato";

describe("fmtDni", () => {
  it("separa miles con punto", () => {
    expect(fmtDni("27123456")).toBe("27.123.456");
    expect(fmtDni(27123456)).toBe("27.123.456");
  });
  it("ignora puntos y espacios que ya vengan", () => {
    expect(fmtDni("27.123.456")).toBe("27.123.456");
    expect(fmtDni(" 5.123.456 ")).toBe("5.123.456");
  });
  it("vacío, null o sin dígitos -> ''", () => {
    expect(fmtDni("")).toBe("");
    expect(fmtDni(null)).toBe("");
    expect(fmtDni(undefined)).toBe("");
    expect(fmtDni("abc")).toBe("");
  });
});
