import { ArrowLeft } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconoOficio } from '../components/Iconos'
import { usePerfil } from '../lib/sesion'
import { supabase } from '../lib/supabase'
import type { Oficio } from '../lib/types'
import { normalizarTelefono } from '../lib/ubicacion'

export function OfrezcoOficio() {
  const { perfil, centro, guardarPerfil } = usePerfil()
  const navegar = useNavigate()
  const [paso, setPaso] = useState(1)
  const [oficios, setOficios] = useState<Oficio[]>([])
  const [oficio, setOficio] = useState<Oficio | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [tarifa, setTarifa] = useState('')
  const [emergencias, setEmergencias] = useState(false)
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('oficios')
      .select('id, nombre, icono, es_critico_emergencia')
      .order('nombre')
      .returns<Oficio[]>()
      .then(({ data, error }) => {
        if (error) setAviso('No pudimos cargar los oficios. Revisa tu conexión.')
        else setOficios(data ?? [])
      })
  }, [])

  async function publicar(evento: FormEvent) {
    evento.preventDefault()
    if (!oficio) return
    const numero = normalizarTelefono(telefono)
    if (!perfil.telefono && !(numero && /^[0-9]{9,15}$/.test(numero))) {
      setAviso('Déjanos tu WhatsApp para que los vecinos puedan contactarte.')
      return
    }
    setEnviando(true)
    setAviso(null)
    try {
      if (!perfil.telefono) await guardarPerfil({ telefono: numero })
      const { data, error } = await supabase
        .from('prestadores')
        .insert({
          user_id: perfil.id,
          oficio_id: oficio.id,
          descripcion: descripcion.trim(),
          tarifa_ref: tarifa.trim() || null,
          disponible_emergencia: emergencias,
          lat: centro.lat,
          lng: centro.lng,
          zona_id: perfil.zona_id,
        })
        .select('id')
        .single<{ id: string }>()
      if (error) throw error
      navegar(`/prestador/${data.id}`, { replace: true })
    } catch (error) {
      setAviso(
        (error as { code?: string }).code === '23505'
          ? `Ya ofreces ${oficio.nombre.toLowerCase()}.`
          : 'No pudimos publicar tu oficio. Revisa tu conexión.',
      )
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={publicar} className="flex flex-col gap-4 px-4 pt-2">
      {paso === 1 ? (
        <Link to="/" className="flex min-h-12 items-center gap-2 font-bold text-marca">
          <ArrowLeft aria-hidden size={22} /> Cancelar
        </Link>
      ) : (
        <button type="button" onClick={() => setPaso(paso - 1)} className="flex min-h-12 items-center gap-2 font-bold text-marca">
          <ArrowLeft aria-hidden size={22} /> Atrás
        </button>
      )}

      <div>
        <h1 className="text-2xl font-bold">Ofrezco mi oficio</h1>
        <p className="text-suave">Paso {paso} de 3</p>
      </div>

      {paso === 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">¿A qué te dedicas?</legend>
          <div className="grid grid-cols-2 gap-2">
            {oficios.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setOficio(o)
                  setPaso(2)
                }}
                className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-borde bg-superficie p-2 text-center font-bold"
              >
                <IconoOficio icono={o.icono} size={26} />
                {o.nombre}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {paso === 2 && (
        <>
          <label className="flex flex-col gap-1 font-bold">
            ¿Qué haces en {oficio?.nombre.toLowerCase()}?
            <textarea
              required
              minLength={3}
              maxLength={500}
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="rounded-xl border-2 border-borde bg-superficie p-2 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            Precio de referencia (opcional)
            <input
              maxLength={80}
              value={tarifa}
              placeholder="Desde S/ 40 la visita"
              onChange={(e) => setTarifa(e.target.value)}
              className="min-h-12 rounded-xl border-2 border-borde bg-superficie px-3 font-normal"
            />
          </label>
          <button
            type="button"
            disabled={descripcion.trim().length < 3}
            onClick={() => setPaso(3)}
            className="min-h-12 rounded-xl bg-marca px-4 font-bold text-sobre-marca disabled:opacity-60"
          >
            Siguiente
          </button>
        </>
      )}

      {paso === 3 && (
        <>
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-borde bg-superficie px-3 py-2 font-bold">
            Puedo ayudar en emergencias
            <input
              type="checkbox"
              checked={emergencias}
              onChange={(e) => setEmergencias(e.target.checked)}
              className="h-7 w-7 shrink-0 accent-[var(--marca)]"
            />
          </label>
          {!perfil.telefono && (
            <label className="flex flex-col gap-1 font-bold">
              Tu WhatsApp
              <input
                required
                type="tel"
                inputMode="tel"
                value={telefono}
                placeholder="987 654 321"
                onChange={(e) => setTelefono(e.target.value)}
                className="min-h-12 rounded-xl border-2 border-borde bg-superficie px-3 font-normal"
              />
              <span className="font-normal text-suave">Los vecinos lo usarán para contactarte.</span>
            </label>
          )}
          <button type="submit" disabled={enviando} className="min-h-12 rounded-xl bg-marca px-4 font-bold text-sobre-marca disabled:opacity-60">
            {enviando ? 'Publicando…' : 'Publicar mi oficio'}
          </button>
        </>
      )}

      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}
    </form>
  )
}
