# 04 - Upgrade pnpm 8.15.7 to a current major (11.x recommended, or 12.x)

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

## Target: 11 or 12

**pnpm 12 is a rewrite in Rust.** The npm package is a thin wrapper that installs a native binary per platform
(`@pnpm/<platform>` optional dependencies, linked by a postinstall). 12.0.0 shipped on 2026-08-26, and there have
been 39 releases in under three months. Recent changelog entries include many `--frozen-lockfile` and
lockfile-format fixes, plus a security fix (12.19.0: an offline install error printed registry credentials).
pnpm 11 (11.0.0, 2026-04-28) is the last TypeScript major. It's still maintained (11.28.13 on 2026-11-17), and
even 10.x had a release on 2026-10-25.

Verified in a sandbox on 2026-11-20 with 11.28.13 and 12.21.0: **the migration is identical.** Both versions:

- use lockfile v9, the `…/store/v11` store, and JSON `.modules.yaml` (layout version 5)
- ignore the `package.json` `pnpm` field (with a warning) and read `overrides` / `allowBuilds` from
  `pnpm-workspace.yaml`
- fail the install on unapproved builds (`ERR_PNPM_IGNORED_BUILDS`)
- run the pinned `packageManager` version when installed globally (gotcha 7)

**11 → 12 later is a pin bump, not a cutover.** pnpm 12 ran `install --frozen-lockfile` on pnpm 11's
`node_modules` and reused it in place, with no reinstall and no store change, so `check-pnpm-store.sh` passes.

| | pnpm 11 | pnpm 12 |
| --- | --- | --- |
| Repo migration and box cutover | Same | Same |
| Maturity | ~7 months, TypeScript codebase that pnpm 8 users know | ~3 months, new Rust codebase, high churn |
| Where fixes land | Maintenance releases | Main line |
| Vercel | More likely supported (still unverified) | Unverified |
| Node | Requires `>=22.13` | Native binary; wrapper says `>=18` |
| Later step to 12 | Pin bump plus a normal deploy | n/a |

**Recommendation: target 11 now and bump to 12 as a separate small ticket** once 12 has settled (a few months
with no frozen-lockfile fixes in its changelog) and Vercel supports it. The expensive part, the settings move and
the box cutover, is the same either way and only happens once. 11 gets it done on the more proven code, and the
follow-up to 12 costs almost nothing. Go straight to 12 only if Part B shows Vercel runs 12 and you'd rather not
touch this again.

If targeting 11, read `12.x.y` below as `11.x.y`. Every step applies unchanged, and the gotchas hold for 11
except where they say "Rust" or "native binary". Add a Node check to the before-merge preflight:
`node --version` on the box must be `>=22.13` (provisioning runs `nvm install 22`, which installs the latest
22.x, but an old box may have an older 22).

Not verified for either version: whether `pnpm update -r --depth Infinity <pkg>` now re-resolves locked
transitive versions (the motivating limitation above). Check it during Part A, e.g. on a package an override
currently pins.

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

1. **Unapproved dependency build scripts fail the install.** pnpm 10 started blocking dependency
   install scripts. In pnpm 12, an install with an unapproved build fails with
   `ERR_PNPM_IGNORED_BUILDS` ("Ignored build scripts: …"), CI included (verified with 12.21.0 in a sandbox).
   This applies only to dependencies. The workspace's own postinstalls (`apps/frontend`,
   `packages/shared-prisma`) still run. Packages with install/postinstall scripts in our tree:
   `@prisma/client`, `@prisma/engines`, `prisma`, `puppeteer`, `sharp`, `esbuild`, `@sentry/cli`,
   `@parcel/watcher`, `unrs-resolver`, `@vercel/speed-insights`, `core-js`.
   Every one of them needs an explicit decision. The setting is `allowBuilds` in `pnpm-workspace.yaml`.
   pnpm 11 replaced `onlyBuiltDependencies`, `neverBuiltDependencies`, and `ignoredBuiltDependencies` with it,
   and pnpm 12 ignores the old keys. Starting point:

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
2. **Lockfile format changes** (v6 → v9). Expect one large, purely mechanical `pnpm-lock.yaml` diff.
   Keep it in its own commit with no dependency changes. pnpm 8 cannot read a v9 lockfile, and with
   `--frozen-lockfile` it fails loudly instead of guessing. That's the safety net on the instance.
3. **Don't use `corepack use`.** It writes `"packageManager": "pnpm@12.x.y+sha512.<hash>"`. The sed in
   `00-setup-all.sh` would capture `12.x.y+sha512.<hash>` as the version, so `npm install -g` and the version
   check in `01-install-dependencies.sh` both fail on the next provisioning. Write a plain `pnpm@12.x.y` by hand,
   or make the sed stop at `+`.
