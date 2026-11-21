# 04 - Upgrade pnpm 8.15.7 to the current major (12.x)

Status: ready-for-agent
Type: task

Branch from current `main`. #147 (security bumps) has merged, so the lockfile conversion starts from a clean base.

## Why

- The repo pins `"packageManager": "pnpm@8.15.7"`. pnpm 8 is several majors behind (`latest` on npm was 12.21.0 on
  2026-11-20) and no longer gets fixes.
- pnpm 8 limitation hit during the Dependabot triage: `pnpm update -r --depth Infinity <pkg>` does not
  re-resolve locked transitive versions. Clearing 100+ transitive alerts took an override round-trip
  (see [03 § F](03-lower-priority-dependency-alerts.md)). Newer pnpm handles transitive updates properly.
  Dependabot also has better support for current lockfile formats.

This is not a quick bump. The code change is small. The work is in the two deploy targets (the report server on
Lightsail and the frontend on Vercel), which each choose their own pnpm. 8.15.7 → 8.15.9 is a safe same-major patch
but doesn't fix the transitive-update problem, so skip it.

## Where pnpm is pinned or invoked

| Place | What it does |
| --- | --- |
| `package.json` and `apps/report-server/package.json` | `"packageManager": "pnpm@8.15.7"`. Change both together. |
| `.github/workflows/test.yml` | `pnpm/action-setup@v4` reads `packageManager`; `pnpm install --frozen-lockfile`. No edit needed, but CI is the first check. |
| `infrastructure/scripts/00-setup-all.sh` → `01-install-dependencies.sh` | `00` reads `packageManager` with a sed, `01` runs `npm install -g pnpm@<that>` and checks `pnpm --version` equals it. Runs **only at provisioning**. |
| `scripts/deploy-lightsail.sh` → `scripts/pnpm-install-low-memory.sh` | Uses whatever global pnpm the instance has, with `--frozen-lockfile`. A deploy never upgrades pnpm. |
| `scripts/check-pnpm-store.sh` | Refuses to install when `node_modules/.modules.yaml`'s `storeDir` differs from `pnpm store path`. Exits 0 when there is no `.modules.yaml`. Its comment notes that it parses the **pnpm 8** metadata format. |
| Vercel (frontend) | Picks the pnpm version from the lockfile version, or from `packageManager` when Corepack is enabled for the project. Not configured in the repo. |

(PM2 runs `apps/report-server/dist/index.js` directly, per `ecosystem.config.js`. `apps/report-server/start.sh`
is a legacy entry point and no longer runs on restart.)

## Breaking changes and gotchas

1. **Dependency install scripts are blocked by default (pnpm 10+).** This applies only to dependencies.
   The workspace's own postinstalls (`apps/frontend`, `packages/shared-prisma`) still run. Packages with
   install/postinstall scripts in our tree:
   `@prisma/client`, `@prisma/engines`, `prisma`, `puppeteer`, `sharp`, `esbuild`, `@sentry/cli`,
   `@parcel/watcher`, `unrs-resolver`, `@vercel/speed-insights`, `core-js`.
   Without an allow-list, Prisma engines and the puppeteer Chrome download are skipped. pnpm prints an
   "ignored build scripts" warning, which is easy to miss, and the report server then fails at runtime, not at
   install. Allow at least `@prisma/client`, `@prisma/engines`, `prisma`, `puppeteer`, `sharp`, `esbuild`,
   `@sentry/cli`. Leave `core-js` (a funding banner) and `@vercel/speed-insights` out unless something breaks.
   The setting's name and location changed between majors (`pnpm.onlyBuiltDependencies` in 10, and possibly a
   different key in `pnpm-workspace.yaml` later), and a later major may make unapproved builds a hard error.
   Use whatever the target major's docs say.
2. **Lockfile format changes** (v6 → v9). Expect one large, purely mechanical `pnpm-lock.yaml` diff.
   Keep it in its own commit with no dependency changes. pnpm 8 cannot read a v9 lockfile, and with
   `--frozen-lockfile` it fails loudly instead of guessing. That's the safety net on the instance.
