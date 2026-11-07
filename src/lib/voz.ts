import { useSyncExternalStore } from 'react'

// Lectura en voz alta con la voz del propio telefono (speechSynthesis): no usa red ni claves.
export const vozDisponible = typeof window !== 'undefined' && 'speechSynthesis' in window

const CLAVE = 'cuadra.escuchar'
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((o) => o())

// Preferencia del telefono, activa por defecto: el boton es para quien no busca ajustes.
function leerPreferencia() {
  try {
    return localStorage.getItem(CLAVE) !== '0'
  } catch {
    return true
  }
}

export function cambiarEscuchar(activo: boolean) {
  try {
    localStorage.setItem(CLAVE, activo ? '1' : '0')
  } catch {
    // Sin almacenamiento la preferencia dura hasta recargar.
  }
  preferencia = activo
  avisar()
}

let preferencia = leerPreferencia()
let hablando = false

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export const useEscucharActivo = () => useSyncExternalStore(suscribir, () => preferencia)
export const useHablando = () => useSyncExternalStore(suscribir, () => hablando)

// Por que no se oye la voz: null si todo bien. Se muestra en el asistente.
export type ProblemaVoz = 'sin-espanol' | 'muda' | null
let problema: ProblemaVoz = null
function marcarProblema(p: ProblemaVoz) {
  if (p === problema) return
  problema = p
  avisar()
}
export const useProblemaVoz = () => useSyncExternalStore(suscribir, () => problema)
export const MENSAJE_VOZ: Record<Exclude<ProblemaVoz, null>, string> = {
  'sin-espanol': 'Este navegador no tiene voz en español, así que no le leo en voz alta. Puede leer las respuestas aquí.',
  muda: 'Este navegador no puede hablar. Puede leer las respuestas aquí.',
}

// Firefox y Chrome cargan las voces despues de abrir la pagina: getVoices() empieza vacio.
let voces: Promise<SpeechSynthesisVoice[]> | null = null
function cargarVoces() {
  const ya = speechSynthesis.getVoices()
  if (ya.length) return Promise.resolve(ya)
  voces ??= new Promise((resolver) => {
    const listo = () => {
      speechSynthesis.removeEventListener('voiceschanged', listo)
      voces = null
      resolver(speechSynthesis.getVoices())
    }
    speechSynthesis.addEventListener('voiceschanged', listo)
    setTimeout(listo, 1500)
  })
  return voces
}

function elegirVoz(todas: SpeechSynthesisVoice[]) {
  const espanol = todas.filter((v) => v.lang.toLowerCase().startsWith('es'))
  const orden = ['es-pe', 'es-419', 'es-us', 'es-mx']
  for (const lang of orden) {
    const voz = espanol.find((v) => v.lang.toLowerCase().replace('_', '-') === lang)
    if (voz) return voz
  }
  return espanol[0] ?? null
}

// Chrome corta las frases largas: se lee por partes.
function partir(texto: string) {
  const frases = texto.match(/[^.!?\n]+[.!?]?/g) ?? [texto]
  const partes: string[] = []
  let actual = ''
  for (const f of frases.map((x) => x.trim()).filter(Boolean)) {
    if ((actual + ' ' + f).length > 180 && actual) {
      partes.push(actual)
      actual = f
    } else actual = actual ? `${actual} ${f}` : f
  }
  if (actual) partes.push(actual)
  return partes
}

export function parar() {
  if (!vozDisponible) return
  turno++
  speechSynthesis.cancel()
  hablando = false
  avisar()
}

let turno = 0

export function leer(texto: string) {
  if (!vozDisponible || !texto.trim()) return
  speechSynthesis.cancel()
  const mio = ++turno
  const partes = partir(texto)
  hablando = true
  avisar()
  const terminar = () => {
    if (mio !== turno) return
    hablando = false
    avisar()
  }
  // Chrome en Android descarta lo que se pide justo despues de cancel(): se espera un instante.
  const espera = new Promise((r) => setTimeout(r, 150))
  void Promise.all([cargarVoces(), espera]).then(([todas]) => {
    if (mio !== turno) return
    const voz = elegirVoz(todas)
    // Con voces pero ninguna en espanol, Firefox leeria con acento ingles: mejor no leer.
    if (!voz && todas.length) {
      marcarProblema('sin-espanol')
      return terminar()
    }
    // Sin lista de voces (Chromium en Linux, algunos Android) se intenta igual con el idioma;
    // si no empieza a hablar en unos segundos, el navegador no tiene voz.
    let empezo = false
    // Se marca aunque la persona ya haya cortado: es del navegador, no de esta frase.
    // Si fue un falso aviso, el siguiente onstart lo borra.
    const vigia = setTimeout(() => {
      if (empezo) return
      marcarProblema('muda')
      if (mio !== turno) return
      speechSynthesis.cancel()
      terminar()
    }, 3000)
    speechSynthesis.resume()
    partes.forEach((parte, i) => {
      const u = new SpeechSynthesisUtterance(parte)
      u.lang = voz?.lang ?? 'es-PE'
      if (voz) u.voice = voz
      u.rate = 0.9
      if (i === 0)
        u.onstart = () => {
          empezo = true
          clearTimeout(vigia)
          marcarProblema(null)
        }
      if (i === partes.length - 1) u.onend = terminar
      u.onerror = (e) => {
        // "interrupted" y "canceled" son de la propia app al cortar la voz.
        if (e.error !== 'interrupted' && e.error !== 'canceled' && !empezo) {
          clearTimeout(vigia)
          marcarProblema('muda')
        }
        terminar()
      }
      speechSynthesis.speak(u)
    })
  })
}

const LEGIBLES = 'h1, h2, h3, p, li, label, a, button, [role="status"], [role="alert"]'

