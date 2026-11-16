"""Calcula los atributos operativos (0-1) de cada lugar de Colombia a partir de
sus datos medidos ("medidos" en data/colombia.json) y los guarda en
"atributos_operativos". Correrlo cada vez que cambien los datos medidos.

Normalización min-max ENTRE los lugares de Colombia (se ignoran los null):
    norm(x) = (x - min) / (max - min)        inv(x) = 1 - norm(x)
    aridez             = 0.7·inv(lluvia_anual_mm) + 0.3·inv(humedad_relativa)
    frio               = inv(lst_noche_mediana)
    ciclo_termico      = norm(amplitud_termica)
    superficie_estable = inv(erosividad_mfi)
    terreno_plano      = inv(pendiente_media)
Así, el lugar más parecido a Marte en cada variable vale 1. Si falta un insumo,
el atributo queda null (no 0). La radiación solar no entra al cálculo.

Uso:  python scripts/calcular_atributos.py
"""
import json
import sys

sys.path.insert(0, __import__("os").path.dirname(__file__))
from modelo import RAIZ, utf8_consola  # noqa: E402

VARIABLES = ["lluvia_anual_mm", "humedad_relativa", "lst_noche_mediana", "amplitud_termica",
             "erosividad_mfi", "pendiente_media"]


def main():
    utf8_consola()
    ruta = RAIZ / "data/colombia.json"
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    lugares = datos["lugares"]

    rangos = {}
    for var in VARIABLES:
        vals = [l["medidos"].get(var) for l in lugares if l["medidos"].get(var) is not None]
        rangos[var] = (min(vals), max(vals)) if vals else None

    def norm(lugar, var):
        x = lugar["medidos"].get(var)
        r = rangos[var]
        if x is None or r is None:
            return None
        lo, hi = r
        return 1.0 if hi == lo else (x - lo) / (hi - lo)

    def inv(lugar, var):
        n = norm(lugar, var)
        return None if n is None else 1 - n

    def red(x):
        return None if x is None else round(x, 2)

    for l in lugares:
        il, ih = inv(l, "lluvia_anual_mm"), inv(l, "humedad_relativa")
        l["atributos_operativos"] = {
            "aridez": red(0.7 * il + 0.3 * ih) if il is not None and ih is not None else None,
            "frio": red(inv(l, "lst_noche_mediana")),
            "ciclo_termico": red(norm(l, "amplitud_termica")),
            "superficie_estable": red(inv(l, "erosividad_mfi")),
            "terreno_plano": red(inv(l, "pendiente_media")),
        }
        # mantener el orden de claves: atributos_operativos justo después de atributos
        orden = list(l.keys())
        orden.remove("atributos_operativos")
        orden.insert(orden.index("atributos") + 1, "atributos_operativos")
        l_ordenado = {k: l[k] for k in orden}
        l.clear()
        l.update(l_ordenado)

    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    print("Rangos usados (min – max entre lugares de Colombia):")
    for var, r in rangos.items():
        print(f"  {var:20} " + (f"{r[0]:g} – {r[1]:g}" if r else "sin datos"))
    claves = ["aridez", "frio", "ciclo_termico", "superficie_estable", "terreno_plano"]
    print(f"\n{'Lugar':28}" + "".join(f"{k[:12]:>13}" for k in claves))
    for l in lugares:
        a = l["atributos_operativos"]
        print(f"{l['nombre'][:27]:28}" + "".join(f"{('—' if a[k] is None else f'{a[k]:.2f}'):>13}" for k in claves))
    print("\n— = sin dato (el criterio se excluye del cálculo de similitud).")
    print(f"Guardado en {ruta.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
