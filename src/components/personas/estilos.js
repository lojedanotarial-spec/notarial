// Estilos y ayudas de las pantallas de personas (specs/personas-expediente/): botones, campos y siglas.
import { C } from "../../constants";

export const fuente = "'Montserrat', sans-serif";

export const boton = (primario, deshabilitado) => ({
  padding: "8px 16px", borderRadius: 8, fontFamily: fuente, fontSize: 12, fontWeight: 700,
  border: primario ? "none" : `1px solid ${C.cerulean}`,
  background: deshabilitado ? "rgba(26,35,50,.12)" : primario ? C.cerulean : "transparent",
  color: deshabilitado ? C.faint : primario ? "#fff" : C.ceruleanText,
  cursor: deshabilitado ? "default" : "pointer",
});
export const botonPeligro = (deshabilitado) => ({ ...boton(true, deshabilitado), background: deshabilitado ? "rgba(26,35,50,.12)" : C.danger });
export const botonTexto = { border: "none", background: "transparent", color: C.ceruleanText, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: "4px 2px", fontFamily: fuente };
export const campo = {
  width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.borderStrong}`,
  background: "#fff", fontSize: 13, color: C.dark, fontFamily: "'Inter', sans-serif",
};


export const iniciales = (p) => `${String(p?.apellido ?? "").trim()[0] || ""}${String(p?.nombre ?? "").trim()[0] || ""}`.toUpperCase() || "?";
