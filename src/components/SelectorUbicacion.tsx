import { LocateFixed, MapPin } from 'lucide-react'
import { useState } from 'react'
import { obtenerUbicacion, zonaDe } from '../lib/ubicacion'
import type { Zona } from '../lib/types'

export interface UbicacionElegida {
  lat: number
  lng: number
  zona_id: number
  nombreZona: string
}

interface Props {
  zonas: Zona[]
  onElegir: (ubicacion: UbicacionElegida) => void
}

export function SelectorUbicacion({ zonas, onElegir }: Props) {
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const zonaPiloto = zonas[0]

  async function usarGps() {
    setBuscando(true)
    setAviso(null)
    try {
      const punto = await obtenerUbicacion()
      const zona = zonaDe(punto, zonas)
      if (zona) {
        onElegir({ ...punto, zona_id: zona.id, nombreZona: zona.nombre })
      } else {
        setAviso(`Por ahora Cuadra solo funciona en ${zonaPiloto?.nombre ?? 'la zona piloto'} y estás fuera de la zona.`)
      }
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No pudimos encontrar tu ubicación.')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={usarGps}
        disabled={buscando}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-marca bg-superficie px-4 py-2 font-bold text-marca disabled:opacity-60"
      >
        <LocateFixed aria-hidden size={22} />
        {buscando ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
      </button>
      {aviso && (
        <p role="alert" className="text-suave">
          {aviso}
        </p>
      )}
      {aviso && zonaPiloto && (
        <button
          type="button"
          onClick={() =>
            onElegir({ lat: zonaPiloto.lat, lng: zonaPiloto.lng, zona_id: zonaPiloto.id, nombreZona: zonaPiloto.nombre })
          }
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-marca-suave px-4 py-2 font-bold text-texto"
        >
          <MapPin aria-hidden size={22} />
          Usar el centro de {zonaPiloto.nombre}
        </button>
      )}
    </div>
  )
}
