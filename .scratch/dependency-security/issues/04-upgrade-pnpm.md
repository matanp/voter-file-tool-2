# 04 - Upgrade pnpm 8.15.7 to the current major (12.x)

Status: ready-for-agent
Type: task

Start after #147 (security bumps) merges, so the lockfile conversion has a single clean base.

## Why

- The repo pins `"packageManager": "pnpm@8.15.7"`. pnpm 8 is several majors behind (12.18.0 on 2026-11-08)
  and no longer gets fixes.
- pnpm 8 limitation hit during the Dependabot triage: `pnpm update -r --depth Infinity <pkg>` does not
  re-resolve locked transitive versions. Clearing 100+ transitive alerts took an override round-trip
  (see [03 § F](03-lower-priority-dependency-alerts.md)). Newer pnpm handles transitive updates properly.
  Dependabot also has better support for current lockfile formats.

## Where pnpm is pinned or invoked

| Place | What it does |
| --- | --- |
| `package.json` and `apps/report-server/package.json` | `"packageManager": "pnpm@8.15.7"`. Change both together. |
| `.github/workflows/test.yml` | `pnpm/action-setup@v4` reads `packageManager`. No edit needed, but CI is the first check. |
| `infrastructure/scripts/00-setup-all.sh`, `01-install-dependencies.sh` | Read `packageManager` and `npm install -g pnpm@<that>`. Runs **only at provisioning**. |
| `scripts/deploy-lightsail.sh` → `scripts/pnpm-install-low-memory.sh` | Uses whatever global pnpm the instance has. A deploy never upgrades pnpm. |
| `scripts/check-pnpm-store.sh` | Refuses to install when `node_modules/.modules.yaml`'s `storeDir` differs from `pnpm store path`. Its comment notes that it parses the **pnpm 8** metadata format. |
| `apps/report-server/start.sh` | `exec pnpm start` on every PM2 restart. |

## Breaking changes that matter here

1. **Dependency install scripts are blocked by default (pnpm 10+).** Packages with install/postinstall
   scripts in our tree:
   `@prisma/client`, `@prisma/engines`, `prisma`, `puppeteer`, `sharp`, `esbuild`, `@sentry/cli`,
   `@parcel/watcher`, `unrs-resolver`, `@vercel/speed-insights`, `core-js`.
   Without an allow-list, Prisma engines and the puppeteer Chrome download silently don't happen, and the
   report server fails at runtime, not at install. Add `pnpm.onlyBuiltDependencies`, or the
   current major's equivalent (check the release notes, since the setting moved between majors), listing at least
   `@prisma/client`, `@prisma/engines`, `prisma`, `puppeteer`, `sharp`, `esbuild`, `@sentry/cli`.
   Leave `core-js` (a funding banner) and `@vercel/speed-insights` out unless something breaks.
2. **Lockfile format changes** (v6 → v9). Expect one large, purely mechanical `pnpm-lock.yaml` diff.
   Keep it in its own commit with no dependency changes.
3. **The store path changes** with the major version. On the Lightsail instance this means:
   - `check-pnpm-store.sh` will (correctly) refuse the first deploy, because `node_modules` was built from
     the old store.
   - The instance's global pnpm stays on 8.15.7 until someone reinstalls it, and pnpm 8 can't read the new
     lockfile.
   - The script's `storeDir` parsing may need updating for the new `.modules.yaml` format.
4. Other defaults changed across 9/10/11/12 (e.g. `dedupe-peer-dependents`, `resolution-mode`, hoisting of
   `eslint`/`prettier`, `pnpm.*` settings moving into `pnpm-workspace.yaml`). Read each major's release notes
   for the settings this repo uses: `pnpm.overrides` in the root `package.json` (the two security overrides
   from #147 plus the `@types/react*` pins).

## Plan

1. Local: `corepack use pnpm@12` (or set `packageManager` by hand in both manifests), `pnpm install`, and
   commit the lockfile conversion alone.
2. Add the build-script allow-list. Check: `prisma generate` ran (frontend postinstall), Chrome exists
   (`npx puppeteer browsers list` in `apps/report-server`), `sharp` loads.
3. Move `pnpm.overrides` wherever the new major expects them. Confirm `pnpm why -r postcss` / `rollup` still
   show the overridden versions, and rerun the Dependabot range check from the #147 PR.
4. Update `scripts/check-pnpm-store.sh` for the new `.modules.yaml` format and fix its pnpm-8 comment.
5. Full verification: `pnpm test`, `test:pg`, `tsc` both apps, lint, `next build`, report-server build,
   `pnpm dev` smoke.
6. **Report server cutover (human, on the instance):** stop the service, `npm install -g pnpm@<new>`
   under the SSH user's nvm, delete `node_modules` (root and workspace packages), deploy as usual, then
   confirm `pnpm start` under PM2 and generate one PDF. Alternatively, recreate the instance
   (`pnpm terraform:recreate`), since provisioning already installs the pinned version. Write the chosen
   steps into `infrastructure/DEPLOYMENT_SETUP.md`.

## Acceptance

- CI green on the new pnpm; the lockfile is in the new format.
- Report server deployed and generating PDFs on the new pnpm.
- `grep -rn "8.15.7"` finds nothing outside history and docs.

## Related

- `.scratch/report-server-provisioning/issues/03-pin-pnpm-version.md`: why provisioning reads the pinned version.
