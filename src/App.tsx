import { Store, UserRound, type LucideIcon } from 'lucide-react'
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { SesionProvider, useSesion } from './lib/sesion'
import { configurado } from './lib/supabase'
import { MiPerfil } from './pages/MiPerfil'
import { Registro } from './pages/Registro'
import { Servicios } from './pages/Servicios'

// La navegacion solo lista lo que ya funciona de punta a punta: sin pantallas falsas.
const SECCIONES: { ruta: string; texto: string; Icono: LucideIcon }[] = [
  { ruta: '/', texto: 'Servicios', Icono: Store },
  { ruta: '/perfil', texto: 'Mi perfil', Icono: UserRound },
]

function Mensaje({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">{children}</main>
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
  if (!estado.perfil) return <Registro />

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <main>
        <Routes>
          <Route path="/" element={<Servicios />} />
          <Route path="/perfil" element={<MiPerfil />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-[1000] border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-md">
          {SECCIONES.map(({ ruta, texto, Icono }) => (
            <li key={ruta} className="flex-1">
              <NavLink
                to={ruta}
                end
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 font-bold ${
                    isActive ? 'text-marca' : 'text-suave'
                  }`
                }
              >
                <Icono aria-hidden size={26} />
                {texto}
              </NavLink>
            </li>
          ))}
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
