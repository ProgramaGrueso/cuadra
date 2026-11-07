# Cuadra

PWA móvil para que los vecinos encuentren servicios recomendados cerca de casa, se hagan favores sin dinero y se coordinen en una emergencia. Hackathon UTP x El Comercio, noviembre de 2026.

## Stack

React, Vite, TypeScript, Tailwind · vite-plugin-pwa · Leaflet y OpenStreetMap · Supabase (Postgres, PostGIS, Auth, Realtime) · Vercel.

## Cómo correrlo

Requiere Node y Docker.

```bash
npm install
npx supabase start          # base local con esquema y seed
# Copia .env.example a .env.local y usa API_URL y ANON_KEY de: npx supabase status -o env
npm run dev
```

| Comando | Qué hace |
| --- | --- |
| `npm run db:reset` | Regenera el seed y reconstruye la base local |
| `npm run db:test` | Prueba privacidad y permisos contra la base local |
| `npm run build` | Compila la PWA en `dist/` |

## Privacidad

- La dirección exacta de un reporte vive en `reportes_direcciones`. Solo la ven quien reporta, el voluntario asignado y los admins.
- `users` guarda teléfono y ubicación exacta, y solo su dueño lee su fila. Los demás usan la vista `perfiles_publicos` y RPC.
- Toda ubicación pública se redondea a unos 110 m en la base de datos.
- Los cambios de estado pasan por RPC. Nadie puede marcarse como verificado desde el cliente.

## Datos de demostración

`supabase/seed.sql` se genera con `scripts/generate-seed.mjs`. Vecinos, prestadores, favores y reportes son ficticios, y sus teléfonos quedan vacíos para no enlazar a personas reales por WhatsApp. Los grupos de apoyo y los números de emergencia son reales, con su fuente en la columna `fuente` de `grupos_apoyo`.
