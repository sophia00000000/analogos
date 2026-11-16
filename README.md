# Terrestrial Analogs · Colombia → Mars

Interactive web explorer for the challenge *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars*. This project focuses on **Mars** only.

1. The user picks a site on **Mars** (interactive map with zoom).
2. The **Colombia** map colors the analog places from most to least similar and shows a ranking, using either the **Science** or the **Landing & base** profile.
3. Choosing a place in Colombia opens a panel with an image, why it is an analog, NASA measured data and sources.

It is a **static site**: just HTML, CSS, JavaScript and JSON files. No backend or database is needed.

---

## Requirements

- A modern browser (Chrome, Firefox, Edge or Safari).
- **Python 3** (to run a local server and the scripts; no libraries to install).
- An internet connection for the base maps and web fonts. Leaflet is bundled in `lib/`.

## Running locally

```bash
# 1. Go to the project folder
cd analogos

# 2. If the measured data changed, recompute the scores and validate
python scripts/calcular_atributos.py
python scripts/validar_datos.py

# 3. Start a local server
python -m http.server 8000        # on Mac/Linux it may be: python3 -m http.server 8000

# 4. Open in the browser
#    http://localhost:8000
```

Press `Ctrl + C` in the terminal to stop the server.

> ⚠️ **Do not open `index.html` by double-clicking it.** Browsers block reading the JSON files when the page is opened as `file://`, and you will see a red warning. Always use the local server.

Alternative: in VS Code, the **Live Server** extension does the same (right-click `index.html` → *Open with Live Server*).

**Direct link:** the page can be opened with a site, profile and place already selected, e.g. `http://localhost:8000/#sitio=gale&perfil=base&lugar=tatacoa`. The address updates as you click, so it can be used to share a comparison.

### The two scripts

| Script | When to run it | What it does |
|---|---|---|
| `scripts/calcular_atributos.py` | **Every time the measured data change** (`medidos` in `colombia.json`) | Computes aridity, cold, thermal cycling, surface stability and flat terrain (0–1) and saves them in `atributos_operativos`. Prints the ranges and the attribute table. |
| `scripts/validar_datos.py` | After any change to the JSON files or the weights | Checks for errors (coordinates, criteria, profiles, values outside 0–1, missing images), lists missing measurements and prints the similarity matrix for each profile. |

Both read the criteria and weights directly from `js/config.js`, so Python and the web page always give the same numbers.

> Code identifiers and JSON keys are in Spanish (e.g. `atributos`, `medidos`, `perfil`); all text shown to users is in English.

---

## What data is shown

### Step 1 · Mars site

| Item | Description |
|---|---|
| Image and credit | Photo or orbital mosaic of the site (ESA, NASA, CNSA…). |
| Use and **profile** | What the site is proposed for, and the profile used by default: *Science* or *Landing & base*. |
| Coordinates | Actual latitude and longitude of the site. |
| Summary and why | What the place has and why it matters for exploration. |
| Sources | NASA (Perseverance, Curiosity, Viking, MRO, Mars Trek), ESA Mars Express, NASA/PSI SWIM and the USGS Gazetteer of Planetary Nomenclature. |

| Profile | Sites |
|---|---|
| Landing & base | Arcadia Planitia, Utopia Planitia, Deuteronilus/Protonilus Mensae, Hellas Planitia, Tharsis/Arsia Mons |
| Science | Jezero Crater, Gale Crater, Mawrth Vallis, Valles Marineris |

### Step 2 · Colombia map and ranking

- A **Science / Landing & base** selector. Choosing a site activates its profile; the selector lets you compare the same site under the other one.
- Each place is colored by similarity, and the ranking orders them from highest to lowest.
- Each row says how many criteria were used ("6 of 7 criteria").
- Results with **incomplete data** are flagged ⚠, dimmed (dashed outline on the map) and moved to the bottom of the ranking. Hovering explains which data are missing.

### Step 3 · Colombian place details

