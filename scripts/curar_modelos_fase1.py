"""
Fase 1: Filtro local de documentos notariales.
- Descarta docs que mencionan Vélez Sarsfield
- Descarta docs con fecha anterior a 01/08/2015
- Por cada carpeta (tipo de acto), selecciona el doc más reciente que pasa los filtros
- Genera CSV con el mapa completo
"""

import os
import re
import csv
from pathlib import Path
from docx import Document

BASE_DIR = r"C:\Users\Florencia Martinez\Downloads\ESCRIBANIA-20251111T135947Z-1-001\ESCRIBANIA"
OUTPUT_CSV = r"C:\Users\Florencia Martinez\notarial\scripts\resultado_fase1.csv"

FECHA_CORTE = 2015  # documentos con año < 2015 se descartan

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4,
    "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
    "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}

def extraer_texto(filepath):
    try:
        doc = Document(filepath)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        return None

def tiene_velez(text):
    return bool(re.search(r"v[eé]lez\s+sarsfield", text, re.IGNORECASE))

def extraer_anio(text):
    """Busca el año del documento. Prioriza fechas textuales notariales."""
    # "a los ... días del mes de agosto de 2019"
    m = re.search(r"mes de \w+ de (\d{4})", text, re.IGNORECASE)
    if m:
        return int(m.group(1))
    # "dd/mm/yyyy" o "dd-mm-yyyy"
    fechas = re.findall(r"\b\d{1,2}[/-]\d{1,2}[/-](\d{4})\b", text)
    if fechas:
        anios = [int(a) for a in fechas if 1990 <= int(a) <= 2030]
        if anios:
            return max(anios)
    # año suelto en contexto de fecha
    m = re.search(r"año\s+(\d{4})", text, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None

def procesar():
    resultados = []
    carpetas_vistas = {}  # carpeta → mejor doc hasta ahora

    docx_files = list(Path(BASE_DIR).rglob("*.docx"))
    total = len(docx_files)
    print(f"Procesando {total} archivos .docx...")

    for i, path in enumerate(docx_files, 1):
        if i % 100 == 0:
            print(f"  {i}/{total}...")

        carpeta = path.parent.name
        texto = extraer_texto(path)

        if texto is None:
            resultados.append({
                "archivo": path.name,
                "carpeta": carpeta,
                "ruta": str(path),
                "estado": "ERROR_LECTURA",
                "razon": "No se pudo leer el archivo",
                "anio": "",
                "seleccionado": "no",
            })
            continue

        if tiene_velez(texto):
            resultados.append({
                "archivo": path.name,
                "carpeta": carpeta,
                "ruta": str(path),
                "estado": "DESCARTADO",
                "razon": "Menciona Vélez Sarsfield",
                "anio": "",
                "seleccionado": "no",
            })
            continue

        anio = extraer_anio(texto)

        if anio and anio < FECHA_CORTE:
            resultados.append({
                "archivo": path.name,
                "carpeta": carpeta,
                "ruta": str(path),
                "estado": "DESCARTADO",
                "razon": f"Fecha anterior a {FECHA_CORTE} (año {anio})",
                "anio": anio,
                "seleccionado": "no",
            })
            continue

        # Pasó los filtros
        resultados.append({
            "archivo": path.name,
            "carpeta": carpeta,
            "ruta": str(path),
            "estado": "OK",
            "razon": "",
            "anio": anio or "sin_fecha",
            "seleccionado": "no",  # se marca después
        })

        # Trackear el más reciente por carpeta
        anio_num = anio or 0
        prev = carpetas_vistas.get(carpeta)
        if prev is None or anio_num >= prev["anio"]:
            carpetas_vistas[carpeta] = {"ruta": str(path), "anio": anio_num}

    # Marcar el seleccionado por carpeta
    rutas_seleccionadas = {v["ruta"] for v in carpetas_vistas.values()}
    for r in resultados:
        if r["ruta"] in rutas_seleccionadas and r["estado"] == "OK":
            r["seleccionado"] = "si"

    # Escribir CSV
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        campos = ["archivo", "carpeta", "ruta", "estado", "razon", "anio", "seleccionado"]
        w = csv.DictWriter(f, fieldnames=campos)
        w.writeheader()
        w.writerows(resultados)

    # Resumen
    total_ok       = sum(1 for r in resultados if r["estado"] == "OK")
    total_velez    = sum(1 for r in resultados if "Vélez" in r["razon"])
    total_fecha    = sum(1 for r in resultados if "anterior" in r["razon"])
    total_error    = sum(1 for r in resultados if r["estado"] == "ERROR_LECTURA")
    seleccionados  = sum(1 for r in resultados if r["seleccionado"] == "si")

    print(f"\n{'='*50}")
    print(f"TOTAL archivos procesados : {total}")
    print(f"  OK  Pasan los filtros      : {total_ok}")
    print(f"  --  Velez Sarsfield        : {total_velez}")
    print(f"  --  Fecha anterior a 2015  : {total_fecha}")
    print(f"  --  Error de lectura       : {total_error}")
    print(f"\n  >>  Candidatos a preset    : {seleccionados} (uno por tipo de acto)")
    print(f"\nCSV guardado en: {OUTPUT_CSV}")

if __name__ == "__main__":
    procesar()
