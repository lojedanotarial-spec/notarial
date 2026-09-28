import { supabase } from "../supabase";
import { buscarOCrearCarpetaDrive } from "./driveHelper";

/**
 * Resuelve (y crea si hace falta) la carpeta de Drive de un lote,
 * respetando la jerarquía "Notarial" -> barrio -> "Manzana N" -> "Lote N".
 * Cachea barrio.drive_folder_id en la tabla `barrios` directamente
 * (columna real); el driveFolderId del lote lo persiste quien llama,
 * porque vive dentro de datos_json y esta función no tiene el objeto
 * completo del lote para actualizarlo.
 */
export async function obtenerCarpetaLoteDrive(session, { barrio, lote }) {
  const raizId = await buscarOCrearCarpetaDrive(session, "Notarial");

  let barrioFolderId = barrio.drive_folder_id;
  if (!barrioFolderId) {
    barrioFolderId = await buscarOCrearCarpetaDrive(session, barrio.nombre, raizId);
    await supabase.from("barrios").update({ drive_folder_id: barrioFolderId }).eq("id", barrio.id);
  }

  const manzanaFolderId = await buscarOCrearCarpetaDrive(
    session, `Manzana ${lote.manzana || "?"}`, barrioFolderId
  );

  let loteFolderId = lote.driveFolderId;
  if (!loteFolderId) {
    loteFolderId = await buscarOCrearCarpetaDrive(session, `Lote ${lote.lote || "?"}`, manzanaFolderId);
  }

  return { barrioFolderId, manzanaFolderId, loteFolderId };
}
