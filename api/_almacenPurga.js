// Purga del almacén propio (spec: specs/almacenamiento-propio/). Elimina de R2 lo que ya cumplió su plazo:
//   (a) archivos que alguien borró hace más de 30 días (fila en expediente_archivos con borrado_en vencido),
//   (b) objetos de expedientes y lotes que se borraron (los anota un trigger en `archivos_a_purgar`, +30 días).
// Se llama desde el Worker horario de Cloudflare (vía api/captura.js, acción "purgar") y desde el backup diario.
// Orden seguro: primero el objeto, después la fila; si el objeto no se pudo borrar, la fila queda y se reintenta.
import { limitePurgaArchivos, armarAuditoria } from "./_drive.js";
import { registroDeClave, configAlmacen, crearAlmacen } from "./_almacen.js";

// Para los disparadores (Worker horario y backup): purga si el almacén está configurado y NUNCA lanza, así una
// falla del almacén no tumba la purga de capturas ni el backup. Devuelve el resumen o { error }.
export async function purgarArchivosSiHayAlmacen(sb, { env = process.env, crear = crearAlmacen, limite = 100 } = {}) {
  if (!configAlmacen(env)) return { omitida: "sin almacén configurado" };
  try { return await purgarArchivosPropios({ sb, almacen: crear(env), limite }); }
  catch (e) { console.error("purga de archivos falló:", e.message); return { error: e.message }; }
}

export async function purgarArchivosPropios({ sb, almacen, ahora = Date.now(), limite = 50 } = {}) {
  const res = { archivos: 0, huerfanos: 0, errores: 0 };

  async function rastro(clave, datos) {
    try {
      await sb.from("drive_auditoria").insert(armarAuditoria({ registro: registroDeClave(clave), accion: "purgar", detalle: { clave }, ...datos }));
    } catch { /* el historial es de mejor esfuerzo: no frena la purga */ }
  }

  // (a) archivos borrados hace más de 30 días
  const a = await sb.from("expediente_archivos")
    .select("id, clave, expediente_id, lote_id")
    .eq("almacen", "propio").lt("borrado_en", limitePurgaArchivos(ahora)).limit(limite);
  if (a.error) throw new Error(`purga de archivos: ${a.error.message}`);
  for (const f of a.data || []) {
    try {
      if (!registroDeClave(f.clave)) throw new Error("clave inválida"); // nunca se borra algo que no sea una clave definitiva
      await almacen.borrar(f.clave);
      const { error } = await sb.from("expediente_archivos").delete().eq("id", f.id);
      if (error) throw new Error(error.message);
      await rastro(f.clave, { expedienteId: f.expediente_id, loteId: f.lote_id, archivoId: f.id });
      res.archivos++;
    } catch (e) {
      res.errores++;
      console.error("purga: no pude eliminar el archivo", f.id, e.message);
    }
  }

  // (b) objetos de expedientes y lotes ya borrados
  const c = await sb.from("archivos_a_purgar").select("clave").lt("purgar_en", new Date(ahora).toISOString()).limit(limite);
  if (c.error) throw new Error(`purga de la cola: ${c.error.message}`);
  for (const { clave } of c.data || []) {
    try {
      if (!registroDeClave(clave)) throw new Error("clave inválida");
      await almacen.borrar(clave);
      const { error } = await sb.from("archivos_a_purgar").delete().eq("clave", clave);
      if (error) throw new Error(error.message);
      await rastro(clave, {});
      res.huerfanos++;
    } catch (e) {
      res.errores++;
      console.error("purga: no pude eliminar de la cola", clave, e.message);
    }
  }
  return res;
}
