// Vincula un documento con su expediente (tabla expediente_documentos). Es idempotente: si el vínculo ya existe no hace nada,
// así se puede llamar en cada guardado sin duplicar. Devuelve { ok, yaExistia?, error? }.
// Spec: specs/personas-expediente/ (el documento creado desde un expediente queda vinculado desde el primer guardado).
export async function vincularDocumentoAExpediente(supabase, expedienteId, docId) {
  if (!expedienteId || !docId) return { ok: false, error: "Falta el expediente o el documento." };
  const { data: existente, error: errBuscar } = await supabase.from("expediente_documentos")
    .select("id").eq("expediente_id", expedienteId).eq("documento_id", docId).maybeSingle();
  if (errBuscar) return { ok: false, error: errBuscar.message };
  if (existente) return { ok: true, yaExistia: true };
  const { error } = await supabase.from("expediente_documentos").insert({ expediente_id: expedienteId, documento_id: docId });
  // 23505 = ya estaba (otra pestaña o un guardado en paralelo lo creó): para nosotros es lo mismo.
  if (error && error.code !== "23505") return { ok: false, error: error.message };
  return { ok: true, yaExistia: !!error };
}
