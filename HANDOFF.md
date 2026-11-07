# HANDOFF — Cuadra (2026-11-07)

## Hecho en esta sesión (rama `funciones-completas`, sin push)
- `464bf7a` Mapa de emergencia con grupos de apoyo y lugares reales (tabla `lugares_emergencia`).
- `cc10a3c` Puntos de reunión "sugeridos por el equipo": Castilla, Pedro Ruiz Gallo, Santos Dumont (nota de El Peruano) y Campo de Marte (Jesús María). El mapa aclara que no son la lista oficial.
- `2db02e6` **Asistente por voz** (botón "Asistente", abajo a la izquierda): habla/escribe y el asistente maneja la app con DeepSeek (buscar, contactar, publicar favores, reportes, recursos, Estoy bien, llamar). Toda publicación pide Sí/No. Sin señal queda "Escuchar esta pantalla". Archivos: `scripts/agente.mjs` (servidor, prompt y herramientas), `src/lib/agente.ts` (ejecuta herramientas), `src/components/AsistenteVoz.tsx`, `src/lib/voz.ts`.
- Logo nuevo: casa con techo escalonado (chakana), corazón, vecinos y la calle. `public/icon*.{svg,png}`, `marca/` (logos horizontales para el pitch). Conceptos de Krea2 en `~/ComfyUI/output/cuadra_logo/`.

## Verificado
- `npm run build` OK, `npm run db:test` sin fallas, `npm run db:reset` aplicado.

## Pendiente
- **Poner la clave de DeepSeek**: agregar `DEEPSEEK_API_KEY=...` en `supabase/.env` (ignorado por git). Opcional `DEEPSEEK_MODEL` (por defecto `deepseek-v4-flash`). Probar el asistente de punta a punta: aún no se probó con la API real.
- Desarrollo del asistente: `npm run agente` en otra terminal junto a `npm run dev`. En la demo lo sirve la pasarela.
- Probar Escuchar en un Android real (voz es-PE/es-419, y si funciona sin señal).
- Recorrer el flujo completo en el celular con `scripts/demo.sh up`.
- Push y PR a `main`.
- Decidir ideas de diferenciación (ver la conversación): logo/identidad, agente de voz, guion de demo.

## Comandos
- `npm run dev` · `npm run db:reset` · `npm run db:test` · `scripts/demo.sh up|down`
