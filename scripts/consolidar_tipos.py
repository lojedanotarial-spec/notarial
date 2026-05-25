"""
Consolida los 192 tipos detectados por Claude en tipos canónicos.
Manda la lista completa a Claude Sonnet en una sola llamada y obtiene el agrupamiento.
"""

import csv
import json
from collections import defaultdict
import anthropic

ENV_FILE   = r"C:\Users\Florencia Martinez\notarial\scripts\.env"
INPUT_CSV  = r"C:\Users\Florencia Martinez\notarial\scripts\resultado_fase2.csv"
OUTPUT_CSV = r"C:\Users\Florencia Martinez\notarial\scripts\resultado_consolidado.csv"

def cargar_api_key():
    with open(ENV_FILE) as f:
        for line in f:
            if line.startswith("ANTHROPIC_API_KEY="):
                return line.split("=", 1)[1].strip()

def consolidar():
    api_key = cargar_api_key()
    client  = anthropic.Anthropic(api_key=api_key)

    # Leer tipos únicos con sus datos
    rows = list(csv.DictReader(open(INPUT_CSV, encoding="utf-8-sig")))
    rows_validas = [r for r in rows if r["tipo_acto"] not in ("ERROR", "ERROR_CLAUDE", "", "Documento incompleto", "Documento normativo - Tasas judiciales y retributivas")]

    tipos_unicos = sorted(set(r["tipo_acto"] for r in rows_validas))
    lista_tipos  = "\n".join(f"- {t}" for t in tipos_unicos)

    print(f"Enviando {len(tipos_unicos)} tipos a Claude para consolidación...")

    prompt = f"""Sos un experto en derecho notarial argentino.

Te doy una lista de tipos de actos notariales detectados automáticamente de una escribanía.
Muchos son variantes del mismo tipo de acto. Tu tarea es agruparlos en TIPOS CANÓNICOS.

Criterios de agrupación:
- Mismo acto jurídico base → mismo grupo (ej: "Compraventa de inmueble", "Compraventa de inmuebles", "Compraventa" → "Compraventa de inmueble")
- Variantes por bien (inmueble vs vehículo vs factura) → grupos SEPARADOS
- Variantes por modalidad importante (con hipoteca, con usufructo) → anotarlas como subtipos pero mismo grupo canónico
- Variantes por cliente/banco específico (Banco Patagonia, Banco Nación) → mismo grupo canónico
- Documentos administrativos (notas, solicitudes, formularios) → grupo "Documentos administrativos"
- Certificaciones del Registro → grupo "Certificaciones registrales"

Respondé con un JSON con esta estructura exacta:
{{
  "grupos": [
    {{
      "tipo_canonico": "nombre canónico del tipo de acto",
      "categoria": "categoría general (Transmisión de dominio / Garantías reales / Poderes y mandatos / Certificaciones notariales / Certificaciones registrales / Actas notariales / Sociedades / Contratos / Sucesiones / Documentos administrativos / Otros)",
      "variantes": ["lista de tipos que pertenecen a este grupo"],
      "subtipos_comunes": ["variantes por bien, modalidad u otras características relevantes"]
    }}
  ]
}}

LISTA DE TIPOS:
{lista_tipos}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    # Guardar raw para debug
    with open(r"C:\Users\Florencia Martinez\notarial\scripts\raw_response.txt", "w", encoding="utf-8") as f:
        f.write(raw)
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    resultado = json.loads(raw)
    grupos = resultado["grupos"]

    # Guardar el agrupamiento para referencia
    with open(r"C:\Users\Florencia Martinez\notarial\scripts\agrupamiento.json", "w", encoding="utf-8") as f:
        json.dump(grupos, f, ensure_ascii=False, indent=2)

    # Construir mapa tipo_detectado → tipo_canonico + categoria
    mapa = {}
    for g in grupos:
        for v in g["variantes"]:
            mapa[v] = (g["tipo_canonico"], g["categoria"])

    # Aplicar al CSV y elegir el mejor representante por tipo canónico
    # "mejor" = calidad_preset alta > media > baja, y usar_como_preset = si
    calidad_orden = {"alta": 0, "media": 1, "baja": 2, "": 3}

    por_canonico = defaultdict(list)
    for r in rows_validas:
        canon, cat = mapa.get(r["tipo_acto"], (r["tipo_acto"], "Sin clasificar"))
        r["tipo_canonico"] = canon
        r["categoria"]     = cat
        por_canonico[canon].append(r)

    # Elegir el mejor representante de cada grupo
    representantes = []
    for canon, grupo in sorted(por_canonico.items()):
        # Ordenar: primero los que Claude aprueba como preset, luego por calidad
        grupo.sort(key=lambda r: (
            0 if r["usar_como_preset"] == "si" else 1,
            calidad_orden.get(r["calidad_preset"], 3)
        ))
        mejor = grupo[0]
        mejor["variantes_en_grupo"] = len(grupo)
        representantes.append(mejor)

    # Escribir CSV consolidado
    campos = ["categoria", "tipo_canonico", "variantes_en_grupo", "archivo", "carpeta",
              "ruta", "anio", "tipo_acto", "vigente_ccyc", "variables_detectadas",
              "calidad_preset", "observaciones", "usar_como_preset"]

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
        w.writeheader()
        w.writerows(representantes)

    # Resumen
    print(f"\n{'='*50}")
    print(f"Tipos originales     : {len(tipos_unicos)}")
    print(f"Tipos canonicos      : {len(por_canonico)}")
    print(f"Listos como preset   : {sum(1 for r in representantes if r['usar_como_preset'] == 'si')}")
    print(f"\nPor categoria:")
    cats = defaultdict(int)
    for r in representantes:
        cats[r["categoria"]] += 1
    for cat, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {n:3d}  {cat}")
    print(f"\nCSV: {OUTPUT_CSV}")
    print(f"JSON agrupamiento: scripts/agrupamiento.json")

if __name__ == "__main__":
    consolidar()
