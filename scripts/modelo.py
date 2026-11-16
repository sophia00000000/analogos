"""Shared utilities: reads the model from js/config.js and computes similarity
exactly like js/similitud.js (so Python and the web page give the same numbers)."""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def cargar_modelo():
    texto = (RAIZ / "js/config.js").read_text(encoding="utf-8")
    m = re.search(r"/\*MODELO-INICIO\*/(.*?)/\*MODELO-FIN\*/", texto, re.S)
    if not m:
        raise SystemExit("MODELO-INICIO / MODELO-FIN block not found in js/config.js")
    return json.loads(m.group(1))


def cargar_json(ruta):
    return json.loads((RAIZ / ruta).read_text(encoding="utf-8"))


def valores_colombia(lugar, modelo):
    """Merges 'atributos' (geology) and 'atributos_operativos' (measured data).
    A missing geological criterion counts as 0; a missing or null measured one is None (no data)."""
    v = {}
    for clave, c in modelo["criterios"].items():
        if c["fuente"] == "operativos":
            v[clave] = (lugar.get("atributos_operativos") or {}).get(clave)
        else:
            v[clave] = lugar.get("atributos", {}).get(clave, 0)
    return v


def similitud(sitio, lugar, perfil, modelo):
    """Σ w·min(E,C) / Σ w·E, excluding criteria where C = null.
    Returns (value, used, available). available = criteria with w > 0 and E > 0."""
    pesos = modelo["perfiles"][perfil]["pesos"]
    c_val = valores_colombia(lugar, modelo)
    num = den = 0.0
    usados = disponibles = 0
    for clave, w in pesos.items():
        e = sitio["atributos"].get(clave, 0) or 0
        if w <= 0 or e <= 0:
            continue
        disponibles += 1
        c = c_val.get(clave)
        if c is None:
            continue
        usados += 1
        num += w * min(e, c)
        den += w * e
    return (num / den if den else 0.0), usados, disponibles


def utf8_consola():
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