3. **Don't use `corepack use`.** It writes `"packageManager": "pnpm@12.x.y+sha512.<hash>"`. The sed in
   `00-setup-all.sh` would capture `12.x.y+sha512.<hash>` as the version, so `npm install -g` and the version
   check in `01-install-dependencies.sh` both fail on the next provisioning. Write a plain `pnpm@12.x.y` by hand,
   or make the sed stop at `+`.
4. **The store path changes** with the major version (`pnpm store path` ends in a new `v<N>` directory).
   On the instance, an existing `node_modules` built from the old store makes `check-pnpm-store.sh` (correctly)
   refuse the deploy, so the cutover deletes `node_modules` first. The script's `storeDir` parsing may need
   updating for the new `.modules.yaml` format.
5. **Settings moved.** Defaults changed across 9/10/11/12 (e.g. `dedupe-peer-dependents`, `resolution-mode`,
   hoisting of `eslint`/`prettier`), and `pnpm.*` settings move from `package.json` into `pnpm-workspace.yaml`.
   This repo's settings are `pnpm.overrides` in the root `package.json`: the two security overrides from #147
   (`next>postcss`, `@sentry/nextjs>rollup`) plus the `@types/react*` pins.
6. **Vercel must run the same major.** If Vercel builds with an older pnpm than the repo, it may not read
   settings that moved to `pnpm-workspace.yaml`. The overrides then silently don't apply, or the frozen install
   fails. Check Vercel's supported pnpm versions at upgrade time. Have Vercel run exactly the pinned version,
   either by enabling Corepack (`ENABLE_EXPERIMENTAL_COREPACK=1` in project env vars, which honors
   `packageManager`) or by choosing the newest major Vercel supports instead of 12.

## Runbook

### Part A: repo changes (agent, local)

Work in a branch off `main`. Run commands from the repo root.

1. **Install the new pnpm locally:** `npm install -g pnpm@12` (or the latest 12.x), then `pnpm --version`.
2. **Pin it.** Edit `"packageManager"` in `package.json` and `apps/report-server/package.json` to the same plain
   `pnpm@12.x.y`, with no `+sha512` suffix (gotcha 3). Check the provisioning sed still parses it:
   `sed -n 's/.*"packageManager": *"pnpm@\([^"]*\)".*/\1/p' package.json` prints exactly `12.x.y`.
3. **Move settings, then convert the lockfile.** Move `pnpm.overrides` (and anything else under `pnpm`) to where
   the new major reads it (gotcha 5). Delete all `node_modules` (`rm -rf node_modules apps/*/node_modules
   packages/*/node_modules`), then `pnpm install`. Commit the `packageManager`, settings, and
   `pnpm-lock.yaml` changes with no dependency changes: `chore(deps): upgrade pnpm 8.15.7 -> 12.x.y`.
   Check `head -1 pnpm-lock.yaml` shows `lockfileVersion: '9.0'`.
4. **Allow-list builds** (gotcha 1). Add the build allow-list, delete `node_modules` again, reinstall, and
   confirm there's no "ignored build scripts" warning for the allowed packages. Then check:
   - Prisma: `apps/frontend/node_modules/.prisma/client` exists (frontend postinstall ran `prisma generate`).
   - Chrome: `cd apps/report-server && npx puppeteer browsers list` shows a Chrome build.
   - sharp: `node -e "require('sharp')"` from `apps/frontend` exits 0.
5. **Overrides still apply.** `pnpm why -r postcss` and `pnpm why -r rollup` show only the overridden versions,
   and `@types/react` resolves to the pinned version. Rerun the Dependabot range check from the #147 PR.
6. **Store check script.** Run `pnpm install` once more so `node_modules/.modules.yaml` exists, then
   `bash scripts/check-pnpm-store.sh` must exit 0. If the new `.modules.yaml` format breaks the `storeDir` sed,
   fix it (it must still fail closed on missing or unrecognized metadata). Update the "pnpm 8" comment.
7. **Full verification:** `pnpm test`, `test:pg`, `tsc` for both apps, lint, `next build`, report-server build
   (`pnpm run build:packages && pnpm --filter node-pdf-generation run build`), `pnpm dev` smoke, and one local
   PDF generation.
