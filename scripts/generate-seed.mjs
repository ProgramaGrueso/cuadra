// Genera supabase/seed.sql de forma determinista: node scripts/generate-seed.mjs
//
// Vecinos, prestadores, favores y reportes son FICTICIOS. Los telefonos quedan
// en NULL a proposito: un numero inventado en wa.me podria ser de una persona real.
// Grupos de apoyo y numeros de emergencia son REALES: cada fila indica su fuente.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CENTRO = { lat: -12.0845, lng: -77.034 }

let semilla = 20261106
const azar = () => {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296
  return semilla / 4294967296
}
const elegir = (lista) => lista[Math.floor(azar() * lista.length)]
const id = (grupo, n) => `00000000-0000-4000-8${String(grupo).padStart(3, '0')}-${String(n).padStart(12, '0')}`
const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'string' ? `'${v.replaceAll("'", "''")}'` : String(v))
const valores = (filas) => filas.map((f) => `  (${f.map(q).join(', ')})`).join(',\n')

// Punto al azar a menos de 900 m del centro: dos puntos nunca distan mas de 1,8 km.
const cerca = () => {
  const dist = Math.sqrt(azar()) * 900
  const angulo = azar() * 2 * Math.PI
  return {
    lat: +(CENTRO.lat + (dist * Math.cos(angulo)) / 110574).toFixed(5),
    lng: +(CENTRO.lng + (dist * Math.sin(angulo)) / (111320 * Math.cos((CENTRO.lat * Math.PI) / 180))).toFixed(5),
  }
}

const OFICIOS = [
  ['Gasfitería', 'wrench', true], ['Electricidad', 'zap', true], ['Carpintería', 'hammer', false],
  ['Cerrajería', 'key', true], ['Albañilería', 'brick', true], ['Enfermería', 'heart-pulse', true],
  ['Paseo de mascotas', 'dog', false], ['Clases particulares', 'book', false],
  ['Costura', 'scissors', false], ['Técnico de computadoras', 'laptop', false],
]

const CATEGORIAS = [
  ['herramientas', 'Herramientas', 'wrench', 1], ['ayuda_temporal', 'Ayuda temporal', 'hand-heart', 2],
  ['materiales', 'Materiales', 'package', 3], ['habilidades', 'Habilidades', 'lightbulb', 4],
  ['movilidad', 'Movilidad', 'car', 5],
]

const NOMBRES = ['Rosa Quispe', 'Carlos Huamán', 'Marta Flores', 'Jorge Mendoza', 'Lucía Ramos', 'Víctor Salazar', 'Ana Torres', 'Pedro Chávez', 'Elena Vargas', 'Luis Rojas', 'Carmen Paredes', 'Miguel Castillo', 'Teresa Gutiérrez', 'Óscar Espinoza', 'Julia Ccori', 'Raúl Medina', 'Silvia Campos', 'Héctor Díaz', 'Norma Aguilar', 'Walter Ríos', 'Gladys Núñez', 'Ernesto Vega', 'Patricia León', 'César Mamani', 'Isabel Cárdenas', 'Fernando Ortiz', 'Doris Palacios', 'Alberto Reyes', 'Milagros Tello', 'Hugo Zavala', 'Sofía Bustamante', 'Andrés Poma', 'Rocío Linares', 'Manuel Cueva', 'Beatriz Solís', 'Javier Arce', 'Nancy Herrera', 'Ricardo Lazo', 'Olga Pineda', 'Tomás Valdivia', 'Yolanda Sánchez', 'Daniel Ochoa', 'Pilar Cabrera', 'Gustavo Ibarra', 'Mercedes Rivas', 'Iván Tapia', 'Flor Benites', 'Alfredo Prado', 'Karina Loayza', 'Samuel Otero', 'Graciela Muñoz', 'Enrique Bravo', 'Liliana Peña', 'Rubén Acosta', 'Zoila Romero']

