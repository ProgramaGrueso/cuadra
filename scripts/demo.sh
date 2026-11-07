#!/usr/bin/env bash
# Levanta la demo bajo demanda y la apaga al terminar.
#   scripts/demo.sh up              base + pasarela + tunel de Cloudflare (imprime la URL)
#   scripts/demo.sh up --sin-tunel  igual, pero solo en http://127.0.0.1:4173
#   scripts/demo.sh down            apaga todo y lista lo que siga escuchando
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ESTADO="$RAIZ/.demo"
SECRETOS="$RAIZ/supabase/.env"
PUERTO=4173
cd "$RAIZ"
mkdir -p "$ESTADO"

valor_status() { npx supabase status -o env 2>/dev/null | sed -n "s/^$1=\"\(.*\)\"$/\1/p"; }

asegurar_secreto() {
  if ! grep -q '^CUADRA_JWT_SECRET=' "$SECRETOS" 2>/dev/null; then
    umask 077
    echo "CUADRA_JWT_SECRET=$(openssl rand -hex 32)" >>"$SECRETOS"
  fi
}

parar() {
  local archivo="$ESTADO/$1.pid"
  [[ -f "$archivo" ]] || return 0
  kill "$(cat "$archivo")" 2>/dev/null || true
  rm -f "$archivo"
}

en_segundo_plano() {
  local nombre="$1"
  shift
  setsid nohup "$@" >"$ESTADO/$nombre.log" 2>&1 </dev/null &
  echo $! >"$ESTADO/$nombre.pid"
}

up() {
  asegurar_secreto
  parar tunel
  parar pasarela
  npx supabase start >/dev/null

  local anon
  anon="$(valor_status ANON_KEY)"
  [[ -n "$anon" ]] || { echo 'No se pudo leer la clave anon' >&2; exit 1; }

  # La app y la API comparten origen, asi la URL aleatoria del tunel no obliga a recompilar.
  VITE_SUPABASE_URL=mismo-origen VITE_SUPABASE_ANON_KEY="$anon" npm run build >/dev/null

  PASARELA_CLAVE_ANON="$anon" PASARELA_PUERTO="$PUERTO" en_segundo_plano pasarela node scripts/pasarela.mjs
  for _ in {1..20}; do
    curl -fsS -o /dev/null "http://127.0.0.1:$PUERTO/" 2>/dev/null && break
    sleep 0.5
  done
  curl -fsS -o /dev/null "http://127.0.0.1:$PUERTO/" || { echo 'La pasarela no arranco' >&2; exit 1; }

  if [[ "${1:-}" == '--sin-tunel' ]]; then
    echo "Demo local: http://127.0.0.1:$PUERTO"
    return
  fi

  en_segundo_plano tunel cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:$PUERTO"
  local url=''
  for _ in {1..60}; do
    url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$ESTADO/tunel.log" | head -1 || true)"
    [[ -n "$url" ]] && break
    sleep 1
  done
  [[ -n "$url" ]] || { echo "El tunel no dio URL; revisa $ESTADO/tunel.log" >&2; exit 1; }
  echo "Demo publica: $url"
}

down() {
  parar tunel
  parar pasarela
  npx supabase stop >/dev/null || true
  ss -ltnp | grep -E ":($PUERTO|54321|54322|54323)\b" || echo 'Puertos de la demo libres'
}

case "${1:-}" in
  up) shift; up "$@" ;;
  down) down ;;
  *) echo 'Uso: scripts/demo.sh up [--sin-tunel] | down' >&2; exit 2 ;;
esac
