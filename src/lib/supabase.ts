import { createClient } from '@supabase/supabase-js'

const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
// "mismo-origen": la pasarela de la demo sirve la app y la API bajo la URL del tunel.
const url = base === 'mismo-origen' ? window.location.origin : base
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configurado = Boolean(url && clave)

export const supabase = createClient(url ?? 'http://localhost', clave ?? 'sin-configurar')
