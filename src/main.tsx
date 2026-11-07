import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// La version anterior guardaba mosaicos bloqueados por OSM ("Access blocked"): se descarta esa cache.
if ('caches' in window) void caches.delete('mapa-tiles')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
