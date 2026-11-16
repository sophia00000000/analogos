"""Utilidades compartidas: lee el modelo de js/config.js y calcula la similitud
igual que js/similitud.js (para que Python y la página den los mismos números)."""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def cargar_modelo():
    texto = (RAIZ / "js/config.js").read_text(encoding="utf-8")
    m = re.search(r"/\*MODELO-INICIO\*/(.*?)/\*MODELO-FIN\*/", texto, re.S)
    if not m:
        raise SystemExit("No se encontró el bloque MODELO-INICIO / MODELO-FIN en js/config.js")
    return json.loads(m.group(1))


def cargar_json(ruta):
    return json.loads((RAIZ / ruta).read_text(encoding="utf-8"))


def valores_colombia(lugar, modelo):
    """Une 'atributos' (geología) y 'atributos_operativos' (datos medidos).
    Un criterio geológico ausente vale 0; uno operativo ausente o null es None (sin dato)."""
    v = {}
    for clave, c in modelo["criterios"].items():
        if c["fuente"] == "operativos":
            v[clave] = (lugar.get("atributos_operativos") or {}).get(clave)
        else:
            v[clave] = lugar.get("atributos", {}).get(clave, 0)
    return v


def similitud(sitio, lugar, perfil, modelo):
    """Σ w·min(E,C) / Σ w·E, excluyendo criterios con C = null.
    Devuelve (valor, usados, disponibles). disponibles = criterios con w > 0 y E > 0."""
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
