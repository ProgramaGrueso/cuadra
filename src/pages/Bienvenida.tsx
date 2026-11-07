import { BadgeCheck, MapPin, Siren, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

const PANTALLAS: { titulo: string; texto: string; Icono: LucideIcon }[] = [
  {
    titulo: 'Tus vecinos, a pocas cuadras',
    texto: 'Encuentra gasfiteros, electricistas y más cerca de tu casa. Pide o ofrece favores sin dinero de por medio.',
    Icono: MapPin,
  },
  {
    titulo: 'El Visto Bueno',
    texto: 'Cada Visto Bueno es un vecino que recomienda a alguien que ya conoce. Los más recomendados salen primero.',
    Icono: BadgeCheck,
  },
  {
    titulo: 'Si hay una emergencia',
    texto: 'La app se pone roja en toda tu zona. Avisa que estás bien, reporta a quien necesite ayuda y comparte agua o víveres. Sin señal, lo que publiques se envía cuando vuelva.',
    Icono: Siren,
  },
]

export function Bienvenida({ alTerminar }: { alTerminar: () => void }) {
  const [indice, setIndice] = useState(0)
  const { titulo, texto, Icono } = PANTALLAS[indice]
  const ultima = indice === PANTALLAS.length - 1

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <div className="flex min-h-12 items-center justify-between">
        <p className="text-suave">
          {indice + 1} de {PANTALLAS.length}
        </p>
        {!ultima && (
          <button type="button" onClick={alTerminar} className="min-h-12 px-2 font-bold text-suave underline">
            Saltar
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        {indice === 0 ? (
          <img src="/icon.svg" alt="Logo de Cuadra" className="h-32 w-32 rounded-3xl shadow-lg" />
        ) : (
          <span className="flex h-28 w-28 items-center justify-center rounded-full bg-marca-suave text-marca">
            <Icono aria-hidden size={60} />
          </span>
        )}
        <h1 className="text-3xl font-bold">{titulo}</h1>
        <p className="text-lg">{texto}</p>
      </div>
      <button
        type="button"
        onClick={() => (ultima ? alTerminar() : setIndice(indice + 1))}
        className="min-h-14 rounded-xl bg-marca px-4 text-lg font-bold text-sobre-marca"
      >
        {ultima ? 'Empezar' : 'Siguiente'}
      </button>
    </main>
  )
}
