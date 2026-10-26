#!/bin/bash
# Start the local stack: Postgres (Docker), the report server and the frontend, wired to
# each other's ports. Ctrl-C stops both servers; Postgres keeps running.
#
# Usage: pnpm dev [--port N] [--report-port M] [--no-db] [--log-dir DIR] [--keep-logs K]
#   --port N          frontend port (default 3000)
#   --report-port M   report server port; defaults to N + 1
#   --no-db           skip Docker, for when POSTGRES_PRISMA_URL points at a remote database
#   --log-dir DIR     where server logs go (default logs/; relative paths are from the repo root)
#   --keep-logs K     how many runs' logs to keep (default 10)
# Each run logs to DIR/runs/<start time>/{web,report}.log, without colors and with a timestamp
# per line; DIR/web.log and DIR/report.log link to the latest run, so `tail -F` follows restarts.
# Starting Docker automatically needs macOS (Docker Desktop); elsewhere, start the daemon first.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/apps/frontend/docker-compose.yml"

WEB_PORT=3000
REPORT_PORT=
REPORT_PORT_SET=false
START_DB=true
LOG_DIR=logs
KEEP_LOGS=10
while [[ $# -gt 0 ]]; do
  case $1 in
    --port)
      [[ $# -ge 2 ]] || { echo "dev: --port needs a value (see --help)" >&2; exit 1; }
      WEB_PORT=$2; shift 2 ;;
    --port=*) WEB_PORT=${1#*=}; shift ;;
    --report-port)
      [[ $# -ge 2 ]] || { echo "dev: --report-port needs a value (see --help)" >&2; exit 1; }
      REPORT_PORT=$2; REPORT_PORT_SET=true; shift 2 ;;
    --report-port=*) REPORT_PORT=${1#*=}; REPORT_PORT_SET=true; shift ;;
    --no-db) START_DB=false; shift ;;
    --log-dir)
      [[ $# -ge 2 ]] || { echo "dev: --log-dir needs a value (see --help)" >&2; exit 1; }
      LOG_DIR=$2; shift 2 ;;
    --log-dir=*) LOG_DIR=${1#*=}; shift ;;
    --keep-logs)
      [[ $# -ge 2 ]] || { echo "dev: --keep-logs needs a value (see --help)" >&2; exit 1; }
      KEEP_LOGS=$2; shift 2 ;;
    --keep-logs=*) KEEP_LOGS=${1#*=}; shift ;;
    --) shift ;;
    -h | --help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "dev: unknown option $1 (see --help)" >&2; exit 1 ;;
  esac
done
# No leading zero, which (( )) reads as octal, and at most 5 digits, so it can't overflow.
check_port() {
  if ! [[ $2 =~ ^[1-9][0-9]{0,4}$ ]] || (($2 < 1024 || $2 > 65535)); then
    echo "dev: $1 must be a number from 1024 to 65535 (got '$2')" >&2
    exit 1
  fi
}
check_port --port "$WEB_PORT"
if $REPORT_PORT_SET; then
  check_port --report-port "$REPORT_PORT"
elif ((WEB_PORT == 65535)); then
  echo "dev: --port 65535 leaves no default report port; pass --report-port" >&2
  exit 1
else
  REPORT_PORT=$((WEB_PORT + 1))
fi
if ((WEB_PORT == REPORT_PORT)); then
  echo "dev: --port and --report-port must differ (both $WEB_PORT)" >&2
  exit 1
fi
if ! [[ $KEEP_LOGS =~ ^[1-9][0-9]{0,3}$ ]]; then
  echo "dev: --keep-logs must be a number from 1 to 9999 (got '$KEEP_LOGS')" >&2
  exit 1
fi
[[ -n $LOG_DIR ]] || { echo "dev: --log-dir can't be empty" >&2; exit 1; }
[[ $LOG_DIR == /* ]] || LOG_DIR="$ROOT/$LOG_DIR"

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

# Passes output through unchanged and appends it to the file $1 without color codes, each line
# stamped with the local time. Perl, because bash 3.2 can't format the time without running
# `date` once per line.
log_to() {
  perl -e '
    use strict; use warnings; use IO::Handle; use POSIX qw(strftime); use Time::HiRes qw(time);
    open(my $log, ">>", $ARGV[0]) or die "dev: can'"'"'t write $ARGV[0]: $!\n";
    $log->autoflush(1);
    STDOUT->autoflush(1);
    while (my $line = <STDIN>) {
      print $line;
      $line =~ s/\e\[[0-?]*[ -\/]*[@-~]//g;
      $line .= "\n" unless $line =~ /\n\z/;
      my $now = time;
      printf $log "%s.%03d %s", strftime("%H:%M:%S", localtime $now), ($now - int $now) * 1000, $line;
    }
  ' "$1"
}

# A new directory per run, so a restart keeps the previous run's logs. Names sort by start
# time, which is what pruning relies on. Plain mkdir fails if the directory exists, so two
# runs started in the same second can't share one.
RUN_ID=$(date +%Y-%m-%dT%H-%M-%S)
RUN_DIR="$LOG_DIR/runs/$RUN_ID"
mkdir -p "$LOG_DIR/runs"
mkdir "$RUN_DIR" 2>/dev/null || { [[ -e $RUN_DIR ]] && RUN_DIR="$RUN_DIR-$$"; mkdir "$RUN_DIR"; }
for name in web report; do
  touch "$RUN_DIR/$name.log"
  # Swap the link with a rename, so a reader never finds it missing. Relative, so the log
  # directory can be moved.
  ln -s "runs/${RUN_DIR##*/}/$name.log" "$LOG_DIR/.$name.log.$$"
  mv -f "$LOG_DIR/.$name.log.$$" "$LOG_DIR/$name.log"
done
runs=("$LOG_DIR"/runs/[0-9][0-9][0-9][0-9]-*/)
# Skip this run: if the clock went back (daylight saving ends), its name sorts before older ones.
for ((i = 0; i < ${#runs[@]} - KEEP_LOGS; i++)); do
  [[ ${runs[i]%/} == "$RUN_DIR" ]] || rm -rf -- "${runs[i]}"
done

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
  pnpm --filter node-pdf-generation dev </dev/null 2>&1 | log_to "$RUN_DIR/report.log" | prefix report &
report_pid=$!

PDF_SERVER_URL="http://localhost:$REPORT_PORT" NEXTAUTH_URL="http://localhost:$WEB_PORT" \
  pnpm --filter voter-file-tool dev --port "$WEB_PORT" </dev/null 2>&1 | log_to "$RUN_DIR/web.log" | prefix web &
web_pid=$!

echo "dev: frontend http://localhost:$WEB_PORT, report server http://localhost:$REPORT_PORT"
echo "dev: logs in $LOG_DIR/{web,report}.log (this run: $RUN_DIR)"

# Bash 3.2 (macOS) has no `wait -n`, so poll; if either server exits, stop the other.
while kill -0 "$report_pid" 2>/dev/null && kill -0 "$web_pid" 2>/dev/null; do
  sleep 1
done
echo "dev: a server exited; stopping the other" >&2
exit 1
