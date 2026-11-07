import type { Zona } from './types'

export interface Punto {
  lat: number
  lng: number
}

export function obtenerUbicacion(): Promise<Punto> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Tu teléfono no permite compartir la ubicación.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? 'No nos diste permiso para ver tu ubicación.'
              : 'No pudimos encontrar tu ubicación.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    )
  })
}

export function distanciaM(a: Punto, b: Punto): number {
  const rad = (grados: number) => (grados * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export function zonaDe(punto: Punto, zonas: Zona[]): Zona | null {
  return zonas.find((zona) => distanciaM(punto, zona) <= zona.radio_m) ?? null
}

export function formatearDistancia(metros: number): string {
  return metros < 1000 ? `${metros} m` : `${(metros / 1000).toFixed(1)} km`
}

/** Acepta 987654321 o +51 987 654 321; devuelve solo dígitos con código de país. */
export function normalizarTelefono(texto: string): string | null {
  const digitos = texto.replace(/\D/g, '')
  if (digitos === '') return null
  return digitos.length === 9 ? `51${digitos}` : digitos
}