| Block | Content |
|---|---|
| Similarity | Percentage, class, profile used, "computed with N of M criteria", ⚠ warning if data are incomplete, and the 3 criteria that contribute most. |
| Description | Summary, why it is an analog and, for the main places, environment type, key features and use as an analog. |
| **Measured data** | Table grouped into *Temperature*, *Humidity and radiation*, *Rainfall and erosion* and *Topography*. "—" = no data; "pending" = elevation and slope not yet obtained. Below it: data notes, % of valid MODIS observations, the computed scores (0–1) and the citation. |
| Sources | NASA POWER, NASA LP DAAC (MODIS) and, depending on the place, the Colombian Geological Survey, Colombian National Parks or scientific articles. |

#### Measured data (`medidos` in `data/colombia.json`)

Taken from `data/datos_completos_8_sitios.xlsx`.

| Field | Variable | Source |
|---|---|---|
| `t_aire_media`, `t_aire_max`, `t_aire_min` | Air temperature at 2 m (°C) | NASA POWER (`T2M`, `T2M_MAX`, `T2M_MIN`), monthly average 2020–2026 |
| `lst_dia_mediana`, `lst_dia_p95` | Daytime land surface temperature: median and 95th percentile (°C) | NASA MODIS Terra MOD11A2 v061 via AppEEARS, 1 km, 8-day composites, 2019-12-27 to 2026-11-01 |
| `lst_noche_mediana`, `lst_noche_p5` | Nighttime land surface temperature: median and 5th percentile (°C) | same |
| `amplitud_termica` | Surface day − night (°C) | computed from MODIS |
| `pct_validos_dia`, `pct_validos_noche` | % of valid MODIS observations | MODIS |
| `humedad_relativa` | Relative humidity at 2 m (%) | NASA POWER (`RH2M`) |
| `radiacion_kwh_m2_dia` | Surface solar radiation (kWh/m²/day) | NASA POWER (`ALLSKY_SFC_SW_DWN`) |
| `lluvia_anual_mm` | Average annual rainfall (mm) | NASA POWER (`PRECTOTCORR`) |
| `erosividad_mfi` | Modified Fournier Index (how aggressive the rainfall is, not total erosion) | computed from POWER monthly rainfall |
| `elevacion_m`, `pendiente_media`, `pendiente_max` | Topography | **not yet obtained** (`null`) |

`notas_datos` explains each place's limitations:
- **Alta Guajira:** the point (12.47, -71.73) falls over the sea, so there is no MODIS data. It still needs to be moved inland.
- **Gorgona Island:** only 25% of nighttime MODIS observations are valid because of cloud cover.
- **Zipaquirá:** MODIS measures the surface of the town, not the inside of the mine.
- **Nevado del Ruiz and Nevado del Tolima:** POWER air temperature (~50 km cell) averages the region, not the summit. Cold is based on MODIS surface temperature (1 km).

The places' coordinates are those of the measurement table.

Citation: *NASA POWER Project; Wan, Z., Hook, S., Hulley, G. MOD11A2 v061, NASA LP DAAC; AppEEARS Team (2026), NASA LP DAAC.* (field `cita_datos` in `colombia.json`).

---

## How similarity is evaluated

### 1. Criteria

There are 13 criteria, each scored from **0 to 1**. They come from two sources:

| Criterion | Key | Source in Colombia | What it measures |
|---|---|---|---|
| Ice / frozen water | `hielo` | geology (`atributos`) | Presence of ice or glaciers |
| Clays | `arcillas` | geology | Water bound in minerals |
| Hydrated sulfates | `sulfatos` | geology | Minerals formed with water |
| Salts / chlorides | `sales` | geology | Evaporites, halite |
| Sediments, lakes and deltas | `sedimentos` | geology | Exposed sedimentary layers |
| Volcanic rocks and landforms | `volcanico` | geology | Basalts, volcanoes |
| Subsurface shelter / lava tubes | `subterraneo` | geology | Caves, mines, lava tubes |
| Hydrothermal activity | `hidrotermal` | geology | Hot springs, fumaroles |
| **Aridity** | `aridez` | **measured** | Low rainfall and low humidity |
| **Extreme cold** | `frio` | **measured** | Cold surface at night |
| **Day-night thermal cycling** | `ciclo_termico` | **measured** | Day-night surface temperature difference (huge on Mars) |
| **Stable surface / low erosion** | `superficie_estable` | **measured** | Low rainfall erosivity: the terrain changes little, as on Mars |
| **Flat terrain** | `terreno_plano` | **measured** | Low slope, key for landing and building (**no data yet**) |

