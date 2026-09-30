<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useTorneo } from '../stores/torneo.js'
import { quienSaca, enVentaja, textoFormato } from '../lib/reglas.js'
import Modal from './Modal.vue'
import { usarMenu } from '../lib/usarMenu.js'

const store = useTorneo()

const { abierto: menu, alternar: alternarMenu, cerrar: cerrarMenu } = usarMenu()
const manual = ref(null)          // { p1, p2 }
const confirmarReinicio = ref(false)
const mensajeJuego = ref(null)
const pop = ref({ 1: false, 2: false })
const golpe = ref({ 1: false, 2: false })

const partido = computed(() => store.partidoActivo)
const torneo = computed(() => store.torneo)
const nombre1 = computed(() => store.nombreDe(partido.value?.p1_id) ?? '—')
const nombre2 = computed(() => store.nombreDe(partido.value?.p2_id) ?? '—')
const puntos1 = computed(() => store.juegoActual?.puntos_p1 ?? 0)
const puntos2 = computed(() => store.juegoActual?.puntos_p2 ?? 0)
const numeroJuego = computed(() => store.juegosCerrados.length + 1)
const terminado = computed(() => !!partido.value?.ganador_id)

const rondaTexto = computed(() => {
  const r = store.rondas.find(x => x.ronda === partido.value?.ronda)
  return r ? r.nombre : ''
})

const saque = computed(() => {
  if (!torneo.value || terminado.value) return 0
  return quienSaca(numeroJuego.value, puntos1.value, puntos2.value,
    torneo.value.puntos_por_juego, !!torneo.value.ventaja_dos)
})

const ventaja = computed(() =>
  !terminado.value && torneo.value &&
  enVentaja(puntos1.value, puntos2.value, torneo.value.puntos_por_juego, !!torneo.value.ventaja_dos))

const ganadorNombre = computed(() =>
  partido.value?.ganador_id ? store.nombreDe(partido.value.ganador_id) : '')

function animar (jugador) {
  pop.value[jugador] = false
  golpe.value[jugador] = false
  nextTick(() => {
    pop.value[jugador] = true
    golpe.value[jugador] = true
    setTimeout(() => { pop.value[jugador] = false; golpe.value[jugador] = false }, 460)
  })
}

function sumar (jugador) {
  if (terminado.value) return
  animar(jugador)
  store.sumarPunto(jugador)
}

function restar (jugador) {
  store.restarPunto(jugador)
}

// Mensaje al cerrar un juego (sin cerrar el partido).
watch(() => store.evento, (e) => {
  if (!e) return
  if (e.tipo === 'juego') {
    const cerrado = store.juegosCerrados[store.juegosCerrados.length - 1]
    mensajeJuego.value = cerrado
      ? `¡Juego para ${store.nombreDe(cerrado.ganador_id)}! (${cerrado.puntos_p1}–${cerrado.puntos_p2})`
      : '¡Juego!'
    setTimeout(() => { mensajeJuego.value = null }, 2400)
  }
})

function abrirManual () {
  cerrarMenu()
  manual.value = { p1: puntos1.value, p2: puntos2.value }
}

function guardarManual () {
  store.fijarPuntosManual(Number(manual.value.p1) || 0, Number(manual.value.p2) || 0)
  manual.value = null
}

function alTeclado (e) {
  if (manual.value || confirmarReinicio.value || menu.value) return
  if (e.key === 'Escape') { store.volverAlCuadro(); return }
  if (terminado.value) return
  if (['a', 'A', '1', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); sumar(1) }
  if (['l', 'L', '2', 'ArrowRight'].includes(e.key)) { e.preventDefault(); sumar(2) }
}
onMounted(() => window.addEventListener('keydown', alTeclado))
onUnmounted(() => window.removeEventListener('keydown', alTeclado))
</script>

