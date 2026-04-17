import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, LineRuleType, SectionType,
} from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";

const LINE_HEIGHT_PT = 24;
const HALFPT   = (pt) => pt * 2;
const mmToTwip = (mm) => Math.round((mm / 25.4) * 1440);

function nodeToRuns(node, inherited = {}) {
  const runs = [];
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (!text) return runs;
    runs.push(new TextRun({
      text,
      font:      inherited.font     || "Merriweather",
      size:      HALFPT(inherited.size || 11),
      bold:      inherited.bold     || false,
      italics:   inherited.italic   || false,
      underline: inherited.underline ? {} : undefined,
      color:     inherited.color    || "1a2332",
    }));
    return runs;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return runs;
  const tag = node.tagName?.toLowerCase();

if (node.hasAttribute && node.hasAttribute("data-variable")) {
    const text = node.textContent || "";
    runs.push(new TextRun({
      text,
      font:      inherited.font  || "Merriweather",
      size:      HALFPT(inherited.size || 11),
      bold:      inherited.bold  || false,
      color:     inherited.color || "1a2332",
    }));
    return runs;
  }

  const next = { ...inherited };
  if (tag === "strong" || tag === "b") next.bold      = true;
  if (tag === "em"     || tag === "i") next.italic    = true;
  if (tag === "u")                     next.underline = true;
  const style = node.getAttribute?.("style") || "";
  if (style.includes("font-weight:700") || style.includes("font-weight: 700")) next.bold = true;
  if (style.includes("font-style:italic"))   next.italic    = true;
  if (style.includes("text-decoration:underline") &&
      !style.includes("dotted"))             next.underline = true;
  node.childNodes.forEach(child => { runs.push(...nodeToRuns(child, next)); });
  return runs;
}

function pToParagraph(pEl, fuente, fontSize) {
  const runs = [];
  pEl.childNodes.forEach(child => {
    runs.push(...nodeToRuns(child, {
      font:      fuente.family.replace(/['"]/g, "").split(",")[0].trim(),
      size:      fontSize,
      bold:      false,
      italic:    false,
      underline: false,
      color:     "1a2332",
    }));
  });
  return new Paragraph({
    children: runs,
    alignment: AlignmentType.JUSTIFIED,
    spacing: {
      line:     Math.round((LINE_HEIGHT_PT / 72) * 1440),
      lineRule: LineRuleType.EXACT,
      before:   0,
      after:    0,
    },
  });
}

function marginsXML(top, bottom, left, right) {
  return `w:top="${top}" w:right="${right}" w:bottom="${bottom}" w:left="${left}" w:header="0" w:footer="0" w:gutter="0"`;
}

export async function exportarDocx({ html, fuente, fontSize, docTitle, margenKey }) {
  const parser  = new DOMParser();
  const fontName = fuente.family.replace(/['"]/g, "").split(",")[0].trim();

  const htmlPages = typeof html === "string"
    ? html.split("\n").filter(h => h.trim())
    : [html];

  const sections = htmlPages.map((pageHTML, idx) => {
    const doc2 = parser.parseFromString("<div>" + pageHTML + "</div>", "text/html");
    const paragraphs = [];
    doc2.querySelectorAll("p").forEach(pEl => {
      paragraphs.push(pToParagraph(pEl, fuente, fontSize));
    });

    const isAnverso = idx % 2 === 0;
    const top    = mmToTwip(80);
    const bottom = mmToTwip(20);
    const left   = isAnverso ? mmToTwip(36) : mmToTwip(15);
    const right  = isAnverso ? mmToTwip(15) : mmToTwip(36);

    if (margenKey !== "protocolar") {
      return {
        properties: {
          type: idx === 0 ? undefined : SectionType.NEXT_PAGE,
          page: {
            size:   { width: mmToTwip(210), height: mmToTwip(297) },
            margin: {
              top:    mmToTwip(35), bottom: mmToTwip(20),
              left:   isAnverso ? mmToTwip(30) : mmToTwip(20),
              right:  isAnverso ? mmToTwip(20) : mmToTwip(30),
            },
          },
        },
        children: paragraphs,
      };
    }

    return {
      properties: {
        type: idx === 0 ? undefined : SectionType.NEXT_PAGE,
        page: {
          size:   { width: mmToTwip(210), height: mmToTwip(297) },
          margin: { top, bottom, left, right },
        },
      },
      children: paragraphs,
    };
  });

  const doc = new Document({ sections });
  const blob0 = await Packer.toBlob(doc);
  const buffer = await blob0.arrayBuffer();

  // Parchear el XML directamente para asegurar márgenes correctos
  const zip = await JSZip.loadAsync(buffer);
  let docXml = await zip.file("word/document.xml").async("string");

  // Reemplazar todos los w:pgMar con los valores correctos por sección
  let sectionIdx = 0;
  docXml = docXml.replace(/w:pgMar\s+[^/]+\//g, () => {
    const isAnverso = sectionIdx % 2 === 0;
    sectionIdx++;
    const top    = mmToTwip(80);
    const bottom = mmToTwip(20);
    const left   = isAnverso ? mmToTwip(36) : mmToTwip(15);
    const right  = isAnverso ? mmToTwip(15) : mmToTwip(36);
    return `w:pgMar ${marginsXML(top, bottom, left, right)}/`;
  });

  zip.file("word/document.xml", docXml);

  // Parchear settings.xml para márgenes simétricos
    let settingsXml = await zip.file("word/settings.xml")?.async("string") || "";
    if (settingsXml) {
      if (!settingsXml.includes("w:mirrorMargins")) {
        settingsXml = settingsXml.replace("</w:settings>", "<w:mirrorMargins/></w:settings>");
      }
      zip.file("word/settings.xml", settingsXml);
    }

  const finalBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const blob = new Blob([finalBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  saveAs(blob, (docTitle || "documento") + ".docx");
}
