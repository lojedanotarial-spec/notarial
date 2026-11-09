// Drive de la escribanía, lado del navegador: llamadas al servidor (/api/drive). Spec: specs/drive-escribania/.
import { supabase } from "../supabase";
import { apiPost } from "./apiFetch";
import { subirASesion, validarArchivoLocal } from "./driveCliente";

const llamar = (accion, datos = {}) => apiPost("/api/drive", { accion, ...datos });

// Estado del Drive del registro del expediente (o del propio usuario): { conectado, operativa, estado, sin_espacio }.
export const driveEstado = (expedienteId) => llamar("estado", expedienteId ? { expediente_id: expedienteId } : {});

export const driveAdmin = {
  estado: () => llamar("admin_estado"),
  enlace: (registro) => llamar("admin_enlace", { registro_numero: registro }),
  desconectar: (registro) => llamar("admin_desconectar", { registro_numero: registro }),
};

// Sin sesión: lo usa quien recibe el enlace de conexión (el código del enlace es la única autorización).
export async function drivePublico(accion, datos = {}) {
  let res;
  try {
    res = await fetch("/api/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion, ...datos }) });
  } catch {
    throw new Error("Sin conexión. Revisá tu internet y probá de nuevo.");
  }
  let json = null;
  try { json = await res.json(); } catch { /* sin JSON */ }
  if (!res.ok) { const e = new Error(json?.error || `Error del servidor (${res.status})`); e.status = res.status; e.codigo = json?.codigo; throw e; }
  return json;
}

// Los archivos de un expediente. El filtro es explícito (además de la política de la base): solo lo del Drive de la
// escribanía y que no esté borrado.
export async function listarArchivos(expedienteId) {
  const { data, error } = await supabase.from("expediente_archivos").select("*")
    .eq("expediente_id", expedienteId).eq("almacen", "escribania").is("borrado_en", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error("No pude cargar los archivos.");
  return data || [];
}

// Sube un archivo: pide la sesión al servidor, lo manda directo a Google y lo registra. Devuelve la fila del archivo.
export async function subirArchivoEscribania(file, { expedienteId, tipo = "otro", onProgreso } = {}) {
  const v = validarArchivoLocal(file);
  if (!v.ok) throw new Error(v.mensaje);
  const sesion = await llamar("iniciar_subida", { expediente_id: expedienteId, nombre: file.name, mime: file.type, tamano: file.size, tipo });
  const { id } = await subirASesion(sesion.sesion_url, file, sesion.mime, onProgreso);
  const { archivo } = await llamar("confirmar_subida", { expediente_id: expedienteId, drive_file_id: id, tipo: sesion.tipo });
  return archivo;
}

export const borrarArchivoEscribania = (archivoId) => llamar("borrar", { archivo_id: archivoId });

// Corregir a mano el nombre y/o el tipo de un archivo. Devuelve { archivo }.
export const renombrarArchivo = (archivoId, { nombre, tipo }) => llamar("renombrar", { archivo_id: archivoId, nombre, ...(tipo ? { tipo } : {}) });

// ── Subir desde el celular ───────────────────────────────────────────────────

// Desde la compu: abre el QR de un expediente ({ url, expira_en, sesion_id }) y lo cierra.
export const celularCrear = (expedienteId) => llamar("celular_crear", { expediente_id: expedienteId });
export const celularCerrar = (sesionId) => llamar("celular_cerrar", { sesion_id: sesionId });

// Desde el celular (sin sesión: el código del QR es la única autorización).
export const celular = {
  info: (codigo) => drivePublico("celular_info", { codigo }),
  quitar: (codigo, archivoId) => drivePublico("celular_quitar", { codigo, archivo_id: archivoId }),
};

// Sube UN archivo desde el celular: pide la sesión de Google, lo manda directo y lo confirma. Devuelve la fila del archivo.
// El archivo se sube TAL CUAL (calidad original): no se reduce ni se vuelve a comprimir.
export async function subirDesdeCelular(codigo, file, { onProgreso } = {}) {
  const sesion = await drivePublico("celular_iniciar_subida", { codigo, nombre: file.name, mime: file.type, tamano: file.size });
  const { id } = await subirASesion(sesion.sesion_url, file, sesion.mime, onProgreso);
  const { archivo } = await drivePublico("celular_confirmar", { codigo, drive_file_id: id });
  return archivo;
}

// Trae el archivo por el servidor (con la sesión del usuario) como Blob, para mostrarlo o guardarlo.
export async function traerArchivo(archivoId, descargar = false) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Tu sesión venció. Volvé a iniciar sesión.");
  const res = await fetch("/api/drive", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ accion: descargar ? "descargar" : "ver", archivo_id: archivoId }),
  });
  if (!res.ok) {
    let json = null;
    try { json = await res.json(); } catch { /* sin JSON */ }
    throw new Error(json?.error || `Error del servidor (${res.status})`);
  }
  return res.blob();
}

export function guardarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre || "archivo";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
