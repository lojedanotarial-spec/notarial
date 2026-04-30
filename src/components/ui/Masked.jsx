import { useState } from "react";

// ── FECHA dd/mm/aaaa ──────────────────────────────────────────────────────
export function InputFecha({ value, onChange, style, placeholder = "dd/mm/aaaa" }) {
  function handleChange(e) {
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (v.length >= 5) v = v.slice(0,2) + "/" + v.slice(2,4) + "/" + v.slice(4);
    else if (v.length >= 3) v = v.slice(0,2) + "/" + v.slice(2);
    onChange(v);
  }
  return <input value={value} onChange={handleChange} placeholder={placeholder} maxLength={10} style={style}/>;
}

// ── DINERO $1.234.567,89 ──────────────────────────────────────────────────
export function InputDinero({ value, onChange, style, placeholder = "$0,00" }) {
  const [raw, setRaw] = useState(value || "");

  function handleChange(e) {
    // Solo números, punto y coma
    let v = e.target.value.replace(/[^\d.,]/g, "");
    setRaw(v);
    onChange(v);
  }

  function handleBlur() {
    if (!raw) return;
    // Normalizar: reemplazar punto por coma si se usa como decimal
    // Detectar si el punto es separador de miles o decimal
    const cleaned = raw.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return;
    const formatted = "$" + num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setRaw(formatted);
    onChange(formatted);
  }

  function handleFocus() {
    // Al enfocar, quitar formato para editar
    const cleaned = raw.replace(/\$|\./g, "").replace(",", ".");
    setRaw(cleaned);
    onChange(cleaned);
  }

  return <input value={raw} onChange={handleChange} onBlur={handleBlur} onFocus={handleFocus} placeholder={placeholder} style={style}/>;
}

// ── DECIMAL con coma ──────────────────────────────────────────────────────
export function InputDecimal({ value, onChange, style, placeholder = "0,00" }) {
  const [raw, setRaw] = useState(value || "");

  function handleChange(e) {
    let v = e.target.value.replace(/[^\d.,]/g, "");
    setRaw(v);
    onChange(v);
  }

  function handleBlur() {
    if (!raw) return;
    // Si tiene punto como decimal (ej: 123.13) o coma (ej: 123,13)
    let cleaned = raw;
    // Si tiene punto Y no tiene coma → el punto es decimal
    if (raw.includes(".") && !raw.includes(",")) {
      cleaned = raw; // ya es número válido con punto decimal
    } else {
      // coma como decimal → convertir a punto para parseFloat
      cleaned = raw.replace(/\./g, "").replace(",", ".");
    }
    const num = parseFloat(cleaned);
    if (isNaN(num)) return;
    const formatted = num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setRaw(formatted);
    onChange(formatted);
  }

  function handleFocus() {
    const cleaned = raw.replace(/\./g, "").replace(",", ".");
    setRaw(cleaned);
    onChange(cleaned);
  }

  return <input value={raw} onChange={handleChange} onBlur={handleBlur} onFocus={handleFocus} placeholder={placeholder} style={style}/>;
}
