// Cliente mínimo de las APIs de Google que usa el Drive de la escribanía (OAuth + Drive v3).
// `fetch` se inyecta para poder probarlo sin red. Nunca incluye tokens ni cuerpos de respuesta en los errores.
// Spec y plan: specs/drive-escribania/.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const CARPETA = "application/vnd.google-apps.folder";

export class GoogleError extends Error {
  constructor({ status, error, reason }) {
    super(error || reason || `google_${status}`);
    this.name = "GoogleError";
    this.status = status;
    this.error = error;   // del endpoint de tokens: invalid_grant, invalid_client…
    this.reason = reason; // de la API de Drive: storageQuotaExceeded, rateLimitExceeded…
  }
}

async function errorDe(r) {
  let j = null;
  try { j = await r.json(); } catch { /* sin cuerpo */ }
  const error = typeof j?.error === "string" ? j.error : undefined;
  const reason = j?.error?.errors?.[0]?.reason;
  return new GoogleError({ status: r.status, error, reason });
}

async function jsonOk(r) {
  if (!r.ok) throw await errorDe(r);
  return r.json();
}

// El mail de la cuenta viene dentro del id_token. Se lee sin verificar la firma porque llega directo de Google por HTTPS.
export function emailDeIdToken(idToken) {
  try {
    const p = JSON.parse(Buffer.from(String(idToken).split(".")[1], "base64url").toString("utf8"));
    return p.email && p.email_verified !== false ? String(p.email) : null;
  } catch {
    return null;
  }
}

const escaparConsulta = (s) => String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export function crearGoogle({ clientId, clientSecret, fetch: f = (...a) => globalThis.fetch(...a) } = {}) {
  const auth = (access, extra = {}) => ({ Authorization: `Bearer ${access}`, ...extra });
  const form = (obj) => ({ "content-type": "application/x-www-form-urlencoded" , body: new URLSearchParams(obj) });
  const post = (url, obj) => { const { body, ...headers } = form(obj); return f(url, { method: "POST", headers, body }); };

  return {
    // Canje del código de autorización por los tokens. Devuelve { refresh_token, access_token, id_token, scope }.
    async canjearCodigo(code, redirectUri) {
      return jsonOk(await post(TOKEN_URL, {
        code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code",
      }));
    },

    // Renueva el token de acceso (dura ~1 h) a partir del refresh token guardado.
    async renovar(refreshToken) {
      const j = await jsonOk(await post(TOKEN_URL, {
        client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token",
      }));
      return j.access_token;
    },

    // Cuenta conectada y espacio: { email, usada, total } (total null si Google no lo informa).
    async cuenta(access) {
      const j = await jsonOk(await f(`${API}/about?fields=${encodeURIComponent("user(emailAddress),storageQuota(usage,limit)")}`, { headers: auth(access) }));
      const q = j.storageQuota || {};
      return {
        email: j.user?.emailAddress ?? null,
        usada: q.usage !== undefined ? Number(q.usage) : null,
        total: q.limit !== undefined ? Number(q.limit) : null,
      };
    },

    async buscarCarpeta(access, nombre, padreId) {
      const partes = [`name='${escaparConsulta(nombre)}'`, `mimeType='${CARPETA}'`, "trashed=false"];
      if (padreId) partes.push(`'${escaparConsulta(padreId)}' in parents`);
      const j = await jsonOk(await f(`${API}/files?q=${encodeURIComponent(partes.join(" and "))}&fields=${encodeURIComponent("files(id)")}&pageSize=1`, { headers: auth(access) }));
      return j.files?.[0]?.id ?? null;
    },

    async crearCarpeta(access, nombre, padreId) {
      const cuerpo = { name: nombre, mimeType: CARPETA, ...(padreId ? { parents: [padreId] } : {}) };
      const j = await jsonOk(await f(`${API}/files?fields=id`, {
        method: "POST", headers: auth(access, { "content-type": "application/json" }), body: JSON.stringify(cuerpo),
      }));
      return j.id;
    },

    // Abre una sesión de subida reanudable. Con `Origin`, Google deja que el NAVEGADOR suba directo (CORS): el
    // archivo no pasa por Vercel, que limita los cuerpos a 4,5 MB. Devuelve la URL de la sesión.
    async abrirSesionSubida(access, { nombre, mime, tamano, carpetaId, origen }) {
      const r = await f(`${UPLOAD}/files?uploadType=resumable&fields=id`, {
        method: "POST",
        headers: auth(access, {
          "content-type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mime,
          "X-Upload-Content-Length": String(tamano),
          Origin: origen,
        }),
        body: JSON.stringify({ name: nombre, parents: [carpetaId] }),
      });
      if (!r.ok) throw await errorDe(r);
      const url = r.headers.get("location");
      if (!url) throw new GoogleError({ status: 502, error: "sin_sesion" });
      return url;
    },

    async metadatos(access, fileId) {
      return jsonOk(await f(`${API}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent("id,name,size,mimeType,parents,trashed")}`, { headers: auth(access) }));
    },

    // Devuelve la respuesta de Google tal cual (con el cuerpo como stream) para reenviarla sin cargarla en memoria.
    async descargar(access, fileId) {
      const r = await f(`${API}/files/${encodeURIComponent(fileId)}?alt=media`, { headers: auth(access) });
      if (!r.ok) throw await errorDe(r);
      return r;
    },

    // Borrar = papelera de Drive (recuperable), nunca borrado definitivo.
    async papelera(access, fileId) {
      return jsonOk(await f(`${API}/files/${encodeURIComponent(fileId)}?fields=id`, {
        method: "PATCH", headers: auth(access, { "content-type": "application/json" }), body: JSON.stringify({ trashed: true }),
      }));
    },

    // Revoca el permiso en Google. Si ya no estaba vigente, no es un error para nosotros.
    async revocar(token) {
      const r = await post(REVOKE_URL, { token });
      return r.ok || r.status === 400;
    },
  };
}
