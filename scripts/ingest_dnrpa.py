#!/usr/bin/env python3
"""
Ingesta tabla de valuaciones DNRPA → Supabase (parser por texto).

Requisitos:
  pip install pdfplumber requests

Uso:
  SUPABASE_SERVICE_KEY=<service_role_key> python scripts/ingest_dnrpa.py

  # PDF específico:
  PDF_URL=https://www.dnrpa.gov.ar/valuacion/informacion/01-06-2026.pdf \
    SUPABASE_SERVICE_KEY=xxx python scripts/ingest_dnrpa.py
"""

import io, re, json, sys, os, requests, pdfplumber
from datetime import date

SUPABASE_URL = "https://eueqluhhgvukovoyorrw.supabase.co"
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY", "")
DEFAULT_URL  = os.environ.get(
    "PDF_URL",
    "https://www.dnrpa.gov.ar/valuacion/informacion/01-06-2026.pdf"
)

# Columnas de año en orden de aparición en el PDF
YEAR_KEYS = ["0km"] + [str(y) for y in range(2025, 2001, -1)]

# Tipos de carrocería al final de la descripción
TIPOS_RE = re.compile(
    r'\b(SEDAN\s+\d+\s+PUERTAS?|RURAL\s+\d+\s+PUERTAS?|'
    r'HATCHBACK(?:\s+\d+\s+PUERTAS?)?|PICKUP(?:\s+\d+\s+PUERTAS?)?|'
    r'SUV(?:\s+\d+\s+PUERTAS?)?|CAMIONETA|CAMION|FURGONETA|FURGON|'
    r'COUP[EÉ]?\b|CONVERTIBLE|ROADSTER|MINIVAN|VAN\b|MINIBUS|MICROBUS|OMNIBUS|'
    r'MOTOCICLETA|CUATRICICLO|TRICICLO|TRACTOR)\s*$',
    re.IGNORECASE
)

# Línea de dato con valores al final (5+ dígitos = pesos)
LINE_RE = re.compile(
    r'^([IN])\s+(\d{5,9})\s+([AM])\s+\d{1,4}\s+\d{1,4}\s+\d{1,4}\s+'
    r'(.+?)\s+(\d{5,10}(?:\s+\d{5,10})*)\s*$'
)
# Línea sin valores (0km sin valuación asignada aún)
LINE_RE_NOVALS = re.compile(
    r'^([IN])\s+(\d{5,9})\s+([AM])\s+\d{1,4}\s+\d{1,4}\s+\d{1,4}\s+([A-Z].+?)\s*$'
)


def split_desc(text):
    """'ALFA ROMEO 156 2.5 V6 SEDAN 4 PUERTAS' → ('ALFA ROMEO', '156 2.5 V6', 'SEDAN 4 PUERTAS')"""
    tm = TIPOS_RE.search(text)
    tipo  = tm.group(1).strip() if tm else ""
    rest  = text[:tm.start()].strip() if tm else text.strip()

    words = rest.split()
    # marca = palabras sin dígitos; modelo = desde la primera palabra con dígito
    split_at = next((i for i, w in enumerate(words) if re.search(r'\d', w)), None)

    if split_at is None:
        # sin dígitos en nombre → marca = primera palabra, modelo = resto
        marca  = words[0] if words else ""
        modelo = " ".join(words[1:])
    elif split_at == 0:
        marca, modelo = "", rest
    else:
        marca  = " ".join(words[:split_at])
        modelo = " ".join(words[split_at:])

    return marca, modelo, tipo


def parse_vals(vals_str):
    out = {}
    if not vals_str:
        return out
    for i, tok in enumerate(vals_str.strip().split()):
        if i >= len(YEAR_KEYS):
            break
        try:
            n = int(tok)
            if n > 0:
                out[YEAR_KEYS[i]] = n
        except ValueError:
            pass
    return out


def parse_pdf(pdf_bytes):
    records  = []
    seen_mtm = set()

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        total = len(pdf.pages)
        print(f"Páginas: {total}")

        for page_num, page in enumerate(pdf.pages, 1):
            if page_num % 25 == 0:
                print(f"  Página {page_num}/{total} — {len(records)} registros")

            text = page.extract_text()
            if not text:
                continue

            for raw_line in text.split('\n'):
                line = raw_line.strip()
                if not line:
                    continue

                m = LINE_RE.match(line)
                if m:
                    _, mtm, tipo_v, desc, vals_str = m.groups()
                    valores = parse_vals(vals_str)
                else:
                    m2 = LINE_RE_NOVALS.match(line)
                    if not m2:
                        continue
                    _, mtm, tipo_v, desc = m2.groups()
                    valores = {}

                if mtm in seen_mtm:
                    continue
                seen_mtm.add(mtm)

                marca, modelo, tipo_desc = split_desc(desc.strip())

                records.append({
                    "mtm":           mtm,
                    "tipo_vehiculo": tipo_v,
                    "marca":         marca or desc.split()[0],
                    "modelo":        modelo if modelo else desc,
                    "tipo_desc":     tipo_desc,
                    "valores":       valores,   # dict, no json.dumps
                    "tabla_fecha":   str(date.today()),
                })

    print(f"Registros parseados: {len(records)}")
    return records


def upsert(records, batch_size=500):
    headers = {
        "apikey":        SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates,return=minimal",
    }
    url    = f"{SUPABASE_URL}/rest/v1/dnrpa_valuaciones"
    total  = 0
    n_bat  = (len(records) + batch_size - 1) // batch_size

    for i in range(0, len(records), batch_size):
        chunk = records[i : i + batch_size]
        r = requests.post(url, headers=headers, json=chunk, timeout=60)
        if r.status_code not in (200, 201):
            print(f"  ERROR batch {i//batch_size+1}/{n_bat}: {r.status_code} — {r.text[:200]}")
        else:
            total += len(chunk)
            print(f"  Batch {i//batch_size+1}/{n_bat}: {len(chunk)} OK (total: {total})")

    return total


if __name__ == "__main__":
    if not SERVICE_KEY:
        print("ERROR: definí SUPABASE_SERVICE_KEY como variable de entorno.")
        sys.exit(1)

    print(f"Descargando: {DEFAULT_URL}")
    resp = requests.get(DEFAULT_URL, timeout=120, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    print(f"Descargado: {len(resp.content):,} bytes")

    records = parse_pdf(resp.content)

    if not records:
        print("Sin registros — revisá el PDF o ajustá el parser.")
        sys.exit(1)

    n = upsert(records)
    print(f"\n✓ Ingesta completa: {n} registros ({date.today()})")
