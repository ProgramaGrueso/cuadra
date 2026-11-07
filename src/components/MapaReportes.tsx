import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { ESTADOS_REPORTE, TIPOS_REPORTE } from '../lib/emergencia'
import type { Reporte } from '../lib/types'
import type { Punto } from '../lib/ubicacion'

const CLASES: Record<Reporte['estado'], string> = {
  pendiente: 'marcador--pendiente',
  en_atencion: 'marcador--en-atencion',
  atendido: 'marcador--atendido',
}

const icono = (estado: Reporte['estado']) =>
  L.divIcon({
    className: '',
    html: `<div class="marcador ${CLASES[estado]}"></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })

export function MapaReportes({ centro, reportes }: { centro: Punto; reportes: Reporte[] }) {
  return (
    <MapContainer center={[centro.lat, centro.lng]} zoom={14} className="h-[45dvh] w-full rounded-xl border border-borde">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {reportes.map((r) => (
        <Marker
          key={r.id}
          position={[r.lat_aprox, r.lng_aprox]}
          icon={icono(r.estado)}
          title={`${TIPOS_REPORTE[r.tipo].nombre}: ${ESTADOS_REPORTE[r.estado]}`}
        >
          <Popup>
            <strong>{TIPOS_REPORTE[r.tipo].nombre}</strong> · {ESTADOS_REPORTE[r.estado]}
            <br />
            {r.descripcion}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
