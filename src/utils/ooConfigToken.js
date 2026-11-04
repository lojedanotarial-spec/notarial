// Pide a /api/oo-config el JWT que OnlyOffice exige para abrir un documento.
// El secreto del JWT nunca está en el navegador: lo firma el servidor, solo para usuarios logueados.
import { supabase } from "../supabase";

export async function firmarConfigOO(config) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sin sesión para firmar la config de OnlyOffice");
  const r = await fetch("/api/oo-config", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ config }),
  });
  if (!r.ok) throw new Error(`oo-config ${r.status}`);
  const { token } = await r.json();
  return token;
}
