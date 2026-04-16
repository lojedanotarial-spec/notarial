import { useState, useCallback } from "react";

/**
 * usePagination
 * Maneja el array de páginas del documento.
 * Cada página tiene: { id, content (HTML string) }
 * La detección de overflow y migración de nodos se hace en PageEditor.
 */
export function usePagination(initialHTML) {
  const [pages, setPages] = useState([
    { id: 1, content: initialHTML },
  ]);

  // Actualiza el contenido HTML de una página específica
  const updatePage = useCallback((id, content) => {
    setPages(prev =>
      prev.map(p => p.id === id ? { ...p, content } : p)
    );
  }, []);

  // Agrega una página nueva al final con contenido opcional
  const addPage = useCallback((afterId, content = "<p></p>") => {
    setPages(prev => {
      const idx = prev.findIndex(p => p.id === afterId);
      if (idx === -1) return prev;
      const newId = Date.now();
      const next = [...prev];
      next.splice(idx + 1, 0, { id: newId, content });
      return next;
    });
  }, []);

  // Elimina una página si está vacía (y no es la primera)
  const removePage = useCallback((id) => {
    setPages(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(p => p.id !== id);
    });
  }, []);

  // Prepend content al inicio de la página siguiente
  const prependToPage = useCallback((id, content) => {
    setPages(prev =>
      prev.map(p => p.id === id ? { ...p, content } : p)
    );
  }, []);

  return { pages, updatePage, addPage, removePage, prependToPage };
}
