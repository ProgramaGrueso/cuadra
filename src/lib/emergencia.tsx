import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { conCache, useEnLinea } from './offline'
import { usePerfil } from './sesion'
import { supabase } from './supabase'
import type { Emergencia } from './types'

const Contexto = createContext<Emergencia | null>(null)
const COLUMNAS = 'id, zona_id, activa, es_simulacro, mensaje'

// Un solo interruptor: toda la app lee este estado, y el tema rojo sale de data-modo.
export function EmergenciaProvider({ children }: { children: ReactNode }) {
  const { perfil } = usePerfil()
  const zonaId = perfil.zona_id
  const [emergencia, setEmergencia] = useState<Emergencia | null>(null)
  const enLinea = useEnLinea()

  const cargar = useCallback(async () => {
    if (zonaId === null) {
      setEmergencia(null)
      return
    }
    const { data, error } = await conCache<Emergencia>(`emergencia:${zonaId}`, () =>
      supabase.from('emergencias').select(COLUMNAS).eq('zona_id', zonaId).eq('activa', true).maybeSingle(),
    )
    if (!error) setEmergencia(data)
  }, [zonaId])

  useEffect(() => {
    void cargar()
    if (zonaId === null) return
    const canal = supabase
      .channel('estado-emergencia')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergencias', filter: `zona_id=eq.${zonaId}` },
        () => void cargar(),
      )
      .subscribe((estado) => {
        // Si la conexion se corto, pudo perderse un cambio: se vuelve a leer al reconectar.
        if (estado === 'SUBSCRIBED') void cargar()
      })
    return () => {
      void supabase.removeChannel(canal)
    }
  }, [cargar, zonaId, enLinea])

  const activa = emergencia !== null
  useEffect(() => {
    if (activa) document.documentElement.dataset.modo = 'emergencia'
    else delete document.documentElement.dataset.modo
    return () => {
      delete document.documentElement.dataset.modo
    }
  }, [activa])

  return <Contexto.Provider value={emergencia}>{children}</Contexto.Provider>
}

export function useEmergencia() {
  return useContext(Contexto)
}

export const TIPOS_REPORTE = {
  adulto_mayor: { nombre: 'Adulto mayor', plantilla: 'Adulto mayor vive solo y necesita que alguien lo visite.' },
  discapacidad: { nombre: 'Discapacidad', plantilla: 'Persona con discapacidad necesita ayuda para moverse.' },
  sin_agua: { nombre: 'Sin agua', plantilla: 'Familia sin agua desde la emergencia.' },
  herido_leve: { nombre: 'Herido leve', plantilla: 'Persona con una herida leve necesita primeros auxilios.' },
  otro: { nombre: 'Otro', plantilla: 'Vecino necesita ayuda.' },
} as const
export type TipoReporte = keyof typeof TIPOS_REPORTE

export const TIPOS_RECURSO = {
  agua: 'Agua',
  viveres: 'Víveres',
  medicina: 'Medicina',
  energia: 'Energía',
  refugio: 'Refugio',
  otro: 'Otro',
} as const
export type TipoRecurso = keyof typeof TIPOS_RECURSO

export const ESTADOS_REPORTE = {
  pendiente: 'Pendiente',
  en_atencion: 'En atención',
  atendido: 'Atendido',
} as const