- **Geology:** scores are assigned by the team from the literature and are **preliminary**. A criterion that is not listed counts as 0.
- **Measured:** computed by `scripts/calcular_atributos.py` and saved in `atributos_operativos`. They replace the aridity and cold values that used to be set by hand.
- On **Mars**, `aridez`, `frio`, `ciclo_termico` and `superficie_estable` equal 1, because Mars is the extreme. `terreno_plano` equals 1 on the base sites.

### 2. How the measured criteria are computed

**Min-max normalization across the 8 Colombian places**, ignoring `null` values:

```
norm(x) = (x − min) ÷ (max − min)        inv(x) = 1 − norm(x)

aridez             = 0.7 · inv(lluvia_anual_mm) + 0.3 · inv(humedad_relativa)
frio               = inv(lst_noche_mediana)
ciclo_termico      = norm(amplitud_termica)
superficie_estable = inv(erosividad_mfi)
terreno_plano      = inv(pendiente_media)
```

On each variable, the Colombian place most similar to Mars scores 1 and the least similar scores 0. For example, Alta Guajira has the lowest rainfall (396 mm) and an aridity of 0.99; Gorgona has the highest (2704 mm) and an aridity of 0.07. If an input is missing, the criterion stays `null`, not 0.

> The scale is **relative**: a 1 means "the most Mars-like of the Colombian places", not "identical to Mars". Adding or removing a place changes the scores, so the script must be run again.

Current values:

| Place | aridity | cold | thermal cycling | stable surface | flat terrain |
|---|---|---|---|---|---|
| Tatacoa Desert | 0.71 | 0.00 | 0.60 | 0.62 | — |
| Zipaquirá Salt Mine | 0.24 | 0.63 | 0.73 | 0.32 | — |
| Alta Guajira | 0.99 | — | — | 1.00 | — |
| La Candelaria Desert | 0.44 | 0.54 | 0.90 | 0.50 | — |
| Nevado del Ruiz | 0.27 | 1.00 | 0.54 | 0.50 | — |
| Nevado del Tolima | 0.33 | 0.94 | 0.65 | 0.57 | — |
| Gorgona Island | 0.07 | 0.12 | 0.00 | 0.00 | — |
| Paipa Hot Springs | 0.51 | 0.60 | 1.00 | 0.59 | — |

Solar radiation is shown as data but is not used in the score.

### 3. Two weight profiles

| Criterion | Science | Landing & base |
|---|---|---|
| Flat terrain | 0 | 2.0 |
| Ice | 1.5 | 1.5 |
| Aridity | 0.8 | 1.2 |
| Thermal cycling | 0 | 1.2 |
| Cold | 0.8 | 1.0 |
| Subsurface | 1.0 | 0.8 |
| Stable surface | 0 | 0.6 |
| Clays | 1.2 | 0.3 |
| Sulfates | 1.2 | 0.3 |
| Salts | 1.0 | 0.3 |
| Sediments | 1.0 | 0.3 |
| Volcanic | 1.0 | 0.3 |
| Hydrothermal | 1.0 | 0.3 |

- **Science** looks for water-related geology and possible past life.
- **Landing & base** looks for where to operate: flat terrain, ice as a resource, and a dry, cold, stable environment with large temperature swings.

The weights live in the `MODELO` block of `js/config.js`. That block is JSON and is also read by the Python scripts: edit it without single quotes or trailing commas.

### 4. Formula and missing data

```
similarity = Σ weight_k · min(E_k, C_k)  ÷  Σ weight_k · E_k
```

`E` is the Mars site and `C` the Colombian place. The formula answers: *what fraction of what characterizes the Mars site is present in the Colombian place?*