const SERVICIOS = {
  1: [['Destapes, fugas y cambio de griferías. Atiendo el mismo día.', 'Desde S/ 40 la visita'], ['Instalación de termas y reparación de tanques de agua.', 'Desde S/ 60'], ['Reparación de caños y desagües, con garantía de un mes.', 'S/ 35 la revisión'], ['Gasfitería general en casas y quintas antiguas.', 'A convenir']],
  2: [['Tableros, cortocircuitos y tomacorrientes. Técnico con 15 años de experiencia.', 'Desde S/ 50'], ['Instalaciones eléctricas para casa y bodega.', 'S/ 45 la visita'], ['Cambio de cableado y luminarias LED.', 'Desde S/ 40'], ['Reparo pozos a tierra y fallas de luz.', 'A convenir']],
  3: [['Muebles a medida y reparación de puertas.', 'Presupuesto gratis'], ['Restauración de muebles antiguos.', 'Desde S/ 80'], ['Closets y repisas en melamina.', 'A convenir']],
  4: [['Apertura de puertas y cambio de chapas las 24 horas.', 'Desde S/ 50'], ['Duplicado de llaves a domicilio y chapas de seguridad.', 'Desde S/ 15'], ['Cerrajería para casa y auto.', 'S/ 60 la apertura']],
  5: [['Tarrajeo, resanes y reparación de grietas.', 'Presupuesto gratis'], ['Ampliaciones pequeñas y pisos.', 'A convenir'], ['Reparaciones de muros y techos.', 'Desde S/ 90 el día']],
  6: [['Enfermera técnica: inyectables y control de presión a domicilio.', 'S/ 20 la visita'], ['Cuidado de adultos mayores por horas.', 'S/ 15 la hora'], ['Curaciones y toma de glucosa a domicilio.', 'S/ 25 la visita']],
  7: [['Paseos en grupo pequeño por el Parque Castilla.', 'S/ 10 el paseo'], ['Paseo y cuidado de perros mayores.', 'S/ 12 el paseo'], ['Cuido a tu mascota en casa cuando viajas.', 'S/ 30 el día']],
  8: [['Clases de matemática para primaria y secundaria.', 'S/ 25 la hora'], ['Refuerzo escolar y comunicación.', 'S/ 20 la hora'], ['Inglés básico para niños y adultos.', 'S/ 30 la hora']],
  9: [['Arreglos de ropa y cierres, entrega en dos días.', 'Desde S/ 8'], ['Confección de uniformes escolares.', 'A convenir']],
  10: [['Formateo y reparación de laptops a domicilio.', 'Desde S/ 50'], ['Ayudo a adultos mayores con su celular y computadora.', 'S/ 20 la hora']],
}

const COMENTARIOS = ['Vino el mismo día y dejó todo limpio.', 'Muy puntual y cobró lo acordado.', 'Le encargamos un trabajo en casa de mi mamá. Muy amable.', 'Honesto: me dijo que no hacía falta cambiar la pieza.', 'Trabaja bien y explica lo que hace.', 'Lo conozco hace años, de total confianza.', 'Buen precio para la zona.', 'Resolvió rápido lo que otro no pudo.', 'Lo recomiendo, volvería a llamarlo.', null, null, null]

// ------------------------------------------------------------ construccion
const usuarios = NOMBRES.map((nombre, i) => ({ id: id(1, i + 1), nombre, ...cerca() }))

const prestadores = []
let n = 0
for (const oficioId of Object.keys(SERVICIOS).map(Number)) {
  for (const [descripcion, tarifa] of SERVICIOS[oficioId]) {
    const usuario = usuarios[n]
    const critico = OFICIOS[oficioId - 1][2]
    prestadores.push({ id: id(2, ++n), user_id: usuario.id, oficio_id: oficioId, descripcion, tarifa, emergencia: critico && azar() > 0.25, lat: usuario.lat, lng: usuario.lng })
  }
}
if (prestadores.length !== 30) throw new Error(`Se esperaban 30 prestadores, hay ${prestadores.length}`)

const vistos = []
prestadores.forEach((p, i) => {
  // Reparto creible: unos pocos muy recomendados y algunos aun sin sello.
  const total = i % 7 === 3 ? 0 : i % 5 === 1 ? 2 : 3 + Math.floor(azar() * 11)
  const candidatos = usuarios.filter((u) => u.id !== p.user_id).sort(() => azar() - 0.5).slice(0, total)
  for (const u of candidatos) vistos.push([id(3, vistos.length + 1), p.id, u.id, elegir(COMENTARIOS)])
})

