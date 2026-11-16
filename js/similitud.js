/**
 * Similarity between a Mars site (E) and a place in Colombia (C).
 *
 *   similarity = Σ w_k · min(E_k, C_k) / Σ w_k · E_k
 *
 * Answers: "what fraction of what characterizes the Mars site is present in
 * this Colombian place?". Ranges from 0 to 1.
 *
 * The weights w depend on the profile ("ciencia" = science, "base" = landing
 * & base). If the Colombian value is null (no measured data), that criterion is
 * excluded from BOTH the numerator and the denominator. Coverage = criteria used
 * / criteria available (those with w > 0 and E > 0 for that site and profile).
 * Must match scripts/modelo.py.
 */
window.Similitud = (function () {
  /** Merges geological attributes (missing = 0) and measured ones (missing = null). */
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

  /** Criteria that contribute most to the similarity (to explain the result). */
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
