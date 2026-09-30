<script setup>
import { ref, computed, watch } from 'vue'
import { useTorneo } from '../stores/torneo.js'
import { tamanoCuadro } from '../lib/bracket.js'

const store = useTorneo()

const nombre = ref('Torneo de ping pong')
const cantidad = ref(8)
const nombres = ref(Array.from({ length: 8 }, (_, i) => `Jugador ${i + 1}`))
const puntosPorJuego = ref(11)
const ventajaDos = ref(true)
const juegosPorPartido = ref(5)

const FORMATOS = [
  { id: 'normal',  titulo: 'Normal',  desc: '11 puntos · dif. 2 · al mejor de 5', puntos: 11, ventaja: true,  juegos: 5 },
  { id: 'express', titulo: 'Exprés',  desc: '11 puntos · dif. 2 · a 1 juego',     puntos: 11, ventaja: true,  juegos: 1 },
  { id: 'clasico', titulo: 'Clásico', desc: '21 puntos · dif. 2 · al mejor de 3', puntos: 21, ventaja: true,  juegos: 3 },
  { id: 'rapido',  titulo: 'A muerte súbita', desc: '7 puntos · sin diferencia · al mejor de 3', puntos: 7, ventaja: false, juegos: 3 },
]

const formatoActivo = computed(() => FORMATOS.find(f =>
  f.puntos === puntosPorJuego.value &&
  f.ventaja === ventajaDos.value &&
  f.juegos === juegosPorPartido.value)?.id ?? 'personalizado')

function aplicarFormato (f) {
  puntosPorJuego.value = f.puntos
  ventajaDos.value = f.ventaja
  juegosPorPartido.value = f.juegos
}

watch(cantidad, (n) => {
  const actual = nombres.value
  nombres.value = Array.from({ length: n }, (_, i) => actual[i] ?? `Jugador ${i + 1}`)
})

function cambiarCantidad (delta) {
  cantidad.value = Math.min(64, Math.max(2, cantidad.value + delta))
}

const cuadro = computed(() => {
  const tam = tamanoCuadro(cantidad.value)
  return { tamano: tam, byes: tam - cantidad.value, rondas: Math.log2(tam) }
})

const juegosGanar = computed(() => Math.floor(juegosPorPartido.value / 2) + 1)

function crear () {
  store.crearTorneo({
    nombre: nombre.value,
    nombres: nombres.value,
    puntosPorJuego: Math.min(99, Math.max(1, Math.trunc(puntosPorJuego.value) || 11)),
    ventajaDos: ventajaDos.value,
    juegosPorPartido: Math.min(15, Math.max(1, Math.trunc(juegosPorPartido.value) || 1)),
  })
}
</script>

