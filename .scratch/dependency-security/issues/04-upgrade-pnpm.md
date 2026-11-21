# 04 - Upgrade pnpm 8.15.7 to 11.x

Status: ready-for-agent
Type: task

Branch from current `main`. #147 (security bumps) has merged, so the lockfile conversion starts from a clean base.

## Why

- The repo pins `"packageManager": "pnpm@8.15.7"`. pnpm 8 is several majors behind and no longer gets fixes.
- pnpm 8 limitation hit during the Dependabot triage: `pnpm update -r --depth Infinity <pkg>` does not
  re-resolve locked transitive versions. Clearing 100+ transitive alerts took an override round-trip
  (see [03 § F](03-lower-priority-dependency-alerts.md)). Newer pnpm should handle this (not yet verified, see
  Part A step 5). Dependabot also has better support for current lockfile formats.

This is not a quick bump. The code change is small. The work is in the two deploy targets (the report server on
Lightsail and the frontend on Vercel), which each choose their own pnpm. 8.15.7 → 8.15.9 is a safe same-major patch
but doesn't fix the transitive-update problem, so skip it.

## Why 11 and not 12

Decided 2026-11-20: target 11 now, and move to 12 later in [05](05-upgrade-pnpm-11-to-12.md).

- **pnpm 12 is a rewrite in Rust.** The npm package is a thin wrapper that installs a native binary per platform.
  12.0.0 shipped on 2026-08-26, and there have been 39 releases in under three months. Its changelog has many
  `--frozen-lockfile` and lockfile-format fixes (the path the report server deploys through), plus a security fix
  (12.19.0: an offline install error printed registry credentials).
- **pnpm 11 is the last TypeScript major.** 11.0.0 came out on 2026-04-28, and it's still maintained
  (11.28.13 on 2026-11-17).
- **The migration is the same work for either one.** Verified in a sandbox on 2026-11-20 with 11.28.13 and
  12.21.0: same lockfile v9, same `…/store/v11` store, same JSON `.modules.yaml` (layout version 5), same
  `allowBuilds` and ignored `package.json` field, same hard error on unapproved builds, and the same
  pinned-version switching.
- **11 → 12 later is a pin bump, not a cutover.** pnpm 12 ran `install --frozen-lockfile` on pnpm 11's
  `node_modules` and reused it in place: no reinstall, no store change.
- **Cost of 11:** it requires Node `>=22.13` (checked in Part C), and new fixes land on 12 first.

## Where pnpm is pinned or invoked

| Place | What it does |
| --- | --- |
| `package.json` and `apps/report-server/package.json` | `"packageManager": "pnpm@8.15.7"`. Change both together. |
| `.github/workflows/test.yml` | `pnpm/action-setup@v4` reads `packageManager`; `pnpm install --frozen-lockfile`. No edit needed, but CI is the first check. Runs Node 24. |
| `infrastructure/scripts/00-setup-all.sh` → `01-install-dependencies.sh` | `00` reads `packageManager` with a sed, `01` runs `npm install -g pnpm@<that>` and checks `pnpm --version` equals it. Runs **only at provisioning**. Installs Node with `nvm install 22`. |
| `scripts/deploy-lightsail.sh` → `scripts/pnpm-install-low-memory.sh` | Uses whatever global pnpm the instance has, with `--frozen-lockfile`. A deploy never upgrades pnpm. |
| `scripts/check-pnpm-store.sh` | Refuses to install when `node_modules/.modules.yaml`'s `storeDir` differs from `pnpm store path`. Exits 0 when there is no `.modules.yaml`. Parses only the **pnpm 8** (YAML) metadata format. |
| Vercel (frontend) | Picks the pnpm version from the lockfile version, or from `packageManager` when Corepack is enabled for the project. Not configured in the repo. |

(PM2 runs `apps/report-server/dist/index.js` directly, per `ecosystem.config.js`. `apps/report-server/start.sh`
is a legacy entry point and no longer runs on restart.)

## Breaking changes and gotchas

Everything marked "verified" was checked against pnpm 11.28.13 in a sandbox.