4. **The store path and `.modules.yaml` format change.** pnpm 12's store is `<pnpm home>/store/v11` (pnpm 8's
   is `…/store/v3`). On the instance, an existing `node_modules` built from the old store makes
   `check-pnpm-store.sh` (correctly) refuse the deploy, so the cutover deletes `node_modules` first.
   **The script must change.** pnpm 12 writes `node_modules/.modules.yaml` as JSON
   (`  "storeDir": "/home/…/store/v11",`). The script's sed only matches YAML `storeDir: …`, so it reads an
   empty value and fails closed. Without a fix, every deploy after the upgrade refuses to install
   (verified: the current sed returns empty on a pnpm 12 file). Make it accept both forms, e.g. try the YAML sed,
   then fall back to `sed -n -E 's/^ *"storeDir": *"([^"]*)",? *$/\1/p'`, still failing closed when both are
   empty.
5. **The `pnpm` field in `package.json` is no longer read.** pnpm 12 prints
   `[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored:
   "pnpm.overrides"` and installs **without the overrides** (verified in a sandbox). For this repo that means the
   two security overrides from #147 (`next>postcss`, `@sentry/nextjs>rollup`) and the `@types/react*` pins
   silently stop applying. Move them to a top-level `overrides:` key in `pnpm-workspace.yaml` and remove the
   `pnpm` field from `package.json`. pnpm 12 also fails on any key in `pnpm-workspace.yaml` it doesn't recognize
   (`ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS`), so a typo there is caught. Other defaults changed across 9-12
   (e.g. `dedupe-peer-dependents`, `resolution-mode`, hoisting of `eslint`/`prettier`). Skim each major's notes,
   and expect version drift in the lockfile conversion.
6. **Vercel must run the same major.** An older pnpm on Vercel won't read `allowBuilds` or the workspace-file
   overrides: the overrides silently don't apply, or the frozen install fails. Vercel's supported pnpm versions
   were **not verified** when this was written (no web access in that session). Check Vercel's package-manager
   docs first. Have Vercel run exactly the pinned version, either by enabling Corepack
   (`ENABLE_EXPERIMENTAL_COREPACK=1` in project env vars, which honors `packageManager`) or by choosing the newest
   major Vercel supports instead of 12. Note that pnpm 11 also moved settings out of `package.json`, so even
   falling back to 11 needs the same settings move.
7. **pnpm 12 switches to the pinned version itself.** A global pnpm 12 run inside a project whose
   `packageManager` pins another version runs that version. For example, `pnpm --version` in this repo while
   it's still pinned to 8.15.7 prints `8.15.7`. So check the global version from outside the repo
   (`cd ~ && pnpm --version`). This also makes the cutover safer: pnpm 12 can be installed globally on the box
   **before** merge, and deploys keep running 8.15.7 until the pin changes.

## Runbook

### Part A: repo changes (agent, local)

Work in a branch off `main`. Run commands from the repo root.

1. **Install the new pnpm locally:** `npm install -g pnpm@12` (or the latest 12.x), then `pnpm --version`.
2. **Pin it.** Edit `"packageManager"` in `package.json` and `apps/report-server/package.json` to the same plain
   `pnpm@12.x.y`, with no `+sha512` suffix (gotcha 3). Check the provisioning sed still parses it:
   `sed -n 's/.*"packageManager": *"pnpm@\([^"]*\)".*/\1/p' package.json` prints exactly `12.x.y`.
3. **Move settings, then convert the lockfile.** Move `pnpm.overrides` to `overrides:` in `pnpm-workspace.yaml`
   and delete the `pnpm` field from `package.json` (gotcha 5). Delete all `node_modules` (`rm -rf node_modules apps/*/node_modules
   packages/*/node_modules`), then `pnpm install`. Commit the `packageManager`, settings, and
   `pnpm-lock.yaml` changes with no dependency changes: `chore(deps): upgrade pnpm 8.15.7 -> 12.x.y`.
   Check `head -1 pnpm-lock.yaml` shows `lockfileVersion: '9.0'`.
   The install fails with `ERR_PNPM_IGNORED_BUILDS` until step 4 is done, so do 3 and 4 together and commit
   once the install succeeds.
4. **Allow-list builds** (gotcha 1). Add `allowBuilds` to `pnpm-workspace.yaml` (or run `pnpm approve-builds`
   and review what it writes), delete `node_modules` again, and confirm `CI=true pnpm install --frozen-lockfile`
   succeeds. Then check:
   - Prisma: `apps/frontend/node_modules/.prisma/client` exists (frontend postinstall ran `prisma generate`).
   - Chrome: `cd apps/report-server && npx puppeteer browsers list` shows a Chrome build.
   - sharp: `node -e "require('sharp')"` from `apps/frontend` exits 0.
