import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PendientesDeEnvio } from '../components/AvisosConexion'
import { BotonWhatsApp } from '../components/BotonWhatsApp'
import { IconoOficio } from '../components/Iconos'
import { leerFavores } from '../lib/datos'
import { CATEGORIAS, categoriaDe, type TipoFavor } from '../lib/favores'
import { useCola, useEnLinea } from '../lib/offline'
import { usePerfil } from '../lib/sesion'
import { supabase } from '../lib/supabase'
import type { FavorCercano } from '../lib/types'
import { formatearDistancia } from '../lib/ubicacion'

type Resultado = { fase: 'cargando' } | { fase: 'error' } | { fase: 'listo'; favores: FavorCercano[] }

export function Favores() {
  const { centro } = usePerfil()
  const enLinea = useEnLinea()
  // Al vaciarse la cola se recarga: el evento en vivo puede perderse mientras el canal reconecta.
  const enCola = useCola().length
  const [resultado, setResultado] = useState<Resultado>({ fase: 'cargando' })
  const [tipo, setTipo] = useState<TipoFavor | null>(null)
  const [categoriaId, setCategoriaId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data, error } = await leerFavores(centro)
    setResultado((previo) => {
      if (!error) return { fase: 'listo', favores: data ?? [] }
      // Un refresco fallido no debe borrar un muro que ya se estaba viendo.
      return previo.fase === 'listo' ? previo : { fase: 'error' }
    })
  }, [centro])

  useEffect(() => {
    void cargar()
    const canal = supabase
      .channel('muro-favores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favores' }, () => void cargar())
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [cargar, enLinea, enCola])

  const visibles =
    resultado.fase === 'listo'
      ? resultado.favores.filter((f) => (!tipo || f.tipo === tipo) && (!categoriaId || f.categoria_id === categoriaId))
      : []

  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <h1 className="text-2xl font-bold">Favores del barrio</h1>
      <p className="text-suave">Sin dinero de por medio: hoy por ti, mañana por mí.</p>

      <div className="flex overflow-hidden rounded-xl border-2 border-marca" role="group" aria-label="Filtrar por tipo">
        <BotonTipo activo={tipo === null} onClick={() => setTipo(null)}>
          Todos
        </BotonTipo>
        <BotonTipo activo={tipo === 'pido'} onClick={() => setTipo('pido')}>
          Piden
        </BotonTipo>
        <BotonTipo activo={tipo === 'ofrezco'} onClick={() => setTipo('ofrezco')}>
          Ofrecen
        </BotonTipo>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por categoría">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={categoriaId === c.id}
            onClick={() => setCategoriaId(categoriaId === c.id ? null : c.id)}
            className={`flex min-h-12 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 font-bold whitespace-nowrap ${
              categoriaId === c.id ? 'border-marca bg-marca text-sobre-marca' : 'border-borde bg-superficie'
            }`}
          >
            <IconoOficio icono={c.icono} size={20} /> {c.nombre}
          </button>
        ))}
      </div>

      <PendientesDeEnvio tipos={['favor']} />

      {resultado.fase === 'cargando' && (
        <p role="status" className="py-8 text-center text-suave">
          Buscando favores cerca de ti…
        </p>
      )}

      {resultado.fase === 'error' && (
        <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
          <p>No pudimos cargar los favores.</p>
          <button
            type="button"
            onClick={() => void cargar()}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-marca px-4 font-bold text-sobre-marca"
          >
            <RefreshCw aria-hidden size={20} /> Intentar otra vez
          </button>
        </div>
      )}

      {resultado.fase === 'listo' && visibles.length === 0 && (
        <p className="py-8 text-center text-suave">No hay favores con ese filtro. Publica el primero con el botón +.</p>
      )}

      <ul className="flex flex-col gap-3">
        {visibles.map((f) => (
          <Tarjeta key={f.id} favor={f} alCambiar={cargar} />
        ))}
      </ul>
    </div>
  )
}

