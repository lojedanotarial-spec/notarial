// Exporta las escrituras de todos los lotes de un barrio en un ZIP.
// Usa el MISMO motor que el editor de cada lote (construirVarsLote + buildDocxGenerico), así el
// documento del ZIP sale idéntico al que se ve en pantalla. Antes tenía su propio camino
// (HTML -> docx con otra tipografía) que divergía del editor.
//
// Si el escribano ya editó a mano el documento de un lote en OnlyOffice, se incluye ESE archivo
// (si no, la exportación pisaría su trabajo con una versión regenerada). Si nunca se editó, se
// regenera con los datos actuales del lote.
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "../supabase";
import { construirVarsLote } from "./generarEscritura";
import { buildDocxGenerico } from "./buildDocxGenerico";
import { parseFechaDDMMAAAA } from "./fechas";

// { [lote_id]: document_key } de los lotes con edición manual guardada.
async function documentosEditados(lotes) {
  const ids = lotes.map((l) => l.id).filter(Boolean);
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("documentos")
    .select("lote_id, document_key, tiene_ediciones_manuales")
    .in("lote_id", ids);
  if (error) {
    console.warn("[exportarBarrioZip] no se pudieron leer los documentos guardados:", error.message);
    return {};
  }
  const porLote = {};
  for (const d of data || []) {
    if (d.document_key && d.tiene_ediciones_manuales !== false) porLote[d.lote_id] = d.document_key;
  }
  return porLote;
}

async function descargarDocumento(documentKey) {
  const { data, error } = await supabase.storage.from("oo-docs").download(`${documentKey}.docx`);
  if (error) {
    console.warn(`[exportarBarrioZip] no se pudo descargar ${documentKey}:`, error.message);
    return null;
  }
  return data;
}

export async function exportarBarrioZip({ barrio, lotes, templateHTML, escribano, onProgress }) {
  const zip = new JSZip();
  const folder = zip.folder(barrio.nombre || "barrio");
  const editados = await documentosEditados(lotes);

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i];
    onProgress?.({ actual: i + 1, total: lotes.length, lote });

    let blob = editados[lote.id] ? await descargarDocumento(editados[lote.id]) : null;
    if (!blob) {
      blob = await buildDocxGenerico({
        contenido: templateHTML,
        partes: lote.partes || [],
        escribano,
        fecha: parseFechaDDMMAAAA(lote.fechaEscritura),
        extravars: construirVarsLote(lote, barrio, escribano, lote.nroEscritura),
      });
    }

    const nombre = `Mz_${lote.manzana || "X"}_Lote_${lote.lote || i + 1}.docx`.replace(/[/\\:*?"<>|]/g, "_");
    folder.file(nombre, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${barrio.nombre || "barrio"}_escrituras.zip`);
}
