import { Siren } from 'lucide-react'
import { useState } from 'react'
import { useEmergencia } from '../lib/emergencia'
import { usePerfil } from '../lib/sesion'
import { supabase } from '../lib/supabase'

export function InterruptorEmergencia() {
  const { perfil } = usePerfil()
  const emergencia = useEmergencia()
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  if (!perfil.verificado || perfil.zona_id === null) return null

  async function cambiar() {
    setEnviando(true)
    setAviso(null)
    const { error } = emergencia
      ? await supabase.rpc('desactivar_emergencia', { p_emergencia_id: emergencia.id })
      : await supabase.rpc('activar_emergencia', { p_zona_id: perfil.zona_id })
    if (error) setAviso('No pudimos cambiar el modo. Revisa tu conexión.')
    setConfirmando(false)
    setEnviando(false)
  }

  const accion = emergencia ? 'Terminar la emergencia' : 'Activar modo emergencia'
  return (
    <section className="flex flex-col gap-2 rounded-xl border-2 border-peligro bg-superficie p-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-peligro">
        <Siren aria-hidden size={24} /> Modo emergencia
      </h2>
      <p className="text-suave">Cambia la app de todos los vecinos de tu zona al instante.</p>
      {confirmando ? (
        <div className="flex flex-col gap-2">
          <p className="font-bold">¿Seguro? Todos los vecinos de tu zona lo verán.</p>
          <button type="button" disabled={enviando} onClick={() => void cambiar()} className="min-h-12 rounded-xl bg-peligro px-4 font-bold text-white disabled:opacity-60">
            Sí, {accion.toLowerCase()}
          </button>
          <button type="button" disabled={enviando} onClick={() => setConfirmando(false)} className="min-h-12 font-bold text-suave underline">
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmando(true)} className="min-h-12 rounded-xl bg-peligro px-4 font-bold text-white">
          {accion}
        </button>
      )}
      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}
    </section>
  )
}
