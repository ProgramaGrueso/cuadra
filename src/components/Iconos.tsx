import {
  BadgeCheck,
  BookOpen,
  BrickWall,
  Dog,
  Hammer,
  HeartPulse,
  KeyRound,
  Laptop,
  Scissors,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// El nombre viene del catalogo en la base: mapa estatico para no cargar todos los iconos.
const ICONOS: Record<string, LucideIcon> = {
  wrench: Wrench,
  zap: Zap,
  hammer: Hammer,
  key: KeyRound,
  brick: BrickWall,
  'heart-pulse': HeartPulse,
  dog: Dog,
  book: BookOpen,
  scissors: Scissors,
  laptop: Laptop,
}

export function IconoOficio({ icono, size = 22 }: { icono: string; size?: number }) {
  const Icono = ICONOS[icono] ?? BadgeCheck
  return <Icono aria-hidden size={size} />
}
