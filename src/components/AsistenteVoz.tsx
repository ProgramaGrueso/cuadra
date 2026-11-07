import { Bot, Keyboard, Mic, Send, Square, Volume2, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { conversar, type Mensaje } from '../lib/agente'
import { useEmergencia } from '../lib/emergencia'
import { useEnLinea } from '../lib/offline'
import { usePerfil } from '../lib/sesion'
import { ErrorEscucha, escucharFrase, leer, MENSAJE_VOZ, parar, PISTA_TECLADO, reconocedor, textoDePantalla, useEscucharActivo, useHablando, useProblemaVoz, vozDisponible } from '../lib/voz'

const SALUDO = '¿En qué le ayudo? Por ejemplo: "Busco un gasfitero", "Quiero pedir que me lleven al médico" o "Léame lo que dice aquí".'

// Ayuda por voz para quien lee o escribe con dificultad. Sin señal queda "Escuchar esta pantalla".
export function AsistenteVoz() {
  const activo = useEscucharActivo()
  const hablando = useHablando()
  const enLinea = useEnLinea()
  const emergencia = useEmergencia()
  const { perfil, centro, guardarPerfil } = usePerfil()
  const { pathname, search } = useLocation()
  const navegar = useNavigate()

  const [abierto, setAbierto] = useState(false)
  const [historial, setHistorial] = useState<Mensaje[]>([])
  const [escrito, setEscrito] = useState('')
  const [escuchando, setEscuchando] = useState(false)
  const [pensando, setPensando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pregunta, setPregunta] = useState<{ texto: string; responder: (si: boolean) => void } | null>(null)
  const escucha = useRef<{ abort: () => void } | null>(null)
  const fin = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [pista, setPista] = useState(false)
  const problemaVoz = useProblemaVoz()

  // Con llaves: en Chrome reciente scrollIntoView devuelve una promesa y React la tomaria como limpieza.
  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end' })
  }, [historial, pregunta, pensando])
  useEffect(() => () => escucha.current?.abort(), [])

  if (!activo) return null

  const ruta = pathname + search
  const puedeHablar = enLinea && Boolean(reconocedor())

  function cerrar() {
    escucha.current?.abort()
    parar()
    pregunta?.responder(false)
    setAbierto(false)
  }

  function escucharPantalla() {
    if (hablando) return parar()
    const main = document.querySelector('main')
    leer((main && textoDePantalla(main)) || 'No hay texto en esta pantalla.')
  }

  async function enviar(texto: string) {
    const limpio = texto.trim()
    if (!limpio || pensando) return
    setAviso(null)
    setEscrito('')
    parar()
    const nuevo: Mensaje[] = [...historial, { role: 'user', content: limpio }]
    setHistorial(nuevo)
    setPensando(true)
    try {
      const final = await conversar(
        nuevo,
        {
          perfil,
          centro,
          emergencia,
          ruta,
          navegar: (r) => navegar(r),
          guardarPerfil,
          confirmar: (texto) =>
            new Promise<boolean>((resolver) => {
              leer(`${texto} Toque Sí o No.`)
              setPregunta({
                texto,
                responder: (si) => {
                  setPregunta(null)
                  parar()
                  resolver(si)
                },
              })
            }),
        },
        setHistorial,
      )
      setHistorial(final)
      const ultima = final.at(-1)
      if (ultima?.role === 'assistant' && ultima.content) leer(ultima.content)
    } catch (e) {
      const mensaje = e instanceof Error && e.message ? e.message : 'El asistente no respondió.'
      setAviso(mensaje)
      leer(mensaje)
    } finally {
      setPensando(false)
    }
  }

  function hablar() {
    if (escuchando) {
      escucha.current?.abort()
      return
    }
    setAviso(null)
    const e = escucharFrase()
    escucha.current = e
    setEscuchando(true)
    e.promesa
      .then((texto) => void enviar(texto))
      .catch((error: Error) => {
        if (error.message) setAviso(error.message)
        // Si el microfono del navegador falla, el del teclado casi siempre funciona.
        if (error instanceof ErrorEscucha && error.pista) {
          setPista(true)
          campo.current?.focus()
        }
      })
      .finally(() => setEscuchando(false))
  }

  function alEscribir(evento: FormEvent) {
    evento.preventDefault()
    void enviar(escrito)
  }

  const visibles = historial.filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)

  return (
    <>
      <div data-no-leer className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[1000] mx-auto flex max-w-md px-4">
        <button
          type="button"
          onClick={() => {
            setAbierto(true)
            if (historial.length === 0 && vozDisponible) leer(SALUDO)
          }}
          className="pointer-events-auto flex min-h-14 items-center gap-2 rounded-full border-2 border-marca bg-superficie px-4 font-bold text-marca shadow-lg"
        >
          <Bot aria-hidden size={24} /> Asistente
        </button>
      </div>

      {abierto && (
        <div data-no-leer className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40" onClick={cerrar}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Asistente de voz"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80dvh] w-full max-w-md flex-col gap-3 rounded-t-2xl bg-fondo p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <header className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Bot aria-hidden size={26} className="text-marca" /> Asistente
              </h2>
              <button type="button" onClick={cerrar} aria-label="Cerrar" className="flex h-12 w-12 items-center justify-center rounded-full bg-superficie">
                <X aria-hidden size={26} />
              </button>
            </header>

            <div className="flex min-h-24 flex-col gap-2 overflow-y-auto" aria-live="polite">
              {visibles.length === 0 && <p className="rounded-xl bg-superficie p-3">{SALUDO}</p>}
              {visibles.map((m, i) => (
                <p
                  key={i}
                  className={`max-w-[85%] rounded-xl p-3 ${m.role === 'user' ? 'self-end bg-marca text-sobre-marca' : 'self-start bg-superficie'}`}
                >
                  {m.content}
                </p>
              ))}
              {pensando && !pregunta && (
                <p role="status" className="self-start text-suave">
                  Pensando…
                </p>
              )}
              {pregunta && (
                <div className="flex flex-col gap-2 rounded-xl border-2 border-marca bg-superficie p-3">
                  <p className="font-bold">{pregunta.texto}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => pregunta.responder(true)} className="min-h-14 rounded-xl bg-marca text-lg font-bold text-sobre-marca">
                      Sí
                    </button>
                    <button type="button" onClick={() => pregunta.responder(false)} className="min-h-14 rounded-xl border-2 border-borde bg-fondo text-lg font-bold">
                      No
                    </button>
                  </div>
                </div>
              )}
              <div ref={fin} />
            </div>

            {aviso && (
              <p role="alert" className="font-bold text-peligro">
                {aviso}
              </p>
            )}
            {enLinea && (pista || !puedeHablar) && (
              <p className="flex items-start gap-2 rounded-xl bg-marca-suave p-3 font-bold">
                <Keyboard aria-hidden size={24} className="shrink-0" />
                {puedeHablar ? PISTA_TECLADO : 'Para hablar, toque el cuadro de texto de abajo y luego el micrófono de su teclado.'}
              </p>
            )}
            {problemaVoz && <p className="rounded-xl bg-superficie p-3 text-suave">{MENSAJE_VOZ[problemaVoz]}</p>}

            {enLinea ? (
              <>
                {puedeHablar && (
                  <button
                    type="button"
                    onClick={hablar}
                    disabled={pensando}
                    aria-pressed={escuchando}
                    className={`flex min-h-16 items-center justify-center gap-2 rounded-xl text-lg font-bold disabled:opacity-60 ${
                      escuchando ? 'bg-peligro text-white' : 'bg-marca text-sobre-marca'
                    }`}
                  >
                    {escuchando ? <Square aria-hidden size={24} /> : <Mic aria-hidden size={26} />}
                    {escuchando ? 'Le escucho… toque para parar' : 'Hablar'}
                  </button>
                )}
                <form onSubmit={alEscribir} className="flex gap-2">
                  <label className="sr-only" htmlFor="asistente-texto">
                    Escriba su pedido
                  </label>
                  <input
                    id="asistente-texto"
                    ref={campo}
                    enterKeyHint="send"
                    value={escrito}
                    onChange={(e) => setEscrito(e.target.value)}
                    placeholder="O escríbalo aquí"
                    maxLength={500}
                    className="min-h-12 flex-1 rounded-xl border-2 border-borde bg-superficie px-3"
                  />
                  <button type="submit" disabled={pensando || !escrito.trim()} aria-label="Enviar" className="flex h-12 w-12 items-center justify-center rounded-xl bg-marca text-sobre-marca disabled:opacity-50">
                    <Send aria-hidden size={22} />
                  </button>
                </form>
              </>
            ) : (
              <p className="rounded-xl bg-marca-suave p-3 font-bold">Sin señal el asistente no puede responder, pero puedo leerle la pantalla.</p>
            )}

            {vozDisponible && (
              <button
                type="button"
                onClick={escucharPantalla}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-marca bg-superficie font-bold text-marca"
              >
                {hablando ? <Square aria-hidden size={20} /> : <Volume2 aria-hidden size={22} />}
                {hablando ? 'Parar' : 'Escuchar esta pantalla'}
              </button>
            )}
          </section>
        </div>
      )}
    </>
  )
}
