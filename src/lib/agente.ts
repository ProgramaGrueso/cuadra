import { leerFavores, leerLugares, leerNumeros, leerOficios, leerPrestadores } from './datos'
import { TIPOS_RECURSO, TIPOS_REPORTE, type TipoRecurso, type TipoReporte } from './emergencia'
import { CATEGORIAS } from './favores'
import { publicar } from './offline'
import { clave, supabase } from './supabase'
import type { Emergencia, Perfil } from './types'
import type { Punto } from './ubicacion'
import { textoDePantalla } from './voz'

export interface Mensaje {
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
  tool_call_id?: string
}

export interface Contexto {
  perfil: Perfil
  centro: Punto
  emergencia: Emergencia | null
  ruta: string
  navegar: (ruta: string) => void
  guardarPerfil: (cambios: Partial<Perfil>) => Promise<void>
  /** Muestra la pregunta con botones Si/No y resuelve con la eleccion. */
  confirmar: (pregunta: string) => Promise<boolean>
}

/** Avisa a la pantalla abierta que vuelva a leer sus datos (el asistente publico algo). */
export const EVENTO_DATOS = 'cuadra:datos-cambiaron'
const refrescar = () => window.dispatchEvent(new Event(EVENTO_DATOS))

const PANTALLAS: Record<string, string> = {
  servicios: '/',
  favores: '/favores',
  perfil: '/perfil',
  ofrezco_oficio: '/ofrezco-oficio',
  pedir_favor: '/publicar/pido',
  ofrecer_favor: '/publicar/ofrezco',
  reportar_vecino: '/reportar',
  tengo_recurso: '/recurso/tengo',
  necesito_recurso: '/recurso/necesito',
  tutorial: '/tutorial',
}

