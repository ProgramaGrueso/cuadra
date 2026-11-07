import { CheckCircle2, PackageOpen, Siren, UserRoundSearch } from 'lucide-react'
import { useState } from 'react'
import { useEmergencia } from '../lib/emergencia'
import { marcarVisto, yaVisto } from '../lib/preferencias'

const PASOS = [
  { texto: 'Avisa que estás bien con un solo botón en Ayuda.', Icono: CheckCircle2 },
  { texto: 'Con el botón +, reporta a un vecino que necesite ayuda.', Icono: UserRoundSearch },
  { texto: 'Publica lo que tienes o necesitas. Te avisamos si alguien cerca coincide.', Icono: PackageOpen },
]

export function TutorialEmergencia() {
  const emergencia = useEmergencia()
  const [visto, setVisto] = useState(() => yaVisto('tutorial-emergencia'))
  if (!emergencia || visto) return null

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/50">
      <div role="dialog" aria-modal="true" aria-label="Qué hacer en una emergencia" className="flex w-full max-w-md flex-col gap-3 rounded-t-2xl bg-fondo p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <h2 className="flex items-center gap-2 text-xl font-bold text-peligro">
          <Siren aria-hidden size={26} /> Qué hacer ahora
        </h2>
        <ul className="flex flex-col gap-3">
          {PASOS.map(({ texto, Icono }) => (
            <li key={texto} className="flex items-start gap-3">
              <Icono aria-hidden size={26} className="shrink-0 text-marca" />
              {texto}
            </li>
          ))}
        </ul>
        <button
          type="button"
          autoFocus
          onClick={() => {
            marcarVisto('tutorial-emergencia')
            setVisto(true)
          }}
          className="min-h-14 rounded-xl bg-marca px-4 text-lg font-bold text-sobre-marca"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