- `min(E, C)`: a place gains nothing for having **more** of a feature than the Mars site.
- A criterion with weight 0 in the profile, or that the Mars site does not have (E = 0), does not count.
- **If the Colombian value is `null`, the criterion is excluded from both the numerator and the denominator.** It does not count as 0, because that would penalize missing data as if the feature were absent.

**Coverage** = criteria used ÷ criteria available. Available criteria are those with weight > 0 in the profile **and** a value > 0 on the Mars site, i.e. the ones that actually define that site. If coverage is **below 60%** (`cobertura_minima` in `config.js`), the result is flagged **⚠ incomplete data**, dimmed and moved to the bottom of the ranking.

> Only criteria the Mars site has are counted. If all 13 weighted criteria were counted, almost no place would miss 40% of them and the warning would never trigger. For example, against Arcadia, Alta Guajira misses 3 of 7 criteria (cold, thermal cycling and flat terrain): its coverage is 57%, so it is flagged ⚠.

Because `terreno_plano` has no data yet, in the base profile **no place** reaches 100% coverage (e.g. 6 of 7 against Arcadia).

### 5. Example: Gale Crater (Science profile)

| Criterion | Weight | Gale (E) | Tatacoa (C) | w·E | w·min | Guajira (C) | w·E | w·min |
|---|---|---|---|---|---|---|---|---|
| Sediments | 1.0 | 0.9 | 0.9 | 0.90 | 0.90 | 0.7 | 0.90 | 0.70 |
| Clays | 1.2 | 0.8 | 0.7 | 0.96 | 0.84 | 0.4 | 0.96 | 0.48 |
| Sulfates | 1.2 | 0.8 | 0.2 | 0.96 | 0.24 | 0.3 | 0.96 | 0.36 |
| Aridity | 0.8 | 1 | 0.71 | 0.80 | 0.57 | 0.99 | 0.80 | 0.79 |
| Cold | 0.8 | 1 | 0.00 | 0.80 | 0 | *null* | — | — |
| **Total** | | | | **4.42** | **2.55** | | **3.62** | **2.33** |

- Tatacoa: 2.55 ÷ 4.42 = **58%** (5 of 5 criteria).
- Guajira: 2.33 ÷ 3.62 = **64%** (4 of 5 criteria, 80%, no ⚠). It ranks above Tatacoa because cold, where Tatacoa scores 0, is not counted for it.

### 6. Similarity classes

| Similarity | Class | Color |
|---|---|---|
| ≥ 70% | Very similar | red |
| 45–69% | Similar | orange |
| 20–44% | Weakly similar | blue |
| < 20% | Not similar | gray |

Marker size also changes with the class, so the map does not rely on color alone.

### Pending work

- **Slope and elevation** for the 8 places (SRTM or NASADEM on NASA Earthdata). Until then, `terreno_plano` is not counted, even though it is the highest-weighted criterion in the base profile.
- **A new inland point for Alta Guajira**, to get MODIS data (cold and thermal cycling).
- Review the preliminary geology scores with the team's research.

---

## Structure

```
analogos/
├── index.html                 ← page structure and methodology
├── css/estilos.css            ← colors and typography (NASA style)
├── js/
│   ├── config.js              ← MODELO (criteria, profiles, weights), classes and maps  ← EDIT HERE
│   ├── similitud.js           ← similarity formula and coverage
│   └── app.js                 ← maps, profile selector, ranking and panels
├── data/
│   ├── extraterrestres.json   ← Mars sites (with profile)                      ← EDIT HERE
│   ├── colombia.json          ← Colombian places + measured data               ← EDIT HERE
│   └── datos_completos_8_sitios.xlsx  ← original NASA POWER / MODIS data
├── img/
│   ├── marte/  colombia/      ← photos
├── lib/                       ← Leaflet 1.9.4 (do not edit)
└── scripts/
    ├── calcular_atributos.py  ← measured data → atributos_operativos
    ├── validar_datos.py       ← validator and similarity matrix per profile
    └── modelo.py              ← model loading and formula (shared)
```

