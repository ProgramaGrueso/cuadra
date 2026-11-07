import { BadgeCheck, List, Map as MapaIcono, RefreshCw } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { IconoOficio } from '../components/Iconos'
import { usePerfil } from '../lib/sesion'
import { supabase } from '../lib/supabase'
import type { Oficio, PrestadorCercano } from '../lib/types'
import { formatearDistancia } from '../lib/ubicacion'

const MapaPrestadores = lazy(() =>
  import('../components/MapaPrestadores').then((m) => ({ default: m.MapaPrestadores })),
)

const RADIOS = [500, 1000, 2000]

type Resultado =
  | { fase: 'cargando' }
  | { fase: 'error' }
  | { fase: 'listo'; prestadores: PrestadorCercano[] }

export function Servicios() {
  const { perfil, zonas } = usePerfil()
  const zona = zonas.find((z) => z.id === perfil.zona_id)
  const centro = { lat: perfil.lat ?? zona?.lat ?? 0, lng: perfil.lng ?? zona?.lng ?? 0 }

  const [vista, setVista] = useState<'lista' | 'mapa'>('lista')
  const [radio, setRadio] = useState(2000)
  const [oficioId, setOficioId] = useState<number | null>(null)
  const [oficios, setOficios] = useState<Oficio[]>([])
  const [resultado, setResultado] = useState<Resultado>({ fase: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    supabase
      .from('oficios')
      .select('id, nombre, icono')
      .order('nombre')
      .returns<Oficio[]>()
      .then(({ data }) => setOficios(data ?? []))
  }, [])

  useEffect(() => {
    let vigente = true
    setResultado({ fase: 'cargando' })
    supabase
      .rpc('prestadores_cercanos', {
        p_lat: centro.lat,
        p_lng: centro.lng,
        p_radio_m: radio,
        p_oficio_id: oficioId,
      })
      .then(({ data, error }) => {
        if (!vigente) return
        setResultado(error ? { fase: 'error' } : { fase: 'listo', prestadores: (data ?? []) as PrestadorCercano[] })
      })
    return () => {
      vigente = false
    }
  }, [centro.lat, centro.lng, radio, oficioId, intento])

  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <h1 className="text-2xl font-bold">Servicios en {zona?.nombre ?? 'tu zona'}</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por oficio">
        <Chip activo={oficioId === null} onClick={() => setOficioId(null)}>
          Todos
        </Chip>
        {oficios.map((o) => (
          <Chip key={o.id} activo={oficioId === o.id} onClick={() => setOficioId(o.id)}>
            <IconoOficio icono={o.icono} size={20} /> {o.nombre}
          </Chip>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <label>
          <span className="sr-only">A menos de</span>
          <select
            value={radio}
            onChange={(e) => setRadio(Number(e.target.value))}
            className="min-h-12 rounded-xl border-2 border-borde bg-superficie px-2 font-bold"
          >
            {RADIOS.map((r) => (
              <option key={r} value={r}>
                {formatearDistancia(r)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex overflow-hidden rounded-xl border-2 border-marca" role="group" aria-label="Forma de ver los resultados">
          <BotonVista activo={vista === 'lista'} onClick={() => setVista('lista')}>
            <List aria-hidden size={20} /> Lista
          </BotonVista>
          <BotonVista activo={vista === 'mapa'} onClick={() => setVista('mapa')}>
            <MapaIcono aria-hidden size={20} /> Mapa
          </BotonVista>
        </div>
      </div>

      {resultado.fase === 'cargando' && (
        <p role="status" className="py-8 text-center text-suave">
          Buscando vecinos cerca de ti…
        </p>
      )}

      {resultado.fase === 'error' && (
        <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
          <p>No pudimos cargar los servicios.</p>
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-marca px-4 font-bold text-sobre-marca"
          >
            <RefreshCw aria-hidden size={20} /> Intentar otra vez
          </button>
        </div>
      )}

      {resultado.fase === 'listo' && resultado.prestadores.length === 0 && (
        <p className="py-8 text-center text-suave">
          No hay nadie con ese oficio a menos de {formatearDistancia(radio)}. Prueba con una distancia mayor.
        </p>
      )}

      {resultado.fase === 'listo' && resultado.prestadores.length > 0 && (
        <>
          <p role="status" className="text-suave">
            {resultado.prestadores.length} {resultado.prestadores.length === 1 ? 'vecino' : 'vecinos'}, los más
            recomendados primero
          </p>
          {vista === 'mapa' ? (
            <Suspense fallback={<p className="py-8 text-center text-suave">Cargando mapa…</p>}>
              <MapaPrestadores centro={centro} radioM={radio} prestadores={resultado.prestadores} />
            </Suspense>
          ) : (
            <ul className="flex flex-col gap-3">
              {resultado.prestadores.map((p) => (
                <TarjetaPrestador key={p.id} prestador={p} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function TarjetaPrestador({ prestador: p }: { prestador: PrestadorCercano }) {
  return (
    <li className="rounded-xl border border-borde bg-superficie p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marca-suave text-marca">
          <IconoOficio icono={p.icono} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-tight font-bold">{p.nombre}</h2>
          <p className="text-suave">
            {p.oficio} · {formatearDistancia(p.distancia_m)}
          </p>
        </div>
      </div>
      <p className="mt-2">{p.descripcion}</p>
      {p.tarifa_ref && <p className="mt-1 text-suave">{p.tarifa_ref}</p>}
      <p
        className={`mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 font-bold ${
          p.sello ? 'bg-sello-suave text-sello' : 'text-suave'
        }`}
      >
        {p.sello && <BadgeCheck aria-hidden size={20} className="shrink-0" />}
        {p.vistos_buenos === 0
          ? 'Aún sin Vistos Buenos'
          : `${p.vistos_buenos} ${p.vistos_buenos === 1 ? 'vecino de tu zona le da' : 'vecinos de tu zona le dan'} su Visto Bueno`}
      </p>
    </li>
  )
}

function Chip(props: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={props.activo}
      onClick={props.onClick}
      className={`flex min-h-12 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 font-bold whitespace-nowrap ${
        props.activo ? 'border-marca bg-marca text-sobre-marca' : 'border-borde bg-superficie text-texto'
      }`}
    >
      {props.children}
    </button>
  )
}

function BotonVista(props: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={props.activo}
      onClick={props.onClick}
      className={`flex min-h-12 items-center gap-1.5 px-3 font-bold ${
        props.activo ? 'bg-marca text-sobre-marca' : 'text-marca'
      }`}
    >
      {props.children}
    </button>
  )
}
