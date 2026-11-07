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

export const useEscucharActivo = () => useSyncExternalStore(suscribir, () => preferencia && vozDisponible)
export const useHablando = () => useSyncExternalStore(suscribir, () => hablando)

function elegirVoz() {
  const voces = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'))
  const orden = ['es-pe', 'es-419', 'es-us', 'es-mx']
  for (const lang of orden) {
    const voz = voces.find((v) => v.lang.toLowerCase().replace('_', '-') === lang)
    if (voz) return voz
  }
  return voces[0] ?? null
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
  speechSynthesis.cancel()
  hablando = false
  avisar()
}

export function leer(texto: string) {
  if (!vozDisponible || !texto.trim()) return
  speechSynthesis.cancel()
  const voz = elegirVoz()
  const partes = partir(texto)
  partes.forEach((parte, i) => {
    const u = new SpeechSynthesisUtterance(parte)
    u.lang = voz?.lang ?? 'es-PE'
    if (voz) u.voice = voz
    u.rate = 0.9
    if (i === partes.length - 1) {
      u.onend = () => {
        hablando = false
        avisar()
      }
    }
    u.onerror = () => {
      hablando = false
      avisar()
    }
    speechSynthesis.speak(u)
  })
  hablando = true
  avisar()
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
