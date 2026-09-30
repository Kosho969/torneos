import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Menú desplegable que se cierra al hacer clic fuera o al apretar Escape.
 * Devuelve `abierto` (id del menú abierto o null) y utilidades para manejarlo.
 */
export function usarMenu () {
  const abierto = ref(null)

  const alternar = (id) => { abierto.value = abierto.value === id ? null : id }
  const cerrar = () => { abierto.value = null }

  function alClic (e) {
    if (abierto.value !== null && !e.target.closest('.envoltorio-menu')) cerrar()
  }
  function alTeclado (e) {
    if (e.key === 'Escape' && abierto.value !== null) {
      cerrar()
      e.stopPropagation() // que Escape no cierre además la pantalla de atrás
    }
  }

  onMounted(() => {
    document.addEventListener('click', alClic, true)
    document.addEventListener('keydown', alTeclado)
  })
  onUnmounted(() => {
    document.removeEventListener('click', alClic, true)
    document.removeEventListener('keydown', alTeclado)
  })

  return { abierto, alternar, cerrar }
}
