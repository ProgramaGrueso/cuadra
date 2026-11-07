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
