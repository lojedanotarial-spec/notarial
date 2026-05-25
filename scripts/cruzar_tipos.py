"""
Cruza los 58 tipos canónicos de la escribanía contra los 563 modelos del compilado.
"""
import json, csv, re

with open(r"C:\Users\Florencia Martinez\notarial\scripts\compilado_modelos.json", encoding="utf-8") as f:
    compilado = json.load(f)

with open(r"C:\Users\Florencia Martinez\notarial\scripts\resultado_consolidado.csv", encoding="utf-8-sig") as f:
    canonicos = list(csv.DictReader(f))


def normalize(s):
    s = s.upper()
    for a, b in [("Á","A"),("É","E"),("Í","I"),("Ó","O"),("Ú","U"),("Ñ","N")]:
        s = s.replace(a, b)
    return re.sub(r"[^A-Z0-9 ]", " ", s)


STOP = {"DE","DEL","LA","LAS","LOS","EL","Y","EN","A","CON","POR","E","UN","UNA","AL","O","SU","SE"}


def overlap(a, b):
    wa = set(normalize(a).split()) - STOP
    wb = set(normalize(b).split()) - STOP
    if not wa:
        return 0.0
    return len(wa & wb) / len(wa)


resultados = []
for c in canonicos:
    tipo = c["tipo_canonico"]
    best = 0.0
    best_m = None
    for m in compilado:
        s = overlap(tipo, m["titulo"])
        if s > best:
            best = s
            best_m = m
    resultados.append({
        "tipo_canonico":    tipo,
        "categoria_escribania": c["categoria"],
        "score":            round(best, 2),
        "modelo_compilado": best_m["titulo"] if best_m else "",
        "cat_compilado":    best_m["categoria_1"] if best_m else "",
        "n_vars_compilado": best_m["n_vars"] if best_m else 0,
    })

buenos   = [r for r in resultados if r["score"] >= 0.5]
parciales = [r for r in resultados if 0.3 <= r["score"] < 0.5]
malos    = [r for r in resultados if r["score"] < 0.3]

def s(t):
    return t.encode("ascii", errors="replace").decode()

print(f"\n{'='*60}")
print(f"Tipos canonicos escribania : {len(canonicos)}")
print(f"Modelos en compilado       : {len(compilado)}")
print(f"\nCOBERTURA:")
print(f"  Match >= 50% (cubierto)  : {len(buenos)}")
print(f"  Match 30-50% (parcial)   : {len(parciales)}")
print(f"  Match < 30% (no cub.)    : {len(malos)}")

print(f"\n--- NO CUBIERTOS / BAJO MATCH ---")
for r in sorted(malos + parciales, key=lambda x: x["score"]):
    print(f"  [{r['score']:.0%}] {s(r['tipo_canonico'])}")

print(f"\n--- TOP 10 MEJOR CUBIERTOS ---")
for r in sorted(buenos, key=lambda x: -x["score"])[:10]:
    print(f"  [{r['score']:.0%}] {s(r['tipo_canonico'])}")
    print(f"       -> {s(r['modelo_compilado'])[:65]}")
