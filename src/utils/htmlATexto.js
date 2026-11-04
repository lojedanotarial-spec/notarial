// Los modelos de barrio (templates_barrio.html) los guarda PageEditor como HTML (<p>, <span>, <strong>…),
// pero buildDocxGenerico trabaja con texto plano (un párrafo por línea, **negrita**, __subrayado__).
// Sin esta conversión, el primer modelo editado en la app saldría con las etiquetas escritas
// literalmente en cada escritura.

const ETIQUETA_HTML = /<\/?(p|br|span|div|strong|em|b|i|u|h[1-6]|ul|ol|li)\b[^>]*>/i;

export const pareceHtml = (texto) => ETIQUETA_HTML.test(texto || "");

const ENTIDADES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };

export function htmlATexto(html) {
  if (!html) return "";
  return String(html)
    .replace(/\r/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<(strong|b)(\s[^>]*)?>/gi, "**").replace(/<\/(strong|b)>/gi, "**")
    .replace(/<u(\s[^>]*)?>/gi, "__").replace(/<\/u>/gi, "__")
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENTIDADES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n");
}

// Texto plano tal cual; HTML convertido.
export const aTextoPlano = (contenido) => (pareceHtml(contenido) ? htmlATexto(contenido) : contenido || "");