const u = (i) => usuarios[30 + i].id
const FAVORES = [
  ['pido', 'herramientas', '¿Alguien me presta un taladro por dos horas este sábado?', 'abierto', 0, null],
  ['pido', 'movilidad', 'Necesito que lleven a mi papá a su cita en el Rebagliati el martes temprano.', 'abierto', 1, null],
  ['ofrezco', 'herramientas', 'Presto escalera de 3 metros, la recoges en mi casa.', 'abierto', 2, null],
  ['ofrezco', 'habilidades', 'Ayudo a llenar trámites en línea a adultos mayores.', 'abierto', 3, null],
  ['pido', 'materiales', 'Busco medio saco de cemento que le haya sobrado a alguien.', 'abierto', 4, null],
  ['ofrezco', 'materiales', 'Regalo cajas de cartón de mudanza, están en buen estado.', 'abierto', 5, null],
  ['pido', 'ayuda_temporal', 'Necesito quien recoja a mi hijo del colegio el jueves a la 1 p. m.', 'abierto', 6, null],
  ['ofrezco', 'movilidad', 'Voy a San Isidro de lunes a viernes a las 8 a. m. y tengo un asiento libre.', 'abierto', 7, null],
  ['pido', 'habilidades', '¿Alguien me enseña a usar la banca por celular?', 'abierto', 8, null],
  ['ofrezco', 'ayuda_temporal', 'Puedo hacer compras en el mercado para vecinos que no pueden salir.', 'abierto', 9, null],
  ['pido', 'herramientas', 'Necesito una escalera para cambiar un foco alto.', 'en_curso', 10, 2],
  ['ofrezco', 'habilidades', 'Reviso tareas de matemática de primaria los fines de semana.', 'en_curso', 11, 12],
  ['pido', 'ayuda_temporal', 'Me ayudaron a cuidar a mi mamá una tarde.', 'cumplido', 13, 9],
  ['pido', 'movilidad', 'Me llevaron a la posta cuando no había taxis.', 'cumplido', 14, 7],
  ['ofrezco', 'ayuda_temporal', 'Hice las compras a una vecina durante su reposo.', 'cumplido', 9, 15],
]
const favores = FAVORES.map(([tipo, categoria, texto, estado, autor, ayudante], i) => {
  const p = cerca()
  return [id(4, i + 1), tipo, categoria, texto, estado, p.lat, p.lng, u(autor), ayudante === null ? null : u(ayudante)]
})

const EMERGENCIA = id(5, 1)
const REPORTES = [
  ['adulto_mayor', 'Señora de 82 años vive sola en un segundo piso, no contesta el teléfono.', 'pendiente', 16, null],
  ['discapacidad', 'Vecino en silla de ruedas no puede bajar: el ascensor está sin luz.', 'pendiente', 17, null],
  ['sin_agua', 'Familia con dos bebés sin agua desde el sismo.', 'pendiente', 18, null],
  ['herido_leve', 'Corte en el brazo por vidrios rotos, necesita curación.', 'pendiente', 19, null],
  ['adulto_mayor', 'Pareja de adultos mayores necesita sus medicinas de la presión.', 'en_atencion', 20, 21],
  ['otro', 'Niños solos en casa mientras su mamá vuelve del trabajo.', 'atendido', 22, 23],
]
const reportes = REPORTES.map(([tipo, descripcion, estado, reportador, voluntario], i) => {
  const p = cerca()
  return [id(6, i + 1), EMERGENCIA, tipo, descripcion, p.lat, p.lng, estado, u(reportador), voluntario === null ? null : u(voluntario)]
})
const direcciones = reportes.map((r, i) => [r[0], `Dirección ficticia de simulacro n.º ${i + 1}, Lince`])

