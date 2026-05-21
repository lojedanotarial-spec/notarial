import { useEffect, useState } from "react";
import { A4W, A4H, PROT, NOPROT, mm, LINE_COUNT } from "../constants";

const LINE_HEIGHT_PX = 32;

function getBox(margenKey, isAnverso) {
  const margen = margenKey === "protocolar" ? PROT : NOPROT;
  const boxL = isAnverso ? margen.left  : margen.right;
  const boxR = isAnverso ? margen.right : margen.left;
  const boxT = margen.top;
  const boxB = margen.bottom;
  const boxW = A4W - boxR - boxL;
  const boxH = A4H - boxB - boxT;
  return { boxL, boxR, boxT, boxW, boxH };
}

function medirHTML(html, boxW, fuente, fontSize) {
  const ruler = document.createElement("div");
  ruler.style.cssText = [
    "position:fixed", "visibility:hidden", "pointer-events:none",
    "top:0", "left:0",
    `width:${boxW}px`,
    `font-family:${fuente.family}`,
    `font-size:${fontSize}pt`,
    `line-height:${LINE_HEIGHT_PX}px`,
    "word-break:break-word",
    "white-space:normal",
    "text-align:justify",
    `padding-left:${mm(2)}px`,
    `padding-right:${mm(2)}px`,
    "padding-top:0",
    "padding-bottom:0",
    "box-sizing:border-box",
    "height:auto",
    "overflow:visible",
  ].join(";");
  document.body.appendChild(ruler);
  return ruler;
}

function paginarHTML(html, margenKey, fuente, fontSize) {
  // Parsear párrafos
  const div = document.createElement("div");
  div.innerHTML = html;
  const parrafos = Array.from(div.querySelectorAll("p")).map(p => p.outerHTML);
  if (parrafos.length === 0) return ["<p></p>"];

  const paginas = [];
  let acumulados = [];
  let paginaIdx = 0;

  const nuevaBoxH = () => {
    const { boxH } = getBox(margenKey, paginaIdx % 2 === 0);
    // Ajustar a múltiplo exacto de LINE_HEIGHT_PX
    return Math.ceil(boxH / LINE_HEIGHT_PX) * LINE_HEIGHT_PX;
  };

  const nuevaBoxW = () => getBox(margenKey, paginaIdx % 2 === 0).boxW;

  let boxH = nuevaBoxH();
  let ruler = medirHTML("", nuevaBoxW(), fuente, fontSize);

  for (let i = 0; i < parrafos.length; i++) {
    const prueba = [...acumulados, parrafos[i]];
    ruler.innerHTML = prueba.join("");

    if (ruler.scrollHeight <= boxH + 2) {
      acumulados.push(parrafos[i]);
    } else {
      if (acumulados.length > 0) {
        // Guardar página actual
        paginas.push(acumulados.join(""));
        paginaIdx++;
        document.body.removeChild(ruler);
        boxH = nuevaBoxH();
        ruler = medirHTML("", nuevaBoxW(), fuente, fontSize);
        acumulados = [parrafos[i]];
      } else {
        // Párrafo solo no cabe — cortar por palabras
        const words = parrafos[i].replace(/<\/?p[^>]*>/g, "").split(" ");
        let lo = 0, hi = words.length, bestFit = 0;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          ruler.innerHTML = `<p>${words.slice(0, mid).join(" ")}</p>`;
          if (ruler.scrollHeight <= boxH + 2) { bestFit = mid; lo = mid + 1; }
          else hi = mid - 1;
        }
        if (bestFit > 0) {
          paginas.push(`<p>${words.slice(0, bestFit).join(" ")}</p>`);
          paginaIdx++;
          document.body.removeChild(ruler);
          boxH = nuevaBoxH();
          ruler = medirHTML("", nuevaBoxW(), fuente, fontSize);
          acumulados = [`<p>${words.slice(bestFit).join(" ")}</p>`];
        } else {
          acumulados = [parrafos[i]];
        }
      }
    }
  }

  if (acumulados.length > 0) paginas.push(acumulados.join(""));
  document.body.removeChild(ruler);

  return paginas.length > 0 ? paginas : ["<p></p>"];
}

function PaginaPreview({ html, pageIndex, margenKey, hojaOn, fuente, fontSize }) {
  const isAnverso = pageIndex % 2 === 0;
  const { boxL, boxT, boxW, boxH } = getBox(margenKey, isAnverso);

  return (
    <div style={{
      position: "relative", width: A4W, height: A4H, flexShrink: 0,
      background: "#fff", boxShadow: "0 2px 16px rgba(26,35,50,.13)",
    }}>
      {hojaOn && margenKey === "protocolar" && (
        <img
          src={isAnverso ? "/Protocolo_Front.png" : "/Protocolo_Back.png"}
          alt=""
          style={{ position: "absolute", inset: 0, width: A4W, height: A4H, pointerEvents: "none", zIndex: 1 }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: boxL, top: boxT,
          width: boxW, height: boxH,
          overflow: "hidden",
          fontFamily: fuente.family,
          fontSize: `${fontSize}pt`,
          lineHeight: `${LINE_HEIGHT_PX}px`,
          color: "#1a2332",
          wordBreak: "break-word",
          whiteSpace: "normal",
          textAlign: "justify",
          paddingLeft: mm(2), paddingRight: mm(2),
          paddingTop: 0, paddingBottom: 0,
          boxSizing: "border-box",
          zIndex: 2,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function PreviewModal({ html, margenKey, hojaOn, fuente, fontSize, onClose }) {
  const [paginas, setPaginas] = useState([]);

  useEffect(() => {
    const ps = paginarHTML(html, margenKey, fuente, fontSize);
    setPaginas(ps);
  }, [html, margenKey, fuente, fontSize]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(26,35,50,.55)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{
        height: 52, flexShrink: 0,
        background: "#fff", borderBottom: "1px solid rgba(26,35,50,.12)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px",
      }}>
        <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 15 }}>
          Vista previa — {paginas.length} página{paginas.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => window.print()} style={{
            padding: "7px 18px", borderRadius: 7, border: "none",
            background: "#1a2332", color: "#fff", cursor: "pointer",
            fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 13,
          }}>Imprimir / PDF</button>
          <button onClick={onClose} style={{
            padding: "7px 18px", borderRadius: 7,
            border: "1px solid rgba(26,35,50,.2)",
            background: "transparent", cursor: "pointer",
            fontFamily: "'Montserrat',sans-serif", fontWeight: 600, fontSize: 13,
          }}>Cerrar</button>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: "auto", overflowX: "auto",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "28px 20px", gap: 32,
        background: "#f0ece3",
      }}>
        {paginas.map((pHtml, idx) => (
          <div key={idx}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: ".07em",
              textTransform: "uppercase", color: "rgba(26,35,50,.7)",
              marginBottom: 8, textAlign: "center",
              fontFamily: "'Montserrat',sans-serif",
            }}>
              {idx % 2 === 0 ? "Anverso" : "Reverso"} · Página {idx + 1}
            </div>
            <PaginaPreview
              html={pHtml}
              pageIndex={idx}
              margenKey={margenKey}
              hojaOn={hojaOn}
              fuente={fuente}
              fontSize={fontSize}
            />
          </div>
        ))}
      </div>
    </div>
  );
}