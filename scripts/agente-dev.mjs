// Servidor del asistente para `npm run dev` (Vite reenvia /agente aqui). En la demo lo sirve la pasarela.
import http from 'node:http'
import { agenteConfigurado, manejarAgente } from './agente.mjs'

const PUERTO = 8787
http
  .createServer((req, res) => {
    if (new URL(req.url, 'http://x').pathname === '/agente/v1/chat') void manejarAgente(req, res)
    else res.writeHead(404).end()
  })
  .listen(PUERTO, '127.0.0.1', () => {
    console.log(`Asistente en http://127.0.0.1:${PUERTO} (${agenteConfigurado ? 'con clave' : 'SIN clave: falta DEEPSEEK_API_KEY en supabase/.env'})`)
  })
