"""
Parsea el Compilado_Notarial_Ordenado_v2.txt y extrae todos los modelos notariales.
Usa una whitelist de secciones principales conocidas para evitar falsos positivos.
"""

import re
import json
import sys
from pathlib import Path
from collections import Counter

INPUT_FILE  = r"C:\Users\Florencia Martinez\Documents\NOTARIAL\Compilado_Notarial_Ordenado_v2.txt"
OUTPUT_JSON = r"C:\Users\Florencia Martinez\notarial\scripts\compilado_modelos.json"

# Secciones principales conocidas del documento (8 secciones)
SECCIONES_PRINCIPALES = {
    "1": "PARTE GENERAL",
    "2": "PERSONAS JURIDICAS",
    "3": "RELACIONES DE FAMILIA",
    "4": "OBLIGACIONES",
    "5": "CONTRATOS - PARTE GENERAL",
    "6": "CONTRATOS EN PARTICULAR",
    "7": "DERECHOS REALES",
    "8": "SUCESIONES",
}

# Subsección con roman numeral
ROMAN_RE = re.compile(r"^(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XIV|XV?I{0,3})\.\s+\S.+$")
# Letra de categoría: "A) TÍTULO"
LETRA_RE = re.compile(r"^[A-Z]\)\s+[A-Z].+$")
# Detecta cuerpo de modelo
ES_CUERPO = re.compile(
    r"_{3,}|ante m[ií],|ESCRITURA N[ÚU]MERO|INTERVIENE[N ]|COMPARECE[N ]|"
    r"DICE:|DICEN:|CONSTANCIAS NOTARIALES|doy fe"
)
# Variables
VAR_RE = re.compile(r"_{3,}")


def limpiar(texto):
    return " ".join(texto.split())


def es_seccion_principal(line):
    m = re.match(r"^(\d+)\.\s+(.+)$", line)
    if m:
        num = m.group(1)
        titulo_norm = re.sub(r"\s+", " ", m.group(2)).strip().upper()
        # Normalizamos tildes para comparación
        titulo_norm = titulo_norm.replace("Á","A").replace("É","E").replace("Í","I").replace("Ó","O").replace("Ú","U").replace("Ñ","N")
        if num in SECCIONES_PRINCIPALES:
            expected = SECCIONES_PRINCIPALES[num]
            expected_norm = expected.replace("Á","A").replace("É","E").replace("Í","I").replace("Ó","O").replace("Ú","U").replace("Ñ","N")
            # Comprobación flexible: el título esperado debe estar contenido
            if expected_norm in titulo_norm or titulo_norm.startswith(expected_norm[:15]):
                return SECCIONES_PRINCIPALES[num]
    return None


def parsear():
    content = None
    for enc in ("cp1252", "latin-1", "utf-8-sig", "utf-8"):
        try:
            content = Path(INPUT_FILE).read_text(encoding=enc)
            break
        except Exception:
            continue
    if content is None:
        content = Path(INPUT_FILE).read_text(encoding="cp1252", errors="replace")

    lines = content.splitlines()

    # Detectar inicio del contenido real: primera "1. PARTE GENERAL" sin tab
    content_start = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if re.match(r"^1\.\s+PARTE GENERAL\s*$", stripped, re.IGNORECASE) and "\t" not in line:
            content_start = i
            break

    if content_start is None:
        print("ERROR: no se encontro inicio del contenido")
        return

    # Parseo
    modelos = []
    cat1 = "PARTE GENERAL"
    cat2 = ""
    cat3 = ""

    i = content_start
    while i < len(lines):
        line = lines[i].strip()
        i += 1

        if not line:
            continue

        # ---- Sección principal (whitelist)
        sec = es_seccion_principal(line)
        if sec:
            cat1 = sec
            cat2 = ""
            cat3 = ""
            continue

        # ---- Subsección romana: "I. COMPARECENCIAS..."
        if ROMAN_RE.match(line) and len(line) < 150 and not ES_CUERPO.search(line):
            cat2 = line
            cat3 = ""
            continue

        # ---- Letra de categoría: "A) SOCIEDADES"
        if LETRA_RE.match(line) and len(line) < 80 and not ES_CUERPO.search(line):
            cat3 = line
            continue

        # ---- Título de modelo: "1. TEXTO..." o "12. TEXTO..."
        m_titulo = re.match(r"^(\d+)\.\s+(.+)$", line)
        if m_titulo:
            titulo = limpiar(m_titulo.group(2))

            # Buscar el cuerpo en las líneas siguientes
            cuerpo = ""
            notas = ""
            j = i
            while j < len(lines):
                candidate = lines[j].strip()
                if not candidate:
                    j += 1
                    continue
                # Es cuerpo si es largo o contiene marcadores de modelo
                if len(candidate) > 150 or ES_CUERPO.search(candidate):
                    cuerpo = limpiar(candidate)
                    j += 1
                    # Posible nota (*)
                    if j < len(lines) and lines[j].strip().startswith("(*)"):
                        notas = limpiar(lines[j].strip())
                        j += 1
                    i = j
                break

            if cuerpo:
                modelos.append({
                    "titulo":      titulo,
                    "categoria_1": cat1,
                    "categoria_2": cat2,
                    "categoria_3": cat3,
                    "texto":       cuerpo,
                    "notas":       notas,
                    "n_vars":      len(VAR_RE.findall(cuerpo)),
                })

    # Guardar JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(modelos, f, ensure_ascii=False, indent=2)

    # Resumen (ASCII para evitar errores de consola Windows)
    def safe(s):
        return s.encode("ascii", errors="replace").decode("ascii")

    total = len(modelos)
    con_vars = sum(1 for m in modelos if m["n_vars"] > 0)
    avg_vars = sum(m["n_vars"] for m in modelos) / max(total, 1)

    print(f"\n{'='*55}")
    print(f"Modelos extraidos      : {total}")
    print(f"Con variables (___)    : {con_vars}")
    print(f"Variables promedio     : {avg_vars:.1f}")

    print(f"\nPor categoria principal:")
    cats1 = Counter(m["categoria_1"] for m in modelos)
    for cat, n in sorted(cats1.items(), key=lambda x: -x[1]):
        print(f"  {n:4d}  {safe(cat)}")

    print(f"\nTop 20 subcategorias:")
    cats2 = Counter(m["categoria_2"] for m in modelos if m["categoria_2"])
    for cat, n in cats2.most_common(20):
        print(f"  {n:4d}  {safe(cat)}")

    print(f"\nJSON: {OUTPUT_JSON}")


if __name__ == "__main__":
    parsear()
