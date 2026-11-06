// Drive de la escribanía: lógica pura (api/_drive.js). Spec: specs/drive-escribania/.
import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import {
  MAX_BYTES_ARCHIVO, ENLACE_VENCE_MS, TIPOS_ARCHIVO, SCOPES_GOOGLE,
  generarCodigo, hashCodigo,
  calcularVencimientoEnlace, motivoEnlaceInvalido, enlaceVigente,
  cifrar, descifrar, firmarState, verificarState,
  validarArchivo, nombreCarpetaExpediente, esPrevisualizable,
  clasificarErrorGoogle, mensajeParaUsuario,
  estadoCuota, armarAuditoria, armarUrlAutorizacion, urlDeRetorno,
  resumenConexion, esAdmin, registroDelUsuario,
} from "../../api/_drive.js";

const MB = 1024 * 1024;
const CLAVE = randomBytes(32).toString("base64");
const T0 = Date.UTC(2026, 10, 6, 15, 0, 0);

describe("códigos de enlace", () => {
  it("genera códigos distintos y largos, y solo guarda el hash", () => {
    const a = generarCodigo(), b = generarCodigo();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(hashCodigo(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCodigo(a)).not.toContain(a);
    expect(hashCodigo(a)).toBe(hashCodigo(a));
    expect(hashCodigo(a)).not.toBe(hashCodigo(b));
  });
});

describe("vigencia del enlace de conexión", () => {
  it("vence a las 24 horas", () => {
    expect(ENLACE_VENCE_MS).toBe(24 * 60 * 60 * 1000);
    expect(new Date(calcularVencimientoEnlace(T0)).getTime()).toBe(T0 + ENLACE_VENCE_MS);
  });
  const vigente = { expira_en: new Date(T0 + ENLACE_VENCE_MS).toISOString(), usado_en: null };
  it("sirve mientras no venció ni se usó", () => {
    expect(enlaceVigente(vigente, T0 + 1000)).toBe(true);
    expect(motivoEnlaceInvalido(vigente, T0 + 1000)).toBe(null);
  });
  it("no sirve vencido, usado o inexistente, y dice por qué", () => {
    expect(enlaceVigente(vigente, T0 + ENLACE_VENCE_MS + 1)).toBe(false);
    expect(motivoEnlaceInvalido(vigente, T0 + ENLACE_VENCE_MS + 1)).toBe("vencido");
    const usado = { ...vigente, usado_en: new Date(T0).toISOString() };
    expect(enlaceVigente(usado, T0 + 1)).toBe(false);
    expect(motivoEnlaceInvalido(usado, T0 + 1)).toBe("usado");
    expect(enlaceVigente(null, T0)).toBe(false);
    expect(motivoEnlaceInvalido(null, T0)).toBe("inexistente");
  });
  it("usado tiene prioridad sobre vencido", () => {
    const e = { expira_en: new Date(T0 - 1000).toISOString(), usado_en: new Date(T0 - 5000).toISOString() };
    expect(motivoEnlaceInvalido(e, T0)).toBe("usado");
  });
});

describe("cifrado del token de Google", () => {
  it("ida y vuelta", () => {
    const token = "1//0gAbCdEf-refresh-token-de-prueba";
    const c = cifrar(token, CLAVE);
    expect(c.startsWith("v1.")).toBe(true);
    expect(c).not.toContain(token);
    expect(descifrar(c, CLAVE)).toBe(token);
  });
  it("cifra distinto cada vez (iv aleatorio)", () => {
    expect(cifrar("x", CLAVE)).not.toBe(cifrar("x", CLAVE));
  });
  it("rechaza datos alterados", () => {
    const c = cifrar("secreto", CLAVE);
    const partes = c.split(".");
    partes[3] = Buffer.from("alterado").toString("base64url");
    expect(() => descifrar(partes.join("."), CLAVE)).toThrow();
  });
  it("rechaza otra clave, versión desconocida y basura", () => {
    const c = cifrar("secreto", CLAVE);
    expect(() => descifrar(c, randomBytes(32).toString("base64"))).toThrow();
    expect(() => descifrar(c.replace(/^v1\./, "v9."), CLAVE)).toThrow();
    expect(() => descifrar("basura", CLAVE)).toThrow();
    expect(() => descifrar("", CLAVE)).toThrow();
  });
  it("exige una clave de 32 bytes", () => {
    expect(() => cifrar("x", "")).toThrow();
    expect(() => cifrar("x", Buffer.from("corta").toString("base64"))).toThrow();
  });
});

describe("state de OAuth (anti-CSRF)", () => {
  const payload = { enlace: "id-123", exp: T0 + 10 * 60_000 };
  it("firma y verifica", () => {
    const s = firmarState(payload, CLAVE);
    expect(verificarState(s, CLAVE, T0)).toEqual(payload);
  });
  it("rechaza vencido, alterado, de otra clave y vacío", () => {
    const s = firmarState(payload, CLAVE);
    expect(verificarState(s, CLAVE, payload.exp + 1)).toBe(null);
    const [cuerpo, firma] = s.split(".");
    const otro = Buffer.from(JSON.stringify({ enlace: "otro", exp: payload.exp })).toString("base64url");
    expect(verificarState(`${otro}.${firma}`, CLAVE, T0)).toBe(null);
    expect(verificarState(`${cuerpo}.AAAA`, CLAVE, T0)).toBe(null);
    expect(verificarState(s, randomBytes(32).toString("base64"), T0)).toBe(null);
    expect(verificarState("", CLAVE, T0)).toBe(null);
    expect(verificarState(null, CLAVE, T0)).toBe(null);
    expect(verificarState("sin-punto", CLAVE, T0)).toBe(null);
  });
});

describe("validación de archivos", () => {
  const ok = { nombre: "dni frente.jpg", mime: "image/jpeg", tamano: 3 * MB, tipo: "dni" };
  it("acepta un archivo normal", () => {
    const r = validarArchivo(ok);
    expect(r.ok).toBe(true);
    expect(r.nombre).toBe("dni frente.jpg");
    expect(r.tipo).toBe("dni");
  });
  it("el límite es de 25 MB: justo en el límite sí, un byte más no", () => {
    expect(MAX_BYTES_ARCHIVO).toBe(25 * MB);
    expect(validarArchivo({ ...ok, tamano: 25 * MB }).ok).toBe(true);
    const r = validarArchivo({ ...ok, tamano: 25 * MB + 1 });
    expect(r.ok).toBe(false);
    expect(r.codigo).toBe("muy_grande");
    expect(r.mensaje).toMatch(/25 MB/);
  });
  it("rechaza tamaño vacío o inválido", () => {
    for (const tamano of [0, -5, NaN, undefined, "grande", 1.5]) {
      const r = validarArchivo({ ...ok, tamano });
      expect(r.ok).toBe(false);
      expect(r.codigo).toBe("tamano_invalido");
    }
  });
  it("limpia el nombre: sin rutas, sin caracteres de control, largo acotado, nunca vacío", () => {
    expect(validarArchivo({ ...ok, nombre: "../../etc/passwd" }).nombre).toBe("passwd");
    expect(validarArchivo({ ...ok, nombre: "C:\\Users\\x\\foto.png" }).nombre).toBe("foto.png");
    expect(validarArchivo({ ...ok, nombre: "a\u0000b\nc.pdf" }).nombre).toBe("abc.pdf");
    expect(validarArchivo({ ...ok, nombre: "x".repeat(400) + ".pdf" }).nombre.length).toBeLessThanOrEqual(150);
    expect(validarArchivo({ ...ok, nombre: "   " }).nombre).toBe("archivo");
    expect(validarArchivo({ ...ok, nombre: undefined }).nombre).toBe("archivo");
  });
  it("el tipo desconocido pasa a 'otro'; los conocidos se respetan", () => {
    for (const t of TIPOS_ARCHIVO) expect(validarArchivo({ ...ok, tipo: t }).tipo).toBe(t);
    expect(validarArchivo({ ...ok, tipo: "cualquier-cosa" }).tipo).toBe("otro");
    expect(validarArchivo({ ...ok, tipo: undefined }).tipo).toBe("otro");
  });
  it("el mime vacío queda como binario genérico", () => {
    expect(validarArchivo({ ...ok, mime: "" }).mime).toBe("application/octet-stream");
    expect(validarArchivo({ ...ok, mime: undefined }).mime).toBe("application/octet-stream");
  });
  it("solo se previsualizan imágenes y PDF; el resto se descarga (evita ejecutar HTML subido)", () => {
    for (const m of ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]) expect(esPrevisualizable(m)).toBe(true);
    for (const m of ["text/html", "image/svg+xml", "application/javascript", "application/octet-stream", "", undefined]) expect(esPrevisualizable(m)).toBe(false);
  });
});

