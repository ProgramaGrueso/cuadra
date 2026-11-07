# HANDOFF — Cuadra (2026-11-07)

## Hecho en esta sesión (rama `funciones-completas`, sin push)
- `464bf7a` Mapa de emergencia con grupos de apoyo y lugares reales (tabla `lugares_emergencia`).
- `cc10a3c` Puntos de reunión "sugeridos por el equipo": Castilla, Pedro Ruiz Gallo, Santos Dumont (nota de El Peruano) y Campo de Marte (Jesús María). El mapa aclara que no son la lista oficial.
- Botón flotante **Escuchar** (abajo a la izquierda): lee la pantalla con la voz del teléfono (`speechSynthesis`, sin red ni claves). Se puede apagar en Mi perfil. Archivos: `src/lib/voz.ts`, `src/components/BotonEscuchar.tsx`.

## Verificado
- `npm run build` OK, `npm run db:test` sin fallas, `npm run db:reset` aplicado.

## Pendiente
- Probar Escuchar en un Android real (voz es-PE/es-419, y si funciona sin señal).
- Recorrer el flujo completo en el celular con `scripts/demo.sh up`.
- Push y PR a `main`.
- Decidir ideas de diferenciación (ver la conversación): logo/identidad, agente de voz, guion de demo.

## Comandos
- `npm run dev` · `npm run db:reset` · `npm run db:test` · `scripts/demo.sh up|down`
