import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";
import { Variable } from "../extensions/Variable";
import { A4W, A4H, PROT, NOPROT, mm } from "../constants";

const LINE_HEIGHT_PT = 24;
const LINE_HEIGHT_PX = LINE_HEIGHT_PT * (96 / 72);

function PaginaFondo({ src }) {
  return (
    <img
      src={src}
      alt=""
      style={{
        position: "absolute", inset: 0,
        width: A4W, height: A4H,
        display: "block", pointerEvents: "none", zIndex: 1,
      }}
    />
  );
}

export function PageEditor({
  page,
  pageIndex,
  hojaOn,
  margenKey,
  fuente,
  fontSize,
  zoom,
  activeEditor,
  showVariables,
  onOverflow,
  onUpdate,
}) {
  const isAnverso = pageIndex % 2 === 0;
  const margen    = margenKey === "protocolar" ? PROT : NOPROT;
  const boxL = isAnverso ? margen.left  : margen.right;
  const boxR = isAnverso ? margen.right : margen.left;
  const boxT = margen.top;
  const boxW = A4W - boxR - boxL;
  const boxH = A4H - margen.bottom - boxT;

console.log("showVariables:", showVariables, "page:", page.id);

  const overflowRef  = useRef(false);
  const editorBoxRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: true }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["paragraph"] }),
      FontFamily,
      TextStyle,
      Variable,
    ],
    content: page.content,
    editorProps: {
      attributes: {
        style: [
          "font-family: " + fuente.family,
          "font-size: " + fontSize + "pt",
          "line-height: " + LINE_HEIGHT_PX + "px",
          "text-align: justify",
          "color: #1a2332",
          "outline: none",
          "word-break: break-word",
          "padding-left: " + mm(2) + "px",
          "padding-right: " + mm(2) + "px",
          "padding-top: " + (LINE_HEIGHT_PX * 0.1) + "px",
          "box-sizing: border-box",
          "min-height: " + boxH + "px",
        ].join("; "),
      },
    },
    onFocus: () => {
      if (activeEditor) activeEditor.current = editor;
    },
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(ed.getHTML());
      checkOverflow(ed);
    },
  }, [page.id]);

  // Sincronizar contenido externo (cuando cambian datos del panel)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== page.content) {
      editor.commands.setContent(page.content, false);
    }
  }, [page.content, editor]);

  // Registrar editor activo al montar
  useEffect(() => {
    if (editor && activeEditor) activeEditor.current = editor;
  }, [editor]);

  // Toggle visibilidad de variables
  useEffect(() => {
      if (!editor) return;
      let style = document.getElementById("var-style-" + page.id);
      if (!style) {
        style = document.createElement("style");
        style.id = "var-style-" + page.id;
        document.head.appendChild(style);
      }
      if (showVariables) {
        style.textContent = "";
      } else {
        style.textContent = "#page-" + page.id + " span[data-variable] { color: #1a2332 !important; text-decoration: none !important; font-weight: inherit !important; }";
      }
    }, [showVariables, page.id, editor]);

  const checkOverflow = useCallback((ed) => {
    if (!editorBoxRef.current || overflowRef.current) return;
    const domEl = editorBoxRef.current.querySelector(".tiptap");
    if (!domEl) return;
    if (domEl.scrollHeight <= boxH + 2) return;

    overflowRef.current = true;

    const { doc } = ed.state;
    const nodes = [];
    doc.forEach(node => nodes.push(node));

    if (nodes.length === 0) { overflowRef.current = false; return; }

    if (nodes.length === 1 && nodes[0].type.name === "paragraph") {
      const paragraph = nodes[0];
      const inlines   = [];
      paragraph.forEach(child => inlines.push(child));

      let cutAt = inlines.length;
      while (cutAt > 0) {
        const div = document.createElement("div");
        div.style.cssText = [
          "position:absolute", "visibility:hidden", "top:-9999px",
          "width:" + boxW + "px",
          "font-family:" + fuente.family,
          "font-size:" + fontSize + "pt",
          "line-height:" + LINE_HEIGHT_PX + "px",
          "word-break:break-word",
          "padding:" + (LINE_HEIGHT_PX * 0.1) + "px " + mm(2) + "px",
          "box-sizing:border-box",
        ].join(";");
        div.innerHTML = "<p style='margin:0'>" +
          inlines.slice(0, cutAt).map(n => inlineToHTML(n)).join("") +
          "</p>";
        document.body.appendChild(div);
        const fits = div.scrollHeight <= boxH + 2;
        document.body.removeChild(div);
        if (fits) break;
        cutAt--;
      }

      if (cutAt <= 0 || cutAt >= inlines.length) {
        overflowRef.current = false;
        return;
      }

      const keepHTML    = "<p>" + inlines.slice(0, cutAt).map(inlineToHTML).join("") + "</p>";
      const overflowHTML = "<p>" + inlines.slice(cutAt).map(inlineToHTML).join("") + "</p>";

      ed.commands.setContent(keepHTML, false);
      onOverflow?.(overflowHTML);

    } else {
      // Múltiples párrafos: cortar por párrafo
      let cutPara = nodes.length - 1;
      while (cutPara > 0) {
        const div = document.createElement("div");
        div.style.cssText = "position:absolute;visibility:hidden;top:-9999px;width:" + boxW + "px;" +
          "font-family:" + fuente.family + ";font-size:" + fontSize + "pt;" +
          "line-height:" + LINE_HEIGHT_PX + "px;word-break:break-word;" +
          "padding:" + (LINE_HEIGHT_PX * 0.1) + "px " + mm(2) + "px;box-sizing:border-box;";
        div.innerHTML = nodes.slice(0, cutPara)
          .map(n => "<p style='margin:0'>" + n.textContent + "</p>").join("");
        document.body.appendChild(div);
        const fits = div.scrollHeight <= boxH + 2;
        document.body.removeChild(div);
        if (fits) break;
        cutPara--;
      }

      const overflowHTML = nodes.slice(cutPara)
        .map(n => "<p>" + n.textContent + "</p>").join("");
      const keepHTML = nodes.slice(0, cutPara)
        .map(n => "<p>" + n.textContent + "</p>").join("") || "<p></p>";

      ed.commands.setContent(keepHTML, false);
      onOverflow?.(overflowHTML);
    }

    overflowRef.current = false;
  }, [boxH, boxW, fuente, fontSize, onOverflow]);

  const label = isAnverso
    ? "Anverso · Página " + (pageIndex + 1)
    : "Reverso · Página " + (pageIndex + 1);

  return (
    <div>
      <div className="no-print" style={{
        fontSize: 12, fontWeight: 600, letterSpacing: ".07em",
        textTransform: "uppercase", color: "rgba(26,35,50,1)",
        marginBottom: 8, textAlign: "center",
      }}>
        {label}
      </div>

      <div style={{
        transform: "scale(" + zoom + ")",
        transformOrigin: "top center",
        width: A4W, height: A4H, flexShrink: 0,
        marginBottom: zoom < 1 ? (-(1 - zoom) * A4H) + "px" : 0,
      }}>
        <div
          ref={editorBoxRef}
          style={{
            position: "relative", width: A4W, height: A4H,
            background: "#fff", boxShadow: "0 2px 16px rgba(26,35,50,.13)",
            overflow: "hidden",
          }}
        >
          {hojaOn && margenKey === "protocolar" && (
            <PaginaFondo src={isAnverso ? "/Protocolo_Front.png" : "/Protocolo_Back.png"} />
          )}

          <style>{`
            #page-${page.id} .tiptap {
              position: absolute;
              left: ${boxL}px;
              top: ${boxT}px;
              width: ${boxW}px;
              height: ${boxH}px;
              overflow: hidden;
              font-family: ${fuente.family};
              font-size: ${fontSize}pt;
              line-height: ${LINE_HEIGHT_PX}px;
              text-align: justify;
              color: #1a2332;
              outline: none;
              word-break: break-word;
              padding-left: ${mm(2)}px;
              padding-right: ${mm(2)}px;
              padding-top: ${LINE_HEIGHT_PX * 0.1}px;
              box-sizing: border-box;
            }
            #page-${page.id} .tiptap p { margin: 0; padding: 0; }
            #page-${page.id} .tiptap:focus { outline: none; }
            #page-${page.id} .var-filled {
              color: ${showVariables ? "#3a7ca5" : "#1a2332"};
              font-weight: ${showVariables ? "700" : "inherit"};
              text-decoration: ${showVariables ? "underline" : "none"};
              text-decoration-style: dotted;
              text-underline-offset: 3px;
              cursor: default;
            }
            #page-${page.id} .var-empty {
              color: ${showVariables ? "#c0392b" : "#1a2332"};
              font-weight: ${showVariables ? "700" : "inherit"};
              text-decoration: ${showVariables ? "underline" : "none"};
              text-decoration-style: dotted;
              text-underline-offset: 3px;
              cursor: default;
            }
          `}</style>

          <style>{`
          #page-${page.id} .var-filled {
            color: ${showVariables ? "#3a7ca5" : "#1a2332"} !important;
            font-weight: ${showVariables ? "700" : "400"} !important;
            text-decoration: ${showVariables ? "underline" : "none"} !important;
            text-decoration-style: dotted;
            text-underline-offset: 3px;
            cursor: default;
          }
          #page-${page.id} .var-empty {
            color: ${showVariables ? "#c0392b" : "#1a2332"} !important;
            font-weight: ${showVariables ? "700" : "400"} !important;
            text-decoration: ${showVariables ? "underline" : "none"} !important;
            text-decoration-style: dotted;
            text-underline-offset: 3px;
            cursor: default;
          }
          `}</style>


          <div id={"page-" + page.id} style={{ position: "absolute", inset: 0, zIndex: 2 }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Convierte un nodo inline de ProseMirror a HTML string
function inlineToHTML(n) {
  if (n.type.name === "text") {
    let html = escapeHtml(n.text || "");
    if (n.marks) {
      n.marks.forEach(mark => {
        if (mark.type.name === "bold")      html = "<strong>" + html + "</strong>";
        if (mark.type.name === "italic")    html = "<em>" + html + "</em>";
        if (mark.type.name === "underline") html = "<u>" + html + "</u>";
      });
    }
    return html;
  }
  if (n.type.name === "variable") {
    const isEmpty = n.attrs.empty || !n.attrs.value;
    const style = isEmpty
      ? "color:#c0392b;font-weight:700;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;"
      : "color:#3a7ca5;font-weight:700;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;";
    return '<span data-variable data-label="' + n.attrs.label + '" style="' + style + '">' +
      (isEmpty ? "{{" + n.attrs.label + "}}" : n.attrs.value) + "</span>";
  }
  return "";
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
