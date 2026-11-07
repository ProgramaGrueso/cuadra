import { Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useEnLinea } from '../lib/offline'

interface Reconocimiento {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}

type Constructor = new () => Reconocimiento

const Api = () => {
  const w = window as unknown as { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

// El dictado del navegador necesita red. Si no esta disponible no se muestra el boton:
// siempre queda el texto sugerido y el teclado.
export function BotonDictar({ alDictar }: { alDictar: (texto: string) => void }) {
  const enLinea = useEnLinea()
  const [escuchando, setEscuchando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const activo = useRef<Reconocimiento | null>(null)

  useEffect(() => () => activo.current?.abort(), [])

  const Reconocedor = Api()
  if (!Reconocedor || !enLinea) return null

  function dictar() {
    if (escuchando) {
      activo.current?.abort()
      return
    }
    const r = new Reconocedor!()
    r.lang = 'es-PE'
    r.interimResults = false
    r.onresult = (e) => {
      const texto = e.results[0]?.[0]?.transcript?.trim()
      if (texto) alDictar(texto)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setAviso('Permite el micrófono para dictar.')
      else if (e.error === 'no-speech') setAviso('No te escuchamos. Inténtalo otra vez.')
      else if (e.error !== 'aborted') setAviso('No pudimos usar el dictado. Puedes escribirlo.')
    }
    r.onend = () => setEscuchando(false)
    activo.current = r
    setAviso(null)
    setEscuchando(true)
    try {
      r.start()
    } catch {
      setEscuchando(false)
      setAviso('No pudimos usar el dictado. Puedes escribirlo.')
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-pressed={escuchando}
        onClick={dictar}
        className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-marca px-4 font-bold ${
          escuchando ? 'bg-marca text-sobre-marca' : 'bg-superficie text-marca'
        }`}
      >
        <Mic aria-hidden size={22} /> {escuchando ? 'Te escucho… toca para parar' : 'Dictar con mi voz'}
      </button>
      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}
    </div>
  )
}
