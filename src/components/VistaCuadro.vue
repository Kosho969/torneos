<script setup>
import { ref, computed } from 'vue'
import { useTorneo } from '../stores/torneo.js'
import { textoFormato } from '../lib/reglas.js'
import Modal from './Modal.vue'
import { usarMenu } from '../lib/usarMenu.js'

const store = useTorneo()

const confirmando = ref(null)        // 'reiniciar' | 'nuevo' | 'borrar' | { partido }
const manual = ref(null)             // { partido, g1, g2 }
const { abierto: menuPartido, alternar: alternarMenu, cerrar: cerrarMenu } = usarMenu()
const verParticipantes = ref(false)

const formato = computed(() => textoFormato(store.torneo))
const pct = computed(() => {
  const { hechos, total } = store.progreso
  return total ? Math.round((hechos / total) * 100) : 0
})

function estadoPartido (p) {
  if (p.estado === 'bye') return { clase: 'bye', texto: 'Pase libre' }
  if (p.ganador_id) return { clase: 'finalizado', texto: 'Finalizado' }
  if (p.estado === 'en_curso') return { clase: 'en-curso', texto: 'En juego' }
  if (store.partidoJugable(p)) return { clase: 'listo', texto: 'Listo' }
  return { clase: 'espera', texto: 'A definir' }
}

function abrirManual (p) {
  cerrarMenu()
  manual.value = { partido: p, g1: p.juegos_p1, g2: p.juegos_p2 }
}

function guardarManual () {
  const { partido, g1, g2 } = manual.value
  if (store.resultadoManual(partido.id, Number(g1), Number(g2))) manual.value = null
}

function pedirReinicioPartido (p) {
  cerrarMenu()
  confirmando.value = { tipo: 'partido', partido: p }
}

function confirmar () {
  const c = confirmando.value
  confirmando.value = null
  if (c === 'reiniciar') store.reiniciarTorneo()
  else if (c === 'nuevo') store.nuevoTorneo()
  else if (c === 'borrar') store.borrarBaseCompleta()
  else if (c?.tipo === 'partido') store.reiniciarPartido(c.partido.id)
}

const textoConfirmacion = computed(() => {
  const c = confirmando.value
  if (c === 'reiniciar') return {
    titulo: '¿Reiniciar el torneo?',
    cuerpo: 'Se borran todos los marcadores y se vuelve a armar el cuadro. Los participantes y las reglas se mantienen, y podrás sortear de nuevo.',
    boton: 'Sí, reiniciar',
  }
  if (c === 'nuevo') return {
    titulo: '¿Empezar un torneo nuevo?',
    cuerpo: 'Vas a volver a la pantalla inicial. Este torneo queda guardado en la base de datos, pero ya no se mostrará.',
    boton: 'Sí, torneo nuevo',
  }
  if (c === 'borrar') return {
    titulo: '¿Borrar toda la base de datos?',
    cuerpo: 'Se elimina absolutamente todo: torneos, participantes y marcadores. No se puede deshacer.',
    boton: 'Borrar todo',
  }
  if (c?.tipo === 'partido') return {
    titulo: '¿Reiniciar este partido?',
    cuerpo: 'El marcador de este partido vuelve a cero. Si su ganador ya había avanzado, esa parte del cuadro también se limpia.',
    boton: 'Sí, reiniciar partido',
  }
  return null
})
</script>

