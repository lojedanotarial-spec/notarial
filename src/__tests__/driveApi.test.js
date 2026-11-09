// Drive de la escribanía: la API (api/drive.js) con una base y un Google de mentira.
// Spec: specs/drive-escribania/. Cubre las tareas T4.1, T4.2 y T4.3.
import { describe, it, expect, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import { crearHandler } from "../../api/drive.js";
import { GoogleError, crearGoogle, emailDeIdToken } from "../../api/_driveGoogle.js";
import { cifrar, descifrar, firmarState, hashCodigo } from "../../api/_drive.js";

const CLAVE = randomBytes(32).toString("base64");
const T0 = Date.UTC(2026, 10, 9, 15, 0, 0);
const MB = 1024 * 1024;
const SCOPE_OK = "openid email https://www.googleapis.com/auth/drive.file";
const TOKENS = { "tok-admin": "u-admin", "tok-fati": "u-fati", "tok-otro": "u-otro", "tok-fati2": "u-fati2" };

// ── Base de datos de mentira (lo mínimo de supabase-js que usa la API) ───────

function crearSb(tablas, { unicos = {} } = {}) {
  const clon = (x) => structuredClone(x);
  return {
    tablas,
    from(nombre) {
      const q = { op: "select", filtros: [], limite: null, payload: null, devolver: false, opciones: {} };
      const filas = () => (tablas[nombre] ||= []);
      const coincide = (f) => q.filtros.every((fn) => fn(f));
      const ejecutar = () => {
        if (q.op === "select") {
          let r = filas().filter(coincide).map(clon);
          if (q.limite != null) r = r.slice(0, q.limite);
          return { data: r, error: null };
        }
        if (q.op === "insert") {
          const nueva = { id: randomUUID(), created_at: new Date(T0).toISOString(), ...clon(q.payload) };
          if (unicos[nombre]?.(filas(), nueva)) return { data: null, error: { code: "23505", message: "duplicado" } };
          filas().push(nueva);
          return { data: [clon(nueva)], error: null };
        }
        if (q.op === "update") {
          const ok = filas().filter(coincide);
          ok.forEach((f) => Object.assign(f, clon(q.payload)));
          return { data: ok.map(clon), error: null };
        }
        if (q.op === "delete") {
          const quedan = filas().filter((f) => !coincide(f));
          const borradas = filas().length - quedan.length;
          tablas[nombre] = quedan;
          return { data: new Array(borradas).fill({}), error: null };
        }
        if (q.op === "upsert") {
          const col = q.opciones.onConflict;
          const previa = filas().find((f) => f[col] === q.payload[col]);
          if (previa) Object.assign(previa, clon(q.payload)); else filas().push(clon(q.payload));
          return { data: [clon(q.payload)], error: null };
        }
        throw new Error("op no soportada");
      };
      const api = {
        select() { if (q.op === "select") q.op = "select"; q.devolver = true; return api; },
        insert(p) { q.op = "insert"; q.payload = p; return api; },
        update(p) { q.op = "update"; q.payload = p; return api; },
        delete() { q.op = "delete"; return api; },
        upsert(p, o) { q.op = "upsert"; q.payload = p; q.opciones = o || {}; return api; },
        eq(c, v) { q.filtros.push((f) => f[c] === v); return api; },
        is(c, v) { q.filtros.push((f) => (v === null ? f[c] == null : f[c] === v)); return api; },
        lt(c, v) { q.filtros.push((f) => f[c] != null && String(f[c]) < String(v)); return api; },
        limit(n) { q.limite = n; return api; },
        maybeSingle() { const r = ejecutar(); return Promise.resolve({ data: r.data?.[0] ?? null, error: r.error }); },
        single() { const r = ejecutar(); const f = r.data?.[0]; return Promise.resolve(f ? { data: f, error: null } : { data: null, error: r.error || { message: "sin filas" } }); },
        then(ok, mal) { return Promise.resolve(ejecutar()).then(ok, mal); },
      };
      return api;
    },
  };
}

// ── Google de mentira ────────────────────────────────────────────────────────

const idToken = (email) => `h.${Buffer.from(JSON.stringify({ email, email_verified: true })).toString("base64url")}.s`;

function crearGoogleFalso(extra = {}) {
  let n = 0;
  return {
    renovar: vi.fn(async () => "acceso-1"),
    cuenta: vi.fn(async () => ({ email: "escribania@gmail.com", usada: 100, total: 1000 })),
    buscarCarpeta: vi.fn(async () => null),
    crearCarpeta: vi.fn(async () => `carpeta-${++n}`),
    abrirSesionSubida: vi.fn(async () => "https://upload.google/sesion-1"),
    metadatos: vi.fn(async (a, id) => ({ id, name: "dni.jpg", size: "3000", mimeType: "image/jpeg", parents: ["carpeta-exp"], trashed: false })),
    descargar: vi.fn(async () => new Response(Buffer.from("contenido!"), { headers: { "content-length": "10" } })),
    papelera: vi.fn(async () => ({ id: "x" })),
    revocar: vi.fn(async () => true),
    canjearCodigo: vi.fn(async () => ({ refresh_token: "1//refresh-nuevo", access_token: "acc", id_token: idToken("escribania@gmail.com"), scope: SCOPE_OK })),
    ...extra,
  };
}

// ── Respuesta de mentira ─────────────────────────────────────────────────────

class ResFalsa extends Writable {
  constructor() { super(); this.statusCode = 200; this.headers = {}; this.partes = []; this.jsonBody = undefined; }
  setHeader(k, v) { this.headers[k.toLowerCase()] = v; }
  status(n) { this.statusCode = n; return this; }
  json(o) { this.jsonBody = o; this.end(); return this; }
  _write(c, e, cb) { this.partes.push(Buffer.from(c)); cb(); }
  get texto() { return Buffer.concat(this.partes).toString("utf8"); }
}

function entorno({ tablas: extraTablas = {}, google = {}, unicos } = {}) {
  const tablas = {
    usuarios: [
      { id: "u-admin", registro_numero: "9876", is_admin: true, email: "lucas@x.com", registros_id: null },
      { id: "u-fati", registro_numero: "853", is_admin: false, email: "fati@x.com", registros_id: "r1" },
      { id: "u-fati2", registro_numero: "853", is_admin: false, email: "otra@x.com", registros_id: null },
      { id: "u-otro", registro_numero: "111", is_admin: false, email: "otro@x.com", registros_id: null },
    ],
    registros: [{ id: "r1", nombre: "Fátima", apellido: "Taha" }],
    expedientes: [
      { id: "e853", nombre: "Compraventa García", registro_id: "853", drive_carpeta_escribania_id: null },
      { id: "e853b", nombre: "Poder", registro_id: "853", drive_carpeta_escribania_id: "carpeta-exp" },
      { id: "e111", nombre: "Ajeno", registro_id: "111", drive_carpeta_escribania_id: null },
    ],
    expediente_archivos: [], drive_conexiones: [], drive_enlaces: [], drive_auditoria: [],
    ...extraTablas,
  };
  const sb = crearSb(tablas, { unicos: { expediente_archivos: (fs, n) => n.almacen === "escribania" && fs.some((f) => f.almacen === "escribania" && f.drive_file_id === n.drive_file_id), ...unicos } });
  const g = crearGoogleFalso(google);
  const reloj = { t: T0 };
  const deps = { sb, google: g, clientId: "cid", clave: CLAVE, ahora: () => reloj.t, usuarioDeToken: async (t) => (TOKENS[t] ? { id: TOKENS[t], email: `${TOKENS[t]}@x.com` } : null) };
  const handler = crearHandler(() => deps);
  const llamar = async (cuerpo, token, metodo = "POST") => {
    const res = new ResFalsa();
    const req = { method: metodo, body: cuerpo, headers: token ? { authorization: `Bearer ${token}` } : {}, query: metodo === "GET" ? cuerpo : {} };
    await handler(req, res);
    await new Promise((r) => (res.writableEnded ? r() : res.once("finish", r)));
    // Nada de lo que sale al navegador puede contener el token de Google, cifrado o no.
    const todo = JSON.stringify(res.jsonBody ?? "") + res.texto;
    expect(todo).not.toMatch(/refresh|v1\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/);
    return res;
  };
  const conectar = (registro = "853", extra = {}) => tablas.drive_conexiones.push({
    registro_numero: registro, google_email: "escribania@gmail.com", refresh_token_cifrado: cifrar("1//refresh-guardado", CLAVE),
    estado: "activa", motivo: null, sin_espacio: false, carpeta_raiz_id: "raiz-1", cuota_usada: 100, cuota_total: 1000,
    conectada_en: new Date(T0).toISOString(), conectada_por: "u-admin", ...extra,
  });
  const auditoria = () => tablas.drive_auditoria.map((a) => a.accion);
  return { tablas, sb, google: g, llamar, conectar, auditoria, reloj, deps };
}

// ═════════════════════════════════════════════════════════════════════════════

describe("T4.1 · entrada, autenticación y quién es quién", () => {
  it("sin sesión no entra nada de usuario ni de administrador", async () => {
    const { llamar } = entorno();
    for (const accion of ["estado", "iniciar_subida", "confirmar_subida", "ver", "descargar", "borrar", "admin_estado", "admin_enlace", "admin_desconectar"]) {
      expect((await llamar({ accion })).statusCode, accion).toBe(401);
      expect((await llamar({ accion }, "token-falso")).statusCode, accion).toBe(401);
    }
  });
  it("acción desconocida y métodos raros", async () => {
    const { llamar } = entorno();
    expect((await llamar({ accion: "hackear" }, "tok-admin")).statusCode).toBe(400);
    expect((await llamar({}, "tok-admin", "PUT")).statusCode).toBe(405);
    expect((await llamar({ accion: "otra" }, undefined, "GET")).statusCode).toBe(405);
  });
  it("las acciones de administrador están prohibidas a un usuario común", async () => {
    const { llamar } = entorno();
    for (const accion of ["admin_estado", "admin_enlace", "admin_desconectar"]) {
      expect((await llamar({ accion, registro_numero: "853" }, "tok-fati")).statusCode, accion).toBe(403);
    }
  });
  it("estado: el registro sale del servidor, nunca del cuerpo; y no muestra la cuenta de Google", async () => {
    const { llamar, conectar } = entorno();
    conectar("853");
    const r = await llamar({ accion: "estado", registro_numero: "111" }, "tok-fati");
    expect(r.jsonBody).toEqual({ conectado: true, operativa: true, estado: "activa", sin_espacio: false });
    expect(JSON.stringify(r.jsonBody)).not.toContain("escribania@gmail.com");
    expect((await llamar({ accion: "estado" }, "tok-otro")).jsonBody).toMatchObject({ conectado: false, estado: "no_conectado" });
  });
});

describe("T4.2 · conexión (enlace, Google, panel del administrador)", () => {
  it("admin_enlace: solo guarda el hash, vence en 24 h e invalida el enlace anterior sin usar", async () => {
    const { llamar, tablas } = entorno();
    const a = await llamar({ accion: "admin_enlace", registro_numero: "853" }, "tok-admin");
    expect(a.statusCode).toBe(200);
    const codigo = a.jsonBody.url.split("/drive/")[1];
    expect(a.jsonBody.url).toMatch(/^https:\/\/notarial\.lat\/drive\//);
    expect(tablas.drive_enlaces).toHaveLength(1);
    expect(tablas.drive_enlaces[0].codigo_hash).toBe(hashCodigo(codigo));
    expect(JSON.stringify(tablas.drive_enlaces)).not.toContain(codigo);
    expect(new Date(a.jsonBody.expira_en).getTime()).toBe(T0 + 24 * 3600 * 1000);
    const b = await llamar({ accion: "admin_enlace", registro_numero: "853" }, "tok-admin");
    expect(tablas.drive_enlaces).toHaveLength(1);
    expect(b.jsonBody.url).not.toBe(a.jsonBody.url);
    expect((await llamar({ accion: "enlace_info", codigo }, undefined)).jsonBody.valido).toBe(false);
  });
  it("admin_enlace: registro inexistente o ya conectado", async () => {
    const { llamar, conectar } = entorno();
    expect((await llamar({ accion: "admin_enlace", registro_numero: "99999" }, "tok-admin")).statusCode).toBe(404);
    expect((await llamar({ accion: "admin_enlace", registro_numero: "" }, "tok-admin")).statusCode).toBe(400);
    conectar("853");
    const r = await llamar({ accion: "admin_enlace", registro_numero: "853" }, "tok-admin");
    expect(r.statusCode).toBe(409);
    expect(r.jsonBody.error).toMatch(/ya tiene un Drive conectado/);
  });
  it("admin_enlace sí permite reconectar un registro cuya conexión está rota", async () => {
    const { llamar, conectar } = entorno();
    conectar("853", { estado: "rota", motivo: "revocada" });
    expect((await llamar({ accion: "admin_enlace", registro_numero: "853" }, "tok-admin")).statusCode).toBe(200);
  });
  it("enlace_info y enlace_iniciar: inexistente, vencido, usado", async () => {
    const { llamar, tablas, reloj } = entorno();
    const codigo = (await llamar({ accion: "admin_enlace", registro_numero: "853" }, "tok-admin")).jsonBody.url.split("/drive/")[1];
    expect((await llamar({ accion: "enlace_info", codigo })).jsonBody).toEqual({ valido: true, motivo: null, registro_numero: "853" });
    expect((await llamar({ accion: "enlace_info", codigo: "x".repeat(43) })).jsonBody).toMatchObject({ valido: false, motivo: "inexistente" });
    expect((await llamar({ accion: "enlace_info", codigo: "corto" })).jsonBody.motivo).toBe("inexistente");
    reloj.t = T0 + 25 * 3600 * 1000;
    expect((await llamar({ accion: "enlace_info", codigo })).jsonBody.motivo).toBe("vencido");
    expect((await llamar({ accion: "enlace_iniciar", codigo })).statusCode).toBe(410);
    reloj.t = T0;
    tablas.drive_enlaces[0].usado_en = new Date(T0).toISOString();
    expect((await llamar({ accion: "enlace_info", codigo })).jsonBody.motivo).toBe("usado");
  });
  it("enlace_iniciar devuelve la URL de Google con permisos mínimos y un state firmado", async () => {
    const { llamar } = entorno();
    const codigo = (await llamar({ accion: "admin_enlace", registro_numero: "853" }, "tok-admin")).jsonBody.url.split("/drive/")[1];
    const r = await llamar({ accion: "enlace_iniciar", codigo });
    const u = new URL(r.jsonBody.url);
    expect(u.origin).toBe("https://accounts.google.com");
    expect(u.searchParams.get("redirect_uri")).toBe("https://notarial.lat/api/drive-callback");
    expect(u.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/drive.file openid email");
    expect(u.searchParams.get("state")).toContain(".");
  });

  async function prepararCallback(e) {
    const codigo = (await e.llamar({ accion: "admin_enlace", registro_numero: "853" }, "tok-admin")).jsonBody.url.split("/drive/")[1];
    const state = new URL((await e.llamar({ accion: "enlace_iniciar", codigo })).jsonBody.url).searchParams.get("state");
    return { codigo, state };
  }
  const volver = (e, query) => e.llamar({ accion: "callback", ...query }, undefined, "GET");

  it("callback feliz: guarda el token cifrado, gasta el enlace, audita y redirige a 'listo'", async () => {
    const e = entorno();
    const { state } = await prepararCallback(e);
    const r = await volver(e, { code: "cod", state });
    expect(r.statusCode).toBe(302);
    expect(r.headers.location).toBe("/drive/listo");
    const c = e.tablas.drive_conexiones[0];
    expect(c).toMatchObject({ registro_numero: "853", google_email: "escribania@gmail.com", estado: "activa", conectada_por: "u-admin" });
    expect(c.refresh_token_cifrado).not.toContain("1//refresh-nuevo");
    expect(descifrar(c.refresh_token_cifrado, CLAVE)).toBe("1//refresh-nuevo");
    expect(e.tablas.drive_enlaces[0].usado_en).toBeTruthy();
    expect(e.auditoria()).toEqual(["conectar"]);
    expect(e.google.canjearCodigo).toHaveBeenCalledWith("cod", "https://notarial.lat/api/drive-callback");
  });
  it("callback: el mismo enlace no se puede usar dos veces", async () => {
    const e = entorno();
    const { state } = await prepararCallback(e);
    await volver(e, { code: "cod", state });
    e.tablas.drive_conexiones.length = 0;
    const r = await volver(e, { code: "cod2", state });
    expect(r.headers.location).toBe("/drive/error?error=usado");
    expect(e.tablas.drive_conexiones).toHaveLength(0);
  });
  it("callback: si rechaza en Google no queda nada conectado y el enlace sigue sirviendo", async () => {
    const e = entorno();
    const { codigo } = await prepararCallback(e);
    const r = await volver(e, { error: "access_denied" });
    expect(r.headers.location).toBe("/drive/error?error=rechazado");
    expect(e.tablas.drive_conexiones).toHaveLength(0);
    expect((await e.llamar({ accion: "enlace_info", codigo })).jsonBody.valido).toBe(true);
  });
  it("callback: state inválido, vencido o ausente", async () => {
    const e = entorno();
    const { state } = await prepararCallback(e);
    for (const q of [{ code: "c", state: "basura" }, { code: "c" }, { state }, { code: "c", state: firmarState({ enlace: "x", exp: T0 + 1000 }, randomBytes(32).toString("base64")) }]) {
      expect((await volver(e, q)).headers.location).toBe("/drive/error?error=invalido");
    }
    e.reloj.t = T0 + 16 * 60 * 1000;
    expect((await volver(e, { code: "c", state })).headers.location).toBe("/drive/error?error=invalido");
    expect(e.tablas.drive_conexiones).toHaveLength(0);
    expect(e.google.canjearCodigo).not.toHaveBeenCalled();
  });
  it("callback: enlace vencido entre medio", async () => {
    const e = entorno();
    const { state } = await prepararCallback(e);
    e.tablas.drive_enlaces[0].expira_en = new Date(T0 - 1).toISOString();
    expect((await volver(e, { code: "c", state })).headers.location).toBe("/drive/error?error=vencido");
    expect(e.tablas.drive_conexiones).toHaveLength(0);
  });
  it("callback: si Google acepta a medias (sin drive.file) se revoca y no se conecta", async () => {
    const e = entorno({ google: { canjearCodigo: vi.fn(async () => ({ refresh_token: "1//r", access_token: "a", id_token: idToken("x@gmail.com"), scope: "openid email" })) } });
    const { state } = await prepararCallback(e);
    expect((await volver(e, { code: "c", state })).headers.location).toBe("/drive/error?error=rechazado");
    expect(e.google.revocar).toHaveBeenCalled();
    expect(e.tablas.drive_conexiones).toHaveLength(0);
    expect(e.tablas.drive_enlaces[0].usado_en).toBeFalsy();
  });
  it("callback: sin refresh token o con el canje fallando, no se conecta", async () => {
    const sin = entorno({ google: { canjearCodigo: vi.fn(async () => ({ access_token: "a", id_token: idToken("x@gmail.com"), scope: SCOPE_OK })) } });
    const s1 = await prepararCallback(sin);
    expect((await volver(sin, { code: "c", state: s1.state })).headers.location).toBe("/drive/error?error=invalido");
    const falla = entorno({ google: { canjearCodigo: vi.fn(async () => { throw new GoogleError({ status: 400, error: "invalid_grant" }); }) } });
    const s2 = await prepararCallback(falla);
    expect((await volver(falla, { code: "c", state: s2.state })).headers.location).toBe("/drive/error?error=invalido");
    expect(sin.tablas.drive_conexiones).toHaveLength(0);
    expect(falla.tablas.drive_conexiones).toHaveLength(0);
  });
  it("callback: no pisa una conexión activa; sí reemplaza una rota", async () => {
    const activa = entorno();
    const { state } = await prepararCallback(activa);
    activa.conectar("853");
    expect((await volver(activa, { code: "c", state })).headers.location).toBe("/drive/error?error=invalido");
    expect(descifrar(activa.tablas.drive_conexiones[0].refresh_token_cifrado, CLAVE)).toBe("1//refresh-guardado");
    const rota = entorno();
    const s = await prepararCallback(rota);
    rota.conectar("853", { estado: "rota", motivo: "revocada" });
    expect((await volver(rota, { code: "c", state: s.state })).headers.location).toBe("/drive/listo");
    expect(rota.tablas.drive_conexiones).toHaveLength(1);
    expect(rota.tablas.drive_conexiones[0]).toMatchObject({ estado: "activa", motivo: null });
  });
  it("admin_desconectar: revoca en Google, corta de inmediato y audita; sin conexión da 404", async () => {
    const e = entorno();
    e.conectar("853");
    const r = await e.llamar({ accion: "admin_desconectar", registro_numero: "853" }, "tok-admin");
    expect(r.jsonBody).toEqual({ ok: true });
    expect(e.google.revocar).toHaveBeenCalledWith("1//refresh-guardado");
    expect(e.tablas.drive_conexiones).toHaveLength(0);
    expect(e.auditoria()).toEqual(["desconectar"]);
    expect((await e.llamar({ accion: "estado" }, "tok-fati")).jsonBody.estado).toBe("no_conectado");
    expect((await e.llamar({ accion: "admin_desconectar", registro_numero: "853" }, "tok-admin")).statusCode).toBe(404);
  });
  it("admin_desconectar corta igual aunque Google falle al revocar", async () => {
    const e = entorno({ google: { revocar: vi.fn(async () => { throw new Error("red caída"); }) } });
    e.conectar("853");
    expect((await e.llamar({ accion: "admin_desconectar", registro_numero: "853" }, "tok-admin")).statusCode).toBe(200);
    expect(e.tablas.drive_conexiones).toHaveLength(0);
  });
  it("admin_estado: todos los registros, con espacio al día y advertencia al 80 %; sin token", async () => {
    const e = entorno({ google: { cuenta: vi.fn(async () => ({ email: "escribania@gmail.com", usada: 850, total: 1000 })) } });
    e.conectar("853");
    const r = await e.llamar({ accion: "admin_estado" }, "tok-admin");
    const reg = Object.fromEntries(r.jsonBody.registros.map((x) => [x.registro_numero, x]));
    expect(Object.keys(reg).sort()).toEqual(["111", "853", "9876"]);
    expect(reg["853"]).toMatchObject({ conectado: true, operativa: true, usuarios: 2, google_email: "escribania@gmail.com" });
    expect(reg["853"].cuota.advertencia).toBe(true);
    expect(reg["111"]).toMatchObject({ conectado: false, estado: "no_conectado" });
    expect(e.tablas.drive_conexiones[0].cuota_usada).toBe(850);
  });
  it("admin_estado marca como rota la conexión que Google ya no acepta, sin romper el resto", async () => {
    const e = entorno({ google: { renovar: vi.fn(async () => { throw new GoogleError({ status: 400, error: "invalid_grant" }); }) } });
    e.conectar("853");
    const r = await e.llamar({ accion: "admin_estado" }, "tok-admin");
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.registros.find((x) => x.registro_numero === "853")).toMatchObject({ estado: "rota", operativa: false });
    expect(e.tablas.drive_conexiones[0].estado).toBe("rota");
    expect(e.auditoria()).toContain("conexion_rota");
  });
});

describe("T4.3 · archivos del expediente", () => {
  const subida = { accion: "iniciar_subida", expediente_id: "e853", nombre: "dni frente.jpg", mime: "image/jpeg", tamano: 3 * MB, tipo: "dni" };

  it("iniciar_subida: valida el tamaño antes de tocar Google", async () => {
    const e = entorno(); e.conectar("853");
    const r = await e.llamar({ ...subida, tamano: 25 * MB + 1 }, "tok-fati");
    expect(r.statusCode).toBe(413);
    expect(r.jsonBody.error).toMatch(/25 MB/);
    expect(e.google.renovar).not.toHaveBeenCalled();
    expect((await e.llamar({ ...subida, tamano: 0 }, "tok-fati")).statusCode).toBe(400);
  });
  it("iniciar_subida: un expediente de otro registro es un 404, aunque se conozca su id", async () => {
    const e = entorno(); e.conectar("853"); e.conectar("111");
    const r = await e.llamar({ ...subida, expediente_id: "e111" }, "tok-fati");
    expect(r.statusCode).toBe(404);
    expect(e.google.abrirSesionSubida).not.toHaveBeenCalled();
    expect((await e.llamar({ ...subida, expediente_id: "no-existe" }, "tok-fati")).statusCode).toBe(404);
  });
  it("iniciar_subida: sin Drive conectado explica qué pasa", async () => {
    const e = entorno();
    const r = await e.llamar(subida, "tok-fati");
    expect(r.statusCode).toBe(409);
    expect(r.jsonBody).toMatchObject({ codigo: "no_conectado" });
    expect(r.jsonBody.error).toMatch(/todavía no conectó/);
  });
  it("iniciar_subida: con la conexión rota el mensaje no es técnico ni pide iniciar sesión con Google", async () => {
    const e = entorno(); e.conectar("853", { estado: "rota", motivo: "revocada" });
    const r = await e.llamar(subida, "tok-fati");
    expect(r.statusCode).toBe(503);
    expect(r.jsonBody.error).toBe("El Drive de la escribanía no está disponible. Avisale a quien administra Notarial.");
  });
  it("iniciar_subida: crea la carpeta raíz y la del expediente una sola vez, y devuelve la sesión de Google", async () => {
    const e = entorno(); e.conectar("853", { carpeta_raiz_id: null });
    const r = await e.llamar(subida, "tok-fati");
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody).toMatchObject({ sesion_url: "https://upload.google/sesion-1", nombre: "dni frente.jpg", tipo: "dni" });
    expect(e.google.crearCarpeta).toHaveBeenCalledTimes(2);
    expect(e.google.crearCarpeta.mock.calls[0].slice(1)).toEqual(["Notarial", null]);
    expect(e.google.crearCarpeta.mock.calls[1][1]).toMatch(/^Compraventa García \(e853\)$/);
    const args = e.google.abrirSesionSubida.mock.calls[0][1];
    expect(args).toMatchObject({ mime: "image/jpeg", tamano: 3 * MB, origen: "https://notarial.lat" });
    expect(e.tablas.expedientes.find((x) => x.id === "e853").drive_carpeta_escribania_id).toBe(args.carpetaId);
    expect(e.tablas.drive_conexiones[0].carpeta_raiz_id).toBeTruthy();
    await e.llamar(subida, "tok-fati");
    expect(e.google.crearCarpeta).toHaveBeenCalledTimes(2);
  });
  it("iniciar_subida: si la raíz 'Notarial' ya existe en ese Drive no se duplica", async () => {
    const e = entorno({ google: { buscarCarpeta: vi.fn(async () => "raiz-existente") } });
    e.conectar("853", { carpeta_raiz_id: null });
    await e.llamar(subida, "tok-fati");
    expect(e.google.crearCarpeta).toHaveBeenCalledTimes(1);
    expect(e.google.crearCarpeta.mock.calls[0][2]).toBe("raiz-existente"); // la carpeta del expediente va dentro de la raíz existente
  });
  it("iniciar_subida: si dos suben a la vez gana una carpeta y la otra va a la papelera", async () => {
    const e = entorno(); e.conectar("853");
    const original = e.sb.from.bind(e.sb);
    let tocada = false;
    e.sb.from = (t) => { // entre medio, otra solicitud ya guardó su carpeta
      if (t === "expedientes" && !tocada && e.google.crearCarpeta.mock.calls.length) { tocada = true; e.tablas.expedientes.find((x) => x.id === "e853").drive_carpeta_escribania_id = "carpeta-ganadora"; }
      return original(t);
    };
    const r = await e.llamar(subida, "tok-fati");
    expect(r.statusCode).toBe(200);
    expect(e.google.papelera).toHaveBeenCalled();
    expect(e.google.abrirSesionSubida.mock.calls[0][1].carpetaId).toBe("carpeta-ganadora");
  });
  it("iniciar_subida: si alguien borró la carpeta a mano en Drive, se reintenta con carpetas nuevas", async () => {
    let primera = true;
    const e = entorno({ google: { abrirSesionSubida: vi.fn(async () => { if (primera) { primera = false; throw new GoogleError({ status: 404 }); } return "https://upload.google/sesion-2"; }) } });
    e.conectar("853");
    const r = await e.llamar({ ...subida, expediente_id: "e853b" }, "tok-fati");
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.sesion_url).toBe("https://upload.google/sesion-2");
    expect(e.google.crearCarpeta).toHaveBeenCalled();
  });
  it("iniciar_subida: sin espacio en Drive lo informa y lo recuerda", async () => {
    const e = entorno({ google: { abrirSesionSubida: vi.fn(async () => { throw new GoogleError({ status: 403, reason: "storageQuotaExceeded" }); }) } });
    e.conectar("853");
    const r = await e.llamar(subida, "tok-fati");
    expect(r.statusCode).toBe(507);
    expect(r.jsonBody.error).toMatch(/no tiene más espacio/);
    expect(e.tablas.drive_conexiones[0].sin_espacio).toBe(true);
  });

  it("invalid_grant al renovar: la conexión queda rota, se audita y el usuario ve un mensaje claro", async () => {
    const e = entorno({ google: { renovar: vi.fn(async () => { throw new GoogleError({ status: 400, error: "invalid_grant" }); }) } });
    e.conectar("853");
    const r = await e.llamar(subida, "tok-fati");
    expect(r.statusCode).toBe(503);
    expect(r.jsonBody.error).not.toMatch(/invalid_grant|token|oauth/i);
    expect(e.tablas.drive_conexiones[0]).toMatchObject({ estado: "rota", motivo: "revocada" });
    expect(e.auditoria()).toEqual(["conexion_rota"]);
    expect((await e.llamar({ accion: "estado" }, "tok-fati")).jsonBody.operativa).toBe(false);
  });
  it("invalid_client (secreto roto de nuestro lado) NO marca la conexión como rota", async () => {
    const e = entorno({ google: { renovar: vi.fn(async () => { throw new GoogleError({ status: 401, error: "invalid_client" }); }) } });
    e.conectar("853");
    const r = await e.llamar(subida, "tok-fati");
    expect(r.statusCode).toBe(503);
    expect(e.tablas.drive_conexiones[0].estado).toBe("activa");
    expect(e.auditoria()).toEqual([]);
  });
  it("si la clave de cifrado no coincide, es un error de configuración y tampoco rompe la conexión", async () => {
    const e = entorno();
    e.conectar("853", { refresh_token_cifrado: cifrar("x", randomBytes(32).toString("base64")) });
    const r = await e.llamar(subida, "tok-fati");
    expect(r.statusCode).toBe(503);
    expect(e.tablas.drive_conexiones[0].estado).toBe("activa");
  });

  const confirmar = { accion: "confirmar_subida", expediente_id: "e853b", drive_file_id: "file-1", tipo: "dni" };
  it("confirmar_subida: registra el archivo con quién lo subió, audita y deja la cuota al día", async () => {
    const e = entorno(); e.conectar("853");
    const r = await e.llamar(confirmar, "tok-fati");
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.archivo).toMatchObject({ nombre: "dni.jpg", tipo: "dni", mime_type: "image/jpeg", tamano: 3000, subido_por_nombre: "Fátima Taha" });
    expect(e.tablas.expediente_archivos[0]).toMatchObject({ almacen: "escribania", subido_por: "u-fati", drive_file_id: "file-1" });
    expect(e.auditoria()).toEqual(["subir"]);
    expect(e.tablas.drive_conexiones[0].cuota_usada).toBe(100);
  });
  it("confirmar_subida: el nombre del que sube sale del servidor (sin registro asignado usa el mail)", async () => {
    const e = entorno(); e.conectar("853");
    const r = await e.llamar(confirmar, "tok-fati2");
    expect(r.jsonBody.archivo.subido_por_nombre).toBe("otra@x.com");
  });
  it("confirmar_subida es idempotente: repetirla no duplica ni audita dos veces", async () => {
    const e = entorno(); e.conectar("853");
    const a = await e.llamar(confirmar, "tok-fati");
    const b = await e.llamar(confirmar, "tok-fati");
    expect(b.statusCode).toBe(200);
    expect(b.jsonBody.archivo.id).toBe(a.jsonBody.archivo.id);
    expect(e.tablas.expediente_archivos).toHaveLength(1);
    expect(e.auditoria()).toEqual(["subir"]);
  });
  it("confirmar_subida: un archivo que no está en la carpeta del expediente, o en la papelera, se rechaza", async () => {
    const afuera = entorno({ google: { metadatos: vi.fn(async (a, id) => ({ id, name: "x.jpg", size: "10", mimeType: "image/jpeg", parents: ["otra-carpeta"], trashed: false })) } });
    afuera.conectar("853");
    expect((await afuera.llamar(confirmar, "tok-fati")).statusCode).toBe(400);
    const papelera = entorno({ google: { metadatos: vi.fn(async (a, id) => ({ id, name: "x.jpg", size: "10", mimeType: "image/jpeg", parents: ["carpeta-exp"], trashed: true })) } });
    papelera.conectar("853");
    expect((await papelera.llamar(confirmar, "tok-fati")).statusCode).toBe(400);
    expect(afuera.tablas.expediente_archivos).toHaveLength(0);
  });
  it("confirmar_subida: el archivo de otro Drive no se ve con este token (404) y no se registra", async () => {
    const e = entorno({ google: { metadatos: vi.fn(async () => { throw new GoogleError({ status: 404 }); }) } });
    e.conectar("853");
    expect((await e.llamar(confirmar, "tok-fati")).statusCode).toBe(404);
    expect(e.tablas.expediente_archivos).toHaveLength(0);
  });
  it("confirmar_subida: si lo subido pasa de 25 MB se manda a la papelera y no se registra", async () => {
    const e = entorno({ google: { metadatos: vi.fn(async (a, id) => ({ id, name: "enorme.pdf", size: String(26 * MB), mimeType: "application/pdf", parents: ["carpeta-exp"], trashed: false })) } });
    e.conectar("853");
    expect((await e.llamar(confirmar, "tok-fati")).statusCode).toBe(413);
    expect(e.google.papelera).toHaveBeenCalledWith("acceso-1", "file-1");
    expect(e.tablas.expediente_archivos).toHaveLength(0);
  });
  it("confirmar_subida: de otro registro, 404", async () => {
    const e = entorno(); e.conectar("111");
    expect((await e.llamar({ ...confirmar, expediente_id: "e111" }, "tok-fati")).statusCode).toBe(404);
  });

  async function conArchivo(extra = {}) {
    const e = entorno(extra); e.conectar("853");
    const id = (await e.llamar(confirmar, "tok-fati")).jsonBody.archivo.id;
    e.google.metadatos.mockClear?.();
    return { e, id };
  }
  it("ver: entrega el archivo por el servidor con cabeceras seguras y deja registro", async () => {
    const { e, id } = await conArchivo();
    const r = await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati2");
    expect(r.statusCode).toBe(200);
    expect(r.texto).toBe("contenido!");
    expect(r.headers).toMatchObject({ "content-type": "image/jpeg", "x-content-type-options": "nosniff", "cache-control": "private, no-store", "content-length": "10" });
    expect(r.headers["content-disposition"]).toMatch(/^inline; filename="dni.jpg"/);
    expect(r.headers["content-security-policy"]).toContain("sandbox");
    expect(e.auditoria()).toEqual(["subir", "ver"]);
    expect(e.tablas.drive_auditoria[1]).toMatchObject({ usuario_id: "u-fati2", registro_numero: "853" });
  });
  it("descargar siempre baja como adjunto; ver un tipo no previsualizable también", async () => {
    const { e, id } = await conArchivo();
    expect((await e.llamar({ accion: "descargar", archivo_id: id }, "tok-fati")).headers["content-disposition"]).toMatch(/^attachment/);
    expect(e.auditoria().at(-1)).toBe("descargar");
    e.tablas.expediente_archivos[0].mime_type = "text/html";
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati")).headers["content-disposition"]).toMatch(/^attachment/);
  });
  it("un nombre con comillas o tildes no rompe las cabeceras", async () => {
    const { e, id } = await conArchivo();
    e.tablas.expediente_archivos[0].nombre = 'Poder "Gómez" ñandú.pdf';
    const r = await e.llamar({ accion: "descargar", archivo_id: id }, "tok-fati");
    expect(r.headers["content-disposition"]).toContain('filename="Poder _G_mez_ _and_.pdf"');
    expect(r.headers["content-disposition"]).toContain("filename*=UTF-8''" + encodeURIComponent('Poder "Gómez" ñandú.pdf'));
  });
  it("ver/descargar: de otro registro o borrado, 404; y sin dejar registro de acceso", async () => {
    const { e, id } = await conArchivo();
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-otro")).statusCode).toBe(404);
    expect((await e.llamar({ accion: "descargar", archivo_id: id }, "tok-otro")).statusCode).toBe(404);
    expect((await e.llamar({ accion: "ver", archivo_id: "no-existe" }, "tok-fati")).statusCode).toBe(404);
    e.tablas.expediente_archivos[0].borrado_en = new Date(T0).toISOString();
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati")).statusCode).toBe(404);
    expect(e.auditoria()).toEqual(["subir"]);
  });
  it("ver/descargar: un archivo del almacén viejo (Drive personal) nunca se entrega", async () => {
    const { e, id } = await conArchivo();
    e.tablas.expediente_archivos[0].almacen = "personal";
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati")).statusCode).toBe(404);
  });
  it("ver: si el archivo ya no está en Drive, mensaje claro", async () => {
    const { e, id } = await conArchivo({ google: { descargar: vi.fn(async () => { throw new GoogleError({ status: 404 }); }) } });
    const r = await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati");
    expect(r.statusCode).toBe(404);
    expect(r.jsonBody.error).toBe("Ese archivo ya no está en el Drive de la escribanía.");
  });
  it("ver: el administrador puede ver archivos de cualquier registro", async () => {
    const { e, id } = await conArchivo();
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-admin")).statusCode).toBe(200);
  });

  it("borrar: papelera de Drive, marca la fila, audita y desaparece para los demás", async () => {
    const { e, id } = await conArchivo();
    const r = await e.llamar({ accion: "borrar", archivo_id: id }, "tok-fati2");
    expect(r.jsonBody).toEqual({ ok: true });
    expect(e.google.papelera).toHaveBeenCalledWith("acceso-1", "file-1");
    expect(e.tablas.expediente_archivos[0]).toMatchObject({ borrado_por: "u-fati2" });
    expect(e.tablas.expediente_archivos[0].borrado_en).toBeTruthy();
    expect(e.auditoria()).toEqual(["subir", "borrar"]);
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati")).statusCode).toBe(404);
  });
  it("borrar: de otro registro, 404; si ya no estaba en Drive igual se saca de la lista", async () => {
    const { e, id } = await conArchivo();
    expect((await e.llamar({ accion: "borrar", archivo_id: id }, "tok-otro")).statusCode).toBe(404);
    e.google.papelera.mockImplementationOnce(async () => { throw new GoogleError({ status: 404 }); });
    expect((await e.llamar({ accion: "borrar", archivo_id: id }, "tok-fati")).statusCode).toBe(200);
    expect(e.tablas.expediente_archivos[0].borrado_en).toBeTruthy();
  });
});

