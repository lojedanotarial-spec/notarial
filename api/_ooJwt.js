// JWT HS256 mínimo para hablar con OnlyOffice Document Server (sin dependencias).
// OO firma/verifica con HS256 y el secreto compartido OO_JWT_SECRET.
import { createHmac, timingSafeEqual } from "node:crypto";

const b64u = (buf) => Buffer.from(buf).toString("base64url");

export function signOoJwt(payload, secret) {
  if (!secret) throw new Error("OO_JWT_SECRET no configurado");
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(payload));
  const sig  = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

// Devuelve el payload si la firma es válida; si no, null. Nunca tira.
// Solo acepta alg HS256 (rechaza "none" y cualquier otro).
export function verifyOoJwt(token, secret) {
  try {
    if (!secret || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [head, body, sig] = parts;
    const header = JSON.parse(Buffer.from(head, "base64url").toString("utf8"));
    if (header.alg !== "HS256") return null;
    const expected = createHmac("sha256", secret).update(`${head}.${body}`).digest();
    const given = Buffer.from(sig, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload && typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Las keys de documento son "doc-<timestamp>" o ids guardados en la base; nada de "/" ni "..".
export const OO_KEY_RE = /^[A-Za-z0-9_-]{1,100}$/;