<template>
  <div class="contenedor animar-entrada">
    <!-- Panel de control -->
    <div class="tarjeta">
      <div class="fila centrada" style="justify-content: space-between; gap: 14px">
        <div style="min-width: 0">
          <h2 style="font-size: 1.22rem">{{ store.torneo.nombre }}</h2>
          <p class="ayuda" style="margin-top: 2px">{{ formato }}</p>
        </div>
        <div class="fila centrada">
          <span v-if="store.campeon" class="chip verde">🏆 {{ store.campeon.nombre }}</span>
          <span v-else-if="store.torneo.bloqueado" class="chip rojo">🔒 Cuadro bloqueado</span>
          <span v-else class="chip naranja">🎲 Sorteo disponible</span>
        </div>
      </div>

      <div style="margin: 16px 0 6px">
        <div class="barra-progreso"><span :style="{ width: pct + '%' }" /></div>
        <p class="ayuda" style="margin-top: 6px">
          {{ store.progreso.hechos }} de {{ store.progreso.total }} partidos jugados ({{ pct }}%)
        </p>
      </div>

      <div class="fila" style="margin-top: 14px">
        <button
          class="btn"
          :class="store.puedeAleatorizar ? 'primario' : ''"
          :disabled="!store.puedeAleatorizar"
          @click="store.aleatorizar()">
          🎲 Sortear cuadro
        </button>
        <button class="btn" @click="verParticipantes = !verParticipantes">
          👥 Participantes ({{ store.participantes.length }})
        </button>
        <span class="crece" style="flex: 1" />
        <button class="btn peligro" @click="confirmando = 'reiniciar'">↺ Reiniciar torneo</button>
        <div class="envoltorio-menu">
          <button class="btn" @click="alternarMenu('general')">⋯</button>
          <Transition name="zoom">
            <div v-if="menuPartido === 'general'" class="menu-flotante" @click="cerrarMenu()">
              <button @click="confirmando = 'nuevo'">➕ Torneo nuevo</button>
              <button @click="store.descargarBase()">💾 Descargar base (.sqlite)</button>
              <hr />
              <button class="peligroso" @click="confirmando = 'borrar'">🗑 Borrar toda la base</button>
            </div>
          </Transition>
        </div>
      </div>

      <p v-if="!store.puedeAleatorizar && !store.campeon" class="ayuda" style="margin-top: 10px">
        🔒 Ya se registraron puntos, así que el cuadro no se puede volver a sortear.
        Si necesitás sortear otra vez, usá <strong>Reiniciar torneo</strong>.
      </p>

      <Transition name="zoom">
        <div v-if="verParticipantes" style="margin-top: 14px" class="fila">
          <span v-for="p in store.participantes" :key="p.id" class="chip">
            <b style="color: var(--texto-3)">{{ p.semilla }}</b> {{ p.nombre }}
          </span>
        </div>
      </Transition>
    </div>

    <!-- Cuadro -->
    <div class="tarjeta">
      <div class="fila centrada" style="justify-content: space-between; margin-bottom: 12px">
        <h2 style="font-size: 1.02rem">Cuadro de eliminación directa</h2>
        <div class="leyenda">
          <span><i style="background: var(--verde)" />Listo</span>
          <span><i style="background: var(--naranja)" />En juego</span>
          <span><i style="background: var(--borde)" />A definir</span>
        </div>
      </div>

      <div class="cuadro-scroll">
        <div class="cuadro" :key="store.semillaMezcla">
          <div v-for="ronda in store.rondas" :key="ronda.ronda" class="ronda">
            <div class="cabecera">{{ ronda.nombre }}</div>
            <div class="partidos">
              <div
                v-for="(p, i) in ronda.partidos" :key="p.id"
                class="partido"
                :class="estadoPartido(p).clase"
                :style="{ animationDelay: (ronda.ronda - 1) * 70 + i * 40 + 'ms' }">
                <div class="cinta">
                  <span>Partido {{ p.orden + 1 }}</span>
                  <span>{{ estadoPartido(p).texto }}</span>
                </div>

                <div class="lado uno" :class="{ ganador: p.ganador_id && p.ganador_id === p.p1_id, libre: !p.p1_id }">
                  <span class="marca-j" />
                  <span class="nombre">{{ store.nombreDe(p.p1_id) ?? 'A definir' }}</span>
                  <span class="juegos">{{ p.p1_id ? p.juegos_p1 : '–' }}</span>
                </div>
                <div class="lado dos" :class="{ ganador: p.ganador_id && p.ganador_id === p.p2_id, libre: !p.p2_id }">
                  <span class="marca-j" />
                  <span class="nombre">{{ store.nombreDe(p.p2_id) ?? (p.estado === 'bye' ? 'Pase libre' : 'A definir') }}</span>
                  <span class="juegos">{{ p.p2_id ? p.juegos_p2 : '–' }}</span>
                </div>

                <div v-if="store.partidoJugable(p)" class="acciones">
                  <button
                    v-if="!p.ganador_id"
                    class="btn chico"
                    :class="p.estado === 'en_curso' ? 'primario' : 'exito'"
                    style="flex: 1"
                    @click="store.iniciarPartido(p.id)">
                    {{ p.estado === 'en_curso' ? '▶ Continuar' : '▶ Iniciar partido' }}
                  </button>
                  <button v-else class="btn chico fantasma" style="flex: 1" @click="store.iniciarPartido(p.id)">
                    👁 Ver detalle
                  </button>
                  <div class="envoltorio-menu">
                    <button class="btn chico" @click="alternarMenu(p.id)" aria-label="Más opciones">⋯</button>
                    <Transition name="zoom">
                      <div v-if="menuPartido === p.id" class="menu-flotante">
                        <button @click="abrirManual(p)">✏️ Cargar resultado a mano</button>
                        <button class="peligroso" @click="pedirReinicioPartido(p)">↺ Reiniciar partido</button>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p class="ayuda">Desplazá de lado para ver las rondas siguientes.</p>
    </div>

    <!-- Resultado manual -->
    <Modal v-if="manual" :titulo="'Resultado a mano'" @cerrar="manual = null">
      <p>
        Cargá los juegos ganados por cada uno. El ganador debe tener exactamente
        <strong>{{ store.totalParaGanar }}</strong> juego(s).
      </p>
      <div class="marcador-manual">
        <div>
          <label :style="{ color: 'var(--j1)' }">{{ store.nombreDe(manual.partido.p1_id) }}</label>
          <input v-model.number="manual.g1" type="number" min="0" :max="store.totalParaGanar" class="entrada num" />
        </div>
        <span class="vs">–</span>
        <div>
          <label :style="{ color: 'var(--j2)' }">{{ store.nombreDe(manual.partido.p2_id) }}</label>
          <input v-model.number="manual.g2" type="number" min="0" :max="store.totalParaGanar" class="entrada num" />
        </div>
      </div>
      <template #pie>
        <button class="btn fantasma" @click="manual = null">Cancelar</button>
        <button class="btn primario" @click="guardarManual">Guardar resultado</button>
      </template>
    </Modal>

    <!-- Confirmaciones -->
    <Modal v-if="textoConfirmacion" :titulo="textoConfirmacion.titulo" @cerrar="confirmando = null">
      <p>{{ textoConfirmacion.cuerpo }}</p>
      <template #pie>
        <button class="btn fantasma" @click="confirmando = null">Cancelar</button>
        <button class="btn peligro" @click="confirmar">{{ textoConfirmacion.boton }}</button>
      </template>
    </Modal>
  </div>
</template>
