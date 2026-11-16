"""Validates the JSON files in data/ and prints the similarity matrix per profile.

Criteria and weights are read from the MODELO block in js/config.js, so they
are not duplicated here. Run after scripts/calcular_atributos.py.

Usage:  python scripts/validar_datos.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from modelo import RAIZ, cargar_json, cargar_modelo, similitud, utf8_consola  # noqa: E402

MEDIDOS = ["t_aire_media", "t_aire_max", "t_aire_min", "lst_dia_mediana", "lst_dia_p95",
           "lst_noche_mediana", "lst_noche_p5", "amplitud_termica", "humedad_relativa",
           "radiacion_kwh_m2_dia", "lluvia_anual_mm", "erosividad_mfi", "pct_validos_dia",
           "pct_validos_noche", "elevacion_m", "pendiente_media", "pendiente_max"]


def revisar(sitio, modelo, errores, es_colombia):
    sid = sitio.get("id", "?")
    for campo in ("id", "nombre", "lat", "lon", "atributos"):
        if campo not in sitio:
            errores.append(f"{sid}: missing '{campo}'")
    if not -90 <= sitio.get("lat", 0) <= 90 or not -180 <= sitio.get("lon", 0) <= 180:
        errores.append(f"{sid}: coordinates out of range")
    crit = modelo["criterios"]
    for k, v in sitio.get("atributos", {}).items():
        if k not in crit:
            errores.append(f"{sid}: unknown criterion '{k}'")
        elif es_colombia and crit[k]["fuente"] == "operativos":
            errores.append(f"{sid}: '{k}' is a measured criterion; it belongs in 'atributos_operativos' (written by calcular_atributos.py)")
        if v is not None and not 0 <= v <= 1:
            errores.append(f"{sid}: '{k}' must be between 0 and 1")
    if es_colombia:
        op = sitio.get("atributos_operativos")
        if op is None:
            errores.append(f"{sid}: missing 'atributos_operativos' (run scripts/calcular_atributos.py)")
        else:
            for k, v in op.items():
                if v is not None and not 0 <= v <= 1:
                    errores.append(f"{sid}: measured attribute '{k}' outside 0-1")
        if "medidos" not in sitio:
            errores.append(f"{sid}: missing 'medidos'")
    else:
        if sitio.get("perfil") not in modelo["perfiles"]:
            errores.append(f"{sid}: 'perfil' must be one of {list(modelo['perfiles'])}")
    imagen = sitio.get("imagen")
    if imagen and not (RAIZ / imagen).exists():
        print(f"  (warning) missing image: {imagen}")


def main():
    utf8_consola()
    modelo = cargar_modelo()
    marte = cargar_json("data/extraterrestres.json")["marte"]
    col = cargar_json("data/colombia.json")["lugares"]
    errores = []
    for s in marte:
        revisar(s, modelo, errores, es_colombia=False)
    for l in col:
        revisar(l, modelo, errores, es_colombia=True)

    refs = {r["id"] for r in cargar_json("data/colombia.json").get("referencias", [])}
    for l in col:
        for c in l.get("citas", []):
            if c.get("ref") not in refs:
                errores.append(f"{l['id']}: citation '{c.get('ref')}' not found in 'referencias'")
        if not l.get("citas"):
            print(f"  (warning) no analog reference cited for: {l['nombre']}")

    print("\nMissing measurements (null):")
    for l in col:
        faltan = [k for k in MEDIDOS if (l.get("medidos") or {}).get(k) is None]
        print(f"  {l['nombre'][:27]:28} {', '.join(faltan) if faltan else '—'}")

    minimo = modelo["cobertura_minima"]
    for perfil, p in modelo["perfiles"].items():
        print(f"\n=== PROFILE {p['nombre'].upper()} ===   (⚠ = incomplete data, coverage < {minimo:.0%})")
        print(f"{'':28}" + "".join(f"{l['id'][:9]:>11}" for l in col))
        for s in marte:
            celdas = []
            for l in col:
                v, usados, disp = similitud(s, l, perfil, modelo)
                marca = "⚠" if disp and usados / disp < minimo else " "
                celdas.append(f"{marca}{v:>5.0%} {usados}/{disp}")
            propio = "*" if s.get("perfil") == perfil else " "
            print(f"{propio}{s['nombre'][:26]:27}" + "".join(f"{c:>11}" for c in celdas))
        print("  * = the site's own profile · n/m = criteria used / available")

    if errores:
        print("\nERRORS:")
        for e in errores:
            print(" -", e)
        sys.exit(1)
    print("\nData valid ✔")


if __name__ == "__main__":
    main()