describe("recorrido completo: de enlace a archivo", () => {
  it("el administrador genera el enlace, la escribanía autoriza, un usuario por email sube y otro lo ve", async () => {
    const e = entorno();
    const codigo = (await e.llamar({ accion: "admin_enlace", registro_numero: "853" }, "tok-admin")).jsonBody.url.split("/drive/")[1];
    expect((await e.llamar({ accion: "estado" }, "tok-fati")).jsonBody.estado).toBe("no_conectado");
    const state = new URL((await e.llamar({ accion: "enlace_iniciar", codigo })).jsonBody.url).searchParams.get("state");
    expect((await e.llamar({ accion: "callback", code: "cod", state }, undefined, "GET")).headers.location).toBe("/drive/listo");
    expect((await e.llamar({ accion: "estado" }, "tok-fati2")).jsonBody).toMatchObject({ conectado: true, operativa: true });
    const sesion = await e.llamar({ accion: "iniciar_subida", expediente_id: "e853", nombre: "DNI.jpg", mime: "image/jpeg", tamano: 2 * MB, tipo: "dni" }, "tok-fati2");
    expect(sesion.statusCode).toBe(200);
    const carpeta = e.tablas.expedientes.find((x) => x.id === "e853").drive_carpeta_escribania_id;
    e.google.metadatos.mockImplementation(async (a, id) => ({ id, name: "DNI.jpg", size: String(2 * MB), mimeType: "image/jpeg", parents: [carpeta], trashed: false }));
    const arch = (await e.llamar({ accion: "confirmar_subida", expediente_id: "e853", drive_file_id: "f-9", tipo: "dni" }, "tok-fati2")).jsonBody.archivo;
    expect((await e.llamar({ accion: "ver", archivo_id: arch.id }, "tok-fati")).texto).toBe("contenido!");
    expect((await e.llamar({ accion: "ver", archivo_id: arch.id }, "tok-otro")).statusCode).toBe(404);
    expect(e.auditoria()).toEqual(["conectar", "subir", "ver"]);
  });
});

