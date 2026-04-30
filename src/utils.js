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

/** Convierte número entero a letras en español (hasta millones) */
export function numeroALetras(n) {
  if (n === undefined || n === null || n === "") return "";
  const num = typeof n === "string" ? parseFloat(n.replace(/\./g, "").replace(",", ".")) : n;
  if (isNaN(num)) return "";

  const UNIDADES = ["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE",
                    "DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE",
                    "DIECIOCHO","DIECINUEVE","VEINTE","VEINTIUNO","VEINTIDÓS","VEINTITRÉS",
                    "VEINTICUATRO","VEINTICINCO","VEINTISÉIS","VEINTISIETE","VEINTIOCHO","VEINTINUEVE"];
  const DECENAS = ["","","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
  const CENTENAS = ["","CIEN","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS",
                    "SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];

  function centenasALetras(n) {
    if (n === 100) return "CIEN";
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const centena = CENTENAS[c];
    if (resto === 0) return centena;
    if (resto < 30) return (centena ? centena + " " : "") + UNIDADES[resto];
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    return (centena ? centena + " " : "") + DECENAS[d] + (u > 0 ? " Y " + UNIDADES[u] : "");
  }

  const entero = Math.floor(num);
  const decimales = Math.round((num - entero) * 100);

  let resultado = "";
  if (entero === 0) {
    resultado = "CERO";
  } else if (entero < 30) {
    resultado = UNIDADES[entero];
  } else if (entero < 1000) {
    resultado = centenasALetras(entero);
  } else if (entero < 1000000) {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    resultado = (miles === 1 ? "MIL" : centenasALetras(miles) + " MIL");
    if (resto > 0) resultado += " " + centenasALetras(resto);
  } else {
    const millones = Math.floor(entero / 1000000);
    const resto = entero % 1000000;
    resultado = centenasALetras(millones) + (millones === 1 ? " MILLÓN" : " MILLONES");
    if (resto >= 1000) {
      const miles = Math.floor(resto / 1000);
      const restoMiles = resto % 1000;
      resultado += " " + (miles === 1 ? "MIL" : centenasALetras(miles) + " MIL");
      if (restoMiles > 0) resultado += " " + centenasALetras(restoMiles);
    } else if (resto > 0) {
      resultado += " " + centenasALetras(resto);
    }
  }

  return resultado + (decimales > 0 ? " CON " + String(decimales).padStart(2,"0") + "/100" : " CON 00/100");
}

/** Concatena límites del lote en texto corrido */
export function concatenarLimites(lote) {
  const CARDINALES = [
    ["norte","norteM","Norte"],
    ["sur","surM","Sur"],
    ["este","esteM","Este"],
    ["oeste","oesteM","Oeste"],
    ["noreste","noresteM","Noreste"],
    ["noroeste","noroesteM","Noroeste"],
    ["sureste","suresteM","Sureste"],
    ["suroeste","suroesteM","Suroeste"],
  ];
  const partes = CARDINALES
    .filter(([k]) => lote[k])
    .map(([k, km, label]) => `${label}: con ${lote[k]} en ${lote[km] || "?"} metros`);
  return partes.join("; ") + (partes.length > 0 ? "." : "");
}

/** Concatena adquirentes del lote en texto corrido */
export function concatenarAdquirentes(partes) {
  if (!partes || partes.length === 0) return "";
  
  const fmtDni = (v) => {
    if (!v) return "";
    const n = Number(String(v).replace(/\D/g, ""));
    return isNaN(n) ? "" : n.toLocaleString("es-AR");
  };

  return partes.map((p, idx) => {
    const tratamiento = p.genero === "F" ? "la señora" : "el señor";
    const nombre = [p.apellido, p.nombre].filter(Boolean).join(" ");
    const estadoCivil = p.estadoCivil || "";
    const domicilio = [p.calle, p.numero,
      p.piso && "piso " + p.piso,
      p.dpto && "dpto. " + p.dpto,
      p.localidad,
    ].filter(Boolean).join(", ");

    let texto = `${tratamiento} ${nombre}, de nacionalidad ${p.nacionalidad || ""}, titular del Documento Nacional de Identidad número ${fmtDni(p.nroDoc)}`;
    if (p.cuit) texto += `, CUIT/CUIL Nº ${p.cuit}`;
    if (p.fechaNac) texto += `, nacid${p.genero === "F" ? "a" : "o"} el ${p.fechaNac}`;
    if (estadoCivil) texto += `, quien manifiesta ser de estado civil ${estadoCivil}`;
    if (domicilio) texto += `, y domiciliarse en ${domicilio}, departamento ${p.departamento || ""}, de esta Provincia de Mendoza`;

    return texto;
  }).join("; y ");
}