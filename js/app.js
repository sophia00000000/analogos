/* global L, CONFIG, Similitud */
(function () {
  "use strict";

  const estado = {
    sitios: [],           // Mars sites
    lugares: [],          // Colombian places
    citaDatos: "",        // citation for the measured data sources
    sitio: null,          // selected Mars site
    lugar: null,          // selected Colombian place
    perfilManual: null,   // null = use the site's profile; "ciencia" | "base" = chosen by the user
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
  const nombrePerfil = (p) => CONFIG.perfiles[p].nombre;

  /** Active profile: the one chosen in the selector or, otherwise, the site's own. */
  function perfilActivo() {
    return estado.perfilManual || (estado.sitio ? estado.sitio.perfil : "ciencia");
  }

  function sim(lugar) {
    return estado.sitio ? Similitud.calcular(estado.sitio, lugar, perfilActivo(), CONFIG) : null;
  }

  const textoCobertura = (r) => `computed with ${r.usados} of ${r.disponibles} criteria`;
  const avisoIncompleto = (r) =>
    `Incomplete data (${r.usados} of ${r.disponibles} criteria): missing measured data for ` +
    r.faltantes.map((k) => CONFIG.criterios[k].nombre.toLowerCase()).join(", ") +
    ". The percentage only uses the criteria with data and may overstate the similarity.";

  // ---------------------------------------------------------------- startup
  async function iniciar() {
    try {
      const [extra, col] = await Promise.all([
        fetch("data/extraterrestres.json").then((r) => r.json()),
        fetch("data/colombia.json").then((r) => r.json()),
      ]);
      estado.sitios = extra.marte;
      estado.lugares = col.lugares;
      estado.citaDatos = col.cita_datos || "";
    } catch (err) {
      console.error(err);
      document.body.insertAdjacentHTML(
        "afterbegin",
        `<div class="error-carga">The data could not be loaded. Open the project through a local server
         (<code>python -m http.server 8000</code>) instead of double-clicking index.html.</div>`
      );
      return;
    }

    crearMapaColombia();
    crearMapaPlaneta();
    pintarLeyenda();
    pintarMetodologia();
    pintarSelectorPerfil();
    pintarRanking();

    document.querySelectorAll(".perfil__opcion").forEach((b) =>
      b.addEventListener("click", () => cambiarPerfil(b.dataset.perfil))
    );
    leerEnlace();
  }

  /** Direct link: index.html#sitio=gale&perfil=base&lugar=tatacoa */
  function leerEnlace() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (estado.sitios.some((s) => s.id === p.get("sitio"))) seleccionarSitio(p.get("sitio"));
    if (CONFIG.perfiles[p.get("perfil")]) cambiarPerfil(p.get("perfil"));
    if (estado.lugares.some((l) => l.id === p.get("lugar"))) seleccionarLugar(p.get("lugar"), false);
  }

  function escribirEnlace() {
    const p = new URLSearchParams();
    if (estado.sitio) p.set("sitio", estado.sitio.id);
    if (estado.perfilManual) p.set("perfil", estado.perfilManual);
    if (estado.lugar) p.set("lugar", estado.lugar.id);
    const hash = p.toString();
    history.replaceState(null, "", hash ? "#" + hash : location.pathname + location.search);
  }

  // ------------------------------------------------------------ Colombia map
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
      const r = sim(lugar);
      const cls = r === null ? null : Similitud.clase(r.valor, CONFIG.clases);
      const incompleto = r !== null && r.incompleto;
      const seleccionado = estado.lugar && estado.lugar.id === lugar.id;

      const m = L.circleMarker([lugar.lat, lugar.lon], {
        radius: cls ? cls.radio : 7,
        color: seleccionado ? "#ffffff" : incompleto ? "#a3acbd" : "#0b0d12",
        weight: seleccionado ? 3 : 1.5,
        dashArray: incompleto ? "3 3" : null,
        fillColor: cls ? cls.color : "#C9D1DE",
        fillOpacity: incompleto ? 0.3 : 0.92,
      });
      const etiqueta = r === null
        ? esc(lugar.nombre)
        : `${esc(lugar.nombre)} · <b>${incompleto ? "⚠ " : ""}${pct(r.valor)}</b>`;
      m.bindTooltip(etiqueta + (incompleto ? "<br><small>incomplete data</small>" : ""), { direction: "top", offset: [0, -6] });
      m.on("click", () => seleccionarLugar(lugar.id));
      m.addTo(estado.capaLugares);
      estado.marcadoresLugar[lugar.id] = m;

      // Main places get a permanent label
      if (lugar.nivel === "principal") m.bindTooltip(etiqueta, { permanent: true, direction: "right", className: "etiqueta-principal", offset: [10, 0] });
    });
  }

  // ---------------------------------------------------------------- Mars map
  function crearMapaPlaneta() {
    const cfgCuerpo = CONFIG.cuerpos.marte;
    const contenedor = $("#mapa-planeta");
    contenedor.style.background = cfgCuerpo.fondo;

    // Geographic projection (EPSG:4326): matches the NASA Trek tiles
    // and shows the poles.
    const mapa = L.map(contenedor, {
      crs: L.CRS.EPSG4326,
      zoomSnap: 0.25,
      minZoom: 0,
      maxZoom: 9,
      worldCopyJump: true,
      maxBounds: [[-90, -360], [90, 360]],
      attributionControl: true,
    });
    mapa.attributionControl.setPrefix(false);
    estado.mapaPlaneta = mapa;
    mapa.fitBounds([[-90, -180], [90, 180]]);

    cargarFuente(mapa, cfgCuerpo, 0);
    dibujarCuadricula(mapa);

    estado.capaSitios = L.layerGroup().addTo(mapa);
    pintarSitios();
  }

  /** Tries the map sources in order; if one fails, moves on to the next. */
  function cargarFuente(mapa, cfgCuerpo, indice) {
    const aviso = $("#aviso-planeta");
    const fuente = cfgCuerpo.fuentes[indice];
    if (!fuente) {
      aviso.hidden = false;
      aviso.textContent =
        "The " + cfgCuerpo.nombre + " base map could not be loaded" +
        ". A coordinate grid is shown instead; the sites are still interactive.";
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
    for (let lon = -540; lon <= 540; lon += 30) L.polyline([[-90, lon], [90, lon]], estilo).addTo(mapa);
    // Highlighted equator
    L.polyline([[0, -540], [0, 540]], { ...estilo, opacity: 0.45, dashArray: null }).addTo(mapa);
  }

  function pintarSitios() {
    estado.capaSitios.clearLayers();
    estado.marcadoresSitio = {};
    estado.sitios.forEach((sitio) => {
      const icono = L.divIcon({
        className: "",
        html: `<span class="pin${estado.sitio && estado.sitio.id === sitio.id ? " pin--activo" : ""}"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const m = L.marker([sitio.lat, sitio.lon], { icon: icono, keyboard: true, title: sitio.nombre });
      m.bindTooltip(`${esc(sitio.nombre)}<br><small>${esc(nombrePerfil(sitio.perfil))}</small>`, { direction: "top", offset: [0, -10] });
      m.on("click", () => seleccionarSitio(sitio.id));
      m.addTo(estado.capaSitios);
      estado.marcadoresSitio[sitio.id] = m;
    });
  }

  // ------------------------------------------------------------- actions
  function seleccionarSitio(id) {
    estado.sitio = estado.sitios.find((s) => s.id === id);
    estado.perfilManual = null; // each site starts with its own profile
    pintarSitios();
    pintarFichaSitio();
    actualizarComparacion();
  }

  function cambiarPerfil(perfil) {
    estado.perfilManual = estado.sitio && perfil === estado.sitio.perfil ? null : perfil;
    actualizarComparacion();
  }

  function actualizarComparacion() {
    pintarSelectorPerfil();
    pintarLugares();
    pintarRanking();
    if (estado.lugar) pintarDetalle();
    escribirEnlace();
  }

  function seleccionarLugar(id, animar = true) {
    estado.lugar = estado.lugares.find((l) => l.id === id);
    pintarLugares();
    pintarRanking();
    pintarDetalle();
    escribirEnlace();
    const zoom = Math.max(estado.mapaColombia.getZoom(), 7);
    if (animar) estado.mapaColombia.flyTo([estado.lugar.lat, estado.lugar.lon], zoom, { duration: 0.8 });
    else estado.mapaColombia.setView([estado.lugar.lat, estado.lugar.lon], zoom);
    if (animar && window.matchMedia("(max-width: 1100px)").matches) $("#detalle").scrollIntoView({ behavior: "smooth" });
  }

  // ------------------------------------------------------------- render
  function imagenHTML(src, alt, credito) {
    return `
      <figure class="foto">
        <img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"
             onerror="this.parentElement.classList.add('foto--falta'); this.remove();" />
        ${credito ? `<figcaption>Image: ${esc(credito)}</figcaption>` : ""}
      </figure>`;
  }

  function fuentesHTML(fuentes) {
    if (!fuentes || !fuentes.length) return `<p class="nota">Sources pending.</p>`;
    return `<ul class="fuentes">${fuentes
      .map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)} ↗</a></li>`)
      .join("")}</ul>`;
  }

  function pintarSelectorPerfil() {
    const activo = perfilActivo();
    document.querySelectorAll(".perfil__opcion").forEach((b) => {
      const sel = b.dataset.perfil === activo;
      b.classList.toggle("activa", sel);
      b.setAttribute("aria-pressed", String(sel));
    });
    const nota = $("#perfil-nota");
    if (!estado.sitio) {
      nota.textContent = "Choosing a site applies its profile; you can then compare it with the other one.";
    } else if (estado.perfilManual) {
      nota.innerHTML = `Comparing ${esc(estado.sitio.nombre)} with the <b>${esc(nombrePerfil(activo))}</b> profile ` +
        `(its own profile is ${esc(nombrePerfil(estado.sitio.perfil))}).`;
    } else {
      nota.innerHTML = `Active profile: <b>${esc(nombrePerfil(activo))}</b> (the selected site's own).`;
    }
  }

  function pintarFichaSitio() {
    const s = estado.sitio;
    const lonTexto = `${Math.abs(s.lon).toFixed(2)}° ${s.lon >= 0 ? "E" : "O"}`;
    const latTexto = `${Math.abs(s.lat).toFixed(2)}° ${s.lat >= 0 ? "N" : "S"}`;
    const ficha = $("#ficha-planeta");
    ficha.className = "ficha";
    ficha.innerHTML = `
      ${imagenHTML(s.imagen, s.nombre, s.credito_imagen)}
      <div class="ficha__cuerpo">
        <p class="sobretitulo">${esc(s.uso)}</p>
        <h3>${esc(s.nombre)}</h3>
        <p><span class="etiqueta-perfil etiqueta-perfil--${esc(s.perfil)}">Profile: ${esc(nombrePerfil(s.perfil))}</span></p>
        <p class="coordenadas">${latTexto} · ${lonTexto}</p>
        <p>${esc(s.resumen)}</p>
        <p class="tenue">${esc(s.porque)}</p>
        ${fuentesHTML(s.fuentes)}
      </div>`;
  }

  function pintarRanking() {
    const lista = $("#ranking");
    if (!estado.sitio) {
      lista.innerHTML = `<li class="ranking__vacio">Choose a site on Mars to rank the analogs.</li>`;
      return;
    }
    // Results with incomplete data go last so they do not look like the best ones.
    const filas = estado.lugares
      .map((l) => ({ l, r: sim(l) }))
      .sort((a, b) => (a.r.incompleto - b.r.incompleto) || (b.r.valor - a.r.valor));
    lista.innerHTML = filas
      .map(({ l, r }) => {
        const cls = Similitud.clase(r.valor, CONFIG.clases);
        const activo = estado.lugar && estado.lugar.id === l.id ? " activo" : "";
        const inc = r.incompleto ? " ranking__fila--incompleta" : "";
        const titulo = r.incompleto ? avisoIncompleto(r) : textoCobertura(r);
        return `<li><button class="ranking__fila${activo}${inc}" data-id="${esc(l.id)}" title="${esc(titulo)}">
          <span class="punto" style="background:${cls.color}"></span>
          <span class="ranking__nombre">${esc(l.nombre)}${l.nivel === "principal" ? ' <span class="chip">main</span>' : ""}
            <small class="ranking__cobertura">${r.incompleto ? "⚠ incomplete data · " : ""}${r.usados} of ${r.disponibles} criteria</small></span>
          <span class="barra-sim"><span style="width:${pct(r.valor)};background:${cls.color}"></span></span>
          <span class="ranking__valor">${r.incompleto ? "⚠ " : ""}${pct(r.valor)}</span>
        </button></li>`;
      })
      .join("");
    lista.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => seleccionarLugar(b.dataset.id)));
  }

  function pintarDetalle() {
    const l = estado.lugar;
    const d = $("#detalle");
    d.className = "ficha";

    let bloqueSim = `<p class="nota">Choose a site on Mars to see how similar this place is.</p>`;
    if (estado.sitio) {
      const r = sim(l);
      const cls = Similitud.clase(r.valor, CONFIG.clases);
      const aportes = Similitud.aportes(estado.sitio, l, perfilActivo(), CONFIG);
      bloqueSim = `
        <div class="similitud${r.incompleto ? " similitud--incompleta" : ""}" style="--c:${cls.color}"
             ${r.incompleto ? `title="${esc(avisoIncompleto(r))}"` : ""}>
          <div class="similitud__valor">${r.incompleto ? "⚠ " : ""}${pct(r.valor)}</div>
          <div>
            <p class="similitud__clase">${esc(cls.nombre)}</p>
            <p class="tenue">vs. ${esc(estado.sitio.nombre)} · ${esc(nombrePerfil(perfilActivo()))} profile</p>
            <p class="tenue">${textoCobertura(r)}</p>
          </div>
        </div>
        ${r.incompleto ? `<p class="aviso-datos">⚠ ${esc(avisoIncompleto(r))}</p>` : ""}
        ${aportes.length ? `<p class="sobretitulo">What they share</p>
          <ul class="aportes">${aportes.map((a) => `<li>${esc(a.nombre)}</li>`).join("")}</ul>` : ""}`;
    }

    const datos = (l.datos || [])
      .map((x) => `<div><dt>${esc(x.etiqueta)}</dt><dd>${esc(x.valor)}</dd></div>`)
      .join("");

    d.innerHTML = `
      ${imagenHTML(l.imagen, l.nombre, l.credito_imagen)}
      <div class="ficha__cuerpo">
        <p class="sobretitulo">${esc(l.departamento)} · ${l.nivel === "principal" ? "Main research site" : "Secondary analog"}</p>
        <h3>${esc(l.nombre)}</h3>
        ${bloqueSim}
        <p>${esc(l.resumen)}</p>
        <p class="tenue">${esc(l.porque)}</p>
        ${datos ? `<dl class="datos">${datos}</dl>` : ""}
        ${medidosHTML(l)}
        <p class="sobretitulo">Further reading</p>
        ${fuentesHTML(l.fuentes)}
      </div>`;
  }

  /** "Measured data" table (NASA POWER and NASA MODIS). */
  function medidosHTML(l) {
    const m = l.medidos;
    if (!m) return "";
    const vacio = (v) => v === null || v === undefined;
    const num = (v, u, dec = 1) =>
      vacio(v) ? "—" : `${Number(v).toFixed(dec)}${u ? " " + u : ""}`;
    const pend = (v, u, dec = 0) => (vacio(v) ? "pending" : num(v, u, dec));
    const conPercentil = (med, p) => (vacio(med) ? "—" : `${num(med, "°C")} (${num(p, "°C")})`);
    const grupos = [
      ["Temperature", [
        ["Air · mean", num(m.t_aire_media, "°C")],
        ["Air · max / min", `${num(m.t_aire_max, "°C")} / ${num(m.t_aire_min, "°C")}`],
        ["Surface, day · median (p95)", conPercentil(m.lst_dia_mediana, m.lst_dia_p95)],
        ["Surface, night · median (p5)", conPercentil(m.lst_noche_mediana, m.lst_noche_p5)],
        ["Day-night range (surface)", num(m.amplitud_termica, "°C")],
      ]],
      ["Humidity and radiation", [
        ["Relative humidity", num(m.humedad_relativa, "%", 0)],
        ["Solar radiation (not used in the score)", num(m.radiacion_kwh_m2_dia, "kWh/m²/day", 2)],
      ]],
      ["Rainfall and erosion", [
        ["Annual rainfall", num(m.lluvia_anual_mm, "mm", 0)],
        ["Erosivity (modified Fournier)", num(m.erosividad_mfi, "", 0)],
      ]],
      ["Topography", [
        ["Elevation", pend(m.elevacion_m, "m")],
        ["Mean slope", pend(m.pendiente_media, "°", 1)],
        ["Max slope", pend(m.pendiente_max, "°", 1)],
      ]],
    ];
    const op = l.atributos_operativos || {};
    const opTxt = ["aridez", "frio", "ciclo_termico", "superficie_estable", "terreno_plano"]
      .map((k) => `${CONFIG.criterios[k].nombre}: ${vacio(op[k]) ? "no data" : op[k].toFixed(2)}`)
      .join(" · ");
    return `
      <p class="sobretitulo">Measured data</p>
      <table class="medidos">
        ${grupos.map(([g, filas]) => `
          <tbody>
            <tr><th colspan="2" class="medidos__grupo">${esc(g)}</th></tr>
            ${filas.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}
          </tbody>`).join("")}
      </table>
      ${l.notas_datos ? `<p class="aviso-datos">${esc(l.notas_datos)}</p>` : ""}
      <p class="nota">Valid MODIS observations: day ${num(m.pct_validos_dia, "%", 0)} · night ${num(m.pct_validos_noche, "%", 0)}.
        Air, humidity, radiation and rainfall: NASA POWER, 2020–2026 average (~50 km cell).
        Surface: NASA MODIS Terra MOD11A2 v061 (1 km), 2019–2026.</p>
      <p class="nota"><b>Computed scores (0–1):</b> ${esc(opTxt)}.</p>
      ${estado.citaDatos ? `<p class="nota cita">Source: ${esc(estado.citaDatos)}</p>` : ""}`;
  }

  function pintarLeyenda() {
    $("#leyenda").innerHTML = CONFIG.clases
      .map((c) => `<span><i style="background:${c.color};width:${c.radio + 4}px;height:${c.radio + 4}px"></i>${esc(c.nombre)}</span>`)
      .join("") + `<span><i class="leyenda__incompleto"></i>⚠ Incomplete data</span>`;
  }

  function pintarMetodologia() {
    const perfiles = Object.entries(CONFIG.perfiles);
    const origen = (c) => (c.fuente === "operativos" ? "measured" : "geology");
    $("#tabla-pesos").innerHTML = `
      <thead><tr><th>Criterion</th><th>Source</th>${perfiles.map(([, p]) => `<th>${esc(p.nombre)}</th>`).join("")}</tr></thead>
      <tbody>${Object.entries(CONFIG.criterios)
        .map(([k, c]) => `<tr><td>${esc(c.nombre)}</td><td class="tenue">${origen(c)}</td>${perfiles
          .map(([, p]) => `<td class="peso${p.pesos[k] ? "" : " peso--cero"}">${(p.pesos[k] || 0).toFixed(1)}</td>`)
          .join("")}</tr>`)
        .join("")}</tbody>`;
    $("#cobertura-minima").textContent = pct(CONFIG.coberturaMinima);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
