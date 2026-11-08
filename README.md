# Cuadra

PWA móvil para que los vecinos encuentren servicios recomendados cerca de casa, se hagan favores sin dinero y se coordinen en una emergencia. Hackathon UTP x El Comercio, noviembre de 2026.

## Stack

React, Vite, TypeScript, Tailwind · vite-plugin-pwa · Leaflet y OpenStreetMap · Supabase autohospedado con Docker (Postgres, PostGIS, Auth, Realtime) · Dexie para el modo sin señal.

Todo corre en un PC propio. No hay despliegue público permanente: la URL existe solo mientras está abierto el túnel de la demo.

## Cómo correrlo

Requiere Node y Docker. Para el túnel, además, `cloudflared`.

Desarrollo:

```bash
npm install
npx supabase start          # base local con esquema y seed
# Copia .env.example a .env.local y usa API_URL y ANON_KEY de: npx supabase status -o env
npm run dev
```

Demo (app y API detrás de una sola pasarela en `127.0.0.1:4173`):

```bash
scripts/demo.sh up --sin-tunel    # solo en este PC
scripts/demo.sh up                # además abre un túnel de Cloudflare e imprime la URL
scripts/demo.sh verificar "Nombre del vecino"   # le permite activar el modo emergencia
scripts/demo.sh recargar          # tras cambiar código: recompila sin cambiar el link
scripts/demo.sh down              # apaga pasarela, túnel y base
```

| Comando | Qué hace |
| --- | --- |
| `npm run db:reset` | Regenera el seed y reconstruye la base local |
| `npm run db:test` | Prueba privacidad y permisos contra la base local |
| `npm run build` | Compila la PWA en `dist/` |

El asistente por voz usa DeepSeek. Para activarlo, define `DEEPSEEK_API_KEY` en `supabase/.env` (ignorado por git; no se entrega). Sin esa clave la app funciona igual y solo el asistente queda desactivado.

Para que el botón Contactar funcione en la demo, define `DEMO_WHATSAPP` en `supabase/.env` (ignorado por git). Se aplica a los vecinos ficticios al levantar la demo, así que **cualquiera que pruebe Contactar verá ese número**.

## Qué funciona sin señal

- Abrir la app, ver servicios y favores guardados, y llamar a los números de emergencia.
- Durante una emergencia: seguir en modo emergencia, ver los últimos reportes y recursos guardados.
- Publicar favores, recursos, reportes y "Estoy bien": quedan como "Pendiente de enviar" y se envían solos al volver la señal, sin duplicarse.

Necesitan conexión: entrar por primera vez, activar el modo emergencia, dar un Visto Bueno, ofrecer un oficio y aceptar un reporte. La ficha de un prestador solo está disponible si ya se abrió antes.

## Seguridad de la demo

- La pasarela solo deja pasar las rutas de la API que usa la app, y solo con la clave anon.
- Limita las altas anónimas a 40 por hora y por IP, porque el límite de Supabase Auth no se aplica en esta instalación.
- Docker publica los puertos de Supabase en todas las interfaces: bloquéalos antes de conectarte a una red compartida.

## Privacidad

- La dirección exacta de un reporte vive en `reportes_direcciones`. Solo la ven quien reporta, el voluntario asignado y los admins.
- `users` guarda teléfono y ubicación exacta, y solo su dueño lee su fila. Los demás usan la vista `perfiles_publicos` y RPC.
- Toda ubicación pública se redondea a unos 110 m en la base de datos.
- Los cambios de estado pasan por RPC. Nadie puede marcarse como verificado desde el cliente.

## Datos de demostración

`supabase/seed.sql` se genera con `scripts/generate-seed.mjs`. Vecinos, prestadores, favores y reportes son ficticios, y sus teléfonos quedan vacíos para no enlazar a personas reales por WhatsApp. Son reales, con su fuente en la columna `fuente`, los grupos de apoyo (`grupos_apoyo`) y los lugares del mapa de emergencia (`lugares_emergencia`: puntos de reunión y un supermercado). Los puntos de reunión los sugiere el equipo: tres parques de Lince según una nota de El Peruano y Campo de Marte, en Jesús María. No son la lista oficial de la municipalidad. Una tienda en el mapa no asegura stock durante una emergencia. Los recursos que publican los vecinos siguen en la lista de Recursos y los del seed son ficticios, por eso no van al mapa.
