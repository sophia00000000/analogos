# Análogos Terrestres · Colombia → Marte

Explorador web interactivo para el reto *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars*. Este proyecto se centra solo en **Marte**.

1. El usuario elige un sitio en **Marte** (mapa interactivo con zoom).
2. El mapa de **Colombia** colorea los lugares análogos de más a menos parecido y muestra un ranking, según el perfil **Ciencia** o **Aterrizaje y base**.
3. Al elegir un lugar de Colombia se abre un panel con imagen, por qué es análogo, datos medidos por la NASA y fuentes.

Es un **sitio estático**: solo HTML, CSS, JavaScript y archivos JSON. No necesita backend ni base de datos.

---

## Requisitos

- Un navegador moderno (Chrome, Firefox, Edge o Safari).
- **Python 3** (para levantar un servidor local y correr los scripts; no hay que instalar librerías).
- Conexión a internet para ver los mapas base y las fuentes tipográficas. Leaflet ya viene dentro del proyecto, en `lib/`.

## Cómo correrlo en local

```bash
# 1. Entra a la carpeta del proyecto
cd analogos

# 2. Si cambiaron los datos medidos, recalcula los puntajes y valida
python scripts/calcular_atributos.py
python scripts/validar_datos.py

# 3. Levanta un servidor local
python -m http.server 8000        # en Mac/Linux puede ser: python3 -m http.server 8000

# 4. Abre en el navegador
#    http://localhost:8000
```

Para detener el servidor, presiona `Ctrl + C` en la terminal.

> ⚠️ **No abras `index.html` con doble clic.** El navegador bloquea la lectura de los archivos JSON cuando la página se abre como `file://`, y verás un aviso rojo. Usa siempre el servidor local.

Alternativa: si usas VS Code, la extensión **Live Server** hace lo mismo (clic derecho sobre `index.html` → *Open with Live Server*).

**Enlace directo:** se puede abrir la página con un sitio, un perfil y un lugar ya elegidos, por ejemplo `http://localhost:8000/#sitio=gale&perfil=base&lugar=tatacoa`. La dirección se actualiza sola al hacer clic, así que sirve para compartir una comparación.

### Los dos scripts

| Script | Cuándo correrlo | Qué hace |
|---|---|---|
| `scripts/calcular_atributos.py` | **Cada vez que cambien los datos medidos** (`medidos` en `colombia.json`) | Calcula aridez, frío, ciclo térmico, superficie estable y terreno plano (0–1) y los guarda en `atributos_operativos`. Imprime los rangos y la tabla de atributos. |
| `scripts/validar_datos.py` | Después de cualquier cambio en los JSON o en los pesos | Revisa errores (coordenadas, criterios, perfiles, valores fuera de 0–1, imágenes faltantes), lista las mediciones que faltan e imprime la matriz de similitud de cada perfil. |

Los dos leen los criterios y pesos directamente de `js/config.js`, así que Python y la página siempre dan los mismos números.

---

## Qué datos se muestran

### Paso 1 · Sitio de Marte

| Dato | Qué es |
|---|---|
| Imagen y crédito | Foto o mosaico orbital del sitio (ESA, NASA, CNSA…). |
| Uso y **perfil** | Para qué se propone y con qué perfil se compara por defecto: *Ciencia* o *Aterrizaje y base*. |
| Coordenadas | Latitud y longitud reales del sitio. |
| Resumen y por qué | Qué tiene el lugar y por qué importa para la exploración. |
| Fuentes | NASA (Perseverance, Curiosity, Viking, MRO, Mars Trek), ESA Mars Express, NASA/PSI SWIM y el catálogo de nombres planetarios del USGS. |

| Perfil | Sitios |
|---|---|
| Aterrizaje y base | Arcadia Planitia, Utopia Planitia, Deuteronilus/Protonilus Mensae, Hellas Planitia, Tharsis/Arsia Mons |
| Ciencia | Cráter Jezero, cráter Gale, Mawrth Vallis, Valles Marineris |

### Paso 2 · Mapa y ranking de Colombia

- Un selector **Ciencia / Aterrizaje y base**. Al elegir un sitio se activa su perfil, y con el selector se puede comparar el mismo sitio con el otro.
- Cada lugar se colorea según su similitud y el ranking los ordena de mayor a menor.
- Cada fila dice con cuántos criterios se calculó ("6 de 7 criterios").
- Los resultados con **datos incompletos** se marcan con ⚠, se ven atenuados (con borde punteado en el mapa) y van al final del ranking. Al pasar el cursor se explica qué dato falta.

