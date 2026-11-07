import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Cross, Flag, MapPin, Shield, ShoppingCart, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { leerGrupos, leerLugares } from '../lib/datos'
import { ESTADOS_REPORTE, TIPOS_REPORTE } from '../lib/emergencia'
import type { GrupoApoyo, LugarEmergencia, Reporte } from '../lib/types'
import type { Punto } from '../lib/ubicacion'

const CLASES: Record<Reporte['estado'], string> = {
  pendiente: 'marcador--pendiente',
  en_atencion: 'marcador--en-atencion',
  atendido: 'marcador--atendido',
}

type CapaLugar = 'grupos' | 'salud' | 'reunion' | 'viveres'
type Capa = 'reportes' | CapaLugar

// Mismos trazos que los iconos de lucide de la leyenda. Solo se interpolan estas constantes.
const CAPAS: Record<CapaLugar, { nombre: string; Icono: LucideIcon; clase: string; svg: string }> = {
  grupos: {
    nombre: 'Apoyo',
    Icono: Shield,
    clase: 'marcador--grupos',
    svg: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  },
  salud: {
    nombre: 'Salud',
    Icono: Cross,
    clase: 'marcador--salud',
    svg: '<path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>',
  },
  reunion: {
    nombre: 'Reunión',
    Icono: Flag,
    clase: 'marcador--reunion',
    svg: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  },
  viveres: {
    nombre: 'Víveres',
    Icono: ShoppingCart,
    clase: 'marcador--viveres',
    svg: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  },
}

const icono = (html: string) =>
  L.divIcon({ className: '', html, iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18] })

const iconoReporte = (estado: Reporte['estado']) => icono(`<div class="marcador ${CLASES[estado]}"></div>`)
const iconoLugar = (capa: CapaLugar) =>
  icono(`<div class="marcador marcador--lugar ${CAPAS[capa].clase}"><svg viewBox="0 0 24 24" aria-hidden="true">${CAPAS[capa].svg}</svg></div>`)

interface Pin {
  id: string
  capa: CapaLugar
  nombre: string
  detalle: string | null
  direccion: string | null
  telefono: string | null
  lat: number
  lng: number
  fuente: string | null
}

function pinesDeGrupos(grupos: GrupoApoyo[]): Pin[] {
  return (
    grupos
      // Una copia guardada por una version anterior no trae coordenadas.
      // El Serenazgo no tiene sede confirmada: se llama desde el directorio.
      .filter((g) => typeof g.lat === 'number' && g.tipo !== 'serenazgo')
      .map((g) => ({ ...g, capa: g.tipo === 'salud' ? ('salud' as const) : ('grupos' as const), detalle: null }))
  )
}

function pinesDeLugares(lugares: LugarEmergencia[]): Pin[] {
  return lugares.map((l) => ({ ...l, capa: l.tipo === 'punto_reunion' ? ('reunion' as const) : ('viveres' as const), telefono: null }))
}

export function MapaEmergencia({ centro, reportes }: { centro: Punto; reportes: Reporte[] }) {
  const [pines, setPines] = useState<Pin[]>([])
  const [ocultas, setOcultas] = useState<ReadonlySet<Capa>>(new Set())

  useEffect(() => {
    void Promise.all([leerGrupos(), leerLugares()]).then(([grupos, lugares]) => {
      setPines([...pinesDeGrupos(grupos.data ?? []), ...pinesDeLugares(lugares.data ?? [])])
    })
  }, [])

  function alternar(capa: Capa) {
    setOcultas((actual) => {
      const nueva = new Set(actual)
      if (!nueva.delete(capa)) nueva.add(capa)
      return nueva
    })
  }

  const contar = (capa: CapaLugar) => pines.filter((p) => p.capa === capa).length
  const claves = Object.keys(CAPAS) as CapaLugar[]
  const reunion = contar('reunion')

  return (
    <div className="flex flex-col gap-2">
      <MapContainer center={[centro.lat, centro.lng]} zoom={15} className="h-[45dvh] w-full rounded-xl border border-borde">
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
          referrerPolicy="strict-origin-when-cross-origin"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        {!ocultas.has('reportes') &&
          reportes.map((r) => (
            <Marker
              key={r.id}
              position={[r.lat_aprox, r.lng_aprox]}
              icon={iconoReporte(r.estado)}
              title={`${TIPOS_REPORTE[r.tipo].nombre}: ${ESTADOS_REPORTE[r.estado]}`}
            >
              <Popup>
                <strong>{TIPOS_REPORTE[r.tipo].nombre}</strong> · {ESTADOS_REPORTE[r.estado]}
                <br />
                {r.descripcion}
              </Popup>
            </Marker>
          ))}
        {pines
          .filter((p) => !ocultas.has(p.capa))
          .map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={iconoLugar(p.capa)} title={p.nombre}>
              <Popup>
                <strong>{p.nombre}</strong>
                {p.detalle && <p className="!my-1">{p.detalle}</p>}
                {p.direccion && <p className="!my-1">{p.direccion}</p>}
                {p.telefono && (
                  <a href={`tel:${p.telefono}`} className="my-1 flex min-h-12 items-center font-bold">
                    Llamar: {p.telefono}
                  </a>
                )}
                {p.fuente && <p className="!mb-0 !mt-1 text-xs">Fuente: {p.fuente}</p>}
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Capas del mapa">
        <BotonCapa activa={!ocultas.has('reportes')} onClick={() => alternar('reportes')} Icono={MapPin} nombre="Reportes" cuenta={reportes.length} />
        {claves.map((c) => (
          <BotonCapa key={c} activa={!ocultas.has(c)} onClick={() => alternar(c)} Icono={CAPAS[c].Icono} nombre={CAPAS[c].nombre} cuenta={contar(c)} />
        ))}
      </div>

      <p className="text-suave">Los reportes marcan una zona aproximada, nunca la dirección.</p>
      {reunion > 0 && !ocultas.has('reunion') && (
        <p className="text-suave">
          Los {reunion} puntos de reunión los sugiere el equipo Cuadra. No son la lista oficial de la municipalidad.
        </p>
      )}
    </div>
  )
}

function BotonCapa({ activa, onClick, Icono, nombre, cuenta }: { activa: boolean; onClick: () => void; Icono: LucideIcon; nombre: string; cuenta: number }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`flex min-h-12 items-center gap-1.5 rounded-xl border-2 border-marca px-3 font-bold ${activa ? 'bg-marca text-sobre-marca' : 'bg-superficie text-marca'}`}
    >
      <Icono aria-hidden size={18} /> {nombre} ({cuenta})
    </button>
  )
}
