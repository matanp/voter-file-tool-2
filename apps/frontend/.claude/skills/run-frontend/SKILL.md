---
name: run-frontend
description: Run, start, launch, or screenshot the voter-file-tool frontend (Next.js) locally and drive it signed in as a Leader/Admin/Developer without Google login. Use to see a UI change in the real app, take screenshots at phone/tablet/desktop widths, check horizontal overflow, or get a mobile baseline of record search or committees.
---

# Run the frontend

Runs `next dev` for `apps/frontend` against the **local** Docker Postgres, signs you in by inserting a
database session and setting its cookie, and takes screenshots with a Playwright driver. It starts only
Next.js; for the full stack, other services, gotchas and troubleshooting see [REFERENCE.md](REFERENCE.md).
Shell paths below are relative to `apps/frontend/`.

Files in `.claude/skills/run-frontend/`: `serve.sh` (start server), `session.sh` (fake login),
`driver.mjs` (screenshots + overflow check), `steps/*.mjs` (scripted flows).

## Two rules

- **Screenshots of real data contain voter PII** (names, phones, emails, addresses). Keep them in
  `$TMPDIR` or the gitignored `data/`, and never commit or upload them. For shots that leave the
  machine, use `steps/record-search-synthetic.mjs`, which mocks the search with made-up voters.
- **`apps/frontend/.env` can hold remote (possibly production) DB URLs.** `serve.sh` passes the local
  `POSTGRES_PRISMA_URL` in the process env, which wins over `.env`. Don't run `next dev` bare.

## Prerequisites

- Node.js 24.x, pnpm, installed workspace dependencies, and the frontend env values from `.env.example`.
- Shared packages built from the repo root with `pnpm run build:packages` (and rebuilt after changing
  them). `serve.sh` doesn't build them.
- Docker container `frontend-postgres-1` running, with current migrations and data for the flow you
  want. `serve.sh` finds its published port for container port 5432.
- At least one local `User` per role you want. Google sign-in creates users; this helper only creates
  sessions for existing ones. Check with `.claude/skills/run-frontend/session.sh --list`.
- playwright-core installed outside the repo, and a Playwright Chromium in
  `~/Library/Caches/ms-playwright` or `~/.cache/ms-playwright` (or set `CHROME_PATH`):
  ```bash
  export PW_DIR="${TMPDIR:-/tmp}/run-frontend-pw"
  mkdir -p "$PW_DIR" && npm --prefix "$PW_DIR" i playwright-core@1.59.0
  ```

## Run

1. Check port 3000 is free (`lsof -iTCP:3000 -sTCP:LISTEN`), then start the server in the background.
   `--workspace` sets `COMMITTEES_WORKSPACE=1`, which production uses; without it the helper forces the
   flag off and you get the legacy `/committees` page.
   ```bash
   .claude/skills/run-frontend/serve.sh --workspace        # run_in_background
   curl -s -o /dev/null -w "%{http_code}\n" --retry 15 --retry-connrefused --retry-delay 2 --max-time 180 http://localhost:3000/
   ```
   Confirm the log (`${TMPDIR:-/tmp}/run-frontend-dev.log`, or `$LOG`) shows your server, since a
   response alone could come from another one. If 3000 is taken, add `--port 3100` and pass
   `--base http://localhost:3100` to every driver call.
2. Sign in. This prints a token for the first local user with that privilege:
   ```bash
   TOK=$(.claude/skills/run-frontend/session.sh Leader)    # or Developer / Admin
   ```
3. Screenshot. The driver prints `file  scrollWidth/clientWidth`, plus `OVERFLOW` when the page is wider
   than the screen:
   ```bash
   OUT=${TMPDIR:-/tmp}/run-frontend-shots
   node .claude/skills/run-frontend/driver.mjs --token "$TOK" --out "$OUT" --sizes 375 \
     --steps .claude/skills/run-frontend/steps/record-search-quick-name.mjs /recordsearch
   node .claude/skills/run-frontend/driver.mjs --token "$TOK" --out "$OUT" --sizes 375,1280 \
     --steps .claude/skills/run-frontend/steps/committee-detail.mjs /committees
   ```
   Without `--steps` it just loads each path. `--full` takes full-page shots, and `--sizes` defaults to
   `375,768,1280`. Open the PNGs and **look at them**.
   To script a new flow, write `steps/<name>.mjs` exporting `async (page, { width, snap }) => {}`.
   `snap('name')` saves `<out>/name-<width>.png`.
4. Clean up: run `.claude/skills/run-frontend/session.sh --cleanup`, then stop the background
   `serve.sh` task.