5. **Overrides still apply.** `pnpm why -r postcss` and `pnpm why -r rollup` show only the overridden versions,
   and `@types/react` resolves to the pinned version. Rerun the Dependabot range check from the #147 PR.
6. **Store check script.** Run `pnpm install` once more so `node_modules/.modules.yaml` exists, then
   `bash scripts/check-pnpm-store.sh` must exit 0. It won't until the `storeDir` parsing handles the JSON form
   (gotcha 4). Keep the YAML form too, since the box runs it once under pnpm 8 metadata, and keep it failing closed
   on missing or unrecognized metadata. Update the "pnpm 8" comment.
7. **Full verification:** `pnpm test`, `test:pg`, `tsc` for both apps, lint, `next build`, report-server build
   (`pnpm run build:packages && pnpm --filter node-pdf-generation run build`), `pnpm dev` smoke, and one local
   PDF generation.
8. **Docs.** Add a "pnpm upgrade cutover" section to `infrastructure/DEPLOYMENT_SETUP.md` containing Part C
   below, and replace "pnpm 8" in its store-mismatch troubleshooting entry. Update any `docs/LOCAL_DEVELOPMENT.md`
   pnpm version mention.
9. Open the PR. CI on the new pnpm is the first external check. **Don't merge until Parts B and C are ready**,
   because a deploy on an un-upgraded instance fails. pnpm 8 refuses the v9 lockfile
   (`Ignoring not compatible lockfile` → `ERR_PNPM_NO_LOCKFILE`), but only after `deploy-lightsail.sh` has
   stopped the service, so its abort trap restarts the old build. Nothing ships until the cutover.

### Part B: Vercel (human, before merge)

1. In the Vercel project, check which pnpm the PR's preview build used (build log, "Detected pnpm ...").
2. If it isn't the pinned major, set `ENABLE_EXPERIMENTAL_COREPACK=1` for all environments and rebuild the
   preview (gotcha 6). If Vercel can't run pnpm 12, go back to Part A and target the newest major it supports.
3. Smoke the preview: sign in, load a committee page, request a report.

### Part C: report server cutover (human, on the instance)

Run everything inside `tmux` as the SSH user, from `/opt/voter-file-tool`.

**Before merge (no downtime).** Install pnpm 12 globally now. While `main` still pins 8.15.7, pnpm 12 runs
8.15.7 for this repo (gotcha 7), so deploys keep working unchanged.

1. `npm install -g pnpm@<version from the PR's package.json>` under the SSH user's nvm.
2. `cd ~ && pnpm --version` prints the new version. `cd /opt/voter-file-tool && pnpm --version` still prints
   `8.15.7`, and `pnpm store path` still ends in `/v3`.
3. Optional confidence check: run a normal `bash scripts/deploy-lightsail.sh` and confirm it behaves as before.

**After merge (about 10-20 minutes of report-server downtime, mostly the cold install).**

1. **Preflight.** `free -m` shows swap is on (the cold install needs it), `df -h /` has room for a second store
   (the old one is removed in step 6), and `pm2 status report-server` is online. Note the current commit:
   `git rev-parse HEAD`.
2. **Stop the service:** `pm2 stop report-server`.
3. **Remove the old install:** `rm -rf node_modules apps/*/node_modules packages/*/node_modules`. With no
   `.modules.yaml`, `check-pnpm-store.sh` passes.
4. **Deploy as usual:** `bash scripts/deploy-lightsail.sh`. It pulls `main` (now pinned to 12), does a cold
   install through `pnpm-install-low-memory.sh`, builds, and re-registers PM2. Afterwards, `pnpm --version` in the
   repo prints the new version and `pnpm store path` ends in `/v11`.
5. **Verify:** `pm2 status report-server` is online with no climbing `↺`, `pm2 logs report-server --lines 50`
   is clean, `cd apps/report-server && npx puppeteer browsers list` shows Chrome, and one PDF generates from the
   production frontend. Then run `bash scripts/check-pnpm-store.sh` and confirm it exits 0 on the new metadata.
6. **Clean up** once verified: remove the old `…/store/v3` directory under `~/.local/share/pnpm/store` to
   reclaim disk.

**Rollback** (if step 4 or 5 fails and can't be fixed quickly): `pm2 stop report-server`,
`git checkout <commit from step 1>` (pinned to 8.15.7, so the global pnpm 12 runs 8.15.7), remove `node_modules`
as in step 3, `bash scripts/pnpm-install-low-memory.sh`, `pnpm run build:packages`,
`pnpm --filter node-pdf-generation run build`, `pm2 start apps/report-server/ecosystem.config.js`.
Don't rerun `deploy-lightsail.sh` for this, since it pulls `main` again. Then revert the upgrade PR on `main`
(and Vercel's Corepack env var) before the next deploy.

**Alternative:** `pnpm terraform:recreate` instead of the after-merge steps 2-5. Provisioning installs the pinned version, but
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
