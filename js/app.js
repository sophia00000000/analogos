/* global L, CONFIG, Similitud */
(function () {
  "use strict";

  const estado = {
    cuerpo: "marte",
    datosExtra: null,     // { marte: [...], luna: [...] }
    lugares: [],          // lugares de Colombia
    sitio: null,          // sitio extraterrestre seleccionado
    lugar: null,          // lugar de Colombia seleccionado
    mapaPlaneta: null,
    capaSitios: null,
    mapaColombia: null,
    capaLugares: null,
    marcadoresSitio: {},
    marcadoresLugar: {},
  };

  const $ = (sel) => document.querySelector(sel);
  const esc = (t) =>
    String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (v) => `${Math.round(v * 100)}%`;

  // ---------------------------------------------------------------- inicio
  async function iniciar() {
    try {
      const [extra, col] = await Promise.all([
        fetch("data/extraterrestres.json").then((r) => r.json()),
        fetch("data/colombia.json").then((r) => r.json()),
      ]);
      estado.datosExtra = extra;
      estado.lugares = col.lugares;
    } catch (err) {
      console.error(err);
      document.body.insertAdjacentHTML(
        "afterbegin",
        `<div class="error-carga">No se pudieron cargar los datos. Abre el proyecto con un servidor local
         (<code>python -m http.server 8000</code>) en vez de hacer doble clic en index.html.</div>`
      );
      return;
    }

    crearMapaColombia();
    crearMapaPlaneta();
    pintarLeyenda();
    pintarCriterios();
    pintarRanking();

    document.querySelectorAll(".pestana").forEach((b) =>
      b.addEventListener("click", () => cambiarCuerpo(b.dataset.cuerpo))
    );
  }

  // ------------------------------------------------------- mapa de Colombia
  function crearMapaColombia() {
    const cfg = CONFIG.colombia;
    const mapa = L.map("mapa-colombia", { zoomControl: true, minZoom: 4 }).setView(cfg.centro, cfg.zoom);
    const capasBase = {};
    Object.entries(cfg.capas).forEach(([nombre, c], i) => {
      capasBase[nombre] = L.tileLayer(c.url, { attribution: c.atribucion, maxZoom: 18, subdomains: "abc" });
      if (i === 0) capasBase[nombre].addTo(mapa);
    });
    L.control.layers(capasBase, null, { position: "topright" }).addTo(mapa);
    L.control.scale({ imperial: false }).addTo(mapa);

    estado.capaLugares = L.layerGroup().addTo(mapa);
    estado.mapaColombia = mapa;
    pintarLugares();
  }

  function pintarLugares() {
    estado.capaLugares.clearLayers();
    estado.marcadoresLugar = {};

    estado.lugares.forEach((lugar) => {
      const sim = estado.sitio ? Similitud.calcular(estado.sitio, lugar, CONFIG.criterios) : null;
      const cls = sim === null ? null : Similitud.clase(sim, CONFIG.clases);
      const seleccionado = estado.lugar && estado.lugar.id === lugar.id;

      const m = L.circleMarker([lugar.lat, lugar.lon], {
        radius: cls ? cls.radio : 7,
        color: seleccionado ? "#ffffff" : "#0b0d12",
        weight: seleccionado ? 3 : 1.5,
        fillColor: cls ? cls.color : "#C9D1DE",
        fillOpacity: 0.92,
      });
      const etiqueta = sim === null ? esc(lugar.nombre) : `${esc(lugar.nombre)} · <b>${pct(sim)}</b>`;
      m.bindTooltip(etiqueta, { direction: "top", offset: [0, -6] });
      m.on("click", () => seleccionarLugar(lugar.id));
      m.addTo(estado.capaLugares);
      estado.marcadoresLugar[lugar.id] = m;

      // Los lugares principales llevan una etiqueta permanente
      if (lugar.nivel === "principal") m.bindTooltip(etiqueta, { permanent: true, direction: "right", className: "etiqueta-principal", offset: [10, 0] });
    });
  }

  // ------------------------------------------------- mapa del cuerpo celeste
  function crearMapaPlaneta() {
    const cfgCuerpo = CONFIG.cuerpos[estado.cuerpo];
    if (estado.mapaPlaneta) estado.mapaPlaneta.remove();

    const contenedor = $("#mapa-planeta");
    contenedor.style.background = cfgCuerpo.fondo;

    const mapa = L.map(contenedor, {
      zoomSnap: 0.25,
      minZoom: 0.5,
      maxZoom: 10,
      worldCopyJump: true,
      maxBounds: [[-88, -360], [88, 360]],
      attributionControl: true,
    });
    mapa.attributionControl.setPrefix(false);
    estado.mapaPlaneta = mapa;
    // Encuadra todo el planeta (incluidos los sitios polares)
    mapa.fitBounds([[-84, -180], [84, 180]]);

    cargarFuente(mapa, cfgCuerpo, 0);
    dibujarCuadricula(mapa);

    estado.capaSitios = L.layerGroup().addTo(mapa);
    pintarSitios();
  }

  /** Prueba las fuentes de mapas en orden; si una falla, pasa a la siguiente. */
  function cargarFuente(mapa, cfgCuerpo, indice) {
    const aviso = $("#aviso-planeta");
    const fuente = cfgCuerpo.fuentes[indice];
    if (!fuente) {
      aviso.hidden = false;
      aviso.textContent =
        "No se pudo cargar el mapa base de " + cfgCuerpo.nombre +
        ". Se muestra una cuadrícula de coordenadas; los sitios siguen siendo interactivos.";
      return;
    }
    aviso.hidden = true;

    const capa = L.tileLayer(fuente.url, { ...fuente.opciones, attribution: fuente.atribucion, noWrap: false });
    let cargadas = 0;
    let errores = 0;
    let descartada = false;

    const descartar = () => {
      if (descartada || cargadas > 0) return;
      descartada = true;
      mapa.removeLayer(capa);
      cargarFuente(mapa, cfgCuerpo, indice + 1);
    };
    capa.on("tileload", () => { cargadas++; });
    capa.on("tileerror", () => { if (++errores >= 4) descartar(); });
    setTimeout(descartar, 8000);
    capa.addTo(mapa);
    capa.bringToBack();
  }

  function dibujarCuadricula(mapa) {
    const estilo = { color: "#ffffff", weight: 0.6, opacity: 0.25, interactive: false, dashArray: "2 4" };
    for (let lat = -60; lat <= 60; lat += 30) L.polyline([[lat, -540], [lat, 540]], estilo).addTo(mapa);
    for (let lon = -540; lon <= 540; lon += 30) L.polyline([[-85, lon], [85, lon]], estilo).addTo(mapa);
    // Ecuador destacado
    L.polyline([[0, -540], [0, 540]], { ...estilo, opacity: 0.45, dashArray: null }).addTo(mapa);
  }

  function pintarSitios() {
    estado.capaSitios.clearLayers();
    estado.marcadoresSitio = {};
    estado.datosExtra[estado.cuerpo].forEach((sitio) => {
      // La proyección del mapa no llega a los polos: los sitios polares se
      // dibujan en el borde (±80°) y se avisa en la ficha.
      const latVisible = Math.max(-80, Math.min(80, sitio.lat));
      const icono = L.divIcon({
        className: "",
        html: `<span class="pin${estado.sitio && estado.sitio.id === sitio.id ? " pin--activo" : ""}"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const m = L.marker([latVisible, sitio.lon], { icon: icono, keyboard: true, title: sitio.nombre });
      m.bindTooltip(esc(sitio.nombre), { direction: "top", offset: [0, -10] });
      m.on("click", () => seleccionarSitio(sitio.id));
      m.addTo(estado.capaSitios);
      estado.marcadoresSitio[sitio.id] = m;
    });
  }

  // ------------------------------------------------------------- acciones
  function cambiarCuerpo(cuerpo) {
    if (cuerpo === estado.cuerpo) return;
    estado.cuerpo = cuerpo;
    estado.sitio = null;
    document.querySelectorAll(".pestana").forEach((b) => {
      const activa = b.dataset.cuerpo === cuerpo;
      b.classList.toggle("activa", activa);
      b.setAttribute("aria-selected", activa);
    });
    $("#nombre-cuerpo").textContent = CONFIG.cuerpos[cuerpo].nombre;
    $("#ficha-planeta").className = "ficha ficha--vacia";
    $("#ficha-planeta").innerHTML = "<p>Haz clic en un punto del mapa para ver sus análogos en Colombia.</p>";
    crearMapaPlaneta();
    pintarLugares();
    pintarRanking();
    if (estado.lugar) pintarDetalle();
  }

  function seleccionarSitio(id) {
    estado.sitio = estado.datosExtra[estado.cuerpo].find((s) => s.id === id);
    pintarSitios();
    pintarFichaSitio();
    pintarLugares();
    pintarRanking();
    if (estado.lugar) pintarDetalle();
  }

  function seleccionarLugar(id) {
    estado.lugar = estado.lugares.find((l) => l.id === id);
    pintarLugares();
    pintarRanking();
    pintarDetalle();
    estado.mapaColombia.flyTo([estado.lugar.lat, estado.lugar.lon], Math.max(estado.mapaColombia.getZoom(), 7), { duration: 0.8 });
    if (window.matchMedia("(max-width: 1100px)").matches) $("#detalle").scrollIntoView({ behavior: "smooth" });
  }

  // ------------------------------------------------------------- render
  function imagenHTML(src, alt, credito) {
    return `
      <figure class="foto">
        <img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"
             onerror="this.parentElement.classList.add('foto--falta'); this.remove();" />
        <figcaption>${credito ? esc(credito) : "Agrega la imagen en <code>" + esc(src) + "</code>"}</figcaption>
      </figure>`;
  }

  function fuentesHTML(fuentes) {
    if (!fuentes || !fuentes.length) return `<p class="nota">Fuentes pendientes.</p>`;
    return `<ul class="fuentes">${fuentes
      .map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)} ↗</a></li>`)
      .join("")}</ul>`;
  }

  function pintarFichaSitio() {
    const s = estado.sitio;
    const polar = Math.abs(s.lat) > 80;
    const lonTexto = `${Math.abs(s.lon).toFixed(2)}° ${s.lon >= 0 ? "E" : "O"}`;
    const latTexto = `${Math.abs(s.lat).toFixed(2)}° ${s.lat >= 0 ? "N" : "S"}`;
    const ficha = $("#ficha-planeta");
    ficha.className = "ficha";
    ficha.innerHTML = `
      ${imagenHTML(s.imagen, s.nombre, s.credito_imagen)}
      <div class="ficha__cuerpo">
        <p class="sobretitulo">${esc(s.uso)}</p>
        <h3>${esc(s.nombre)}</h3>
        <p class="coordenadas">${latTexto} · ${lonTexto}${polar ? " · polar (marcador en el borde del mapa)" : ""}</p>
        <p>${esc(s.resumen)}</p>
        <p class="tenue">${esc(s.porque)}</p>
        ${fuentesHTML(s.fuentes)}
      </div>`;
  }

  function pintarRanking() {
    const lista = $("#ranking");
    if (!estado.sitio) {
      lista.innerHTML = `<li class="ranking__vacio">Elige un sitio en ${esc(CONFIG.cuerpos[estado.cuerpo].nombre)} para ordenar los análogos.</li>`;
      return;
    }
    const filas = estado.lugares
      .map((l) => ({ l, sim: Similitud.calcular(estado.sitio, l, CONFIG.criterios) }))
      .sort((a, b) => b.sim - a.sim);
    lista.innerHTML = filas
      .map(({ l, sim }) => {
        const cls = Similitud.clase(sim, CONFIG.clases);
        const activo = estado.lugar && estado.lugar.id === l.id ? " activo" : "";
        return `<li><button class="ranking__fila${activo}" data-id="${esc(l.id)}">
          <span class="punto" style="background:${cls.color}"></span>
          <span class="ranking__nombre">${esc(l.nombre)}${l.nivel === "principal" ? ' <span class="chip">principal</span>' : ""}</span>
          <span class="barra-sim"><span style="width:${pct(sim)};background:${cls.color}"></span></span>
          <span class="ranking__valor">${pct(sim)}</span>
        </button></li>`;
      })
      .join("");
    lista.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => seleccionarLugar(b.dataset.id)));
  }

  function pintarDetalle() {
    const l = estado.lugar;
    const d = $("#detalle");
    d.className = "ficha";

    let bloqueSim = `<p class="nota">Elige un sitio en ${esc(CONFIG.cuerpos[estado.cuerpo].nombre)} para ver qué tan parecido es.</p>`;
    if (estado.sitio) {
      const sim = Similitud.calcular(estado.sitio, l, CONFIG.criterios);
      const cls = Similitud.clase(sim, CONFIG.clases);
      const aportes = Similitud.aportes(estado.sitio, l, CONFIG.criterios);
      bloqueSim = `
        <div class="similitud" style="--c:${cls.color}">
          <div class="similitud__valor">${pct(sim)}</div>
          <div>
            <p class="similitud__clase">${esc(cls.nombre)}</p>
            <p class="tenue">frente a ${esc(estado.sitio.nombre)}</p>
          </div>
        </div>
        ${aportes.length ? `<p class="sobretitulo">Lo que comparten</p>
          <ul class="aportes">${aportes.map((a) => `<li>${esc(a.nombre)}</li>`).join("")}</ul>` : ""}`;
    }

    const datos = (l.datos || [])
      .map((x) => `<div><dt>${esc(x.etiqueta)}</dt><dd>${esc(x.valor)}</dd></div>`)
      .join("");

    d.innerHTML = `
      ${imagenHTML(l.imagen, l.nombre, l.credito_imagen)}
      <div class="ficha__cuerpo">
        <p class="sobretitulo">${esc(l.departamento)} · ${l.nivel === "principal" ? "Investigación principal" : "Análogo secundario"}</p>
        <h3>${esc(l.nombre)}</h3>
        ${bloqueSim}
        <p>${esc(l.resumen)}</p>
        <p class="tenue">${esc(l.porque)}</p>
        ${datos ? `<dl class="datos">${datos}</dl>` : ""}
        <p class="sobretitulo">Para profundizar</p>
        ${fuentesHTML(l.fuentes)}
      </div>`;
  }

  function pintarLeyenda() {
    $("#leyenda").innerHTML = CONFIG.clases
      .map((c) => `<span><i style="background:${c.color};width:${c.radio + 4}px;height:${c.radio + 4}px"></i>${esc(c.nombre)}</span>`)
      .join("");
  }

  function pintarCriterios() {
    $("#lista-criterios").innerHTML = Object.values(CONFIG.criterios)
      .map((c) => `<li><span>${esc(c.nombre)}</span><span class="peso">×${c.peso.toFixed(1)}</span></li>`)
      .join("");
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
