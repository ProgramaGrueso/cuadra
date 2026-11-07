// Pasarela de la demo: una sola URL para la app y la API, pensada para ir detras de un tunel.
// Sirve dist/ y deja pasar solo las rutas de Supabase que usa la app, y solo con la clave anon.
import { createReadStream, statSync } from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { extname, join, resolve, sep } from 'node:path'
import { manejarAgente } from './agente.mjs'

const PUERTO = Number(process.env.PASARELA_PUERTO ?? 4173)
const API_HOST = '127.0.0.1'
const API_PUERTO = 54321
const DIST = resolve(process.env.PASARELA_DIST ?? 'dist')
const CLAVE_ANON = process.env.PASARELA_CLAVE_ANON

if (!CLAVE_ANON) {
  console.error('Falta PASARELA_CLAVE_ANON')
  process.exit(1)
}

const RUTAS_API = [
  /^\/auth\/v1\/(signup|token|user|logout)$/,
  /^\/rest\/v1\/[^/]+(\/[^/]+)*$/, // sin la raiz, que publica el esquema completo
  /^\/realtime\/v1\/websocket$/,
]
const ES_API = /^\/(auth|rest|realtime|storage|functions|graphql|pg|mcp|analytics)(\/|$)/

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

function autorizada(req, ruta, consulta) {
  if (!RUTAS_API.some((r) => r.test(ruta))) return false
  const clave = req.headers.apikey ?? consulta.get('apikey')
  if (clave !== CLAVE_ANON) return false
  // El token debe ser un JWT: las claves sb_secret_ locales son publicas y actuan como service_role.
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  return !token.startsWith('sb_')
}

// El limite de Supabase Auth no actua sin GOTRUE_RATE_LIMIT_HEADER, que la CLI no expone.
// Por eso se limita aqui. Holgado porque el publico de la demo puede compartir un mismo wifi.
const ALTAS_POR_HORA = 40
const HORA_MS = 3_600_000
const altas = new Map()

function altaPermitida(req) {
  // Cloudflare fija cf-connecting-ip, y la pasarela solo escucha en 127.0.0.1 detras del tunel.
  const ip = req.headers['cf-connecting-ip'] ?? req.socket.remoteAddress
  const ahora = Date.now()
  const registro = altas.get(ip)
  if (!registro || ahora >= registro.fin) {
    if (altas.size >= 10_000) altas.clear()
    altas.set(ip, { cuenta: 1, fin: ahora + HORA_MS })
    return true
  }
  registro.cuenta += 1
  return registro.cuenta <= ALTAS_POR_HORA
}

function cabecerasHaciaApi(req) {
  const cabeceras = { ...req.headers, host: `${API_HOST}:${API_PUERTO}` }
  const ip = req.headers['cf-connecting-ip']
  if (ip) cabeceras['x-forwarded-for'] = ip
  return cabeceras
}

function archivoDeDist(ruta) {
  let decodificada
  try {
    decodificada = decodeURIComponent(ruta)
  } catch {
    return null
  }
  const destino = resolve(join(DIST, decodificada))
  if (destino !== DIST && !destino.startsWith(DIST + sep)) return null
  try {
    return statSync(destino).isFile() ? destino : null
  } catch {
    return null
  }
}

function servirEstatico(req, res, ruta) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end()
    return
  }
  // Las rutas de la app caen en index.html; un archivo que falta con extension es un 404 real.
  const archivo = archivoDeDist(ruta) ?? (extname(ruta) ? null : join(DIST, 'index.html'))
  if (!archivo) {
    res.writeHead(404).end()
    return
  }
  const inmutable = ruta.startsWith('/assets/')
  res.writeHead(200, {
    'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream',
    'cache-control': inmutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  })
  if (req.method === 'HEAD') res.end()
  else createReadStream(archivo).pipe(res)
}

const servidor = http.createServer((req, res) => {
  const { pathname, searchParams } = new URL(req.url, 'http://pasarela')
  if (pathname === '/agente/v1/chat') {
    if (req.headers.apikey !== CLAVE_ANON) {
      res.writeHead(403, { 'content-type': 'application/json' }).end('{"error":"no permitido"}')
      return
    }
    void manejarAgente(req, res)
    return
  }
  if (!ES_API.test(pathname)) {
    servirEstatico(req, res, pathname)
    return
  }
  if (!autorizada(req, pathname, searchParams)) {
    res.writeHead(403, { 'content-type': 'application/json' }).end('{"error":"no permitido"}')
    return
  }
  if (req.method === 'POST' && pathname === '/auth/v1/signup' && !altaPermitida(req)) {
    res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '3600' }).end('{"error":"demasiados registros"}')
    return
  }
  const salida = http.request(
    { host: API_HOST, port: API_PUERTO, method: req.method, path: req.url, headers: cabecerasHaciaApi(req) },
    (respuesta) => {
      res.writeHead(respuesta.statusCode, respuesta.headers)
      respuesta.pipe(res)
    },
  )
  salida.on('error', () => {
    if (!res.headersSent) res.writeHead(502)
    res.end()
  })
  req.pipe(salida)
})

servidor.on('upgrade', (req, socket, inicio) => {
  const { pathname, searchParams } = new URL(req.url, 'http://pasarela')
  socket.on('error', () => socket.destroy())
  if (!autorizada(req, pathname, searchParams)) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
    return
  }
  const salida = net.connect(API_PUERTO, API_HOST, () => {
    const cabeceras = Object.entries(cabecerasHaciaApi(req))
      .map(([nombre, valor]) => `${nombre}: ${valor}`)
      .join('\r\n')
    salida.write(`GET ${req.url} HTTP/1.1\r\n${cabeceras}\r\n\r\n`)
    if (inicio.length) salida.write(inicio)
    salida.pipe(socket)
    socket.pipe(salida)
  })
  salida.on('error', () => socket.destroy())
})

servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log(`Pasarela en http://127.0.0.1:${PUERTO}`)
})
