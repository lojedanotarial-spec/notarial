// Destrucción de fotos y lecturas de la captura desde el celular. Se usa desde api/captura.js y desde el
// cron del backup (purga de red de seguridad). Spec: specs/captura-documentos-celular/.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./_supabaseConfig.js";
import { debePurgarse, ESTADO_AL_PURGAR } from "./_captura.js";

export const BUCKET = "capturas";

export function clienteServicio() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_KEY");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Borra las fotos del Storage (incluida cualquier huérfana de la carpeta) y vacía fotos y resultado.
export async function destruirCaptura(sb, captura, estadoFinal) {
  const rutas = new Set((captura.fotos || []).map((f) => f.path).filter(Boolean));
  const { data: lista } = await sb.storage.from(BUCKET).list(captura.id, { limit: 100 });
  for (const o of lista || []) rutas.add(`${captura.id}/${o.name}`);
  if (rutas.size) {
    const { error } = await sb.storage.from(BUCKET).remove([...rutas]);
    if (error) throw new Error(`No pude borrar las fotos: ${error.message}`);
  }
  const { error } = await sb.from("capturas")
    .update({ fotos: [], resultado: null, estado: estadoFinal || ESTADO_AL_PURGAR(captura) })
    .eq("id", captura.id);
  if (error) throw new Error(`No pude vaciar la captura: ${error.message}`);
}

// Destruye todo lo que ya pasó su tope de 24 h (o terminó y todavía guarda algo). Devuelve cuántas limpió.
export async function purgarVencidas(sb, limite = 50) {
  const ahora = new Date().toISOString();
  const columnas = "id, estado, fotos, resultado, purgar_en";
  // (a) en curso y pasado el tope de 24 h · (b) terminadas que todavía guardan la lectura
  const [vencidas, terminadas] = await Promise.all([
    sb.from("capturas").select(columnas).not("estado", "in", "(entregada,cancelada,vencida)").lte("purgar_en", ahora).limit(limite),
    sb.from("capturas").select(columnas).in("estado", ["entregada", "cancelada", "vencida"]).not("resultado", "is", null).limit(limite),
  ]);
  const error = vencidas.error || terminadas.error;
  if (error) throw new Error(`purga: ${error.message}`);
  let n = 0;
  for (const c of [...(vencidas.data || []), ...(terminadas.data || [])]) {
    if (!debePurgarse(c)) continue;
    try { await destruirCaptura(sb, c); n++; } catch (e) { console.error("purga falló para", c.id, e.message); }
  }
  return n;
}