const RECURSOS = [
  ['agua', 'tengo', 20, 'Bidones de 20 L', 0], ['agua', 'necesito', 10, 'Litros para una familia de cuatro', 1],
  ['viveres', 'tengo', 15, 'Raciones de arroz y menestras', 2], ['viveres', 'necesito', 6, 'Raciones para adultos mayores', 3],
  ['medicina', 'tengo', 1, 'Botiquín de primeros auxilios', 4], ['medicina', 'necesito', 1, 'Pastillas para la presión', 5],
  ['energia', 'tengo', 2, 'Baterías portátiles para celular', 6], ['energia', 'necesito', 1, 'Carga para un concentrador de oxígeno', 7],
  ['refugio', 'tengo', 4, 'Espacios en un primer piso seguro', 8], ['refugio', 'necesito', 3, 'Espacios para una familia', 9],
]
const recursos = RECURSOS.map(([tipo, accion, cantidad, detalle, persona], i) => {
  const p = cerca()
  return [id(7, i + 1), EMERGENCIA, tipo, accion, cantidad, detalle, p.lat, p.lng, u(10 + persona)]
})

const OSM = 'OpenStreetMap, consultado 2026-11-06'
const MUNI = 'Municipalidad de Lince, gob.pe/institucion/munilince/contacto-y-numeros-de-emergencias, vía buscador, 2026-11-06'
const PLAN_SISMO = 'El Peruano, 2026-07-02, elperuano.pe/noticia/299347'
// Solo lugares confirmados. Ubicacion en el mapa: OSM; lo demas, la fuente que se indica.
// El Serenazgo no tiene pin: su sede no esta confirmada, asi que lat/lng es la municipalidad.
const GRUPOS = [
  ['Compañía de Bomberos Lima N.º 4', 'bomberos', '014716442', 'Jr. Manuel Candamo, Lince', -12.0819004, -77.0321975, `Ubicación: ${OSM}. Teléfono: ${MUNI}`],
  ['Comisaría PNP de Lince', 'comisaria', '014712606', null, -12.0833274, -77.0271535, `Ubicación: ${OSM}. Teléfono: ${MUNI}`],
  ['Serenazgo de Lince (central)', 'serenazgo', '016191802', null, -12.0833313, -77.0318518, MUNI],
  ['Municipalidad de Lince', 'municipio', '016191818', 'Av. Juan Pardo de Zela 480, Lince', -12.0833313, -77.0318518, `Ubicación: ${OSM}. Datos: ${MUNI}`],
  ['Centro de Salud de Lince', 'salud', null, 'Jr. Manuel Candamo 495, Lince', -12.0818643, -77.0319682, `Ubicación: ${OSM}. Dirección: DIGEMID, puntos de acopio de Lima, 01-2026`],
  ['SISOL Salud Lince', 'salud', null, 'Av. Gral. César Canevaro 550, Lince', -12.0840314, -77.0395119, `Establecimiento: ${PLAN_SISMO}. Ubicación y dirección: ${OSM}`],
  ['Clínica Javier Prado', 'salud', null, 'Av. Javier Prado Este 499', -12.0911, -77.02845, `Establecimiento: ${PLAN_SISMO}. Ubicación y dirección: ${OSM}`],
  ['Parroquia Santa Rosa de Lima', 'parroquia', '014700005', 'Av. Almirante Guisse 2150, Lince', -12.0865479, -77.0389875, `Ubicación: ${OSM}. Datos: gob.pe/14180-parroquias-del-distrito-de-lince, vía buscador, 2026-11-06`],
]

