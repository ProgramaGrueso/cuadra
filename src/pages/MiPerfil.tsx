import { useState, type FormEvent } from 'react'
import { SelectorUbicacion, type UbicacionElegida } from '../components/SelectorUbicacion'
import { usePerfil } from '../lib/sesion'
import { normalizarTelefono } from '../lib/ubicacion'

export function MiPerfil() {
  const { perfil, zonas, guardarPerfil } = usePerfil()
  const [nombre, setNombre] = useState(perfil.nombre)
  const [telefono, setTelefono] = useState(perfil.telefono ?? '')
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null)
  const zona = zonas.find((z) => z.id === perfil.zona_id)

  async function guardar(cambios: Parameters<typeof guardarPerfil>[0], exito: string) {
    try {
      await guardarPerfil(cambios)
      setMensaje({ texto: exito, error: false })
    } catch {
      setMensaje({ texto: 'No pudimos guardar el cambio. Revisa tu conexión.', error: true })
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    const numero = normalizarTelefono(telefono)
    if (numero && !/^[0-9]{9,15}$/.test(numero)) {
      setMensaje({ texto: 'Revisa tu número de WhatsApp.', error: true })
      return
    }
    void guardar({ nombre: nombre.trim(), telefono: numero }, 'Datos guardados.')
  }

  function cambiarUbicacion({ lat, lng, zona_id, nombreZona }: UbicacionElegida) {
    void guardar({ lat, lng, zona_id }, `Ubicación actualizada: ${nombreZona}.`)
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-5">
      <h1 className="text-2xl font-bold">Mi perfil</h1>

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 font-bold">
          Nombre
          <input
            required
            minLength={2}
            maxLength={60}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="min-h-12 rounded-xl border-2 border-borde bg-superficie px-3 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 font-bold">
          WhatsApp
          <input
            type="tel"
            inputMode="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="min-h-12 rounded-xl border-2 border-borde bg-superficie px-3 font-normal"
          />
        </label>
        <button type="submit" className="min-h-12 rounded-xl bg-marca px-4 font-bold text-sobre-marca">
          Guardar datos
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Mi zona: {zona?.nombre ?? 'sin definir'}</h2>
        <SelectorUbicacion zonas={zonas} onElegir={cambiarUbicacion} />
      </section>

      <section>
        <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-borde bg-superficie px-3 py-2 font-bold">
          Letra grande
          <input
            type="checkbox"
            checked={perfil.letra_grande}
            onChange={(e) => void guardar({ letra_grande: e.target.checked }, 'Tamaño de letra actualizado.')}
            className="h-7 w-7 accent-[var(--marca)]"
          />
        </label>
      </section>

      {mensaje && (
        <p role={mensaje.error ? 'alert' : 'status'} className={`font-bold ${mensaje.error ? 'text-peligro' : 'text-marca'}`}>
          {mensaje.texto}
        </p>
      )}
    </div>
  )
}
