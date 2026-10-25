#!/bin/bash
# Start the local stack: Postgres (Docker), the report server and the frontend, wired to
# each other's ports. Ctrl-C stops both servers; Postgres keeps running.
#
# Usage: pnpm dev [--port 3000] [--no-db]
#   --port N   frontend port; the report server listens on N+1
#   --no-db    skip Docker, for when POSTGRES_PRISMA_URL points at a remote database
# Starting Docker automatically needs macOS (Docker Desktop); elsewhere, start the daemon first.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/apps/frontend/docker-compose.yml"

WEB_PORT=3000
START_DB=true
while [[ $# -gt 0 ]]; do
  case $1 in
    --port)
      [[ $# -ge 2 ]] || { echo "dev: --port needs a value (see --help)" >&2; exit 1; }
      WEB_PORT=$2; shift 2 ;;
    --port=*) WEB_PORT=${1#*=}; shift ;;
    --no-db) START_DB=false; shift ;;
    --) shift ;;
    -h | --help) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "dev: unknown option $1 (see --help)" >&2; exit 1 ;;
  esac
done
if ! [[ $WEB_PORT =~ ^[0-9]+$ ]] || ((WEB_PORT < 1024 || WEB_PORT > 65534)); then
  echo "dev: --port must be a number from 1024 to 65534 (got '$WEB_PORT')" >&2
  exit 1
fi
REPORT_PORT=$((WEB_PORT + 1))

# Fail on a taken port instead of letting a server drift to another one.
if command -v lsof >/dev/null; then
  for port in "$WEB_PORT" "$REPORT_PORT"; do
    pid=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1 || true)
    if [[ -n $pid ]]; then
      echo "dev: port $port is in use by $(ps -o comm= -p "$pid") (pid $pid)" >&2
      exit 1
    fi
  done
else
  echo "dev: lsof isn't installed, so ports $WEB_PORT and $REPORT_PORT weren't checked" >&2
fi

if $START_DB; then
  # docker compose reads these from apps/frontend/.env; without them it fails with an unclear error.
  for var in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB POSTGRES_PORT; do
    if ! grep -q "^$var=" "$ROOT/apps/frontend/.env" 2>/dev/null; then
      echo "dev: $var isn't set in apps/frontend/.env (see scripts/README.md, or use --no-db)" >&2
      exit 1
    fi
  done
  if ! docker info >/dev/null 2>&1; then
    if [[ $(uname) != Darwin ]]; then
      echo "dev: Docker isn't running; start the Docker daemon and try again" >&2
      exit 1
    fi
    echo "dev: starting Docker Desktop..."
    open -a Docker
    for _ in $(seq 90); do
      docker info >/dev/null 2>&1 && break
      sleep 1
    done
    docker info >/dev/null 2>&1 || { echo "dev: Docker didn't start within 90s" >&2; exit 1; }
  fi
  # Same project as scripts/setup-dev-db.sh, so this reuses the existing container and data.
  docker compose -f "$COMPOSE_FILE" up -d
  db_ready=false
  for _ in $(seq 30); do
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -q; then
      db_ready=true
      break
    fi
    sleep 1
  done
  $db_ready || echo "dev: Postgres isn't ready after 30s; starting anyway (docker compose -f $COMPOSE_FILE logs postgres)" >&2
fi

# The apps import workspace packages from dist/, which is gitignored. Checks the same packages
# build:packages builds, so a new package needs no change here.
for pkg in "$ROOT"/packages/*/; do
  if grep -qs '"build":' "$pkg/package.json" && [[ ! -d "$pkg/dist" ]]; then
    pnpm --dir "$ROOT" run build:packages
    break
  fi
done

if [[ ! -f "$ROOT/apps/report-server/public/tailwind.css" ]]; then
  pnpm --dir "$ROOT/apps/report-server" run build:css
fi

prefix() {
  while IFS= read -r line; do printf '[%s] %s\n' "$1" "$line"; done
}

# Job control puts each server pipeline in its own process group, so stopping can signal
# exactly those groups rather than whatever started this script. The servers get </dev/null
# because a background group that reads the terminal is stopped (nodemon reads stdin).
set -m
stop() {
  trap - EXIT INT TERM
  for pgid in $(jobs -p); do kill -TERM -- "-$pgid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap stop EXIT
trap 'stop; exit 130' INT
trap 'stop; exit 143' TERM
export FORCE_COLOR=1
cd "$ROOT"

PORT=$REPORT_PORT CALLBACK_URL="http://localhost:$WEB_PORT/api/reportComplete" \
  pnpm --filter node-pdf-generation dev </dev/null 2>&1 | prefix report &
report_pid=$!

PDF_SERVER_URL="http://localhost:$REPORT_PORT" NEXTAUTH_URL="http://localhost:$WEB_PORT" \
  pnpm --filter voter-file-tool dev --port "$WEB_PORT" </dev/null 2>&1 | prefix web &
web_pid=$!

echo "dev: frontend http://localhost:$WEB_PORT, report server http://localhost:$REPORT_PORT"

# Bash 3.2 (macOS) has no `wait -n`, so poll; if either server exits, stop the other.
while kill -0 "$report_pid" 2>/dev/null && kill -0 "$web_pid" 2>/dev/null; do
  sleep 1
done
echo "dev: a server exited; stopping the other" >&2
exit 1
