/**
 * Helper para Google Drive API.
 * Usa el provider token de la sesión de Supabase (OAuth Google con scope drive.file).
 * Solo puede acceder a archivos que la app creó — no al Drive completo del usuario.
 */

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";

function getToken(session) {
  const token = session?.provider_token;
  if (!token) throw new Error("No hay token de Drive. Re-autenticá con Google.");
  return token;
}

/**
 * Crea una carpeta en Drive. Devuelve el folder ID.
 */
export async function crearCarpetaDrive(session, nombre, parentId = null) {
  const token = getToken(session);
  const meta = {
    name: nombre,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentId ? { parents: [parentId] } : {}),
  };
  const res = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  if (!res.ok) throw new Error(`Error creando carpeta Drive: ${res.status}`);
  const data = await res.json();
  return data.id;
}

/**
 * Sube un archivo a Drive. Devuelve el file ID.
 * @param {Session} session - sesión de Supabase con provider_token
 * @param {Blob|File} blob - contenido del archivo
 * @param {string} nombre - nombre del archivo
 * @param {string} mimeType - tipo MIME
 * @param {string} folderId - carpeta destino (opcional)
 */
export async function subirArchivoDrive(session, blob, nombre, mimeType, folderId = null) {
  const token = getToken(session);

  // Multipart upload: metadata + contenido
  const meta = {
    name: nombre,
    ...(folderId ? { parents: [folderId] } : {}),
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
  form.append("file", blob, nombre);

  const res = await fetch(`${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,webViewLink`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Error subiendo a Drive: ${res.status}`);
  return await res.json(); // { id, name, webViewLink }
}

/**
 * Obtiene la URL de descarga directa de un archivo de Drive.
 */
export function urlDescargaDrive(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Lista los archivos de una carpeta de Drive.
 */
export async function listarArchivosDrive(session, folderId) {
  const token = getToken(session);
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name,mimeType,webViewLink,createdTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Error listando Drive: ${res.status}`);
  const data = await res.json();
  return data.files || [];
}

/**
 * Elimina un archivo de Drive.
 */
export async function eliminarArchivoDrive(session, fileId) {
  const token = getToken(session);
  await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
