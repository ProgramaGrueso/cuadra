# HANDOFF — Cuadra (2026-11-07, noche)

## Estado
- Rama `funciones-completas`, PR #1 hacia `main`. Todo subido.
- Demo arriba: pasarela en 127.0.0.1:4173 + túnel `https://falling-holmes-triple-significance.trycloudflare.com`. Apagar con `scripts/demo.sh down` y confirmar con `ss -ltnp`.
- Modo emergencia de la zona Lince: **apagado** (se apagó al tomar capturas). Juan Ganoza (verificado) lo activa desde Mi perfil.

## Hecho hoy
- Asistente por voz con DeepSeek (`2db02e6`, `266bc56`); voz estable en Android (`b615ab4`; la usuaria confirmó que funciona).
- Identidad visual: cabecera verde con logo y franja chakana, "+" terracota, tema rojo en emergencia (`b615ab4`).
- Mapa en escritorio (`d8709e0`): OSM devolvía 403 porque la pasarela mandaba `no-referrer`, y Workbox cacheaba las teselas bloqueadas. Ahora manda el origen, solo cachea 200 (`mapa-tiles-v2`) y borra el caché viejo.
- Prueba adversarial (`fd2486b`): 6 huecos cerrados en `supabase/migrations/20261107000000_endurecer.sql` (aplicada a la base viva sin reset). Informe en `docs/PRUEBA_ADVERSARIAL.md`. `privacidad.sql` tiene 62 comprobaciones.
- Material de la expo en `~/Documents/ExpoHackaton/`: `00_LEEME.md` (qué subir a NotebookLM y el prompt), documentos 01–09, pitch de 3 min y 1 min, guion Zoom de 15 min, preguntas del jurado, 18 capturas, imágenes de IA y logos.
- Guía del código para el equipo: `~/Documents/Hackaton2026/Cuadra_Guia_del_Codigo.md`.

- Voz (`c3ea082` y siguiente): espera las voces, no lee con voz inglesa (Firefox) y avisa si el navegador es mudo (Chromium de Arch sin speech-dispatcher). Si el micrófono no abre en 6 s, sugiere el micrófono del teclado. En Android fuera de Chrome (Oppo/HeyTap, enlaces abiertos desde WhatsApp) aparece "Abrir en Chrome para hablar".

## Ojo
- `npm run db:test` cuenta los reportes del seed (`= 6`): con datos de la demo (por ejemplo el reporte real de Juan) falla esa línea. Correrlo tras `npm run db:reset` o dentro de una transacción que borre lo posterior al seed.
- `npm run build` sin variables de la demo pisa `dist/`: usar `scripts/demo.sh recargar`.
- Hay usuarios de prueba en la base de la demo ("Rosa Prueba", "Prueba Marca", "Vecina Demo", "Carmen Demo").

## Pendiente
- Grabar el video de respaldo (guion en `ExpoHackaton/07_…`).
- Repartir roles y preguntas; ensayar 3 veces con cronómetro.
- Entrega en OneDrive antes del domingo 8: `git archive -o cuadra.zip HEAD` (no incluye `.env`).
- Micrófono en un Oppo (abierto desde WhatsApp) sigue sin funcionar tras el botón "Abrir en Chrome". Otras personas lo probarán en sus modelos; pedirles: modelo, cómo abrieron el enlace, qué pasa al tocar "Hablar", si aparece el botón verde. Si no se aclara, hacer una pantalla `?diagnostico`.
- Para la demo: abrir el enlace en Chrome e instalar la app desde ahí (⋮ → Instalar app); instalada desde HeyTap hereda su micrófono roto.
- Hoja de ruta: verificación con DNI, límite por IP del asistente, notificaciones push.

## Comandos
- `npm run dev` · `npm run agente` · `npm run db:reset` · `npm run db:test`
- `scripts/demo.sh up|recargar|verificar "Nombre"|down`
