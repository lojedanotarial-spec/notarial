import { supabase } from "../supabase";

async function insert(table, row) {
  try {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw error;
    return data;
  } catch {
    // silent — logging must never break the app
    return null;
  }
}

export function logError(type, message, { stack, screen, context } = {}) {
  return insert("error_logs", { type, message, stack, screen, context });
}

export function logScriba({ slug, screen, input, response, duration_ms, error, is_fallback }) {
  return insert("scriba_logs", {
    slug,
    screen,
    user_input: input,
    response,
    duration_ms,
    error,
    is_fallback: is_fallback || false,
  });
}

export async function logFeedback({ description, category, screen, context }) {
  const { error } = await supabase.from("feedback_reports").insert({
    description,
    category: category || "error",
    screen,
    context,
  });
  if (error) throw error;
}

// Valoración 👍/👎 sobre una respuesta puntual de Scriba (referencia scriba_logs.id).
// Upsert: un usuario puede corregir su voto sobre la misma respuesta.
export async function submitScribaFeedback({ scribaLogId, valoracion, comentario }) {
  if (!scribaLogId) return;
  try {
    await supabase.from("scriba_feedback").upsert(
      { scriba_log_id: scribaLogId, valoracion, comentario: comentario || null },
      { onConflict: "scriba_log_id,usuario_id" }
    );
  } catch {
    // silent — el feedback nunca debe romper el chat
  }
}
