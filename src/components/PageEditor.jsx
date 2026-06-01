import { useEffect, useRef } from "react";
import { EditorState }        from "prosemirror-state";
import { EditorView }         from "prosemirror-view";
import { Schema, DOMParser, DOMSerializer, Fragment } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes }       from "prosemirror-schema-list";
import { history, undo, redo } from "prosemirror-history";
import { keymap }             from "prosemirror-keymap";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { A4W, A4H, PROT, NOPROT, mm } from "../constants";

const LINE_HEIGHT_PX = 32;

export const schemaWithLists = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block").append({
    variable: {
      attrs: { label: { default: "" }, value: { default: "" }, empty: { default: true } },
      inline: true, atom: true, group: "inline",
      toDOM(node) {
        const isEmpty = node.attrs.empty || !node.attrs.value;
        return ["span", {
          "data-variable": "", "data-label": node.attrs.label,
          class: isEmpty ? "var-empty" : "var-filled",
          style: isEmpty
            ? "color:#c0392b;font-weight:700;text-decoration:underline dotted;text-underline-offset:3px;cursor:default;"
            : "color:#3a7ca5;font-weight:700;text-decoration:underline dotted;text-underline-offset:3px;cursor:default;",
        }, isEmpty ? `{{${node.attrs.label}}}` : node.attrs.value];
      },
      parseDOM: [{ tag: "span[data-variable]", getAttrs(dom) {
        return {
          label: dom.getAttribute("data-label") || "",
          value: dom.textContent?.startsWith("{{") ? "" : dom.textContent || "",
          empty: dom.textContent?.startsWith("{{") ?? true,
        };
      }}],
    },
  }),
  marks: basicSchema.spec.marks.append({
    highlight: {
      attrs: { color: { default: "rgba(201,169,97,.2)" } },
      toDOM(mark) { return ["mark", { style: `background-color:${mark.attrs.color};` }]; },
      parseDOM: [{ tag: "mark", getAttrs: dom => ({ color: dom.style.backgroundColor || "rgba(201,169,97,.2)" }) }],
    },
    fontFamily: {
      attrs: { family: { default: "" } },
      toDOM(mark) { return ["span", { style: `font-family:${mark.attrs.family};` }]; },
      parseDOM: [{ tag: "span[style]", getAttrs: dom => {
        const ff = dom.style.fontFamily; return ff ? { family: ff } : false;
      }}],
    },
    fontSize: {
      attrs: { size: { default: "" } },
      toDOM(mark) { return ["span", { style: `font-size:${mark.attrs.size};` }]; },
      parseDOM: [{ tag: "span[style]", getAttrs: dom => {
        const fs = dom.style.fontSize; return fs ? { size: fs } : false;
      }}],
    },
  }),
});

const serializer = DOMSerializer.fromSchema(schemaWithLists);
const domParser  = DOMParser.fromSchema(schemaWithLists);

export function docToHTML(doc) {
  const div = document.createElement("div");
  div.appendChild(serializer.serializeFragment(doc.content));
  return div.innerHTML;
}

export function htmlToDoc(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "<p></p>";
  return domParser.parse(div);
}

function buildKeymap(schema) {
  const keys = { ...baseKeymap };
  keys["Mod-z"] = undo;
  keys["Mod-y"] = redo;
  keys["Shift-Mod-z"] = redo;
  keys["Mod-b"] = toggleMark(schema.marks.strong);
  keys["Mod-i"] = toggleMark(schema.marks.em);
  return keymap(keys);
}

export function PageEditor({ content, margenKey, fuente, fontSize, showVariables, onUpdate, onEditorReady }) {
  const mountRef = useRef(null);
  const viewRef  = useRef(null);

  const margen = margenKey === "protocolar" ? PROT : NOPROT;

  useEffect(() => {
    if (!mountRef.current) return;
    const doc   = htmlToDoc(content);
    const state = EditorState.create({
      doc,
      plugins: [history(), buildKeymap(schemaWithLists), keymap(baseKeymap)],
    });
    const view = new EditorView(mountRef.current, {
      state,
      dispatchTransaction(tr) {
        const newState = view.state.apply(tr);
        view.updateState(newState);
        if (tr.docChanged) onUpdate?.(docToHTML(newState.doc));
      },
    });
    viewRef.current = view;
    onEditorReady?.(view);
    return () => { view.destroy(); viewRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = docToHTML(view.state.doc);
    if (current === content) return;
    const newDoc = htmlToDoc(content);
    const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, newDoc.content);
    view.dispatch(tr);
  }, [content]);

  return (
    <>
      <style>{`
        .notarial-page {
          width: ${A4W}px;
          min-height: ${A4H}px;
          background-color: #fff;
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(240,236,227,.75) 0px,
            rgba(240,236,227,.75) ${margen.top}px,
            transparent ${margen.top}px,
            transparent ${A4H - margen.bottom}px,
            rgba(240,236,227,.75) ${A4H - margen.bottom}px,
            rgba(200,194,182,.9) ${A4H - 1}px,
            rgba(200,194,182,.9) ${A4H}px
          );
          box-shadow: 0 2px 16px rgba(26,35,50,.15);
          position: relative;
          box-sizing: border-box;
          padding-top: ${margen.top}px;
          padding-bottom: ${margen.bottom}px;
          padding-left: ${margen.left}px;
          padding-right: ${margen.right}px;
        }
        .notarial-page .ProseMirror {
          font-family: ${fuente.family};
          font-size: ${fontSize}pt;
          line-height: ${LINE_HEIGHT_PX}px;
          color: #1a2332;
          outline: none;
          word-break: break-word;
          white-space: normal;
          text-align: justify;
          min-height: ${LINE_HEIGHT_PX * 24}px;
        }
        .notarial-page .ProseMirror p { margin: 0; padding: 0; }
        .notarial-page .ProseMirror:focus { outline: none; }
        .notarial-page .var-filled {
          color: ${showVariables ? "#3a7ca5" : "#1a2332"};
          font-weight: ${showVariables ? "700" : "inherit"};
          text-decoration: ${showVariables ? "underline dotted" : "none"};
          cursor: default;
        }
        .notarial-page .var-empty {
          color: ${showVariables ? "#c0392b" : "#1a2332"};
          font-weight: ${showVariables ? "700" : "inherit"};
          text-decoration: ${showVariables ? "underline dotted" : "none"};
          cursor: default;
        }
      `}</style>
      <div className="notarial-page">
        <div ref={mountRef} />
      </div>
    </>
  );
}