1. **Unapproved dependency build scripts fail the install.** pnpm 10 started blocking dependency install scripts.
   In pnpm 11, an install with an unapproved build fails with `ERR_PNPM_IGNORED_BUILDS`
   ("Ignored build scripts: …"), CI included (verified). This applies only to dependencies. The workspace's own
   postinstalls (`apps/frontend`, `packages/shared-prisma`) still run. Packages with install/postinstall scripts
   in our tree:
   `@prisma/client`, `@prisma/engines`, `prisma`, `puppeteer`, `sharp`, `esbuild`, `@sentry/cli`,
   `@parcel/watcher`, `unrs-resolver`, `@vercel/speed-insights`, `core-js`.
   Every one of them needs an explicit decision. The setting is `allowBuilds` in `pnpm-workspace.yaml`
   (verified). pnpm 11 replaced `onlyBuiltDependencies`, `neverBuiltDependencies`, and `ignoredBuiltDependencies`
   with it, so don't use the old keys. Starting point:

   ```yaml
   allowBuilds:
     '@prisma/client': true
     '@prisma/engines': true
     prisma: true
     puppeteer: true
     sharp: true
     esbuild: true
     '@sentry/cli': true
     '@parcel/watcher': true
     unrs-resolver: true
     core-js: false                  # funding banner
     '@vercel/speed-insights': false
   ```

   Run `pnpm approve-builds` interactively to see the exact list pnpm wants, since the tree may have changed.
   Interactive installs add `set this to true or false` placeholders. Those still block the build, so replace
   them all.
2. **Lockfile format changes** (v6 → v9). Expect one large, purely mechanical `pnpm-lock.yaml` diff with no
   dependency changes. pnpm 8 cannot read a v9 lockfile. With `--frozen-lockfile` it fails loudly
   (`Ignoring not compatible lockfile` → `ERR_PNPM_NO_LOCKFILE`) and installs nothing (verified). That's the
   safety net on the instance.
3. **Don't use `corepack use`.** It writes `"packageManager": "pnpm@11.x.y+sha512.<hash>"`. The sed in
   `00-setup-all.sh` would capture `11.x.y+sha512.<hash>` as the version, so `npm install -g` and the version
   check in `01-install-dependencies.sh` both fail on the next provisioning. Write a plain `pnpm@11.x.y` by hand.
4. **The store path and `.modules.yaml` format change.** pnpm 11's store is `<pnpm home>/store/v11` (pnpm 8's
   is `…/store/v3`). On the instance, an existing `node_modules` built from the old store makes
   `check-pnpm-store.sh` (correctly) refuse the deploy, so the cutover deletes `node_modules` first.
   **The script must change.** pnpm 11 writes `node_modules/.modules.yaml` as JSON
   (`  "storeDir": "/home/…/store/v11",`). The script's sed only matches YAML `storeDir: …`, so it reads an
   empty value and fails closed. Without a fix, every deploy after the upgrade refuses to install (verified: the
   current sed returns empty on a pnpm 11 file). Make it accept both forms, e.g. try the YAML sed, then fall back
   to `sed -n -E 's/^ *"storeDir": *"([^"]*)",? *$/\1/p'`, still failing closed when both are empty.
5. **The `pnpm` field in `package.json` is no longer read.** pnpm 11 prints
   `[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored:
   "pnpm.overrides"` and installs **without the overrides** (verified). For this repo that means the two security
   overrides from #147 (`next>postcss`, `@sentry/nextjs>rollup`) and the `@types/react*` pins silently stop
   applying. Move them to a top-level `overrides:` key in `pnpm-workspace.yaml` and remove the `pnpm` field from
   `package.json`. Other defaults changed across 9-11 (e.g. `dedupe-peer-dependents`, `resolution-mode`,
   hoisting of `eslint`/`prettier`). Skim the 9, 10 and 11 release notes, and expect some version drift in the
   lockfile conversion.
6. **Vercel must run the same major.** An older pnpm on Vercel won't read `allowBuilds` or the workspace-file
   overrides: the overrides silently don't apply, or the frozen install fails. Vercel's supported pnpm versions
   were **not verified** when this was written (no web access in that session). Check Vercel's package-manager
   docs first. Have Vercel run exactly the pinned version, by enabling Corepack
   (`ENABLE_EXPERIMENTAL_COREPACK=1` in project env vars, which honors `packageManager`) if its default isn't 11.
