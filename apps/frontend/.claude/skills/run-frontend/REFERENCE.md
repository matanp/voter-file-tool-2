# run-frontend reference

Read the section you need from [SKILL.md](SKILL.md). Shell paths are relative to `apps/frontend/`.

## Human path (full stack)

Follow [Local Development](../../../../../docs/LOCAL_DEVELOPMENT.md#one-command-pnpm-dev).
`pnpm dev` from the repo root starts Postgres, the report-server and the frontend together, builds
missing shared packages, checks ports, and connects the two servers. It reads database URLs from the
apps' environment files, so point both apps at the local database first. Sign in with Google at
http://localhost:3000. Other ports need their OAuth redirect URI registered.

## Other services

`serve.sh` starts only Next.js. It doesn't start the report-server or configure R2, and its local
database override doesn't change other service settings in `.env`. For report, upload or storage flows,
follow [Local Development](../../../../../docs/LOCAL_DEVELOPMENT.md) to configure the local report-server
and a separate dev R2 bucket. See the [deployment settings](../../../../../README.md#manual-setup) for
the production architecture.

## Gotchas

- **Auth is Google-only, using Auth.js v5 database sessions.** A `Session` row plus an
  `authjs.session-token` cookie is a full login. `Session."updatedAt"` has no DB default, so inserts
  must set it.
- **Real roles differ from the Developer's acting role.** `session.sh Leader` uses a real Leader's
  server privileges and jurisdiction. A Developer's `actingPrivilege` only changes the client UI; the
  server still treats them as a Developer. See
  [auth-check-patterns](../../../../../skills/auth-check-patterns/SKILL.md) when reviewing role-gated
  behavior.
- **A Leader with one committee scope skips the scope picker.** Check `session.sh --list` for each
  Leader's jurisdiction rather than assuming one. The Developer sees every committee and the admin
  controls.
- **Below 768 the main nav is inside the hamburger menu,** so `getByRole('navigation')` finds nothing
  until you click `button "Open menu"`. The links are then in `dialog "Menu"`. `steps/header-menu.mjs`
  shoots the bar and the open menu.
- **The results skeleton reuses `#voter-record-table`.** Waiting for its rows returns while it's still
  loading, so wait for `See more details` instead. Below 768 the results are cards
  (`list "Voter records"`) and the table is `display:none`. `steps/record-search-quick-name.mjs`
  handles both.
- **Workspace committee rows** have accessible text like `Rochester ED 12/4 seats filled2 pending`: the
  town is sr-only and the ED and count run together, so `/ED 1\b/` misses. Click by
  `hasText: 'seats filled'`.
- **`--full` on the committees workspace** gives a tall repeating image, because the workspace is a
  fixed-height layout with inner scroll panes. Use viewport shots there.
- **The first hit on each route compiles it in `next dev`** (10–30s). The driver waits up to 180s.

## Troubleshooting

- `null value in column "updatedAt" of relation "Session"`: set `"updatedAt"` on insert (`session.sh`
  does).
- `locator.click: Timeout` on a committee row: see the row-text gotcha above.
- A result screenshot shows grey bars: you caught the loading skeleton. Wait for `See more details`.
- `playwright-core not found`: run the install line from SKILL.md's Prerequisites. `PW_DIR` must match.
- Port 3000 is taken (often another worktree's `next dev`): use `serve.sh --port 3100` and pass
  `--base http://localhost:3100` to the driver.
