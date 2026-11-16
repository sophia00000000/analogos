/* global L, CONFIG, Similitud */
(function () {
  "use strict";

  const estado = {
    sitios: [],           // sitios de Marte
    lugares: [],          // lugares de Colombia
    citaDatos: "",        // cita de las fuentes de los datos medidos
    sitio: null,          // sitio de Marte seleccionado
    lugar: null,          // lugar de Colombia seleccionado
    perfilManual: null,   // null = usar el perfil del sitio; "ciencia" | "base" = elegido por el usuario
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

  /** Perfil activo: el elegido en el selector o, si no, el del sitio. */
  function perfilActivo() {
    return estado.perfilManual || (estado.sitio ? estado.sitio.perfil : "ciencia");
  }

  function sim(lugar) {
    return estado.sitio ? Similitud.calcular(estado.sitio, lugar, perfilActivo(), CONFIG) : null;
  }

  const textoCobertura = (r) => `calculado con ${r.usados} de ${r.disponibles} criterios`;
  const avisoIncompleto = (r) =>
    `Datos incompletos (${r.usados} de ${r.disponibles} criterios): faltan datos medidos de ` +
    r.faltantes.map((k) => CONFIG.criterios[k].nombre.toLowerCase()).join(", ") +
    ". El porcentaje solo usa los criterios con dato y puede exagerar el parecido.";

  // ---------------------------------------------------------------- inicio
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
        `<div class="error-carga">No se pudieron cargar los datos. Abre el proyecto con un servidor local
         (<code>python -m http.server 8000</code>) en vez de hacer doble clic en index.html.</div>`
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

  /** Enlace directo: index.html#sitio=gale&perfil=base&lugar=tatacoa */
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
      m.bindTooltip(etiqueta + (incompleto ? "<br><small>datos incompletos</small>" : ""), { direction: "top", offset: [0, -6] });
      m.on("click", () => seleccionarLugar(lugar.id));
      m.addTo(estado.capaLugares);
      estado.marcadoresLugar[lugar.id] = m;

      // Los lugares principales llevan una etiqueta permanente
      if (lugar.nivel === "principal") m.bindTooltip(etiqueta, { permanent: true, direction: "right", className: "etiqueta-principal", offset: [10, 0] });
    });
  }

  // ------------------------------------------------------------ mapa de Marte
  function crearMapaPlaneta() {
    const cfgCuerpo = CONFIG.cuerpos.marte;
    const contenedor = $("#mapa-planeta");
    contenedor.style.background = cfgCuerpo.fondo;

    // Proyección geográfica (EPSG:4326): coincide con los mosaicos de NASA Trek
    // y muestra los polos.
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
    for (let lon = -540; lon <= 540; lon += 30) L.polyline([[-90, lon], [90, lon]], estilo).addTo(mapa);
    // Ecuador destacado
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

  // ------------------------------------------------------------- acciones
  function seleccionarSitio(id) {
    estado.sitio = estado.sitios.find((s) => s.id === id);
    estado.perfilManual = null; // cada sitio arranca con su propio perfil
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
        ${credito ? `<figcaption>Imagen: ${esc(credito)}</figcaption>` : ""}
      </figure>`;
  }

  function fuentesHTML(fuentes) {
    if (!fuentes || !fuentes.length) return `<p class="nota">Fuentes pendientes.</p>`;
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
      nota.textContent = "Al elegir un sitio se usa su perfil; luego puedes compararlo con el otro.";
    } else if (estado.perfilManual) {
      nota.innerHTML = `Comparando ${esc(estado.sitio.nombre)} con el perfil <b>${esc(nombrePerfil(activo))}</b> ` +
        `(su perfil propio es ${esc(nombrePerfil(estado.sitio.perfil))}).`;
    } else {
      nota.innerHTML = `Perfil activo: <b>${esc(nombrePerfil(activo))}</b> (el del sitio elegido).`;
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
        <p><span class="etiqueta-perfil etiqueta-perfil--${esc(s.perfil)}">Perfil: ${esc(nombrePerfil(s.perfil))}</span></p>
        <p class="coordenadas">${latTexto} · ${lonTexto}</p>
        <p>${esc(s.resumen)}</p>
        <p class="tenue">${esc(s.porque)}</p>
        ${fuentesHTML(s.fuentes)}
      </div>`;
  }

  function pintarRanking() {
    const lista = $("#ranking");
    if (!estado.sitio) {
      lista.innerHTML = `<li class="ranking__vacio">Elige un sitio en Marte para ordenar los análogos.</li>`;
      return;
    }
    // Los resultados con datos incompletos van al final para que no parezcan los mejores.
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
          <span class="ranking__nombre">${esc(l.nombre)}${l.nivel === "principal" ? ' <span class="chip">principal</span>' : ""}
            <small class="ranking__cobertura">${r.incompleto ? "⚠ datos incompletos · " : ""}${r.usados} de ${r.disponibles} criterios</small></span>
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

    let bloqueSim = `<p class="nota">Elige un sitio en Marte para ver qué tan parecido es.</p>`;
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
            <p class="tenue">frente a ${esc(estado.sitio.nombre)} · perfil ${esc(nombrePerfil(perfilActivo()))}</p>
            <p class="tenue">${textoCobertura(r)}</p>
          </div>
        </div>
        ${r.incompleto ? `<p class="aviso-datos">⚠ ${esc(avisoIncompleto(r))}</p>` : ""}
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
        ${medidosHTML(l)}
        <p class="sobretitulo">Para profundizar</p>
        ${fuentesHTML(l.fuentes)}
      </div>`;
  }

  /** Tabla "Datos medidos" (NASA POWER y NASA MODIS). */
  function medidosHTML(l) {
    const m = l.medidos;
    if (!m) return "";
    const vacio = (v) => v === null || v === undefined;
    const num = (v, u, dec = 1) =>
      vacio(v) ? "—" : `${Number(v).toFixed(dec).replace(".", ",")}${u ? " " + u : ""}`;
    const pend = (v, u, dec = 0) => (vacio(v) ? "pendiente" : num(v, u, dec));
    const conPercentil = (med, p) => (vacio(med) ? "—" : `${num(med, "°C")} (${num(p, "°C")})`);
    const grupos = [
      ["Temperatura", [
        ["Aire · media", num(m.t_aire_media, "°C")],
        ["Aire · máx. / mín.", `${num(m.t_aire_max, "°C")} / ${num(m.t_aire_min, "°C")}`],
        ["Superficie día · mediana (p95)", conPercentil(m.lst_dia_mediana, m.lst_dia_p95)],
        ["Superficie noche · mediana (p5)", conPercentil(m.lst_noche_mediana, m.lst_noche_p5)],
        ["Amplitud día-noche (superficie)", num(m.amplitud_termica, "°C")],
      ]],
      ["Humedad y radiación", [
        ["Humedad relativa", num(m.humedad_relativa, "%", 0)],
        ["Radiación solar (no entra al cálculo)", num(m.radiacion_kwh_m2_dia, "kWh/m²/día", 2)],
      ]],
      ["Lluvia y erosión", [
        ["Lluvia anual", num(m.lluvia_anual_mm, "mm", 0)],
        ["Erosividad (Fournier mod.)", num(m.erosividad_mfi, "", 0)],
      ]],
      ["Relieve", [
        ["Elevación", pend(m.elevacion_m, "m")],
        ["Pendiente media", pend(m.pendiente_media, "°", 1)],
        ["Pendiente máx.", pend(m.pendiente_max, "°", 1)],
      ]],
    ];
    const op = l.atributos_operativos || {};
    const opTxt = ["aridez", "frio", "ciclo_termico", "superficie_estable", "terreno_plano"]
      .map((k) => `${CONFIG.criterios[k].nombre}: ${vacio(op[k]) ? "sin dato" : op[k].toFixed(2)}`)
      .join(" · ");
    return `
      <p class="sobretitulo">Datos medidos</p>
      <table class="medidos">
        ${grupos.map(([g, filas]) => `
          <tbody>
            <tr><th colspan="2" class="medidos__grupo">${esc(g)}</th></tr>
            ${filas.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}
          </tbody>`).join("")}
      </table>
      ${l.notas_datos ? `<p class="aviso-datos">${esc(l.notas_datos)}</p>` : ""}
      <p class="nota">Observaciones MODIS válidas: día ${num(m.pct_validos_dia, "%", 0)} · noche ${num(m.pct_validos_noche, "%", 0)}.
        Aire, humedad, radiación y lluvia: NASA POWER, promedio 2020–2026 (celda ~50 km).
        Superficie: NASA MODIS Terra MOD11A2 v061 (1 km), 2019–2026.</p>
      <p class="nota"><b>Puntajes calculados (0–1):</b> ${esc(opTxt)}.</p>
      ${estado.citaDatos ? `<p class="nota cita">Fuente: ${esc(estado.citaDatos)}</p>` : ""}`;
  }

  function pintarLeyenda() {
    $("#leyenda").innerHTML = CONFIG.clases
      .map((c) => `<span><i style="background:${c.color};width:${c.radio + 4}px;height:${c.radio + 4}px"></i>${esc(c.nombre)}</span>`)
      .join("") + `<span><i class="leyenda__incompleto"></i>⚠ Datos incompletos</span>`;
  }

  function pintarMetodologia() {
    const perfiles = Object.entries(CONFIG.perfiles);
    const origen = (c) => (c.fuente === "operativos" ? "medido" : "geología");
    $("#tabla-pesos").innerHTML = `
      <thead><tr><th>Criterio</th><th>Origen</th>${perfiles.map(([, p]) => `<th>${esc(p.nombre)}</th>`).join("")}</tr></thead>
      <tbody>${Object.entries(CONFIG.criterios)
        .map(([k, c]) => `<tr><td>${esc(c.nombre)}</td><td class="tenue">${origen(c)}</td>${perfiles
          .map(([, p]) => `<td class="peso${p.pesos[k] ? "" : " peso--cero"}">${(p.pesos[k] || 0).toFixed(1)}</td>`)
          .join("")}</tr>`)
        .join("")}</tbody>`;
    $("#cobertura-minima").textContent = pct(CONFIG.coberturaMinima);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
