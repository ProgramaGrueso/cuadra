export interface Zona {
  id: number
  nombre: string
  lat: number
  lng: number
  radio_m: number
}

export interface Perfil {
  id: string
  nombre: string
  telefono: string | null
  lat: number | null
  lng: number | null
  zona_id: number | null
  verificado: boolean
  letra_grande: boolean
}

export interface Oficio {
  id: number
  nombre: string
  icono: string
  es_critico_emergencia: boolean
}

export interface PrestadorCercano {
  id: string
  nombre: string
  oficio_id: number
  oficio: string
  icono: string
  descripcion: string
  tarifa_ref: string | null
  disponible_emergencia: boolean
  lat: number
  lng: number
  distancia_m: number
  vistos_buenos: number
  sello: boolean
  favores_hechos: number
  tiene_whatsapp: boolean
}

export interface Ficha extends PrestadorCercano {
  es_mio: boolean
  mi_visto_bueno: boolean
}

export interface ComentarioVisto {
  nombre: string
  comentario: string
  ts: string
}

export interface FavorCercano {
  id: string
  tipo: 'pido' | 'ofrezco'
  categoria_id: string
  texto: string
  urgente: boolean
  estado: 'abierto' | 'en_curso' | 'cumplido'
  distancia_m: number
  ts: string
  autor_id: string
  autor: string
  autor_favores: number
  autor_tiene_whatsapp: boolean
  ayudante_id: string | null
  ayudante: string | null
}

export interface Emergencia {
  id: string
  zona_id: number
  activa: boolean
  es_simulacro: boolean
  mensaje: string
}

export interface Reporte {
  id: string
  tipo: 'adulto_mayor' | 'discapacidad' | 'sin_agua' | 'herido_leve' | 'otro'
  descripcion: string
  lat_aprox: number
  lng_aprox: number
  estado: 'pendiente' | 'en_atencion' | 'atendido'
  reportado_por: string | null
  atendido_por: string | null
  ts: string
}

export interface RecursoCercano {
  id: string
  tipo: 'agua' | 'viveres' | 'medicina' | 'energia' | 'refugio' | 'otro'
  accion: 'tengo' | 'necesito'
  cantidad: number
  detalle: string | null
  distancia_m: number
  nombre: string
  es_mio: boolean
}

export interface CruceRecurso {
  mi_recurso_id: string
  tipo: RecursoCercano['tipo']
  mi_accion: 'tengo' | 'necesito'
  otro_id: string
  otro_nombre: string
  otro_cantidad: number
  otro_detalle: string | null
  distancia_m: number
  otro_telefono: string | null
}

export interface NumeroEmergencia {
  id: number
  nombre: string
  numero: string
}

export interface GrupoApoyo {
  id: string
  nombre: string
  tipo: string
  telefono: string | null
  direccion: string | null
}
