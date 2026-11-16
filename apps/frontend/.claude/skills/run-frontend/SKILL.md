---
name: run-frontend
description: Run, start, launch, or screenshot the voter-file-tool frontend (Next.js) locally and drive it signed in as a Leader/Admin/Developer without Google login. Use to see a UI change in the real app, take screenshots at phone/tablet/desktop widths, check horizontal overflow, or get a mobile baseline of record search or committees.
---

# Run the frontend

Frontend-only visual testing against an already prepared **local** Docker Postgres database.
The Next.js app in `apps/frontend` runs with `next dev`. You sign in by
inserting a database session and setting its cookie, and screenshots come from a Playwright driver.
Shell paths below are relative to `apps/frontend/`; Markdown links are relative to this file.
The original screenshot workflow was verified on macOS (arm64) on 2026-11-15.

Use [Local Development](../../../../../docs/LOCAL_DEVELOPMENT.md) for initial setup, migrations,
and the full stack. This helper starts only Next.js: it does not start the report-server or configure
R2. Its local database override does not override other service settings in `.env`. For report,
upload, or storage flows, follow that guide to configure the local report-server and separate dev
R2 bucket, including matching callback and service settings. See the
[deployment settings](../../../../../README.md#manual-setup) for the production architecture.

Files: `serve.sh` (start server), `session.sh` (fake login), `driver.mjs` (screenshots + overflow),
`steps/*.mjs` (scripted flows), all in `.claude/skills/run-frontend/`.

## Prerequisites

- Node.js 24.x (the frontend package and Vercel target), pnpm, installed workspace dependencies,
  and required frontend environment values from `.env.example`.
- Build shared packages from the repo root with `pnpm run build:packages` before using this helper,
  and rebuild after changing them. Unlike root `pnpm dev`, `serve.sh` does not build missing packages.
- Docker container `frontend-postgres-1` running, with current migrations and data for the requested
  flow. `serve.sh` discovers its published host port for container port 5432 (configured through
  `POSTGRES_PORT` in Compose). The database observed on 2026-11-15 had ~495k voters and 900+ committees;
  a fresh setup does not imply that dataset is present.
- At least one local `User` per role you want to see. The normal Google sign-in flow creates users;
  this helper only creates sessions for existing users. Seeding `PrivilegedUser` pre-authorizes an
  email but does not create its signed-in `User`. Check with:
  ```bash
  .claude/skills/run-frontend/session.sh --list
  ```
- playwright-core, installed outside the repo, and a Playwright Chromium in `~/Library/Caches/ms-playwright`
  (or `~/.cache/ms-playwright`; set `CHROME_PATH` to use another browser):
  ```bash
  export PW_DIR="${TMPDIR:-/tmp}/run-frontend-pw"
  mkdir -p "$PW_DIR" && npm --prefix "$PW_DIR" i playwright-core@1.59.0
  ```

## Run (agent path)

1. Start the server in the background. `--workspace` sets `COMMITTEES_WORKSPACE=1`. A
   [production verification note dated 2026-11-15](../../../../../.scratch/leader-feedback-2026-11-11/issues/06-mobile-name-search.md)
   records that flag as enabled; use it for that UI unless you specifically want legacy `/committees`.
   This is dated evidence, not a live deployment check. Without `--workspace`, the helper forces the
   flag off even if `.env` enables it.
   Check that port 3000 is free first, then confirm the background task stays running and its log
   reports the expected URL; an HTTP response alone could come from an existing server.
   ```bash
   .claude/skills/run-frontend/serve.sh --workspace        # run_in_background
   curl -s -o /dev/null -w "%{http_code}\n" --retry 15 --retry-connrefused --retry-delay 2 --max-time 180 http://localhost:3000/
   ```
   The log is in `${TMPDIR:-/tmp}/run-frontend-dev.log` (or `$LOG` when set).
   For another frontend port, pass `serve.sh --workspace --port 3100`, update the readiness URL,
   and pass `--base http://localhost:3100` to every driver invocation. This is separate from the
   database's published port.
2. Sign in. This prints a token for the first local user with that privilege:
   ```bash
   TOK=$(.claude/skills/run-frontend/session.sh Leader)    # or Developer / Admin
   ```
3. Screenshot. The driver prints `file  scrollWidth/clientWidth`, plus `OVERFLOW` when the page is wider
   than the screen:
   ```bash
   OUT=${TMPDIR:-/tmp}/run-frontend-shots
   node .claude/skills/run-frontend/driver.mjs --token "$TOK" --out "$OUT" --sizes 375 \
     --steps .claude/skills/run-frontend/steps/record-search-name.mjs /recordsearch
   node .claude/skills/run-frontend/driver.mjs --token "$TOK" --out "$OUT" --sizes 375,1280 \
     --steps .claude/skills/run-frontend/steps/committee-detail.mjs /committees
   ```
   Without `--steps` it just loads each path. `--full` takes full-page shots, and `--sizes` defaults to
   `375,768,1280`. Open the PNGs with an image viewer and **look at them**.
   To script a new flow, write `steps/<name>.mjs` exporting `async (page, { width, snap }) => {}`.
   `snap('name')` saves `<out>/name-<width>.png`.
4. Clean up:
   ```bash
   .claude/skills/run-frontend/session.sh --cleanup
   ```
   Then stop the background `serve.sh` task.

## Run (human path)

Follow [Local Development](../../../../../docs/LOCAL_DEVELOPMENT.md#one-command-pnpm-dev).
`pnpm dev` from the repo root starts Postgres, the report-server and the frontend together,
builds missing shared packages, checks ports, and connects the two servers. By default the frontend
uses port 3000 and the report-server uses 3001; see `scripts/dev.sh --help` from the repo root.

This is the broader development workflow: it reads database URLs from the apps' environment files,
and supports remote databases with `--no-db`. Starting Docker does not select the local database.
For a local run, configure both apps to use the intended local database and dev service resources.
Sign in with Google at http://localhost:3000; other ports need their OAuth redirect URI registered.
The full-stack human path was not exercised when this skill was written.

## Gotchas

- **Screenshots contain real voter PII** (names, phones, emails, addresses). Keep them in `$TMPDIR` or the
  gitignored `data/`, and never commit them.
- **`apps/frontend/.env` has held remote (Neon, possibly production) DB URLs.** `serve.sh` passes the
  local `POSTGRES_PRISMA_URL` in the process env, which wins over `.env`. Don't run `next dev` bare.
- **Auth is Google-only, using Auth.js v5 database sessions.** A `Session` row plus an
  `authjs.session-token` cookie is a full login. `Session."updatedAt"` has no DB default, so inserts must
  set it.
- **Actual roles differ from Developer UI simulation.** `session.sh Leader` uses a real Leader
  user's server privileges and jurisdiction. Developer `actingPermissions` only simulates client UI;
  it does not reduce server authority. See [auth-check-patterns](../../../../../skills/auth-check-patterns/SKILL.md)
  when reviewing role-gated behavior.
- **The Leader observed on 2026-11-15 was scoped to ROCHESTER LD 17,** so it got one committee scope and skipped the picker.
  Check `session.sh --list` for the current dataset rather than assuming that scope.
  The Developer account sees every committee and the admin controls.
- **Record search name chips:** in the criteria builder, typed text only becomes a chip on blur, so the
  first Submit click is used up by the blur and you need a second one (`steps/record-search-name.mjs` does
  this). The quick name box above the builder has no chips: `steps/record-search-quick-name.mjs` uses it
  and handles both the phone cards/sheet (< 768) and the table/popover.
- **The results skeleton reuses `#voter-record-table`.** Waiting for its rows returns while still loading,
  so wait for `See more details` instead. Below 768 the results are cards (`list "Voter records"`) and
  the table is `display:none`.
- **Workspace committee rows** have accessible text like `Rochester ED 12/4 seats filled2 pending`: the
  town is sr-only and the ED and count run together, so `/ED 1\b/` misses. Click by `hasText: 'seats filled'`.
- **`--full` on the committees workspace** gives a tall repeating image, because the workspace is a
  fixed-height layout with inner scroll panes. Use viewport shots there.
- **The first hit on each route compiles it in `next dev`** (10–30s). The driver waits up to 180s.

## Troubleshooting

- `null value in column "updatedAt" of relation "Session"`: set `"updatedAt"` on insert
  (`session.sh` does).
- `locator.click: Timeout` on a committee row: see the row-text gotcha above.
- Result screenshot shows grey bars: you caught the loading skeleton. Wait for `See more details`.
- `playwright-core not found`: run the install line from Prerequisites. `PW_DIR` must match.