<template>
  <div class="contenedor animar-entrada">
    <div class="tarjeta" style="text-align: center">
      <h2 style="font-size: 1.5rem">Armá tu torneo</h2>
      <p class="ayuda">Elegí los participantes y las reglas. Después sorteás el cuadro y empezás a jugar.</p>
    </div>

    <!-- 1. Participantes -->
    <div class="tarjeta">
      <div class="titulo-seccion">
        <span class="num">1</span>
        <h2>Participantes</h2>
      </div>

      <div class="campo" style="margin-bottom: 16px">
        <label for="nombre-torneo">Nombre del torneo</label>
        <input id="nombre-torneo" v-model="nombre" class="entrada" placeholder="Torneo de ping pong" maxlength="60" />
      </div>

      <p class="ayuda" style="text-align: center; margin-bottom: 8px">¿Cuántas personas juegan?</p>
      <div class="contador-jugadores">
        <button class="btn icono" :disabled="cantidad <= 2" @click="cambiarCantidad(-1)" aria-label="Quitar participante">−</button>
        <span class="valor">{{ cantidad }}</span>
        <button class="btn icono" :disabled="cantidad >= 64" @click="cambiarCantidad(1)" aria-label="Agregar participante">+</button>
      </div>

      <div class="fila centrada" style="justify-content: center; margin: 14px 0 18px">
        <span class="chip azul">Cuadro de {{ cuadro.tamano }}</span>
        <span class="chip" :class="cuadro.byes ? 'naranja' : 'verde'">
          {{ cuadro.byes ? cuadro.byes + ' pase(s) libre(s)' : 'Sin pases libres' }}
        </span>
        <span class="chip">{{ cuadro.rondas }} ronda(s)</span>
      </div>

      <div class="lista-jugadores">
        <div v-for="(_, i) in nombres" :key="i" class="jugador-fila">
          <span class="semilla">{{ i + 1 }}</span>
          <input
            v-model="nombres[i]"
            class="entrada"
            :placeholder="'Jugador ' + (i + 1)"
            maxlength="28"
            :aria-label="'Nombre del participante ' + (i + 1)" />
        </div>
      </div>
      <p class="ayuda">Si el número es impar, la app reparte los pases libres automáticamente.</p>
    </div>

    <!-- 2. Reglas -->
    <div class="tarjeta">
      <div class="titulo-seccion">
        <span class="num">2</span>
        <h2>Reglas del torneo</h2>
      </div>

      <div class="selector-formato">
        <button
          v-for="f in FORMATOS" :key="f.id"
          class="opcion"
          :class="{ activa: formatoActivo === f.id }"
          @click="aplicarFormato(f)">
          <strong>{{ f.titulo }}</strong>
          <span>{{ f.desc }}</span>
        </button>
      </div>

      <p class="ayuda" style="margin: 16px 0 10px">
        Ajustá lo que quieras: el formato pasa a ser
        <strong v-if="formatoActivo === 'personalizado'" style="color: var(--naranja)">personalizado</strong>
        <strong v-else>{{ FORMATOS.find(f => f.id === formatoActivo).titulo }}</strong>.
      </p>

      <div class="rejilla dos">
        <div class="campo">
          <label for="puntos">Puntos para ganar un juego</label>
          <div class="fila centrada">
            <button class="btn icono" @click="puntosPorJuego = Math.max(1, puntosPorJuego - 1)">−</button>
            <input id="puntos" v-model.number="puntosPorJuego" type="number" min="1" max="99" class="entrada num" />
            <button class="btn icono" @click="puntosPorJuego = Math.min(99, puntosPorJuego + 1)">+</button>
          </div>
        </div>

        <div class="campo">
          <label for="juegos">Juegos por partido</label>
          <div class="fila centrada">
            <button class="btn icono" @click="juegosPorPartido = Math.max(1, juegosPorPartido - 2)">−</button>
            <input id="juegos" v-model.number="juegosPorPartido" type="number" min="1" max="15" class="entrada num" />
            <button class="btn icono" @click="juegosPorPartido = Math.min(15, juegosPorPartido + 2)">+</button>
          </div>
          <span class="ayuda">Gana el primero en llevarse {{ juegosGanar }} juego(s).</span>
        </div>
      </div>

      <label class="interruptor" style="margin-top: 18px">
        <input type="checkbox" v-model="ventajaDos" />
        <span class="caja"></span>
        <span class="texto">
          <strong>Exigir diferencia de 2 puntos</strong>
          <span>
            Al llegar a {{ puntosPorJuego }} iguales se sigue jugando hasta sacar 2 de ventaja
            (regla estándar de tenis de mesa).
          </span>
        </span>
      </label>
    </div>

    <!-- 3. Empezar -->
    <div class="tarjeta" style="text-align: center">
      <div class="fila centrada" style="justify-content: center; margin-bottom: 14px">
        <span class="chip verde">{{ cantidad }} participantes</span>
        <span class="chip naranja">{{ puntosPorJuego }} puntos</span>
        <span class="chip" v-if="ventajaDos">diferencia de 2</span>
        <span class="chip">{{ juegosPorPartido === 1 ? 'a 1 juego' : 'al mejor de ' + juegosPorPartido }}</span>
      </div>
      <button class="btn primario grande bloque" @click="crear">🏓 Crear torneo</button>
    </div>
  </div>
</template>