### Paso 3 · Detalle del lugar de Colombia

| Bloque | Contenido |
|---|---|
| Similitud | Porcentaje, clase, perfil usado, "calculado con N de M criterios", aviso ⚠ si los datos están incompletos y los 3 criterios que más aportan. |
| Descripción | Resumen, por qué es análogo y, en los lugares principales, tipo de ambiente, rasgos clave y uso como análogo. |
| **Datos medidos** | Tabla agrupada en *Temperatura*, *Humedad y radiación*, *Lluvia y erosión* y *Relieve*. "—" = sin dato; "pendiente" = elevación y pendiente aún no obtenidas. Debajo: notas del dato, % de observaciones MODIS válidas, los puntajes calculados (0–1) y la cita. |
| Fuentes | NASA POWER, NASA LP DAAC (MODIS) y, según el lugar, Servicio Geológico Colombiano, Parques Nacionales Naturales o artículos científicos. |

#### Datos medidos (`medidos` en `data/colombia.json`)

Vienen de `data/datos_completos_8_sitios.xlsx`.

| Campo | Variable | Fuente |
|---|---|---|
| `t_aire_media`, `t_aire_max`, `t_aire_min` | Temperatura del aire a 2 m (°C) | NASA POWER (`T2M`, `T2M_MAX`, `T2M_MIN`), promedio mensual 2020–2026 |
| `lst_dia_mediana`, `lst_dia_p95` | Temperatura de superficie de día: mediana y percentil 95 (°C) | NASA MODIS Terra MOD11A2 v061 vía AppEEARS, 1 km, composites de 8 días, 27/12/2019–01/11/2026 |
| `lst_noche_mediana`, `lst_noche_p5` | Temperatura de superficie de noche: mediana y percentil 5 (°C) | ídem |
| `amplitud_termica` | Superficie día − noche (°C) | calculada con MODIS |
| `pct_validos_dia`, `pct_validos_noche` | % de observaciones MODIS válidas | MODIS |
| `humedad_relativa` | Humedad relativa a 2 m (%) | NASA POWER (`RH2M`) |
| `radiacion_kwh_m2_dia` | Radiación solar en superficie (kWh/m²/día) | NASA POWER (`ALLSKY_SFC_SW_DWN`) |
| `lluvia_anual_mm` | Lluvia anual promedio (mm) | NASA POWER (`PRECTOTCORR`) |
| `erosividad_mfi` | Índice de Fournier modificado (agresividad de la lluvia, no erosión total) | calculado con la lluvia mensual de POWER |
| `elevacion_m`, `pendiente_media`, `pendiente_max` | Relieve | **pendiente de obtener** (`null`) |

`notas_datos` explica las limitaciones de cada lugar:
- **Alta Guajira:** el punto (12.47, -71.73) cae sobre el mar, así que no hay datos MODIS. Falta reubicarlo tierra adentro.
- **Isla Gorgona:** solo un 25 % de datos nocturnos MODIS válidos, por la nubosidad.
- **Zipaquirá:** MODIS mide la superficie del pueblo, no el interior de la mina.
- **Nevados del Ruiz y del Tolima:** el aire de POWER (celda ~50 km) promedia la región, no la cima. Para el frío se usa la superficie MODIS (1 km).

Las coordenadas de los lugares son las de la tabla de medición.

Cita: *NASA POWER Project; Wan, Z., Hook, S., Hulley, G. MOD11A2 v061, NASA LP DAAC; AppEEARS Team (2026), NASA LP DAAC.* (campo `cita_datos` en `colombia.json`).

---

## Cómo se evalúa la similitud

### 1. Criterios

Hay 13 criterios, cada uno con un puntaje de **0 a 1**. Vienen de dos fuentes:

