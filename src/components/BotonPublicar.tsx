import { Droplets, HandHeart, Hammer, HandHelping, PackageOpen, Plus, UserRoundSearch, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEmergencia } from '../lib/emergencia'
import { marcarVisto, yaVisto } from '../lib/preferencias'

const DIA_A_DIA: { ruta: string; texto: string; ayuda: string; Icono: LucideIcon }[] = [
  { ruta: '/publicar/pido', texto: 'Pido un favor', ayuda: 'Algo prestado o una mano', Icono: HandHelping },
  { ruta: '/publicar/ofrezco', texto: 'Ofrezco un favor', ayuda: 'Sin dinero de por medio', Icono: HandHeart },
  { ruta: '/ofrezco-oficio', texto: 'Ofrezco mi oficio', ayuda: 'Aparece en Servicios', Icono: Hammer },
]

const EMERGENCIA: typeof DIA_A_DIA = [
  { ruta: '/reportar', texto: 'Reportar a un vecino', ayuda: 'Alguien vulnerable necesita ayuda', Icono: UserRoundSearch },
  { ruta: '/recurso/tengo', texto: 'Tengo un recurso', ayuda: 'Agua, víveres, medicina…', Icono: PackageOpen },
  { ruta: '/recurso/necesito', texto: 'Necesito un recurso', ayuda: 'Te avisamos si alguien cerca lo tiene', Icono: Droplets },
]

export function BotonPublicar() {
  const opciones = useEmergencia() ? EMERGENCIA : DIA_A_DIA
  const [abierto, setAbierto] = useState(false)
  const [pista, setPista] = useState(() => !yaVisto('pista-publicar'))

  useEffect(() => {
    if (!abierto) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [abierto])

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[1000] mx-auto flex max-w-md items-center justify-end gap-2 px-4">
        {pista && <p className="rounded-xl bg-texto px-3 py-2 font-bold text-fondo">Publica en 3 toques</p>}
        <button
          type="button"
          aria-label="Publicar"
          onClick={() => {
            setAbierto(true)
            setPista(false)
            marcarVisto('pista-publicar')
          }}
          className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-marca text-sobre-marca shadow-lg"
        >
          <Plus aria-hidden size={34} />
        </button>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50" onClick={() => setAbierto(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="¿Qué quieres publicar?"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-2 rounded-t-2xl bg-fondo p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">¿Qué quieres publicar?</h2>
              <button
                type="button"
                autoFocus
                aria-label="Cerrar"
                onClick={() => setAbierto(false)}
                className="flex h-12 w-12 items-center justify-center rounded-full"
              >
                <X aria-hidden size={26} />
              </button>
            </div>
            {opciones.map(({ ruta, texto, ayuda, Icono }) => (
              <Link
                key={ruta}
                to={ruta}
                onClick={() => setAbierto(false)}
                className="flex min-h-16 items-center gap-3 rounded-xl border-2 border-borde bg-superficie p-3"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-marca-suave text-marca">
                  <Icono aria-hidden size={26} />
                </span>
                <span>
                  <span className="block font-bold">{texto}</span>
                  <span className="block text-suave">{ayuda}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
