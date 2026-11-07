import { Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { leerGrupos, leerNumeros } from '../lib/datos'
import type { GrupoApoyo, NumeroEmergencia } from '../lib/types'

const claseLlamada = 'flex min-h-12 items-center gap-2 rounded-xl border-2 border-marca bg-superficie px-3 font-bold text-marca'

export function DirectorioEmergencia() {
  const [numeros, setNumeros] = useState<NumeroEmergencia[]>([])
  const [grupos, setGrupos] = useState<GrupoApoyo[]>([])

  useEffect(() => {
    void leerNumeros().then(({ data }) => setNumeros(data ?? []))
    void leerGrupos().then(({ data }) => setGrupos(data ?? []))
  }, [])

  return (
    <section className="flex flex-col gap-3">
      {numeros.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {numeros.map((n) => (
            <a key={n.id} href={`tel:${n.numero}`} className={claseLlamada}>
              <Phone aria-hidden size={20} className="shrink-0" />
              <span className="min-w-0 leading-tight">
                {n.numero}
                <span className="block text-sm font-normal text-texto">{n.nombre}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      {grupos.length > 0 && (
        <details className="rounded-xl border border-borde bg-superficie p-3">
          <summary className="min-h-8 cursor-pointer font-bold">Grupos de apoyo de la zona ({grupos.length})</summary>
          <ul className="mt-2 flex flex-col gap-3">
            {grupos.map((g) => (
              <li key={g.id}>
                <p className="font-bold">{g.nombre}</p>
                {g.direccion && <p className="text-suave">{g.direccion}</p>}
                {g.telefono ? (
                  <a href={`tel:${g.telefono}`} className="mt-1 inline-flex min-h-12 items-center gap-2 font-bold text-marca">
                    <Phone aria-hidden size={20} /> {g.telefono}
                  </a>
                ) : (
                  <p className="text-suave">Sin teléfono registrado</p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
