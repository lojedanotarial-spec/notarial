// Piezas comunes de las pantallas de personas del expediente (specs/personas-expediente/): botones, avisos y modal accesible.
// Siguen los mismos patrones que la pestaña de archivos (ArchivosEscribania) para que todo se vea y se comporte igual.
import { useEffect, useId, useRef } from "react";
import { C } from "../../constants";
import { fuente } from "./estilos";

// Aviso con ícono y texto (nunca solo color). `tipo`: info | aviso | error | ok. Los de error se anuncian de inmediato.
export function Aviso({ tipo = "aviso", children, estilo }) {
  const [fondo, borde, texto, icono] = {
    error: [C.dangerBg, "rgba(192,57,43,.3)", C.danger, "!"],
    ok: [C.successBg, "rgba(46,125,50,.3)", C.success, "✓"],
    info: [C.ceruleanLight, "rgba(58,124,165,.3)", C.ceruleanText, "i"],
    aviso: ["rgba(201,169,97,.12)", "rgba(201,169,97,.3)", C.warnText, "!"],
  }[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: fondo, border: `1px solid ${borde}`, color: texto, borderRadius: 8, padding: "10px 14px", fontSize: 12, lineHeight: 1.5, ...estilo }}>
      <span aria-hidden="true" style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${texto}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, marginTop: 1 }}>{icono}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

// Modal: el foco entra al abrir y vuelve al botón que lo abrió al cerrar; Esc cierra (salvo `bloqueado`, por ejemplo mientras guarda).
// Tocar el fondo solo cierra los de solo lectura.
export function Modal({ children, titulo, ancho = 460, onCerrar, bloqueado = false, cierraAlTocarFondo = false }) {
  const caja = useRef(null);
  const tituloId = useId();
  const alCerrar = useRef(onCerrar);
  useEffect(() => { alCerrar.current = onCerrar; });
  useEffect(() => {
    const previo = document.activeElement;
    const destino = caja.current?.querySelector("[data-autofocus]") || caja.current;
    destino?.focus?.({ preventScroll: true });
    return () => { if (previo && document.contains(previo)) previo.focus?.({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === "Escape" && !bloqueado) { e.stopPropagation(); alCerrar.current(); } };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [bloqueado]);
  return (
    <div onClick={cierraAlTocarFondo && !bloqueado ? onCerrar : undefined}
      style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div ref={caja} role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1} onClick={(e) => e.stopPropagation()}
        style={{ background: "#FDFCFA", borderRadius: 12, width: "100%", maxWidth: ancho, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(26,35,50,.18)", outline: "none" /* design-lint-ignore: es el contenedor del diálogo; el foco se mueve ahí por código, no es un control */ }}>
        <h2 id={tituloId} style={{ margin: 0, padding: "20px 22px 0", fontSize: 16, fontWeight: 700, color: C.dark, fontFamily: fuente }}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

// Esqueleto de una fila mientras carga (mejor que un "Cargando..." suelto).
export function FilaEsqueleto() {
  return (
    <div aria-hidden="true" style={{ display: "flex", gap: 12, alignItems: "center", background: "#FDFCFA", border: "1px solid rgba(26,35,50,.08)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(26,35,50,.07)" }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, width: "40%", borderRadius: 4, background: "rgba(26,35,50,.08)", marginBottom: 8 }} />
        <div style={{ height: 10, width: "62%", borderRadius: 4, background: "rgba(26,35,50,.06)" }} />
      </div>
    </div>
  );
}
