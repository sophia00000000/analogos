/**
 * Configuración general. Aquí se cambian mapas base, pesos y umbrales
 * sin tocar la lógica de la aplicación.
 */
// Modelo de similitud. Este bloque es JSON puro: lo leen también
// scripts/calcular_atributos.py y scripts/validar_datos.py (no quitar los
// comentarios MODELO-INICIO / MODELO-FIN ni usar comillas simples).
//   fuente "atributos"   → puntaje 0-1 asignado por el equipo (geología)
//   fuente "operativos"  → puntaje 0-1 calculado con datos medidos (NASA POWER / MODIS)
const MODELO = /*MODELO-INICIO*/ {
  "cobertura_minima": 0.6,
  "criterios": {
    "terreno_plano":      { "nombre": "Terreno plano",                     "fuente": "operativos" },
    "hielo":              { "nombre": "Hielo / agua congelada",            "fuente": "atributos" },
    "aridez":             { "nombre": "Aridez",                            "fuente": "operativos" },
    "ciclo_termico":      { "nombre": "Ciclo térmico día-noche",           "fuente": "operativos" },
    "frio":               { "nombre": "Frío extremo",                      "fuente": "operativos" },
    "subterraneo":        { "nombre": "Refugio subterráneo / tubos",       "fuente": "atributos" },
    "superficie_estable": { "nombre": "Superficie estable / baja erosión", "fuente": "operativos" },
    "arcillas":           { "nombre": "Arcillas (agua en minerales)",      "fuente": "atributos" },
    "sulfatos":           { "nombre": "Sulfatos hidratados",               "fuente": "atributos" },
    "sales":              { "nombre": "Sales / cloruros",                  "fuente": "atributos" },
    "sedimentos":         { "nombre": "Sedimentos, lagos y deltas",        "fuente": "atributos" },
    "volcanico":          { "nombre": "Rocas y relieve volcánico",         "fuente": "atributos" },
    "hidrotermal":        { "nombre": "Actividad hidrotermal",             "fuente": "atributos" }
  },
  "perfiles": {
    "ciencia": {
      "nombre": "Ciencia",
      "pesos": { "terreno_plano": 0, "hielo": 1.5, "aridez": 0.8, "ciclo_termico": 0, "frio": 0.8,
                 "subterraneo": 1.0, "superficie_estable": 0, "arcillas": 1.2, "sulfatos": 1.2,
                 "sales": 1.0, "sedimentos": 1.0, "volcanico": 1.0, "hidrotermal": 1.0 }
    },
    "base": {
      "nombre": "Aterrizaje y base",
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

  // Clases de similitud (de mayor a menor). El color también va con el tamaño
  // del marcador, para no depender solo del color.
  clases: [
    { min: 0.70, nombre: "Muy similar",  color: "#FC3D21", radio: 13 },
    { min: 0.45, nombre: "Similar",      color: "#FF9E1B", radio: 10 },
    { min: 0.20, nombre: "Poco similar", color: "#4F9CF9", radio: 8 },
    { min: 0.00, nombre: "No similar",   color: "#8A94A6", radio: 6 },
  ],

  // Mapas base de Marte (NASA Trek, proyección geográfica EPSG:4326, cubre los
  // polos). Se prueban en orden: si una fuente falla, se pasa a la siguiente.
  // Si todas fallan se dibuja una cuadrícula para que el mapa siga siendo usable.
  cuerpos: {
    marte: {
      nombre: "Marte",
      fondo: "#7a3b20",
      fuentes: [
        {
          url: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
          opciones: { maxNativeZoom: 7 },
          atribucion: "NASA/JPL/USGS · Viking MDIM 2.1 vía NASA Mars Trek",
        },
        {
          url: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
          opciones: { maxNativeZoom: 5 },
          atribucion: "NASA/GSFC · MGS MOLA vía NASA Mars Trek",
        },
      ],
    },
  },

  // Mapas base de Colombia (incluyen nombres de ciudades). El primero es el inicial.
  colombia: {
    centro: [4.6, -74.1],
    zoom: 6,
    capas: {
      "Calles (OpenStreetMap)": {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        atribucion: "© OpenStreetMap",
      },
      "Relieve (OpenTopoMap)": {
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        atribucion: "© OpenStreetMap · © OpenTopoMap (CC-BY-SA)",
      },
    },
  },
};