8. **Docs.** Add a "pnpm upgrade cutover" section to `infrastructure/DEPLOYMENT_SETUP.md` containing Part C
   below, and replace "pnpm 8" in its store-mismatch troubleshooting entry. Update any `docs/LOCAL_DEVELOPMENT.md`
   pnpm version mention.
9. Open the PR. CI on the new pnpm is the first external check. **Don't merge until Parts B and C are ready**,
   because the next deploy after merge breaks on an un-upgraded instance (it fails before stopping the service,
   so the old build keeps serving, but nothing ships until the cutover).

### Part B: Vercel (human, before merge)

1. In the Vercel project, check which pnpm the PR's preview build used (build log, "Detected pnpm ...").
2. If it isn't the pinned major, set `ENABLE_EXPERIMENTAL_COREPACK=1` for all environments and rebuild the
   preview (gotcha 6). If Vercel can't run pnpm 12, go back to Part A and target the newest major it supports.
3. Smoke the preview: sign in, load a committee page, request a report.

### Part C: report server cutover (human, on the instance, right after merge)

Expect about 10-20 minutes of report-server downtime, mostly the cold install. Run everything inside `tmux` as
the SSH user, from `/opt/voter-file-tool`.

1. **Preflight.** `free -m` shows swap is on (the cold install needs it), `df -h /` has room for a second store
   (the old one is removed in step 7), and `pm2 status report-server` is online. Note the current commit:
   `git rev-parse HEAD`.
2. **Stop the service:** `pm2 stop report-server`.
3. **Install the new pnpm** under the SSH user's nvm:
   `npm install -g pnpm@<version from package.json>`, then `pnpm --version` matches.
4. **Remove the old install:** `rm -rf node_modules apps/*/node_modules packages/*/node_modules`. With no
   `.modules.yaml`, `check-pnpm-store.sh` passes.
5. **Deploy as usual:** `bash scripts/deploy-lightsail.sh`. It pulls `main`, does a cold install through
   `pnpm-install-low-memory.sh`, builds, and re-registers PM2.
6. **Verify:** `pm2 status report-server` is online with no climbing `↺`, `pm2 logs report-server --lines 50`
   is clean, `cd apps/report-server && npx puppeteer browsers list` shows Chrome, and one PDF generates from the
   production frontend.
7. **Clean up** once verified: remove the old pnpm 8 store directory (the old `pnpm store path`, a `v3`
   directory under `~/.local/share/pnpm/store`) to reclaim disk.

**Rollback** (if step 5 or 6 fails and can't be fixed quickly): `pm2 stop report-server`,
`npm install -g pnpm@8.15.7`, `git checkout <commit from step 1>`, remove `node_modules` as in step 4,
`bash scripts/pnpm-install-low-memory.sh`, `pnpm run build:packages`,
`pnpm --filter node-pdf-generation run build`, `pm2 start apps/report-server/ecosystem.config.js`.
Don't rerun `deploy-lightsail.sh` for this, since it pulls `main` again. Then revert the upgrade PR on `main`
(and Vercel's Corepack env var) before the next deploy.

**Alternative:** `pnpm terraform:recreate` instead of steps 2-6. Provisioning installs the pinned version, but
it destroys the disk and takes longer, and it changes nothing else about the box.

## Acceptance

- CI green on the new pnpm; the lockfile is in the new format.
- Vercel production builds with the pinned pnpm major, and the security overrides apply there.
- Report server deployed and generating PDFs on the new pnpm.
- The provisioning sed parses `packageManager` to a bare version.
- `infrastructure/DEPLOYMENT_SETUP.md` documents the cutover.
- `grep -rn "8.15.7"` finds nothing outside history and docs.

## Related

- `.scratch/report-server-provisioning/issues/03-pin-pnpm-version.md`: why provisioning reads the pinned version.
- `.scratch/report-server-provisioning/issues/10-start-compiled-node-not-pnpm-ts-node.md`: why PM2 no longer runs pnpm.
