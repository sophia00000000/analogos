/**
 * Cálculo de similitud entre un sitio extraterrestre (E) y un lugar de Colombia (C).
 *
 *   similitud = Σ w_k · min(E_k, C_k) / Σ w_k · E_k
 *
 * Responde: "¿qué fracción de lo que caracteriza al sitio de Marte/Luna
 * está presente en este lugar de Colombia?". Va de 0 a 1.
 */
window.Similitud = (function () {
  function calcular(extra, colombia, criterios) {
    let numerador = 0;
    let denominador = 0;
    for (const [clave, { peso }] of Object.entries(criterios)) {
      const e = extra.atributos[clave] ?? 0;
      const c = colombia.atributos[clave] ?? 0;
      numerador += peso * Math.min(e, c);
      denominador += peso * e;
    }
    return denominador === 0 ? 0 : numerador / denominador;
  }

  /** Criterios que más aportan a la similitud (para explicar el resultado). */
  function aportes(extra, colombia, criterios, n = 3) {
    return Object.entries(criterios)
      .map(([clave, { nombre, peso }]) => ({
        clave,
        nombre,
        valor: peso * Math.min(extra.atributos[clave] ?? 0, colombia.atributos[clave] ?? 0),
      }))
      .filter((a) => a.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, n);
  }

  function clase(valor, clases) {
    return clases.find((c) => valor >= c.min) ?? clases[clases.length - 1];
  }

  return { calcular, aportes, clase };
})();