// Texto visible de la pantalla, en orden y sin repetir: se salta el mapa y lo que ya contiene otro bloque leido.
export function textoDePantalla(raiz: Element) {
  const bloques: string[] = []
  raiz.querySelectorAll<HTMLElement>(LEGIBLES).forEach((el) => {
    if (el.closest('.leaflet-container, [aria-hidden="true"], [data-no-leer]')) return
    if (el.parentElement?.closest(LEGIBLES) && raiz.contains(el.parentElement.closest(LEGIBLES))) return
    if (el.offsetParent === null) return
    const t = (el.getAttribute('aria-label') || el.innerText).replace(/\s+/g, ' ').trim()
    if (t) bloques.push(/[.!?:]$/.test(t) ? t : `${t}.`)
  })
  return bloques.join(' ')
}

interface Reconocimiento {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onaudiostart: (() => void) | null
  start: () => void
  abort: () => void
}
type ConstructorReconocimiento = new () => Reconocimiento

export function reconocedor() {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: ConstructorReconocimiento; webkitSpeechRecognition?: ConstructorReconocimiento }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/** Lo que siempre funciona: el dictado del teclado del telefono (Gboard, iPhone, Samsung). */
export const PISTA_TECLADO = 'También puede tocar el cuadro de texto y luego el micrófono de su teclado.'

// En Android, el dictado solo funciona de verdad en Chrome. El navegador de Oppo (HeyTap), el de
// Xiaomi, los de Facebook o Instagram y las vistas web dentro de otras apps anuncian el dictado
// pero start() no abre el microfono: la persona toca "Hablar" y no pasa nada.
export function navegadorLimitado() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (!/Android/i.test(ua)) return false
  return /; wv\)|HeyTap|OppoBrowser|MiuiBrowser|SamsungBrowser|FBAN|FBAV|Instagram|Line\/|OPR\/|EdgA|YaBrowser|UCBrowser|Firefox/i.test(ua) || !/Chrome\//.test(ua)
}

/** Abre esta misma pagina en Chrome (Android). Si Chrome no esta, Android abre el navegador normal. */
export function enlaceChrome() {
  const { host, pathname, search } = window.location
  const respaldo = encodeURIComponent(window.location.href)
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${respaldo};end`
}

// Cada error del navegador, en palabras de la persona. "pista" = sugerir el microfono del teclado.
function mensajeDeError(error: string): { texto: string; pista: boolean } {
  switch (error) {
    case 'not-allowed':
      return { texto: 'El micrófono está bloqueado. Toque el candado junto a la dirección y permita el micrófono.', pista: true }
    case 'service-not-allowed':
      return { texto: 'Este navegador no deja dictar.', pista: true }
    case 'audio-capture':
      return { texto: 'No encuentro el micrófono del teléfono.', pista: true }
    case 'network':
      return { texto: 'El dictado necesita internet y no pudo conectarse.', pista: true }
    case 'language-not-supported':
      return { texto: 'Este teléfono no reconoce el español para dictar.', pista: true }
    case 'no-speech':
      return { texto: 'No le escuché. Toque Hablar y hable cerca del teléfono.', pista: false }
    default:
      return { texto: 'No pude escuchar.', pista: true }
  }
}

export class ErrorEscucha extends Error {
  pista: boolean
  constructor(texto: string, pista = false) {
    super(texto)
    this.pista = pista
  }
}

/** Escucha una frase. Devuelve el texto, o lanza un ErrorEscucha listo para mostrar. Llama a .abort() para cortar. */
export function escucharFrase(): { promesa: Promise<string>; abort: () => void } {
  const R = reconocedor()
  if (!R) return { promesa: Promise.reject(new ErrorEscucha('Este navegador no permite dictar.', true)), abort: () => {} }
  const sonaba = vozDisponible && (speechSynthesis.speaking || speechSynthesis.pending)
  parar()
  const r = new R()
  r.lang = 'es-PE'
  r.interimResults = false
  let cortadoPorLaPersona = false
  let cancelado = false
  let vigia: ReturnType<typeof setTimeout> | undefined
  const promesa = new Promise<string>((resolver, rechazar) => {
    let texto = ''
    const fallar = (texto: string, pista = false) => {
      clearTimeout(vigia)
      rechazar(new ErrorEscucha(texto, pista))
    }
    r.onaudiostart = () => clearTimeout(vigia)
    r.onresult = (e) => {
      texto = e.results[0]?.[0]?.transcript?.trim() ?? ''
    }
    r.onerror = (e) => {
      if (e.error === 'aborted') return fallar(cortadoPorLaPersona ? '' : 'Se cortó el micrófono. Toque Hablar otra vez.')
      const m = mensajeDeError(e.error)
      fallar(m.texto, m.pista)
    }
    r.onend = () => {
      clearTimeout(vigia)
      if (texto) resolver(texto)
      else fallar(cortadoPorLaPersona ? '' : 'No le escuché. Toque Hablar otra vez.')
    }
    // Si la voz estaba sonando, el micrófono de Android falla si arranca al mismo tiempo.
    setTimeout(
      () => {
        if (cancelado) return fallar('')
        try {
          r.start()
        } catch {
          return fallar('No pude abrir el micrófono.', true)
        }
        // Algunos telefonos (sin la app de Google, navegadores dentro de otras apps) aceptan
        // start() pero nunca abren el microfono: sin aviso la persona cree que la ignoran.
        vigia = setTimeout(() => {
          cortadoPorLaPersona = true
          r.abort()
          fallar('El micrófono no respondió.', true)
        }, 6000)
      },
      sonaba ? 400 : 0,
    )
  })
  return {
    promesa,
    abort: () => {
      cortadoPorLaPersona = true
      cancelado = true
      clearTimeout(vigia)
      r.abort()
    },
  }
}
