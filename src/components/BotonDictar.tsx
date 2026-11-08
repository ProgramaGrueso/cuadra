import { Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useEnLinea } from '../lib/offline'
import { ErrorEscucha, escucharFrase, PISTA_TECLADO, reconocedor } from '../lib/voz'

// El dictado del navegador necesita red. Si no esta disponible no se muestra el boton:
// siempre queda el teclado, que en casi todos los telefonos trae su propio microfono.
export function BotonDictar({ alDictar }: { alDictar: (texto: string) => void }) {
  const enLinea = useEnLinea()
  const [escuchando, setEscuchando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const activo = useRef<ReturnType<typeof escucharFrase> | null>(null)

  useEffect(() => () => activo.current?.abort(), [])

  if (!reconocedor() || !enLinea) return null

  function dictar() {
    if (escuchando) {
      activo.current?.abort()
      return
    }
    setAviso(null)
    const e = escucharFrase()
    activo.current = e
    setEscuchando(true)
    e.promesa
      .then(alDictar)
      .catch((error: Error) => {
        if (!error.message) return
        setAviso(error instanceof ErrorEscucha && error.pista ? `${error.message} ${PISTA_TECLADO}` : error.message)
      })
      .finally(() => setEscuchando(false))
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
        <Mic aria-hidden size={22} /> {escuchando ? 'Le escucho… toque para parar' : 'Dictar con mi voz'}
      </button>
      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}
    </div>
  )
}
