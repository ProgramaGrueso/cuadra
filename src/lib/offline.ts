import Dexie, { liveQuery, type Table } from 'dexie'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { supabase } from './supabase'

export type TipoEnvio = 'favor' | 'recurso' | 'reporte' | 'checkin'

export interface Envio {
  id: string
  tipo: TipoEnvio
  args: Record<string, unknown>
  resumen: string
  ts: number
}

interface Respuesta {
  data?: unknown
  error: { code?: string; message?: string } | null
  status?: number
}

class BaseLocal extends Dexie {
  cache!: Table<{ clave: string; valor: unknown }, string>
  cola!: Table<Envio, string>

  constructor() {
    super('cuadra')
    this.version(1).stores({ cache: 'clave', cola: 'id, ts' })
  }
}

const base = new BaseLocal()

// 401: el token vencio sin red; 502+: el tunel o el PC estan caidos. Se reintenta despues.
export function esFalloDeRed(status?: number) {
  return !navigator.onLine || status === undefined || status === 0 || status === 401 || status >= 502
}

export async function guardarEnCache(clave: string, valor: unknown) {
  try {
    await base.cache.put({ clave, valor })
  } catch {
    // Sin IndexedDB (modo privado) la app sigue funcionando, solo sin copia local.
  }
}

export async function leerDeCache<T>(clave: string): Promise<{ valor: T } | null> {
  try {
    const fila = await base.cache.get(clave)
    return fila ? { valor: fila.valor as T } : null
  } catch {
    return null
  }
}

const SIN_RED: Respuesta = { error: { message: 'sin red' }, status: 0 }
const PLAZO_MS = 8000

// Renovar un token vencido reintenta por su cuenta unos 26 s, fuera del alcance del fetch.
// Si llega tarde no pasa nada: las lecturas se descartan y los envios no se duplican.
function pedir(consulta: () => PromiseLike<Respuesta>): Promise<Respuesta> {
  if (!navigator.onLine) return Promise.resolve(SIN_RED)
  const plazo = new Promise<Respuesta>((resolver) => setTimeout(() => resolver(SIN_RED), PLAZO_MS))
  return Promise.race([Promise.resolve(consulta()), plazo]).catch(() => SIN_RED)
}

/** Lee del servidor y guarda copia; si no hay red, responde con la ultima copia. */
export async function conCache<T>(
  clave: string,
  consulta: () => PromiseLike<Respuesta>,
): Promise<{ data: T | null; error: boolean; desdeCache: boolean }> {
  const respuesta = await pedir(consulta)
  if (!respuesta.error) {
    const data = (respuesta.data ?? null) as T | null
    await guardarEnCache(clave, data)
    return { data, error: false, desdeCache: false }
  }
  if (esFalloDeRed(respuesta.status)) {
    const copia = await leerDeCache<T | null>(clave)
    if (copia) return { data: copia.valor, error: false, desdeCache: true }
  }
  return { data: null, error: true, desdeCache: false }
}

const EJECUTORES: Record<TipoEnvio, (args: Record<string, unknown>) => PromiseLike<Respuesta>> = {
  favor: (args) => supabase.from('favores').insert(args),
  recurso: (args) => supabase.from('recursos_criticos').insert(args),
  reporte: (args) => supabase.rpc('crear_reporte', args),
  checkin: (args) => supabase.rpc('marcar_checkin', args),
}

// Todos los envios usan un id del cliente: reintentar nunca duplica.
const yaEnviado = (r: Respuesta) => !r.error || r.error.code === '23505'

/** Envia ya si puede; sin red lo deja en la cola. Lanza el error si el servidor lo rechaza. */
export async function publicar(
  tipo: TipoEnvio,
  id: string,
  args: Record<string, unknown>,
  resumen: string,
): Promise<'enviado' | 'en-cola'> {
  const respuesta = await pedir(() => EJECUTORES[tipo](args))
  if (yaEnviado(respuesta)) return 'enviado'
  if (!esFalloDeRed(respuesta.status)) throw respuesta.error
  await base.cola.put({ id, tipo, args, resumen, ts: Date.now() })
  return 'en-cola'
}

export const EVENTO_RECHAZO = 'cuadra:envio-rechazado'
let sincronizando = false

export async function sincronizar() {
  if (sincronizando || !navigator.onLine) return
  sincronizando = true
  try {
    for (const envio of await base.cola.orderBy('ts').toArray()) {
      const respuesta = await pedir(() => EJECUTORES[envio.tipo](envio.args))
      if (!yaEnviado(respuesta)) {
        if (esFalloDeRed(respuesta.status)) break
        // Un "Estoy bien" de una emergencia que ya termino no necesita aviso.
        if (envio.tipo !== 'checkin') window.dispatchEvent(new CustomEvent(EVENTO_RECHAZO, { detail: envio.resumen }))
      }
      await base.cola.delete(envio.id)
    }
  } catch {
    // Queda en la cola para el siguiente intento.
  } finally {
    sincronizando = false
  }
}

function suscribirConexion(aviso: () => void) {
  window.addEventListener('online', aviso)
  window.addEventListener('offline', aviso)
  return () => {
    window.removeEventListener('online', aviso)
    window.removeEventListener('offline', aviso)
  }
}

export function useEnLinea() {
  return useSyncExternalStore(suscribirConexion, () => navigator.onLine)
}

export function useCola() {
  const [cola, setCola] = useState<Envio[]>([])
  useEffect(() => {
    const suscripcion = liveQuery(() => base.cola.orderBy('ts').toArray()).subscribe({
      next: setCola,
      error: () => setCola([]),
    })
    return () => suscripcion.unsubscribe()
  }, [])
  return cola
}