describe("nombre de la carpeta del expediente", () => {
  it("lleva el nombre y un trozo del id", () => {
    expect(nombreCarpetaExpediente({ id: "3f2a9c10-aaaa-bbbb-cccc-1234567890ab", nombre: "Compraventa García" }))
      .toBe("Compraventa García (3f2a9c10)");
  });
  it("saca caracteres problemáticos y acota el largo", () => {
    const n = nombreCarpetaExpediente({ id: "3f2a9c10-aaaa", nombre: "A/B\\C:D*E?" });
    expect(n).not.toMatch(/[\\/:*?"<>|]/);
    expect(nombreCarpetaExpediente({ id: "3f2a9c10-aaaa", nombre: "x".repeat(300) }).length).toBeLessThanOrEqual(120);
    expect(nombreCarpetaExpediente({ id: "3f2a9c10-aaaa", nombre: "" })).toBe("Expediente (3f2a9c10)");
  });
});

describe("errores de Google", () => {
  it("invalid_grant = conexión rota por revocación", () => {
    expect(clasificarErrorGoogle({ status: 400, error: "invalid_grant" })).toEqual({ tipo: "rota", motivo: "revocada" });
  });
  it("invalid_client es un problema de configuración nuestro: NO marca ninguna conexión como rota", () => {
    expect(clasificarErrorGoogle({ status: 401, error: "invalid_client" })).toEqual({ tipo: "configuracion" });
  });
  it("401 después de renovar también deja la conexión rota", () => {
    expect(clasificarErrorGoogle({ status: 401 }).tipo).toBe("rota");
  });
  it("sin espacio", () => {
    expect(clasificarErrorGoogle({ status: 403, reason: "storageQuotaExceeded" }).tipo).toBe("sin_espacio");
  });
  it("límite de uso y 429 son reintentables", () => {
    expect(clasificarErrorGoogle({ status: 403, reason: "userRateLimitExceeded" }).tipo).toBe("limite");
    expect(clasificarErrorGoogle({ status: 429 }).tipo).toBe("limite");
  });
  it("404 = archivo ausente; el resto es genérico", () => {
    expect(clasificarErrorGoogle({ status: 404 }).tipo).toBe("no_encontrado");
    expect(clasificarErrorGoogle({ status: 500 }).tipo).toBe("otro");
    expect(clasificarErrorGoogle({}).tipo).toBe("otro");
    expect(clasificarErrorGoogle(null).tipo).toBe("otro");
  });
  it("los mensajes al usuario son claros y nunca técnicos", () => {
    for (const t of ["rota", "sin_espacio", "limite", "no_encontrado", "no_conectado", "otro", "inexistente-xyz"]) {
      const m = mensajeParaUsuario(t);
      expect(m.length).toBeGreaterThan(10);
      expect(m).not.toMatch(/invalid_grant|oauth|token|google api|storageQuota|\b[45]\d\d\b|undefined/i);
    }
    expect(mensajeParaUsuario("rota")).toBe("El Drive de la escribanía no está disponible. Avisale a quien administra Notarial.");
    expect(mensajeParaUsuario("rota")).not.toMatch(/iniciar sesión con Google/i);
    expect(mensajeParaUsuario("no_conectado")).toMatch(/todavía no conectó/);
  });
});

describe("cuota del Drive", () => {
  it("advierte desde el 80 %", () => {
    expect(estadoCuota({ usada: 79, total: 100 })).toMatchObject({ advertencia: false, llena: false });
    expect(estadoCuota({ usada: 80, total: 100 })).toMatchObject({ advertencia: true, llena: false, porcentaje: 80 });
    expect(estadoCuota({ usada: 100, total: 100 })).toMatchObject({ advertencia: true, llena: true });
  });
  it("acepta números como texto (así los devuelve Google) y datos faltantes", () => {
    expect(estadoCuota({ usada: "85", total: "100" }).advertencia).toBe(true);
    expect(estadoCuota({ usada: 5, total: null })).toMatchObject({ advertencia: false, llena: false, porcentaje: null });
    expect(estadoCuota(null)).toMatchObject({ advertencia: false, llena: false, porcentaje: null });
  });
});

describe("auditoría", () => {
  it("arma la fila y limita el detalle", () => {
    const f = armarAuditoria({ registro: "853", usuarioId: "u1", accion: "subir", expedienteId: "e1", archivoId: "a1", detalle: { nombre: "x".repeat(5000) } });
    expect(f).toMatchObject({ registro_numero: "853", usuario_id: "u1", accion: "subir", expediente_id: "e1", archivo_id: "a1" });
    expect(JSON.stringify(f.detalle).length).toBeLessThanOrEqual(1100);
  });
  it("rechaza acciones desconocidas y falta de registro", () => {
    expect(() => armarAuditoria({ registro: "853", accion: "hackear" })).toThrow();
    expect(() => armarAuditoria({ accion: "ver" })).toThrow();
  });
  it("cubre lo que pide el spec", () => {
    for (const a of ["conectar", "desconectar", "subir", "ver", "descargar", "borrar", "conexion_rota"])
      expect(() => armarAuditoria({ registro: "853", accion: a })).not.toThrow();
  });
});

describe("autorización con Google", () => {
  const url = new URL(armarUrlAutorizacion({ clientId: "cid", redirectUri: "https://notarial.lat/api/drive-callback", state: "st" }));
  it("pide solo drive.file, openid y email, con refresh token", () => {
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("scope").split(" ").sort()).toEqual([...SCOPES_GOOGLE].sort());
    expect(SCOPES_GOOGLE).toContain("https://www.googleapis.com/auth/drive.file");
    expect(SCOPES_GOOGLE).not.toContain("https://www.googleapis.com/auth/drive");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("redirect_uri")).toBe("https://notarial.lat/api/drive-callback");
  });
});

