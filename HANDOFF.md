# HANDOFF — Cuadra (2026-11-07)

## Hecho en esta sesión (rama `funciones-completas`, sin push)
- `464bf7a` Mapa de emergencia con grupos de apoyo y lugares reales (tabla `lugares_emergencia`).
- `cc10a3c` Puntos de reunión "sugeridos por el equipo": Castilla, Pedro Ruiz Gallo, Santos Dumont (nota de El Peruano) y Campo de Marte (Jesús María). El mapa aclara que no son la lista oficial.
- `2db02e6` **Asistente por voz** (botón "Asistente", abajo a la izquierda): habla/escribe y el asistente maneja la app con DeepSeek (buscar, contactar, publicar favores, reportes, recursos, Estoy bien, llamar). Toda publicación pide Sí/No. Sin señal queda "Escuchar esta pantalla". Archivos: `scripts/agente.mjs` (servidor, prompt y herramientas), `src/lib/agente.ts` (ejecuta herramientas), `src/components/AsistenteVoz.tsx`, `src/lib/voz.ts`.
- Logo nuevo: casa con techo escalonado (chakana), corazón, vecinos y la calle. `public/icon*.{svg,png}`, `marca/` (logos horizontales para el pitch). Conceptos de Krea2 en `~/ComfyUI/output/cuadra_logo/`.

## Verificado
- `npm run build` OK, `npm run db:test` sin fallas, `npm run db:reset` aplicado.
- Asistente probado con la API real de DeepSeek en Chromium (Playwright, 390×844): registro → "Busco un gasfitero cerca" (4 resultados, ~2 s) → "Ábrame la ficha del más cercano" (navega a la ficha) → "Quiero pedir que me lleven al médico…" (aparece Sí/No; con No no se publica). Emergencia grave: responde 116/106 sin herramientas. Inyección en texto de vecinos: rechazada.
- Notas DeepSeek: hay que mandar `thinking: {type: 'disabled'}` (si no, el segundo turno falla pidiendo `reasoning_content`). El servidor quita markdown antes de leer en voz alta.

## Pendiente
- Clave de DeepSeek ya está en `supabase/.env` (ignorado por git). Opcional `DEEPSEEK_MODEL` (por defecto `deepseek-v4-flash`).
- Probar el micrófono (dictado) y la voz en un Android real: en el navegador sin cabeza solo se probó escribiendo.
- Desarrollo del asistente: `npm run agente` en otra terminal junto a `npm run dev`. En la demo lo sirve la pasarela.
- Probar Escuchar en un Android real (voz es-PE/es-419, y si funciona sin señal).
- Recorrer el flujo completo en el celular con `scripts/demo.sh up`.
- Push y PR a `main`.
- Guion de demo y material del pitch (imágenes/video con ComfyUI).

## Comandos
- `npm run dev` · `npm run db:reset` · `npm run db:test` · `scripts/demo.sh up|down`