| Criterio | Clave | Origen en Colombia | Qué mide |
|---|---|---|---|
| Hielo / agua congelada | `hielo` | geología (`atributos`) | Presencia de hielo o glaciar |
| Arcillas | `arcillas` | geología | Agua ligada en minerales |
| Sulfatos hidratados | `sulfatos` | geología | Minerales formados con agua |
| Sales / cloruros | `sales` | geología | Evaporitas, halita |
| Sedimentos, lagos y deltas | `sedimentos` | geología | Capas sedimentarias expuestas |
| Rocas y relieve volcánico | `volcanico` | geología | Basaltos, volcanes |
| Refugio subterráneo / tubos | `subterraneo` | geología | Cuevas, minas, tubos de lava |
| Actividad hidrotermal | `hidrotermal` | geología | Fuentes termales, fumarolas |
| **Aridez** | `aridez` | **medido** | Poca lluvia y baja humedad |
| **Frío extremo** | `frio` | **medido** | Superficie fría de noche |
| **Ciclo térmico día-noche** | `ciclo_termico` | **medido** | Diferencia de temperatura día-noche en la superficie (en Marte es enorme) |
| **Superficie estable / baja erosión** | `superficie_estable` | **medido** | Lluvia poco agresiva: el terreno cambia poco, como en Marte |
| **Terreno plano** | `terreno_plano` | **medido** | Pendiente baja, clave para aterrizar y construir (**aún sin dato**) |

- **Geología:** los puntajes los asigna el equipo a partir de la literatura y son **preliminares**. Un criterio que no aparece vale 0.
- **Medidos:** los calcula `scripts/calcular_atributos.py` y los guarda en `atributos_operativos`. Reemplazan la aridez y el frío que antes se ponían a mano.
- En **Marte**, `aridez`, `frio`, `ciclo_termico` y `superficie_estable` valen 1, porque Marte es el extremo. `terreno_plano` vale 1 en los sitios de base.

### 2. Cómo se calculan los criterios medidos

Normalización **min-max entre los 8 lugares de Colombia**, ignorando los `null`:

```
norm(x) = (x − mín) ÷ (máx − mín)        inv(x) = 1 − norm(x)

aridez             = 0,7 · inv(lluvia_anual_mm) + 0,3 · inv(humedad_relativa)
frio               = inv(lst_noche_mediana)
ciclo_termico      = norm(amplitud_termica)
superficie_estable = inv(erosividad_mfi)
terreno_plano      = inv(pendiente_media)
```

En cada variable, el lugar colombiano más parecido a Marte vale 1 y el menos parecido vale 0. Por ejemplo, la Alta Guajira tiene la menor lluvia (396 mm) y su aridez da 0,99. Gorgona tiene la mayor lluvia (2704 mm) y su aridez da 0,07. Si falta un insumo, el criterio queda `null`, no 0.

> La escala es **relativa**: un 1 significa "el más marciano de los lugares colombianos", no "igual a Marte". Si se agrega o quita un lugar, los puntajes cambian, y hay que volver a correr el script.

Valores actuales:

| Lugar | aridez | frío | ciclo térmico | superficie estable | terreno plano |
|---|---|---|---|---|---|
| Desierto de la Tatacoa | 0,71 | 0,00 | 0,60 | 0,62 | — |
| Mina de sal de Zipaquirá | 0,24 | 0,63 | 0,73 | 0,32 | — |
| Alta Guajira | 0,99 | — | — | 1,00 | — |
| Desierto de la Candelaria | 0,44 | 0,54 | 0,90 | 0,50 | — |
| Nevado del Ruiz | 0,27 | 1,00 | 0,54 | 0,50 | — |
| Nevado del Tolima | 0,33 | 0,94 | 0,65 | 0,57 | — |
| Isla Gorgona | 0,07 | 0,12 | 0,00 | 0,00 | — |
| Aguas termales de Paipa | 0,51 | 0,60 | 1,00 | 0,59 | — |

**¿Por qué la radiación solar no entra?** En los 8 lugares varía muy poco (4,3–5,8 kWh/m²/día). Además, la de Marte es de otro tipo: más débil y con más ultravioleta, porque no hay capa de ozono. No sirve para distinguir un análogo de otro, así que solo se muestra como dato.

### 3. Dos perfiles de pesos

| Criterio | Ciencia | Aterrizaje y base |
|---|---|---|
| Terreno plano | 0 | 2.0 |
| Hielo | 1.5 | 1.5 |
| Aridez | 0.8 | 1.2 |
| Ciclo térmico | 0 | 1.2 |
| Frío | 0.8 | 1.0 |
| Subterráneo | 1.0 | 0.8 |
| Superficie estable | 0 | 0.6 |
| Arcillas | 1.2 | 0.3 |
| Sulfatos | 1.2 | 0.3 |
| Sales | 1.0 | 0.3 |
| Sedimentos | 1.0 | 0.3 |
| Volcánico | 1.0 | 0.3 |
| Hidrotermal | 1.0 | 0.3 |

