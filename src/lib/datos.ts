import { conCache } from './offline'
import { supabase } from './supabase'
import type { FavorCercano, GrupoApoyo, LugarEmergencia, NumeroEmergencia, Oficio, PrestadorCercano } from './types'
import type { Punto } from './ubicacion'

export const RADIO_MAXIMO = 2000

export const leerOficios = () =>
  conCache<Oficio[]>('oficios', () => supabase.from('oficios').select('id, nombre, icono, es_critico_emergencia').order('nombre'))

export const leerNumeros = () =>
  conCache<NumeroEmergencia[]>('numeros', () => supabase.from('numeros_emergencia').select('id, nombre, numero').order('orden'))

export const leerGrupos = () =>
  conCache<GrupoApoyo[]>('grupos', () =>
    supabase.from('grupos_apoyo').select('id, nombre, tipo, telefono, direccion, lat, lng, fuente').eq('activo_en_emergencia', true).order('nombre'),
  )

export const leerLugares = () =>
  conCache<LugarEmergencia[]>('lugares', () =>
    supabase.from('lugares_emergencia').select('id, nombre, tipo, direccion, detalle, lat, lng, fuente').order('nombre'),
  )

// Siempre se trae el radio mayor y se filtra en el cliente: asi los filtros responden
// igual con y sin red, y la copia local sirve para cualquier combinacion.
export const leerPrestadores = (centro: Punto, soloEmergencia: boolean) =>
  conCache<PrestadorCercano[]>(`prestadores:${soloEmergencia}`, () =>
    supabase.rpc('prestadores_cercanos', {
      p_lat: centro.lat,
      p_lng: centro.lng,
      p_radio_m: RADIO_MAXIMO,
      p_oficio_id: null,
      p_solo_emergencia: soloEmergencia,
    }),
  )

export const leerFavores = (centro: Punto) =>
  conCache<FavorCercano[]>('favores', () => supabase.rpc('favores_cercanos', { p_lat: centro.lat, p_lng: centro.lng }))

/** Deja listo el directorio aunque el vecino nunca haya abierto esas pantallas. */
export async function precargarZona(centro: Punto) {
  await Promise.all([
    leerOficios(),
    leerNumeros(),
    leerGrupos(),
    leerLugares(),
    leerPrestadores(centro, false),
    leerPrestadores(centro, true),
    leerFavores(centro),
  ])
}
