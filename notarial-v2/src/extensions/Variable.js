import { Node } from "@tiptap/core";

const LABEL_TO_MODAL = {
  "ESCRIBANO":       "escribano",
  "CARÁCTER":        "escribano",
  "N° REGISTRO":     "escribano",
  "CIRCUNSCRIPCIÓN": "escribano",
  "APELLIDO Y NOMBRE": "partes",
  "NACIONALIDAD":    "partes",
  "TIPO DOC":        "partes",
  "N° DOCUMENTO":    "partes",
  "CUIT/CUIL":       "partes",
  "FECHA NAC":       "partes",
  "ESTADO CIVIL":    "partes",
  "DOMICILIO":       "partes",
  "DEPARTAMENTO":    "partes",
  "ROL":             "partes",
  "PARTE":           "partes",
  "FECHA":           "fecha",
  "CIUDAD":          "fecha",
  "N° ACTA":         "protocolo",
  "LIBRO":           "protocolo",
  "N° LIBRO":        "protocolo",
  "INSTRUMENTO":     "instrumento",
};

export const Variable = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      label: {
        default: "",
        parseHTML: element => element.getAttribute("data-label") || "",
      },
      value: {
        default: "",
        parseHTML: element => {
          const label = element.getAttribute("data-label") || "";
          const text  = element.textContent || "";
          if (text === "{{" + label + "}}") return "";
          return text;
        },
      },
      empty: {
        default: true,
        parseHTML: element => {
          const label = element.getAttribute("data-label") || "";
          const text  = element.textContent || "";
          return text === "{{" + label + "}}";
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-variable]" }];
  },

  renderHTML({ node }) {
    const isEmpty = node.attrs.empty || !node.attrs.value;
    return ["span", {
      "data-variable": "",
      "data-label": node.attrs.label,
      "class": isEmpty ? "var-empty" : "var-filled",
    }, isEmpty ? "{{" + node.attrs.label + "}}" : node.attrs.value];
  },

  addNodeView() {
    return ({ node }) => {
      const span = document.createElement("span");
      const isEmpty = node.attrs.empty || !node.attrs.value;
      span.setAttribute("data-variable", "");
      span.setAttribute("data-label", node.attrs.label);
      span.className = isEmpty ? "var-empty" : "var-filled";
      span.textContent = isEmpty ? "{{" + node.attrs.label + "}}" : node.attrs.value;

      span.addEventListener("click", (e) => {
        const modal = LABEL_TO_MODAL[node.attrs.label];
        if (!modal) return;
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("notarial:openmodal", {
          detail: { modal },
        }));
      });

      return { dom: span };
    };
  },
});
