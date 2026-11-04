// Pide a /api/oo-config el JWT que OnlyOffice exige para abrir un documento, junto con la URL
// firmada (de corta vida) del archivo en Supabase Storage. Todo lo firma el servidor: el secreto
// del JWT y la service key nunca están en el navegador, y el bucket oo-docs es privado.
import { supabase } from "../supabase";

// Devuelve { token, url }. `config.document.url` se ignora: la URL la decide el servidor.
export async function firmarConfigOO(config) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sin sesión para firmar la config de OnlyOffice");
  const r = await fetch("/api/oo-config", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ config }),
  });
  if (!r.ok) throw new Error(`oo-config ${r.status}`);
  return r.json();
}
