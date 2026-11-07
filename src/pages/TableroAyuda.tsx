import { CheckCircle2, RefreshCw } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PendientesDeEnvio } from '../components/AvisosConexion'
import { BotonWhatsApp } from '../components/BotonWhatsApp'
import { ESTADOS_REPORTE, TIPOS_RECURSO, TIPOS_REPORTE, useEmergencia } from '../lib/emergencia'
import { conCache, publicar, useCola, useEnLinea } from '../lib/offline'
import { usePerfil } from '../lib/sesion'
import { supabase } from '../lib/supabase'
import type { CruceRecurso, Emergencia, RecursoCercano, Reporte } from '../lib/types'
import { formatearDistancia } from '../lib/ubicacion'

const MapaEmergencia = lazy(() => import('../components/MapaEmergencia').then((m) => ({ default: m.MapaEmergencia })))

const COLUMNAS = 'id, tipo, descripcion, lat_aprox, lng_aprox, estado, reportado_por, atendido_por, ts'
const ORDEN_ESTADO: Record<Reporte['estado'], number> = { pendiente: 0, en_atencion: 1, atendido: 2 }

export function TableroAyuda() {
  const emergencia = useEmergencia()
  const [params, setParams] = useSearchParams()
  if (!emergencia) return null
  const vista = params.get('vista') === 'recursos' ? 'recursos' : 'vecinos'

  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <h1 className="text-2xl font-bold">Ayuda en tu zona</h1>
      <EstoyBien emergencia={emergencia} />
      <div className="flex overflow-hidden rounded-xl border-2 border-marca" role="group" aria-label="Sección del tablero">
        <Pestana activa={vista === 'vecinos'} onClick={() => setParams({}, { replace: true })}>
          Vecinos
        </Pestana>
        <Pestana activa={vista === 'recursos'} onClick={() => setParams({ vista: 'recursos' }, { replace: true })}>
          Recursos
        </Pestana>
      </div>
      {vista === 'vecinos' ? <Vecinos emergencia={emergencia} /> : <Recursos emergencia={emergencia} />}
    </div>
  )
}

function Pestana(props: { activa: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={props.activa}
      onClick={props.onClick}
      className={`min-h-12 flex-1 font-bold ${props.activa ? 'bg-marca text-sobre-marca' : 'text-marca'}`}
    >
      {props.children}
    </button>
  )
}

function ErrorCarga({ texto, alReintentar }: { texto: string; alReintentar: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
      <p>{texto}</p>
      <button type="button" onClick={alReintentar} className="flex min-h-12 items-center gap-2 rounded-xl bg-marca px-4 font-bold text-sobre-marca">
        <RefreshCw aria-hidden size={20} /> Intentar otra vez
      </button>
    </div>
  )
}

function EstoyBien({ emergencia }: { emergencia: Emergencia }) {
  const { perfil } = usePerfil()
  const enLinea = useEnLinea()
  const enCola = useCola().some((e) => e.tipo === 'checkin' && e.args.p_emergencia_id === emergencia.id)
  const [confirmado, setConfirmado] = useState(false)
  const [conteo, setConteo] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [total, mio] = await Promise.all([
      conCache<number>(`conteo:${emergencia.id}`, () => supabase.rpc('conteo_checkins', { p_emergencia_id: emergencia.id })),
      conCache<{ estado: string } | null>(`mi-checkin:${emergencia.id}`, () =>
        supabase.from('checkins').select('estado').eq('emergencia_id', emergencia.id).eq('user_id', perfil.id).maybeSingle(),
      ),
    ])
    if (typeof total.data === 'number') setConteo(total.data)
    if (mio.data?.estado === 'bien') setConfirmado(true)
  }, [emergencia.id, perfil.id])

  useEffect(() => {
    void cargar()
    if (!enLinea) return
    const intervalo = setInterval(() => void cargar(), 15000)
    return () => clearInterval(intervalo)
  }, [cargar, enLinea, enCola])

  async function confirmar() {
    setEnviando(true)
    setAviso(null)
    try {
      await publicar('checkin', `checkin:${emergencia.id}`, { p_emergencia_id: emergencia.id }, 'Estoy bien')
      setConfirmado(true)
      await cargar()
    } catch {
      setAviso('No pudimos guardarlo. Inténtalo otra vez.')
    }
    setEnviando(false)
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-3">
      {confirmado || enCola ? (
        <p className="flex items-center gap-2 font-bold text-marca">
          <CheckCircle2 aria-hidden size={24} /> {enCola ? 'Avisaremos que estás bien cuando vuelva la señal' : 'Avisaste que estás bien'}
        </p>
      ) : (
        <button
          type="button"
          disabled={enviando}
          onClick={() => void confirmar()}
          className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-marca text-lg font-bold text-sobre-marca disabled:opacity-60"
        >
          <CheckCircle2 aria-hidden size={26} /> Estoy bien
        </button>
      )}
      {conteo !== null && (
        <p role="status" className="text-suave">
          {conteo} {conteo === 1 ? 'vecino confirmó que está bien' : 'vecinos confirmaron que están bien'}
        </p>
      )}
      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}
    </section>
  )
}

