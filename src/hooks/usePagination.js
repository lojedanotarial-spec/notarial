import { useState, useCallback } from "react";

export function usePagination(initialHTML) {
  const [pages, setPages] = useState([
    { id: Date.now(), content: initialHTML },
  ]);

  const updatePage = useCallback((id, content) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, content } : p));
  }, []);

  const addPage = useCallback((afterId, content = "<p></p>") => {
    setPages(prev => {
      const idx = prev.findIndex(p => p.id === afterId);
      if (idx === -1) return prev;
      const newPage = { id: Date.now(), content };
      const next = [...prev];
      next.splice(idx + 1, 0, newPage);
      return next;
    });
  }, []);

  const removePage = useCallback((id) => {
    setPages(prev => prev.length <= 1 ? prev : prev.filter(p => p.id !== id));
  }, []);

  /**
   * Mueve el contenido de la página `id` al final de la página anterior,
   * luego elimina `id`. Usado en underflow para merge hacia atrás.
   */
  const mergeWithPrev = useCallback((id, contentToMerge) => {
    setPages(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(p => p.id === id);
      if (idx <= 0) return prev;

      const prevPage = prev[idx - 1];
      // Limpiar el <p></p> vacío del final de la página anterior
      const prevContent = prevPage.content.replace(/<p>\s*<\/p>\s*$/, "");
      // Limpiar el <p></p> inicial del contenido que se merge
      const mergeContent = contentToMerge.replace(/^<p>\s*<\/p>/, "");

      const merged = prevContent + (mergeContent || "");

      return prev
        .map(p => p.id === prevPage.id ? { ...p, content: merged } : p)
        .filter(p => p.id !== id);
    });
  }, []);

  // Reset: volver a 1 página con nuevo contenido
  const reset = useCallback((html) => {
    setPages([{ id: Date.now(), content: html }]);
  }, []);

  return { pages, updatePage, addPage, removePage, mergeWithPrev, reset };
}