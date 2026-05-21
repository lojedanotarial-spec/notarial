import { useEffect, useRef, useState } from "react";

export function OnlyOfficeEditor({ documentUrl, documentKey, documentTitle, serverUrl }) {
  const editorRef    = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!documentUrl || !serverUrl) return;

    if (editorRef.current) {
      try { editorRef.current.destroyEditor(); } catch {}
      editorRef.current = null;
    }
    setReady(false);

    const createEditor = () => {
      if (!window.DocsAPI) return;
      editorRef.current = new window.DocsAPI.DocEditor("oo-container", {
        document: {
          fileType: "docx",
          key:      documentKey,
          title:    documentTitle || "Documento notarial",
          url:      documentUrl,
          permissions: { edit: true, print: true, download: true },
        },
        documentType: "word",
        editorConfig: {
          mode: "edit",
          lang: "es",
          customization: {
            autosave:       false,
            compactToolbar: true,
            toolbarNoTabs:  true,
            hideRightMenu:  true,
            hideRulers:     true,
            zoom:           100,
            spellcheck:     true,
          },
        },
        height: "100%",
        width:  "100%",
        events: {
          onAppReady:     () => setReady(true),
          onReady:        () => setReady(true),
          onDocumentReady:() => setReady(true),
          onError:        (e) => console.error("[OO] error:", e?.data),
          onWarning:      (e) => console.warn("[OO] warning:", e),
        },
      });
    };

    if (window.DocsAPI) {
      createEditor();
      return () => {
        if (editorRef.current) {
          try { editorRef.current.destroyEditor(); } catch {}
          editorRef.current = null;
        }
      };
    }

    const old = document.getElementById("oo-api-script");
    if (old) old.remove();

    const script = document.createElement("script");
    script.id  = "oo-api-script";
    script.src = `${serverUrl}/web-apps/apps/api/documents/api.js`;
    script.onerror = () => console.error("[OO] Error cargando api.js desde", serverUrl);
    script.onload  = createEditor;
    document.head.appendChild(script);

    return () => {
      if (editorRef.current) {
        try { editorRef.current.destroyEditor(); } catch {}
        editorRef.current = null;
      }
      const s = document.getElementById("oo-api-script");
      if (s) s.remove();
    };
  }, [documentUrl, documentKey, serverUrl]);

  if (!documentUrl) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f0ece3", flexDirection: "column", gap: 14,
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
             stroke="#c9a961" strokeWidth="1.5" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="10" y1="9"  x2="8" y2="9"/>
        </svg>
        <div style={{ fontSize: 15, color: "#1a2332", fontWeight: 600,
                      fontFamily: "'Montserrat',sans-serif" }}>
          Completá los datos del panel y hacé clic en <strong>Generar documento</strong>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: "relative", display: "flex" }}>
      {!ready && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#f0ece3", fontFamily: "'Montserrat',sans-serif",
          fontSize: 14, color: "#1a2332",
        }}>
          Cargando editor...
        </div>
      )}
      <div id="oo-container" style={{ flex: 1 }} />
    </div>
  );
}