- **Ciencia** busca la geología del agua y la posible vida pasada.
- **Aterrizaje y base** busca dónde operar: terreno plano, hielo como recurso, y un ambiente seco, frío, con grandes cambios de temperatura y estable.

Los pesos están en el bloque `MODELO` de `js/config.js`. Ese bloque es JSON y lo leen también los scripts de Python: hay que editarlo sin comillas simples ni comas al final.

### 4. Fórmula y datos faltantes

```
similitud = Σ peso_k · min(E_k, C_k)  ÷  Σ peso_k · E_k
```

`E` es el sitio de Marte y `C` el lugar de Colombia. La fórmula responde: *¿qué fracción de lo que caracteriza al sitio de Marte está presente en el lugar colombiano?*

- `min(E, C)`: un lugar no gana puntos por tener **más** de un rasgo que el sitio de Marte.
- Un criterio con peso 0 en el perfil, o que el sitio de Marte no tiene (E = 0), no cuenta.
- **Si el valor de Colombia es `null`, el criterio se excluye del numerador y del denominador.** No se cuenta como 0, porque eso castigaría la falta de dato como si fuera falta del rasgo.

**Cobertura** = criterios usados ÷ criterios disponibles. Los disponibles son los que tienen peso > 0 en el perfil **y** valor > 0 en el sitio de Marte, es decir, los que de verdad definen ese sitio. Si la cobertura es **menor al 60 %** (`cobertura_minima` en `config.js`), el resultado se marca **⚠ datos incompletos**, se atenúa y va al final del ranking.

> Se cuentan solo los criterios que el sitio de Marte tiene. Si se contaran los 13 con peso, a casi ningún lugar le faltaría el 40 % y el aviso nunca saltaría. Por ejemplo, con Arcadia a la Alta Guajira le faltan 3 de 7 criterios (frío, ciclo térmico y terreno plano): su cobertura es 57 % y se marca ⚠.

Como `terreno_plano` todavía no tiene datos, en el perfil de base **ningún lugar** llega al 100 % de cobertura (por ejemplo, 6 de 7 con Arcadia).

### 5. Ejemplo: cráter Gale (perfil Ciencia)

| Criterio | Peso | Gale (E) | Tatacoa (C) | peso·E | peso·min | Guajira (C) | peso·E | peso·min |
|---|---|---|---|---|---|---|---|---|
| Sedimentos | 1.0 | 0.9 | 0.9 | 0.90 | 0.90 | 0.7 | 0.90 | 0.70 |
| Arcillas | 1.2 | 0.8 | 0.7 | 0.96 | 0.84 | 0.4 | 0.96 | 0.48 |
| Sulfatos | 1.2 | 0.8 | 0.2 | 0.96 | 0.24 | 0.3 | 0.96 | 0.36 |
| Aridez | 0.8 | 1 | 0.71 | 0.80 | 0.57 | 0.99 | 0.80 | 0.79 |
| Frío | 0.8 | 1 | 0.00 | 0.80 | 0 | *null* | — | — |
| **Total** | | | | **4.42** | **2.55** | | **3.62** | **2.33** |

- Tatacoa: 2.55 ÷ 4.42 = **58 %** (5 de 5 criterios).
- Guajira: 2.33 ÷ 3.62 = **64 %** (4 de 5 criterios, 80 %, sin ⚠). Queda por encima de Tatacoa porque el frío, donde Tatacoa saca 0, no se le cuenta.

### 6. Clases de similitud

| Similitud | Clase | Color |
|---|---|---|
| ≥ 70 % | Muy similar | rojo |
| 45–69 % | Similar | naranja |
| 20–44 % | Poco similar | azul |
| < 20 % | No similar | gris |

El tamaño del marcador también cambia con la clase, para no depender solo del color.

### Pendientes

- **Pendiente y elevación** de los 8 lugares (SRTM o NASADEM en NASA Earthdata). Mientras falten, `terreno_plano` no cuenta, aunque es el criterio de mayor peso del perfil de base.
- **Nuevo punto para la Alta Guajira**, tierra adentro, para tener datos MODIS (frío y ciclo térmico).
- Revisar los puntajes geológicos preliminares con la investigación del equipo.

---

## Estructura

