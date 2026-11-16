/**
 * General configuration. Base maps, weights and thresholds are changed here
 * without touching the application logic.
 */
// Similarity model. This block is pure JSON: it is also read by
// scripts/calcular_atributos.py and scripts/validar_datos.py (do not remove the
// MODELO-INICIO / MODELO-FIN comments or use single quotes).
//   fuente "atributos"   → 0-1 score assigned by the team (geology)
//   fuente "operativos"  → 0-1 score computed from measured data (NASA POWER / MODIS)
const MODELO = /*MODELO-INICIO*/ {
  "cobertura_minima": 0.6,
  "criterios": {
    "terreno_plano":      { "nombre": "Flat terrain",                      "fuente": "operativos" },
    "hielo":              { "nombre": "Ice / frozen water",                "fuente": "atributos" },
    "aridez":             { "nombre": "Aridity",                           "fuente": "operativos" },
    "ciclo_termico":      { "nombre": "Day-night thermal cycling",         "fuente": "operativos" },
    "frio":               { "nombre": "Extreme cold",                      "fuente": "operativos" },
    "subterraneo":        { "nombre": "Subsurface shelter / lava tubes",   "fuente": "atributos" },
    "superficie_estable": { "nombre": "Stable surface / low erosion",      "fuente": "operativos" },
    "arcillas":           { "nombre": "Clays (mineral-bound water)",       "fuente": "atributos" },
    "sulfatos":           { "nombre": "Hydrated sulfates",                 "fuente": "atributos" },
    "sales":              { "nombre": "Salts / chlorides",                 "fuente": "atributos" },
    "sedimentos":         { "nombre": "Sediments, lakes and deltas",       "fuente": "atributos" },
    "volcanico":          { "nombre": "Volcanic rocks and landforms",      "fuente": "atributos" },
    "hidrotermal":        { "nombre": "Hydrothermal activity",             "fuente": "atributos" }
  },
  "perfiles": {
    "ciencia": {
      "nombre": "Science",
      "pesos": { "terreno_plano": 0, "hielo": 1.5, "aridez": 0.8, "ciclo_termico": 0, "frio": 0.8,
                 "subterraneo": 1.0, "superficie_estable": 0, "arcillas": 1.2, "sulfatos": 1.2,
                 "sales": 1.0, "sedimentos": 1.0, "volcanico": 1.0, "hidrotermal": 1.0 }
    },
    "base": {
      "nombre": "Landing & base",
      "pesos": { "terreno_plano": 2.0, "hielo": 1.5, "aridez": 1.2, "ciclo_termico": 1.2, "frio": 1.0,
                 "subterraneo": 0.8, "superficie_estable": 0.6, "arcillas": 0.3, "sulfatos": 0.3,
                 "sales": 0.3, "sedimentos": 0.3, "volcanico": 0.3, "hidrotermal": 0.3 }
    }
  }
} /*MODELO-FIN*/;

window.CONFIG = {
  criterios: MODELO.criterios,
  perfiles: MODELO.perfiles,
  coberturaMinima: MODELO.cobertura_minima,

  // Similarity classes (highest to lowest). Marker size changes with the class
  // too, so the map does not rely on color alone.
  clases: [
    { min: 0.70, nombre: "Very similar", color: "#FC3D21", radio: 13 },
    { min: 0.45, nombre: "Similar",      color: "#FF9E1B", radio: 10 },
    { min: 0.20, nombre: "Weakly similar", color: "#4F9CF9", radio: 8 },
    { min: 0.00, nombre: "Not similar",   color: "#8A94A6", radio: 6 },
  ],

  // Mars base maps (NASA Trek, geographic projection EPSG:4326, covers the
  // poles). Tried in order: if a source fails, the next one is used. If all
  // fail, a coordinate grid is drawn so the map remains usable.
  cuerpos: {
    marte: {
      nombre: "Mars",
      fondo: "#7a3b20",
      fuentes: [
        {
          url: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
          opciones: { maxNativeZoom: 7 },
          atribucion: "NASA/JPL/USGS · Viking MDIM 2.1 via NASA Mars Trek",
        },
        {
          url: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
          opciones: { maxNativeZoom: 5 },
          atribucion: "NASA/GSFC · MGS MOLA via NASA Mars Trek",
        },
      ],
    },
  },

  // Colombia base maps (with city names). The first one is the default.
  colombia: {
    centro: [4.6, -74.1],
    zoom: 6,
    capas: {
      "Streets (OpenStreetMap)": {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        atribucion: "© OpenStreetMap",
      },
      "Terrain (OpenTopoMap)": {
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        atribucion: "© OpenStreetMap · © OpenTopoMap (CC-BY-SA)",
      },
    },
  },
};