describe("a dónde vuelve la persona al terminar", () => {
  it("éxito y errores", () => {
    expect(urlDeRetorno("ok", "abc")).toBe("/drive/listo");
    expect(urlDeRetorno("rechazado", "abc")).toBe("/drive/abc?error=rechazado");
    expect(urlDeRetorno("vencido", "abc")).toBe("/drive/abc?error=vencido");
    expect(urlDeRetorno("usado", "abc")).toBe("/drive/abc?error=usado");
  });
  it("lo desconocido es 'invalido' y sin código no hay a dónde volver", () => {
    expect(urlDeRetorno("cualquiera", "abc")).toBe("/drive/abc?error=invalido");
    expect(urlDeRetorno("rechazado", "")).toBe("/drive/error?error=rechazado");
  });
  it("no deja inyectar nada por el código", () => {
    expect(urlDeRetorno("vencido", "a/../b?x=1&y=2")).not.toMatch(/[?&]x=1/);
  });
});

describe("lo que ve el administrador de una conexión", () => {
  const fila = {
    registro_numero: "853", google_email: "escribania@gmail.com", refresh_token_cifrado: "v1.SECRETO.SECRETO.SECRETO",
    estado: "activa", motivo: null, sin_espacio: false, conectada_en: "2026-11-06T15:00:00Z", conectada_por: "u1",
    cuota_usada: 85, cuota_total: 100,
  };
  it("nunca incluye el token, ni cifrado", () => {
    const r = resumenConexion(fila);
    expect(JSON.stringify(r)).not.toMatch(/SECRETO|refresh_token|v1\./);
    expect(r).toMatchObject({ registro_numero: "853", google_email: "escribania@gmail.com", estado: "activa", conectado: true });
    expect(r.cuota.advertencia).toBe(true);
  });
  it("sin fila = no conectado", () => {
    expect(resumenConexion(null)).toMatchObject({ conectado: false, estado: "no_conectado" });
  });
  it("una conexión rota figura como no operativa con su motivo", () => {
    const r = resumenConexion({ ...fila, estado: "rota", motivo: "revocada" });
    expect(r).toMatchObject({ conectado: true, operativa: false, motivo: "revocada" });
  });
});

describe("quién es quién", () => {
  it("solo is_admin === true es administrador", () => {
    expect(esAdmin({ is_admin: true })).toBe(true);
    for (const p of [{ is_admin: false }, { is_admin: "true" }, { is_admin: 1 }, {}, null, undefined]) expect(esAdmin(p)).toBe(false);
  });
  it("el registro sale del perfil y se normaliza", () => {
    expect(registroDelUsuario({ registro_numero: " 853 " })).toBe("853");
    expect(registroDelUsuario({ registro_numero: 853 })).toBe("853");
    for (const p of [{ registro_numero: "" }, { registro_numero: null }, {}, null]) expect(registroDelUsuario(p)).toBe(null);
  });
});
