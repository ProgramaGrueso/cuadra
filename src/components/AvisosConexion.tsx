import { Clock, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EVENTO_RECHAZO, sincronizar, useCola, useEnLinea, type TipoEnvio } from '../lib/offline'

export function BannerConexion() {
  const enLinea = useEnLinea()
  const cola = useCola()
  const [rechazado, setRechazado] = useState<string | null>(null)
  const hayPendientes = cola.length > 0

  useEffect(() => {
    if (!enLinea) return
    void sincronizar()
    if (!hayPendientes) return
    const intervalo = setInterval(() => void sincronizar(), 30000)
    return () => clearInterval(intervalo)
  }, [enLinea, hayPendientes])

  useEffect(() => {
    const alRechazar = (e: Event) => setRechazado((e as CustomEvent<string>).detail)
    window.addEventListener(EVENTO_RECHAZO, alRechazar)
    return () => window.removeEventListener(EVENTO_RECHAZO, alRechazar)
  }, [])

  const pendientes = `${cola.length} ${cola.length === 1 ? 'publicación pendiente' : 'publicaciones pendientes'}`
  return (
    <>
      {!enLinea && (
        <p role="status" className="flex items-center gap-2 bg-texto px-4 py-2 font-bold text-fondo">
          <WifiOff aria-hidden size={22} className="shrink-0" />
          <span>Sin conexión. Ves los últimos datos guardados{hayPendientes && ` y tienes ${pendientes}`}.</span>
        </p>
      )}
      {enLinea && hayPendientes && (
        <p role="status" className="flex items-center gap-2 bg-sello-suave px-4 py-2 font-bold text-sello">
          <Clock aria-hidden size={22} className="shrink-0" /> Enviando {pendientes}…
        </p>
      )}
      {rechazado && (
        <div role="alert" className="flex items-center gap-2 bg-superficie px-4 py-2 font-bold text-peligro">
          <span className="min-w-0 flex-1">No se pudo publicar: {rechazado}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setRechazado(null)} className="flex h-12 w-12 shrink-0 items-center justify-center">
            <X aria-hidden size={24} />
          </button>
        </div>
      )}
    </>
  )
}

/** Lo publicado sin red se ve de inmediato, marcado hasta que llegue al servidor. */
export function PendientesDeEnvio({ tipos }: { tipos: TipoEnvio[] }) {
  const pendientes = useCola().filter((e) => tipos.includes(e.tipo))
  if (pendientes.length === 0) return null
  return (
    <ul className="flex flex-col gap-3">
      {pendientes.map((e) => (
        <li key={e.id} className="flex flex-col gap-1 rounded-xl border-2 border-dashed border-sello bg-superficie p-3">
          <p className="flex items-center gap-2 font-bold text-sello">
            <Clock aria-hidden size={20} /> Pendiente de enviar
          </p>
          <p>{e.resumen}</p>
        </li>
      ))}
    </ul>
  )
}