```
analogos/
├── index.html                 ← estructura de la página y metodología
├── css/estilos.css            ← colores y tipografía (estilo NASA)
├── js/
│   ├── config.js              ← MODELO (criterios, perfiles, pesos), clases y mapas  ← EDITAR AQUÍ
│   ├── similitud.js           ← fórmula de similitud y cobertura
│   └── app.js                 ← mapas, selector de perfil, ranking y paneles
├── data/
│   ├── extraterrestres.json   ← sitios de Marte (con perfil)                  ← EDITAR AQUÍ
│   ├── colombia.json          ← lugares de Colombia + datos medidos           ← EDITAR AQUÍ
│   └── datos_completos_8_sitios.xlsx  ← datos originales NASA POWER / MODIS
├── img/
│   ├── marte/  colombia/      ← fotos
├── lib/                       ← Leaflet 1.9.4 (no tocar)
└── scripts/
    ├── calcular_atributos.py  ← datos medidos → atributos_operativos
    ├── validar_datos.py       ← validador y matriz de similitud por perfil
    └── modelo.py              ← lectura del modelo y fórmula (compartido)
```

## Cómo editar el contenido

### Agregar o cambiar un lugar de Colombia

Edita `data/colombia.json` y luego corre `python scripts/calcular_atributos.py`:

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
  "atributos": { "sedimentos": 0.9, "arcillas": 0.7, "sulfatos": 0.2, "sales": 0.2 },
  "atributos_operativos": { "...": "lo escribe calcular_atributos.py, no editar" },
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
  "credito_imagen": "Foto: Autor, licencia",
  "fuentes": [{ "titulo": "Agencia · Página", "url": "https://..." }]
}
```

- `nivel`: `"principal"` (Tatacoa, Zipaquirá, Guajira: llevan etiqueta fija en el mapa y ficha completa) o `"secundario"`.
- `atributos`: solo los criterios **geológicos** (0 a 1). Aridez y frío ya no van aquí: el validador avisa si se ponen.
- `medidos`: valores tal cual de la fuente. Usen `null` si no hay dato; **nunca inventen ni rellenen**.
- `fuentes`: preferir agencias y entidades oficiales (NASA, ESA, USGS, SGC, Parques Nacionales) o artículos científicos.

### Agregar o cambiar un sitio de Marte

En `data/extraterrestres.json`, cada sitio lleva `"perfil": "ciencia"` o `"base"`, el campo `uso` y sus `atributos`. Además de los geológicos, debe tener `aridez`, `frio`, `ciclo_termico` y `superficie_estable` en 1, y `terreno_plano` en 1 si es de base.

### Imágenes

Guarden las fotos con el nombre que indica el campo `imagen` (por ejemplo `img/colombia/tatacoa.jpeg`). Sirven `.jpg`, `.jpeg`, `.png`, `.webp` y `.avif`. Si falta una imagen, la página muestra un recuadro rayado.

Pongan siempre el crédito en `credito_imagen`: si está vacío, la foto se muestra sin crédito. **Pendientes:** Tatacoa, Zipaquirá y Candelaria.

Fuentes recomendadas:
- Marte: NASA Photojournal (photojournal.jpl.nasa.gov), NASA Image Library (images.nasa.gov) y ESA. Las imágenes de la NASA en general son de dominio público; las de ESA/DLR/FU Berlin suelen ser CC BY-SA 3.0 IGO.
- Colombia: fotos de entidades oficiales o universidades (con crédito al autor), o fotos propias del equipo.

Usen imágenes de unos 1200 px de ancho o menos para que la página cargue rápido.

---

## Mapas

- **Colombia:** Leaflet con dos mapas base (calles de OpenStreetMap y relieve de OpenTopoMap), con nombres de ciudades. Se cambian con el botón de capas, arriba a la derecha.
- **Marte:** Leaflet con mosaicos de **NASA Mars Trek**: Viking MDIM 2.1 (NASA/JPL/USGS) y, de respaldo, MOLA (NASA/GSFC). Usa proyección geográfica (EPSG:4326), así que se ven los polos. En `js/config.js` hay una **lista de fuentes**: si una falla, la app prueba la siguiente, y si todas fallan dibuja una cuadrícula de coordenadas (los sitios siguen funcionando). Para cambiar o agregar fuentes, editen `CONFIG.cuerpos.marte.fuentes`.

## Despliegue

Como es un sitio estático, se puede publicar gratis en GitHub Pages, Netlify o Vercel subiendo la carpeta tal cual.