describe("cliente de Google (_driveGoogle.js)", () => {
  const respuesta = (cuerpo, { status = 200, headers = {} } = {}) => new Response(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo), { status, headers });
  it("canjearCodigo y renovar usan el endpoint de tokens con el cliente correcto", async () => {
    const f = vi.fn(async () => respuesta({ access_token: "a", refresh_token: "r" }));
    const g = crearGoogle({ clientId: "cid", clientSecret: "sec", fetch: f });
    await g.canjearCodigo("codigo", "https://notarial.lat/api/drive-callback");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const p = new URLSearchParams(init.body);
    expect(Object.fromEntries(p)).toMatchObject({ code: "codigo", client_id: "cid", client_secret: "sec", grant_type: "authorization_code", redirect_uri: "https://notarial.lat/api/drive-callback" });
    expect(await g.renovar("r")).toBe("a");
    expect(Object.fromEntries(new URLSearchParams(f.mock.calls[1][1].body))).toMatchObject({ grant_type: "refresh_token", refresh_token: "r" });
  });
  it("los errores llevan el código de Google pero nunca el cuerpo, los tokens ni el secreto", async () => {
    const g = crearGoogle({ clientId: "cid", clientSecret: "SECRETO", fetch: async () => respuesta({ error: "invalid_grant", error_description: "Token has been expired" }, { status: 400 }) });
    const err = await g.renovar("1//TOKEN-SECRETO").catch((x) => x);
    expect(err).toBeInstanceOf(GoogleError);
    expect(err).toMatchObject({ status: 400, error: "invalid_grant" });
    expect(JSON.stringify(err) + err.message + err.stack).not.toMatch(/TOKEN-SECRETO|SECRETO|expired/);
    const api = crearGoogle({ fetch: async () => respuesta({ error: { code: 403, errors: [{ reason: "storageQuotaExceeded" }] } }, { status: 403 }) });
    expect(await api.metadatos("a", "f").catch((x) => x)).toMatchObject({ status: 403, reason: "storageQuotaExceeded" });
  });
  it("abrirSesionSubida manda Origin (para que el navegador suba directo) y devuelve la URL de la sesión", async () => {
    const f = vi.fn(async () => respuesta({}, { headers: { location: "https://upload.google/s1" } }));
    const url = await crearGoogle({ fetch: f }).abrirSesionSubida("acc", { nombre: "a.jpg", mime: "image/jpeg", tamano: 123, carpetaId: "c1", origen: "https://notarial.lat" });
    expect(url).toBe("https://upload.google/s1");
    const init = f.mock.calls[0][1];
    expect(init.headers).toMatchObject({ Origin: "https://notarial.lat", "X-Upload-Content-Length": "123", "X-Upload-Content-Type": "image/jpeg", Authorization: "Bearer acc" });
    expect(JSON.parse(init.body)).toEqual({ name: "a.jpg", parents: ["c1"] });
    const sin = crearGoogle({ fetch: async () => respuesta({}) });
    expect(await sin.abrirSesionSubida("a", { nombre: "a", mime: "x/y", tamano: 1, carpetaId: "c", origen: "o" }).catch((x) => x)).toBeInstanceOf(GoogleError);
  });
  it("buscarCarpeta escapa las comillas del nombre", async () => {
    const f = vi.fn(async () => respuesta({ files: [{ id: "k" }] }));
    expect(await crearGoogle({ fetch: f }).buscarCarpeta("acc", "O'Brien \\ x", "padre")).toBe("k");
    const q = new URL(f.mock.calls[0][0]).searchParams.get("q");
    expect(q).toContain("name='O\\'Brien \\\\ x'");
    expect(q).toContain("'padre' in parents");
  });
  it("papelera usa PATCH trashed (nunca DELETE definitivo)", async () => {
    const f = vi.fn(async () => respuesta({ id: "k" }));
    await crearGoogle({ fetch: f }).papelera("acc", "k");
    expect(f.mock.calls[0][1].method).toBe("PATCH");
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ trashed: true });
  });
  it("revocar tolera que el permiso ya no estuviera vigente", async () => {
    expect(await crearGoogle({ fetch: async () => respuesta({}, { status: 400 }) }).revocar("t")).toBe(true);
    expect(await crearGoogle({ fetch: async () => respuesta({}, { status: 200 }) }).revocar("t")).toBe(true);
    expect(await crearGoogle({ fetch: async () => respuesta({}, { status: 500 }) }).revocar("t")).toBe(false);
  });
  it("cuenta devuelve mail y espacio", async () => {
    const f = async () => respuesta({ user: { emailAddress: "e@gmail.com" }, storageQuota: { usage: "55", limit: "15000" } });
    expect(await crearGoogle({ fetch: f }).cuenta("a")).toEqual({ email: "e@gmail.com", usada: 55, total: 15000 });
  });
  it("emailDeIdToken lee el mail y rechaza basura o mails sin verificar", () => {
    expect(emailDeIdToken(idToken("a@b.com"))).toBe("a@b.com");
    expect(emailDeIdToken("basura")).toBe(null);
    expect(emailDeIdToken(undefined)).toBe(null);
    const sinVerificar = `h.${Buffer.from(JSON.stringify({ email: "a@b.com", email_verified: false })).toString("base64url")}.s`;
    expect(emailDeIdToken(sinVerificar)).toBe(null);
  });
});
