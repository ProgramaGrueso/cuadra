import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // En desarrollo el asistente corre aparte: npm run agente
  server: { proxy: { '/agente': 'http://127.0.0.1:8787' } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Cuadra: tu red de vecinos',
        short_name: 'Cuadra',
        description: 'Servicios recomendados por tus vecinos, favores sin dinero y ayuda en emergencias.',
        lang: 'es-PE',
        start_url: '/',
        display: 'standalone',
        background_color: '#f6f4ee',
        theme_color: '#14614a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapa-tiles-v2',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
              // Con CORS se ve el estado real: un 403 de OSM ya no se guarda por 14 dias.
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
})
