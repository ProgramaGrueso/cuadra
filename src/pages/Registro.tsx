import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SelectorUbicacion, type UbicacionElegida } from '../components/SelectorUbicacion'
import { useSesion } from '../lib/sesion'
import { normalizarTelefono } from '../lib/ubicacion'

export function Registro() {
  const { estado, guardarPerfil } = useSesion()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [ubicacion, setUbicacion] = useState<UbicacionElegida | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const zonas = estado.fase === 'listo' ? estado.zonas : []

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!ubicacion) {
      setError('Elige tu ubicación para ver a los vecinos de tu zona.')
      return
    }
    const numero = normalizarTelefono(telefono)
    if (numero && !/^[0-9]{9,15}$/.test(numero)) {
      setError('Revisa tu número de WhatsApp.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await guardarPerfil({
        nombre: nombre.trim(),
        telefono: numero,
        lat: ubicacion.lat,
        lng: ubicacion.lng,
        zona_id: ubicacion.zona_id,
      })
    } catch {
      setError('No pudimos guardar tus datos. Revisa tu conexión e inténtalo otra vez.')
      setGuardando(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-8">
      <header>
        <img src="/icon.svg" alt="" className="mb-4 h-14 w-14 rounded-xl" />
        <h1 className="text-3xl font-bold">Bienvenido a Cuadra</h1>
        <p className="mt-1 text-suave">Encuentra gente de confianza a pocas cuadras de tu casa.</p>
      </header>

      <form onSubmit={enviar} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1 font-bold">
          ¿Cómo te llamas?
          <input
            required
            minLength={2}
            maxLength={60}
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="min-h-12 rounded-xl border-2 border-borde bg-superficie px-3 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 font-bold">
          Tu WhatsApp (opcional)
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="987 654 321"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="min-h-12 rounded-xl border-2 border-borde bg-superficie px-3 font-normal"
          />
          <span className="text-base font-normal text-suave">Solo se comparte cuando un vecino te contacta.</span>
        </label>

        <div className="flex flex-col gap-1">
          <span className="font-bold">¿Dónde vives?</span>
          {ubicacion ? (
            <p className="flex min-h-12 items-center gap-2 rounded-xl bg-marca-suave px-3 font-bold">
              <Check aria-hidden size={22} /> Estás en {ubicacion.nombreZona}
            </p>
          ) : (
            <SelectorUbicacion zonas={zonas} onElegir={setUbicacion} />
          )}
          <span className="text-base text-suave">Los demás solo ven tu zona, nunca tu dirección.</span>
        </div>

        {error && (
          <p role="alert" className="font-bold text-peligro">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="min-h-14 rounded-xl bg-marca px-4 text-lg font-bold text-sobre-marca disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Entrar a mi barrio'}
        </button>
      </form>
    </main>
  )
}
