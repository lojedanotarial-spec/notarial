// Config compartida de Supabase para los serverless de api/ — un solo lugar para
// rotar/cambiar de proyecto en vez de 4 archivos. No son secretos: la anon key
// está diseñada para ser pública, RLS es lo que protege los datos.
export const SUPABASE_URL      = "https://eueqluhhgvukovoyorrw.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZXFsdWhoZ3Z1a292b3lvcnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjI3NjQsImV4cCI6MjA5MjE5ODc2NH0.RklZOhSt8DqUhRCqlLNQ0OyLNrUGKYXHaogOkRLCz6E";
