import type { User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { guardarEnCache, leerDeCache } from './offline'
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
const CLAVE_SESION = 'sesion'

// Compartida para que dos cargas simultaneas no creen dos usuarios anonimos.
let usuarioEnCurso: Promise<User> | null = null

function obtenerUsuario(): Promise<User> {
  usuarioEnCurso ??= (async () => {
    const { data: actual, error: fallo } = await supabase.auth.getSession()
    // Un corte al renovar el token no debe crear otro usuario: el vecino perderia su identidad.
    if (fallo) throw fallo
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

  const cargar = useCallback(async (silencioso = false) => {
    let enSegundoPlano = silencioso
    if (!silencioso) {
      // Quien ya entro una vez arranca al instante con su copia y se actualiza por detras:
      // con senal debil, renovar la sesion puede tardar medio minuto.
      const copia = await leerDeCache<Extract<Estado, { fase: 'listo' }>>(CLAVE_SESION)
      if (copia) {
        setEstado(copia.valor)
        enSegundoPlano = true
      } else {
        setEstado({ fase: 'cargando' })
      }
    }
    if (enSegundoPlano && !navigator.onLine) return
    try {
      const usuario = await obtenerUsuario()
      const [perfil, zonas] = await Promise.all([
        supabase.from('users').select(COLUMNAS).eq('id', usuario.id).maybeSingle<Perfil>(),
        supabase.from('zonas').select('id, nombre, lat, lng, radio_m').order('id').returns<Zona[]>(),
      ])
      if (perfil.error) throw perfil.error
      if (zonas.error) throw zonas.error
      const listo = { fase: 'listo' as const, userId: usuario.id, perfil: perfil.data, zonas: zonas.data ?? [] }
      setEstado(listo)
      if (listo.perfil) await guardarEnCache(CLAVE_SESION, listo)
    } catch {
      if (enSegundoPlano) return
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
    // Al volver la senal se refresca sin desmontar lo que el vecino este escribiendo.
    const alVolver = () => void cargar(true)
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [cargar])

  const guardarPerfil = useCallback<Sesion['guardarPerfil']>(
    async (cambios) => {
      if (estado.fase !== 'listo') throw new Error('Sesión no lista')
      const consulta = estado.perfil
        ? supabase.from('users').update(cambios).eq('id', estado.userId)
        : supabase.from('users').insert({ ...cambios, id: estado.userId })
      const { data, error } = await consulta.select(COLUMNAS).single<Perfil>()
      if (error) throw error
      const listo = { ...estado, perfil: data }
      setEstado(listo)
      await guardarEnCache(CLAVE_SESION, listo)
    },
    [estado],
  )

  const perfil = estado.fase === 'listo' ? estado.perfil : null
  useEffect(() => {
    document.documentElement.dataset.letra = perfil?.letra_grande ? 'grande' : 'normal'
  }, [perfil?.letra_grande])

  return <Contexto.Provider value={{ estado, reintentar: () => void cargar(), guardarPerfil }}>{children}</Contexto.Provider>
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
  const zona = estado.zonas.find((z) => z.id === estado.perfil?.zona_id)
  const lat = estado.perfil.lat ?? zona?.lat ?? 0
  const lng = estado.perfil.lng ?? zona?.lng ?? 0
  // Estable entre renders: varios efectos dependen de este objeto.
  const centro = useMemo(() => ({ lat, lng }), [lat, lng])
  return { perfil: estado.perfil, zonas: estado.zonas, centro, guardarPerfil }
}
