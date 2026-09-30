<script setup>
import { ref, onMounted } from 'vue'

const piezas = ref([])
const COLORES = ['#ff7a29', '#ffd23f', '#2fd67a', '#45a8ff', '#ff5470', '#ffffff']

onMounted(() => {
  piezas.value = Array.from({ length: 90 }, () => ({
    izq: Math.random() * 100,
    color: COLORES[Math.floor(Math.random() * COLORES.length)],
    duracion: 2.4 + Math.random() * 2.4,
    retraso: Math.random() * 1.4,
    escala: 0.6 + Math.random() * 0.9,
  }))
})
</script>

<template>
  <div class="confeti" aria-hidden="true">
    <i
      v-for="(p, i) in piezas" :key="i"
      :style="{
        left: p.izq + '%',
        background: p.color,
        animationDuration: p.duracion + 's',
        animationDelay: p.retraso + 's',
        transform: 'scale(' + p.escala + ')',
      }" />
  </div>
</template>
