import type { User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Perfil, Zona } from './types'

type Estado =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; userId: string; perfil: Perfil | null; zonas: Zona[] }

interface Sesion {
  estado: Estado
  reintentar: () => void
  guardarPerfil: (cambios: Partial<Omit<Perfil, 'id' | 'verificado'>>) => Promise<void>
}

const Contexto = createContext<Sesion | null>(null)
const COLUMNAS = 'id, nombre, telefono, lat, lng, zona_id, verificado, letra_grande'

// Compartida para que dos cargas simultaneas no creen dos usuarios anonimos.
let usuarioEnCurso: Promise<User> | null = null

function obtenerUsuario(): Promise<User> {
  usuarioEnCurso ??= (async () => {
    const { data: actual } = await supabase.auth.getSession()
    if (actual.session) return actual.session.user
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    if (!data.user) throw new Error('Sin usuario')
    return data.user
  })().finally(() => {
    usuarioEnCurso = null
  })
  return usuarioEnCurso
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' })

  const cargar = useCallback(async () => {
    setEstado({ fase: 'cargando' })
    try {
      const usuario = await obtenerUsuario()
      const [perfil, zonas] = await Promise.all([
        supabase.from('users').select(COLUMNAS).eq('id', usuario.id).maybeSingle<Perfil>(),
        supabase.from('zonas').select('id, nombre, lat, lng, radio_m').order('id').returns<Zona[]>(),
      ])
      if (perfil.error) throw perfil.error
      if (zonas.error) throw zonas.error
      setEstado({ fase: 'listo', userId: usuario.id, perfil: perfil.data, zonas: zonas.data ?? [] })
    } catch {
      setEstado({
        fase: 'error',
        mensaje: navigator.onLine
          ? 'No pudimos conectar con Cuadra. Inténtalo otra vez.'
          : 'No tienes conexión. Conéctate para entrar por primera vez.',
      })
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const guardarPerfil = useCallback<Sesion['guardarPerfil']>(
    async (cambios) => {
      if (estado.fase !== 'listo') throw new Error('Sesión no lista')
      const consulta = estado.perfil
        ? supabase.from('users').update(cambios).eq('id', estado.userId)
        : supabase.from('users').insert({ ...cambios, id: estado.userId })
      const { data, error } = await consulta.select(COLUMNAS).single<Perfil>()
      if (error) throw error
      setEstado({ ...estado, perfil: data })
    },
    [estado],
  )

  const perfil = estado.fase === 'listo' ? estado.perfil : null
  useEffect(() => {
    document.documentElement.dataset.letra = perfil?.letra_grande ? 'grande' : 'normal'
  }, [perfil?.letra_grande])

  return <Contexto.Provider value={{ estado, reintentar: cargar, guardarPerfil }}>{children}</Contexto.Provider>
}

export function useSesion() {
  const sesion = useContext(Contexto)
  if (!sesion) throw new Error('useSesion requiere SesionProvider')
  return sesion
}

/** Para pantallas que solo se muestran con un perfil ya creado. */
export function usePerfil() {
  const { estado, guardarPerfil } = useSesion()
  if (estado.fase !== 'listo' || !estado.perfil) throw new Error('Perfil no disponible')
  return { perfil: estado.perfil, zonas: estado.zonas, guardarPerfil }
}
