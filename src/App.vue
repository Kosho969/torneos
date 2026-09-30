<script setup>
import { onMounted, computed } from 'vue'
import { useTorneo } from './stores/torneo.js'
import VistaInicio from './components/VistaInicio.vue'
import VistaCuadro from './components/VistaCuadro.vue'
import VistaPartido from './components/VistaPartido.vue'
import Confeti from './components/Confeti.vue'
import Modal from './components/Modal.vue'

const store = useTorneo()
onMounted(() => store.iniciar())

const subtitulo = computed(() => {
  if (!store.torneo) return 'Gestor de torneos'
  return `${store.participantes.length} participantes · ${store.progreso.hechos}/${store.progreso.total} partidos`
})
</script>

<template>
  <div class="app">
    <!-- Carga -->
    <Transition name="v-fade">
      <div v-if="!store.listo" class="velo" style="z-index: 120">
        <div style="text-align: center">
          <div class="pelota" style="width: 54px; height: 54px; margin: 0 auto 16px" />
          <p style="font-weight: 800">Abriendo la base de datos…</p>
        </div>
      </div>
    </Transition>

    <template v-if="store.listo">
      <header class="barra">
        <div class="marca">
          <span class="pelota" />
          <div style="min-width: 0">
            <h1>{{ store.torneo?.nombre ?? 'Torneo de Ping Pong' }}</h1>
            <div class="sub">{{ subtitulo }}</div>
          </div>
        </div>
        <span class="crece" />
        <span v-if="store.torneo" class="chip">SQLite local</span>
      </header>

      <main class="principal">
        <Transition name="vista" mode="out-in">
          <VistaInicio v-if="store.vista === 'inicio'" key="inicio" />
          <VistaCuadro v-else key="cuadro" />
        </Transition>
      </main>

      <!-- Pantalla de partido en vivo -->
      <Transition name="zoom">
        <VistaPartido v-if="store.vista === 'partido'" />
      </Transition>

      <!-- Campeón -->
      <Transition name="zoom">
        <Modal v-if="store.mostrarCampeon && store.campeon" @cerrar="store.mostrarCampeon = false">
          <div class="campeon">
            <div class="copa">🏆</div>
            <p class="ayuda" style="font-weight: 900; letter-spacing: .14em; text-transform: uppercase">Campeón</p>
            <h2 class="nombre-campeon">{{ store.campeon.nombre }}</h2>
            <p class="cuerpo">¡Se terminó {{ store.torneo.nombre }}!</p>
          </div>
          <template #pie>
            <button class="btn fantasma" @click="store.mostrarCampeon = false">Ver el cuadro</button>
            <button class="btn primario" @click="store.mostrarCampeon = false; store.nuevoTorneo()">Torneo nuevo</button>
          </template>
        </Modal>
      </Transition>
      <Confeti v-if="store.mostrarCampeon && store.campeon" />

      <!-- Avisos -->
      <Transition name="zoom">
        <div v-if="store.aviso" class="toast" :class="store.aviso.tipo">{{ store.aviso.texto }}</div>
      </Transition>
    </template>
  </div>
</template>
