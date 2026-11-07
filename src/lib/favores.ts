// Categorias fijas del muro: coinciden con categorias_favor del seed y no dependen de la red.
export const CATEGORIAS = [
  {
    id: 'herramientas',
    nombre: 'Herramientas',
    icono: 'wrench',
    pido: '¿Alguien me presta un taladro por unas horas?',
    ofrezco: 'Presto mi taladro por unas horas.',
  },
  {
    id: 'ayuda_temporal',
    nombre: 'Ayuda temporal',
    icono: 'hand-heart',
    pido: 'Necesito ayuda por un par de horas.',
    ofrezco: 'Puedo ayudar un par de horas esta semana.',
  },
  {
    id: 'materiales',
    nombre: 'Materiales',
    icono: 'package',
    pido: 'Busco materiales que te hayan sobrado de una obra.',
    ofrezco: 'Dono materiales que me sobraron de una obra.',
  },
  {
    id: 'habilidades',
    nombre: 'Habilidades',
    icono: 'lightbulb',
    pido: 'Busco a alguien que me enseñe a usar el celular.',
    ofrezco: 'Enseño a usar el celular a quien lo necesite.',
  },
  {
    id: 'movilidad',
    nombre: 'Movilidad',
    icono: 'car',
    pido: 'Necesito que me lleven a una cita médica.',
    ofrezco: 'Puedo llevar a alguien en mi auto esta semana.',
  },
] as const

export type TipoFavor = 'pido' | 'ofrezco'
export type CategoriaFavor = (typeof CATEGORIAS)[number]

export function categoriaDe(id: string): CategoriaFavor {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[0]
}
