"""
Fase 2: Análisis con Claude de los documentos candidatos a preset.
Lee los 245 candidatos del CSV de Fase 1 y para cada uno:
- Extrae el texto del .docx
- Lo manda a Claude Haiku para análisis
- Guarda resultado en CSV para revisión humana
"""

import csv
import json
import time
import os
from pathlib import Path
from docx import Document
import anthropic

ENV_FILE = r"C:\Users\Florencia Martinez\notarial\scripts\.env"
INPUT_CSV = r"C:\Users\Florencia Martinez\notarial\scripts\resultado_fase1.csv"
OUTPUT_CSV = r"C:\Users\Florencia Martinez\notarial\scripts\resultado_fase2.csv"

# Cargar API key desde .env
def cargar_api_key():
    with open(ENV_FILE) as f:
        for line in f:
            if line.startswith("ANTHROPIC_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise ValueError("API key no encontrada en .env")

def extraer_texto(filepath):
    try:
        doc = Document(filepath)
        texto = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        # Limitar a 3000 chars para no gastar de más (docs notariales son repetitivos)
        return texto[:3000]
    except Exception as e:
        return None

PROMPT_SISTEMA = """Sos un experto en derecho notarial argentino, especializado en el Código Civil y Comercial de la Nación (vigente desde agosto 2015).
Analizás documentos notariales y respondés SIEMPRE con un JSON válido, sin texto adicional."""

PROMPT_ANALISIS = """Analizá este documento notarial argentino y respondé con un JSON con esta estructura exacta:

{
  "tipo_acto": "nombre del tipo de acto notarial (ej: Poder especial, Compraventa, Certificación de firma)",
  "subtipo": "especificación si aplica (ej: para cobrar jubilación, de inmueble urbano) o null",
  "vigente_ccyc": true o false,
  "variables_detectadas": ["lista", "de", "campos", "variables"],
  "calidad_preset": "alta" o "media" o "baja",
  "observaciones": "qué hay que corregir, actualizar o tener en cuenta (max 2 oraciones)",
  "usar_como_preset": true o false
}

Criterios:
- vigente_ccyc: true si usa lenguaje y referencias del CCyC 2015, false si usa Código de Vélez o lenguaje anterior
- variables_detectadas: campos que cambian por documento (nombres, DNIs, fechas, domicilios, montos, etc.)
- calidad_preset: alta=listo para usar, media=necesita ajustes menores, baja=necesita revisión importante
- usar_como_preset: true solo si vigente_ccyc=true y calidad_preset es alta o media

DOCUMENTO:
{texto}"""

def analizar_con_claude(client, texto, carpeta):
    try:
        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": PROMPT_ANALISIS.replace("{texto}", texto)
            }],
            system=PROMPT_SISTEMA,
        )
        raw = response.content[0].text.strip()
        # Limpiar si viene con ```json
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "JSON inválido", "raw": raw[:200]}
    except Exception as e:
        return {"error": str(e)}

def procesar():
    api_key = cargar_api_key()
    client = anthropic.Anthropic(api_key=api_key)

    # Leer candidatos de Fase 1
    with open(INPUT_CSV, encoding="utf-8-sig") as f:
        candidatos = [r for r in csv.DictReader(f) if r["seleccionado"] == "si"]

    total = len(candidatos)
    print(f"Analizando {total} documentos candidatos con Claude...")
    print(f"Costo estimado: ~${total * 0.0003:.2f} USD\n")

    resultados = []
    errores = 0

    for i, row in enumerate(candidatos, 1):
        print(f"  [{i}/{total}] {row['carpeta'][:50]}...")

        texto = extraer_texto(row["ruta"])
        if not texto:
            resultados.append({**row, "tipo_acto": "ERROR", "subtipo": "", "vigente_ccyc": "",
                               "variables_detectadas": "", "calidad_preset": "",
                               "observaciones": "No se pudo leer el archivo", "usar_como_preset": "no"})
            errores += 1
            continue

        analisis = analizar_con_claude(client, texto, row["carpeta"])

        if "error" in analisis:
            resultados.append({**row, "tipo_acto": "ERROR_CLAUDE", "subtipo": "",
                               "vigente_ccyc": "", "variables_detectadas": "",
                               "calidad_preset": "", "observaciones": analisis.get("error", ""),
                               "usar_como_preset": "no"})
            errores += 1
        else:
            resultados.append({
                **row,
                "tipo_acto":           analisis.get("tipo_acto", ""),
                "subtipo":             analisis.get("subtipo", "") or "",
                "vigente_ccyc":        analisis.get("vigente_ccyc", ""),
                "variables_detectadas": ", ".join(analisis.get("variables_detectadas", [])),
                "calidad_preset":      analisis.get("calidad_preset", ""),
                "observaciones":       analisis.get("observaciones", ""),
                "usar_como_preset":    "si" if analisis.get("usar_como_preset") else "no",
            })

        # Pausa para no exceder rate limits
        time.sleep(0.3)

    # Escribir CSV
    campos = ["carpeta", "archivo", "ruta", "anio", "tipo_acto", "subtipo",
              "vigente_ccyc", "variables_detectadas", "calidad_preset",
              "observaciones", "usar_como_preset"]

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
        w.writeheader()
        w.writerows(resultados)

    presets_ok = sum(1 for r in resultados if r["usar_como_preset"] == "si")
    print(f"\n{'='*50}")
    print(f"Total analizados     : {total}")
    print(f"Errores              : {errores}")
    print(f"Listos como preset   : {presets_ok}")
    print(f"Requieren revision   : {total - presets_ok - errores}")
    print(f"\nCSV guardado en: {OUTPUT_CSV}")

if __name__ == "__main__":
    procesar()
