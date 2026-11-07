import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { BotonDictar } from '../components/BotonDictar'
import { IconoOficio } from '../components/Iconos'
import { CATEGORIAS, type CategoriaFavor, type TipoFavor } from '../lib/favores'
import { publicar as enviar } from '../lib/offline'
import { usePerfil } from '../lib/sesion'

// La categoria y el texto ya vienen sugeridos: Publicar es el tercer clic tras "+" y el tipo.
export function PublicarFavor() {
  const { tipo } = useParams()
  if (tipo !== 'pido' && tipo !== 'ofrezco') return <Navigate to="/favores" replace />
  return <Formulario key={tipo} tipo={tipo} />
}

function Formulario({ tipo }: { tipo: TipoFavor }) {
  const { perfil, centro } = usePerfil()
  const navegar = useNavigate()
  const [categoria, setCategoria] = useState<CategoriaFavor>(CATEGORIAS[0])
  const [texto, setTexto] = useState<string>(CATEGORIAS[0][tipo])
  const [urgente, setUrgente] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  function elegir(c: CategoriaFavor) {
    setCategoria(c)
    setTexto(c[tipo])
  }

  async function publicar(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setAviso(null)
    const id = crypto.randomUUID()
    const mensaje = texto.trim()
    try {
      await enviar(
        'favor',
        id,
        { id, tipo, categoria_id: categoria.id, texto: mensaje, urgente, lat: centro.lat, lng: centro.lng, autor_id: perfil.id },
        mensaje,
      )
      navegar('/favores', { replace: true })
    } catch {
      setAviso('No pudimos publicar tu favor. Inténtalo otra vez.')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={publicar} className="flex flex-col gap-4 px-4 pt-2">
      <Link to="/favores" className="flex min-h-12 items-center gap-2 font-bold text-marca">
        <ArrowLeft aria-hidden size={22} /> Cancelar
      </Link>
      <h1 className="text-2xl font-bold">{tipo === 'pido' ? 'Pido un favor' : 'Ofrezco un favor'}</h1>

      <fieldset>
        <legend className="mb-2 font-bold">¿De qué se trata?</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoria.id === c.id}
              onClick={() => elegir(c)}
              className={`flex min-h-16 items-center gap-2 rounded-xl border-2 p-2 text-left font-bold ${
                categoria.id === c.id ? 'border-marca bg-marca text-sobre-marca' : 'border-borde bg-superficie'
              }`}
            >
              <IconoOficio icono={c.icono} size={24} />
              {c.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 font-bold">
        Tu mensaje
        <textarea
          required
          minLength={3}
          maxLength={280}
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="rounded-xl border-2 border-borde bg-superficie p-2 font-normal"
        />
      </label>

      <BotonDictar alDictar={(dictado) => setTexto(dictado.slice(0, 280))} />

      <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-borde bg-superficie px-3 py-2 font-bold">
        Es urgente
        <input
          type="checkbox"
          checked={urgente}
          onChange={(e) => setUrgente(e.target.checked)}
          className="h-7 w-7 shrink-0 accent-[var(--marca)]"
        />
      </label>

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
