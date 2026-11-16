#!/bin/bash
# Start the frontend (`next dev`) against the LOCAL Docker Postgres, never a remote one.
# Usage: serve.sh [--workspace] [--port N]
#   --workspace   set COMMITTEES_WORKSPACE=1 (default here is off, legacy /committees)
# Logs to $LOG (default: $TMPDIR/run-frontend-dev.log). Blocks; run it in the background.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."   # apps/frontend

PORT=3000
WORKSPACE=
while [[ $# -gt 0 ]]; do
  case $1 in
    --workspace) WORKSPACE=1; shift ;;
    --port) PORT=$2; shift 2 ;;
    *) echo "serve.sh: unknown option $1" >&2; exit 1 ;;
  esac
done

C=frontend-postgres-1
docker ps --format '{{.Names}}' | grep -qx "$C" || { echo "serve.sh: $C is not running (docker compose -f apps/frontend/docker-compose.yml up -d)" >&2; exit 1; }
U=$(docker exec $C printenv POSTGRES_USER)
P=$(docker exec $C printenv POSTGRES_PASSWORD)
D=$(docker exec $C printenv POSTGRES_DB)
# Compose's POSTGRES_PORT may differ from 5432. Use the running container's mapping.
DB_PORT=$(docker port "$C" 5432/tcp | awk -F: 'NR == 1 {print $NF}')
[[ $DB_PORT =~ ^[0-9]+$ ]] || { echo "serve.sh: $C has no published port for 5432/tcp" >&2; exit 1; }

LOG=${LOG:-${TMPDIR:-/tmp}/run-frontend-dev.log}
echo "serve.sh: http://localhost:$PORT  workspace=${WORKSPACE:-off}  log=$LOG"
# Process env wins over apps/frontend/.env, which has had remote (Neon) URLs in it.
POSTGRES_PRISMA_URL="postgresql://$U:$P@localhost:$DB_PORT/$D" \
  COMMITTEES_WORKSPACE="$WORKSPACE" PORT="$PORT" \
  exec npx next dev >"$LOG" 2>&1
