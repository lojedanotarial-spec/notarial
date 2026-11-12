// Simulador compartido de los tests de la API del Drive: una base de datos de mentira (lo mínimo de supabase-js que usa
// la API), un Google de mentira y una respuesta HTTP de mentira. Lo usan driveApi.test.js y driveCelularApi.test.js.
import { vi, expect } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import { crearHandler } from "../../api/drive.js";
import { cifrar } from "../../api/_drive.js";
import { crearAlmacenFalso } from "./_almacenFalso.js";

export const CLAVE = randomBytes(32).toString("base64");
export const T0 = Date.UTC(2026, 10, 9, 15, 0, 0);
export const MB = 1024 * 1024;
export const SCOPE_OK = "openid email https://www.googleapis.com/auth/drive.file";
export const TOKENS = { "tok-admin": "u-admin", "tok-fati": "u-fati", "tok-otro": "u-otro", "tok-fati2": "u-fati2" };

// ── Base de datos de mentira (lo mínimo de supabase-js que usa la API) ───────

export function crearSb(tablas, { unicos = {} } = {}) {
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
        in(c, vs) { q.filtros.push((f) => vs.includes(f[c])); return api; },
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

export const idToken = (email) => `h.${Buffer.from(JSON.stringify({ email, email_verified: true })).toString("base64url")}.s`;

export function crearGoogleFalso(extra = {}) {
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
    renombrar: vi.fn(async (access, id, nombre) => ({ id, name: nombre })),
    // Por defecto la carpeta "está vacía" pero cada archivo consultado existe: nada se oculta salvo que el test lo pida.
    listarCarpeta: vi.fn(async () => new Set()),
    estadoArchivo: vi.fn(async () => ({ existe: true, papelera: false })),
    revocar: vi.fn(async () => true),
    canjearCodigo: vi.fn(async () => ({ refresh_token: "1//refresh-nuevo", access_token: "acc", id_token: idToken("escribania@gmail.com"), scope: SCOPE_OK })),
    ...extra,
  };
}

// ── Respuesta de mentira ─────────────────────────────────────────────────────

export class ResFalsa extends Writable {
  constructor() { super(); this.statusCode = 200; this.headers = {}; this.partes = []; this.jsonBody = undefined; }
  setHeader(k, v) { this.headers[k.toLowerCase()] = v; }
  status(n) { this.statusCode = n; return this; }
  json(o) { this.jsonBody = o; this.end(); return this; }
  _write(c, e, cb) { this.partes.push(Buffer.from(c)); cb(); }
  get texto() { return Buffer.concat(this.partes).toString("utf8"); }
}

// Lo que "dice" el modelo de mentira por defecto: un DNI de una persona inventada.
export const RESPUESTA_IA = { tipo: "dni", descripcion: "", apellido: "García", nombre: "Juan", lado: "anverso", pagina: null, paginas_total: null, legible: true, confianza: "alta" };

export function entorno({ tablas: extraTablas = {}, google = {}, unicos, config = {}, ia: iaExtra = {}, propio = false, almacenOpts } = {}) {
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
    expediente_archivos: [], personas: [], expediente_personas: [], drive_conexiones: [], drive_enlaces: [], drive_auditoria: [], drive_sesiones_celular: [],
    ...extraTablas,
  };
  const sb = crearSb(tablas, { unicos: { expediente_archivos: (fs, n) => (n.almacen === "escribania" && fs.some((f) => f.almacen === "escribania" && f.drive_file_id === n.drive_file_id)) || (n.almacen === "propio" && fs.some((f) => f.id === n.id)), ...unicos } });
  const g = crearGoogleFalso(google);
  const reloj = { t: T0 };
  const ia = {
    modelo: "claude-haiku-5-5",
    consultar: vi.fn(async () => ({ texto: JSON.stringify(RESPUESTA_IA), entrada: 1372, salida: 221, parada: "end_turn" })),
    // Por defecto, cada imagen del lote es un DNI sin emparejar (el modelo de mentira no agrupa nada).
    consultarLote: vi.fn(async (miniaturas) => ({
      texto: JSON.stringify({ imagenes: miniaturas.map((_, i) => ({ ...RESPUESTA_IA, n: i + 1, grupo: i + 1, evidencia: "ninguna" })) }),
      entrada: 1372 * miniaturas.length, salida: 221 * miniaturas.length, parada: "end_turn",
    })),
    ...iaExtra,
  };
  const almacen = propio ? crearAlmacenFalso(almacenOpts) : null;   // `propio: true` = el servidor tiene el almacén de R2 configurado
  const deps = {
    sb, google: g, almacen, clientId: "cid", clave: CLAVE, ahora: () => reloj.t, ia,
    config: { identificar: false, identificarCompu: false, ...config },   // por defecto la identificación está apagada, como en producción sin variables
    usuarioDeToken: async (t) => (TOKENS[t] ? { id: TOKENS[t], email: `${TOKENS[t]}@x.com` } : null),
  };
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
  return { tablas, sb, google: g, almacen, ia, llamar, conectar, auditoria, reloj, deps };
}
