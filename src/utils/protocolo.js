// Protocolo de un documento: Protocolar · Extraprotocolar · Sin definir.
// Espejo en el cliente de lo que hace la base (scripts/explorador_indice.sql): acto_normalizado e indexar_documento.
// Códigos internos: "P" = Protocolar, "NP" = Extraprotocolar. En pantalla nunca se muestran los códigos.
// Spec: specs/archivo-legal-y-explorador/ (T3).

export const ETIQUETA_CLASE = { P: "Protocolar", NP: "Extraprotocolar", sin_definir: "Sin definir" };

// Claves viejas de dibujo (template_key) → slug de la tabla templates.
const CLAVES_VIEJAS = { certFirma: "cert_firma", certFirmaF08: "cert_firma_f08", escrituraBarrio: "compraventa_lote" };

export function actoNormalizado(tipoActo, templateKey) {
  const limpio = (s) => (typeof s === "string" ? s.trim() : "");
  const crudo = limpio(tipoActo) || limpio(templateKey);
  if (!crudo) return "documento_libre";
  return CLAVES_VIEJAS[crudo] || crudo;
}

// manual: "P" | "NP" | null (lo elegido en el documento). defecto: "P" | "NP" | "ambas" | null (del catálogo).
export function claseEfectiva(manual, defecto) {
  if (manual === "P" || manual === "NP") return { clase: manual, origen: "documento" };
  if (defecto === "P" || defecto === "NP") return { clase: defecto, origen: "catalogo" };
  return { clase: "sin_definir", origen: "sin_dato" };
}

// La plantilla define la clase solo si el catálogo dice P o NP; «ambas» o sin dato obliga a elegir.
export function plantillaDefine(defecto) {
  return defecto === "P" || defecto === "NP";
}