7. **A global pnpm 11 runs whatever version the repo pins.** A global pnpm 11 run inside a project whose
   `packageManager` pins another version runs that version (verified: `pnpm --version` in this repo, still pinned
   to 8.15.7, prints `8.15.7`). So check the global version from outside the repo (`cd ~ && pnpm --version`).
   It also makes the cutover safer: pnpm 11 can be installed globally on the box **before** merge, and deploys keep
   running 8.15.7 until the pin changes.

## Runbook

### Part A: repo changes (agent, local)

Work in a branch off `main`. Run commands from the repo root. Use the latest 11.x (`npm view pnpm@11 version`);
below, `11.x.y` means that version.

1. **Install pnpm 11 locally:** `npm install -g pnpm@11.x.y`, then `cd ~ && pnpm --version` (gotcha 7).
2. **Pin it.** Edit `"packageManager"` in `package.json` and `apps/report-server/package.json` to the same plain
   `pnpm@11.x.y`, with no `+sha512` suffix (gotcha 3). Check the provisioning sed still parses it:
   `sed -n 's/.*"packageManager": *"pnpm@\([^"]*\)".*/\1/p' package.json` prints exactly `11.x.y`.
3. **Move settings, allow builds, and convert the lockfile, in one commit.**
   - Move `pnpm.overrides` to `overrides:` in `pnpm-workspace.yaml` and delete the `pnpm` field from
     `package.json` (gotcha 5).
   - Add `allowBuilds` to `pnpm-workspace.yaml` (gotcha 1), or run `pnpm approve-builds` and review what it
     writes. Without it, the install fails with `ERR_PNPM_IGNORED_BUILDS`.
   - Delete all `node_modules` (`rm -rf node_modules apps/*/node_modules packages/*/node_modules`), then
     `pnpm install`.
   - Check that `head -1 pnpm-lock.yaml` shows `lockfileVersion: '9.0'`, and that a second
     `CI=true pnpm install --frozen-lockfile` succeeds.
   - Commit the `packageManager`, `pnpm-workspace.yaml`, `package.json`, and `pnpm-lock.yaml` changes with no
     dependency changes: `chore(deps): upgrade pnpm 8.15.7 -> 11.x.y`.
4. **Builds ran.**
   - Prisma: `apps/frontend/node_modules/.prisma/client` exists (frontend postinstall ran `prisma generate`).
   - Chrome: `cd apps/report-server && npx puppeteer browsers list` shows a Chrome build.
   - sharp: `node -e "require('sharp')"` from `apps/frontend` exits 0.
5. **Overrides still apply.** `pnpm why -r postcss` and `pnpm why -r rollup` show only the overridden versions,
   and `@types/react` resolves to the pinned version. Rerun the Dependabot range check from the #147 PR.
   Then check the original motivation: on a throwaway branch, see whether
   `pnpm update -r --depth Infinity <pkg>` re-resolves a locked transitive version, and record the answer
   in this ticket.
6. **Store check script.** `bash scripts/check-pnpm-store.sh` must exit 0 with the new `node_modules`. It won't
   until the `storeDir` parsing handles the JSON form (gotcha 4). Keep the YAML form too, since the box runs it
   once under pnpm 8 metadata, and keep it failing closed on missing or unrecognized metadata. Update the
   "pnpm 8" comment.
7. **Full verification:** `pnpm test`, `test:pg`, `tsc` for both apps, lint, `next build`, report-server build
   (`pnpm run build:packages && pnpm --filter node-pdf-generation run build`), `pnpm dev` smoke, and one local
   PDF generation.
8. **Docs.** Add a "pnpm upgrade cutover" section to `infrastructure/DEPLOYMENT_SETUP.md` containing Part C
   below, and replace "pnpm 8" in its store-mismatch troubleshooting entry. Update any pnpm version mention in
   `docs/LOCAL_DEVELOPMENT.md`.
9. **Open the PR.** CI on pnpm 11 is the first external check. **Don't merge until Part B passes and Part C's
   before-merge steps are done.** A deploy on an un-upgraded instance fails: pnpm 8 refuses the v9 lockfile
   (gotcha 2), but only after `deploy-lightsail.sh` has stopped the service, so its abort trap restarts the old
   build. Nothing ships until the cutover.

### Part B: Vercel (human, before merge)

