import { useEffect } from "react";
import { MESES_ORD, ANIOS_LETRAS } from "./constants";

/** Cierra un dropdown al hacer click fuera del ref */
export function useClickOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cb();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}

/** Convierte número de día a letras mayúsculas */
export const diaLetras  = (n) => (MESES_ORD[n - 1] || String(n)).toUpperCase();

/** Convierte año numérico a letras mayúsculas */
export const anioLetras = (n) => ANIOS_LETRAS[n] || String(n);

/** Devuelve forma femenina o masculina según género de la parte */
export const gen = (p, f, m) => (p.genero === "F" ? f : m);
