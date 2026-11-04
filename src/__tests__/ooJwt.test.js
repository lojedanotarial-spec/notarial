import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { signOoJwt, verifyOoJwt, OO_KEY_RE } from "../../api/_ooJwt.js";
import { bodyVerificado } from "../../api/oo-callback.js";
import { validarConfig } from "../../api/oo-config.js";

const SECRET = "secreto-de-prueba";

describe("_ooJwt", () => {
  it("firma y verifica un payload", () => {
    const t = signOoJwt({ a: 1 }, SECRET);
    expect(verifyOoJwt(t, SECRET)).toEqual({ a: 1 });
  });
  it("rechaza secreto distinto", () => {
    expect(verifyOoJwt(signOoJwt({ a: 1 }, SECRET), "otro")).toBeNull();
  });
  it("rechaza payload adulterado", () => {
    const [h, , s] = signOoJwt({ status: 1 }, SECRET).split(".");
    const evil = Buffer.from(JSON.stringify({ status: 2 })).toString("base64url");
    expect(verifyOoJwt(`${h}.${evil}.${s}`, SECRET)).toBeNull();
  });
  it('rechaza alg "none" y tokens mal formados', () => {
    const h = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const b = Buffer.from(JSON.stringify({ status: 2 })).toString("base64url");
    expect(verifyOoJwt(`${h}.${b}.`, SECRET)).toBeNull();
    expect(verifyOoJwt("basura", SECRET)).toBeNull();
    expect(verifyOoJwt(undefined, SECRET)).toBeNull();
    expect(verifyOoJwt(signOoJwt({ a: 1 }, SECRET), "")).toBeNull();
  });
  it("rechaza tokens vencidos", () => {
    expect(verifyOoJwt(signOoJwt({ exp: 1 }, SECRET), SECRET)).toBeNull();
  });
  it("no acepta firmas con otro algoritmo aunque coincida el HMAC de otro hash", () => {
    const h = Buffer.from(JSON.stringify({ alg: "HS512", typ: "JWT" })).toString("base64url");
    const b = Buffer.from("{}").toString("base64url");
    const s = createHmac("sha512", SECRET).update(`${h}.${b}`).digest("base64url");
    expect(verifyOoJwt(`${h}.${b}.${s}`, SECRET)).toBeNull();
  });
  it("valida el formato de key", () => {
    expect(OO_KEY_RE.test("doc-1730000000000")).toBe(true);
    expect(OO_KEY_RE.test("../x")).toBe(false);
    expect(OO_KEY_RE.test("a/b")).toBe(false);
    expect(OO_KEY_RE.test("")).toBe(false);
  });
});

describe("oo-callback · bodyVerificado", () => {
  const body = { status: 2, url: "https://onlyoffice.notarial.lat/cache/x" };
  it("acepta el token del header (payload anidado como manda OO)", () => {
    const req = { headers: { authorization: `Bearer ${signOoJwt({ payload: body }, SECRET)}` }, body };
    expect(bodyVerificado(req, SECRET)).toEqual(body);
  });
  it("acepta el token en el body", () => {
    const req = { headers: {}, body: { token: signOoJwt(body, SECRET) } };
    expect(bodyVerificado(req, SECRET)).toEqual(body);
  });
  it("rechaza una request sin token (el hueco original)", () => {
    expect(bodyVerificado({ headers: {}, body }, SECRET)).toBeNull();
  });
  it("rechaza token firmado con otro secreto", () => {
    const req = { headers: { authorization: `Bearer ${signOoJwt({ payload: body }, "otro")}` }, body };
    expect(bodyVerificado(req, SECRET)).toBeNull();
  });
});

describe("oo-config · validarConfig", () => {
  const key = "doc-123";
  const ok = () => ({
    document: { key },
    editorConfig: { callbackUrl: `https://notarial.lat/api/oo-callback?key=${key}` },
  });
  it("acepta una config legítima", () => expect(validarConfig(ok(), "notarial.lat")).toBeNull());
  it("ignora la url que mande el cliente (la arma el servidor, firmada)", () => {
    const c = ok(); c.document.url = "https://evil.example/x.docx";
    expect(validarConfig(c, "notarial.lat")).toBeNull();
  });
  it("rechaza callback a otro host o a otra ruta", () => {
    let c = ok(); c.editorConfig.callbackUrl = `https://evil.example/api/oo-callback?key=${key}`;
    expect(validarConfig(c, "notarial.lat")).toMatch(/host/);
    c = ok(); c.editorConfig.callbackUrl = `https://notarial.lat/api/otra?key=${key}`;
    expect(validarConfig(c, "notarial.lat")).toMatch(/callback/);
  });
  it("rechaza callback con key distinta a la del documento", () => {
    const c = ok(); c.editorConfig.callbackUrl = "https://notarial.lat/api/oo-callback?key=otro";
    expect(validarConfig(c, "notarial.lat")).toMatch(/key/);
  });
  it("rechaza keys con path traversal", () => {
    const c = ok(); c.document.key = "../x";
    expect(validarConfig(c, "notarial.lat")).toMatch(/key/);
  });
});