interface DatosVecinos {
  reportes: Reporte[]
  direcciones: { reporte_id: string; direccion: string }[]
}

function Vecinos({ emergencia }: { emergencia: Emergencia }) {
  const { perfil, centro } = usePerfil()
  const enLinea = useEnLinea()
  // Al vaciarse la cola se recarga: el evento en vivo puede perderse mientras el canal reconecta.
  const enCola = useCola().length
  const [datos, setDatos] = useState<DatosVecinos | null>(null)
  const [error, setError] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    const r = await conCache<DatosVecinos>(`reportes:${emergencia.id}`, async () => {
      const [lista, privadas] = await Promise.all([
        supabase.from('reportes_vulnerables').select(COLUMNAS).eq('emergencia_id', emergencia.id),
        // RLS solo devuelve las de quien reporto o acepto atender.
        supabase.from('reportes_direcciones').select('reporte_id, direccion'),
      ])
      return {
        data: { reportes: lista.data ?? [], direcciones: privadas.data ?? [] },
        error: lista.error ?? privadas.error,
        status: lista.error ? lista.status : privadas.status,
      }
    })
    setError(r.error)
    if (r.data) setDatos(r.data)
  }, [emergencia.id])

  useEffect(() => {
    void cargar()
    const canal = supabase
      .channel('tablero-reportes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reportes_vulnerables', filter: `emergencia_id=eq.${emergencia.id}` },
        () => void cargar(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [cargar, emergencia.id, enLinea, enCola])

  async function ejecutar(funcion: 'atender_reporte' | 'cerrar_reporte', id: string) {
    setEnviando(true)
    setAviso(null)
    const { error: fallo } = await supabase.rpc(funcion, { p_reporte_id: id })
    if (fallo) setAviso(fallo.code === 'P0001' || fallo.code === '42501' ? fallo.message : 'Necesitas conexión para esto. Revisa tu señal.')
    await cargar()
    setEnviando(false)
  }

  if (error && !datos) return <ErrorCarga texto="No pudimos cargar los reportes." alReintentar={() => void cargar()} />
  if (!datos) {
    return (
      <p role="status" className="py-8 text-center text-suave">
        Cargando reportes…
      </p>
    )
  }

  const reportes = [...datos.reportes].sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || b.ts.localeCompare(a.ts))
  const direcciones = Object.fromEntries(datos.direcciones.map((d) => [d.reporte_id, d.direccion]))
  const pendientes = reportes.filter((r) => r.estado === 'pendiente').length

  return (
    <>
      <p role="status" className="font-bold">
        {pendientes} {pendientes === 1 ? 'vecino espera' : 'vecinos esperan'} ayuda
      </p>
      <PendientesDeEnvio tipos={['reporte']} />
      <Suspense fallback={<p className="py-8 text-center text-suave">Cargando mapa…</p>}>
        <MapaEmergencia centro={centro} reportes={reportes} />
      </Suspense>
      {!perfil.verificado && <p className="rounded-xl bg-marca-suave p-3 font-bold">Solo los voluntarios verificados pueden aceptar reportes.</p>}
      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {reportes.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-3">
            <p className="flex flex-wrap items-center justify-between gap-2 font-bold">
              {TIPOS_REPORTE[r.tipo].nombre}
              <span className={`rounded-lg px-2 ${r.estado === 'pendiente' ? 'bg-peligro text-white' : r.estado === 'en_atencion' ? 'bg-sello-suave text-sello' : 'bg-fondo text-suave'}`}>
                {ESTADOS_REPORTE[r.estado]}
              </span>
            </p>
            <p>{r.descripcion}</p>
            {r.reportado_por === perfil.id && <p className="text-suave">Lo reportaste tú.</p>}
            {direcciones[r.id] && (
              <p className="rounded-lg bg-marca-suave p-2">
                <span className="font-bold">Dirección: </span>
                {direcciones[r.id]}
              </p>
            )}
            {r.estado === 'pendiente' && perfil.verificado && (
              <button
                type="button"
                disabled={enviando}
                onClick={() => void ejecutar('atender_reporte', r.id)}
                className="min-h-12 rounded-xl bg-marca px-4 font-bold text-sobre-marca disabled:opacity-60"
              >
                Voy a atenderlo
              </button>
            )}
            {r.estado === 'en_atencion' && r.atendido_por === perfil.id && (
              <button
                type="button"
                disabled={enviando}
                onClick={() => void ejecutar('cerrar_reporte', r.id)}
                className="min-h-12 rounded-xl border-2 border-marca px-4 font-bold text-marca disabled:opacity-60"
              >
                Marcar como atendido
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

interface DatosRecursos {
  recursos: RecursoCercano[]
  cruces: CruceRecurso[]
}

function Recursos({ emergencia }: { emergencia: Emergencia }) {
  const { centro } = usePerfil()
  const enLinea = useEnLinea()
  const enCola = useCola().length
  const [datos, setDatos] = useState<DatosRecursos | null>(null)
  const [error, setError] = useState(false)

  const cargar = useCallback(async () => {
    const r = await conCache<DatosRecursos>(`recursos:${emergencia.id}`, async () => {
      const [lista, cruces] = await Promise.all([
        supabase.rpc('recursos_cercanos', { p_emergencia_id: emergencia.id, p_lat: centro.lat, p_lng: centro.lng }),
        supabase.rpc('cruces_de_recursos', { p_emergencia_id: emergencia.id }),
      ])
      return {
        data: { recursos: lista.data ?? [], cruces: cruces.data ?? [] },
        error: lista.error ?? cruces.error,
        status: lista.error ? lista.status : cruces.status,
      }
    })
    setError(r.error)
    if (r.data) setDatos(r.data)
  }, [emergencia.id, centro.lat, centro.lng])

  useEffect(() => {
    void cargar()
    const canal = supabase
      .channel('tablero-recursos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recursos_criticos', filter: `emergencia_id=eq.${emergencia.id}` },
        () => void cargar(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [cargar, emergencia.id, enLinea, enCola])

  if (error && !datos) return <ErrorCarga texto="No pudimos cargar los recursos." alReintentar={() => void cargar()} />
  if (!datos) {
    return (
      <p role="status" className="py-8 text-center text-suave">
        Cargando recursos…
      </p>
    )
  }

  const { recursos, cruces } = datos
  return (
    <>
      <PendientesDeEnvio tipos={['recurso']} />
      {cruces.length > 0 && (
        <section className="flex flex-col gap-2 rounded-xl bg-marca-suave p-3">
          <h2 className="text-lg font-bold">Encontramos vecinos para ti</h2>
          <ul className="flex flex-col gap-3">
            {cruces.map((c) => (
              <li key={`${c.mi_recurso_id}-${c.otro_id}`} className="flex flex-col gap-1">
                <p>
                  <span className="font-bold">{c.otro_nombre}</span> {c.mi_accion === 'necesito' ? 'tiene' : 'necesita'}{' '}
                  {TIPOS_RECURSO[c.tipo].toLowerCase()} ({c.otro_cantidad}) a {formatearDistancia(c.distancia_m)}
                  {c.otro_detalle && `: ${c.otro_detalle}`}
                </p>
                {c.otro_telefono ? (
                  <BotonWhatsApp telefono={c.otro_telefono} texto={`Hola ${c.otro_nombre}, te encontré en Cuadra por ${TIPOS_RECURSO[c.tipo].toLowerCase()}. ¿Coordinamos?`}>
                    Escribir por WhatsApp
                  </BotonWhatsApp>
                ) : (
                  <p className="text-suave">Este vecino todavía no dejó su WhatsApp.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="flex flex-col gap-3">
        {recursos.map((r) => (
          <li key={r.id} className="rounded-xl border border-borde bg-superficie p-3">
            <p className="font-bold">
              {r.accion === 'tengo' ? 'Tiene' : 'Necesita'} {TIPOS_RECURSO[r.tipo].toLowerCase()} ({r.cantidad})
            </p>
            {r.detalle && <p>{r.detalle}</p>}
            <p className="text-suave">{r.es_mio ? 'Lo publicaste tú' : `${r.nombre} · a ${formatearDistancia(r.distancia_m)}`}</p>
          </li>
        ))}
      </ul>
      {recursos.length === 0 && <p className="py-8 text-center text-suave">Aún no hay recursos. Publica el primero con el botón +.</p>}
    </>
  )
}
