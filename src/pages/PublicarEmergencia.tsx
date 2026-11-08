import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { BotonDictar } from '../components/BotonDictar'
import { TIPOS_RECURSO, TIPOS_REPORTE, useEmergencia, type TipoRecurso, type TipoReporte } from '../lib/emergencia'
import { publicar as enviar } from '../lib/offline'
import { usePerfil } from '../lib/sesion'

const claseCampo = 'rounded-xl border-2 border-borde bg-superficie p-2 font-normal'

function Eleccion<T extends string>(props: { titulo: string; opciones: Record<T, string>; valor: T; alElegir: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-bold">{props.titulo}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(props.opciones) as T[]).map((clave) => (
          <button
            key={clave}
            type="button"
            aria-pressed={props.valor === clave}
            onClick={() => props.alElegir(clave)}
            className={`min-h-14 rounded-xl border-2 p-2 font-bold ${
              props.valor === clave ? 'border-marca bg-marca text-sobre-marca' : 'border-borde bg-superficie'
            }`}
          >
            {props.opciones[clave]}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function Volver() {
  return (
    <Link to="/favores" className="flex min-h-12 items-center gap-2 font-bold text-marca">
      <ArrowLeft aria-hidden size={22} /> Cancelar
    </Link>
  )
}

const NOMBRES_REPORTE = Object.fromEntries(
  Object.entries(TIPOS_REPORTE).map(([clave, tipo]) => [clave, tipo.nombre]),
) as Record<TipoReporte, string>

export function ReportarVulnerable() {
  const emergencia = useEmergencia()
  const { centro } = usePerfil()
  const navegar = useNavigate()
  const [tipo, setTipo] = useState<TipoReporte>('adulto_mayor')
  const [descripcion, setDescripcion] = useState<string>(TIPOS_REPORTE.adulto_mayor.plantilla)
  const [direccion, setDireccion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  if (!emergencia) return <Navigate to="/favores" replace />

  async function publicar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setAviso(null)
    const id = crypto.randomUUID()
    const texto = descripcion.trim()
    try {
      await enviar(
        'reporte',
        id,
        {
          p_id: id,
          p_emergencia_id: emergencia!.id,
          p_tipo: tipo,
          p_descripcion: texto,
          p_lat: centro.lat,
          p_lng: centro.lng,
          p_direccion: direccion.trim(),
        },
        `${TIPOS_REPORTE[tipo].nombre}: ${texto}`,
      )
      navegar('/favores', { replace: true })
    } catch {
      setAviso('No pudimos enviar el reporte. Inténtalo otra vez.')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={publicar} className="flex flex-col gap-4 px-4 pt-2">
      <Volver />
      <h1 className="text-2xl font-bold">Reportar a un vecino</h1>
      <Eleccion
        titulo="¿Quién necesita ayuda?"
        opciones={NOMBRES_REPORTE}
        valor={tipo}
        alElegir={(t) => {
          setTipo(t)
          setDescripcion(TIPOS_REPORTE[t].plantilla)
        }}
      />
      <label className="flex flex-col gap-1 font-bold">
        ¿Qué necesita?
        <textarea
          required
          minLength={3}
          maxLength={280}
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className={claseCampo}
        />
      </label>
      <BotonDictar alDictar={(dictado) => setDescripcion(dictado.slice(0, 280))} />
      <label className="flex flex-col gap-1 font-bold">
        Dirección exacta
        <input
          required
          minLength={3}
          maxLength={200}
          value={direccion}
          placeholder="Calle, número y piso"
          onChange={(e) => setDireccion(e.target.value)}
          className={`min-h-12 ${claseCampo}`}
        />
        <span className="font-normal text-suave">Solo la verá el voluntario que acepte atenderlo. Los demás ven una zona aproximada.</span>
      </label>
      <button type="submit" disabled={enviando} className="min-h-14 rounded-xl bg-marca px-4 text-lg font-bold text-sobre-marca disabled:opacity-60">
        {enviando ? 'Enviando…' : 'Publicar'}
      </button>
      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}
    </form>
  )
}

export function PublicarRecurso() {
  const { accion } = useParams()
  const emergencia = useEmergencia()
  const { perfil, centro } = usePerfil()
  const navegar = useNavigate()
  const [tipo, setTipo] = useState<TipoRecurso>('agua')
  const [cantidad, setCantidad] = useState(1)
  const [detalle, setDetalle] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  if (!emergencia || (accion !== 'tengo' && accion !== 'necesito')) return <Navigate to="/favores" replace />

  async function publicar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setAviso(null)
    const id = crypto.randomUUID()
    try {
      await enviar(
        'recurso',
        id,
        {
          id,
          emergencia_id: emergencia!.id,
          tipo,
          accion,
          cantidad,
          detalle: detalle.trim() || null,
          lat: centro.lat,
          lng: centro.lng,
          user_id: perfil.id,
        },
        `${accion === 'tengo' ? 'Tengo' : 'Necesito'} ${TIPOS_RECURSO[tipo].toLowerCase()} (${cantidad})`,
      )
      navegar('/favores?vista=recursos', { replace: true })
    } catch {
      setAviso('No pudimos publicar el recurso. Inténtalo otra vez.')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={publicar} className="flex flex-col gap-4 px-4 pt-2">
      <Volver />
      <h1 className="text-2xl font-bold">{accion === 'tengo' ? 'Tengo un recurso' : 'Necesito un recurso'}</h1>
      <Eleccion titulo="¿Qué recurso?" opciones={TIPOS_RECURSO} valor={tipo} alElegir={setTipo} />
      <label className="flex flex-col gap-1 font-bold">
        Cantidad
        <input
          required
          type="number"
          inputMode="numeric"
          min={1}
          max={9999}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          className={`min-h-12 ${claseCampo}`}
        />
      </label>
      <label className="flex flex-col gap-1 font-bold">
        Detalle (opcional)
        <input
          maxLength={140}
          value={detalle}
          placeholder={accion === 'tengo' ? 'Bidones de 20 litros' : 'Para una familia de cuatro'}
          onChange={(e) => setDetalle(e.target.value)}
          className={`min-h-12 ${claseCampo}`}
        />
      </label>
      <BotonDictar alDictar={(dictado) => setDetalle(dictado.slice(0, 140))} />
      <button type="submit" disabled={enviando} className="min-h-14 rounded-xl bg-marca px-4 text-lg font-bold text-sobre-marca disabled:opacity-60">
        {enviando ? 'Publicando…' : 'Publicar'}
      </button>
      {aviso && (
        <p role="alert" className="font-bold text-peligro">
          {aviso}
        </p>
      )}
    </form>
  )
}
