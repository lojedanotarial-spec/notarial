#!/usr/bin/env python3
"""
Ingesta tabla de valuaciones DNRPA desde Excel (convertido con ilovepdf u similar).
Lee directamente desde Google Drive o desde un archivo local .xlsx/.csv.

Uso:
  python scripts/ingest_dnrpa_excel.py                    # descarga de Google Drive
  python scripts/ingest_dnrpa_excel.py --file tabla.xlsx  # archivo local

Requiere:
  pip install openpyxl requests
"""

import io, re, json, sys, os, csv, argparse, requests

SUPABASE_URL = "https://eueqluhhgvukovoyorrw.supabase.co"
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY", "")

# ID del Google Sheet compartido (exportable como XLSX)
GDRIVE_FILE_ID = "18-BsvZJt-v2OmErN-AdgDmCD92LfXbth"

YEAR_KEYS = ["0km"] + [str(y) for y in range(2025, 2001, -1)]

# Columnas del Excel (0-indexed)
COL_IN       = 0   # I/N
COL_MTM      = 1   # MTM/FMM
COL_T        = 2   # A=Auto, M=Moto
COL_MARCA    = 7   # Desc. marca
COL_MODELO   = 8   # Desc. Modelo
COL_TIPO     = 9   # Desc. Tipo
COL_VAL_0KM  = 10  # primer valor (0km)
# COL_VAL_0KM + i → YEAR_KEYS[i]


def download_xlsx(file_id):
    """Descarga el archivo de Google Drive como XLSX."""
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    print(f"Descargando desde Google Drive: {file_id}")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    return resp.content


def parse_xlsx(xlsx_bytes):
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    print(f"Filas en Excel: {len(rows)}")
    return rows


def parse_csv_content(content):
    """
    El Google Drive read_file_content devuelve todo en una línea separada por espacios.
    Reconstruye registros separando por ' I,' y ' N,'.
    """
    # Quitar header
    header_end = content.find('\n')
    if header_end == -1:
        # Todo en una línea — separar registros
        # Primer registro empieza con 'I,' o 'N,'
        body = re.sub(r'^Table \d+ [^\n]*', '', content).strip()
        # Separar por espacio seguido de I, o N, con MTM numérico
        parts = re.split(r' (?=[IN],[\dA-Z])', body)
    else:
        parts = content[header_end:].strip().split('\n')

    records = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        row = list(csv.reader([part]))[0]
        records.append(row)
    return records


def rows_to_records(rows, is_excel=True):
    """Convierte filas (de Excel o CSV) al formato para Supabase."""
    records = []
    seen    = set()

    for i, row in enumerate(rows):
        if i == 0:
            continue  # header

        try:
            if is_excel:
                in_flag  = str(row[COL_IN]  or "").strip()
                mtm      = str(row[COL_MTM] or "").strip()
                tipo_v   = str(row[COL_T]   or "").strip()
                marca    = " ".join(str(row[COL_MARCA]  or "").split()).upper()
                raw_mod  = " ".join(str(row[COL_MODELO] or "").split()).upper()
                raw_tipo = " ".join(str(row[COL_TIPO]   or "").split()).upper()
                # El Excel a veces fusiona modelo + tipo en la columna modelo
                if raw_tipo:
                    modelo    = raw_mod
                    tipo_desc = raw_tipo
                else:
                    # Intentar separar tipo del modelo (ej: "GOL TREND 1.6 SEDAN 5 PUERTAS")
                    tipo_desc = ""
                    modelo    = raw_mod
                vals_raw = row[COL_VAL_0KM:]
            else:
                # CSV row
                if len(row) < 11:
                    continue
                in_flag   = row[0].strip()
                mtm       = row[1].strip()
                tipo_v    = row[2].strip()
                marca     = row[7].strip().upper() if len(row) > 7 else ""
                modelo    = row[8].strip().upper() if len(row) > 8 else ""
                tipo_desc = row[9].strip().upper() if len(row) > 9 else ""
                vals_raw  = row[10:]

            if in_flag not in ("I", "N") or not mtm or tipo_v not in ("A", "M"):
                continue
            if mtm in seen:
                continue
            seen.add(mtm)

            valores = {}
            for j, val in enumerate(vals_raw):
                if j >= len(YEAR_KEYS):
                    break
                try:
                    n = int(str(val).replace(",", "").strip())
                    if n > 0:
                        valores[YEAR_KEYS[j]] = n
                except (ValueError, TypeError):
                    pass

            records.append({
                "mtm":           mtm,
                "tipo_vehiculo": tipo_v,
                "marca":         marca or "SIN MARCA",
                "modelo":        modelo or "SIN MODELO",
                "tipo_desc":     tipo_desc,
                "valores":       valores,   # dict, no json.dumps — Supabase lo guarda como JSONB objeto
                "tabla_fecha":   "2026-06-01",
            })

        except Exception as e:
            print(f"  Fila {i} error: {e}")
            continue

    return records


def upsert(records, batch_size=500):
    headers = {
        "apikey":        SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates,return=minimal",
    }
    url   = f"{SUPABASE_URL}/rest/v1/dnrpa_valuaciones"
    total = 0
    n_bat = (len(records) + batch_size - 1) // batch_size

    for i in range(0, len(records), batch_size):
        chunk = records[i: i + batch_size]
        r = requests.post(url, headers=headers, json=chunk, timeout=60)
        if r.status_code not in (200, 201):
            print(f"  ERROR batch {i//batch_size+1}/{n_bat}: {r.status_code} — {r.text[:200]}")
        else:
            total += len(chunk)
            print(f"  Batch {i//batch_size+1}/{n_bat}: {len(chunk)} OK (acumulado: {total})")

    return total


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Ruta a archivo .xlsx local (omitir para descargar de Drive)")
    args = parser.parse_args()

    if not SERVICE_KEY:
        print("ERROR: definí SUPABASE_SERVICE_KEY como variable de entorno.")
        sys.exit(1)

    try:
        import openpyxl
        HAS_OPENPYXL = True
    except ImportError:
        HAS_OPENPYXL = False
        print("openpyxl no instalado — pip install openpyxl")

    if args.file:
        with open(args.file, "rb") as f:
            xlsx_bytes = f.read()
        rows = parse_xlsx(xlsx_bytes)
        records = rows_to_records(rows, is_excel=True)
    elif HAS_OPENPYXL:
        xlsx_bytes = download_xlsx(GDRIVE_FILE_ID)
        print(f"Descargado: {len(xlsx_bytes):,} bytes")
        rows = parse_xlsx(xlsx_bytes)
        records = rows_to_records(rows, is_excel=True)
    else:
        sys.exit(1)

    print(f"Registros parseados: {len(records)}")
    if not records:
        print("Sin registros.")
        sys.exit(1)

    # Verificar muestra
    sample = next((r for r in records if "GOL TREND" in r["marca"] or "GOL TREND" in r["modelo"]), None)
    if sample:
        print(f"Muestra GOL TREND: {sample['marca']} {sample['modelo']} | anios: {list(sample['valores'].keys())[:5]}")

    n = upsert(records)
    print(f"\nIngesta completa: {n} registros upserted.")