// Puntos de reunion sugeridos por el equipo Cuadra, no por la municipalidad.
// Los tres de Lince salen de la nota de El Peruano; Campo de Marte (Jesus Maria) lo elige el equipo
// por ser el espacio abierto mas amplio cerca. El estadio Meliton Carbajal no lleva pin: su ubicacion no esta confirmada.
const SUGERIDO = 'Sugerido por el equipo Cuadra'
const LUGARES = [
  ['Parque Castilla', 'punto_reunion', 'Lince', `${SUGERIDO}, según la nota de El Peruano.`, -12.08859, -77.04138, `${PLAN_SISMO}. Ubicación: ${OSM}`],
  ['Parque Pedro Ruiz Gallo', 'punto_reunion', 'Lince', `${SUGERIDO}, según la nota de El Peruano. En su sótano funciona el COED del distrito.`, -12.0825, -77.03108, `${PLAN_SISMO}. Ubicación: ${OSM}`],
  ['Parque Santos Dumont', 'punto_reunion', 'Lince', `${SUGERIDO}, según la nota de El Peruano.`, -12.08724, -77.02705, `${PLAN_SISMO}. Ubicación: ${OSM}`],
  ['Campo de Marte', 'punto_reunion', 'Jesús María', `${SUGERIDO} por ser un espacio abierto amplio. No es un punto oficial.`, -12.0681181, -77.0418936, `Elegido por el equipo Cuadra, 2026-11-07. Ubicación: ${OSM}`],
  ['plazaVea Risso', 'abastecimiento', 'Av. Arequipa 2250, Lince', 'Supermercado. En una emergencia puede estar cerrado o sin stock.', -12.08667, -77.03483, `Dirección: plazavea.com.pe/recojo-en-tienda, vía buscador, 2026-11-06. Ubicación: ${OSM}`],
]

const NUMEROS = [['Policía Nacional', '105', 1], ['Bomberos', '116', 2], ['SAMU (ambulancia)', '106', 3], ['Defensa Civil', '115', 4]]

// ---------------------------------------------------------------- salida
const sql = `-- GENERADO por scripts/generate-seed.mjs. No editar a mano.
-- Vecinos, prestadores, favores y reportes son ficticios.

insert into public.zonas (id, nombre, lat, lng, radio_m) values
  (1, 'Lince', ${CENTRO.lat}, ${CENTRO.lng}, 2000);

insert into public.oficios (id, nombre, icono, es_critico_emergencia) values
${valores(OFICIOS.map((o, i) => [i + 1, ...o]))};

insert into public.categorias_favor (id, nombre, icono, orden) values
${valores(CATEGORIAS)};

insert into public.numeros_emergencia (nombre, numero, orden) values
${valores(NUMEROS)};

insert into public.users (id, nombre, lat, lng, zona_id) values
${valores(usuarios.map((x) => [x.id, x.nombre, x.lat, x.lng, 1]))};

insert into public.prestadores (id, user_id, oficio_id, descripcion, tarifa_ref, disponible_emergencia, lat, lng, zona_id) values
${valores(prestadores.map((p) => [p.id, p.user_id, p.oficio_id, p.descripcion, p.tarifa, p.emergencia, p.lat, p.lng, 1]))};

insert into public.vistos_buenos (id, prestador_id, vecino_id, comentario) values
${valores(vistos)};

insert into public.favores (id, tipo, categoria_id, texto, estado, lat, lng, autor_id, ayudante_id) values
${valores(favores)};

insert into public.grupos_apoyo (nombre, tipo, telefono, direccion, lat, lng, fuente, zona_id) values
${valores(GRUPOS.map((g) => [...g, 1]))};

insert into public.lugares_emergencia (nombre, tipo, direccion, detalle, lat, lng, fuente, zona_id) values
${valores(LUGARES.map((l) => [...l, 1]))};

insert into public.emergencias (id, zona_id, activa, es_simulacro, mensaje) values
  (${q(EMERGENCIA)}, 1, false, true, 'Simulacro: sismo en Lince. Reporta a quien necesite ayuda.');

insert into public.reportes_vulnerables (id, emergencia_id, tipo, descripcion, lat_aprox, lng_aprox, estado, reportado_por, atendido_por) values
${valores(reportes)};

insert into public.reportes_direcciones (reporte_id, direccion) values
${valores(direcciones)};

insert into public.recursos_criticos (id, emergencia_id, tipo, accion, cantidad, detalle, lat, lng, user_id) values
${valores(recursos)};

select setval(pg_get_serial_sequence('public.zonas', 'id'), 1);
select setval(pg_get_serial_sequence('public.oficios', 'id'), ${OFICIOS.length});
`

writeFileSync(fileURLToPath(new URL('../supabase/seed.sql', import.meta.url)), sql)
console.log(`seed: ${usuarios.length} vecinos, ${prestadores.length} prestadores, ${vistos.length} vistos buenos, ${favores.length} favores, ${GRUPOS.length} grupos, ${reportes.length} reportes, ${recursos.length} recursos`)