const metros = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`)
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

type Args = Record<string, unknown>
const texto = (v: unknown, n = 500) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

function soloEnEmergencia(ctx: Contexto) {
  return ctx.emergencia ? null : { error: 'No hay una emergencia activa en su zona.' }
}

async function ejecutar(nombre: string, a: Args, ctx: Contexto): Promise<unknown> {
  switch (nombre) {
    case 'leer_pantalla': {
      const main = document.querySelector('main')
      return { ruta: ctx.ruta, texto: main ? textoDePantalla(main).slice(0, 3000) : '' }
    }
    case 'ir_a': {
      const ruta = PANTALLAS[texto(a.pantalla)]
      if (!ruta) return { error: 'Pantalla desconocida.' }
      ctx.navegar(ruta)
      return { ok: true }
    }
    case 'buscar_servicios': {
      const { data } = await leerPrestadores(ctx.centro, Boolean(a.solo_emergencia))
      const buscado = sinTildes(texto(a.oficio))
      let lista = data ?? []
      if (buscado) {
        const { data: oficios } = await leerOficios()
        const ids = new Set((oficios ?? []).filter((o) => sinTildes(o.nombre).includes(buscado) || buscado.includes(sinTildes(o.nombre))).map((o) => o.id))
        lista = lista.filter((p) => ids.has(p.oficio_id) || sinTildes(`${p.oficio} ${p.descripcion}`).includes(buscado))
      }
      return lista
        .sort((x, y) => x.distancia_m - y.distancia_m)
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          nombre: p.nombre,
          oficio: p.oficio,
          descripcion: p.descripcion.slice(0, 160),
          tarifa: p.tarifa_ref,
          distancia: metros(p.distancia_m),
          vistos_buenos: p.vistos_buenos,
          recomendado_por_vecinos: p.sello,
          tiene_whatsapp: p.tiene_whatsapp,
        }))
    }
    case 'abrir_prestador': {
      ctx.navegar(`/prestador/${encodeURIComponent(texto(a.id, 60))}`)
      return { ok: true }
    }
    case 'contactar_prestador': {
      const id = texto(a.id, 60)
      const { data: ficha } = await supabase.rpc('ficha_prestador', { p_id: id, p_lat: ctx.centro.lat, p_lng: ctx.centro.lng }).maybeSingle<{ nombre: string; oficio: string }>()
      if (!ficha) return { error: 'No encontré a ese prestador.' }
      const { data: telefono } = await supabase.rpc('contacto_prestador', { p_prestador_id: id })
      if (!telefono) return { error: `${ficha.nombre} no tiene WhatsApp registrado.` }
      if (!(await ctx.confirmar(`¿Abro WhatsApp para escribirle a ${ficha.nombre}?`))) return { cancelado: true }
      const mensaje = texto(a.mensaje) || `Hola ${ficha.nombre}, te encontré en Cuadra. Necesito ayuda con ${ficha.oficio.toLowerCase()}.`
      window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener')
      return { ok: true }
    }
    case 'ver_favores': {
      const { data } = await leerFavores(ctx.centro)
      return (data ?? [])
        .filter((f) => f.estado === 'abierto' && (!a.tipo || f.tipo === a.tipo))
        .slice(0, 8)
        .map((f) => ({ id: f.id, tipo: f.tipo, categoria: f.categoria_id, texto: f.texto, urgente: f.urgente, autor: f.autor, distancia: metros(f.distancia_m), es_mio: f.autor_id === ctx.perfil.id }))
    }
    case 'publicar_favor': {
      const tipo = a.tipo === 'ofrezco' ? 'ofrezco' : 'pido'
      const categoria = CATEGORIAS.find((c) => c.id === a.categoria) ?? CATEGORIAS[1]
      const mensaje = texto(a.texto, 280)
      if (mensaje.length < 5) return { error: 'Falta el texto del favor.' }
      const urgente = Boolean(a.urgente)
      if (!(await ctx.confirmar(`¿Publico este favor? ${tipo === 'pido' ? 'Pido' : 'Ofrezco'}: "${mensaje}"${urgente ? ' (urgente)' : ''}`))) return { cancelado: true }
      const id = crypto.randomUUID()
      const r = await publicar(
        'favor',
        id,
        { id, tipo, categoria_id: categoria.id, texto: mensaje, urgente, lat: ctx.centro.lat, lng: ctx.centro.lng, autor_id: ctx.perfil.id },
        mensaje,
      )
      ctx.navegar('/favores')
      refrescar()
      return { ok: true, estado: r === 'en-cola' ? 'Sin señal: se enviará al volver la conexión.' : 'Publicado.' }
    }
    case 'ayudar_con_favor': {
      const id = texto(a.favor_id, 60)
      if (!(await ctx.confirmar('¿Le aviso al vecino que usted lo ayudará con este favor?'))) return { cancelado: true }
      const { error } = await supabase.rpc('tomar_favor', { p_favor_id: id })
      if (error) return { error: 'No se pudo tomar ese favor. Puede que ya lo haya tomado otra persona.' }
      ctx.navegar('/favores')
      refrescar()
      return { ok: true }
    }
    case 'estado_emergencia': {
      const [{ data: numeros }, { data: lugares }] = await Promise.all([leerNumeros(), leerLugares()])
      return {
        activa: Boolean(ctx.emergencia),
        mensaje: ctx.emergencia?.mensaje ?? null,
        es_simulacro: ctx.emergencia?.es_simulacro ?? false,
        numeros: (numeros ?? []).map((n) => `${n.nombre}: ${n.numero}`),
        puntos_de_reunion: (lugares ?? []).filter((l) => l.tipo === 'punto_reunion').map((l) => `${l.nombre}${l.direccion ? ` (${l.direccion})` : ''}. ${l.detalle ?? ''}`),
      }
    }
    case 'reportar_vecino': {
      const falta = soloEnEmergencia(ctx)
      if (falta) return falta
      const tipo = (Object.keys(TIPOS_REPORTE).includes(texto(a.tipo)) ? a.tipo : 'otro') as TipoReporte
      const descripcion = texto(a.descripcion, 280) || TIPOS_REPORTE[tipo].plantilla
      const direccion = texto(a.direccion, 160)
      if (!(await ctx.confirmar(`¿Envío este reporte? ${TIPOS_REPORTE[tipo].nombre}: "${descripcion}"${direccion ? `. Dirección: ${direccion}` : ''}`))) return { cancelado: true }
      const id = crypto.randomUUID()
      const r = await publicar(
        'reporte',
        id,
        { p_id: id, p_emergencia_id: ctx.emergencia!.id, p_tipo: tipo, p_descripcion: descripcion, p_lat: ctx.centro.lat, p_lng: ctx.centro.lng, p_direccion: direccion },
        `${TIPOS_REPORTE[tipo].nombre}: ${descripcion}`,
      )
      ctx.navegar('/favores')
      refrescar()
      return { ok: true, estado: r === 'en-cola' ? 'Sin señal: se enviará al volver la conexión.' : 'Enviado a los voluntarios.' }
    }
    case 'publicar_recurso': {
      const falta = soloEnEmergencia(ctx)
      if (falta) return falta
      const accion = a.accion === 'tengo' ? 'tengo' : 'necesito'
      const tipo = (Object.keys(TIPOS_RECURSO).includes(texto(a.tipo)) ? a.tipo : 'otro') as TipoRecurso
      const cantidad = Math.max(1, Math.min(99, Math.round(Number(a.cantidad) || 1)))
      const detalle = texto(a.detalle, 200) || null
      const resumen = `${accion === 'tengo' ? 'Tengo' : 'Necesito'} ${TIPOS_RECURSO[tipo].toLowerCase()} (${cantidad})`
      if (!(await ctx.confirmar(`¿Publico esto? ${resumen}${detalle ? `: ${detalle}` : ''}`))) return { cancelado: true }
      const id = crypto.randomUUID()
      const r = await publicar(
        'recurso',
        id,
        { id, emergencia_id: ctx.emergencia!.id, tipo, accion, cantidad, detalle, lat: ctx.centro.lat, lng: ctx.centro.lng, user_id: ctx.perfil.id },
        resumen,
      )
      ctx.navegar('/favores?vista=recursos')
      refrescar()
      return { ok: true, estado: r === 'en-cola' ? 'Sin señal: se enviará al volver la conexión.' : 'Publicado.' }
    }
    case 'marcar_estoy_bien': {
      const falta = soloEnEmergencia(ctx)
      if (falta) return falta
      if (!(await ctx.confirmar('¿Aviso a sus vecinos que usted está bien?'))) return { cancelado: true }
      const r = await publicar('checkin', `checkin:${ctx.emergencia!.id}`, { p_emergencia_id: ctx.emergencia!.id }, 'Estoy bien')
      refrescar()
      return { ok: true, estado: r === 'en-cola' ? 'Sin señal: se enviará al volver la conexión.' : 'Listo.' }
    }
    case 'llamar': {
      const { data: numeros } = await leerNumeros()
      const numero = texto(a.numero, 15).replace(/\D/g, '')
      const destino = (numeros ?? []).find((n) => n.numero === numero)
      if (!destino) return { error: 'Solo puedo llamar a los números de emergencia de la app.' }
      if (!(await ctx.confirmar(`¿Llamo a ${destino.nombre} (${destino.numero})?`))) return { cancelado: true }
      window.location.href = `tel:${destino.numero}`
      return { ok: true }
    }
    case 'letra_grande': {
      await ctx.guardarPerfil({ letra_grande: Boolean(a.activar) })
      return { ok: true }
    }
    default:
      return { error: `Herramienta desconocida: ${nombre}` }
  }
}

async function pedirAlServidor(mensajes: Mensaje[], ctx: Contexto): Promise<Mensaje> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token || !clave) throw new Error('Su sesión no está lista.')
  const r = await fetch('/agente/v1/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: clave, authorization: `Bearer ${token}` },
    body: JSON.stringify({
      mensajes,
      contexto: { nombre: ctx.perfil.nombre, ruta: ctx.ruta, emergencia: Boolean(ctx.emergencia), verificado: ctx.perfil.verificado },
    }),
    signal: AbortSignal.timeout(40_000),
  })
  const cuerpo = (await r.json().catch(() => ({}))) as { mensaje?: Mensaje; error?: string }
  if (!r.ok || !cuerpo.mensaje) throw new Error(cuerpo.error ?? 'El asistente no respondió.')
  return cuerpo.mensaje
}

/** Un turno completo: pregunta al modelo, ejecuta sus herramientas y repite hasta que conteste. */
export async function conversar(historial: Mensaje[], ctx: Contexto, alPaso?: (h: Mensaje[]) => void): Promise<Mensaje[]> {
  const mensajes = [...historial]
  for (let i = 0; i < 6; i++) {
    const respuesta = await pedirAlServidor(mensajes, ctx)
    mensajes.push(respuesta)
    alPaso?.(mensajes)
    if (!respuesta.tool_calls?.length) return mensajes
    for (const llamada of respuesta.tool_calls) {
      let args: Args = {}
      try {
        args = JSON.parse(llamada.function.arguments || '{}') as Args
      } catch {
        // Argumentos rotos: la herramienta respondera con su error.
      }
      let resultado: unknown
      try {
        resultado = await ejecutar(llamada.function.name, args, ctx)
      } catch {
        resultado = { error: 'No se pudo completar. Puede que no haya conexión.' }
      }
      mensajes.push({ role: 'tool', tool_call_id: llamada.id, content: JSON.stringify(resultado) })
    }
    alPaso?.(mensajes)
  }
  mensajes.push({ role: 'assistant', content: 'Disculpe, no pude terminar. ¿Me lo puede pedir de otra forma?' })
  return mensajes
}
