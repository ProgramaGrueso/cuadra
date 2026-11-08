// Solo recuerda que tutoriales ya vio este telefono; si el navegador lo bloquea, se repiten.
export function yaVisto(clave: string) {
  try {
    return localStorage.getItem(`cuadra.${clave}`) === '1'
  } catch {
    return false
  }
}

export function marcarVisto(clave: string) {
  try {
    localStorage.setItem(`cuadra.${clave}`, '1')
  } catch {
    // Nada que hacer: el tutorial se mostrara otra vez.
  }
}
