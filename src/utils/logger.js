import { supabase } from "../supabase";

async function insert(table, row) {
  try {
    await supabase.from(table).insert(row);
  } catch {
    // silent — logging must never break the app
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
