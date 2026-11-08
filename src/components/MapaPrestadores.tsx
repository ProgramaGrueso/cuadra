import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { formatearDistancia, type Punto } from '../lib/ubicacion'
import type { PrestadorCercano } from '../lib/types'

const yo = L.divIcon({ className: '', html: '<div class="marcador marcador--yo"></div>', iconSize: [20, 20] })

// Solo se interpola un numero: nada de texto de usuario entra en este HTML.
const iconoPrestador = (vistos: number, sello: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="marcador${sello ? ' marcador--sello' : ''}">${Number(vistos)}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })

interface Props {
  centro: Punto
  radioM: number
  prestadores: PrestadorCercano[]
}

export function MapaPrestadores({ centro, radioM, prestadores }: Props) {
  return (
    <MapContainer
      center={[centro.lat, centro.lng]}
      zoom={radioM <= 500 ? 16 : 15}
      className="h-[60dvh] w-full rounded-xl border border-borde"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
          referrerPolicy="strict-origin-when-cross-origin"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <Circle
        center={[centro.lat, centro.lng]}
        radius={radioM}
        pathOptions={{ color: '#14614a', weight: 1, fillOpacity: 0.05 }}
      />
      <Marker position={[centro.lat, centro.lng]} icon={yo} title="Tu ubicación" />
      {prestadores.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={iconoPrestador(p.vistos_buenos, p.sello)}
          title={`${p.nombre}, ${p.oficio}`}
        >
          <Popup>
            <strong>{p.nombre}</strong>
            <br />
            {p.oficio} · {formatearDistancia(p.distancia_m)}
            <br />
            {p.vistos_buenos} {p.vistos_buenos === 1 ? 'vecino le da' : 'vecinos le dan'} su Visto Bueno
            <br />
            <Link to={`/prestador/${p.id}`}>Ver ficha</Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
