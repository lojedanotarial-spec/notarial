// Estado compartido por los dos editores que muestran un .docx en OnlyOffice
// (EditorScreen: documento suelto; LoteDocScreen: escritura de un lote).
// Antes cada pantalla tenía su copia de estos 5 estados + 6 refs; ahora hay una sola.
//
// Qué resuelve:
//  - qué documento está abierto (documentUrl = ruta en el bucket privado, documentKey = key de OO)
//  - si el escribano editó a mano el documento (hasOoEdits) → antes de regenerar hay que confirmar
//  - ventana de gracia tras (re)generar: el reload del docx dispara un onDocumentStateChange propio
//    que NO es una edición real
//  - la regeneración arranca sola una única vez (generatedOnceRef / skipAutoGenerateRef)
import { useState, useRef, useEffect, useCallback } from "react";

export const VENTANA_GRACIA_MS = 3000;

export function useDocumentoOO({ saltarAutoGenerar = false } = {}) {
  const [documentUrl, setDocumentUrl] = useState(null);
  const [documentKey, setDocumentKey] = useState(null);
  const [generating, setGenerating]   = useState(false);
  const [hasOoEdits, setHasOoEdits]   = useState(false);
  const [pendingRegen, setPendingRegen] = useState(false);

  // Espejo de hasOoEdits para leerlo dentro de callbacks sin que cambien de identidad.
  const hasOoEditsRef = useRef(false);
  // Distinto de hasOoEdits: éste es "pegajoso" para documentos reabiertos (protege contra pisar
  // ediciones viejas). Este ref es solo "hay una edición de ESTA sesión sin persistir": lo que
  // necesita la pantalla para avisar antes de salir.
  const hasUnsavedOoEditRef = useRef(false);
  const generatedOnceRef = useRef(false);
  const skipAutoGenerateRef = useRef(saltarAutoGenerar);
  const ignorarEdicionesHastaRef = useRef(0);
  // Al reabrir un documento, la pantalla vuelca su estado guardado (partes, cláusulas...) y los
  // efectos "regenerar al cambiar X" lo ven como un cambio del usuario. Sin esta ventana, un
  // documento "sin ediciones" se regeneraba solo al abrirlo y, si la plantilla todavía no había
  // llegado, quedaba reemplazado por un docx en blanco (05/11/26).
  const ignorarRegeneracionHastaRef = useRef(0);
  // La pantalla le asigna acá su handleGenerar más reciente.
  const handleGenerarRef = useRef(null);

  useEffect(() => { hasOoEditsRef.current = hasOoEdits; }, [hasOoEdits]);

  // Se llama al terminar de generar y subir un docx nuevo.
  const registrarGenerado = useCallback(({ key, filePath }) => {
    setDocumentUrl(filePath);
    setDocumentKey(key);
    generatedOnceRef.current = true;
    setHasOoEdits(false);
    hasUnsavedOoEditRef.current = false;
    setPendingRegen(false);
    ignorarEdicionesHastaRef.current = Date.now() + VENTANA_GRACIA_MS;
  }, []);

  // Abre un documento ya guardado, sin regenerar. `tieneEdiciones` viene de la columna
  // tiene_ediciones_manuales: null (documentos de antes de esa columna) se asume "sí",
  // de forma conservadora, porque genuinamente no se sabe.
  const abrirExistente = useCallback((documentKeyGuardada, tieneEdiciones) => {
    setDocumentUrl(`${documentKeyGuardada}.docx`);
    setDocumentKey(documentKeyGuardada);
    setHasOoEdits(tieneEdiciones !== false);
    // generatedOnceRef solo lo pone en true handleGenerar, que acá no corre a propósito (no pisar el
    // docx guardado). Sin esto, los cambios del panel no regeneraban nunca un documento reabierto.
    generatedOnceRef.current = true;
    skipAutoGenerateRef.current = true;
    ignorarRegeneracionHastaRef.current = Date.now() + VENTANA_GRACIA_MS;
  }, []);

  // onEdit del OnlyOfficeEditor.
  const alEditar = useCallback(() => {
    if (Date.now() < ignorarEdicionesHastaRef.current) return;
    setHasOoEdits(true);
    hasUnsavedOoEditRef.current = true;
  }, []);

  // Regenera, o pide confirmación si hay ediciones manuales. Devuelve false si todavía no hay
  // un primer documento generado (en ese caso no hace nada).
  const regenerarSiCorresponde = useCallback(() => {
    if (!generatedOnceRef.current) return false;
    if (Date.now() < ignorarRegeneracionHastaRef.current) return true; // carga del documento, no un cambio
    if (hasOoEditsRef.current) setPendingRegen(true);
    else handleGenerarRef.current?.();
    return true;
  }, []);

  const confirmarRegenerar = useCallback(() => {
    setHasOoEdits(false);
    setPendingRegen(false);
    handleGenerarRef.current?.();
  }, []);

  const cancelarRegenerar = useCallback(() => setPendingRegen(false), []);

  return {
    documentUrl, documentKey, generating, setGenerating,
    hasOoEdits, pendingRegen,
    hasUnsavedOoEditRef, generatedOnceRef, skipAutoGenerateRef, handleGenerarRef,
    registrarGenerado, abrirExistente, alEditar,
    regenerarSiCorresponde, confirmarRegenerar, cancelarRegenerar,
  };
}
