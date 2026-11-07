import { createClient } from '@supabase/supabase-js'

const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
// "mismo-origen": la pasarela de la demo sirve la app y la API bajo la URL del tunel.
const url = base === 'mismo-origen' ? window.location.origin : base
export const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configurado = Boolean(url && clave)

// Con senal debil la solicitud puede quedar colgada: se corta para caer a la copia local.
// Reenviar es seguro: lo que va por la cola tiene id propio y no se duplica.
const LIMITE_MS = 6000

const fetchConLimite: typeof fetch = (entrada, opciones) => {
  const control = new AbortController()
  const plazo = setTimeout(() => control.abort(), LIMITE_MS)
  opciones?.signal?.addEventListener('abort', () => control.abort())
  return fetch(entrada, { ...opciones, signal: control.signal }).finally(() => clearTimeout(plazo))
}

// Sin reintentos automaticos: sumaban 7 s por lectura antes de mostrar lo guardado.
// La cola y las pantallas ya vuelven a intentar cuando regresa la senal.
export const supabase = createClient(url ?? 'http://localhost', clave ?? 'sin-configurar', {
  db: { retry: false },
  global: { fetch: fetchConLimite },
})
