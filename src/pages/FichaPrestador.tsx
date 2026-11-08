import { ArrowLeft, BadgeCheck, Siren, ThumbsUp } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BotonWhatsApp } from '../components/BotonWhatsApp'
import { IconoOficio } from '../components/Iconos'
import { conCache } from '../lib/offline'
import { usePerfil } from '../lib/sesion'
import { supabase } from '../lib/supabase'
import type { ComentarioVisto, Ficha } from '../lib/types'
import { formatearDistancia } from '../lib/ubicacion'

type Carga =
  | { fase: 'cargando' }
  | { fase: 'error' }
  | { fase: 'no-existe' }
  | { fase: 'listo'; ficha: Ficha; comentarios: ComentarioVisto[]; telefono: string | null }

export function FichaPrestador() {
  const { id = '' } = useParams()
  const { perfil, centro } = usePerfil()
  const [carga, setCarga] = useState<Carga>({ fase: 'cargando' })
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const r = await conCache<{ ficha: Ficha | null; comentarios: ComentarioVisto[]; telefono: string | null }>(`ficha:${id}`, async () => {
      const [ficha, comentarios, telefono] = await Promise.all([
        supabase.rpc('ficha_prestador', { p_id: id, p_lat: centro.lat, p_lng: centro.lng }).maybeSingle<Ficha>(),
        supabase.rpc('comentarios_prestador', { p_id: id }),
        supabase.rpc('contacto_prestador', { p_prestador_id: id }),
      ])
      return {
        data: { ficha: ficha.data, comentarios: comentarios.data ?? [], telefono: telefono.data ?? null },
        error: ficha.error ?? comentarios.error,
        status: ficha.error ? ficha.status : comentarios.status,
      }
    })
    if (r.error || !r.data) {
      setCarga({ fase: 'error' })
    } else if (!r.data.ficha) {
      setCarga({ fase: 'no-existe' })
    } else {
      setCarga({ fase: 'listo', ficha: r.data.ficha, comentarios: r.data.comentarios, telefono: r.data.telefono })
    }
  }, [id, centro.lat, centro.lng])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function darVistoBueno(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setAviso(null)
    const { error } = await supabase
      .from('vistos_buenos')
      .insert({ prestador_id: id, vecino_id: perfil.id, comentario: comentario.trim() || null })
    if (error) {
      setAviso(error.code === 'P0001' ? error.message : 'No pudimos guardar tu Visto Bueno. Revisa tu conexión.')
    } else {
      setComentario('')
      await cargar()
    }
    setEnviando(false)
  }

  async function quitarVistoBueno() {
    setEnviando(true)
    setAviso(null)
    const { error } = await supabase.from('vistos_buenos').delete().eq('prestador_id', id).eq('vecino_id', perfil.id)
    if (error) setAviso('No pudimos quitar tu Visto Bueno. Revisa tu conexión.')
    else await cargar()
    setEnviando(false)
  }

  const volver = (
    <Link to="/" className="flex min-h-12 items-center gap-2 font-bold text-marca">
      <ArrowLeft aria-hidden size={22} /> Volver a Servicios
    </Link>
  )

  if (carga.fase === 'cargando') {
    return (
      <p role="status" className="px-4 py-8 text-center text-suave">
        Cargando la ficha…
      </p>
    )
  }
  if (carga.fase !== 'listo') {
    return (
      <div className="flex flex-col gap-3 px-4 pt-4">
        {volver}
        <p role="alert">
          {carga.fase === 'no-existe' ? 'Este vecino ya no ofrece este servicio.' : 'No pudimos cargar la ficha. Revisa tu conexión.'}
        </p>
      </div>
    )
  }

  const { ficha, comentarios, telefono } = carga
  return (
    <div className="flex flex-col gap-4 px-4 pt-2">
      {volver}

      <header className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-marca-suave text-marca">
          <IconoOficio icono={ficha.icono} size={30} />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-bold">{ficha.nombre}</h1>
          <p className="text-suave">
            {ficha.oficio} · a {formatearDistancia(ficha.distancia_m)}
          </p>
        </div>
      </header>

      <p
        className={`flex items-center gap-2 rounded-xl p-3 font-bold ${
          ficha.sello ? 'bg-sello-suave text-sello' : 'bg-superficie text-suave'
        }`}
      >
        {ficha.sello && <BadgeCheck aria-hidden size={24} className="shrink-0" />}
        {ficha.vistos_buenos === 0
          ? 'Aún sin Vistos Buenos'
          : `${ficha.vistos_buenos} ${ficha.vistos_buenos === 1 ? 'vecino de tu zona le da' : 'vecinos de tu zona le dan'} su Visto Bueno`}
      </p>

      <section className="flex flex-col gap-1">
        <p>{ficha.descripcion}</p>
        {ficha.tarifa_ref && <p className="font-bold">{ficha.tarifa_ref}</p>}
        {ficha.favores_hechos > 0 && (
          <p className="text-suave">
            Hizo {ficha.favores_hechos} {ficha.favores_hechos === 1 ? 'favor' : 'favores'} en el barrio
          </p>
        )}
        {ficha.disponible_emergencia && (
          <p className="flex items-center gap-1.5 text-suave">
            <Siren aria-hidden size={20} /> Disponible en emergencias
          </p>
        )}
      </section>

      {!ficha.es_mio &&
        (telefono ? (
          <BotonWhatsApp telefono={telefono} texto={`Hola ${ficha.nombre}, te encontré en Cuadra. Necesito ayuda con ${ficha.oficio.toLowerCase()}.`}>
            Contactar por WhatsApp
          </BotonWhatsApp>
        ) : (
          <p className="rounded-xl bg-superficie p-3 text-suave">Este vecino todavía no dejó su WhatsApp.</p>
        ))}

      {ficha.es_mio && <p className="rounded-xl bg-marca-suave p-3 font-bold">Esta es tu ficha. Así la ven tus vecinos.</p>}

      {!ficha.es_mio && !ficha.mi_visto_bueno && (
        <form onSubmit={darVistoBueno} className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-3">
          <label className="flex flex-col gap-1 font-bold">
            ¿Lo recomiendas? Cuenta tu experiencia (opcional)
            <textarea
              value={comentario}
              maxLength={280}
              rows={2}
              onChange={(e) => setComentario(e.target.value)}
              className="rounded-xl border-2 border-borde bg-superficie p-2 font-normal"
            />
          </label>
          <button
            type="submit"
            disabled={enviando}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-marca font-bold text-marca disabled:opacity-60"
          >
            <ThumbsUp aria-hidden size={22} /> Dar mi Visto Bueno
          </button>
        </form>
      )}

      {ficha.mi_visto_bueno && (
        <div className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-3">
          <p className="font-bold text-marca">Ya le diste tu Visto Bueno.</p>
          <button type="button" disabled={enviando} onClick={() => void quitarVistoBueno()} className="min-h-12 self-start font-bold text-suave underline">
            Quitar mi Visto Bueno
          </button>
        </div>
      )}

      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}

      {comentarios.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Lo que dicen los vecinos</h2>
          <ul className="flex flex-col gap-2">
            {comentarios.map((c) => (
              <li key={`${c.nombre}-${c.ts}`} className="rounded-xl border border-borde bg-superficie p-3">
                <p>{c.comentario}</p>
                <p className="mt-1 font-bold text-suave">{c.nombre}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