<template>
  <div v-if="partido" class="partido-vivo">
    <!-- Encabezado mínimo -->
    <header class="encabezado">
      <button class="btn chico fantasma" @click="store.volverAlCuadro()">← Cuadro</button>
      <div class="centro">
        <div class="ronda-txt">{{ rondaTexto }} · Juego {{ Math.min(numeroJuego, torneo.juegos_por_partido) }} de {{ torneo.juegos_por_partido }}</div>
        <div class="detalle">{{ textoFormato(torneo) }}</div>
      </div>
      <div class="envoltorio-menu">
        <button class="btn chico" @click="alternarMenu('opciones')" aria-label="Opciones del partido">⋯</button>
        <Transition name="zoom">
          <div v-if="menu === 'opciones'" class="menu-flotante">
            <button @click="abrirManual">✏️ Cargar marcador a mano</button>
            <button v-if="store.juegosCerrados.length" @click="cerrarMenu(); store.reabrirUltimoJuego()">
              ↩︎ Corregir último juego
            </button>
            <hr />
            <button class="peligroso" @click="cerrarMenu(); confirmarReinicio = true">↺ Reiniciar partido</button>
          </div>
        </Transition>
      </div>
    </header>

    <!-- Marcador: sólo nombres, puntos y los dos botones -->
    <div class="marcador">
      <Transition name="v-fade">
        <div v-if="ventaja" class="aviso-ventaja">Ventaja · hay que sacar 2 de diferencia</div>
      </Transition>

      <button
        class="zona uno"
        :class="{ saca: saque === 1, golpe: golpe[1] }"
        :disabled="terminado"
        @click="sumar(1)">
        <span v-if="saque === 1" class="etiqueta-saque">🏓 Saque</span>
        <span class="nombre-j">{{ nombre1 }}</span>
        <span class="puntos" :class="{ pop: pop[1] }">{{ puntos1 }}</span>
        <span class="juegos-ganados">
          <i v-for="n in store.totalParaGanar" :key="n" :class="{ on: n <= partido.juegos_p1 }" />
        </span>
        <span
          v-if="!terminado && puntos1 > 0"
          class="menos"
          role="button"
          aria-label="Quitar un punto"
          @click.stop="restar(1)">−</span>
      </button>

      <button
        class="zona dos"
        :class="{ saca: saque === 2, golpe: golpe[2] }"
        :disabled="terminado"
        @click="sumar(2)">
        <span v-if="saque === 2" class="etiqueta-saque">🏓 Saque</span>
        <span class="nombre-j">{{ nombre2 }}</span>
        <span class="puntos" :class="{ pop: pop[2] }">{{ puntos2 }}</span>
        <span class="juegos-ganados">
          <i v-for="n in store.totalParaGanar" :key="n" :class="{ on: n <= partido.juegos_p2 }" />
        </span>
        <span
          v-if="!terminado && puntos2 > 0"
          class="menos"
          role="button"
          aria-label="Quitar un punto"
          @click.stop="restar(2)">−</span>
      </button>
    </div>

    <!-- Pie: juegos ya cerrados -->
    <footer class="pie-partido">
      <div class="tablero-juegos">
        <span v-for="j in store.juegosCerrados" :key="j.id" class="j">
          J{{ j.numero }}: {{ j.puntos_p1 }}–{{ j.puntos_p2 }}
        </span>
        <span v-if="!store.juegosCerrados.length" class="j">Tocá el nombre de cada jugador para sumar puntos</span>
      </div>
    </footer>

    <!-- Aviso de fin de juego -->
    <Transition name="zoom">
      <div v-if="mensajeJuego" class="toast exito" style="bottom: auto; top: 76px">{{ mensajeJuego }}</div>
    </Transition>

    <!-- Partido terminado -->
    <Transition name="zoom">
      <div v-if="terminado" class="velo" style="z-index: 70">
        <div class="modal" style="text-align: center">
          <div style="font-size: 3.4rem">🏓</div>
          <h3 style="font-size: 1.5rem; margin: 6px 0">¡Ganó {{ ganadorNombre }}!</h3>
          <p class="cuerpo" style="font-size: 1.1rem; font-weight: 800; margin: 6px 0 12px">
            {{ partido.juegos_p1 }} – {{ partido.juegos_p2 }}
          </p>
          <div class="tablero-juegos" style="justify-content: center">
            <span v-for="j in store.juegosCerrados" :key="j.id" class="j">{{ j.puntos_p1 }}–{{ j.puntos_p2 }}</span>
          </div>
          <div class="pie" style="justify-content: center">
            <button class="btn fantasma" @click="store.reabrirUltimoJuego()">↩︎ Corregir</button>
            <button class="btn primario" @click="store.volverAlCuadro()">Volver al cuadro →</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Marcador manual -->
    <Modal v-if="manual" titulo="Cargar marcador a mano" @cerrar="manual = null">
      <p>Puntos del juego en curso (juego {{ numeroJuego }}). Si el marcador ya define el juego, se cierra solo.</p>
      <div class="marcador-manual">
        <div>
          <label :style="{ color: 'var(--j1)' }">{{ nombre1 }}</label>
          <input v-model.number="manual.p1" type="number" min="0" max="199" class="entrada num" />
        </div>
        <span class="vs">–</span>
        <div>
          <label :style="{ color: 'var(--j2)' }">{{ nombre2 }}</label>
          <input v-model.number="manual.p2" type="number" min="0" max="199" class="entrada num" />
        </div>
      </div>
      <template #pie>
        <button class="btn fantasma" @click="manual = null">Cancelar</button>
        <button class="btn primario" @click="guardarManual">Guardar</button>
      </template>
    </Modal>

    <Modal v-if="confirmarReinicio" titulo="¿Reiniciar este partido?" @cerrar="confirmarReinicio = false">
      <p>El marcador vuelve a cero y se borran los juegos registrados de este partido.</p>
      <template #pie>
        <button class="btn fantasma" @click="confirmarReinicio = false">Cancelar</button>
        <button class="btn peligro" @click="confirmarReinicio = false; store.reiniciarPartido(partido.id); store.volverAlCuadro()">
          Sí, reiniciar
        </button>
      </template>
    </Modal>
  </div>
</template>
