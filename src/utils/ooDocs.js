// Documentos del editor (OnlyOffice) en el bucket privado `oo-docs`.
import { supabase } from "../supabase";
import { DOCX_MIME } from "./docxMime";

// Sube un .docx recién generado con una key nueva. Devuelve { key, filePath }:
// filePath es la ruta en el bucket (el editor pide la URL firmada a /api/oo-config).
export async function subirDocxOO(blob) {
  const key = `doc-${Date.now()}`;
  const filePath = `${key}.docx`;
  const { error } = await supabase.storage
    .from("oo-docs")
    .upload(filePath, blob, { contentType: DOCX_MIME, upsert: true });
  if (error) throw new Error(`Error al subir archivo: ${error.message}`);
  return { key, filePath };
}
