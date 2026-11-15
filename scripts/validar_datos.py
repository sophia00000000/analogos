"""Valida los JSON de data/ y muestra la matriz de similitud en consola.

Uso:  python scripts/validar_datos.py
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
# Deben coincidir con CONFIG.criterios en js/config.js
PESOS = {
    "hielo": 1.5, "arcillas": 1.2, "sulfatos": 1.2, "sales": 1.0, "sedimentos": 1.0,
    "aridez": 0.8, "frio": 0.8, "volcanico": 1.0, "subterraneo": 1.0, "hidrotermal": 1.0,
}


def similitud(extra, col):
    num = sum(p * min(extra["atributos"].get(k, 0), col["atributos"].get(k, 0)) for k, p in PESOS.items())
    den = sum(p * extra["atributos"].get(k, 0) for k, p in PESOS.items())
    return num / den if den else 0


def revisar(sitio, errores):
    for campo in ("id", "nombre", "lat", "lon", "atributos"):
        if campo not in sitio:
            errores.append(f"{sitio.get('id', '?')}: falta '{campo}'")
    if not -90 <= sitio.get("lat", 0) <= 90 or not -180 <= sitio.get("lon", 0) <= 180:
        errores.append(f"{sitio['id']}: coordenadas fuera de rango")
    for k, v in sitio.get("atributos", {}).items():
        if k not in PESOS:
            errores.append(f"{sitio['id']}: criterio desconocido '{k}'")
        if not 0 <= v <= 1:
            errores.append(f"{sitio['id']}: '{k}' debe estar entre 0 y 1")
    imagen = sitio.get("imagen")
    if imagen and not (RAIZ / imagen).exists():
        print(f"  (aviso) falta imagen: {imagen}")


def main():
    extra = json.loads((RAIZ / "data/extraterrestres.json").read_text(encoding="utf-8"))
    col = json.loads((RAIZ / "data/colombia.json").read_text(encoding="utf-8"))["lugares"]
    errores = []
    for cuerpo in ("marte", "luna"):
        for s in extra[cuerpo]:
            revisar(s, errores)
    for l in col:
        revisar(l, errores)

    for cuerpo in ("marte", "luna"):
        print(f"\n=== {cuerpo.upper()} ===")
        print(f"{'':28}" + "".join(f"{l['id'][:9]:>10}" for l in col))
        for s in extra[cuerpo]:
            print(f"{s['nombre'][:27]:28}" + "".join(f"{similitud(s, l):>10.0%}" for l in col))

    if errores:
        print("\nERRORES:")
        for e in errores:
            print(" -", e)
        sys.exit(1)
    print("\nDatos válidos ✔")


if __name__ == "__main__":
    main()
