#!/usr/bin/env python3
"""
Ingesta tabla de valuaciones DNRPA → Supabase.

Requisitos:
  pip install pdfplumber requests

Uso:
  SUPABASE_SERVICE_KEY=<service_role_key> python scripts/ingest_dnrpa.py

  # Para usar una URL específica del PDF:
  PDF_URL=https://www.dnrpa.gov.ar/valuacion/informacion/01-06-2026.pdf \
    SUPABASE_SERVICE_KEY=xxx python scripts/ingest_dnrpa.py
"""

import os, sys, io, json, re, requests, pdfplumber
from datetime import date

SUPABASE_URL = "https://eueqluhhgvukovoyorrw.supabase.co"
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Patrón de URL del PDF del DNRPA: DD-MM-YYYY.pdf
# La URL vigente está en: https://www.dnrpa.gov.ar/valuacion/valuaciones.php
DEFAULT_PDF_URL = os.environ.get(
    "PDF_URL",
    f"https://www.dnrpa.gov.ar/valuacion/informacion/01-06-2026.pdf"
)

# Columnas de año en el PDF (después de Desc.Tipo), en orden de aparición
YEAR_KEYS = ["0km"] + [str(y) for y in range(2025, 2001, -1)]  # 0km, 2025, 2024, ..., 2002


def clean_num(s):
    """'5.368.000,00' o '5368000' → int, o None si vacío/inválido."""
    if s is None:
        return None
    s = str(s).strip().replace("\xa0", "").replace(" ", "")
    if not s or s in ("-", ""):
        return None
    # Formato argentino: puntos como miles, coma como decimal
    s = s.replace(".", "").replace(",", ".")
    try:
        return int(float(s))
    except ValueError:
        return None


def fetch_pdf(url: str) -> bytes:
    print(f"Descargando PDF: {url}")
    r = requests.get(url, timeout=120, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    print(f"PDF descargado: {len(r.content):,} bytes")
    return r.content


def find_header_row(rows):
    """Encuentra la fila de encabezados buscando 'MTM' o 'MTM/FMM'."""
    for i, row in enumerate(rows):
        if row and any(str(c).strip().upper() in ("MTM/FMM", "MTM") for c in row if c):
            return i
    return None


def parse_header(header_row):
    """
    Mapea la fila de encabezados a índices de columna.
    Devuelve dict: {nombre_col: índice}
    """
    cols = {}
    for i, cell in enumerate(header_row):
        if cell is None:
            continue
        h = str(cell).strip().upper()
        if "MTM" in h or "FMM" in h:
            cols["mtm"] = i
        elif h == "T":
            cols["tipo"] = i
        elif "DESC" in h and "MARCA" in h:
            cols["marca"] = i
        elif "DESC" in h and "MODELO" in h:
            cols["modelo"] = i
        elif "DESC" in h and "TIPO" in h:
            cols["tipo_desc"] = i
        elif h == "0KM":
            cols["val_start"] = i
        elif h.isdigit() and int(h) in range(2002, 2026):
            # Año numérico — el val_start lo detectamos por 0KM
            pass
    return cols


def parse_pdf(pdf_bytes: bytes):
    records = []
    errors  = 0
    header_cols = None  # se setea en la primera página

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        total_pages = len(pdf.pages)
        print(f"Páginas: {total_pages}")

        for page_num, page in enumerate(pdf.pages, 1):
            if page_num % 20 == 0:
                print(f"  Procesando página {page_num}/{total_pages}, filas acumuladas: {len(records)}")

            table = page.extract_table({
                "vertical_strategy":   "lines",
                "horizontal_strategy": "lines",
            })
            if not table:
                # Fallback: sin líneas detectadas
                table = page.extract_table()
            if not table:
                continue

            # Detectar/re-detectar encabezados en cada página (se repiten)
            hi = find_header_row(table)
            if hi is not None:
                header_cols = parse_header(table[hi])
                data_start = hi + 1
            else:
                data_start = 0

            if not header_cols or "mtm" not in header_cols:
                continue

            mtm_i    = header_cols.get("mtm")
            tipo_i   = header_cols.get("tipo")
            marca_i  = header_cols.get("marca")
            modelo_i = header_cols.get("modelo")
            tipod_i  = header_cols.get("tipo_desc")
            vstart_i = header_cols.get("val_start")

            for row in table[data_start:]:
                if not row or len(row) < 5:
                    continue

                # Saltar filas vacías o de separación
                mtm = str(row[mtm_i]).strip() if (mtm_i is not None and row[mtm_i]) else ""
                if not mtm or len(mtm) < 4 or not re.match(r"^[\dA-Z]+$", mtm):
                    continue

                tipo_v = str(row[tipo_i]).strip().upper() if (tipo_i is not None and row[tipo_i]) else ""
                if tipo_v not in ("A", "M"):
                    continue

                marca  = str(row[marca_i]).strip()  if (marca_i  is not None and row[marca_i])  else ""
                modelo = str(row[modelo_i]).strip() if (modelo_i is not None and row[modelo_i]) else ""
                tipod  = str(row[tipod_i]).strip()  if (tipod_i  is not None and row[tipod_i])  else ""

                if not marca or not modelo:
                    errors += 1
                    continue

                # Valores por año a partir de val_start
                valores = {}
                if vstart_i is not None:
                    val_cells = row[vstart_i:]
                    for j, key in enumerate(YEAR_KEYS):
                        if j < len(val_cells):
                            v = clean_num(val_cells[j])
                            if v and v > 0:
                                valores[key] = v

                records.append({
                    "mtm":           mtm,
                    "tipo_vehiculo": tipo_v,
                    "marca":         marca,
                    "modelo":        modelo,
                    "tipo_desc":     tipod,
                    "valores":       json.dumps(valores),
                    "tabla_fecha":   str(date.today()),
                })

    print(f"Filas parseadas: {len(records)} | Errores/omitidas: {errors}")
    return records


def upsert_supabase(records, batch_size=500):
    if not SERVICE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_KEY no definida")

    headers = {
        "apikey":        SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates,return=minimal",
    }
    url     = f"{SUPABASE_URL}/rest/v1/dnrpa_valuaciones"
    total   = 0
    batches = (len(records) + batch_size - 1) // batch_size

    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        resp  = requests.post(url, headers=headers, json=batch, timeout=60)
        if resp.status_code not in (200, 201):
            print(f"  ERROR batch {i//batch_size + 1}/{batches}: {resp.status_code} — {resp.text[:300]}")
        else:
            total += len(batch)
            print(f"  Batch {i//batch_size + 1}/{batches}: {len(batch)} filas OK ({total} total)")

    return total


if __name__ == "__main__":
    if not SERVICE_KEY:
        print("ERROR: Definí SUPABASE_SERVICE_KEY como variable de entorno.")
        print("  Windows PowerShell: $env:SUPABASE_SERVICE_KEY = 'tu_key'")
        print("  Bash:               export SUPABASE_SERVICE_KEY='tu_key'")
        sys.exit(1)

    pdf_bytes = fetch_pdf(DEFAULT_PDF_URL)
    records   = parse_pdf(pdf_bytes)

    if not records:
        print("No se parsearon filas. Revisá el PDF o ajustá el parser.")
        sys.exit(1)

    n = upsert_supabase(records)
    print(f"\n✓ Ingesta completa: {n} filas en Supabase ({date.today()})")
