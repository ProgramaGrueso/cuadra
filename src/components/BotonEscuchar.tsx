import { Square, Volume2 } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { leer, parar, textoDePantalla, useEscucharActivo, useHablando } from '../lib/voz'

// Boton flotante para quien lee con dificultad: lee en voz alta lo que hay en pantalla.
export function BotonEscuchar() {
  const activo = useEscucharActivo()
  const hablando = useHablando()
  const { pathname } = useLocation()

  // Al cambiar de pantalla se calla: no debe seguir leyendo lo anterior.
  useEffect(() => parar, [pathname])

  if (!activo) return null

  function alternar() {
    if (hablando) return parar()
    const main = document.querySelector('main')
    const avisos = document.querySelector('[data-avisos]')
    const texto = [avisos ? textoDePantalla(avisos) : '', main ? textoDePantalla(main) : ''].filter(Boolean).join(' ')
    leer(texto || 'No hay texto en esta pantalla.')
  }

  return (
    <div data-no-leer className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[1000] mx-auto flex max-w-md px-4">
      <button
        type="button"
        onClick={alternar}
        aria-pressed={hablando}
        className={`pointer-events-auto flex min-h-14 items-center gap-2 rounded-full border-2 border-marca px-4 font-bold shadow-lg ${
          hablando ? 'bg-marca text-sobre-marca' : 'bg-superficie text-marca'
        }`}
      >
        {hablando ? <Square aria-hidden size={22} /> : <Volume2 aria-hidden size={24} />}
        {hablando ? 'Parar' : 'Escuchar'}
      </button>
    </div>
  )
}
