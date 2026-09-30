<script setup>
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({ titulo: String, cerrable: { type: Boolean, default: true } })
const emit = defineEmits(['cerrar'])

function alTeclado (e) {
  if (e.key === 'Escape' && props.cerrable) emit('cerrar')
}
onMounted(() => window.addEventListener('keydown', alTeclado))
onUnmounted(() => window.removeEventListener('keydown', alTeclado))
</script>

<template>
  <Teleport to="body">
    <div class="velo" @click.self="cerrable && emit('cerrar')">
      <div class="modal animar-entrada" role="dialog" aria-modal="true">
        <h3 v-if="titulo">{{ titulo }}</h3>
        <div class="cuerpo"><slot /></div>
        <div class="pie"><slot name="pie" /></div>
      </div>
    </div>
  </Teleport>
</template>
