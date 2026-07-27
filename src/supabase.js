import { createClient } from "@supabase/supabase-js";

// Duplicado a propósito de api/_supabaseConfig.js — este archivo lo empaqueta Vite
// para el frontend, ese lo importan los serverless de api/. Si cambia el proyecto
// de Supabase, actualizar ambos.
const SUPABASE_URL = "https://eueqluhhgvukovoyorrw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
