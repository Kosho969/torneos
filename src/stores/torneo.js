import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  iniciarBD, consultar, consultarUno, ejecutar, enTransaccion,
  ultimoId, exportarBytes, guardarAhora, borrarTodo,
} from '../db/sqlite.js'
import { construirCuadro, nombreRonda, mezclar, tamanoCuadro } from '../lib/bracket.js'
import { juegoGanado, juegosParaGanar } from '../lib/reglas.js'

const ahora = () => new Date().toISOString()

export const useTorneo = defineStore('torneo', () => {
  /* ------------------------------ estado ------------------------------ */
  const listo = ref(false)
  const vista = ref('inicio')               // inicio | cuadro | partido
  const torneo = ref(null)
  const participantes = ref([])
  const partidos = ref([])
  const juegos = ref([])                    // juegos del partido activo
  const partidoActivoId = ref(null)
  const aviso = ref(null)                   // { texto, tipo }
  const evento = ref(null)                  // pista para las animaciones
  const mostrarCampeon = ref(false)
  const semillaMezcla = ref(0)              // cambia en cada aleatorización

  /* ----------------------------- derivados ---------------------------- */
  const porId = computed(() => {
    const m = new Map()
    for (const p of participantes.value) m.set(p.id, p)
    return m
  })

  const nombreDe = (id) => (id == null ? null : porId.value.get(id)?.nombre ?? '?')

  const rondas = computed(() => {
    const grupos = new Map()
    for (const p of partidos.value) {
      if (!grupos.has(p.ronda)) grupos.set(p.ronda, [])
      grupos.get(p.ronda).push(p)
    }
    return [...grupos.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ronda, lista]) => ({
        ronda,
        nombre: nombreRonda(lista.length),
        partidos: lista.sort((a, b) => a.orden - b.orden),
      }))
  })

  const partidoActivo = computed(() =>
    partidos.value.find(p => p.id === partidoActivoId.value) ?? null)

  const juegoActual = computed(() =>
    juegos.value.find(j => j.ganador_id == null) ?? null)

  const juegosCerrados = computed(() => juegos.value.filter(j => j.ganador_id != null))

  const puedeAleatorizar = computed(() => !!torneo.value && !torneo.value.bloqueado)

  const campeon = computed(() =>
    torneo.value?.campeon_id ? porId.value.get(torneo.value.campeon_id) : null)

  const totalParaGanar = computed(() =>
    torneo.value ? juegosParaGanar(torneo.value.juegos_por_partido) : 1)

  const progreso = computed(() => {
    const jugables = partidos.value.filter(p => p.estado !== 'bye')
    const hechos = jugables.filter(p => p.ganador_id != null).length
    return { hechos, total: jugables.length }
  })

  /* ------------------------------ utilidades -------------------------- */
  function notificar (texto, tipo = 'info') {
    aviso.value = { texto, tipo, id: Date.now() }
    setTimeout(() => { if (aviso.value && aviso.value.texto === texto) aviso.value = null }, 3200)
  }

  function marcarEvento (tipo, datos = {}) {
    evento.value = { tipo, ...datos, id: Date.now() + Math.random() }
  }

  function recargar () {
    const id = torneo.value?.id
    if (!id) return
    torneo.value = consultarUno('SELECT * FROM torneos WHERE id = ?', [id])
    participantes.value = consultar(
      'SELECT * FROM participantes WHERE torneo_id = ? ORDER BY semilla', [id])
    partidos.value = consultar(
      'SELECT * FROM partidos WHERE torneo_id = ? ORDER BY ronda, orden', [id])
    juegos.value = partidoActivoId.value
      ? consultar('SELECT * FROM juegos WHERE partido_id = ? ORDER BY numero', [partidoActivoId.value])
      : []
  }

  /* ------------------------------ arranque ---------------------------- */
  async function iniciar () {
    await iniciarBD()
    const activo = consultarUno("SELECT valor FROM meta WHERE clave = 'torneo_activo'")
    if (activo?.valor) {
      const t = consultarUno('SELECT * FROM torneos WHERE id = ?', [Number(activo.valor)])
      if (t) {
        torneo.value = t
        recargar()
        vista.value = 'cuadro'
      }
    }
    listo.value = true
  }

  /* --------------------------- crear torneo --------------------------- */
  function crearTorneo ({ nombre, nombres, puntosPorJuego, ventajaDos, juegosPorPartido }) {
    const limpios = nombres.map((n, i) => (n || '').trim() || `Jugador ${i + 1}`)
    if (limpios.length < 2) {
      notificar('Se necesitan al menos 2 participantes.', 'error')
      return false
    }

    enTransaccion(() => {
      ejecutar(
        `INSERT INTO torneos (nombre, puntos_por_juego, ventaja_dos, juegos_por_partido, estado, bloqueado, creado_en)
         VALUES (?, ?, ?, ?, 'en_curso', 0, ?)`,
        [nombre?.trim() || 'Torneo de ping pong', puntosPorJuego, ventajaDos ? 1 : 0, juegosPorPartido, ahora()])
      const tid = ultimoId()

      limpios.forEach((n, i) => {
        ejecutar('INSERT INTO participantes (torneo_id, nombre, semilla) VALUES (?, ?, ?)', [tid, n, i + 1])
      })

      ejecutar("INSERT INTO meta (clave, valor) VALUES ('torneo_activo', ?) " +
               'ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', [String(tid)])

      torneo.value = consultarUno('SELECT * FROM torneos WHERE id = ?', [tid])
      participantes.value = consultar('SELECT * FROM participantes WHERE torneo_id = ? ORDER BY semilla', [tid])
      generarCuadro()
    })

    recargar()
    vista.value = 'cuadro'
    notificar('¡Torneo creado! Ya podés sortear el cuadro.', 'exito')
    return true
  }

  /** Borra los partidos existentes y arma el cuadro con el orden actual de siembras. */
  function generarCuadro () {
    const tid = torneo.value.id
    ejecutar('DELETE FROM juegos WHERE partido_id IN (SELECT id FROM partidos WHERE torneo_id = ?)', [tid])
    ejecutar('DELETE FROM partidos WHERE torneo_id = ?', [tid])
    ejecutar('UPDATE torneos SET campeon_id = NULL, estado = \'en_curso\' WHERE id = ?', [tid])

    const cuadro = construirCuadro(participantes.value)
    for (const ronda of cuadro) {
      for (const p of ronda) {
        ejecutar(
          'INSERT INTO partidos (torneo_id, ronda, orden, p1_id, p2_id, estado) VALUES (?, ?, ?, ?, ?, ?)',
          [tid, p.ronda, p.orden, p.p1, p.p2, 'pendiente'])
      }
    }

    // Pases libres (bye): el cuadro no es potencia de dos.
    const primera = consultar(
      'SELECT * FROM partidos WHERE torneo_id = ? AND ronda = 1 ORDER BY orden', [tid])
    for (const p of primera) {
      const solo = (p.p1_id && !p.p2_id) ? p.p1_id : (!p.p1_id && p.p2_id) ? p.p2_id : null
      if (solo) {
        ejecutar("UPDATE partidos SET estado = 'bye', ganador_id = ?, fin = ? WHERE id = ?", [solo, ahora(), p.id])
        avanzar({ ...p, ganador_id: solo })
      }
    }
  }

  /* ---------------------------- sorteo -------------------------------- */
  function aleatorizar () {
    if (!torneo.value) return
    if (torneo.value.bloqueado) {
      notificar('El cuadro está bloqueado: ya se registraron puntos.', 'error')
      return
    }
    enTransaccion(() => {
      const mezclados = mezclar(participantes.value)
      mezclados.forEach((p, i) => {
        ejecutar('UPDATE participantes SET semilla = ? WHERE id = ?', [i + 1, p.id])
      })
      participantes.value = consultar(
        'SELECT * FROM participantes WHERE torneo_id = ? ORDER BY semilla', [torneo.value.id])
      generarCuadro()
    })
    recargar()
    semillaMezcla.value++
    notificar('Cuadro sorteado.', 'exito')
  }

  /* --------------------------- jugar partido -------------------------- */
  function bloquear () {
    if (torneo.value && !torneo.value.bloqueado) {
      ejecutar('UPDATE torneos SET bloqueado = 1 WHERE id = ?', [torneo.value.id])
      torneo.value = { ...torneo.value, bloqueado: 1 }
    }
  }

  function partidoJugable (p) {
    return p.p1_id != null && p.p2_id != null && p.estado !== 'bye'
  }

  function iniciarPartido (id) {
    const p = partidos.value.find(x => x.id === id)
    if (!p || !partidoJugable(p)) {
      notificar('Ese partido todavía no tiene los dos jugadores definidos.', 'error')
      return
    }
    if (p.estado === 'pendiente') {
      ejecutar("UPDATE partidos SET estado = 'en_curso', inicio = ? WHERE id = ?", [ahora(), id])
    }
    partidoActivoId.value = id
    recargar()
    vista.value = 'partido'
  }

  function volverAlCuadro () {
    partidoActivoId.value = null
    juegos.value = []
    vista.value = 'cuadro'
    recargar()
  }

  function asegurarJuegoActual () {
    if (juegoActual.value) return juegoActual.value
    const p = partidoActivo.value
    const numero = juegos.value.length + 1
    ejecutar('INSERT INTO juegos (partido_id, numero, puntos_p1, puntos_p2) VALUES (?, ?, 0, 0)',
      [p.id, numero])
    const nuevo = consultarUno('SELECT * FROM juegos WHERE id = ?', [ultimoId()])
    juegos.value = [...juegos.value, nuevo]
    return nuevo
  }

  /** Aplica una puntuación al juego en curso y resuelve juego/partido si corresponde. */
  function aplicarPuntos (p1, p2, jugadorEvento = null) {
    const p = partidoActivo.value
    if (!p || p.ganador_id != null) return
    bloquear()
    const juego = asegurarJuegoActual()
    const a = Math.max(0, Math.trunc(p1))
    const b = Math.max(0, Math.trunc(p2))

    ejecutar('UPDATE juegos SET puntos_p1 = ?, puntos_p2 = ? WHERE id = ?', [a, b, juego.id])

    const res = juegoGanado(a, b, torneo.value.puntos_por_juego, !!torneo.value.ventaja_dos)
    if (res) {
      const ganadorId = res === 1 ? p.p1_id : p.p2_id
      ejecutar('UPDATE juegos SET ganador_id = ?, fin = ? WHERE id = ?', [ganadorId, ahora(), juego.id])
      const g1 = p.juegos_p1 + (res === 1 ? 1 : 0)
      const g2 = p.juegos_p2 + (res === 2 ? 1 : 0)
      ejecutar('UPDATE partidos SET juegos_p1 = ?, juegos_p2 = ? WHERE id = ?', [g1, g2, p.id])

      const meta = totalParaGanar.value
      if (g1 >= meta || g2 >= meta) {
        finalizarPartido(p.id, g1 >= meta ? p.p1_id : p.p2_id)
        marcarEvento('partido', { ganadorId })
      } else {
        marcarEvento('juego', { ganadorId })
      }
    } else {
      marcarEvento('punto', { jugador: jugadorEvento })
    }
    recargar()
  }

  function sumarPunto (jugador) {
    const p = partidoActivo.value
    if (!p || p.ganador_id != null) return
    const j = juegoActual.value ?? asegurarJuegoActual()
    aplicarPuntos(
      j.puntos_p1 + (jugador === 1 ? 1 : 0),
      j.puntos_p2 + (jugador === 2 ? 1 : 0),
      jugador)
  }

  function restarPunto (jugador) {
    const j = juegoActual.value
    if (!j) return
    if (jugador === 1 && j.puntos_p1 <= 0) return
    if (jugador === 2 && j.puntos_p2 <= 0) return
    ejecutar('UPDATE juegos SET puntos_p1 = ?, puntos_p2 = ? WHERE id = ?', [
      j.puntos_p1 - (jugador === 1 ? 1 : 0),
      j.puntos_p2 - (jugador === 2 ? 1 : 0),
      j.id,
    ])
    recargar()
  }

  /** Carga manual del marcador del juego en curso. */
  function fijarPuntosManual (p1, p2) {
    if (!partidoActivo.value) return
    aplicarPuntos(p1, p2)
    notificar('Marcador actualizado a mano.', 'exito')
  }

  /** Reabre el último juego cerrado (para corregir un error). */
  function reabrirUltimoJuego () {
    const p = partidoActivo.value
    if (!p) return
    const cerrados = juegosCerrados.value
    if (!cerrados.length) { notificar('No hay juegos cerrados para corregir.', 'error'); return }

    enTransaccion(() => {
      // Si había un juego nuevo vacío, lo descartamos.
      if (juegoActual.value && juegoActual.value.puntos_p1 === 0 && juegoActual.value.puntos_p2 === 0) {
        ejecutar('DELETE FROM juegos WHERE id = ?', [juegoActual.value.id])
      }
      const ultimo = cerrados[cerrados.length - 1]
      const era1 = ultimo.ganador_id === p.p1_id
      ejecutar('UPDATE juegos SET ganador_id = NULL, fin = NULL WHERE id = ?', [ultimo.id])
      ejecutar("UPDATE partidos SET juegos_p1 = ?, juegos_p2 = ?, ganador_id = NULL, fin = NULL, estado = 'en_curso' WHERE id = ?",
        [Math.max(0, p.juegos_p1 - (era1 ? 1 : 0)), Math.max(0, p.juegos_p2 - (era1 ? 0 : 1)), p.id])
      limpiarDescendientes(p)
    })
    recargar()
    notificar('Último juego reabierto.', 'exito')
  }

  function finalizarPartido (partidoId, ganadorId) {
    ejecutar("UPDATE partidos SET ganador_id = ?, estado = 'finalizado', fin = ? WHERE id = ?",
      [ganadorId, ahora(), partidoId])
    const p = consultarUno('SELECT * FROM partidos WHERE id = ?', [partidoId])
    avanzar(p)
  }

  /** Lleva al ganador a la ronda siguiente, o lo corona campeón si era la final. */
  function avanzar (p) {
    const tid = torneo.value.id
    const siguiente = consultarUno(
      'SELECT * FROM partidos WHERE torneo_id = ? AND ronda = ? AND orden = ?',
      [tid, p.ronda + 1, Math.floor(p.orden / 2)])

    if (!siguiente) {
      ejecutar("UPDATE torneos SET campeon_id = ?, estado = 'finalizado' WHERE id = ?", [p.ganador_id, tid])
      mostrarCampeon.value = true
      return
    }
    const campo = p.orden % 2 === 0 ? 'p1_id' : 'p2_id'
    ejecutar(`UPDATE partidos SET ${campo} = ? WHERE id = ?`, [p.ganador_id, siguiente.id])
  }

  /** Invalida todo lo que dependía de este partido (al corregir un resultado). */
  function limpiarDescendientes (p) {
    const tid = torneo.value.id
    let actual = p
    while (true) {
      const siguiente = consultarUno(
        'SELECT * FROM partidos WHERE torneo_id = ? AND ronda = ? AND orden = ?',
        [tid, actual.ronda + 1, Math.floor(actual.orden / 2)])
      if (!siguiente) {
        ejecutar("UPDATE torneos SET campeon_id = NULL, estado = 'en_curso' WHERE id = ?", [tid])
        return
      }
      const campo = actual.orden % 2 === 0 ? 'p1_id' : 'p2_id'
      ejecutar('DELETE FROM juegos WHERE partido_id = ?', [siguiente.id])
      ejecutar(
        `UPDATE partidos SET ${campo} = NULL, juegos_p1 = 0, juegos_p2 = 0,
         ganador_id = NULL, estado = 'pendiente', inicio = NULL, fin = NULL WHERE id = ?`,
        [siguiente.id])
      actual = siguiente
    }
  }

  /* --------------------- correcciones desde el cuadro ------------------ */
  /** Resultado manual de un partido: sólo los juegos ganados por cada uno. */
  function resultadoManual (partidoId, juegosP1, juegosP2) {
    const p = partidos.value.find(x => x.id === partidoId)
    if (!p || !partidoJugable(p)) return false
    const meta = totalParaGanar.value
    const g1 = Math.max(0, Math.trunc(juegosP1))
    const g2 = Math.max(0, Math.trunc(juegosP2))
    if (Math.max(g1, g2) !== meta || Math.min(g1, g2) >= meta) {
      notificar(`El ganador debe tener exactamente ${meta} juego(s) y el otro menos.`, 'error')
      return false
    }
    bloquear()
    enTransaccion(() => {
      limpiarDescendientes(p)
      ejecutar('DELETE FROM juegos WHERE partido_id = ? AND ganador_id IS NULL', [partidoId])
      ejecutar('UPDATE partidos SET juegos_p1 = ?, juegos_p2 = ? WHERE id = ?', [g1, g2, partidoId])
      finalizarPartido(partidoId, g1 > g2 ? p.p1_id : p.p2_id)
    })
    recargar()
    notificar('Resultado cargado a mano.', 'exito')
    return true
  }

  /** Vuelve un partido a cero (y anula lo que dependía de él). */
  function reiniciarPartido (partidoId) {
    const p = partidos.value.find(x => x.id === partidoId)
    if (!p) return
    enTransaccion(() => {
      limpiarDescendientes(p)
      ejecutar('DELETE FROM juegos WHERE partido_id = ?', [partidoId])
      ejecutar(
        `UPDATE partidos SET juegos_p1 = 0, juegos_p2 = 0, ganador_id = NULL,
         estado = 'pendiente', inicio = NULL, fin = NULL WHERE id = ?`, [partidoId])
    })
    if (partidoActivoId.value === partidoId) partidoActivoId.value = null
    recargar()
    notificar('Partido reiniciado.', 'exito')
  }

  /* ------------------------------- reinicios -------------------------- */
  /** Borra todos los marcadores y desbloquea el sorteo. Mantiene jugadores y reglas. */
  function reiniciarTorneo () {
    if (!torneo.value) return
    enTransaccion(() => {
      ejecutar('UPDATE torneos SET bloqueado = 0, campeon_id = NULL, estado = \'en_curso\' WHERE id = ?',
        [torneo.value.id])
      generarCuadro()
    })
    partidoActivoId.value = null
    mostrarCampeon.value = false
    recargar()
    vista.value = 'cuadro'
    notificar('Torneo reiniciado: marcadores en cero.', 'exito')
  }

  /** Cierra el torneo actual y vuelve a la pantalla inicial (el historial queda en la base). */
  function nuevoTorneo () {
    ejecutar("DELETE FROM meta WHERE clave = 'torneo_activo'")
    torneo.value = null
    participantes.value = []
    partidos.value = []
    juegos.value = []
    partidoActivoId.value = null
    mostrarCampeon.value = false
    vista.value = 'inicio'
  }

  /** Borra absolutamente todo de la base de datos. */
  async function borrarBaseCompleta () {
    await borrarTodo()
    nuevoTorneo()
    notificar('Base de datos vaciada.', 'exito')
  }

  /** Descarga el archivo .sqlite con todos los torneos y marcadores. */
  async function descargarBase () {
    await guardarAhora()
    const bytes = exportarBytes()
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/x-sqlite3' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `torneo-pinpon-${new Date().toISOString().slice(0, 10)}.sqlite`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notificar('Base de datos descargada.', 'exito')
  }

  return {
    // estado
    listo, vista, torneo, participantes, partidos, juegos, partidoActivoId,
    aviso, evento, mostrarCampeon, semillaMezcla,
    // derivados
    porId, nombreDe, rondas, partidoActivo, juegoActual, juegosCerrados,
    puedeAleatorizar, campeon, totalParaGanar, progreso, partidoJugable,
    tamanoCuadro: computed(() => tamanoCuadro(participantes.value.length || 2)),
    // acciones
    iniciar, crearTorneo, aleatorizar, iniciarPartido, volverAlCuadro,
    sumarPunto, restarPunto, fijarPuntosManual, reabrirUltimoJuego,
    resultadoManual, reiniciarPartido, reiniciarTorneo, nuevoTorneo,
    borrarBaseCompleta, descargarBase, notificar,
  }
})
