import { useEffect, useRef, useState, useCallback } from "react";

export function OnlyOfficeEditor({ documentUrl, documentKey, documentTitle, serverUrl }) {
  const editorRef       = useRef(null);
  const reconnectTimer  = useRef(null);
  const [ready, setReady]             = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const createEditor = useCallback(() => {
    if (!window.DocsAPI || !documentUrl) return;

    if (editorRef.current) {
      try { editorRef.current.destroyEditor(); } catch {}
      editorRef.current = null;
    }

    const container = document.getElementById("oo-container");
    if (container) container.innerHTML = "";
    console.log("[OO] createEditor — url:", documentUrl?.slice(0, 60), "key:", documentKey);

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
        plugins: {
          autostart:   [],
          pluginsData: [`${serverUrl}/sdkjs-plugins/notarial-plugin/config.json`],
        },
        customization: {
          autosave:      false,
          hideRightMenu: true,
          hideRulers:    true,
          zoom:          100,
          features: { spellcheck: true },
        },
      },
      height: "100%",
      width:  "100%",
      events: {
        onAppReady:     () => { console.log("[OO] onAppReady fired"); setReady(true); setReconnecting(false); },
        onReady:        () => { console.log("[OO] onReady fired"); setReady(true); setReconnecting(false); },
        onDocumentReady:() => { console.log("[OO] onDocumentReady fired"); setReady(true); setReconnecting(false); },
        onError: (e) => {
          console.error("[OO] error:", e?.data);
          setReady(false);
          setReconnecting(true);
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
          reconnectTimer.current = setTimeout(() => {
            createEditor();
          }, 12000);
        },
        onWarning: (e) => console.warn("[OO] warning:", e),
      },
    });
  }, [documentUrl, documentKey, documentTitle]);

  useEffect(() => {
    if (!documentUrl || !serverUrl) return;

    setReady(false);
    setReconnecting(false);

    if (window.DocsAPI) {
      createEditor();
      return () => {
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        if (editorRef.current) {
          try { editorRef.current.destroyEditor(); } catch {}
          editorRef.current = null;
        }
      };
    }

    const old = document.getElementById("oo-api-script");
    if (old) old.remove();

    const loadScript = () => {
      const existing = document.getElementById("oo-api-script");
      if (existing) existing.remove();
      const script = document.createElement("script");
      script.id  = "oo-api-script";
      script.src = `${serverUrl}/web-apps/apps/api/documents/api.js`;
      script.onerror = () => {
        console.warn("[OO] api.js no disponible, reintentando en 5s...");
        setReconnecting(true);
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(loadScript, 5000);
      };
      script.onload = () => { setReconnecting(false); createEditor(); };
      document.head.appendChild(script);
    };
    loadScript();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (editorRef.current) {
        try { editorRef.current.destroyEditor(); } catch {}
        editorRef.current = null;
      }
      const s = document.getElementById("oo-api-script");
      if (s) s.remove();
    };
  }, [documentUrl, documentKey, serverUrl, createEditor]);

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
          Preparando documento...
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: "relative", display: "flex" }}>
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        display: (!ready || reconnecting) ? "flex" : "none",
        alignItems: "center", justifyContent: "center",
        background: "#f0ece3", fontFamily: "'Montserrat',sans-serif",
        fontSize: 14, color: "#1a2332", flexDirection: "column", gap: 10,
      }}>
        <div>{reconnecting ? "Reconectando editor..." : "Cargando editor..."}</div>
        {reconnecting && (
          <button
            onClick={() => { setReconnecting(false); createEditor(); }}
            style={{
              marginTop: 8, padding: "6px 18px", borderRadius: 7, border: "none",
              background: "#1a5276", color: "#fff", cursor: "pointer",
              fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 13,
            }}
          >
            Reconectar ahora
          </button>
        )}
      </div>
      <div id="oo-container" style={{ flex: 1 }} />
    </div>
  );
}
