import { HandHeart, LifeBuoy, MapPin, Siren, Store, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BannerConexion } from './components/AvisosConexion'
import { AsistenteVoz } from './components/AsistenteVoz'
import { BotonPublicar } from './components/BotonPublicar'
import { TutorialEmergencia } from './components/TutorialEmergencia'
import { EVENTO_DATOS } from './lib/agente'
import { precargarZona } from './lib/datos'
import { EmergenciaProvider, useEmergencia } from './lib/emergencia'
import { useEnLinea } from './lib/offline'
import { marcarVisto, yaVisto } from './lib/preferencias'
import { SesionProvider, usePerfil, useSesion } from './lib/sesion'
import { configurado } from './lib/supabase'
import { Bienvenida } from './pages/Bienvenida'
import { FichaPrestador } from './pages/FichaPrestador'
import { Favores } from './pages/Favores'
import { MiPerfil } from './pages/MiPerfil'
import { OfrezcoOficio } from './pages/OfrezcoOficio'
import { PublicarRecurso, ReportarVulnerable } from './pages/PublicarEmergencia'
import { PublicarFavor } from './pages/PublicarFavor'
import { Registro } from './pages/Registro'
import { Servicios } from './pages/Servicios'
import { TableroAyuda } from './pages/TableroAyuda'

// La navegacion solo lista lo que ya funciona de punta a punta: sin pantallas falsas.
const SECCIONES: { ruta: string; texto: string; Icono: LucideIcon }[] = [
  { ruta: '/', texto: 'Servicios', Icono: Store },
  { ruta: '/favores', texto: 'Favores', Icono: HandHeart },
  { ruta: '/perfil', texto: 'Mi perfil', Icono: UserRound },
]

function Mensaje({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">{children}</main>
}

function Entrada() {
  const [vista, setVista] = useState(() => yaVisto('bienvenida'))
  if (vista) return <Registro />
  return (
    <Bienvenida
      alTerminar={() => {
        marcarVisto('bienvenida')
        setVista(true)
      }}
    />
  )
}

function Contenido() {
  const { estado, reintentar } = useSesion()

  if (!configurado) {
    return (
      <Mensaje>
        <p role="alert">Falta configurar la conexión con Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).</p>
      </Mensaje>
    )
  }
  if (estado.fase === 'cargando') {
    return (
      <Mensaje>
        <p role="status" className="text-suave">
          Entrando a tu barrio…
        </p>
      </Mensaje>
    )
  }
  if (estado.fase === 'error') {
    return (
      <Mensaje>
        <p role="alert">{estado.mensaje}</p>
        <button
          type="button"
          onClick={reintentar}
          className="min-h-12 rounded-xl bg-marca px-6 font-bold text-sobre-marca"
        >
          Intentar otra vez
        </button>
      </Mensaje>
    )
  }
  if (!estado.perfil) return <Entrada />

  return (
    <EmergenciaProvider>
      <Aplicacion />
    </EmergenciaProvider>
  )
}

function Tutorial() {
  const navegar = useNavigate()
  return <Bienvenida alTerminar={() => navegar('/perfil', { replace: true })} />
}

function Aplicacion() {
  const { pathname } = useLocation()
  const emergencia = useEmergencia()
  const enLinea = useEnLinea()
  const { centro, perfil, zonas } = usePerfil()
  const zona = zonas.find((z) => z.id === perfil.zona_id)
  const sinBotonPublicar = /^\/(publicar|recurso|reportar|ofrezco-oficio|tutorial)/.test(pathname)

  useEffect(() => {
    if (enLinea) void precargarZona(centro)
  }, [enLinea, centro])

  // Cuando el asistente publica algo, la pantalla abierta se vuelve a montar y relee sus datos.
  const [recarga, setRecarga] = useState(0)
  useEffect(() => {
    const alCambiar = () => setRecarga((n) => n + 1)
    window.addEventListener(EVENTO_DATOS, alCambiar)
    return () => window.removeEventListener(EVENTO_DATOS, alCambiar)
  }, [])

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-44">
      <div data-avisos className="sticky top-0 z-[1000]">
        <header className="flex items-center gap-3 bg-marca px-4 py-2 text-sobre-marca">
          <img src="/icon.svg" alt="" className="h-10 w-10 rounded-xl ring-2 ring-white/40" />
          <span className="text-2xl font-bold tracking-tight">Cuadra</span>
          {zona && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-base font-bold">
              <MapPin aria-hidden size={18} /> {zona.nombre}
            </span>
          )}
        </header>
        <div aria-hidden className="franja-chakana" />
        {emergencia && (
          <div role="alert" className="flex items-center gap-2 bg-peligro px-4 py-2 font-bold text-white">
            <Siren aria-hidden size={24} className="shrink-0" />
            <span>
              {emergencia.es_simulacro && !emergencia.mensaje.toLowerCase().startsWith('simulacro') && 'Simulacro: '}
              {emergencia.mensaje}
            </span>
          </div>
        )}
        <BannerConexion />
      </div>
      <main>
        <Routes key={recarga}>
          <Route path="/" element={<Servicios />} />
          <Route path="/prestador/:id" element={<FichaPrestador />} />
          <Route path="/ofrezco-oficio" element={<OfrezcoOficio />} />
          <Route path="/favores" element={emergencia ? <TableroAyuda /> : <Favores />} />
          <Route path="/reportar" element={<ReportarVulnerable />} />
          <Route path="/recurso/:accion" element={<PublicarRecurso />} />
          <Route path="/publicar/:tipo" element={<PublicarFavor />} />
          <Route path="/perfil" element={<MiPerfil />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <AsistenteVoz />
      {!sinBotonPublicar && <BotonPublicar />}
      <TutorialEmergencia />
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-[1000] border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-md">
          {SECCIONES.map((seccion) => {
            const { ruta, texto, Icono } = emergencia && seccion.ruta === '/favores' ? { ...seccion, texto: 'Ayuda', Icono: LifeBuoy } : seccion
            return (
              <li key={ruta} className="flex-1">
                <NavLink
                  to={ruta}
                  end
                  className={({ isActive }) =>
                    `relative flex min-h-16 flex-col items-center justify-center gap-0.5 font-bold ${
                      isActive ? 'text-marca before:absolute before:inset-x-6 before:top-0 before:h-1.5 before:rounded-b-full before:bg-sol' : 'text-suave'
                    }`
                  }
                >
                  <Icono aria-hidden size={26} />
                  {texto}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SesionProvider>
        <Contenido />
      </SesionProvider>
    </BrowserRouter>
  )
}
