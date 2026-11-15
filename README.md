# Análogos Terrestres · Colombia → Marte y Luna

Explorador web interactivo para el reto *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars*.

1. El usuario elige un sitio en **Marte** o en la **Luna** (mapa interactivo con zoom).
2. El mapa de **Colombia** colorea los lugares análogos de más a menos parecido y muestra un ranking.
3. Al elegir un lugar de Colombia se abre un panel con imagen, datos, por qué es análogo y enlaces a artículos.

Es un **sitio estático**: solo HTML, CSS, JavaScript y archivos JSON. No necesita backend ni base de datos.

---

## Requisitos

- Un navegador moderno (Chrome, Firefox, Edge o Safari).
- **Python 3** (solo para levantar un servidor local; no hay que instalar librerías).
- Conexión a internet para ver los mapas base y las fuentes tipográficas. Leaflet ya viene dentro del proyecto, en `lib/`.

## Cómo correrlo en local

```bash
# 1. Entra a la carpeta del proyecto
cd analogos

# 2. Levanta un servidor local
python -m http.server 8000        # en Mac/Linux puede ser: python3 -m http.server 8000

# 3. Abre en el navegador
#    http://localhost:8000
```

Para detener el servidor, presiona `Ctrl + C` en la terminal.

> ⚠️ **No abras `index.html` con doble clic.** El navegador bloquea la lectura de los archivos JSON cuando la página se abre como `file://`, y verás un aviso rojo. Usa siempre el servidor local.

Alternativa: si usas VS Code, la extensión **Live Server** hace lo mismo (clic derecho sobre `index.html` → *Open with Live Server*).

### Validar los datos (opcional)

Después de editar los JSON, corre este script. Revisa errores (coordenadas, criterios mal escritos, imágenes faltantes) e imprime la tabla de similitudes:

```bash
python scripts/validar_datos.py
```

---

## Estructura

```
analogos/
├── index.html                 ← estructura de la página
├── css/estilos.css            ← colores y tipografía (estilo NASA)
├── js/
│   ├── config.js              ← mapas base, criterios, pesos y colores  ← EDITAR AQUÍ
│   ├── similitud.js           ← fórmula de similitud
│   └── app.js                 ← lógica de mapas, ranking y paneles
├── data/
│   ├── extraterrestres.json   ← sitios de Marte y la Luna             ← EDITAR AQUÍ
│   └── colombia.json          ← lugares de Colombia                   ← EDITAR AQUÍ
├── img/
│   ├── marte/  luna/  colombia/   ← fotos (ver abajo)
├── lib/                       ← Leaflet 1.9.4 (no tocar)
└── scripts/validar_datos.py   ← validador en Python
```

## Cómo editar el contenido

### Agregar o cambiar un lugar de Colombia

Edita `data/colombia.json`:

```json
{
  "id": "tatacoa",
  "nombre": "Desierto de la Tatacoa",
  "nivel": "principal",
  "departamento": "Huila",
  "lat": 3.23, "lon": -75.17,
  "resumen": "Frase corta.",
  "porque": "Por qué es análogo.",
  "datos": [{ "etiqueta": "Tipo de ambiente", "valor": "..." }],
  "atributos": { "aridez": 0.8, "sedimentos": 0.9, "arcillas": 0.7 },
  "imagen": "img/colombia/tatacoa.jpg",
  "credito_imagen": "Foto: Autor, Wikimedia Commons, CC BY-SA 4.0",
  "fuentes": [{ "titulo": "Artículo X", "url": "https://..." }]
}
```

- `nivel`: `"principal"` (Tatacoa, Zipaquirá, Guajira: llevan etiqueta fija en el mapa y ficha completa) o `"secundario"`.
- `atributos`: puntaje de **0 a 1** por criterio. Los criterios que no apliquen se omiten (valen 0).
- `datos` es opcional (lo usan sobre todo los lugares principales).

Los sitios de Marte y la Luna (`data/extraterrestres.json`) tienen la misma forma, con el campo `uso` en lugar de `nivel`.

### Criterios disponibles

| Clave | Criterio | Peso |
|---|---|---|
| `hielo` | Hielo / agua congelada | 1.5 |
| `arcillas` | Arcillas (agua en minerales) | 1.2 |
| `sulfatos` | Sulfatos hidratados | 1.2 |
| `sales` | Sales / cloruros | 1.0 |
| `sedimentos` | Sedimentos, lagos y deltas | 1.0 |
| `aridez` | Aridez | 0.8 |
| `frio` | Frío extremo | 0.8 |
| `volcanico` | Rocas y relieve volcánico | 1.0 |
| `subterraneo` | Refugio subterráneo / tubos de lava | 1.0 |
| `hidrotermal` | Actividad hidrotermal | 1.0 |

Los pesos se cambian en `js/config.js`. Si los cambian, actualicen también `PESOS` en `scripts/validar_datos.py`.

### Fórmula de similitud

```
similitud = Σ peso_k · min(E_k, C_k)  ÷  Σ peso_k · E_k
```

`E` es el sitio de Marte o la Luna y `C` el lugar de Colombia. La fórmula responde: *¿qué fracción de lo que caracteriza al sitio extraterrestre está presente en el lugar colombiano?* Va de 0 % a 100 %.

> **Los puntajes actuales son preliminares.** Ajústenlos con su investigación y documenten en cada ficha de dónde salen los valores.

### Imágenes

Guarden las fotos con el nombre que indica el campo `imagen` (por ejemplo `img/colombia/tatacoa.jpg`). Mientras falte una imagen, la página muestra un recuadro con la ruta esperada.

Fuentes recomendadas, con licencia libre:
- Marte y Luna: NASA Photojournal (photojournal.jpl.nasa.gov) y NASA Image Library (images.nasa.gov). Las imágenes de la NASA en general son de dominio público.
- Colombia: Wikimedia Commons, o fotos propias del equipo.

Pongan siempre el crédito en `credito_imagen`. Usen imágenes de unos 1200 px de ancho o menos para que la página cargue rápido.

---

## Mapas

- **Colombia:** Leaflet con tres mapas base (oscuro de CARTO, calles de OpenStreetMap y relieve de OpenTopoMap), todos con nombres de ciudades. Se cambian con el botón de capas, arriba a la derecha.
- **Marte y Luna:** Leaflet con mosaicos de OpenPlanetary / USGS. En `js/config.js` hay una **lista de fuentes**: si una falla, la app prueba la siguiente, y si todas fallan dibuja una cuadrícula de coordenadas (los sitios siguen funcionando). Para cambiar o agregar fuentes, editen `CONFIG.cuerpos.marte.fuentes`.
- Los sitios polares (Shackleton, Peary) se dibujan en el borde del mapa, porque la proyección web no llega a los polos. La ficha indica la coordenada real.

## Despliegue

Como es un sitio estático, se puede publicar gratis en GitHub Pages, Netlify o Vercel subiendo la carpeta tal cual. (Siguiente paso: lo hacemos juntos.)
