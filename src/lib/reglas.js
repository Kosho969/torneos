/**
 * Reglas de puntuación (tenis de mesa estándar, configurable).
 * juegoGanado -> 0 = sigue, 1 = gana jugador 1, 2 = gana jugador 2
 */
export function juegoGanado (p1, p2, puntosPorJuego, ventajaDos) {
  const mayor = Math.max(p1, p2)
  const dif = Math.abs(p1 - p2)
  if (mayor < puntosPorJuego) return 0
  if (ventajaDos && dif < 2) return 0
  if (dif < 1) return 0
  return p1 > p2 ? 1 : 2
}

/** Juegos necesarios para ganar el partido (al mejor de N). */
export function juegosParaGanar (juegosPorPartido) {
  return Math.floor(juegosPorPartido / 2) + 1
}

/** ¿Está el juego en situación de "ventaja" (ambos al límite)? */
export function enVentaja (p1, p2, puntosPorJuego, ventajaDos) {
  return !!ventajaDos && p1 >= puntosPorJuego - 1 && p2 >= puntosPorJuego - 1
}

/**
 * Quién saca. Se alterna el saque cada 2 puntos, y cada 1 punto en ventaja.
 * El primer saque del partido es del jugador 1 y alterna por juego.
 * @returns 1 | 2
 */
export function quienSaca (numeroJuego, p1, p2, puntosPorJuego, ventajaDos) {
  const total = p1 + p2
  const cambios = enVentaja(p1, p2, puntosPorJuego, ventajaDos)
    ? total
    : Math.floor(total / 2)
  const inicial = (numeroJuego - 1) % 2 // 0 -> jugador 1, 1 -> jugador 2
  return ((inicial + cambios) % 2) === 0 ? 1 : 2
}

/** Texto del formato del torneo, p. ej. "11 puntos · dif. 2 · al mejor de 5". */
export function textoFormato (torneo) {
  if (!torneo) return ''
  const partes = [`${torneo.puntos_por_juego} puntos`]
  if (torneo.ventaja_dos) partes.push('diferencia de 2')
  partes.push(torneo.juegos_por_partido === 1
    ? 'a 1 juego'
    : `al mejor de ${torneo.juegos_por_partido}`)
  return partes.join(' · ')
}