1. In the Vercel project, check which pnpm the PR's preview build used (build log, "Detected pnpm ...").
2. If it isn't 11, set `ENABLE_EXPERIMENTAL_COREPACK=1` for all environments and rebuild the preview (gotcha 6).
   Confirm the log now shows the pinned version.
3. Smoke the preview: sign in, load a committee page, request a report.

### Part C: report server cutover (human, on the instance)

Run everything inside `tmux` as the SSH user, from `/opt/voter-file-tool`.

**Before merge (no downtime).** Install pnpm 11 globally now. While `main` still pins 8.15.7, pnpm 11 runs
8.15.7 for this repo (gotcha 7), so deploys keep working unchanged.

1. `node --version` is `>=22.13`. If it isn't, stop: updating Node on the box is a separate change (global
   `pm2` and PM2's startup script are tied to the current Node install), so plan it first, or recreate the
   instance (see Alternative below), which installs the latest 22.
2. `npm install -g pnpm@<version from the PR's package.json>` under the SSH user's nvm.
3. `cd ~ && pnpm --version` prints the new version. `cd /opt/voter-file-tool && pnpm --version` still prints
   `8.15.7`, and `pnpm store path` still ends in `/v3`.
4. Optional confidence check: run a normal `bash scripts/deploy-lightsail.sh` and confirm it behaves as before.

**After merge (about 10-20 minutes of report-server downtime, mostly the cold install).**

1. **Preflight.** `free -m` shows swap is on (the cold install needs it), `df -h /` has room for a second store
   (the old one is removed in step 6), and `pm2 status report-server` is online. Note the current commit:
   `git rev-parse HEAD`.
2. **Stop the service:** `pm2 stop report-server`.
3. **Remove the old install:** `rm -rf node_modules apps/*/node_modules packages/*/node_modules`. With no
   `.modules.yaml`, `check-pnpm-store.sh` passes.
4. **Deploy as usual:** `bash scripts/deploy-lightsail.sh`. It pulls `main` (now pinned to 11), does a cold
   install through `pnpm-install-low-memory.sh`, builds, and re-registers PM2. Afterwards, `pnpm --version` in the
   repo prints the new version and `pnpm store path` ends in `/v11`.
5. **Verify:** `pm2 status report-server` is online with no climbing `↺`, `pm2 logs report-server --lines 50`
   is clean, `cd apps/report-server && npx puppeteer browsers list` shows Chrome, and one PDF generates from the
   production frontend. Then run `bash scripts/check-pnpm-store.sh` and confirm it exits 0 on the new metadata.
6. **Clean up** once verified: remove the old `…/store/v3` directory under `~/.local/share/pnpm/store` to
   reclaim disk.

**Rollback** (if step 4 or 5 fails and can't be fixed quickly): `pm2 stop report-server`,
`git checkout <commit from step 1>` (pinned to 8.15.7, so the global pnpm 11 runs 8.15.7), remove `node_modules`
as in step 3, `bash scripts/pnpm-install-low-memory.sh`, `pnpm run build:packages`,
`pnpm --filter node-pdf-generation run build`, `pm2 start apps/report-server/ecosystem.config.js`.
Don't rerun `deploy-lightsail.sh` for this, since it pulls `main` again. Then revert the upgrade PR on `main`
(and Vercel's Corepack env var) before the next deploy.

**Alternative:** `pnpm terraform:recreate` instead of the after-merge steps 2-5. Provisioning installs the pinned
version, but it destroys the disk and takes longer.

## Acceptance

- CI green on pnpm 11; the lockfile is v9.
- Vercel production builds with pnpm 11, and the security overrides apply there.
- Report server deployed and generating PDFs on pnpm 11, and `check-pnpm-store.sh` passes on its metadata.
- The provisioning sed parses `packageManager` to a bare version.
- `infrastructure/DEPLOYMENT_SETUP.md` documents the cutover.
- `grep -rn "8.15.7"` finds nothing outside history and docs.
- The `pnpm update --depth Infinity` result (Part A step 5) is recorded here.

## Related

- [05 - Upgrade pnpm 11 to 12](05-upgrade-pnpm-11-to-12.md): the follow-up.
- `.scratch/report-server-provisioning/issues/03-pin-pnpm-version.md`: why provisioning reads the pinned version.
- `.scratch/report-server-provisioning/issues/10-start-compiled-node-not-pnpm-ts-node.md`: why PM2 no longer runs pnpm.