## Editing the content

### Adding or changing a Colombian place

Edit `data/colombia.json`, then run `python scripts/calcular_atributos.py`:

```json
{
  "id": "tatacoa",
  "nombre": "Tatacoa Desert",
  "nivel": "principal",
  "departamento": "Huila",
  "lat": 3.23, "lon": -75.17,
  "resumen": "Short sentence.",
  "porque": "Why it is an analog.",
  "datos": [{ "etiqueta": "Environment type", "valor": "..." }],
  "atributos": { "sedimentos": 0.9, "arcillas": 0.7, "sulfatos": 0.2, "sales": 0.2 },
  "atributos_operativos": { "...": "written by calcular_atributos.py, do not edit" },
  "medidos": {
    "t_aire_media": 20.46, "t_aire_max": 27.85, "t_aire_min": 15.02,
    "lst_dia_mediana": 36, "lst_dia_p95": 42.23, "lst_noche_mediana": 25.59, "lst_noche_p5": 23.11,
    "amplitud_termica": 10.41, "humedad_relativa": 80.03, "radiacion_kwh_m2_dia": 4.54,
    "lluvia_anual_mm": 1367.55, "erosividad_mfi": 160.31,
    "pct_validos_dia": 68.79, "pct_validos_noche": 60.83,
    "elevacion_m": null, "pendiente_media": null, "pendiente_max": null
  },
  "notas_datos": "",
  "imagen": "img/colombia/tatacoa.jpeg",
  "credito_imagen": "Photo: Author, license",
  "fuentes": [{ "titulo": "Agency · Page", "url": "https://..." }]
}
```

- `nivel`: `"principal"` (main: Tatacoa, Zipaquirá, Guajira get a permanent label on the map and a full card) or `"secundario"` (secondary).
- `atributos`: **geological** criteria only (0 to 1). Aridity and cold no longer go here; the validator warns if they do.
- `medidos`: values exactly as given by the source. Use `null` when there is no data; **never invent or fill in values**.
- `fuentes`: prefer agencies and official bodies (NASA, ESA, USGS, SGC, National Parks) or scientific articles.

### Adding or changing a Mars site

In `data/extraterrestres.json`, each site has `"perfil": "ciencia"` (science) or `"base"`, a `uso` field and its `atributos`. Besides the geological ones, it must have `aridez`, `frio`, `ciclo_termico` and `superficie_estable` set to 1, and `terreno_plano` set to 1 if it is a base site.

### Images

Save photos with the name given in the `imagen` field (e.g. `img/colombia/tatacoa.jpeg`). `.jpg`, `.jpeg`, `.png`, `.webp` and `.avif` all work. If an image is missing, the page shows a striped placeholder.

Always fill in `credito_imagen`: if it is empty, the photo is shown without a credit. **Pending:** Tatacoa, Zipaquirá and La Candelaria.

Recommended sources:
- Mars: NASA Photojournal (photojournal.jpl.nasa.gov), NASA Image Library (images.nasa.gov) and ESA. NASA images are generally in the public domain; ESA/DLR/FU Berlin images are usually CC BY-SA 3.0 IGO.
- Colombia: photos from official bodies or universities (credited to the author), or the team's own photos.

Use images about 1200 px wide or smaller so the page loads quickly.

---

## Maps

- **Colombia:** Leaflet with two base maps (OpenStreetMap streets and OpenTopoMap terrain), with city names. Switch them with the layers button at the top right.
- **Mars:** Leaflet with **NASA Mars Trek** tiles: Viking MDIM 2.1 (NASA/JPL/USGS) and, as a fallback, MOLA (NASA/GSFC). It uses a geographic projection (EPSG:4326), so the poles are visible. `js/config.js` has a **list of sources**: if one fails the app tries the next, and if all fail it draws a coordinate grid (the sites still work). To change or add sources, edit `CONFIG.cuerpos.marte.fuentes`.

## Deployment

Since it is a static site, it can be published for free on GitHub Pages, Netlify or Vercel by uploading the folder as is.
