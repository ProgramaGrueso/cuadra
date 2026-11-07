import { BadgeCheck, List, Map as MapaIcono, RefreshCw } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DirectorioEmergencia } from '../components/DirectorioEmergencia'
import { IconoOficio } from '../components/Iconos'
import { leerOficios, leerPrestadores } from '../lib/datos'
import { useEmergencia } from '../lib/emergencia'
import { useEnLinea } from '../lib/offline'
import { usePerfil } from '../lib/sesion'
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
  const { perfil, zonas, centro } = usePerfil()
  const zona = zonas.find((z) => z.id === perfil.zona_id)
  const enEmergencia = useEmergencia() !== null
  const enLinea = useEnLinea()

  const [vista, setVista] = useState<'lista' | 'mapa'>('lista')
  const [radio, setRadio] = useState(2000)
  const [oficioId, setOficioId] = useState<number | null>(null)
  const [oficios, setOficios] = useState<Oficio[]>([])
  const [resultado, setResultado] = useState<Resultado>({ fase: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    void leerOficios().then(({ data }) => setOficios(data ?? []))
  }, [enLinea])

  // En emergencia solo cuentan los oficios criticos, tambien si ya habia otro elegido.
  const oficiosVisibles = enEmergencia ? oficios.filter((o) => o.es_critico_emergencia) : oficios
  const oficioFiltrado = oficioId !== null && oficiosVisibles.some((o) => o.id === oficioId) ? oficioId : null

  useEffect(() => {
    let vigente = true
    setResultado({ fase: 'cargando' })
    void leerPrestadores(centro, enEmergencia).then(({ data, error }) => {
      if (vigente) setResultado(error ? { fase: 'error' } : { fase: 'listo', prestadores: data ?? [] })
    })
    return () => {
      vigente = false
    }
  }, [centro, enEmergencia, intento, enLinea])

  const visibles = useMemo(
    () =>
      resultado.fase === 'listo'
        ? resultado.prestadores.filter((p) => p.distancia_m <= radio && (oficioFiltrado === null || p.oficio_id === oficioFiltrado))
        : [],
    [resultado, radio, oficioFiltrado],
  )

  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <h1 className="text-2xl font-bold">
        {enEmergencia ? 'Quién puede ayudar' : `Servicios en ${zona?.nombre ?? 'tu zona'}`}
      </h1>

      {/* Los numeros de emergencia tambien se ven siempre sin red. */}
      {(enEmergencia || !enLinea) && <DirectorioEmergencia />}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por oficio">
        <Chip activo={oficioFiltrado === null} onClick={() => setOficioId(null)}>
          Todos
        </Chip>
        {oficiosVisibles.map((o) => (
          <Chip key={o.id} activo={oficioFiltrado === o.id} onClick={() => setOficioId(o.id)}>
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

      {resultado.fase === 'listo' && visibles.length === 0 && (
        <p className="py-8 text-center text-suave">
          No hay nadie {enEmergencia ? 'disponible para emergencias' : 'con ese oficio'} a menos de {formatearDistancia(radio)}. Prueba con una distancia mayor.
        </p>
      )}

      {resultado.fase === 'listo' && visibles.length > 0 && (
        <>
          <p role="status" className="text-suave">
            {visibles.length} {visibles.length === 1 ? 'vecino' : 'vecinos'}, los más
            recomendados primero
          </p>
          {vista === 'mapa' ? (
            <Suspense fallback={<p className="py-8 text-center text-suave">Cargando mapa…</p>}>
              <MapaPrestadores centro={centro} radioM={radio} prestadores={visibles} />
            </Suspense>
          ) : (
            <ul className="flex flex-col gap-3">
              {visibles.map((p) => (
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
    <li>
      <Link to={`/prestador/${p.id}`} className="block rounded-xl border border-borde bg-superficie p-3">
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
      </Link>
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
