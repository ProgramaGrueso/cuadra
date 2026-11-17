# Smitline en Cuadra: análisis de viabilidad (2026-11-12)

Análisis del repo [kaelorlabs/smitline](https://github.com/kaelorlabs/smitline) (v0.3.12, commit del 2026-11-11) contra el estado actual de Cuadra. Este documento es el punto de partida: cualquier sesión de OpenCode puede retomarlo sin volver a investigar.

## Resultado

**Se puede usar, pero Smitline no es lo que parece.** No es una capa de voz para la app: es un runtime de llamadas telefónicas y reuniones para agentes de IA. El asistente por voz de Cuadra (DeepSeek + Web Speech) **no se toca**.

El encaje real son tres funciones; solo una tiene valor diferencial claro frente a lo que ya hace la app (contactar al prestador de verdad, no abrir un WhatsApp). El riesgo principal no es técnico sino de confianza: Cuadra vende confianza entre vecinos, y una IA llamando desde un número extranjero se lee como fraude.

**Recomendación:** no integrar todavía. hacer la prueba de 30 minutos (abajo) y decidir con datos.

## Qué es Smitline

| | |
|---|---|
| Qué hace | Un contenedor Docker que da a un agente **una línea telefónica** (SignalWire o Twilio) y **un asiento en Zoom/Teams/Meet**, hablando con GPT-Live en tiempo real |
| Interfaces | MCP sobre HTTP en `127.0.0.1:8095/mcp`, CLI, REST (`/v1/calls`), SDKs TypeScript y Python |
| Contrato | Se manda un *brief* (objetivo, contexto, qué puede aceptar, qué no debe decir) y vuelve un resultado: resumen, detalles, transcripción, costo |
| Herramientas MCP | `start_call`, `wait_for_call`, `send_call_instruction`, `reply_to_call_request`, `get_call`, `list_calls`, `end_call`, `transfer_call_to_me`, `save_call_note`, `check_call_brief`, `list_contacts`, `list_voices`, `update_profile`, `how_to_smitline` |
| Licencia | Apache-2.0, 72 estrellas, 435 commits, 1 issue abierto. El daemon está en el repo (`meeting-runtime/`, Python): es auditable |
| Verificado en vivo | SignalWire + llamadas: sí (desde 2026-09-29). Twilio: **no verificado**. SIP directo: no. Reuniones: Zoom sí; Teams y Google Meet con menos pruebas |

**Lo que NO es:** no es un motor de voz embebible en la PWA. Cuando el asistente habla con Doña Rosa, el audio va por el micrófono del navegador (`src/lib/voz.ts`) y DeepSeek. Smitline no interviene ahí y no hay forma de conectarlo sin reescribir el asistente.

## Requisitos: esta máquina ya cumple casi todo

| Requisito | Estado verificado |
|---|---|
| Docker Engine | ✅ 29.9.3 (Linux: no hace falta host networking de Docker Desktop) |
| Node ≥ 22 | ✅ v26.13.0 |
| API key de OpenAI con GPT-Live y billing activo | ❌ no hay ninguna en el entorno |
| SignalWire con tarjeta y $5 de saldo (o Twilio con fondos) | ❌ falta crear la cuenta |
| Imagen de reuniones (1.8 GB) | solo si se hace el caso C |
| Disco | +600 MB (base) / +1.8 GB (reuniones) |

El trial de SignalWire solo llama a números verificados **en EE.UU./Canadá** (máx. 10). El trial de Twilio **bloquea el streaming de audio**. Para marcar un +51 real hace falta SignalWire con tarjeta, y **su Auto Top-Up no se puede apagar**.

## Dónde tocaría en Cuadra

| Punto | Qué hay hoy | Qué haría Smitline |
|---|---|---|
| `src/lib/agente.ts:109` — `contactar_prestador` | abre `https://wa.me/...` y devuelve el control al humano | **aquí va la integración principal**: el agente llama y trae la cita confirmada |
| `src/lib/agente.ts:210` — `llamar` | marca `tel:` a 105/106/115/116 | **no se toca nunca** (ver restricciones) |
| `src/lib/emergencia.tsx:32` | canal Realtime `estado-emergencia` | patrón para que el resultado de una llamada llegue al teléfono |
| `scripts/agente.mjs:36` — `HERRAMIENTAS` | tools del asistente DeepSeek | una tool nueva: `contactar_por_llamada` |

**Restricción arquitectónica:** el endpoint MCP de Smitline rechaza cualquier request con header `Origin` y solo acepta `Host: 127.0.0.1:8095`. El navegador del celular **no puede llamar a Smitline directamente**. Toda la integración vive en el servidor Node (`scripts/agente.mjs` o `scripts/pasarela.mjs`) → `POST http://127.0.0.1:8765/v1/calls` con el token de `/data/.smitline/daemon.auth`.

## Los tres encajes

### A. Llamar al prestador y traer la cita confirmada ★ el único con valor diferencial

Hoy: el vecino pide un gasfitero → se abre WhatsApp → el vecino escribe → nadie sabe si el gasfitero contestó.

Con Smitline: el asistente arma el brief (`objective`, `mayAgreeTo`, `mustNotShare`), llama, sigue la llamada con `wait_for_call`, y el resultado se guarda en la ficha del prestador y se le devuelve al vecino.

- La **dirección exacta va en `mustNotShare`, nunca en el brief**. Solo dirección aproximada (~110 m) o el nombre del barrio.
- `onBehalfOf` debe ser **una persona** ("Rosa"), nunca "Cuadra": el guardrail rechaza nombres de apps o IA (`meeting-runtime/call_brief.py:68`).
- Costo: ~6 ¢/min en SignalWire EE.UU.; a Perú, más.

### B. Activar y coordinar la emergencia por llamada

El agente llama a los voluntarios verificados para activar el modo rojo, o a un vecino vulnerable para confirmar su estado. La dirección exacta **nunca va en el brief**: se llama al voluntario asignado, que ya tiene acceso a `reportes_direcciones`.

### C. Minuta automática de la reunión con la municipalidad

Smitline entra a un Zoom como participante, toma la minuta y el resultado (`decisions`, `actionItems`, `transcript`) se guarda en el Tablero de Ayuda vía Realtime. Es la pieza que convierte en demo la promesa "la municipalidad obtiene un mapa vivo".

Requiere montar el socket de Docker (`/var/run/docker.sock`) → **acceso casi de administrador a la máquina**. En este caso es aceptable (ya corre Supabase en Docker), pero es una decisión consciente.

## Restricciones duras (verificadas en el código de Smitline)

| Restricción | Dónde | Efecto en Cuadra |
|---|---|---|
| Nunca marca emergencias: `EMERGENCY_NUMBERS` incluye `'115'`; el chequeo aplica a números de ≤6 dígitos | `meeting-runtime/call_brief.py:52-56` | los `tel:` de `agente.ts:210` se quedan como están. Una IA tampoco debe marcar 105/106/116 |
| Horario 08:00–21:00 en la zona del número (`phonenumbers`, +51 → America/Lima) | `meeting-runtime/call_policy.py:71` | en un sismo de madrugada no habría llamada. `afterHours: true` existe pero apaga el control para todos |
| 5 llamadas por número/24 h, 20 por hora, lista do-not-call | `docs/phone.md` | `SMITLINE_ALLOWED_CALLING_CODES=51` para limitar a Perú |
| Números premium y satelital rechazados | `docs/phone.md` | sin impacto |
| El webhook de resultado rechaza hosts privados salvo `SMITLINE_WEBHOOK_ALLOW_PRIVATE=1` | `docs/phone.md` | la pasarela vive en 127.0.0.1: hace falta ese flag si se usa webhook |

## Riesgos

| # | Riesgo | Gravedad | Mitigación |
|---|---|---|---|
| 1 | **Confianza / marca**: una IA llamando desde un número de EE.UU. en nombre de Cuadra se lee como fraude | 🔴 | solo a petición explícita del vecino, con `SMITLINE_CALLER_ID` = móvil verificado (el vecino ve un número conocido) y `transfer_call_to_me` disponible |
| 2 | **Trust de la IA en Lima**: el vecindario no está acostumbrado | 🔴 | probar con el círculo cercano antes de cualquier expo |
| 3 | **Sin señal = sin Smitline** | 🟠 | la app está diseñada para el terremoto sin redes. Degradar al `tel:` actual |
| 4 | **Transcripciones fuera de Supabase**: viven en el volumen Docker `smitline`, fuera de los 62 chequeos de `supabase/tests/privacidad.sql` | 🟠 | guardar solo el resultado estructurado y un `callId` de referencia, nunca la transcripción en la base |
| 5 | **Grabación**: en Perú se exige consentimiento de todos | 🟡 | mantener `record: false` |
| 6 | **Latencia**: "la llamada se siente un poco más lenta que hablar con una persona"; el audio hace un detour por el PC (30-50 ms por turno) | 🟡 | aceptable para negociar, no para una emergencia |
| 7 | **Números del seed vacíos** a propósito | 🟡 | hacen falta números reales de prueba para la demo |
| 8 | **Twilio no verificado en vivo** | 🟡 | usar SignalWire |

## Lo que NO debe usarse Smitline para

- ❌ Reemplazar el asistente por voz de la app. Es el diferenciador con Doña Rosa y ya funciona, sin costo por minuto.
- ❌ Reemplazar WhatsApp. Es gratis, culturalmente dominante en Perú y ya integrado (`src/components/BotonWhatsApp.tsx`, `src/pages/FichaPrestador.tsx:147`). Smitline solo aporta valor cuando hay que **negociar o confirmar**.
- ❌ El botón de emergencias ni el modo rojo en sí.
- ❌ Notificaciones push. Es lo que más valor real aporta en la hoja de ruta y Smitline no lo toca.

## Prueba de 30 minutos (sin tocar Cuadra)

```bash
# 1. Levantar (solo llamadas, SIN socket de Docker: no hay reuniones, pero tampoco se da acceso a Docker)
docker run -d --name smitline --restart unless-stopped --network host -v smitline:/data ghcr.io/kaelorlabs/smitline

# 2. Verificar
curl -fsS -o /dev/null http://127.0.0.1:8095/calls && echo ok

# 3. Qué falta (imprime los comandos para arreglarlo)
docker exec smitline smitline setup status --json

# 4. Página de claves (OpenAI + tu nombre). Las claves NO van al chat.
docker exec smitline smitline setup secrets --json

# 5. Te llama a tu celular: la prueba real
docker exec smitline smitline setup call-me --wait
```

**Criterio de go/no-go:** si la voz en español se entiende bien y la llamada "se siente viva", hay caso A. Si se siente lenta o robotizada, se descarta todo: nada de lo demás mejora eso.

## Diseño del PoC (caso A)

```
scripts/smitline.mjs     wrapper thin: POST /v1/calls + poll GET /v1/calls/{id}
scripts/agente.mjs       tool nueva 'contactar_por_llamada' + tool 'estado_llamada'
supabase/migrations/     tabla 'llamadas' (id, prestador_id, estado, resumen, call_id, creada_at)
src/lib/agente.ts        caso 'contactar_por_llamada': arma el brief desde la ficha, pide
                         confirmación, avisa "llamando…", espera por Realtime, muestra el resultado
```

El `wait_for_call` de 2-5 minutos vive **en el servidor**, no en la sesión del vecino: la PWA puede cerrarse y la llamada sigue. El teléfono se entera por el canal Realtime que ya usa el interruptor de emergencia.

## Orden de trabajo si se aprueba

1. Caso A primero, con `SMITLINE_ALLOWED_CALLING_CODES=51`, `record: false`, `mustNotShare` con direcciones, y resultados estructurados en Supabase sin transcripción.
2. Caso C solo después, y solo si A ya anda.
3. Caso B con extrema cautela.

## Referencias en el repo de Smitline

- `docs/agents.md` — herramientas MCP, seguimiento de llamada en vivo, requests desde la llamada
- `docs/phone.md` — cómo corre una llamada, guardrails, proveedores, costos, settings
- `docs/calls.md` — brief, resultado, REST
- `docs/architecture.md` — piezas, por qué el navegador no puede llamar al MCP
- `meeting-runtime/call_brief.py` — brief, `EMERGENCY_NUMBERS`, `onBehalfOf`
- `meeting-runtime/call_policy.py` — horarios por zona del número, límites
