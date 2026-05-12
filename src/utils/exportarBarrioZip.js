import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, LineRuleType, SectionType,
} from "docx";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { generarEscritura } from "./generarEscritura";

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
      font:  inherited.font  || "Sitka Heading",
      size:  HALFPT(inherited.size || 11),
      bold:  inherited.bold  || false,
      color: "1a2332",
    }));
    return runs;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return runs;
  const tag = node.tagName?.toLowerCase();
  if (node.hasAttribute?.("data-variable")) {
    runs.push(new TextRun({
      text:  node.textContent || "",
      font:  inherited.font  || "Sitka Heading",
      size:  HALFPT(inherited.size || 11),
      bold:  inherited.bold  || false,
      color: "1a2332",
    }));
    return runs;
  }
  const next = { ...inherited };
  if (tag === "strong" || tag === "b") next.bold    = true;
  if (tag === "em"     || tag === "i") next.italic  = true;
  if (tag === "u")                     next.underline = true;
  const style = node.getAttribute?.("style") || "";
  if (style.includes("font-weight:700") || style.includes("font-weight: 700")) next.bold = true;
  node.childNodes.forEach(child => runs.push(...nodeToRuns(child, next)));
  return runs;
}

function pToParagraph(pEl, fontName, fontSize) {
  const runs = [];
  pEl.childNodes.forEach(child =>
    runs.push(...nodeToRuns(child, { font: fontName, size: fontSize, bold: false, color: "1a2332" }))
  );
  return new Paragraph({
    children: runs,
    alignment: AlignmentType.JUSTIFIED,
    spacing: {
      line:     Math.round((LINE_HEIGHT_PT / 72) * 1440),
      lineRule: LineRuleType.EXACT,
      before: 0, after: 0,
    },
  });
}

function marginsXML(top, bottom, left, right) {
  return `w:top="${top}" w:right="${right}" w:bottom="${bottom}" w:left="${left}" w:header="0" w:footer="0" w:gutter="0"`;
}

async function loteToDocxBuffer({ html, fontName, fontSize }) {
  const parser = new DOMParser();
  const doc2 = parser.parseFromString("<div>" + html + "</div>", "text/html");
  const paragraphs = [];
  doc2.querySelectorAll("p").forEach(pEl =>
    paragraphs.push(pToParagraph(pEl, fontName, fontSize))
  );

  const top    = mmToTwip(80);
  const bottom = mmToTwip(20);
  const left   = mmToTwip(36);
  const right  = mmToTwip(15);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size:   { width: mmToTwip(210), height: mmToTwip(297) },
          margin: { top, bottom, left, right },
        },
      },
      children: paragraphs,
    }],
  });

  const blob0 = await Packer.toBlob(doc);
  const buffer = await blob0.arrayBuffer();

  const zipDoc = await JSZip.loadAsync(buffer);
  let docXml = await zipDoc.file("word/document.xml").async("string");
  docXml = docXml.replace(/w:pgMar\s+[^/]+\//g, () =>
    `w:pgMar ${marginsXML(top, bottom, left, right)}/`
  );
  zipDoc.file("word/document.xml", docXml);

  let settingsXml = await zipDoc.file("word/settings.xml")?.async("string") || "";
  if (settingsXml && !settingsXml.includes("w:mirrorMargins")) {
    settingsXml = settingsXml.replace("</w:settings>", "<w:mirrorMargins/></w:settings>");
    zipDoc.file("word/settings.xml", settingsXml);
  }

  return zipDoc.generateAsync({ type: "arraybuffer" });
}

export async function exportarBarrioZip({
  barrio, lotes, templateHTML, escribano, fecha,
  fontName = "Sitka Heading", fontSize = 11,
  onProgress,
}) {
  const zip = new JSZip();
  const folder = zip.folder(barrio.nombre || "barrio");

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i];
    onProgress?.({ actual: i + 1, total: lotes.length, lote });

    const html = generarEscritura(
      templateHTML, lote, barrio, escribano, fecha, lote.nroEscritura
    );

    const buffer = await loteToDocxBuffer({ html, fontName, fontSize });

    const nombre = `Mz_${lote.manzana || "X"}_Lote_${lote.lote || i + 1}.docx`
      .replace(/[/\\:*?"<>|]/g, "_");
    folder.file(nombre, buffer);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${barrio.nombre || "barrio"}_escrituras.zip`);
}