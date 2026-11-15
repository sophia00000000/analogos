/**
 * Configuración general. Aquí se cambian mapas base, pesos y umbrales
 * sin tocar la lógica de la aplicación.
 */
window.CONFIG = {
  // Criterios de similitud: clave → { nombre visible, peso }
  criterios: {
    hielo:       { nombre: "Hielo / agua congelada",        peso: 1.5 },
    arcillas:    { nombre: "Arcillas (agua en minerales)",  peso: 1.2 },
    sulfatos:    { nombre: "Sulfatos hidratados",           peso: 1.2 },
    sales:       { nombre: "Sales / cloruros",              peso: 1.0 },
    sedimentos:  { nombre: "Sedimentos, lagos y deltas",    peso: 1.0 },
    aridez:      { nombre: "Aridez",                        peso: 0.8 },
    frio:        { nombre: "Frío extremo",                  peso: 0.8 },
    volcanico:   { nombre: "Rocas y relieve volcánico",     peso: 1.0 },
    subterraneo: { nombre: "Refugio subterráneo / tubos",   peso: 1.0 },
    hidrotermal: { nombre: "Actividad hidrotermal",         peso: 1.0 },
  },

  // Clases de similitud (de mayor a menor). El color también va con el tamaño
  // del marcador, para no depender solo del color.
  clases: [
    { min: 0.70, nombre: "Muy similar",  color: "#FC3D21", radio: 13 },
    { min: 0.45, nombre: "Similar",      color: "#FF9E1B", radio: 10 },
    { min: 0.20, nombre: "Poco similar", color: "#4F9CF9", radio: 8 },
    { min: 0.00, nombre: "No similar",   color: "#8A94A6", radio: 6 },
  ],

  // Mapas base del cuerpo celeste. Se prueban en orden: si una fuente falla,
  // se pasa a la siguiente. Si todas fallan se dibuja una cuadrícula para que
  // el mapa siga siendo usable.
  cuerpos: {
    marte: {
      nombre: "Marte",
      fondo: "#7a3b20",
      fuentes: [
        {
          url: "https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-2/all/{z}/{x}/{y}.png",
          opciones: { tms: false, maxNativeZoom: 9 },
          atribucion: "OpenPlanetary · NASA/USGS MOLA",
        },
        {
          url: "https://s3-eu-west-1.amazonaws.com/whereonmars.cartodb.net/viking_mdim21_global/{z}/{x}/{y}.png",
          opciones: { tms: true, maxNativeZoom: 7 },
          atribucion: "NASA/USGS Viking MDIM 2.1 · OpenPlanetary",
        },
      ],
    },
    luna: {
      nombre: "la Luna",
      fondo: "#3b3f47",
      fuentes: [
        {
          url: "https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-moon-basemap-v0-1/all/{z}/{x}/{y}.png",
          opciones: { tms: false, maxNativeZoom: 8 },
          atribucion: "OpenPlanetary · NASA/USGS LRO",
        },
      ],
    },
  },

  // Mapas base de Colombia (incluyen nombres de ciudades). El primero es el inicial.
  colombia: {
    centro: [4.6, -74.1],
    zoom: 6,
    capas: {
      "Oscuro (CARTO)": {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        atribucion: "© OpenStreetMap · © CARTO",
      },
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