function Tarjeta({ favor: f, alCambiar }: { favor: FavorCercano; alCambiar: () => Promise<void> }) {
  const { perfil } = usePerfil()
  const [telefono, setTelefono] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const soyAutor = f.autor_id === perfil.id
  const soyAyudante = f.ayudante_id === perfil.id
  const categoria = categoriaDe(f.categoria_id)
  // Quien recibe confirma: asi el contador de favores no se puede inflar solo.
  const meToca = f.estado === 'en_curso' && (f.tipo === 'pido' ? soyAutor : soyAyudante)

  useEffect(() => {
    if (!soyAyudante || f.estado !== 'en_curso') return
    supabase.rpc('contacto_favor', { p_favor_id: f.id }).then(({ data }) => setTelefono((data as string | null) ?? null))
  }, [soyAyudante, f.estado, f.id])

  async function ejecutar(accion: () => PromiseLike<{ error: { code?: string; message: string } | null }>) {
    setEnviando(true)
    setAviso(null)
    const { error } = await accion()
    if (error) setAviso(error.code === 'P0001' ? error.message : 'No pudimos guardar el cambio. Revisa tu conexión.')
    await alCambiar()
    setEnviando(false)
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marca-suave text-marca">
          <IconoOficio icono={categoria.icono} />
        </span>
        <span className="font-bold">{f.tipo === 'pido' ? 'Pide' : 'Ofrece'}</span>
        <span className="text-suave">· {categoria.nombre}</span>
        {f.urgente && f.estado === 'abierto' && <span className="rounded-lg bg-peligro px-2 font-bold text-white">Urgente</span>}
      </div>

      <p>{f.texto}</p>

      <p className="text-suave">
        {soyAutor ? 'Tú' : f.autor}
        {f.autor_favores > 0 && !soyAutor && ` hizo ${f.autor_favores} ${f.autor_favores === 1 ? 'favor' : 'favores'}`} · a{' '}
        {formatearDistancia(f.distancia_m)}
      </p>

      {f.estado === 'abierto' && !soyAutor && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => void ejecutar(() => supabase.rpc('tomar_favor', { p_favor_id: f.id }))}
          className="min-h-12 rounded-xl bg-marca px-4 font-bold text-sobre-marca disabled:opacity-60"
        >
          {f.tipo === 'pido' ? 'Yo te ayudo' : 'Me interesa'}
        </button>
      )}

      {f.estado === 'abierto' && soyAutor && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => void ejecutar(() => supabase.from('favores').delete().eq('id', f.id))}
          className="min-h-12 self-start font-bold text-suave underline"
        >
          Quitar mi publicación
        </button>
      )}

      {f.estado === 'en_curso' && !soyAutor && !soyAyudante && <p className="font-bold text-suave">{f.ayudante} ya está en esto.</p>}

      {f.estado === 'en_curso' && soyAutor && (
        <p className="font-bold text-marca">
          {f.ayudante} {f.tipo === 'pido' ? 'te va a ayudar.' : 'aceptó tu oferta.'}
        </p>
      )}

      {f.estado === 'en_curso' && soyAyudante && (
        <>
          <p className="font-bold text-marca">¡Gracias! Ahora coordina con {f.autor}.</p>
          {telefono ? (
            <BotonWhatsApp telefono={telefono} texto={`Hola ${f.autor}, vi tu favor en Cuadra: "${f.texto}". ¿Coordinamos?`}>
              Escribir por WhatsApp
            </BotonWhatsApp>
          ) : (
            !f.autor_tiene_whatsapp && <p className="text-suave">Este vecino todavía no dejó su WhatsApp.</p>
          )}
        </>
      )}

      {meToca && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => void ejecutar(() => supabase.rpc('cumplir_favor', { p_favor_id: f.id }))}
          className="min-h-12 rounded-xl border-2 border-marca px-4 font-bold text-marca disabled:opacity-60"
        >
          Favor cumplido
        </button>
      )}

      {f.estado === 'cumplido' && <p className="font-bold text-marca">Favor cumplido. ¡Gracias por sumar!</p>}

      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}
    </li>
  )
}

function BotonTipo(props: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={props.activo}
      onClick={props.onClick}
      className={`min-h-12 flex-1 font-bold ${props.activo ? 'bg-marca text-sobre-marca' : 'text-marca'}`}
    >
      {props.children}
    </button>
  )
}
