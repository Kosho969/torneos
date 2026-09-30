/** Potencia de dos igual o mayor a n (tamaño del cuadro). */
export function tamanoCuadro (n) {
  let p = 1
  while (p < n) p *= 2
  return Math.max(p, 2)
}

/**
 * Orden estándar de siembras de un cuadro de eliminación directa.
 * Para 8: [1,8,4,5,2,7,3,6] -> los "byes" quedan repartidos y nunca se enfrentan
 * dos cabezas de serie en primera ronda.
 */
export function ordenSiembras (tamano) {
  let orden = [1, 2]
  while (orden.length < tamano) {
    const total = orden.length * 2
    const siguiente = []
    for (const s of orden) {
      siguiente.push(s, total + 1 - s)
    }
    orden = siguiente
  }
  return orden
}

/** Cantidad de rondas del cuadro. */
export function numeroRondas (tamano) {
  return Math.log2(tamano)
}

/**
 * Construye la estructura del cuadro.
 * @param {Array<{id:number}>} participantes en el orden que define su siembra (1..n)
 * @returns {Array<Array<{ronda:number, orden:number, p1:number|null, p2:number|null}>>}
 */
export function construirCuadro (participantes) {
  const n = participantes.length
  const tamano = tamanoCuadro(n)
  const orden = ordenSiembras(tamano)
  const rondas = []

  // Primera ronda: pares consecutivos del orden de siembras.
  const primera = []
  for (let i = 0; i < tamano; i += 2) {
    const a = orden[i]
    const b = orden[i + 1]
    primera.push({
      ronda: 1,
      orden: i / 2,
      p1: a <= n ? participantes[a - 1].id : null,
      p2: b <= n ? participantes[b - 1].id : null,
    })
  }
  rondas.push(primera)

  // Rondas siguientes: vacías, se llenan al avanzar los ganadores.
  const totalRondas = numeroRondas(tamano)
  for (let r = 2; r <= totalRondas; r++) {
    const cantidad = tamano / Math.pow(2, r)
    const ronda = []
    for (let i = 0; i < cantidad; i++) {
      ronda.push({ ronda: r, orden: i, p1: null, p2: null })
    }
    rondas.push(ronda)
  }

  return rondas
}

/** Nombre de la ronda según cuántos partidos tiene. */
export function nombreRonda (partidosEnRonda) {
  switch (partidosEnRonda) {
    case 1: return 'Final'
    case 2: return 'Semifinales'
    case 4: return 'Cuartos de final'
    case 8: return 'Octavos de final'
    case 16: return 'Dieciseisavos'
    default: return `Ronda de ${partidosEnRonda * 2}`
  }
}

/** Mezcla (Fisher-Yates) devolviendo un arreglo nuevo. */
export function mezclar (arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
