/**
 * Cálculo de similitud entre un sitio de Marte (E) y un lugar de Colombia (C).
 *
 *   similitud = Σ w_k · min(E_k, C_k) / Σ w_k · E_k
 *
 * Responde: "¿qué fracción de lo que caracteriza al sitio de Marte
 * está presente en este lugar de Colombia?". Va de 0 a 1.
 *
 * Los pesos w dependen del perfil ("ciencia" o "base"). Si el valor de
 * Colombia es null (no hay dato medido), ese criterio se excluye del
 * numerador Y del denominador. La cobertura = criterios usados / criterios
 * disponibles (los que tienen w > 0 y E > 0 para ese sitio y perfil).
 * Debe coincidir con scripts/modelo.py.
 */
window.Similitud = (function () {
  /** Une atributos geológicos (ausente = 0) y operativos (ausente = null). */
  function valores(lugar, criterios) {
    const v = {};
    for (const [clave, c] of Object.entries(criterios)) {
      if (c.fuente === "operativos") {
        const x = (lugar.atributos_operativos || {})[clave];
        v[clave] = x === undefined ? null : x;
      } else {
        v[clave] = (lugar.atributos || {})[clave] ?? 0;
      }
    }
    return v;
  }

  function calcular(sitio, lugar, perfil, config) {
    const pesos = config.perfiles[perfil].pesos;
    const c = valores(lugar, config.criterios);
    let num = 0, den = 0, usados = 0, disponibles = 0;
    const faltantes = [];
    for (const [clave, w] of Object.entries(pesos)) {
      const e = sitio.atributos[clave] ?? 0;
      if (w <= 0 || e <= 0) continue;
      disponibles++;
      if (c[clave] === null) { faltantes.push(clave); continue; }
      usados++;
      num += w * Math.min(e, c[clave]);
      den += w * e;
    }
    const cobertura = disponibles ? usados / disponibles : 0;
    return {
      valor: den === 0 ? 0 : num / den,
      usados,
      disponibles,
      cobertura,
      incompleto: cobertura < config.coberturaMinima,
      faltantes,
    };
  }

  /** Criterios que más aportan a la similitud (para explicar el resultado). */
  function aportes(sitio, lugar, perfil, config, n = 3) {
    const pesos = config.perfiles[perfil].pesos;
    const c = valores(lugar, config.criterios);
    return Object.entries(pesos)
      .filter(([clave, w]) => w > 0 && c[clave] !== null)
      .map(([clave, w]) => ({
        clave,
        nombre: config.criterios[clave].nombre,
        valor: w * Math.min(sitio.atributos[clave] ?? 0, c[clave]),
      }))
      .filter((a) => a.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, n);
  }

  function clase(valor, clases) {
    return clases.find((c) => valor >= c.min) ?? clases[clases.length - 1];
  }

  return { valores, calcular, aportes, clase };
})();
